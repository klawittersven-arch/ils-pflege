/* Galeriegang am Beamer (Lehrkraft-Seite → 🖼️ Galeriegang): nur angesehene Siegerwappen der gewählten Klasse,
 * aus allen ILS-Aufträgen, mit Rahmen und Namensschild; blättern, Pause, Gesamtansicht; „neu seit dem letzten Galeriegang“.
 * Alle Namen sind erfunden.
 * Start:  (cd worker && npm install)  dann  node tests/galerie.test.js   (Bildschirmfotos: BILDER=/pfad) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten } = require('./hilfen');

const PASSWORT = 'galerie-test';
const BILDER = process.env.BILDER || '';
const SUS = [
  ['3BFP2/1', 'Anna A.', '01.01.2004', 'Anna', '2004-01-01'],
  ['3BFP2/1', 'Ben B.', '02.02.2004', 'Ben', '2004-02-02'],
  ['3BFP2/1', 'Cem C.', '03.03.2004', 'Cem', '2004-03-03'],
  ['3BFP2/1', 'Dora D.', '04.04.2004', 'Dora', '2004-04-04'],
  ['3BFP2/2', 'Emil E.', '05.05.2004', 'Emil', '2004-05-05']
];

(async () => {
  const worker = await workerStarten(9000 + Math.floor(Math.random() * 80), PASSWORT, { CHALLENGE_MIN_SEK_JE_AUFGABE: 0 });
  const { server, basis } = await serverStarten(worker.url);
  const api = (weg, daten, token) => fetch(worker.url + weg, {
    method: daten ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : { 'X-Passwort': PASSWORT }) },
    body: daten ? JSON.stringify(daten) : undefined
  }).then((r) => r.json());
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  try {
    // Bilder malen (128 × 128 PNG, je Person andere Farben)
    const maler = await browser.newPage();
    const malen = (farbe, form) => maler.evaluate(([f, form]) => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128);
      x.fillStyle = f; x.strokeStyle = '#222'; x.lineWidth = 6;
      x.beginPath();
      if (form === 'schild') { x.moveTo(20, 18); x.lineTo(108, 18); x.lineTo(104, 74); x.quadraticCurveTo(64, 120, 24, 74); x.closePath(); } else { x.arc(64, 64, 44, 0, Math.PI * 2); }
      x.fill(); x.stroke();
      x.fillStyle = '#fff'; x.font = 'bold 40px sans-serif'; x.fillText('★', 44, 78);
      return c.toDataURL('image/png');
    }, [farbe, form]);

    await api('/api/lehrkraft/import', { text: SUS.map((s) => s.slice(0, 3).join(';')).join('\n') });
    const stand = await api('/api/lehrkraft/stand');
    const sid = (n) => stand.schueler.find((s) => s.name === n).sid;
    const token = {};
    for (const [klasse, name, , vorname, geb] of SUS) token[name] = (await api('/api/anmelden', { klasse, vorname, geburtstag: geb })).token;
    async function wappen(name, ils, farbe, form) {
      for (const sch of ['1', '2', '3', '4', '5', 'quiz']) await api('/api/lehrkraft/haken', { sid: sid(name), ils, schritt: sch, setzen: true });
      const lauf = await api('/api/challenge/start', { ils }, token[name]);
      await api('/api/challenge/ende', { ils, laufId: lauf.laufId, aufgabenPunkte: 1500, anzahl: 20 }, token[name]);
      const r = await api('/api/challenge/wappen', { ils, bild: await malen(farbe, form) }, token[name]);
      if (!r.ok) throw new Error('Wappen nicht gespeichert: ' + JSON.stringify(r));
    }
    await wappen('Anna A.', 'drainage', '#c0392b', 'schild');
    await wappen('Anna A.', 'me', '#2471a3', 'kreis');
    await wappen('Ben B.', 'drainage', '#27ae60', 'kreis');
    await wappen('Cem C.', 'drainage', '#8e44ad', 'schild');
    await wappen('Dora D.', 'drainage', '#e67e22', 'kreis');   // nicht angesehen → nicht in der Galerie
    await wappen('Emil E.', 'drainage', '#f1c40f', 'schild');  // andere Klasse
    await api('/api/lehrkraft/wappen-gesehen', { ils: 'drainage', sids: ['Anna A.', 'Ben B.', 'Cem C.', 'Emil E.'].map(sid) });
    await api('/api/lehrkraft/wappen-gesehen', { ils: 'me', sids: [sid('Anna A.')] });

    console.log('Lehrkraft: Galeriegang öffnen');
    const k = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    await k.clock.install();
    const l = await k.newPage();
    beobachten(l, protokoll, 'lehrkraft');
    await l.goto(basis + 'lehrkraft/');
    await l.fill('#lk-pw', PASSWORT);
    await l.click('.lk-login button[type=submit]');
    await l.waitForSelector('#lk-galerie');
    pruefe(/Galeriegang/.test(await l.textContent('#lk-galerie')), 'Knopf „🖼️ Galeriegang“ neben den Siegerwappen');
    await l.click('#lk-galerie');
    await l.waitForSelector('.ga-karte .ga-gold-knopf');
    pruefe(/welche Klasse/i.test(await l.textContent('.ga-karte')), 'ohne gewählte Klasse: Klasse wird zuerst abgefragt');
    await l.click('.ga-karte .ga-gold-knopf:has-text("3BFP2/1")');
    await l.waitForSelector('#ga-start-alle');
    const start = await l.textContent('.ga-karte');
    pruefe(/4 Kunstwerke/.test(start) && !(await l.$('#ga-start-neu')), 'Startkarte: 4 Kunstwerke (nur angesehene, beide ILS-Aufträge), beim ersten Mal kein „neu“', start);
    pruefe(/1 Wappen wartet noch auf Ihre Freigabe/.test(start), 'Startkarte: Hinweis auf noch nicht freigegebenes Wappen');
    if (BILDER) await l.screenshot({ path: path.join(BILDER, 'galerie_1_start.png') });

    console.log('Rundgang');
    await l.click('#ga-start-alle');
    await l.waitForSelector('.ga-overlay.offen .ga-werk.aktiv');
    const namen = await l.$$eval('.ga-werk .ga-schild strong', (x) => x.map((e) => e.textContent).sort());
    pruefe(JSON.stringify(namen) === JSON.stringify(['Anna A.', 'Anna A.', 'Ben B.', 'Cem C.']), 'nur Werke der Klasse, nur angesehene (ohne Dora, ohne Emil)', namen);
    const schilder = await l.$$eval('.ga-schild span', (x) => x.map((e) => e.textContent).join(' | '));
    pruefe(/ILS Wunddrainagen/.test(schilder) && /ILS Materialentfernung/.test(schilder), 'Namensschild nennt den ILS-Auftrag', schilder);
    pruefe((await l.$$('.ga-werk img')).length === 4 && !!(await l.$('.rahmen-gold')) && !!(await l.$('.rahmen-nuss')) && !!(await l.$('.rahmen-silber')),
      'Bilder in Gold-, Nussbaum- und Silberrahmen');
    await l.clock.fastForward(8000);   // Vorhang (2,6 s) + 6,5 s für das erste Werk
    pruefe(/Werk 1 von 4/.test(await l.textContent('.ga-zaehler')), 'erstes Werk bekommt nach dem Vorhang die volle Zeit („Werk 1 von 4“)');
    await l.clock.fastForward(1500);
    if (BILDER) { await l.waitForTimeout(2500); await l.screenshot({ path: path.join(BILDER, 'galerie_2_rundgang.png') }); }
    pruefe(/Werk 2 von 4/.test(await l.textContent('.ga-zaehler')), 'nach 6,5 s geht es von selbst zum nächsten Werk');
    await l.keyboard.press('ArrowRight');
    pruefe(/Werk 3 von 4/.test(await l.textContent('.ga-zaehler')), 'Pfeil rechts: nächstes Werk');
    await l.keyboard.press('ArrowLeft');
    await l.keyboard.press(' ');
    pruefe(/Werk 2 von 4 · ⏸ Pause/.test(await l.textContent('.ga-zaehler')), 'Pfeil links + Leertaste: zurück und Pause');
    await l.clock.fastForward(20000);
    pruefe(/Werk 2 von 4/.test(await l.textContent('.ga-zaehler')), 'in der Pause bleibt das Werk stehen');
    await l.keyboard.press('g');
    await l.waitForSelector('.ga-saal');
    pruefe((await l.$$('.ga-saal .ga-werk')).length === 4 && /Danke an alle/.test(await l.textContent('.ga-dank')), 'Gesamtansicht: alle 4 Werke und Dank');
    await l.clock.fastForward(1500);
    if (BILDER) { await l.waitForTimeout(2500); await l.screenshot({ path: path.join(BILDER, 'galerie_3_saal.png') }); }
    await l.keyboard.press('Escape');
    pruefe(!(await l.$('#ga-overlay')), 'Esc schließt den Galeriegang');

    console.log('Neues Wappen seit dem letzten Galeriegang');
    await l.clock.fastForward(5000);
    await api('/api/challenge/wappen', { ils: 'drainage', bild: await malen('#16a085', 'schild') }, token['Ben B.']);
    await api('/api/lehrkraft/wappen-gesehen', { ils: 'drainage', sids: [sid('Ben B.')] });
    await l.selectOption('#lk-klasse', '3BFP2/1');
    await l.click('#lk-galerie');
    await l.waitForSelector('#ga-start-neu');
    pruefe(/davon 1 neu/.test(await l.textContent('.ga-karte')), 'Startkarte: „davon 1 neu seit dem letzten Galeriegang“ (Klasse direkt aus der Auswahl)');
    await l.click('#ga-start-neu');
    await l.waitForSelector('.ga-werk.aktiv .ga-neu');
    pruefe((await l.$$('.ga-werk')).length === 1 && (await l.textContent('.ga-werk.aktiv .ga-schild strong')) === 'Ben B.', 'Rundgang nur mit dem neuen Werk (✨ Neu)');
    await l.clock.fastForward(4000);
    if (BILDER) { await l.waitForTimeout(3000); await l.screenshot({ path: path.join(BILDER, 'galerie_4_neu.png') }); }

    pruefe(protokoll.konsole.length === 0, 'keine JavaScript-Fehler', protokoll.konsole);
    pruefe(protokoll.extern.length === 0, 'keine Anfragen an fremde Adressen', protokoll.extern);
  } catch (err) {
    console.error(err);
    pruefe(false, 'Test abgebrochen: ' + err.message);
  } finally {
    await browser.close(); server.close(); worker.beenden();
  }
  process.exit(ergebnis() ? 0 : 1);
})();
