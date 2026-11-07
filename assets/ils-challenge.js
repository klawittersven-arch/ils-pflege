/* ILS-Challenge – freiwilliges Highscore-Spiel nach dem bestandenen Abschlussquiz (wie die Klausur-Challenge der Lernkarten).
   Braucht vorher: ils.js, ils-server.js, auftraege.js, ils-konto.js, ils-lern.js.

   ILSChallenge.start({ mount: '#app', ils: 'drainage', pools: [{ name: 'Abschnitt 1 …', ziehen: 3, aufgaben: [...] }, …] })

   · 20 Aufgaben aus allen Übungen des Auftrags (aus jedem Abschnitt mindestens 3), in zufälliger Reihenfolge.
   · 150 Punkte je Aufgabe; bei Aufgaben mit mehreren Schritten anteilig – jeder Fehlklick kostet.
   · Zeitbonus bis 750 Punkte, sinkt in 15 Minuten auf 0 und zählt nur anteilig zu den richtigen Antworten.
     Die Zeit misst der Server (Start bis Ende), die Mindest-Lesezeit je Aufgabe gilt weiter.
   · Lösungen gibt es erst am Ende. Bestenliste je ILS-Auftrag und Klasse (Vorname + Initial).
   · Siegerwappen: Wer ein Ergebnis hat, darf ein kleines Bild malen (je Auftrag eines), das neben dem Namen erscheint. */
