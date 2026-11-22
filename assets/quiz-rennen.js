/* Quiz-Rennen – Handy-Seite (/quiz-rennen/?r=CODE).
 * Ablauf: Namen eingeben (Vorname + Anfangsbuchstabe des Nachnamens) → am Start warten → Countdown →
 * Fragen zuordnen. Richtig: eine Stufe weiter. Falsch: zurück auf 0, mit Lösung und Begründung (3 Sekunden lesen).
 * Schutz gegen Raten: Die Knöpfe sind erst nach einer kurzen Lesezeit frei (wie in den ILS-Übungen);
 * der Server prüft die Antworten selbst. Das Handy merkt sich seinen Schlüssel je Raum (Neuladen = gleiche Bahn).
 * Zeitlimit (am Beamer abschaltbar): Der Server schickt mit jeder Frage die Zeit (kurze Befunde 3 s, lange gut 6 s);
 * ein Balken läuft ab, danach meldet das Handy „Zeit abgelaufen“ → wie ein Fehler zurück auf 0. */
(() => {
  'use strict';
  const el = ILS.el;
  const SERVER = window.ILS_SERVER;
  const app = document.getElementById('app');
  const RAUM_MUSTER = /^[A-HJ-NP-Z2-9]{4}$/;
  const VORNAME_MUSTER = /^\p{L}[\p{L}\p{N}' -]{0,19}$/u;
  const INITIAL_MUSTER = /^\p{L}$/u;
  const WEITER_SPERRE_S = 3;
  const merken = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privater Modus */ } },
    weg(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }
  };
  const dauer = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  let raum = String(new URLSearchParams(location.search).get('r') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let token = '';
  let name = '';
  let stand = null;       // letzter Zustand vom Server
  let setInfo = null;     // { titel, aufgabe, kategorien }
  let versatz = 0;
  let modus = '';         // code | name | verbinden | warten | countdown | frage | richtig | falsch | ziel | ende | weg
  let ueben = false;      // nach dem Zieleinlauf weiter üben (zählt nicht mehr)
  let runde = null;
  let frage = null;       // angezeigte Frage
  let freigabe = 0;
  let sendet = false;
  let pollTimer = null;
  let cdTimer = null;
  let zeitTimer = null;   // Zeitlimit der angezeigten Frage
  let frist = 0;
  let wachSperre = null;
  const serverJetzt = () => Date.now() + versatz;
  const speicherSchl = () => 'quiz-rennen|' + raum;

  /* ---------- Server ---------- */
  async function api(weg, daten) {
    const r = await fetch(SERVER + weg, {
      method: daten ? 'POST' : 'GET', cache: 'no-store',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      body: daten ? JSON.stringify(daten) : undefined
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  }

  function planen(ms) { clearTimeout(pollTimer); pollTimer = setTimeout(abfragen, ms); }
  function takt() {
    const z = stand;
    // Antworten bringen ohnehin den neuen Stand – die Abfrage ist nur Lebenszeichen und merkt Start/Ende
    if (!z || z.status === 'warten') return 2000;
    if (z.status === 'laeuft' && serverJetzt() < z.start) return 800;
    return z.status === 'laeuft' ? 5000 : 2000;   // nach dem Ende: neues Rennen schnell bemerken (Countdown 5 s)
  }
  async function abfragen() {
    clearTimeout(pollTimer);
    if (!token) return;
    try {
      const r = await api('/api/rennen/ich?raum=' + raum);
      verbindung(true);
      if (!r.d.ok) {
        if (r.d.grund === 'kein-raum') { weg(); return; }
        if (r.d.grund === 'unbekannt' || r.status === 401) {
          tokenLoeschen();
          nameZeigen('Sie sind nicht mehr im Rennen (z. B. von der Lehrkraft herausgenommen). Bitte melden Sie sich neu an.');
          return;
        }
        throw new Error(r.d.grund || String(r.status));
      }
      annehmen(r.d);
    } catch (e) {
      verbindung(false);
    }
    planen(takt());
  }
  function annehmen(z) {
    if (stand && z.jetzt < stand.jetzt) return;   // ältere Antwort kam zu spät an
    if (z.set) setInfo = z.set;
    versatz = z.jetzt - Date.now();
    stand = z;
    zeigen();
  }
  function tokenLoeschen() {
    token = '';
    stand = null;
    merken.weg(speicherSchl());
  }

  /* ---------- Anzeige ---------- */
  function zeige(...kinder) {
    clearInterval(cdTimer);
    clearTimeout(zeitTimer);
    app.innerHTML = '';
    app.append(...kinder.filter(Boolean));
    window.scrollTo(0, 0);
  }
  const haupt = (...kinder) => el('main', { class: 'qz' }, ...kinder);

  function kopf(mitStand = true) {
    const titel = '🏁 ' + (setInfo ? setInfo.titel : 'Quiz-Rennen');
    const kinder = [el('div', { class: 'qz-kopf-zeile' }, el('span', { class: 'qz-titel' }, titel), el('span', { class: 'qz-ich', id: 'qz-ich' }, name))];
    if (mitStand && stand) {
      kinder.push(el('div', { class: 'qz-balken', id: 'qz-balken', 'aria-hidden': 'true' }), el('div', { class: 'qz-stand', id: 'qz-stand' }));
    }
    const k = el('header', { class: 'qz-kopf' }, kinder);
    kopfAktualisieren(false, k);
    return k;
  }
  function kopfAktualisieren(zuruecksetzen, wurzel = document) {
    const z = stand;
    const balken = wurzel.querySelector('#qz-balken');
    const zeile = wurzel.querySelector('#qz-stand');
    if (!z || !balken || !zeile) return;
    const serie = z.imZiel ? z.ziel : Math.min(z.serie, z.ziel);
    if (balken.children.length !== z.ziel) { balken.innerHTML = ''; for (let i = 0; i < z.ziel; i++) balken.append(el('i')); }
    [...balken.children].forEach((x, i) => x.classList.toggle('voll', i < serie));
    balken.classList.toggle('ziel', !!z.imZiel);
    if (zuruecksetzen) { balken.classList.remove('reset'); void balken.offsetWidth; balken.classList.add('reset'); setTimeout(() => balken.classList.remove('reset'), 900); }
    zeile.innerHTML = '';
    const links = z.imZiel ? (ueben ? el('span', {}, '✓ im Ziel · Übungsmodus') : el('span', {}, el('b', {}, '🏁 im Ziel')))
      : el('span', {}, el('b', {}, `${z.serie} von ${z.ziel}`), ' richtig hintereinander');
    zeile.append(links, el('span', {}, z.status === 'warten' ? `${z.von} am Start` : `Platz ${z.platz} von ${z.von}`));
  }

  function verbindung(ok) {
    let b = document.getElementById('qz-offline');
    if (ok) { if (b) b.remove(); return; }
    if (!b) document.body.append(el('div', { class: 'qz-offline', id: 'qz-offline', role: 'status' }, 'Keine Verbindung – es geht gleich weiter …'));
  }
  let hinweisTimer = null;
  function hinweis(text) {
    let h = document.getElementById('qz-hinweis');
    if (!h) { h = el('div', { class: 'qz-hinweis', id: 'qz-hinweis', role: 'status' }); document.body.append(h); }
    h.textContent = text;
    clearTimeout(hinweisTimer);
    hinweisTimer = setTimeout(() => h.remove(), 2200);
  }
  function konfetti() {
    const farben = ['#b4572a', '#1d7a46', '#f1c232', '#4cc38a', '#c0392b', '#7a5bb5', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      const k = el('i', { class: 'qz-konfetti', style: `left:${Math.random() * 100}%;background:${farben[i % farben.length]};` +
        `animation-delay:${Math.random() * 0.6}s;animation-duration:${2.2 + Math.random() * 1.8}s;transform:rotate(${Math.random() * 360}deg)` });
      document.body.append(k);
      setTimeout(() => k.remove(), 4800);
    }
  }
  async function wachBleiben() {
    try { if ('wakeLock' in navigator && !wachSperre) { wachSperre = await navigator.wakeLock.request('screen'); wachSperre.addEventListener('release', () => { wachSperre = null; }); } } catch (e) { /* egal */ }
  }
  const kategorie = (k) => (setInfo ? setInfo.kategorien.find((x) => x.k === k) : null) || { k, name: k, kurz: '', frage: '' };

  /* Welche Ansicht passt zum Stand vom Server? */
  function zeigen() {
    const z = stand;
    if (!z) return;
    if (z.runde !== runde) {
      runde = z.runde;
      ueben = false;
      if (['falsch', 'ziel', 'ende', 'richtig'].includes(modus)) modus = '';
    }
    if (modus === 'falsch' && z.status === 'laeuft') { kopfAktualisieren(); return; }
    if (z.status === 'warten') return wartenZeigen();
    if (z.status === 'beendet') return endeZeigen();
    if (serverJetzt() < z.start) return countdownZeigen();
    if (z.imZiel && !ueben) return zielZeigen();
    if (modus === 'richtig') return;
    if (!z.frage) { planen(300); return; }
    if (modus === 'frage' && frage && frage.id === z.frage.id) { kopfAktualisieren(); return; }
    frageZeigen(z.frage);
  }

  /* ---------- Code eingeben (ohne QR-Code) ---------- */
  function codeZeigen(fehler) {
    modus = 'code';
    const feld = el('input', { id: 'qz-code-feld', maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'z. B. K7Q2', value: raum || '' });
    const fb = el('div', { class: 'fb bad' + (fehler ? ' show' : '') }, fehler || '');
    const los = (ev) => {
      ev.preventDefault();
      const code = feld.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!RAUM_MUSTER.test(code)) { fb.textContent = 'Der Code hat 4 Zeichen (Buchstaben und Zahlen). Er steht am Beamer.'; fb.classList.add('show'); return; }
      raum = code;
      history.replaceState(null, '', '?r=' + raum);
      starten();
    };
    zeige(kopf(false), haupt(el('form', { class: 'qz-hell', onsubmit: los },
      el('h2', {}, 'Mitmachen'),
      el('p', {}, 'Scannen Sie den QR-Code am Beamer – oder geben Sie hier den Code ein, der am Beamer steht.'),
      el('div', { class: 'field qz-code-feld' }, el('label', { for: 'qz-code-feld' }, 'Code vom Beamer'), feld),
      el('button', { type: 'submit', class: 'btn block' }, 'Weiter'), fb)));
  }

  /* ---------- Namen eingeben ---------- */
  function nameZeigen(meldung) {
    modus = 'name';
    let gemerkt = {};
    try { gemerkt = JSON.parse(merken.get('quiz-rennen-name') || '{}') || {}; } catch (e) { gemerkt = {}; }
    const vorname = el('input', { id: 'qz-vorname', maxlength: '20', autocomplete: 'given-name', autocapitalize: 'words', value: gemerkt.vorname || '' });
    const initial = el('input', { id: 'qz-initial', maxlength: '1', autocomplete: 'off', autocapitalize: 'characters', value: gemerkt.initial || '' });
    const fb = el('div', { class: 'fb bad' + (meldung ? ' show' : '') }, meldung || '');
    const knopf = el('button', { type: 'submit', class: 'btn block', id: 'qz-mitmachen' }, 'Mitmachen');
    const fehler = (text) => { fb.textContent = text; fb.classList.add('show'); knopf.disabled = false; };
    const los = async (ev) => {
      ev.preventDefault();
      const v = vorname.value.trim().replace(/\s+/g, ' ');
      const i = initial.value.trim().replace(/\.$/, '');
      if (!VORNAME_MUSTER.test(v)) return fehler('Bitte geben Sie Ihren Vornamen ein (nur Buchstaben).');
      if (!INITIAL_MUSTER.test(i)) return fehler('Bitte geben Sie den ersten Buchstaben Ihres Nachnamens ein.');
      knopf.disabled = true;
      wachBleiben();
      let r;
      try { r = await api('/api/rennen/beitreten', { raum, vorname: v, initial: i }); } catch (e) { return fehler('Keine Verbindung. Bitte nochmal versuchen.'); }
      if (!r.d.ok) {
        if (r.d.grund === 'kein-raum') return weg();
        if (r.d.grund === 'name-belegt') return fehler(`„${v} ${i.toUpperCase()}.“ ist schon im Rennen. Wenn Sie das nicht sind: Schreiben Sie Ihren Vornamen etwas anders (z. B. „${v}2“).`);
        if (r.d.grund === 'voll') return fehler('Das Rennen ist voll (höchstens 60 Personen).');
        return fehler('Bitte nur Buchstaben eingeben.');
      }
      merken.set('quiz-rennen-name', JSON.stringify({ vorname: v, initial: i }));
      token = r.d.token;
      name = r.d.name;
      merken.set(speicherSchl(), JSON.stringify({ token, name }));
      modus = 'verbinden';
      abfragen();
    };
    zeige(kopf(false), haupt(el('form', { class: 'qz-hell', onsubmit: los, autocomplete: 'on' },
      el('h2', {}, 'Wer sind Sie?'),
      el('div', { class: 'field' }, el('label', { for: 'qz-vorname' }, 'Vorname'), vorname),
      el('div', { class: 'field' }, el('label', { for: 'qz-initial' }, 'Erster Buchstabe Ihres Nachnamens'), initial),
      knopf, fb,
      el('p', { class: 'qz-klein' }, 'Am Beamer erscheint nur „Vorname + Buchstabe“, z. B. „Anna K.“. Nach 3 Stunden wird alles automatisch gelöscht.'))));
    if (!gemerkt.vorname) vorname.focus();   // sofort, nicht verzögert: sonst springt der Cursor beim schnellen Tippen ins falsche Feld
  }

  async function verlassen() {
    try { await api('/api/rennen/verlassen', { raum }); } catch (e) { /* die Lehrkraft kann die Bahn auch entfernen */ }
    tokenLoeschen();
    nameZeigen();
  }

  function weg() {
    modus = 'weg';
    tokenLoeschen();
    zeige(kopf(false), haupt(el('div', { class: 'qz-hell' },
      el('h2', {}, 'Dieses Rennen gibt es nicht mehr'),
      el('p', {}, 'Bitte scannen Sie den QR-Code am Beamer neu – oder geben Sie den neuen Code ein.'),
      el('button', { type: 'button', class: 'btn block', onclick: () => codeZeigen() }, 'Code eingeben'))));
  }

  /* ---------- Warten am Start ---------- */
  let wartenStand = '';
  function wartenZeigen() {
    const z = stand;
    const schl = `${z.ziel}|${z.zeitlimit}`;   // Ziel oder Zeitlimit am Beamer geändert → Regeln neu zeigen
    if (modus === 'warten' && wartenStand === schl) { kopfAktualisieren(); return; }
    modus = 'warten';
    wartenStand = schl;
    zeige(kopf(), haupt(
      el('div', { class: 'qz-hell', id: 'qz-warten' },
        el('h2', {}, `Hallo ${name}!`),
        el('p', {}, 'Sie stehen am Start. Ihr Name ist jetzt am Beamer.'),
        el('p', {}, el('strong', {}, 'Das Rennen beginnt, wenn Ihre Lehrkraft startet.'))),
      el('div', { class: 'qz-hell' },
        el('h2', {}, 'So geht’s'),
        el('ol', { class: 'qz-regeln' },
          el('li', {}, 'Sie sehen einen Befund oder eine Maßnahme.'),
          el('li', {}, 'Tippen Sie auf den passenden Buchstaben.'),
          el('li', {}, el('strong', {}, `${z.ziel} richtige hintereinander`), ' → Ziel!'),
          el('li', {}, el('strong', {}, 'Ein Fehler → zurück auf 0.'), ' Dann sehen Sie die richtige Lösung.'),
          z.zeitlimit ? el('li', {}, el('strong', {}, '⏱ Schnell sein: '), 'Kurze Befunde 3 Sekunden, lange etwas mehr. Zu langsam → zurück auf 0.') : null)),
      setInfo ? el('div', { class: 'qz-hell' },
        el('h2', {}, 'Die Leitfragen'),
        el('ul', { class: 'qz-leitfragen' }, setInfo.kategorien.map((k) => el('li', {},
          el('span', { class: `qz-buchstabe k-${k.k}` }, k.k), el('span', {}, el('strong', {}, `${k.name} – ${k.kurz}: `), k.frage))))) : null,
      el('p', { class: 'qz-weiss' }, el('button', { type: 'button', class: 'qz-link', id: 'qz-name-aendern', onclick: verlassen }, 'Falscher Name? Hier ändern'))));
  }

  /* ---------- Countdown ---------- */
  function countdownZeigen() {
    if (modus === 'countdown') return;
    modus = 'countdown';
    const zahl = el('div', { class: 'zahl', id: 'qz-zahl' });
    zeige(kopf(), haupt(el('div', { class: 'qz-gross' }, zahl, el('p', {}, 'Gleich geht’s los – viel Erfolg!'))));
    const tick = () => {
      const rest = stand.start - serverJetzt();
      if (rest > 0) { zahl.textContent = String(Math.ceil(rest / 1000)); return; }
      zahl.textContent = 'Los!';
      zahl.classList.add('los');
      clearInterval(cdTimer);
      setTimeout(() => { if (modus === 'countdown') { modus = ''; abfragen(); } }, 350);
    };
    tick();
    cdTimer = setInterval(tick, 100);
  }

  /* ---------- Frage ---------- */
  function frageZeigen(f) {
    modus = 'frage';
    frage = f;
    sendet = false;
    const lese = Math.min(1600, 500 + f.text.length * 15);
    freigabe = Date.now() + lese;
    const knoepfe = el('div', { class: 'qz-knoepfe gesperrt', id: 'qz-knoepfe', style: `--lese:${lese}ms` },
      setInfo.kategorien.map((k) => el('button', { type: 'button', class: `qz-knopf k-${k.k}`, 'data-k': k.k, onclick: (ev) => tippen(k.k, ev.currentTarget) },
        el('span', { class: 'qz-buchstabe' }, el('span', {}, k.k)),
        el('span', {}, el('b', {}, `${k.name} – ${k.kurz}`), el('small', {}, k.frage)))));
    setTimeout(() => { if (frage === f) knoepfe.classList.remove('gesperrt'); }, lese);
    const zeitBalken = f.zeit ? el('div', { class: 'qz-zeit', id: 'qz-zeit', style: `--zeit:${f.zeit}ms`, 'data-ms': String(f.zeit),
      role: 'timer', 'aria-label': `${String(f.zeit / 1000).replace('.', ',')} Sekunden Zeit` }, el('i')) : null;
    zeige(kopf(), haupt(
      el('div', { class: 'qz-karte' }, el('div', { class: 'qz-auftrag' }, setInfo.aufgabe || 'Wohin gehört das?'),
        el('div', { class: 'qz-text', id: 'qz-text', 'data-id': f.id }, f.text), zeitBalken),
      knoepfe));
    frist = f.zeit ? Date.now() + f.zeit : 0;
    if (f.zeit) zeitTimer = setTimeout(() => zeitAbgelaufen(f), f.zeit);
  }

  // Zeit abgelaufen: dem Server melden (zählt wie ein Fehler) und die Lösung zeigen
  async function zeitAbgelaufen(f) {
    if (modus !== 'frage' || frage !== f || sendet) return;
    sendet = true;
    const knoepfe = document.getElementById('qz-knoepfe');
    knoepfe.classList.remove('gesperrt');
    knoepfe.classList.add('aus');
    knoepfe.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    let r;
    try { r = await api('/api/rennen/antwort', { raum, frage: f.id, zeit: true }); } catch (e) { r = null; }
    if (frage !== f || modus !== 'frage') return;
    if (!r) { sendet = false; hinweis('Keine Verbindung – es geht gleich weiter.'); modus = ''; abfragen(); return; }
    const z = r.d;
    if (!z.ok) {
      if (z.grund === 'kein-raum') { weg(); return; }
      if (z.grund === 'unbekannt' || r.status === 401) { tokenLoeschen(); nameZeigen('Sie sind nicht mehr im Rennen. Bitte melden Sie sich neu an.'); return; }
      modus = '';
      if (z.jetzt) annehmen(z); else abfragen();
      return;
    }
    versatz = z.jetzt - Date.now();
    stand = { ...z };
    falschZeigen(z, null, knoepfe);
  }

  async function tippen(k, knopf) {
    if (modus !== 'frage' || sendet) return;
    if (Date.now() < freigabe) { hinweis('Erst lesen, dann tippen 🙂'); return; }
    sendet = true;
    const f = frage;
    const knoepfe = document.getElementById('qz-knoepfe');
    const zeitBalken = document.getElementById('qz-zeit');
    if (zeitBalken) zeitBalken.classList.add('stopp');
    knoepfe.classList.add('aus');
    knoepfe.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const freigeben = () => {
      sendet = false;
      knoepfe.classList.remove('aus');
      knoepfe.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      if (zeitBalken) zeitBalken.classList.remove('stopp');
      if (frist && Date.now() >= frist) zeitAbgelaufen(f);   // die Zeit lief ab, während die Antwort nicht ankam
    };
    let r;
    try { r = await api('/api/rennen/antwort', { raum, frage: f.id, wahl: k }); } catch (e) { freigeben(); hinweis('Keine Verbindung – bitte nochmal tippen.'); return; }
    if (frage !== f || modus !== 'frage') return;
    const z = r.d;
    if (!z.ok) {
      if (z.grund === 'zu-schnell') { freigeben(); hinweis('Erst lesen, dann tippen 🙂'); return; }
      if (z.grund === 'kein-raum') { weg(); return; }
      if (z.grund === 'unbekannt' || r.status === 401) { tokenLoeschen(); nameZeigen('Sie sind nicht mehr im Rennen. Bitte melden Sie sich neu an.'); return; }
      if (z.jetzt) { modus = ''; annehmen(z); return; }   // veraltet, beendet, noch nicht gestartet
      freigeben(); hinweis('Das hat nicht geklappt – bitte nochmal tippen.');
      return;
    }
    versatz = z.jetzt - Date.now();
    stand = { ...z };
    if (z.richtig) {
      modus = 'richtig';
      knopf.classList.add('richtig');
      kopfAktualisieren();
      const plus = el('div', { class: 'qz-plus' }, '+1');
      document.body.append(plus);
      setTimeout(() => plus.remove(), 800);
      setTimeout(() => {
        if (modus !== 'richtig') return;
        modus = '';
        if (z.imZiel && !ueben) { zielZeigen(); konfetti(); } else zeigen();
      }, 650);
    } else {
      falschZeigen(z, knopf, knoepfe);
    }
  }

  function falschZeigen(z, knopf, knoepfe) {
    modus = 'falsch';
    clearTimeout(zeitTimer);
    const zeitBalken = document.getElementById('qz-zeit');
    if (zeitBalken) zeitBalken.classList.add('stopp');
    if (knopf) knopf.classList.add('falsch');
    knoepfe.classList.add('nach-fehler');   // nur noch die getippte und die richtige Antwort – so passt die Erklärung auf den Bildschirm
    const richtig = knoepfe.querySelector(`[data-k="${z.loesung}"]`);
    if (richtig) richtig.classList.add('loesung');
    kopfAktualisieren(!z.imZiel);
    if (navigator.vibrate) { try { navigator.vibrate(180); } catch (e) { /* egal */ } }
    const kat = kategorie(z.loesung);
    let rest = WEITER_SPERRE_S;
    const weiter = el('button', { type: 'button', class: 'btn block', id: 'qz-weiter', disabled: true, onclick: () => { modus = ''; zeigen(); } }, `Weiter (${rest})`);
    const uhr = setInterval(() => {
      rest -= 1;
      if (rest > 0) weiter.textContent = `Weiter (${rest})`;
      else { clearInterval(uhr); weiter.textContent = 'Weiter'; weiter.disabled = false; }
    }, 1000);
    const panel = el('div', { class: 'qz-falsch', id: 'qz-falsch', role: 'alert' },
      el('div', { class: 'qz-falsch-titel' }, z.zuLangsam
        ? (z.imZiel ? '⏱ Zu langsam.' : '⏱ Zu langsam – zurück auf 0!')
        : (z.imZiel ? '❌ Leider falsch.' : '❌ Leider falsch – zurück auf 0!')),
      el('div', { class: 'qz-loesung' }, el('span', { class: `qz-buchstabe k-${kat.k}` }, kat.k), `Richtig: ${kat.name} – ${kat.kurz}`),
      el('p', { class: 'qz-warum' }, z.warum),
      kat.frage ? el('p', { class: 'qz-leitfrage' }, `Leitfrage ${kat.k}: ${kat.frage}`) : null,
      weiter);
    knoepfe.after(panel);
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
  }

  /* ---------- Ziel und Ende ---------- */
  function zielZeigen() {
    const z = stand;
    if (modus === 'ziel') { const p = document.getElementById('qz-platz'); if (p) p.textContent = `Platz ${z.platz}`; kopfAktualisieren(); return; }
    modus = 'ziel';
    zeige(kopf(), haupt(el('div', { class: 'qz-gross', id: 'qz-ziel' },
      el('div', { class: 'zahl los' }, '🏁'),
      el('h2', {}, 'Im Ziel!'),
      el('div', { class: 'platz', id: 'qz-platz' }, `Platz ${z.platz}`),
      el('p', {}, `${z.ziel} richtige hintereinander – stark!`),
      el('p', {}, 'Schauen Sie zum Beamer.')),
      el('button', { type: 'button', class: 'btn block secondary', id: 'qz-ueben', onclick: () => { ueben = true; modus = ''; zeigen(); } }, 'Weiter üben (zählt nicht mehr)')));
  }

  function endeZeigen() {
    if (modus === 'ende') return;
    modus = 'ende';
    const z = stand;
    zeige(kopf(), haupt(el('div', { class: 'qz-gross', id: 'qz-ende' },
      el('h2', {}, '🏁 Das Rennen ist vorbei'),
      z.imZiel ? el('div', { class: 'platz' }, `Platz ${z.platz}`) : null,
      z.imZiel ? el('p', {}, `Im Ziel nach ${dauer(z.imZiel - z.start)}.`) : el('p', {}, `Ihre beste Serie: ${z.best} richtige hintereinander.`),
      el('p', {}, 'Danke fürs Mitmachen! Startet Ihre Lehrkraft ein neues Rennen, geht es hier von selbst weiter.'))));
  }

  /* ---------- Start ---------- */
  async function starten() {
    if (!RAUM_MUSTER.test(raum)) { codeZeigen(); return; }
    let g = null;
    try { g = JSON.parse(merken.get(speicherSchl()) || 'null'); } catch (e) { g = null; }
    if (g && g.token) {
      token = g.token;
      name = g.name || '';
      modus = 'verbinden';
      zeige(kopf(false), haupt(el('p', { class: 'qz-weiss' }, 'Verbinde …')));
      abfragen();
      return;
    }
    modus = 'verbinden';
    zeige(kopf(false), haupt(el('p', { class: 'qz-weiss' }, 'Verbinde …')));
    try {
      const r = await api('/api/rennen/info?raum=' + raum);
      if (r.d.grund === 'kein-raum') { weg(); return; }
      if (r.d.ok) setInfo = { titel: r.d.titel, aufgabe: '', kategorien: [] };
    } catch (e) { /* trotzdem den Namen abfragen; der Server antwortet beim Beitreten */ }
    nameZeigen();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && token) { wachBleiben(); abfragen(); }
  });
  starten();
})();
