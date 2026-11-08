/* Lehrkraft-Übersicht: Wer hat welche Übung eines ILS-Auftrags erledigt?
   Braucht vorher: ils.js (ILS.el), ils-server.js, auftraege.js.
   Das Passwort (Secret LEHRKRAFT_PASSWORT beim Cloudflare-Worker) bleibt nur für diese
   Browser-Sitzung gespeichert (sessionStorage) und wird bei jeder Anfrage mitgeschickt. */
(() => {
  'use strict';
  const el = ILS.el;
  const SERVER = String(window.ILS_SERVER || '').replace(/\/+$/, '');
  const AUFTRAEGE = window.ILS_AUFTRAEGE || [];
  const app = document.getElementById('app');

  const sitzung = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* egal */ } }
  };
  const merken = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* egal */ } }
  };

  let passwort = sitzung.get('ils-lk-pw') || '';
  let stand = null;
  const wahl = {
    ils: AUFTRAEGE.some((a) => a.id === merken.get('ils-lk-ils')) ? merken.get('ils-lk-ils') : (AUFTRAEGE[AUFTRAEGE.length - 1] || {}).id,
    klasse: merken.get('ils-lk-klasse') || ''
  };

  const datum = (ms) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const zeit = (ms) => new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const kurzDatum = (ms) => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const auftrag = () => AUFTRAEGE.find((a) => a.id === wahl.ils) || null;
  const vergleich = (a, b) => a.klasse.localeCompare(b.klasse, 'de') || a.name.localeCompare(b.name, 'de');

  async function api(weg, daten) {
    const kopf = { 'X-Passwort': encodeURIComponent(passwort) };
    if (daten) kopf['Content-Type'] = 'application/json';
    const r = await fetch(SERVER + weg, {
      method: daten ? 'POST' : 'GET', headers: kopf, body: daten ? JSON.stringify(daten) : undefined,
      mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    let d = {};
    try { d = await r.json(); } catch (e) { /* leer */ }
    return { status: r.status, d };
  }

  /* ---------- Auswertung je Person ---------- */
  function auswerten(s, a) {
    const p = (s.fortschritt || {})[a.id] || {};
    const erledigt = a.schritte.filter((x) => p[x.id]).length;
    const fertig = erledigt === a.schritte.length;
    let status = 'offen';
    if (fertig) status = 'fertig';
    else if (erledigt) status = 'arbeitet';
    else if (!s.ersteAnmeldung) status = 'nie';
    return { p, erledigt, fertig, status };
  }

  /* ---------- Anmeldung der Lehrkraft ---------- */
  function anmeldung(hinweis) {
    app.innerHTML = '';
    if (!SERVER) {
      app.append(el('div', { class: 'card' }, 'In assets/ils-server.js ist keine Server-Adresse eingetragen.'));
      return;
    }
    const pw = el('input', { type: 'password', id: 'lk-pw', autocomplete: 'current-password' });
    const fb = el('div', { class: 'fb' + (hinweis ? ' show bad' : '') }, hinweis || '');
    const knopf = el('button', { type: 'submit', class: 'btn block' }, 'Anmelden');
    const form = el('form', { class: 'card lk-login' },
      el('div', { class: 'q-text' }, 'Lehrkraft-Übersicht'),
      el('p', { class: 'small' }, 'Hier sehen Sie, welche SuS welche Übungen der ILS-Aufträge erledigt haben.'),
      el('div', { class: 'field' }, el('label', { for: 'lk-pw' }, 'Passwort'), pw),
      knopf, fb);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      passwort = pw.value;
      laden(true);
    });
    app.append(form);
    pw.focus();
  }

  async function laden(ersteAnmeldung) {
    let r;
    try { r = await api('/api/lehrkraft/stand'); } catch (e) {
      if (stand) { statusZeile('⚠️ Server gerade nicht erreichbar – angezeigt wird der letzte Stand.'); return; }
      anmeldung('Server nicht erreichbar. Prüfen Sie die Internetverbindung.');
      return;
    }
    if (r.status === 200) {
      stand = r.d;
      sitzung.set('ils-lk-pw', passwort);
      if (ersteAnmeldung || !document.getElementById('lk-haupt')) aufbauen();
      zeichnen();
      return;
    }
    if (r.status === 503 && r.d.grund === 'passwort-fehlt') {
      app.innerHTML = '';
      app.append(el('div', { class: 'card gesperrt' },
        el('div', { class: 'q-text' }, 'Noch kein Passwort eingerichtet'),
        el('p', {}, 'Bitte im Cloudflare-Dashboard beim Worker „ils-pflege“ unter Settings → Variables and Secrets ein Secret mit dem Namen LEHRKRAFT_PASSWORT anlegen (siehe README).')));
      return;
    }
    sitzung.set('ils-lk-pw', null);
    stand = null;
    if (r.status === 429) anmeldung(`Zu viele falsche Passwörter. Bitte warten Sie ${r.d.minuten || 15} Minuten.`);
    else if (r.status === 401) anmeldung(ersteAnmeldung ? 'Das Passwort ist falsch.' : null);
    else anmeldung('Unerwartete Antwort vom Server (' + r.status + ').');
  }

  /* ---------- Hauptansicht ---------- */
  let teile = {};
  function aufbauen() {
    app.innerHTML = '';
    const ilsWahl = el('select', { id: 'lk-ils', 'aria-label': 'ILS-Auftrag' }, AUFTRAEGE.map((a) => el('option', { value: a.id }, a.titel)));
    ilsWahl.value = wahl.ils || '';
    ilsWahl.addEventListener('change', () => { wahl.ils = ilsWahl.value; merken.set('ils-lk-ils', wahl.ils); zeichnen(); });
    const klassenWahl = el('select', { id: 'lk-klasse', 'aria-label': 'Klasse' });
    klassenWahl.addEventListener('change', () => { wahl.klasse = klassenWahl.value; merken.set('ils-lk-klasse', wahl.klasse); zeichnen(); });

    const fehltBox = el('div', { class: 'card hidden', id: 'lk-fehlt' });
    const wappenBox = el('div', { class: 'card hidden', id: 'lk-wappen' });
    teile = {
      ilsWahl, klassenWahl, fehltBox, wappenBox,
      wappenKnopf: el('button', { type: 'button', class: 'btn secondary', id: 'lk-wappen-knopf', onclick: wappenGalerie }, '🛡️ Siegerwappen'),
      status: el('p', { class: 'small', id: 'lk-status', 'aria-live': 'polite' }),
      zusammenfassung: el('div', { id: 'lk-zusammenfassung' }),
      tabelle: el('div', { class: 'lk-tabelle', id: 'lk-tabelle' }),
      personWahl: el('select', { id: 'lk-person', 'aria-label': 'Person' }),
      auftragWahl: el('select', { id: 'lk-auftrag-loeschen', 'aria-label': 'ILS-Auftrag' }, AUFTRAEGE.map((a) => el('option', { value: a.id }, a.titel)))
    };

    const leiste = el('div', { class: 'lk-leiste' },
      el('div', { class: 'field' }, el('label', { for: 'lk-ils' }, 'ILS-Auftrag'), ilsWahl),
      el('div', { class: 'field' }, el('label', { for: 'lk-klasse' }, 'Klasse'), klassenWahl),
      el('div', { class: 'lk-knoepfe' },
        el('button', { type: 'button', class: 'btn secondary', onclick: () => laden(false) }, '↻ Aktualisieren'),
        el('button', { type: 'button', class: 'btn secondary', id: 'lk-wer-fehlt', onclick: werFehlt }, 'Wer fehlt noch?'),
        el('button', { type: 'button', class: 'btn secondary', id: 'lk-csv', onclick: csv }, 'Excel-Datei (CSV)'),
        el('button', { type: 'button', class: 'btn secondary', id: 'lk-rennen', onclick: rennen }, '🏁 Live-Rennen'),
        el('button', { type: 'button', class: 'btn secondary', id: 'lk-siegerehrung', onclick: siegerehrung }, '🏆 Siegerehrung'),
        teile.wappenKnopf));

    app.append(el('div', { id: 'lk-haupt' },
      leiste, teile.status, fehltBox, wappenBox, teile.zusammenfassung, teile.tabelle,
      el('p', { class: 'small' }, 'Tipp: Ein Klick auf ein Feld der Tabelle trägt eine Übung von Hand ein oder entfernt den Haken – z. B. wenn jemand die Übung analog vorgezeigt hat. ' +
        '⚠2 = zwei Neustarts wegen zu vieler Fehler. ⏳4 = viermal zu schnell getippt (Hinweis auf Raten). ✍5/8 = Examens-Training: selbst abgehakte Punkte. Details: Maus auf das Feld halten.'),
      verwaltung()));
  }

  function statusZeile(text) { if (teile.status) teile.status.textContent = text; }

  function zeichnen() {
    if (!stand || !teile.tabelle) return;
    const a = auftrag();
    const alle = stand.schueler.slice().sort(vergleich);
    const klassen = [...new Set(alle.map((s) => s.klasse))].sort();
    if (wahl.klasse && !klassen.includes(wahl.klasse)) wahl.klasse = '';

    // Klassenauswahl
    const kw = teile.klassenWahl;
    kw.innerHTML = '';
    kw.append(el('option', { value: '' }, 'Alle Klassen'), ...klassen.map((k) => el('option', { value: k }, k)));
    kw.value = wahl.klasse;

    // Personenauswahl (Verwaltung) – Auswahl behalten
    const alt = teile.personWahl.value;
    teile.personWahl.innerHTML = '';
    teile.personWahl.append(el('option', { value: '' }, '– Person wählen –'), ...alle.map((s) => el('option', { value: s.sid }, `${s.klasse} – ${s.name}`)));
    teile.personWahl.value = alle.some((s) => s.sid === alt) ? alt : '';

    statusZeile(`Stand: ${zeit(stand.jetzt || Date.now())} · aktualisiert sich alle 30 Sekunden`);
    teile.zusammenfassung.innerHTML = '';
    teile.tabelle.innerHTML = '';
    if (!alle.length) {
      teile.tabelle.append(el('div', { class: 'card gesperrt' }, 'Noch keine Klassenliste eingetragen. Öffnen Sie unten „Verwaltung“ → „Klassenliste einfügen“.'));
      return;
    }
    if (!a) { teile.tabelle.append(el('div', { class: 'card' }, 'Kein ILS-Auftrag ausgewählt.')); return; }

    const liste = alle.filter((s) => !wahl.klasse || s.klasse === wahl.klasse);

    // Knopf „Siegerwappen“ mit Zahl der noch nicht angesehenen Wappen
    const neueWappen = liste.filter((s) => s.wappen && s.wappen[a.id] && !s.wappen[a.id].gesehen).length;
    teile.wappenKnopf.textContent = neueWappen ? `🛡️ Siegerwappen (${neueWappen} neu)` : '🛡️ Siegerwappen';
    teile.wappenKnopf.classList.toggle('neu', neueWappen > 0);
    teile.wappenKnopf.classList.toggle('hidden', !a.challenge);

    // Zusammenfassung je Klasse
    for (const k of klassen.filter((x) => !wahl.klasse || x === wahl.klasse)) {
      const ks = liste.filter((s) => s.klasse === k).map((s) => auswerten(s, a));
      const n = (st) => ks.filter((x) => x.status === st).length;
      teile.zusammenfassung.append(el('div', { class: 'lk-zahlen' },
        el('strong', {}, k + ': '),
        el('span', { class: 'z fertig' }, `${n('fertig')} von ${ks.length} abgeschlossen`), ' · ',
        el('span', { class: 'z arbeitet' }, `${n('arbeitet')} in Arbeit`), ' · ',
        el('span', { class: 'z offen' }, `${n('offen') + n('nie')} noch nicht angefangen`),
        n('nie') ? el('span', { class: 'small' }, ` (davon ${n('nie')} noch nie angemeldet)`) : null));
    }

    // Tabelle
    const mitKlasse = !wahl.klasse;
    const kopf = el('tr', {},
      el('th', { scope: 'col' }, 'Name'),
      mitKlasse ? el('th', { scope: 'col' }, 'Klasse') : null,
      a.schritte.map((x) => el('th', { scope: 'col', title: x.titel }, x.kurz || x.titel)),
      el('th', { scope: 'col' }, 'Stand'),
      a.challenge ? el('th', { scope: 'col', title: 'bestes Ergebnis in der ILS-Challenge' }, '🏁 Challenge') : null);
    const zeilen = liste.map((s) => {
      const w = auswerten(s, a);
      const zellen = a.schritte.map((x) => {
        const e = w.p[x.id];
        let inhalt = '–', titel = `${x.titel}: noch nicht erledigt – klicken, um von Hand einzutragen`;
        if (e) {
          inhalt = e.quelle === 'lehrkraft' ? '✓ Hand' : `✓ ${kurzDatum(e.um)}` + (x.abschluss && e.max ? ` · ${e.punkte}/${e.max}` : '');
          titel = `${x.titel}: erledigt am ${zeit(e.um)}${e.quelle === 'lehrkraft' ? ' (von Hand eingetragen)' : ''}` +
            (e.max ? ` – ${e.punkte} von ${e.max} Aufgaben ohne Fehler` : '') +
            (e.neustarts ? ` – ${e.neustarts} Neustart(s) wegen zu vieler Fehler` : '') +
            (e.zuSchnell ? ` – ${e.zuSchnell} Warnung(en) „zu schnell“` : '') +
            (e.selbstMax ? ` – Examens-Training selbst bewertet: ${e.selbst}/${e.selbstMax}` : '') +
            ' – klicken, um den Haken zu entfernen';
        }
        return el('td', { class: 'zelle' + (e ? ' ja' : '') + (e && e.neustarts >= 2 ? ' warn' : '') },
          el('button', { type: 'button', title: titel, onclick: () => haken(s, a, x, !e) }, inhalt,
            e && e.neustarts ? el('span', { class: 'neustarts' }, ` ⚠${e.neustarts}`) : null,
            e && e.zuSchnell ? el('span', { class: 'neustarts' }, ` ⏳${e.zuSchnell}`) : null,
            e && e.selbstMax ? el('span', { class: 'selbst' }, ` ✍${e.selbst}/${e.selbstMax}`) : null));
      });
      const statusText = { fertig: '✓ abgeschlossen', arbeitet: `${w.erledigt} von ${a.schritte.length}`, offen: `0 von ${a.schritte.length}`, nie: 'nie angemeldet' }[w.status];
      return el('tr', { class: 'st-' + w.status },
        el('th', { scope: 'row' }, s.name),
        mitKlasse ? el('td', {}, s.klasse) : null,
        zellen,
        el('td', { class: 'stand' }, statusText),
        a.challenge ? el('td', { class: 'challenge-zelle' }, ((s.challenge || {})[a.id] ? `${s.challenge[a.id].punkte} P.` : '–'),
          s.wappen && s.wappen[a.id] ? el('span', { class: 'wappen-hinweis' + (s.wappen[a.id].gesehen ? '' : ' neu'),
            title: s.wappen[a.id].gesehen ? 'Siegerwappen vorhanden (angesehen)' : 'neues Siegerwappen – noch nicht angesehen' }, s.wappen[a.id].gesehen ? ' 🛡️' : ' 🛡️ neu') : null,
          s.malenGesperrt ? el('span', { class: 'wappen-hinweis', title: 'vom Malen eines Siegerwappens ausgeschlossen' }, ' 🚫') : null) : null);
    });
    teile.tabelle.append(el('table', { class: 'lk' }, el('thead', {}, kopf), el('tbody', {}, zeilen)));
  }

  async function haken(s, a, x, setzen) {
    const frage = setzen
      ? `„${x.titel}“ für ${s.name} von Hand als erledigt eintragen?`
      : `Haken bei „${x.titel}“ für ${s.name} entfernen?`;
    if (!window.confirm(frage)) return;
    const r = await api('/api/lehrkraft/haken', { sid: s.sid, ils: a.id, schritt: x.id, setzen }).catch(() => null);
    if (!r || r.status !== 200) window.alert('Das hat nicht geklappt. Bitte erneut versuchen.');
    laden(false);
  }

  /* ---------- Wer fehlt noch? ---------- */
  function fehltText() {
    const a = auftrag();
    if (!a || !stand) return '';
    const liste = stand.schueler.filter((s) => !wahl.klasse || s.klasse === wahl.klasse).sort(vergleich);
    const klassen = [...new Set(liste.map((s) => s.klasse))];
    const bloecke = klassen.map((k) => {
      const offen = liste.filter((s) => s.klasse === k && !auswerten(s, a).fertig).map((s) => s.name);
      return offen.length ? `${k}:\n${offen.join('\n')}` : `${k}: alle abgeschlossen ✓`;
    });
    return `ILS „${a.titel}“ – noch nicht abgeschlossen\n\n${bloecke.join('\n\n')}`;
  }

  function werFehlt() {
    const box = teile.fehltBox;
    const text = fehltText();
    const feld = el('textarea', { rows: String(Math.min(18, text.split('\n').length + 1)), id: 'lk-fehlt-text' });
    feld.value = text;
    const hinweis = el('span', { class: 'small' });
    box.innerHTML = '';
    box.append(
      el('div', { class: 'q-text' }, 'Wer fehlt noch? (z. B. für die PPT)'), feld,
      el('div', { class: 'lk-knoepfe' },
        el('button', { type: 'button', class: 'btn', onclick: () => {
          const fertig = () => { hinweis.textContent = ' ✓ Kopiert'; };
          if (navigator.clipboard) navigator.clipboard.writeText(feld.value).then(fertig, () => { feld.select(); document.execCommand('copy'); fertig(); });
          else { feld.select(); document.execCommand('copy'); fertig(); }
        } }, 'Kopieren'),
        el('button', { type: 'button', class: 'btn secondary', onclick: () => box.classList.add('hidden') }, 'Schließen'),
        hinweis));
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- Siegerehrung (ILS-Challenge) am Beamer ---------- */
  function rangliste(a, klasse) {
    return stand.schueler.filter((s) => s.klasse === klasse && s.challenge && s.challenge[a.id])
      .map((s) => ({ sid: s.sid, name: s.name, ...s.challenge[a.id] }))
      .sort((x, y) => y.punkte - x.punkte || x.sekunden - y.sekunden || x.um - y.um)
      .slice(0, 12);
  }

  function siegerehrung() {
    const a = auftrag();
    if (!a || !stand) return;
    const klassen = [...new Set(stand.schueler.map((s) => s.klasse))].sort();
    // Nur Siegerwappen, die die Lehrkraft angesehen hat, erscheinen am Beamer
    let bilder = new Map();
    const bilderLaden = api('/api/lehrkraft/wappen?ils=' + encodeURIComponent(a.id))
      .then((r) => { if (r.status === 200) bilder = new Map(r.d.wappen.filter((w) => w.gesehen).map((w) => [w.sid, w.bild])); })
      .catch(() => {});
    const wappen = (e, cls) => (e && bilder.get(e.sid) ? el('img', { class: cls, src: bilder.get(e.sid), alt: `Siegerwappen von ${e.name}` }) : null);
    const ov = el('div', { class: 'se-overlay', id: 'se-overlay', tabindex: '-1' });
    const schliessen = () => { document.removeEventListener('keydown', taste); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); };
    let abspielen = () => {};
    function taste(ev) {
      if (ev.key === 'Escape') schliessen();
      else if (ev.key === 'f' || ev.key === 'F') { if (!document.fullscreenElement) ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }
      else if (ev.key === 'r' || ev.key === 'R' || ev.key === ' ') { ev.preventDefault(); abspielen(); }
    }
    document.addEventListener('keydown', taste);
    document.body.append(ov);

    function klasseWaehlen() {
      ov.innerHTML = '';
      ov.append(el('div', { class: 'se-wahl' }, el('h2', {}, '🏆 Siegerehrung – welche Klasse?'),
        el('div', { class: 'se-klassen' }, klassen.map((k) => el('button', { type: 'button', class: 'btn', onclick: () => zeigen(k) }, k))),
        el('button', { type: 'button', class: 'btn secondary', onclick: schliessen }, 'Schließen')));
    }

    async function zeigen(klasse) {
      await bilderLaden;
      const liste = rangliste(a, klasse);
      ov.innerHTML = '';
      const kopf = el('div', { class: 'se-kopf' }, el('div', { class: 'se-titel' }, '🏆 Siegerehrung'), el('div', { class: 'se-unter' }, `ILS-Challenge „${a.titel}“ · ${klasse}`));
      const buehne = el('div', { class: 'se-treppchen' });
      const rest = el('ol', { class: 'se-rest', start: '4' });
      const knoepfe = el('div', { class: 'se-knoepfe' },
        el('button', { type: 'button', class: 'btn secondary', onclick: () => abspielen() }, '↻ Nochmal (R)'),
        el('button', { type: 'button', class: 'btn secondary', onclick: () => taste({ key: 'f' }) }, '⛶ Vollbild (F)'),
        klassen.length > 1 ? el('button', { type: 'button', class: 'btn secondary', onclick: klasseWaehlen }, 'Klasse wechseln') : null,
        el('button', { type: 'button', class: 'btn secondary', onclick: schliessen }, 'Schließen (Esc)'));
      ov.append(kopf, buehne, rest, knoepfe);
      if (!liste.length) { buehne.append(el('p', { class: 'se-leer' }, 'Noch keine Ergebnisse in dieser Klasse.')); abspielen = () => {}; return; }
      const stufe = (platz) => {
        const e = liste[platz - 1];
        return el('div', { class: `se-stufe se-p${platz}` + (e ? '' : ' leer') },
          wappen(e, 'se-wappen'),
          el('div', { class: 'se-name' }, e ? (platz === 1 ? '🏆 ' : '') + e.name : ''),
          el('div', { class: 'se-punkte' }, e ? `${e.punkte} Punkte` : ''),
          el('div', { class: 'se-block' }, String(platz)));
      };
      const stufen = { 2: stufe(2), 1: stufe(1), 3: stufe(3) };
      buehne.append(stufen[2], stufen[1], stufen[3]);
      const zeilen = liste.slice(3).map((e) => el('li', {}, wappen(e, 'se-wappen-klein'), el('span', {}, e.name), el('strong', {}, `${e.punkte} P.`)));
      rest.append(...zeilen);
      let timer = [];
      abspielen = () => {
        timer.forEach(clearTimeout); timer = [];
        [stufen[1], stufen[2], stufen[3], ...zeilen].forEach((x) => x.classList.remove('zeigen'));
        let t = 300;
        [...zeilen].reverse().forEach((z) => { timer.push(setTimeout(() => z.classList.add('zeigen'), t)); t += 250; });
        timer.push(setTimeout(() => stufen[3].classList.add('zeigen'), t + 300));
        timer.push(setTimeout(() => stufen[2].classList.add('zeigen'), t + 900));
        timer.push(setTimeout(() => { stufen[1].classList.add('zeigen'); konfetti(ov); }, t + 2700));
      };
      abspielen();
    }

    if (wahl.klasse) zeigen(wahl.klasse); else if (klassen.length === 1) zeigen(klassen[0]); else klasseWaehlen();
  }

  function konfetti(ziel) {
    const farben = ['#b4572a', '#1d7a46', '#1f3a5f', '#e8b923', '#c0392b', '#7a5bb5'];
    for (let i = 0; i < 140; i++) {
      const k = el('i', { class: 'se-konfetti', style: `left:${Math.random() * 100}%;background:${farben[i % farben.length]};` +
        `animation-delay:${Math.random() * 0.8}s;animation-duration:${2.5 + Math.random() * 2}s;transform:rotate(${Math.random() * 360}deg)` });
      ziel.append(k);
      setTimeout(() => k.remove(), 5500);
    }
  }

  /* ---------- Live-Rennen am Beamer: Wer ist wo? Wer ist zuerst im Ziel? ---------- */
  const RENNEN_TAKT_MS = 5000;
  const dauer = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + ':' + String(s % 60).padStart(2, '0');
  };
  const uhrzeit = (ms) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const MEDAILLE = ['🥇', '🥈', '🥉'];

  function rennen() {
    const a = auftrag();
    if (!a || !stand) return;
    const quiz = a.schritte.find((x) => x.abschluss);
    const klassen = [...new Set(stand.schueler.map((s) => s.klasse))].sort();
    let klasse = wahl.klasse || (klassen.length === 1 ? klassen[0] : '');
    let versatz = (stand.jetzt || Date.now()) - Date.now();   // Serveruhr minus eigene Uhr
    const serverJetzt = () => Date.now() + versatz;
    const startSchl = () => `ils-rennen-start|${a.id}|${klasse}`;
    const start = () => Number(merken.get(startSchl())) || 0;
    const ov = el('div', { class: 'se-overlay rennen', id: 'rennen-overlay', tabindex: '-1' });
    const teile2 = {};
    let bahnen = new Map();
    let imZiel = null;          // sids, die im Rennen schon im Ziel sind (null = erster Durchlauf, keine Einblendung)
    let zielListe = [];
    let ehrung = null;
    let ehrungAbspielen = () => {};

    const takt = setInterval(holen, RENNEN_TAKT_MS);
    const sekunde = setInterval(uhrStellen, 1000);
    function schliessen() {
      clearInterval(takt); clearInterval(sekunde);
      document.removeEventListener('keydown', taste);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      ov.remove();
      zeichnen();
    }
    function taste(ev) {
      if (ev.key === 'Escape') { if (ehrung) ehrungSchliessen(); else schliessen(); }
      else if (ev.key === 'f' || ev.key === 'F') { if (!document.fullscreenElement) ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }
      else if ((ev.key === 'r' || ev.key === 'R') && ehrung) ehrungAbspielen();
    }
    document.addEventListener('keydown', taste);
    document.body.append(ov);

    // Wo steht eine Person? wert = erledigte Schritte + Anteil am aktuellen Schritt (laut Live-Meldung vom Handy)
    function lage(s) {
      const p = (s.fortschritt || {})[a.id] || {};
      const fertig = a.schritte.filter((x) => p[x.id]).length;
      const ziel = quiz && p[quiz.id] ? p[quiz.id].um : null;
      const l = (s.live || {})[a.id];
      const jetzt = stand.jetzt || serverJetzt();
      let teil = 0;
      let status;
      if (l && !p[l.schritt] && jetzt - l.um < 15 * 60000) {
        const x = a.schritte.find((y) => y.id === l.schritt);
        const kurz = x ? x.kurz : '';
        if (l.phase === 'karten' && l.n) { teil = 0.8 * (l.i / l.n); status = `${kurz} · Aufgabe ${Math.min(l.i + 1, l.n)}/${l.n}`; }
        else if (l.phase === 'pause') { teil = l.n ? 0.8 * (l.i / l.n) : 0; status = `${kurz} · ⏸ Lesepause`; }
        else if (l.phase === 'schreiben' || l.phase === 'checkliste') { teil = 0.9; status = `${kurz} · ✍️ schreibt`; }
        else { teil = 0.03; status = `${kurz} · 📖 liest`; }
      } else if (fertig) status = `${fertig} von ${a.schritte.length} erledigt`;
      else status = s.ersteAnmeldung ? 'am Start' : 'noch nicht angemeldet';
      return { wert: Math.min(a.schritte.length, fertig + teil), ziel, status };
    }

    function klasseWaehlen() {
      ov.innerHTML = '';
      ov.append(el('div', { class: 'se-wahl' }, el('h2', {}, '🏁 Live-Rennen – welche Klasse?'),
        el('div', { class: 'se-klassen' }, klassen.map((k) => el('button', { type: 'button', class: 'btn', onclick: () => { klasse = k; aufbauen(); } }, k))),
        el('button', { type: 'button', class: 'btn secondary', onclick: schliessen }, 'Schließen')));
    }

    function aufbauen() {
      ov.innerHTML = '';
      bahnen = new Map();
      imZiel = null;
      teile2.uhr = el('span', { class: 'rb-uhr' });
      teile2.live = el('span', { class: 'rb-live', title: 'aktualisiert sich alle 5 Sekunden' }, '● live');
      teile2.strecke = el('div', { class: 'rb-strecke' });
      teile2.ziel = el('div', { class: 'rb-ziel', id: 'rb-ziel' });
      teile2.toast = el('div', { class: 'rb-toast', 'aria-live': 'polite' });
      teile2.startKnopf = el('button', { type: 'button', class: 'btn secondary', id: 'rb-start', onclick: starten });
      teile2.ehrungKnopf = el('button', { type: 'button', class: 'btn secondary', id: 'rb-ehrung', onclick: siegerehrungTop5 }, '🏆 Siegerehrung Top 5');
      const n = a.schritte.length;
      const marken = el('div', { class: 'rb-raster rb-marken' }, el('span', {}), el('span', {}),
        el('div', { class: 'rb-marken-spur' }, el('span', { style: 'left:0%' }, 'Start'),
          a.schritte.map((x, i) => el('span', { style: `left:${((i + 1) / n) * 100}%` }, x.abschluss ? '🏁 Ziel' : x.kurz))),
        el('span', {}));
      ov.append(
        el('div', { class: 'se-kopf rb-kopf' }, el('div', { class: 'se-titel' }, '🏁 ILS-Rennen'),
          el('div', { class: 'se-unter' }, `${a.titel} · ${klasse}`), el('div', { class: 'rb-zeile' }, teile2.uhr, teile2.live)),
        el('div', { class: 'rb-haupt' }, el('div', { class: 'rb-links' }, marken, el('div', { class: 'rb-strecke-box' }, teile2.strecke)), teile2.ziel),
        teile2.toast,
        el('div', { class: 'se-knoepfe' }, teile2.startKnopf, teile2.ehrungKnopf,
          el('button', { type: 'button', class: 'btn secondary', onclick: () => taste({ key: 'f' }) }, '⛶ Vollbild (F)'),
          klassen.length > 1 ? el('button', { type: 'button', class: 'btn secondary', onclick: klasseWaehlen }, 'Klasse wechseln') : null,
          el('button', { type: 'button', class: 'btn secondary', onclick: schliessen }, 'Schließen (Esc)')));
      uhrStellen();
      aktualisieren();
    }

    function uhrStellen() {
      if (!teile2.uhr) return;
      teile2.uhr.textContent = start() ? `⏱ ${dauer(serverJetzt() - start())}` : `🕒 ${uhrzeit(serverJetzt())} Uhr – Rennen noch nicht gestartet`;
      if (teile2.startKnopf) teile2.startKnopf.textContent = start() ? '↻ Rennen neu starten' : '▶ Rennen starten';
    }

    function starten() {
      if (start() && !window.confirm('Rennen neu starten? Die Zeit beginnt wieder bei 0. Wer schon im Ziel ist, zählt dann als „vorher fertig“.')) return;
      merken.set(startSchl(), String(serverJetzt()));
      imZiel = null;
      teile2.toast.textContent = '🏁 Los geht’s!';
      teile2.toast.classList.remove('zeigen'); void teile2.toast.offsetWidth; teile2.toast.classList.add('zeigen');
      uhrStellen();
      aktualisieren();
    }

    async function holen() {
      try {
        const r = await api('/api/lehrkraft/stand');
        if (r.status !== 200) throw new Error(String(r.status));
        stand = r.d;
        versatz = (stand.jetzt || Date.now()) - Date.now();
        if (teile2.live) teile2.live.classList.remove('aus');
        if (klasse && teile2.strecke) aktualisieren();
      } catch (e) {
        if (teile2.live) teile2.live.classList.add('aus');
      }
    }

    function aktualisieren() {
      if (!teile2.strecke || !teile2.strecke.isConnected) return;
      const st = start();
      const liste = stand.schueler.filter((s) => s.klasse === klasse).map((s) => ({ s, ...lage(s) }));
      const imRennen = (x) => !!x.ziel && (!st || x.ziel >= st);
      liste.sort((x, y) => (imRennen(y) - imRennen(x)) || (imRennen(x) && imRennen(y) ? x.ziel - y.ziel : 0)
        || (!!y.ziel - !!x.ziel) || (y.wert - x.wert) || x.s.name.localeCompare(y.s.name, 'de'));
      zielListe = liste.filter(imRennen);
      // neue Zieleinläufe groß einblenden
      if (imZiel) zielListe.forEach((x, i) => { if (!imZiel.has(x.s.sid)) einlauf(x, i + 1); });
      imZiel = new Set(zielListe.map((x) => x.s.sid));
      // Bahnen: jede Person behält ihr Element, damit Überholen weich animiert wird
      const hoehe = Math.max(30, Math.min(64, Math.floor((window.innerHeight * 0.6) / Math.max(1, liste.length))));
      teile2.strecke.style.height = `${liste.length * hoehe}px`;
      const n = a.schritte.length;
      liste.forEach((x, idx) => {
        let b = bahnen.get(x.s.sid);
        if (!b) {
          b = { platz: el('span', { class: 'rb-platz' }), name: el('span', { class: 'rb-name' }, x.s.name), fuellung: el('div', { class: 'rb-fuellung' }),
            figur: el('span', { class: 'rb-figur' }), status: el('span', { class: 'rb-status' }) };
          b.el = el('div', { class: 'rb-raster rb-bahn', 'data-sid': x.s.sid }, b.platz, b.name,
            el('div', { class: 'rb-spur' }, a.schritte.map((_, i) => el('i', { class: 'rb-linie', style: `left:${((i + 1) / n) * 100}%` })), b.fuellung, b.figur),
            b.status);
          bahnen.set(x.s.sid, b);
          teile2.strecke.append(b.el);
        }
        const pct = (x.wert / n) * 100;
        const platz = imRennen(x) ? zielListe.indexOf(x) + 1 : 0;
        b.el.style.height = `${hoehe}px`;
        b.el.style.transform = `translateY(${idx * hoehe}px)`;
        b.el.classList.toggle('im-ziel', !!x.ziel);
        b.el.classList.toggle('vorher', !!x.ziel && !platz);
        b.fuellung.style.width = `${pct}%`;
        b.figur.style.left = `${pct}%`;
        b.figur.textContent = x.ziel ? '🏁' : '🏃';
        b.platz.textContent = platz ? (MEDAILLE[platz - 1] || `${platz}.`) : x.ziel ? '✓' : `${idx + 1}.`;
        b.status.textContent = platz ? `Platz ${platz} · ${st ? dauer(x.ziel - st) : uhrzeit(x.ziel) + ' Uhr'}` : x.ziel ? 'schon vorher fertig' : x.status;
      });
      for (const [sid, b] of bahnen) if (!liste.some((x) => x.s.sid === sid)) { b.el.remove(); bahnen.delete(sid); }
      // Zieleinlauf-Liste rechts
      teile2.ziel.innerHTML = '';
      teile2.ziel.append(el('div', { class: 'rb-ziel-titel' }, '🏁 Im Ziel'),
        zielListe.length
          ? el('ol', {}, zielListe.slice(0, 10).map((x, i) => el('li', {}, el('span', {}, `${MEDAILLE[i] || `${i + 1}.`} ${x.s.name}`),
            el('strong', {}, st ? dauer(x.ziel - st) : uhrzeit(x.ziel)))))
          : el('p', { class: 'rb-leer' }, 'Noch niemand – wer ist zuerst da?'),
        el('p', { class: 'rb-anzahl' }, `${zielListe.length} von ${liste.length} im Ziel`));
      teile2.ehrungKnopf.disabled = !zielListe.length;
    }

    function einlauf(x, platz) {
      teile2.toast.textContent = `🎉 ${x.s.name} ist im Ziel – Platz ${platz}!`;
      teile2.toast.classList.remove('zeigen'); void teile2.toast.offsetWidth; teile2.toast.classList.add('zeigen');
      konfetti(ov);
    }

    // Siegerehrung der schnellsten 5 (Treppchen 2–1–3, dann Plätze 4 und 5)
    function siegerehrungTop5() {
      const st = start();
      const top = zielListe.slice(0, 5);
      if (!top.length) return;
      const zeitText = (x) => (st ? `nach ${dauer(x.ziel - st)}` : `um ${uhrzeit(x.ziel)} Uhr`);
      const buehne = el('div', { class: 'se-treppchen' });
      const stufe = (platz) => {
        const x = top[platz - 1];
        return el('div', { class: `se-stufe se-p${platz}` + (x ? '' : ' leer') },
          el('div', { class: 'se-name' }, x ? (platz === 1 ? '🏆 ' : '') + x.s.name : ''),
          el('div', { class: 'se-punkte' }, x ? zeitText(x) : ''),
          el('div', { class: 'se-block' }, String(platz)));
      };
      const stufen = { 2: stufe(2), 1: stufe(1), 3: stufe(3) };
      buehne.append(stufen[2], stufen[1], stufen[3]);
      const zeilen = top.slice(3).map((x) => el('li', {}, el('span', {}, x.s.name), el('strong', {}, zeitText(x))));
      ehrung = el('div', { class: 'rb-ehrung', id: 'rb-ehrung-ebene' },
        el('div', { class: 'se-kopf' }, el('div', { class: 'se-titel' }, '🏆 Siegerehrung'),
          el('div', { class: 'se-unter' }, `ILS-Rennen „${a.titel}“ · ${klasse} · die schnellsten ${top.length}`)),
        buehne, el('ol', { class: 'se-rest rb-rest', start: '4' }, zeilen),
        el('div', { class: 'se-knoepfe' },
          el('button', { type: 'button', class: 'btn secondary', onclick: () => ehrungAbspielen() }, '↻ Nochmal (R)'),
          el('button', { type: 'button', class: 'btn secondary', onclick: () => taste({ key: 'f' }) }, '⛶ Vollbild (F)'),
          el('button', { type: 'button', class: 'btn secondary', id: 'rb-zurueck', onclick: ehrungSchliessen }, '← Zurück zum Rennen (Esc)')));
      ov.append(ehrung);
      let timer = [];
      ehrungAbspielen = () => {
        timer.forEach(clearTimeout); timer = [];
        [stufen[1], stufen[2], stufen[3], ...zeilen].forEach((z) => z.classList.remove('zeigen'));
        let t = 300;
        [...zeilen].reverse().forEach((z) => { timer.push(setTimeout(() => z.classList.add('zeigen'), t)); t += 400; });
        timer.push(setTimeout(() => stufen[3].classList.add('zeigen'), t + 300));
        timer.push(setTimeout(() => stufen[2].classList.add('zeigen'), t + 1100));
        timer.push(setTimeout(() => { stufen[1].classList.add('zeigen'); konfetti(ehrung); }, t + 2600));
      };
      ehrungAbspielen();
    }
    function ehrungSchliessen() {
      if (ehrung) ehrung.remove();
      ehrung = null;
      aktualisieren();
    }

    if (klasse) aufbauen(); else klasseWaehlen();
    holen();
  }

  /* ---------- Siegerwappen: ansehen, löschen, Person vom Malen ausschließen ---------- */
  async function wappenGalerie() {
    const a = auftrag();
    if (!a || !stand) return;
    const box = teile.wappenBox;
    const titel = `🛡️ Siegerwappen – ${a.titel}` + (wahl.klasse ? ` · ${wahl.klasse}` : '');
    if (box.classList.contains('hidden')) {
      box.innerHTML = '';
      box.append(el('div', { class: 'q-text' }, titel), el('p', { class: 'small' }, 'wird geladen …'));
      box.classList.remove('hidden');
    }
    const r = await api('/api/lehrkraft/wappen?ils=' + encodeURIComponent(a.id)).catch(() => null);
    box.innerHTML = '';
    const schliessen = el('button', { type: 'button', class: 'btn secondary', onclick: () => box.classList.add('hidden') }, 'Schließen');
    if (!r || r.status !== 200) {
      box.append(el('div', { class: 'q-text' }, titel), el('div', { class: 'fb show bad' }, 'Die Siegerwappen konnten nicht geladen werden.'), schliessen);
      return;
    }
    const personen = new Map(stand.schueler.map((s) => [s.sid, s]));
    const liste = r.d.wappen.filter((w) => !wahl.klasse || w.klasse === wahl.klasse);
    const gesperrt = r.d.gesperrt.map((sid) => personen.get(sid)).filter((s) => s && (!wahl.klasse || s.klasse === wahl.klasse)).sort(vergleich);
    const neu = liste.filter((w) => !w.gesehen);
    const fb = el('div', { class: 'fb' });
    const aktion = async (weg, daten, frage) => {
      if (frage && !window.confirm(frage)) return;
      const x = await api(weg, daten).catch(() => null);
      if (!x || x.status !== 200) { fb.className = 'fb show bad'; fb.textContent = 'Das hat nicht geklappt. Bitte erneut versuchen.'; return; }
      await wappenGalerie();
      await laden(false);
    };
    const gesehen = (sids) => aktion('/api/lehrkraft/wappen-gesehen', { ils: a.id, sids });
    const loeschen = (w) => aktion('/api/lehrkraft/wappen-loeschen', { sid: w.sid, ils: a.id }, `Siegerwappen von ${w.name} löschen? ${w.name} kann danach ein neues malen.`);
    const sperre = (sid, name, an) => aktion('/api/lehrkraft/wappen-sperre', { sid, gesperrt: an },
      an ? `${name} vom Malen ausschließen? Alle Siegerwappen von ${name} werden gelöscht und ${name} kann keine neuen malen.` : null);

    box.append(...[
      el('div', { class: 'q-text' }, titel),
      el('p', { class: 'small' }, 'Neue Siegerwappen erscheinen sofort in der Bestenliste der Klasse auf den Handys. ' +
        'In der 🏆 Siegerehrung am Beamer erscheinen nur Wappen, die Sie hier als angesehen markiert haben.'),
      neu.length ? el('button', { type: 'button', class: 'btn', id: 'lk-wappen-alle', onclick: () => gesehen(neu.map((w) => w.sid)) },
        neu.length === 1 ? '✓ Das neue Wappen als angesehen markieren' : `✓ Alle ${neu.length} neuen als angesehen markieren`) : null,
      liste.length
        ? el('div', { class: 'wappen-galerie' }, liste.map((w) => el('figure', { class: 'wappen-kachel' + (w.gesehen ? '' : ' neu'), 'data-sid': w.sid },
          el('img', { src: w.bild, alt: `Siegerwappen von ${w.name}` }),
          el('figcaption', {}, el('strong', {}, w.name), ` · ${w.klasse}`, el('br'),
            el('span', { class: 'small' }, (w.gesehen ? '' : '🆕 neu · ') + zeit(w.um))),
          el('div', { class: 'wappen-aktionen' },
            w.gesehen ? null : el('button', { type: 'button', class: 'btn secondary', onclick: () => gesehen([w.sid]) }, '✓ Angesehen'),
            el('button', { type: 'button', class: 'btn secondary gefahr', onclick: () => loeschen(w) }, 'Löschen'),
            el('button', { type: 'button', class: 'btn secondary gefahr', onclick: () => sperre(w.sid, w.name, true) }, 'Vom Malen ausschließen')))))
        : el('p', {}, 'Noch keine Siegerwappen' + (wahl.klasse ? ' in dieser Klasse.' : '.')),
      gesperrt.length ? el('div', {}, el('h3', {}, 'Vom Malen ausgeschlossen'),
        el('ul', { class: 'wappen-gesperrt' }, gesperrt.map((s) => el('li', {}, `${s.name} (${s.klasse}) `,
          el('button', { type: 'button', class: 'btn secondary', onclick: () => sperre(s.sid, s.name, false) }, 'Wieder zulassen'))))) : null,
      el('div', { class: 'lk-knoepfe' }, el('button', { type: 'button', class: 'btn secondary', onclick: wappenGalerie }, '↻ Neu laden'), schliessen),
      fb].filter(Boolean));
  }

  /* ---------- CSV für Excel ---------- */
  function csv() {
    const a = auftrag();
    if (!a || !stand) return;
    const feld = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const zeilen = [['Klasse', 'Name', ...a.schritte.map((x) => x.titel), 'Abgeschlossen', ...(a.challenge ? ['Challenge (beste Punkte)'] : [])].map(feld).join(';')];
    stand.schueler.filter((s) => !wahl.klasse || s.klasse === wahl.klasse).sort(vergleich).forEach((s) => {
      const w = auswerten(s, a);
      zeilen.push([s.klasse, s.name, ...a.schritte.map((x) => {
        const e = w.p[x.id];
        if (!e) return '';
        return datum(e.um) + (e.quelle === 'lehrkraft' ? ' (von Hand)' : '') + (x.abschluss && e.max ? ` (${e.punkte}/${e.max})` : '') +
          (e.neustarts ? ` Neustarts: ${e.neustarts}` : '') + (e.zuSchnell ? ` Zu schnell: ${e.zuSchnell}` : '') + (e.selbstMax ? ` Selbstkontrolle: ${e.selbst}/${e.selbstMax}` : '');
      }), w.fertig ? 'ja' : 'nein', ...(a.challenge ? [((s.challenge || {})[a.id] || {}).punkte ?? ''] : [])].map(feld).join(';'));
    });
    const blob = new Blob(['﻿' + zeilen.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const heute = new Date().toISOString().slice(0, 10);
    const link = el('a', { href: url, download: `ILS_${a.id}_${(wahl.klasse || 'alle').replace(/[^A-Za-z0-9]+/g, '-')}_${heute}.csv` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ---------- Verwaltung ---------- */
  function verwaltung() {
    const meldung = (ziel, text, art) => { ziel.className = 'fb show ' + (art || 'ok'); ziel.textContent = text; };
    const fehlerText = (r) => (!r ? 'Server nicht erreichbar.' : `Das hat nicht geklappt (${r.status}${r.d && r.d.grund ? ', ' + r.d.grund : ''}).`);

    // Klassenliste
    const importFeld = el('textarea', { id: 'lk-import', rows: '6', placeholder: '3BFP2/1;Lena M.;05.09.2004\n3BFP2/1;Mohamed A.;01.02.2003' });
    const importFb = el('div', { class: 'fb' });
    const importKnopf = el('button', { type: 'button', class: 'btn', id: 'lk-import-knopf' }, 'Übernehmen');
    importKnopf.addEventListener('click', async () => {
      if (!importFeld.value.trim()) return meldung(importFb, 'Bitte zuerst die Liste einfügen.', 'hint');
      importKnopf.disabled = true;
      const r = await api('/api/lehrkraft/import', { text: importFeld.value }).catch(() => null);
      importKnopf.disabled = false;
      if (!r || r.status !== 200) return meldung(importFb, fehlerText(r), 'bad');
      const f = r.d.fehler || [];
      meldung(importFb, `${r.d.neu} neu eingetragen, ${r.d.aktualisiert} aktualisiert.` +
        (f.length ? ` Nicht übernommen: ${f.map((x) => `Zeile ${x.zeile} (${x.text})`).join(', ')}.` : ''), f.length ? 'hint' : 'ok');
      if (!f.length) importFeld.value = '';   // Geburtsdaten nicht unnötig stehen lassen
      laden(false);
    });

    // Person
    const personFb = el('div', { class: 'fb' });
    const person = () => stand && stand.schueler.find((s) => s.sid === teile.personWahl.value);
    const personAktion = async (weg, frage, erfolg) => {
      const s = person();
      if (!s) return meldung(personFb, 'Bitte zuerst eine Person wählen.', 'hint');
      if (!window.confirm(frage(s))) return;
      const r = await api(weg, { sid: s.sid }).catch(() => null);
      if (!r || r.status !== 200) return meldung(personFb, fehlerText(r), 'bad');
      meldung(personFb, erfolg(s, r.d));
      laden(false);
    };

    // Auftrag
    const auftragFb = el('div', { class: 'fb' });
    // Alles
    const allesFeld = el('input', { id: 'lk-alles', placeholder: 'ALLES LÖSCHEN', autocomplete: 'off' });
    const allesFb = el('div', { class: 'fb' });

    return el('details', { class: 'card lk-verwaltung', id: 'lk-verwaltung' },
      el('summary', {}, 'Verwaltung (Klassenliste, Personen, Löschen)'),

      el('h3', {}, 'Klassenliste einfügen'),
      el('p', { class: 'small' }, 'Eine Zeile pro Person: Klasse; Vorname + 1. Buchstabe Nachname; Geburtsdatum. Spalten aus Excel (mit Tabulator) gehen auch. ' +
        'Bekannte Personen (gleiche Klasse und gleicher Name) werden aktualisiert, ihr Fortschritt bleibt erhalten. Geburtsdaten werden nicht gespeichert, nur ein Prüfwert.'),
      importFeld, importKnopf, importFb,

      el('h3', {}, 'Einzelne Person'),
      teile.personWahl,
      el('div', { class: 'lk-knoepfe' },
        el('button', { type: 'button', class: 'btn secondary', onclick: () => personAktion('/api/lehrkraft/abmelden',
          (s) => `Alle Geräte von ${s.name} abmelden? (z. B. bei verlorenem Handy – die Person meldet sich einfach neu an.)`,
          (s, d) => `${s.name}: ${d.abgemeldet} Gerät(e) abgemeldet.`) }, 'Alle Geräte abmelden'),
        el('button', { type: 'button', class: 'btn secondary gefahr', onclick: () => personAktion('/api/lehrkraft/schueler-loeschen',
          (s) => `${s.name} (${s.klasse}) mit dem gesamten Fortschritt löschen? Das lässt sich nicht rückgängig machen.`,
          (s) => `${s.name} wurde gelöscht.`) }, 'Person löschen'),
        el('button', { type: 'button', class: 'btn secondary', id: 'lk-person-malen', onclick: async () => {
          const s = person();
          if (!s) return meldung(personFb, 'Bitte zuerst eine Person wählen.', 'hint');
          const an = !s.malenGesperrt;
          if (an && !window.confirm(`${s.name} vom Malen eines Siegerwappens ausschließen? Vorhandene Wappen von ${s.name} werden gelöscht.`)) return;
          const r = await api('/api/lehrkraft/wappen-sperre', { sid: s.sid, gesperrt: an }).catch(() => null);
          if (!r || r.status !== 200) return meldung(personFb, fehlerText(r), 'bad');
          meldung(personFb, an ? `${s.name} darf kein Siegerwappen mehr malen.` : `${s.name} darf wieder ein Siegerwappen malen.`);
          laden(false);
        } }, 'Siegerwappen: Malen aus/an')),
      personFb,

      el('h3', {}, 'Fortschritt eines ILS-Auftrags löschen'),
      el('p', { class: 'small' }, 'Löscht die Haken aller Personen für diesen Auftrag. Die Klassenliste bleibt.'),
      teile.auftragWahl,
      el('button', { type: 'button', class: 'btn secondary gefahr', onclick: async () => {
        const a = AUFTRAEGE.find((x) => x.id === teile.auftragWahl.value);
        if (!a || !window.confirm(`Den gesamten Fortschritt für „${a.titel}“ löschen? Das lässt sich nicht rückgängig machen.`)) return;
        const r = await api('/api/lehrkraft/auftrag-loeschen', { ils: a.id }).catch(() => null);
        if (!r || r.status !== 200) return meldung(auftragFb, fehlerText(r), 'bad');
        meldung(auftragFb, `Fortschritt für „${a.titel}“ gelöscht (${r.d.betroffen} Personen betroffen).`);
        laden(false);
      } }, 'Fortschritt löschen'),
      auftragFb,

      el('h3', {}, 'Alles löschen'),
      el('p', { class: 'small' }, 'Löscht Klassenlisten, Anmeldungen und den gesamten Fortschritt aller ILS-Aufträge – z. B. am Schuljahresende. Tippen Sie zur Bestätigung ALLES LÖSCHEN ein.'),
      allesFeld,
      el('button', { type: 'button', class: 'btn secondary gefahr', onclick: async () => {
        if (allesFeld.value.trim() !== 'ALLES LÖSCHEN') return meldung(allesFb, 'Bitte genau ALLES LÖSCHEN eintippen.', 'hint');
        const r = await api('/api/lehrkraft/alles-loeschen', { bestaetigung: 'ALLES LÖSCHEN' }).catch(() => null);
        if (!r || r.status !== 200) return meldung(allesFb, fehlerText(r), 'bad');
        allesFeld.value = '';
        meldung(allesFb, 'Alle Daten wurden gelöscht.');
        laden(false);
      } }, 'Alles löschen'),
      allesFb,

      el('h3', {}, 'Abmelden'),
      el('button', { type: 'button', class: 'btn secondary', onclick: () => { sitzung.set('ils-lk-pw', null); passwort = ''; stand = null; anmeldung(); } }, 'Von der Lehrkraft-Seite abmelden'));
  }

  setInterval(() => {
    if (stand && document.visibilityState === 'visible') laden(false);
  }, 30000);

  if (passwort) laden(false); else anmeldung();
})();