const ILSChallenge = (() => {
  'use strict';
  const el = ILS.el;
  const K = ILSKonto;
  const L = ILSLern;
  const PUNKTE = 150;
  const ohneTags = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const span = (h, c) => el('span', { class: c || null, html: String(h) });
  const uhr = (sek) => `${Math.floor(sek / 60)}:${String(Math.floor(sek % 60)).padStart(2, '0')}`;
  const speicher = {
    lesen(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    schreiben(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } }
  };

  // Wie viele Teilschritte hat eine Aufgabe? (für anteilige Punkte)
  function teile(a) {
    switch (a.typ) {
      case 'reihe': return a.schritte.length;
      case 'sortieren': return a.elemente.length;
      case 'luecke': return (a.text.match(/\{\{[^}]+\}\}/g) || []).length;
      case 'bild': return a.ziele.length;
      case 'dialog': return a.knoten.length;
      default: return 1;
    }
  }

  // Lösung als Text für die Auswertung am Ende
  function loesung(a) {
    switch (a.typ) {
      case 'wahl': return ohneTags(a.optionen[a.richtig]);
      case 'rf': return `Die Aussage ist ${a.richtig ? 'richtig' : 'falsch'}.` + (a.begruendung ? ' ' + ohneTags(a.begruendung.optionen[a.begruendung.richtig]) : '');
      case 'mehrfach': return a.richtig.map((i) => ohneTags(a.optionen[i])).join(' · ');
      case 'zahl': return `${String(a.richtig).replace('.', ',')} ${a.einheit || ''}`;
      case 'reihe': return a.schritte.map((t, i) => `${i + 1}. ${ohneTags(t)}`).join(' → ');
      case 'sortieren': return a.kategorien.map((k, i) => `${ohneTags(k)}: ${a.elemente.filter((e) => e.k === i).map((e) => ohneTags(e.t)).join(', ')}`).join(' | ');
      case 'luecke': return ohneTags(a.text.replace(/\{\{([^}]+)\}\}/g, '[$1]'));
      case 'bild': return a.ziele.map((z) => `${ohneTags(z.frage)} → ${z.name}`).join(' · ');
      case 'dialog': return a.knoten.map((k) => ohneTags(k.optionen.find((o) => o.richtig).t)).join(' → ');
      default: return '';
    }
  }

  /* ---------- Siegerwappen malen ---------- */
  const FARBEN = ['#1f1d1b', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2471a3', '#8e44ad', '#7b4a2a', '#ffffff'];
  const DICKEN = [['dünn', 5], ['mittel', 11], ['dick', 22]];

  function wappenEditor(speichern, abbrechen) {
    const G = 256;
    let farbe = FARBEN[1];
    let dicke = DICKEN[1][1];
    const striche = [];
    let aktuell = null;
    const cv = el('canvas', { width: G, height: G, class: 'wappen-flaeche', id: 'wappen-flaeche', 'aria-label': 'Malfläche für das Siegerwappen' });
    const ctx = cv.getContext('2d');
    function zeichnen() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, G, G);
      for (const st of striche) {
        ctx.strokeStyle = st.farbe; ctx.fillStyle = st.farbe; ctx.lineWidth = st.dicke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (st.punkte.length === 1) { ctx.beginPath(); ctx.arc(st.punkte[0][0], st.punkte[0][1], st.dicke / 2, 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.beginPath();
        st.punkte.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    }
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * G / r.width, (e.clientY - r.top) * G / r.height]; };
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      meldung.className = 'fb';
      aktuell = { farbe, dicke, punkte: [pos(e)] };
      striche.push(aktuell);
      zeichnen();
    });
    cv.addEventListener('pointermove', (e) => { if (!aktuell) return; e.preventDefault(); aktuell.punkte.push(pos(e)); zeichnen(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => cv.addEventListener(t, () => { aktuell = null; }));
    zeichnen();

    const farbKnoepfe = FARBEN.map((f) => {
      const b = el('button', { type: 'button', class: 'farbe' + (f === farbe ? ' an' : ''), style: `background:${f}`, 'aria-label': f === '#ffffff' ? 'Radierer (weiß)' : 'Farbe ' + f });
      b.addEventListener('click', () => { farbe = f; farbKnoepfe.forEach((x) => x.classList.toggle('an', x === b)); });
      return b;
    });
    const dickKnoepfe = DICKEN.map(([name, d]) => {
      const b = el('button', { type: 'button', class: 'dicke' + (d === dicke ? ' an' : '') }, name);
      b.addEventListener('click', () => { dicke = d; dickKnoepfe.forEach((x) => x.classList.toggle('an', x === b)); });
      return b;
    });
    const meldung = el('div', { class: 'fb' });
    const speichernKnopf = el('button', { type: 'button', class: 'btn', id: 'wappen-speichern' }, 'Siegerwappen speichern');
    speichernKnopf.addEventListener('click', async () => {
      if (!striche.length) { meldung.className = 'fb show hint'; meldung.textContent = 'Malen Sie zuerst etwas.'; return; }
      let bild = '';
      for (const g of [128, 96, 64]) {
        const klein = document.createElement('canvas');
        klein.width = g; klein.height = g;
        const k2 = klein.getContext('2d');
        k2.imageSmoothingQuality = 'high';
        k2.drawImage(cv, 0, 0, g, g);
        bild = klein.toDataURL('image/png');
        if (bild.length <= 38000) break;
      }
      speichernKnopf.disabled = true;
      const fehler = await speichern(bild);
      speichernKnopf.disabled = false;
      if (fehler) { meldung.className = 'fb show bad'; meldung.textContent = fehler; }
    });
    return el('div', { class: 'wappen-editor' },
      el('div', { class: 'q-text' }, '🛡️ Ihr Siegerwappen'),
      el('p', { class: 'small' }, 'Malen Sie mit dem Finger ein kleines Bild. Es erscheint neben Ihrem Namen in der Bestenliste Ihrer Klasse – alle können es sehen.'),
      el('div', { class: 'wappen-flaeche-rahmen' }, cv),
      el('div', { class: 'farben' }, farbKnoepfe),
      el('div', { class: 'dicken' }, dickKnoepfe,
        el('button', { type: 'button', class: 'dicke', onclick: () => { striche.pop(); zeichnen(); } }, '↶ Rückgängig'),
        el('button', { type: 'button', class: 'dicke', onclick: () => { striche.length = 0; zeichnen(); } }, 'Neu')),
      el('div', { class: 'lk-knoepfe' }, speichernKnopf, el('button', { type: 'button', class: 'btn secondary', onclick: abbrechen }, 'Abbrechen')),
      meldung);
  }

  const wappenBild = (bild, name, cls) => (bild && bild.startsWith('data:image/png;base64,')
    ? el('img', { class: cls || 'wappen', src: bild, alt: `Siegerwappen von ${name}` }) : el('span', { class: (cls || 'wappen') + ' leer', 'aria-hidden': 'true' }));

  function start(cfg) {
    const { oben, info, inhalt } = K.rahmen(cfg);
    const a = K.auftrag(cfg.ils);
    const quiz = a && a.schritte.find((s) => s.abschluss);
    const pools = cfg.pools;
    const sig = L.signatur(pools.flatMap((p) => p.aufgaben));
    const schluessel = () => `ils-challenge|${K.werIst(K.konto()) || 'gast'}|${cfg.ils}`;
    let S = null;
    let ticker = null;
    const sichern = () => speicher.schreiben(schluessel(), S);
    const leeren = () => { clearInterval(ticker); inhalt.innerHTML = ''; window.scrollTo(0, 0); };

    function bestenliste(liste, eigenerName) {
      if (!liste || !liste.length) return el('p', { class: 'small' }, 'Noch niemand aus Ihrer Klasse hat die Challenge gespielt – seien Sie die oder der Erste!');
      return el('ol', { class: 'bestenliste' }, liste.map((e, i) => el('li', { class: e.name === eigenerName ? 'ich' : null },
        el('span', { class: 'platz' }, ['🥇', '🥈', '🥉'][i] || `${i + 1}.`), wappenBild(e.wappen, e.name),
        el('span', { class: 'name' }, e.name),
        el('span', { class: 'pkt' }, `${e.punkte} P.`), el('span', { class: 'zeit' }, uhr(e.sekunden)))));
    }

    const offenSchl = () => `ils-wappen-offen|${K.werIst(K.konto()) || 'gast'}|${cfg.ils}`;
    async function wappenSenden(bild) {
      const k = K.konto();
      try {
        const { status, d } = await K.api('/api/challenge/wappen', { methode: 'POST', token: k && k.token, daten: { ils: cfg.ils, bild } });
        if (status === 200) { speicher.schreiben(offenSchl(), null); return ''; }
        if (d.grund === 'wappen-gesperrt') return 'Ihre Lehrkraft hat das Malen für Sie ausgeschaltet.';
        if (d.grund === 'voraussetzung') return 'Spielen Sie zuerst einmal die Challenge.';
        return 'Das Bild konnte nicht gespeichert werden. Bitte versuchen Sie es noch einmal.';
      } catch (e) {
        speicher.schreiben(offenSchl(), bild);
        return 'Keine Verbindung – Ihr Wappen wird gesendet, sobald Sie die Challenge-Seite wieder online öffnen.';
      }
    }

    // Bereich „Ihr Siegerwappen“ unter Ergebnis bzw. Startseite
    function wappenBereich(info) {
      const box = el('div', { class: 'card wappen-box', id: 'wappen-box' });
      const zeigen = (bild) => {
        box.innerHTML = '';
        if (info.malenGesperrt) {
          box.append(el('div', { class: 'q-text' }, '🛡️ Siegerwappen'), el('p', { class: 'small' }, 'Ihre Lehrkraft hat das Malen eines Siegerwappens für Sie ausgeschaltet.'));
          return;
        }
        box.append(el('div', { class: 'wappen-zeile' }, wappenBild(bild, 'Ihnen', 'wappen gross'),
          el('div', {}, el('div', { class: 'q-text' }, '🛡️ Ihr Siegerwappen'),
            el('p', { class: 'small' }, bild ? 'So sehen die anderen Ihr Wappen in der Bestenliste.' : 'Malen Sie ein kleines Bild – es erscheint neben Ihrem Namen in der Bestenliste.'))),
        el('button', { type: 'button', class: 'btn block', id: 'wappen-malen', onclick: () => {
          box.innerHTML = '';
          box.append(wappenEditor(async (neu) => {
            const fehler = await wappenSenden(neu);
            if (!fehler || /Keine Verbindung/.test(fehler)) {
              const k = K.konto();
              info.meinWappen = neu;
              (info.liste || []).forEach((e) => { if (k && e.name === k.name) e.wappen = neu; });
              if (S) sichern();
              document.querySelectorAll('.bestenliste li.ich .wappen').forEach((w) => w.replaceWith(wappenBild(neu, k && k.name)));
              zeigen(neu);
              if (fehler) box.append(el('p', { class: 'small' }, fehler));
              return '';
            }
            return fehler;
          }, () => zeigen(info.meinWappen)));
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } }, bild ? 'Siegerwappen neu malen' : 'Siegerwappen malen'));
      };
      zeigen(info.meinWappen);
      return box;
    }

    async function startZeigen() {
      leeren();
      const karte = el('div', { class: 'card lern-start challenge' },
        el('div', { class: 'q-text' }, '🏁 ILS-Challenge'),
        el('ul', { class: 'lern-regeln' }, [
          '20 Aufgaben aus allen Übungen dieses ILS-Auftrags – in zufälliger Reihenfolge.',
          '150 Punkte je richtiger Aufgabe. Bei Aufgaben mit mehreren Schritten kostet jeder Fehlklick Punkte.',
          'Zeitbonus bis 750 Punkte: Er sinkt mit jeder Sekunde (nach 15 Minuten ist er weg) und zählt nur anteilig zu Ihren richtigen Antworten – Raten lohnt sich nicht.',
          'Tempo zahlt sich aus: Sie können sofort antworten. Aber jede falsche Antwort kostet Punkte – und damit auch Zeitbonus.',
          'Die Lösungen sehen Sie am Ende. Sie können die Challenge so oft spielen, wie Sie möchten – Ihr bestes Ergebnis zählt.',
          'Ihr Name (Vorname und 1. Buchstabe des Nachnamens) erscheint in der Bestenliste Ihrer Klasse.'
        ].map((t) => el('li', {}, t))));
      const knopf = el('button', { type: 'button', class: 'btn block', id: 'ch-start' }, 'Challenge starten');
      const meldung = el('div', { class: 'fb' });
      karte.append(knopf, meldung);
      const liste = el('div', { class: 'card' }, el('div', { class: 'q-text' }, 'Bestenliste Ihrer Klasse'), el('p', { class: 'small' }, 'wird geladen …'));
      inhalt.append(karte, liste);
      knopf.addEventListener('click', async () => {
        knopf.disabled = true;
        try {
          const k = K.konto();
          const { status, d } = await K.api('/api/challenge/start', { methode: 'POST', token: k && k.token, daten: { ils: cfg.ils } });
          if (status === 200 && d.laufId) {
            const karten = [];
            pools.forEach((p, pi) => L.ziehen(p.aufgaben, Math.min(p.ziehen, p.aufgaben.length)).forEach((i) => karten.push({ p: pi, i })));
            S = { sig, phase: 'lauf', laufId: d.laufId, start: Date.now(), karten: ILS.shuffle(karten), pos: 0, ergebnisse: [] };
            sichern();
            zeigen();
            return;
          }
          meldung.className = 'fb show bad';
          meldung.textContent = d.grund === 'voraussetzung' ? 'Die Challenge wird nach dem bestandenen Abschlussquiz freigeschaltet.'
            : status === 401 ? 'Bitte melden Sie sich oben an.' : 'Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.';
        } catch (e) {
          meldung.className = 'fb show bad';
          meldung.textContent = 'Keine Verbindung. Für die Challenge brauchen Sie Internet.';
        }
        knopf.disabled = false;
      });
      try {
        const k = K.konto();
        const { status, d } = await K.api('/api/challenge/liste?ils=' + encodeURIComponent(cfg.ils), { token: k && k.token });
        liste.innerHTML = '';
        liste.append(el('div', { class: 'q-text' }, `Bestenliste ${d.klasse || ''}`));
        if (status === 200) {
          liste.append(bestenliste(d.liste, k && k.name));
          if (d.best) {
            liste.append(el('p', { class: 'small' }, `Ihr bestes Ergebnis: ${d.best.punkte} Punkte (${uhr(d.best.sekunden)}) – Platz ${d.platz} von ${d.von}.`));
            inhalt.append(wappenBereich(d));
          }
        }
      } catch (e) { liste.querySelector('.small').textContent = 'Bestenliste gerade nicht erreichbar.'; }
    }

    function kopf() {
      const pkt = S.ergebnisse.reduce((x, e) => x + e.punkte, 0);
      const zeit = el('span', { class: 'ch-uhr' }, '⏱ ' + uhr((Date.now() - S.start) / 1000));
      ticker = setInterval(() => { zeit.textContent = '⏱ ' + uhr((Date.now() - S.start) / 1000); }, 1000);
      return el('div', { class: 'lern-kopf ch-kopf' }, el('span', {}, `Aufgabe ${S.pos + 1} von ${S.karten.length}`), zeit, el('span', { class: 'ch-punkte' }, `⭐ ${pkt}`));
    }

    function karteZeigen() {
      const ref = S.karten[S.pos];
      const auf = pools[ref.p].aufgaben[ref.i];
      inhalt.append(kopf(), el('div', { class: 'balken lern-balken' }, el('span', { style: `width:${Math.round((S.pos / S.karten.length) * 100)}%` })));
      const karte = el('div', { class: 'card lern-karte', 'data-typ': auf.typ });
      if (auf.frage) karte.append(el('div', { class: 'q-text', html: auf.frage }));
      if (auf.bild) karte.append(el('div', { class: 'figure' }, el('img', { src: auf.bild, alt: auf.bildAlt || '' })));
      const hinweis = el('div', { class: 'lern-hinweis', role: 'status', 'aria-live': 'polite' });
      const fb = el('div', { class: 'fb', 'aria-live': 'polite' });
      const weiter = el('button', { type: 'button', class: 'btn block hidden', id: 'ch-weiter' }, S.pos + 1 < S.karten.length ? 'Weiter' : 'Auswerten');
      inhalt.append(karte, hinweis, fb, weiter);
      let fehlerHier = 0;
      let fertig = false;
      const zeigeHinweis = (t, art) => { hinweis.className = 'lern-hinweis zeigen ' + art; hinweis.textContent = t; };

      function abschliessen(anteil) {
        if (fertig) return;
        fertig = true;
        const punkte = Math.max(0, Math.round(PUNKTE * anteil));
        S.ergebnisse.push({ p: ref.p, i: ref.i, punkte, max: PUNKTE });
        S.pos += 1;
        if (S.pos >= S.karten.length) S.phase = 'senden';
        sichern();
        hinweis.className = 'lern-hinweis';
        fb.className = 'fb show ' + (punkte === PUNKTE ? 'ok' : punkte > 0 ? 'hint' : 'bad');
        fb.textContent = punkte === PUNKTE ? `✓ Richtig! +${punkte}` : punkte > 0 ? `◐ Teilweise richtig: +${punkte}` : '✗ Leider falsch: +0 – die Lösung sehen Sie am Ende.';
        weiter.classList.remove('hidden');
        weiter.addEventListener('click', zeigen);
      }

      const api = {
        karte,
        hinweis: (t) => zeigeHinweis(t, 'hint'),
        // In der Challenge gibt es keine Mindest-Lesezeit: Tempo bringt Zeitbonus, Raten lohnt sich trotzdem nicht,
        // weil falsche Antworten 0 Punkte bringen und der Bonus nur anteilig zu den richtigen Antworten zählt.
        versuch() { return !fertig; },
        neuerText() { /* keine Lesezeit */ },
        fehler() {
          fehlerHier += 1;
          zeigeHinweis(`✗ Fehlklick – kostet Punkte (${fehlerHier})`, 'bad');
          return true;
        },
        antwort(ok) { abschliessen(ok ? 1 : 0); },
        geloest() { abschliessen(Math.max(0, 1 - fehlerHier / teile(auf))); }
      };
      (L.TYPEN[auf.typ] || L.TYPEN.wahl)(auf, api);
    }

    async function senden() {
      leeren();
      const karte = el('div', { class: 'card lern-start' }, el('div', { class: 'q-text' }, '⏳ Ergebnis wird ausgewertet …'));
      inhalt.append(karte);
      const aufgabenPunkte = S.ergebnisse.reduce((x, e) => x + e.punkte, 0);
      try {
        const k = K.konto();
        const { status, d } = await K.api('/api/challenge/ende', { methode: 'POST', token: k && k.token,
          daten: { ils: cfg.ils, laufId: S.laufId, aufgabenPunkte, anzahl: S.karten.length } });
        if (status === 200) { S.phase = 'ende'; S.resultat = d; sichern(); leeren(); endeZeigen(false); return; }
        karte.innerHTML = '';
        karte.append(el('div', { class: 'q-text' }, 'Ergebnis nicht gewertet'),
          el('p', {}, d.grund === 'zu-schnell' ? 'Das ging schneller, als man die Aufgaben lesen kann – dieser Durchgang zählt nicht.'
            : d.grund === 'lauf-unbekannt' ? 'Dieser Durchgang ist nicht mehr gültig (z. B. weil Sie auf einem anderen Gerät neu gestartet haben).'
              : 'Das Ergebnis konnte nicht gewertet werden.'),
          el('button', { type: 'button', class: 'btn block', onclick: () => { S = null; speicher.schreiben(schluessel(), null); startZeigen(); } }, 'Neu starten'));
      } catch (e) {
        karte.innerHTML = '';
        karte.append(el('div', { class: 'q-text' }, '📶 Keine Verbindung'),
          el('p', {}, `Sie haben ${aufgabenPunkte} Aufgabenpunkte. Ihr Ergebnis ist gespeichert – senden Sie es, sobald Sie wieder online sind.`),
          el('button', { type: 'button', class: 'btn block', id: 'ch-senden', onclick: senden }, 'Ergebnis senden'));
      }
    }

    // nachladen = true: Ergebnis kommt aus dem Speicher → Bestenliste und Wappen-Stand frisch vom Server holen
    function endeZeigen(nachladen) {
      const r = S.resultat;
      const k = K.konto();
      const kopfKarte = el('div', { class: 'card ch-ergebnis' },
        el('div', { class: 'small' }, 'Ihr Ergebnis'),
        el('div', { class: 'ch-gesamt' }, `${r.punkte} Punkte`),
        el('p', {}, `Aufgaben: ${r.aufgabenPunkte} von ${S.karten.length * PUNKTE} · Zeitbonus: ${r.bonus} · Zeit: ${uhr(r.sekunden)}`),
        r.neuerRekord ? el('p', { class: 'geschafft' }, '🎉 Neuer persönlicher Rekord!') : el('p', { class: 'small' }, `Ihr Rekord: ${r.best.punkte} Punkte`),
        el('p', { class: 'q-text' }, `Platz ${r.platz} von ${r.von} in Ihrer Klasse`));
      const listeKarte = () => el('div', { class: 'card' }, el('div', { class: 'q-text' }, 'Bestenliste Ihrer Klasse'), bestenliste(r.liste, k && k.name));
      let liste = listeKarte();
      let wappenBox = wappenBereich(r);
      // Punkte je Abschnitt
      const jeAbschnitt = pools.map((p, pi) => {
        const e = S.ergebnisse.filter((x) => x.p === pi);
        return { name: p.name, ist: e.reduce((x, y) => x + y.punkte, 0), max: e.length * PUNKTE };
      }).filter((x) => x.max).sort((x, y) => x.ist / x.max - y.ist / y.max);
      const themen = el('div', { class: 'card' }, el('div', { class: 'q-text' }, 'Punkte je Abschnitt (schwächster oben)'),
        el('ul', { class: 'ch-themen' }, jeAbschnitt.map((x) => el('li', {}, el('span', {}, x.name), el('strong', {}, `${x.ist}/${x.max}`)))),
        el('p', { class: 'small' }, 'Lesen Sie den schwächsten Abschnitt auf dem Arbeitsblatt noch einmal – dann holen Sie beim nächsten Mal mehr Punkte.'));
      // Fehler mit Lösung
      const fehler = S.ergebnisse.filter((e) => e.punkte < e.max);
      const loesungen = el('div', { class: 'card' }, el('div', { class: 'q-text' }, fehler.length ? `Ihre Fehler mit Lösung (${fehler.length})` : 'Alles richtig – stark! 💪'),
        fehler.map((e) => {
          const auf = pools[e.p].aufgaben[e.i];
          return el('div', { class: 'ch-fehler' },
            el('div', { class: 'small' }, `${pools[e.p].name} · +${e.punkte}`),
            el('div', { class: 'ch-frage' }, ohneTags(auf.frage || auf.aussage || '')),
            auf.aussage && auf.frage ? el('div', { class: 'small' }, '„' + ohneTags(auf.aussage) + '“') : null,
            el('div', { class: 'ch-loesung' }, '✓ ' + loesung(auf)),
            auf.erklaerung ? el('div', { class: 'small' }, ohneTags(auf.erklaerung)) : null);
        }));
      const knoepfe = el('div', { class: 'links' },
        el('button', { type: 'button', class: 'btn block', id: 'ch-nochmal', onclick: () => { S = null; speicher.schreiben(schluessel(), null); startZeigen(); } }, 'Nochmal spielen'),
        a ? el('a', { class: 'btn secondary block', href: K.link(a.pfad) }, 'Zur Übersicht') : null);
      inhalt.append(kopfKarte, wappenBox, liste, themen, loesungen, knoepfe);
      if (!nachladen) return;
      K.api('/api/challenge/liste?ils=' + encodeURIComponent(cfg.ils), { token: k && k.token }).then(({ status, d }) => {
        if (status !== 200 || !S || S.resultat !== r || !liste.isConnected) return;
        Object.assign(r, { liste: d.liste, meinWappen: d.meinWappen, malenGesperrt: d.malenGesperrt });
        sichern();
        const neueListe = listeKarte();
        liste.replaceWith(neueListe); liste = neueListe;
        if (!wappenBox.querySelector('.wappen-editor')) { const neu = wappenBereich(r); wappenBox.replaceWith(neu); wappenBox = neu; }
      }).catch(() => { /* offline: gespeicherter Stand bleibt */ });
    }

    function zeigen() {
      leeren();
      if (!S) return startZeigen();
      if (S.phase === 'lauf') return karteZeigen();
      if (S.phase === 'senden') return senden();
      if (S.phase === 'ende') return endeZeigen(true);
      return startZeigen();
    }

    // Nur die Bestenliste ansehen: Knopf „Highscore“ in der Übersicht (challenge/#bestenliste) –
    // geht schon vor der Freischaltung; dann mit Hinweis, wann man mitspielen kann.
    async function highscoreZeigen(frei) {
      leeren();
      inhalt.classList.remove('hidden');
      const karte = el('div', { class: 'card highscore' }, el('div', { class: 'q-text' }, '🏆 Highscore Ihrer Klasse'), el('p', { class: 'small' }, 'wird geladen …'));
      inhalt.append(karte,
        frei ? null : el('div', { class: 'card gesperrt' },
          el('div', { class: 'q-text' }, '🔒 Mitspielen: noch gesperrt'),
          el('p', {}, 'Die ILS-Challenge wird freigeschaltet, wenn Sie das Abschlussquiz bestanden haben. Ansehen können Sie die Bestenliste schon jetzt.')),
        el('div', { class: 'links' },
          frei ? el('button', { type: 'button', class: 'btn block challenge-knopf', id: 'ch-zur-challenge', onclick: () => {
            history.replaceState(null, '', location.pathname + location.search);
            normalStarten();
          } }, '🏁 Zur ILS-Challenge (freiwillig)') : null,
          a ? el('a', { class: 'btn secondary block', href: K.link(a.pfad) }, 'Zur Übersicht') : null));
      try {
        const k = K.konto();
        const { status, d } = await K.api('/api/challenge/liste?ils=' + encodeURIComponent(cfg.ils), { token: k && k.token });
        karte.innerHTML = '';
        karte.append(el('div', { class: 'q-text' }, `🏆 Highscore ${d.klasse || 'Ihrer Klasse'}`));
        if (status !== 200) { karte.append(el('p', { class: 'small' }, 'Die Bestenliste ist gerade nicht erreichbar.')); return; }
        karte.append(el('p', { class: 'small' }, `ILS-Challenge „${a ? a.titel : cfg.ils}“ – die besten 10 Ihrer Klasse.`), bestenliste(d.liste, k && k.name));
        if (d.best) karte.append(el('p', { class: 'small' }, `Ihr bestes Ergebnis: ${d.best.punkte} Punkte (${uhr(d.best.sekunden)}) – Platz ${d.platz} von ${d.von}.`));
      } catch (e) { karte.querySelector('.small').textContent = 'Keine Verbindung – die Bestenliste ist gerade nicht erreichbar.'; }
    }

    async function normalStarten() {
      const offen = speicher.lesen(offenSchl());
      if (offen) await wappenSenden(offen);
      S = speicher.lesen(schluessel());
      if (S && S.sig !== sig) S = null;
      inhalt.classList.remove('hidden');
      zeigen();
    }

    K.bereich(oben, async () => {
      const st = await K.standHolen();
      const frei = !quiz || !!(st[cfg.ils] && st[cfg.ils][quiz.id]);
      if (!frei || location.hash === '#bestenliste') { await highscoreZeigen(frei); return; }
      await normalStarten();
    });
  }

  return { start, loesung, teile };
})();
