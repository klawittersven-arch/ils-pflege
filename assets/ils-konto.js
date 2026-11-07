/* ILS mit Anmeldung – gemeinsame Logik für Übungsseiten, die erledigte Übungen an den ILS-Server melden.
   Braucht vorher: ils.js (ILS.el, ILS.quiz), ils-server.js (ILS_SERVER), auftraege.js (ILS_AUFTRAEGE).

   Seiten-Bausteine:
     ILSKonto.uebersicht({ mount, ils })                       Übersicht eines Auftrags mit Haken
     ILSKonto.uebung({ mount, ils, schritt, …ILS.quiz-Optionen })
     ILSKonto.abschluss({ mount, ils, schritt, fragen: () => [...], …ILS.quiz-Optionen })

   Ablauf: Die SuS melden sich einmal pro Gerät an (Klasse, Vorname, Geburtstag). Das Gerät bekommt
   einen Schlüssel (Token) und meldet danach jede bestandene Übung. Ohne Netz wird gesammelt und
   später nachgereicht. Einzelne Antworten werden nie übertragen. */
const ILSKonto = (() => {
  'use strict';
  const el = ILS.el;
  const SERVER = String(window.ILS_SERVER || '').replace(/\/+$/, '');
  const WURZEL = new URL('..', document.currentScript.src).href;
  const SCHL = { konto: 'ils-konto', offen: 'ils-konto-offen', stand: 'ils-konto-stand', klasse: 'ils-konto-klasse' };

  /* ---------- Speicher auf dem Gerät ---------- */
  const lesen = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const schreiben = (k, v) => {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privater Modus */ }
  };

  const auftrag = (id) => (window.ILS_AUFTRAEGE || []).find((a) => a.id === id) || null;
  const link = (pfad) => new URL(pfad, WURZEL).href;
  const datum = (ms) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function konto() {
    const k = lesen(SCHL.konto);
    return k && typeof k.token === 'string' && /^[A-Za-z0-9]{32}$/.test(k.token) ? k : null;
  }
  const werIst = (k) => (k ? k.klasse + '|' + k.name : null);

  function abmelden() {
    schreiben(SCHL.konto, null);
    schreiben(SCHL.stand, null);
  }

  // Der Server kennt das Gerät nicht mehr (z. B. von der Lehrkraft abgemeldet) → Anmeldung neu zeigen
  const abmeldeHoerer = [];
  function serverHatAbgemeldet() {
    abmelden();
    abmeldeHoerer.forEach((f) => f());
  }

  /* ---------- Server ---------- */
  async function api(weg, { methode = 'GET', daten, token } = {}) {
    const kopf = {};
    if (daten) kopf['Content-Type'] = 'application/json';
    if (token) kopf.Authorization = 'Bearer ' + token;
    const r = await fetch(SERVER + weg, {
      method: methode, headers: kopf, body: daten ? JSON.stringify(daten) : undefined,
      mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'
    });
    let d = {};
    try { d = await r.json(); } catch (e) { /* leer */ }
    return { status: r.status, d };
  }

  // Bekannter Stand = zuletzt vom Server geholter Stand + noch nicht übertragene Ergebnisse dieses Geräts
  function bekannterStand() {
    const st = JSON.parse(JSON.stringify(lesen(SCHL.stand) || {}));
    const wer = werIst(konto());
    for (const e of lesen(SCHL.offen) || []) {
      if (e.wer && e.wer !== wer) continue;
      st[e.ils] = st[e.ils] || {};
      if (!st[e.ils][e.schritt]) st[e.ils][e.schritt] = { um: e.um, punkte: e.punkte, max: e.max, offen: true };
    }
    return st;
  }

  // Stand vom Server holen; ohne Netz den bekannten Stand liefern
  async function standHolen() {
    const k = konto();
    if (k && SERVER) {
      try {
        const { status, d } = await api('/api/ich', { token: k.token });
        if (status === 200) schreiben(SCHL.stand, d.fortschritt || {});
        else if (status === 401) serverHatAbgemeldet();
      } catch (e) { /* offline */ }
    }
    return bekannterStand();
  }

  /* ---------- Melden (mit Warteschlange für unterwegs) ---------- */
  function melden(ils, schritt, punkte, max) {
    const wer = werIst(konto());
    const offen = (lesen(SCHL.offen) || []).filter((e) => !(e.ils === ils && e.schritt === schritt && e.wer === wer));
    offen.push({ ils, schritt, punkte, max, wer, um: Date.now() });
    schreiben(SCHL.offen, offen);
    return nachreichen();
  }

  let kette = Promise.resolve();
  let wiederholung = null;
  function nachreichen() {
    kette = kette.then(senden, senden).then((erg) => {
      clearTimeout(wiederholung);
      if (erg === 'offline') wiederholung = setTimeout(nachreichen, 20000);
      if (erg === 'ok') meldungenAktualisieren('ok');   // z. B. „Noch nicht übertragen“ → „Eingetragen“
      return erg;
    });
    return kette;
  }

  async function senden() {
    if (!SERVER) return 'ohne-server';
    const k = konto();
    const wer = werIst(k);
    const meine = () => (lesen(SCHL.offen) || []).filter((e) => !e.wer || e.wer === wer);
    if (!k) return meine().length ? 'nicht-angemeldet' : 'ok';
    for (const e of meine()) {
      let r;
      try {
        r = await api('/api/melden', { methode: 'POST', token: k.token, daten: { ils: e.ils, schritt: e.schritt, punkte: e.punkte, max: e.max } });
      } catch (err) { return 'offline'; }
      if (r.status === 401) { serverHatAbgemeldet(); return 'nicht-angemeldet'; }
      if (r.status >= 500) return 'offline';
      // angekommen (200) oder vom Server abgelehnt (400/409) → nicht endlos wiederholen
      schreiben(SCHL.offen, (lesen(SCHL.offen) || []).filter((x) => !(x.ils === e.ils && x.schritt === e.schritt && x.wer === e.wer && x.um === e.um)));
      if (r.status === 200 && r.d.fortschritt) schreiben(SCHL.stand, r.d.fortschritt);
    }
    return meine().length ? 'offline' : 'ok';
  }

  window.addEventListener('online', () => nachreichen());

  /* Rückmeldungen nach bestandener Übung, die sich nach einer späteren Anmeldung aktualisieren */
  const meldungsZeilen = [];
  function meldungZeigen(zeile, erg) {
    const texte = {
      ok: ['ok', '✓ Bei Ihrer Lehrkraft eingetragen.'],
      'nicht-angemeldet': ['hint', '⚠️ Sie sind nicht angemeldet. Ihr Ergebnis ist auf diesem Gerät gespeichert. Melden Sie sich oben an – dann wird es übertragen.'],
      offline: ['hint', '📶 Noch nicht übertragen (keine Verbindung). Das wird automatisch nachgeholt, sobald Sie wieder online sind und eine ILS-Seite öffnen.'],
      'ohne-server': ['hint', '']
    };
    const [art, text] = texte[erg] || texte.offline;
    zeile.className = 'meldung ' + art + (text ? '' : ' hidden');
    zeile.textContent = text;
  }
  function meldungenAktualisieren(erg) { meldungsZeilen.forEach((z) => meldungZeigen(z, erg)); }

  /* ---------- Anmeldung ---------- */
  function bereich(mount, onBereit) {
    const box = el('div', { class: 'konto' });
    mount.append(box);
    let fertig = false;
    const bereit = () => { if (!fertig) { fertig = true; onBereit(); } };
    abmeldeHoerer.push(() => zeigen('Sie wurden abgemeldet. Bitte melden Sie sich neu an.'));

    function zeigen(hinweis) {
      box.innerHTML = '';
      if (!SERVER) { bereit(); return; }
      const k = konto();
      if (k) {
        box.append(el('div', { class: 'konto-leiste' },
          el('span', {}, '👤 Angemeldet: ', el('strong', {}, k.name), ` (${k.klasse})`),
          el('button', { type: 'button', class: 'linkbtn', onclick: abmeldenFragen }, 'Abmelden')));
        bereit();
        return;
      }
      box.append(formular(hinweis));
    }

    function abmeldenFragen() {
      const offen = (lesen(SCHL.offen) || []).filter((e) => e.wer === werIst(konto())).length;
      const frage = offen
        ? `Es sind noch ${offen} Ergebnis(se) nicht übertragen. Wenn Sie sich jetzt abmelden, gehen sie verloren. Trotzdem abmelden?`
        : 'Abmelden? (Zum Beispiel, wenn jemand anderes dieses Gerät benutzen möchte.)';
      if (!window.confirm(frage)) return;
      const wer = werIst(konto());
      schreiben(SCHL.offen, (lesen(SCHL.offen) || []).filter((e) => e.wer !== wer));
      abmelden();
      location.reload();
    }

    function formular(hinweis) {
      const karte = el('div', { class: 'card konto-karte' });
      const fb = el('div', { class: hinweis ? 'fb show hint' : 'fb', 'aria-live': 'polite' }, hinweis || '');
      let klasse = '';
      const klassenBox = el('div', { class: 'klassen', role: 'group', 'aria-label': 'Klasse' });
      const vn = el('input', { id: 'konto-vn', autocomplete: 'given-name', placeholder: 'z. B. Lena', maxlength: '40' });
      const feld = (id, platz, max, label) => el('input', { id, inputmode: 'numeric', pattern: '[0-9]*', maxlength: String(max), placeholder: platz, autocomplete: 'off', 'aria-label': label });
      const tag = feld('konto-tag', 'TT', 2, 'Tag'), monat = feld('konto-monat', 'MM', 2, 'Monat'), jahr = feld('konto-jahr', 'JJJJ', 4, 'Jahr');
      [[tag, monat], [monat, jahr]].forEach(([a, b]) => a.addEventListener('input', () => {
        a.value = a.value.replace(/\D/g, '');
        if (a.value.length >= 2) b.focus();
      }));
      jahr.addEventListener('input', () => { jahr.value = jahr.value.replace(/\D/g, ''); });
      const knopf = el('button', { type: 'button', class: 'btn block', id: 'konto-anmelden' }, 'Anmelden');

      const fehler = (text) => { fb.className = 'fb show bad'; fb.textContent = text; };

      function klassenLaden() {
        klassenBox.innerHTML = '';
        klassenBox.append(el('span', { class: 'small' }, 'Klassen werden geladen …'));
        api('/api/klassen').then(({ status, d }) => {
          klassenBox.innerHTML = '';
          const liste = status === 200 && Array.isArray(d.klassen) ? d.klassen : [];
          if (!liste.length) { klassenBox.append(el('span', { class: 'small' }, 'Noch keine Klassen eingetragen. Bitte sprechen Sie Ihre Lehrkraft an.')); return; }
          const gemerkt = lesen(SCHL.klasse);
          liste.forEach((kl) => {
            const b = el('button', { type: 'button', class: 'wahl', 'aria-pressed': 'false' }, kl);
            b.addEventListener('click', () => {
              klasse = kl;
              klassenBox.querySelectorAll('.wahl').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            });
            klassenBox.append(b);
            if (kl === gemerkt || liste.length === 1) b.click();
          });
        }).catch(() => {
          klassenBox.innerHTML = '';
          klassenBox.append(
            el('span', { class: 'small' }, 'Keine Verbindung zum Server. Prüfen Sie Ihr Internet. '),
            el('button', { type: 'button', class: 'linkbtn', onclick: klassenLaden }, 'Erneut versuchen'));
        });
      }

      knopf.addEventListener('click', async () => {
        const t = +tag.value, m = +monat.value, j = +jahr.value;
        if (!klasse) return fehler('Bitte tippen Sie zuerst Ihre Klasse an.');
        if (ILS.normName(vn.value).length < 2) return fehler('Bitte geben Sie Ihren Vornamen ein.');
        if (jahr.value.length !== 4) return fehler('Bitte geben Sie das Jahr vierstellig ein, z. B. 2004.');
        const dt = new Date(Date.UTC(j, m - 1, t));
        if (!t || !m || dt.getUTCDate() !== t || dt.getUTCMonth() !== m - 1) return fehler('Bitte prüfen Sie Ihren Geburtstag (Tag, Monat, Jahr).');
        const iso = `${j}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
        knopf.disabled = true;
        fb.className = 'fb';
        try {
          const { status, d } = await api('/api/anmelden', { methode: 'POST', daten: { klasse, vorname: vn.value.trim(), geburtstag: iso } });
          if (status === 200 && d.token) {
            schreiben(SCHL.konto, { token: d.token, name: d.name, klasse: d.klasse });
            schreiben(SCHL.klasse, d.klasse);
            zeigen();
            nachreichen().then(meldungenAktualisieren);
            return;
          }
          if (d.grund === 'gesperrt') fehler(`Zu viele Fehlversuche in Ihrer Klasse. Bitte warten Sie ${d.minuten || 10} Minuten und versuchen Sie es dann noch einmal.`);
          else if (d.grund === 'mehrdeutig') fehler('Bitte geben Sie Ihren Vornamen vollständig ein.');
          else if (d.grund === 'nicht-gefunden') fehler('Wir finden Sie nicht in der Klassenliste. Prüfen Sie Klasse, Vorname und Geburtstag. Klappt es weiterhin nicht, sprechen Sie Ihre Lehrkraft an.');
          else fehler('Das hat nicht geklappt. Bitte prüfen Sie Ihre Eingaben.');
        } catch (e) {
          fehler('Keine Verbindung zum Server. Prüfen Sie Ihr Internet und versuchen Sie es noch einmal.');
        } finally {
          knopf.disabled = false;
        }
      });

      function ohne() {
        karte.replaceWith(el('div', { class: 'konto-leiste hint' },
          el('span', {}, 'Nicht angemeldet – Ihre Ergebnisse bleiben auf diesem Gerät, bis Sie sich anmelden.'),
          el('button', { type: 'button', class: 'linkbtn', onclick: () => { box.innerHTML = ''; box.append(formular()); } }, 'Jetzt anmelden')));
        bereit();
      }

      karte.append(
        el('div', { class: 'q-text' }, 'Bitte melden Sie sich an'),
        el('p', { class: 'small' }, 'Einmal pro Gerät genügt. Danach sieht Ihre Lehrkraft automatisch, welche Übungen Sie erledigt haben.'),
        el('div', { class: 'field' }, el('label', {}, 'Ihre Klasse'), klassenBox),
        el('div', { class: 'field' }, el('label', { for: 'konto-vn' }, 'Ihr Vorname'), vn),
        el('div', { class: 'field' }, el('label', { for: 'konto-tag' }, 'Ihr Geburtstag'),
          el('div', { class: 'geb' }, tag, el('span', {}, '.'), monat, el('span', {}, '.'), jahr)),
        knopf, fb,
        el('p', { class: 'small' }, 'Ihr Geburtstag dient nur zur Anmeldung und wird nicht gespeichert. Gespeichert wird nur, welche Übungen Sie wann erledigt haben.'),
        el('button', { type: 'button', class: 'linkbtn', onclick: ohne }, 'Ohne Anmeldung üben'));
      klassenLaden();
      return karte;
    }

    zeigen();
  }

  /* ---------- Seiten ---------- */
  function rahmen(cfg) {
    const root = typeof cfg.mount === 'string' ? document.querySelector(cfg.mount) : cfg.mount;
    root.innerHTML = '';
    const oben = el('div'), info = el('div'), inhalt = el('div', { class: 'hidden' });
    root.append(oben, info, inhalt);
    return { oben, info, inhalt };
  }

  function weiterKnopf(a, schrittId) {
    if (!a) return null;
    const i = a.schritte.findIndex((s) => s.id === schrittId);
    const naechster = a.schritte[i + 1];
    return naechster
      ? el('a', { class: 'btn secondary block weiter', href: link(naechster.pfad) }, 'Weiter: ' + naechster.titel)
      : el('a', { class: 'btn secondary block weiter', href: link(a.pfad) }, 'Zur Übersicht');
  }

  function nachBestehen(box, cfg, erg) {
    const zeile = el('p', { class: 'meldung' }, '⏳ Wird bei Ihrer Lehrkraft eingetragen …');
    meldungsZeilen.push(zeile);
    box.append(zeile);
    melden(cfg.ils, cfg.schritt, erg.total, erg.max).then((e) => meldungZeigen(zeile, e));
    const w = weiterKnopf(auftrag(cfg.ils), cfg.schritt);
    if (w) box.append(w);
  }

  function uebung(cfg) {
    const { oben, info, inhalt } = rahmen(cfg);
    bereich(oben, async () => {
      inhalt.classList.remove('hidden');
      ILS.quiz({
        ...cfg,
        mount: inhalt,
        onPass: (box, erg) => { nachBestehen(box, cfg, erg); if (cfg.onPass) cfg.onPass(box, erg); }
      });
      const st = await standHolen();
      const e = st[cfg.ils] && st[cfg.ils][cfg.schritt];
      if (e) info.append(el('div', { class: 'card erledigt' }, `✓ Diese Übung haben Sie schon erledigt (${datum(e.um)}). Sie können sie gern noch einmal üben.`));
    });
  }

  function abschluss(cfg) {
    const { oben, info, inhalt } = rahmen(cfg);
    const a = auftrag(cfg.ils);
    const starten = () => {
      ILS.quiz({
        ...cfg,
        questions: typeof cfg.fragen === 'function' ? cfg.fragen() : cfg.questions,
        mount: inhalt,
        onPass: (box, erg) => {
          box.append(el('p', { class: 'geschafft' }, '🎉 Geschafft! Ihr ILS-Auftrag ist damit abgeschlossen.'));
          nachBestehen(box, cfg, erg);
        },
        onFail: (box) => {
          if (typeof cfg.fragen === 'function') {
            box.append(el('button', { type: 'button', class: 'btn secondary block', onclick: () => { starten(); window.scrollTo(0, 0); } }, 'Neue Fragen'));
          }
        }
      });
    };
    bereich(oben, async () => {
      const st = await standHolen();
      const fehlt = a ? a.schritte.filter((s) => !s.abschluss && !(st[a.id] && st[a.id][s.id])) : [];
      if (fehlt.length) {
        info.append(el('div', { class: 'card gesperrt' },
          el('div', { class: 'q-text' }, '🔒 Das Abschlussquiz ist noch gesperrt'),
          el('p', {}, 'Es wird freigeschaltet, wenn Sie alle Übungen erledigt haben. Es fehlen noch:'),
          el('div', { class: 'links' }, fehlt.map((s) => el('a', { class: 'btn secondary block', href: link(s.pfad) }, s.titel)))));
        return;
      }
      const e = st[cfg.ils] && st[cfg.ils][cfg.schritt];
      if (e) info.append(el('div', { class: 'card erledigt' }, `✓ Abschlussquiz bestanden am ${datum(e.um)}${e.max ? ` (${e.punkte} von ${e.max} Punkten)` : ''}. Ihr ILS-Auftrag ist abgeschlossen.`));
      inhalt.classList.remove('hidden');
      starten();
    });
  }

  function uebersicht(cfg) {
    const { oben, info } = rahmen(cfg);
    const a = auftrag(cfg.ils);
    if (!a) { info.textContent = 'Unbekannter ILS-Auftrag.'; return; }

    function zeichnen(st) {
      info.innerHTML = '';
      const meins = st[a.id] || {};
      const erledigt = a.schritte.filter((s) => meins[s.id]).length;
      const alleUebungen = a.schritte.filter((s) => !s.abschluss).every((s) => meins[s.id]);
      info.append(el('div', { class: 'card fortschritt' },
        el('div', { class: 'q-text' }, `${erledigt} von ${a.schritte.length} erledigt`),
        el('div', { class: 'balken' }, el('span', { style: `width:${Math.round((erledigt / a.schritte.length) * 100)}%` }))));
      if (erledigt === a.schritte.length) {
        info.append(el('div', { class: 'card erledigt' }, '🎉 Sie haben diesen ILS-Auftrag abgeschlossen.'));
      }
      info.append(el('div', { class: 'links schritte-liste' }, a.schritte.map((s) => {
        const e = meins[s.id];
        const zu = s.abschluss && !alleUebungen && !e;
        const zeichen = e ? '✓' : zu ? '🔒' : '○';
        return el('a', { class: 'btn block schritt ' + (e ? 'fertig' : zu ? 'zu' : s.abschluss ? '' : 'secondary'), href: link(s.pfad) },
          el('span', { class: 'zeichen', 'aria-hidden': 'true' }, zeichen),
          el('span', { class: 'titel' }, s.titel),
          e ? el('span', { class: 'wann' }, e.offen ? 'noch nicht übertragen' : datum(e.um)) : null);
      })));
    }

    zeichnen(bekannterStand());
    bereich(oben, async () => {
      await nachreichen();
      zeichnen(await standHolen());
    });
  }

  if (konto()) nachreichen();

  return { uebersicht, uebung, abschluss, konto, melden, nachreichen, standHolen, bekannterStand };
})();
