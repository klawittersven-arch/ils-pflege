/* Quiz-Rennen – Beamer-Seite (/quiz-rennen/beamer/): QR-Code zum Mitmachen UND das Rennen auf EINEM Bildschirm.
 * So können SuS jederzeit dazukommen oder nach einem Ausfall (Akku leer, Seite geschlossen) wieder einsteigen.
 *
 * Die Seite legt beim ersten Öffnen einen Raum an (Code + Schlüssel werden in diesem Browser gemerkt, damit ein
 * Neuladen denselben Raum behält). Jede Person hat eine Bahn wie im ILS-Live-Rennen: Die Figur rückt mit jeder
 * richtigen Antwort vor; ein Fehler setzt sie zurück auf Start (die Bahn blinkt rot). Wer zuerst <ziel> richtige
 * hintereinander schafft, ist im Ziel. Tasten: F Vollbild, T nur Top 10, Q QR-Code klein/groß, Esc zurück.
 * Name anklicken = Person aus dem Rennen nehmen (z. B. Name falsch geschrieben). */
(() => {
  'use strict';
  const el = ILS.el;
  const SERVER = window.ILS_SERVER;
  const SET = (new URLSearchParams(location.search).get('set') || 'abcde').replace(/[^a-z0-9]/g, '') || 'abcde';
  const TAKT_MS = 1500;
  const OFFLINE_MS = 45000;
  const MEDAILLE = ['🥇', '🥈', '🥉'];
  const RAUM_SCHL = 'quiz-rennen-beamer|' + SET;
  const merken = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privater Modus */ } }
  };
  // DOM-append wandelt null in den Text „null“ um – hier werden leere Teile weggelassen
  const anhaengen = (ziel, ...kinder) => ziel.append(...kinder.flat().filter((k) => k != null && k !== false));
  const dauer = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  let raum = '';
  let lk = '';
  let stand = null;
  let versatz = 0;
  const serverJetzt = () => Date.now() + versatz;
  let bahnen = new Map();
  let bekannteZiele = null;
  let nurTop10 = merken.get('quiz-rennen-top10') === '1';
  let ehrung = null;
  let ehrungAbspielen = () => {};
  let fehlerEbene = null;
  let pausiert = false;   // während „Neue Klasse“ keine Abfrage – sonst entstünden zwei neue Räume

  const figur = window.ILSSchwester ? { lauf: ILSSchwester.lauf(), jubel: ILSSchwester.jubel() } : null;

  /* ---------- Aufbau ---------- */
  const ov = el('div', { class: 'se-overlay rennen qz-beamer', id: 'qz-beamer' });
  if (figur) {
    ov.style.setProperty('--rb-lauf', `url("${figur.lauf.url}")`);
    ov.style.setProperty('--rb-jubel', `url("${figur.jubel.url}")`);
  }
  if (merken.get('quiz-rennen-qr-klein') === '1') ov.classList.add('qr-klein');
  const t = {};
  t.titel = el('span', { class: 'rb-titel' }, '🏁 Quiz-Rennen');
  t.unter = el('span', { class: 'rb-unter' });
  t.uhr = el('span', { class: 'rb-uhr', id: 'qz-uhr' });
  t.live = el('span', { class: 'rb-live', title: 'aktualisiert sich laufend' }, '● live');
  t.marken = el('div', { class: 'rb-marken-spur' });
  t.strecke = el('div', { class: 'rb-strecke' });
  t.box = el('div', { class: 'rb-strecke-box' }, t.strecke);
  t.leer = el('div', { class: 'qz-leer', id: 'qz-leer' }, 'Raum wird vorbereitet …');
  t.links = el('div', { class: 'rb-links' },
    el('div', { class: 'rb-raster rb-marken' }, el('span'), el('span'), t.marken, el('span')),
    el('div', { class: 'qz-strecke-wrap' }, t.box, t.leer));
  t.qrBild = el('div', { class: 'qz-qr-bild', id: 'qz-qr-bild' });
  t.qrCode = el('div', { class: 'qz-qr-code' });
  t.qrUrl = el('div', { class: 'qz-qr-url' });
  t.qrAnzahl = el('div', { class: 'qz-qr-anzahl' });
  t.qr = el('div', { class: 'qz-qr', id: 'qz-qr' }, el('div', { class: 'qz-qr-titel' }, '📱 QR-Code scannen'),
    t.qrBild, t.qrCode, t.qrUrl, t.qrAnzahl);
  t.ziel = el('div', { class: 'rb-ziel', id: 'rb-ziel' });
  t.haupt = el('button', { type: 'button', class: 'btn haupt', id: 'qz-haupt', onclick: hauptKnopf }, '▶ Rennen starten');
  t.neuStart = el('button', { type: 'button', class: 'btn secondary hidden', id: 'qz-neustart', title: 'Rennen neu starten: alle wieder auf 0', onclick: neuStarten }, '↻ Neu');
  t.zielWahl = el('select', { id: 'qz-ziel', onchange: zielAendern, 'aria-label': 'Ziel: richtige Antworten hintereinander' });
  t.top10 = el('button', { type: 'button', class: 'btn secondary', id: 'qz-top10', onclick: top10Umschalten });
  t.fehlerKnopf = el('button', { type: 'button', class: 'btn secondary', id: 'qz-fehler-knopf', onclick: fehlerZeigen }, '📊 Häufige Fehler');
  t.ehrungKnopf = el('button', { type: 'button', class: 'btn secondary', id: 'qz-ehrung', onclick: siegerehrung }, '🏆 Siegerehrung');
  t.qrKnopf = el('button', { type: 'button', class: 'btn secondary', id: 'qz-qr-knopf', onclick: qrUmschalten });
  t.vollbild = el('button', { type: 'button', class: 'btn secondary', onclick: vollbild }, '⛶ Vollbild (F)');
  t.neueKlasse = el('button', { type: 'button', class: 'btn secondary', id: 'qz-neue-klasse', onclick: neueKlasse }, '🧹 Neue Klasse');
  t.toast = el('div', { class: 'rb-toast', 'aria-live': 'polite' });
  t.countdown = el('div', { class: 'qz-countdown hidden', id: 'qz-countdown', 'aria-live': 'assertive' });
  ov.append(
    el('div', { class: 'rb-kopf' }, t.titel, t.unter, t.uhr, t.live),
    el('div', { class: 'rb-haupt' }, t.links,
      el('div', { class: 'rb-rechts' }, t.qr, t.ziel,
        el('div', { class: 'rb-knoepfe' }, el('div', { class: 'qz-haupt-zeile' }, t.haupt, t.neuStart),
          el('label', { class: 'qz-ziel-wahl' }, 'Ziel:', t.zielWahl),
          el('div', { class: 'qz-knoepfe-zeile' }, t.fehlerKnopf, t.ehrungKnopf),
          el('div', { class: 'qz-knoepfe-zeile' }, t.qrKnopf, t.top10),
          el('div', { class: 'qz-knoepfe-zeile' }, t.vollbild, t.neueKlasse)))),
    t.toast, t.countdown);
  document.body.append(ov);
  qrKnopfText();

  document.addEventListener('keydown', (ev) => {
    if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    if (ev.key === 'Escape') { if (ehrung) ehrungSchliessen(); else if (fehlerEbene) fehlerSchliessen(); }
    else if (ev.key === 'f' || ev.key === 'F') vollbild();
    else if ((ev.key === 'r' || ev.key === 'R') && ehrung) ehrungAbspielen();
    else if ((ev.key === 't' || ev.key === 'T') && !ehrung) top10Umschalten();
    else if (ev.key === 'q' || ev.key === 'Q') qrUmschalten();
  });
  window.addEventListener('resize', () => aktualisieren());

  /* ---------- Server ---------- */
  async function api(weg, daten) {
    const r = await fetch(SERVER + weg, {
      method: daten ? 'POST' : 'GET', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + lk },
      body: daten ? JSON.stringify(daten) : undefined
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  }

  let anlegenLaeuft = null;
  function raumAnlegen(neu) {
    if (!anlegenLaeuft) anlegenLaeuft = anlegen(neu).finally(() => { anlegenLaeuft = null; });
    return anlegenLaeuft;
  }
  async function anlegen(neu) {
    if (!neu) {
      let alt = null;
      try { alt = JSON.parse(merken.get(RAUM_SCHL) || 'null'); } catch (e) { alt = null; }
      if (alt && alt.raum && alt.lk) {
        raum = alt.raum; lk = alt.lk;
        const r = await api('/api/rennen/beamer?raum=' + raum);
        if (r.status === 200 && r.d.ok) { qrZeichnen(); uebernehmen(r.d); return; }
      }
    }
    const ziel = Number(merken.get('quiz-rennen-ziel')) || undefined;
    const r = await fetch(SERVER + '/api/rennen/neu', { method: 'POST', body: JSON.stringify({ set: SET, ziel }) });
    const d = await r.json();
    if (!d.ok) throw new Error(d.grund || String(r.status));
    raum = d.raum; lk = d.lk;
    merken.set(RAUM_SCHL, JSON.stringify({ raum, lk }));
    stand = null;
    bekannteZiele = null;
    for (const b of bahnen.values()) b.el.remove();
    bahnen = new Map();
    qrZeichnen();
    const s = await api('/api/rennen/beamer?raum=' + raum);
    if (s.status === 200 && s.d.ok) uebernehmen(s.d);
  }

  async function holen() {
    if (pausiert) return;
    if (!raum) { await raumAnlegen(false); return; }
    const r = await api('/api/rennen/beamer?raum=' + raum);
    if (pausiert) return;
    if (r.status === 404 || r.status === 403) {   // Raum gibt es nicht mehr → neuer Raum, neuer QR-Code
      await raumAnlegen(true);
      meldung('Neuer Raum – bitte den QR-Code neu scannen.');
      return;
    }
    if (r.status !== 200 || !r.d.ok) throw new Error(String(r.status));
    uebernehmen(r.d);
  }

  async function schleife() {
    try { await holen(); t.live.classList.remove('aus'); } catch (e) { t.live.classList.add('aus'); }
    setTimeout(schleife, TAKT_MS);
  }

  function uebernehmen(d) {
    const neueRunde = !stand || stand.runde !== d.runde;
    stand = d;
    versatz = d.jetzt - Date.now();
    if (neueRunde) {
      bekannteZiele = null;
      for (const b of bahnen.values()) b.fehler = null;
    }
    aktualisieren();
    ticken();
  }

  async function steuern(daten) {
    try {
      const r = await api('/api/rennen/steuern', { raum, ...daten });
      if (r.status === 200 && r.d.ok) { uebernehmen(r.d); return true; }
      meldung(r.d.grund === 'laeuft' ? 'Das Ziel lässt sich nur ändern, wenn kein Rennen läuft.' : 'Das hat nicht geklappt. Bitte nochmal versuchen.');
    } catch (e) {
      meldung('Keine Verbindung zum Server. Bitte nochmal versuchen.');
    }
    return false;
  }

  /* ---------- QR-Code ---------- */
  function qrZeichnen() {
    const ziel = new URL('../?r=' + raum, location.href);
    t.qrBild.innerHTML = window.ILSQR ? ILSQR.svg(ziel.href) : '';
    t.qrBild.dataset.url = ziel.href;
    t.qrCode.innerHTML = '';
    t.qrCode.append('oder Seite öffnen, Code: ', el('b', { id: 'qz-code' }, raum));
    t.qrUrl.textContent = ziel.host + ziel.pathname;
  }
  function qrUmschalten() {
    ov.classList.toggle('qr-klein');
    merken.set('quiz-rennen-qr-klein', ov.classList.contains('qr-klein') ? '1' : '');
    qrKnopfText();
    aktualisieren();
  }
  function qrKnopfText() { t.qrKnopf.textContent = ov.classList.contains('qr-klein') ? '🔳 QR groß (Q)' : '🔳 QR klein (Q)'; }

  /* ---------- Bahnen ---------- */
  function aktualisieren() {
    if (!stand) return;
    const st = stand;
    const jetzt = serverJetzt();
    const ziel = st.ziel;
    t.titel.textContent = '🏁 ' + st.set.titel;
    document.title = st.set.titel + ' – Beamer';
    t.unter.innerHTML = '';
    t.unter.append('Ziel: ', el('strong', {}, `${ziel} richtige hintereinander`), ' · Fehler → zurück auf Start!');
    if (t.markenZiel !== ziel) {
      t.markenZiel = ziel;
      t.marken.innerHTML = '';
      const schritt = ziel <= 12 ? 1 : 5;
      t.marken.append(el('span', { style: 'left:0%' }, 'Start'));
      for (let i = schritt; i < ziel; i += schritt) t.marken.append(el('span', { style: `left:${(i / ziel) * 100}%` }, String(i)));
      t.marken.append(el('span', { style: 'left:100%' }, `🏁 ${ziel}`));
    }
    if (!t.zielWahl.options.length) {
      for (const z of st.ziele) t.zielWahl.append(el('option', { value: String(z) }, `${z} richtige`));
    }

    const liste = st.spieler;
    const zielListe = liste.filter((p) => p.imZiel);
    if (bekannteZiele && st.status === 'laeuft') zielListe.forEach((p, i) => { if (!bekannteZiele.has(p.id)) einlauf(p, i + 1); });
    bekannteZiele = new Set(zielListe.map((p) => p.id));

    // Bahnhöhe: die ganze freie Höhe nutzen (wie im ILS-Live-Rennen); „Nur Top 10“ zeigt die ersten 10, dafür größer
    const anzahl = nurTop10 ? Math.min(10, liste.length) : liste.length;
    let hoehe = 0;
    for (let runde = 0; runde < 3; runde++) {
      const frei = (t.box && t.box.clientHeight) || window.innerHeight * 0.7;
      const neu = Math.max(22, Math.min(nurTop10 ? 120 : 96, Math.floor(frei / Math.max(1, anzahl))));
      if (neu === hoehe) break;
      hoehe = neu;
      t.links.style.setProperty('--zeile', `${hoehe}px`);
      t.strecke.style.height = `${anzahl * hoehe}px`;
    }
    const laeuft = st.status === 'laeuft' && jetzt >= st.start;
    liste.forEach((p, idx) => {
      let b = bahnen.get(p.id);
      if (!b) {
        b = { platz: el('span', { class: 'rb-platz' }),
          name: el('span', { class: 'rb-name', title: 'Anklicken: aus dem Rennen nehmen', onclick: () => entfernen(p.id) }, p.name),
          linien: el('div'), fuellung: el('div', { class: 'rb-fuellung' }), rekord: el('i', { class: 'qz-rekord' }),
          figur: el('span', { class: 'rb-figur' + (figur ? ' rb-sprite' : '') }), status: el('span', { class: 'rb-status' }),
          fehler: p.fehler, sturzBis: 0 };
        b.el = el('div', { class: 'rb-raster rb-bahn', 'data-id': p.id }, b.platz, b.name,
          el('div', { class: 'rb-spur' }, b.linien, b.fuellung, b.rekord, b.figur), b.status);
        bahnen.set(p.id, b);
        t.strecke.append(b.el);
      }
      if (b.linienZiel !== ziel) {
        b.linienZiel = ziel;
        b.linien.innerHTML = '';
        for (let i = 1; i <= ziel; i++) b.linien.append(el('i', { class: 'rb-linie', style: `left:${(i / ziel) * 100}%` + (i < ziel && (ziel > 12 ? i % 5 : 1) ? ';opacity:.45' : '') }));
      }
      // Fehler seit der letzten Abfrage → zurück auf Start: Bahn blinkt rot
      if (b.fehler != null && p.fehler > b.fehler && st.status === 'laeuft' && !p.imZiel) {
        b.sturzBis = Date.now() + 2600;
        b.el.classList.remove('sturz'); void b.el.offsetWidth; b.el.classList.add('sturz');
        clearTimeout(b.sturzTimer);
        b.sturzTimer = setTimeout(() => b.el.classList.remove('sturz'), 2600);
      }
      b.fehler = p.fehler;
      const offline = jetzt - p.zuletzt > OFFLINE_MS;
      const serie = p.imZiel ? ziel : Math.min(p.serie, ziel);
      const pct = (serie / ziel) * 100;
      const platz = p.imZiel ? zielListe.indexOf(p) + 1 : 0;
      b.el.style.height = `${hoehe}px`;
      b.el.style.transform = `translateY(${Math.min(idx, anzahl) * hoehe}px)`;
      b.el.classList.toggle('weg', idx >= anzahl);
      b.el.classList.toggle('im-ziel', !!p.imZiel);
      b.el.classList.toggle('offline', offline && !p.imZiel);
      b.fuellung.style.width = `${pct}%`;
      b.figur.style.left = `${pct}%`;
      b.rekord.style.left = `${(Math.min(p.best, ziel) / ziel) * 100}%`;
      b.rekord.classList.toggle('hidden', p.imZiel || p.best <= serie);
      b.rekord.title = `beste Serie: ${p.best}`;
      if (figur) {
        const g = p.imZiel ? figur.jubel : figur.lauf;
        const mass = Math.max(1, Math.floor(((hoehe * 0.92) / figur.lauf.hoehe) * 4) / 4);
        b.figur.classList.toggle('ziel', !!p.imZiel);
        b.figur.classList.toggle('steht', !p.imZiel && (!laeuft || offline));
        b.figur.style.width = `${g.breite * mass}px`;
        b.figur.style.height = `${g.hoehe * mass}px`;
      } else {
        b.figur.textContent = p.imZiel ? '🏁' : '🏃';
        b.figur.classList.toggle('laeuft', !p.imZiel);
      }
      b.platz.textContent = platz ? (MEDAILLE[platz - 1] || `${platz}.`) : `${idx + 1}.`;
      let text;
      if (p.imZiel) text = `Platz ${platz} · ${dauer(p.imZiel - st.start)}`;
      else if (offline) text = '📴 offline';
      else if (st.status === 'warten') text = 'bereit';
      else if (b.sturzBis > Date.now()) text = '💥 zurück auf 0';
      else if (st.status === 'beendet') text = `beste Serie: ${p.best}`;
      else text = `${p.serie} / ${ziel}` + (p.best > p.serie ? ` · Rekord ${p.best}` : '');
      b.status.textContent = text;
    });
    for (const [id, b] of bahnen) if (!liste.some((p) => p.id === id)) { b.el.remove(); bahnen.delete(id); }
    t.leer.classList.toggle('hidden', liste.length > 0);
    if (!liste.length) {
      t.leer.innerHTML = '';
      t.leer.append('📱 QR-Code scannen, Namen eingeben –', el('br'), 'schon stehen Sie am Start!',
        el('small', {}, 'Wer mitmacht, bekommt hier eine eigene Bahn.'));
    }

    // Zielliste rechts
    t.ziel.innerHTML = '';
    const besteSerie = liste.filter((p) => !p.imZiel && p.best > 0).sort((a, b) => b.best - a.best)[0];
    const zeilen = window.innerHeight < 800 ? 3 : 6;
    anhaengen(t.ziel, el('div', { class: 'rb-ziel-titel' }, '🏁 Im Ziel'),
      zielListe.length
        ? el('ol', {}, zielListe.slice(0, zeilen).map((p, i) => el('li', {}, el('span', {}, `${MEDAILLE[i] || `${i + 1}.`} ${p.name}`),
          el('strong', {}, dauer(p.imZiel - st.start)))))
        : el('p', { class: 'rb-leer' }, st.status === 'laeuft' ? 'Noch niemand – wer ist zuerst da?' : 'Noch niemand.'),
      !zielListe.length && besteSerie ? el('p', { class: 'rb-anzahl' }, `Beste Serie bisher: ${besteSerie.name} (${besteSerie.best})`) : null,
      liste.length ? el('p', { class: 'rb-anzahl' }, `${zielListe.length} von ${liste.length} im Ziel`) : null);
    t.qrAnzahl.textContent = liste.length === 1 ? '1 Person dabei' : `${liste.length} Personen dabei`;

    // Knöpfe
    t.haupt.textContent = st.status === 'warten' ? '▶ Rennen starten' : st.status === 'laeuft' ? '⏹ Rennen beenden' : '▶ Neues Rennen starten';
    t.haupt.classList.toggle('stopp', st.status === 'laeuft');
    t.neuStart.classList.toggle('hidden', st.status !== 'laeuft');
    t.zielWahl.disabled = st.status === 'laeuft';
    if (t.zielWahl.value !== String(ziel)) t.zielWahl.value = String(ziel);
    t.top10.textContent = nurTop10 ? '👥 Alle (T)' : '🔟 Top 10 (T)';
    t.top10.disabled = liste.length <= 10 && !nurTop10;
    t.ehrungKnopf.disabled = !zielListe.length;
  }

  function ticken() {
    if (!stand) return;
    const st = stand;
    const jetzt = serverJetzt();
    const n = st.spieler.length;
    if (st.status === 'warten') t.uhr.textContent = n ? `⏳ ${n} am Start` : '⏳ noch niemand da';
    else if (st.status === 'laeuft') t.uhr.textContent = jetzt < st.start ? '⏳ gleich geht’s los …' : `⏱ ${dauer(jetzt - st.start)}`;
    else t.uhr.textContent = `🏁 Rennen beendet · ${dauer((st.ende || jetzt) - st.start)}`;
    const zeigen = st.status === 'laeuft' && jetzt < st.start + 1200;
    t.countdown.classList.toggle('hidden', !zeigen);
    if (zeigen) {
      const rest = st.start - jetzt;
      t.countdown.textContent = rest > 0 ? String(Math.ceil(rest / 1000)) : 'Los!';
      t.countdown.classList.toggle('los', rest <= 0);
    }
  }

  /* ---------- Knöpfe ---------- */
  async function hauptKnopf() {
    if (!stand) return;
    if (stand.status === 'laeuft') {
      if (!window.confirm('Rennen beenden? Die Zielliste bleibt stehen; die Handys zeigen das Ergebnis.')) return;
      await steuern({ aktion: 'stopp' });
    } else {
      await steuern({ aktion: 'start' });
    }
  }
  async function neuStarten() {
    if (!window.confirm('Rennen neu starten? Alle beginnen wieder bei 0.')) return;
    await steuern({ aktion: 'start' });
  }
  async function zielAendern() {
    const ziel = Number(t.zielWahl.value);
    merken.set('quiz-rennen-ziel', String(ziel));
    await steuern({ aktion: 'ziel', ziel });
  }
  async function entfernen(id) {
    const p = stand && stand.spieler.find((x) => x.id === id);
    if (!p) return;
    if (!window.confirm(`${p.name} aus dem Rennen nehmen? (z. B. Name falsch geschrieben) – ${p.name} kann sich danach neu anmelden.`)) return;
    await steuern({ aktion: 'entfernen', id });
  }
  async function neueKlasse() {
    if (!window.confirm('Neue Klasse? Alle Namen und Ergebnisse in diesem Raum werden gelöscht. Es gibt einen neuen QR-Code.')) return;
    pausiert = true;
    try { await api('/api/rennen/steuern', { raum, aktion: 'loeschen' }); } catch (e) { /* Raum löscht sich sonst nach 3 h selbst */ }
    try { await raumAnlegen(true); } catch (e) { meldung('Keine Verbindung zum Server. Bitte Seite neu laden.'); }
    pausiert = false;
  }
  function top10Umschalten() {
    nurTop10 = !nurTop10;
    merken.set('quiz-rennen-top10', nurTop10 ? '1' : '');
    aktualisieren();
  }
  function vollbild() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }
  let meldungTimer = null;
  function meldung(text) {
    let m = document.getElementById('qz-meldung');
    if (!m) { m = el('div', { class: 'qz-meldung', id: 'qz-meldung', role: 'status' }); ov.append(m); }
    m.textContent = text;
    clearTimeout(meldungTimer);
    meldungTimer = setTimeout(() => m.remove(), 6000);
  }

  /* ---------- Zieleinlauf, Konfetti ---------- */
  function einlauf(p, platz) {
    t.toast.textContent = `🎉 ${p.name} ist im Ziel – Platz ${platz}!`;
    t.toast.classList.remove('zeigen'); void t.toast.offsetWidth; t.toast.classList.add('zeigen');
    konfetti(ov);
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

  /* ---------- Siegerehrung Top 5 (wie im ILS-Live-Rennen) ---------- */
  function siegerehrung() {
    if (!stand || ehrung) return;
    const st = stand;
    const top = st.spieler.filter((p) => p.imZiel).slice(0, 5);
    if (!top.length) return;
    const zeitText = (p) => `nach ${dauer(p.imZiel - st.start)}`;
    const buehne = el('div', { class: 'se-treppchen' });
    const stufe = (platz) => {
      const p = top[platz - 1];
      return el('div', { class: `se-stufe se-p${platz}` + (p ? '' : ' leer') },
        figur && p ? el('img', { class: 'rb-sieger-figur', src: figur.jubel.url, alt: '' }) : null,
        el('div', { class: 'se-name' }, p ? (platz === 1 ? '🏆 ' : '') + p.name : ''),
        el('div', { class: 'se-punkte' }, p ? zeitText(p) : ''),
        el('div', { class: 'se-block' }, String(platz)));
    };
    const stufen = { 2: stufe(2), 1: stufe(1), 3: stufe(3) };
    buehne.append(stufen[2], stufen[1], stufen[3]);
    const zeilen = top.slice(3).map((p) => el('li', {}, el('span', {}, p.name), el('strong', {}, zeitText(p))));
    ehrung = el('div', { class: 'rb-ehrung', id: 'qz-ehrung-ebene' },
      el('div', { class: 'se-kopf' }, el('div', { class: 'se-titel' }, '🏆 Siegerehrung'),
        el('div', { class: 'se-unter' }, `${st.set.titel} · ${st.ziel} richtige hintereinander · die schnellsten ${top.length}`)),
      buehne, el('ol', { class: 'se-rest rb-rest', start: '4' }, zeilen),
      el('div', { class: 'se-knoepfe' },
        el('button', { type: 'button', class: 'btn secondary', onclick: () => ehrungAbspielen() }, '↻ Nochmal (R)'),
        el('button', { type: 'button', class: 'btn secondary', onclick: vollbild }, '⛶ Vollbild (F)'),
        el('button', { type: 'button', class: 'btn secondary', id: 'qz-ehrung-zurueck', onclick: ehrungSchliessen }, '← Zurück zum Rennen (Esc)')));
    ov.append(ehrung);
    let timer = [];
    ehrungAbspielen = () => {
      timer.forEach(clearTimeout); timer = [];
      [stufen[1], stufen[2], stufen[3], ...zeilen].forEach((z) => z.classList.remove('zeigen'));
      let z = 300;
      [...zeilen].reverse().forEach((x) => { timer.push(setTimeout(() => x.classList.add('zeigen'), z)); z += 400; });
      timer.push(setTimeout(() => stufen[3].classList.add('zeigen'), z + 300));
      timer.push(setTimeout(() => stufen[2].classList.add('zeigen'), z + 1100));
      timer.push(setTimeout(() => { stufen[1].classList.add('zeigen'); konfetti(ehrung); }, z + 2600));
    };
    ehrungAbspielen();
  }
  function ehrungSchliessen() {
    if (ehrung) ehrung.remove();
    ehrung = null;
    aktualisieren();
  }

  /* ---------- Häufige Fehler (für die Nachbesprechung) ---------- */
  async function fehlerZeigen() {
    fehlerSchliessen();
    fehlerEbene = el('div', { class: 'qz-fehler', id: 'qz-fehler' }, el('h2', {}, '📊 Häufige Fehler'), el('p', { class: 'se-unter' }, 'wird geladen …'));
    ov.append(fehlerEbene);
    let r;
    try { r = await api('/api/rennen/fehler?raum=' + raum); } catch (e) { r = null; }
    if (!fehlerEbene) return;
    fehlerEbene.innerHTML = '';
    const knoepfe = el('div', { class: 'se-knoepfe' },
      el('button', { type: 'button', class: 'btn secondary', onclick: fehlerZeigen }, '↻ Aktualisieren'),
      el('button', { type: 'button', class: 'btn secondary', id: 'qz-fehler-zurueck', onclick: fehlerSchliessen }, '← Zurück zum Rennen (Esc)'));
    if (!r || r.status !== 200 || !r.d.ok) {
      fehlerEbene.append(el('h2', {}, '📊 Häufige Fehler'), el('p', { class: 'se-unter' }, 'Die Auswertung konnte nicht geladen werden.'), knoepfe);
      return;
    }
    const kat = Object.fromEntries(r.d.kategorien.map((k) => [k.k, k]));
    const liste = r.d.liste;
    const summeN = liste.reduce((s, x) => s + x.n, 0);
    const summeF = liste.reduce((s, x) => s + x.falsch, 0);
    const paare = {};
    for (const x of liste) for (const [w, n] of Object.entries(x.als)) paare[`${x.k}|${w}`] = (paare[`${x.k}|${w}`] || 0) + n;
    const top = Object.entries(paare).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const buchstabe = (k) => el('span', { class: `qz-l k-${k}` }, k);
    const falsche = liste.filter((x) => x.falsch > 0).slice(0, 12);
    anhaengen(fehlerEbene,
      el('h2', {}, '📊 Häufige Fehler'),
      el('p', { class: 'se-unter' }, summeN
        ? `Alle Runden in diesem Raum: ${summeN} Antworten, davon ${summeF} falsch. Anonym – ohne Namen.`
        : 'Noch keine Antworten.'),
      top.length ? el('div', { class: 'qz-verwechslungen' }, el('span', {}, 'Am häufigsten verwechselt:'),
        top.map(([paar, n]) => { const [k, w] = paar.split('|'); return el('span', {}, 'richtig ', el('b', {}, k), ' · getippt ', el('b', {}, w), ` – ${n}×`); })) : null,
      falsche.length
        ? el('ol', { class: 'qz-fehler-liste' }, falsche.map((x) => el('li', {},
          el('div', { class: 'qz-f-text' }, `„${x.text}“`),
          el('div', { class: 'qz-f-quote' }, el('b', {}, String(x.falsch)), ` von ${x.n} falsch`),
          el('div', { class: 'qz-f-info' }, 'Richtig: ', buchstabe(x.k), `${kat[x.k] ? kat[x.k].name + ' – ' + kat[x.k].kurz : x.k}`,
            '   ·   getippt: ', Object.entries(x.als).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}×`).join(', ')),
          el('div', { class: 'qz-f-warum' }, x.warum))))
        : el('p', { class: 'se-unter' }, summeN ? 'Keine Fehler – stark!' : ''),
      knoepfe);
  }
  function fehlerSchliessen() {
    if (fehlerEbene) fehlerEbene.remove();
    fehlerEbene = null;
  }

  /* ---------- Start ---------- */
  setInterval(ticken, 200);
  (async () => {
    try { await raumAnlegen(false); } catch (e) { meldung('Keine Verbindung zum Server. Die Seite versucht es weiter …'); }
    setTimeout(schleife, TAKT_MS);
  })();
})();
