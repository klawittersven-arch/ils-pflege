/* Anonyme Fehlerstatistik je Aufgabe + Sortier-Regel (je Begriff zählt nur der erste Fehlklick):
 *   SuS bearbeitet Drainage Ü5 (PESR) mit zwei Fehlklicks beim selben Begriff → nur 1 Herz weniger,
 *   Handy meldet die Aufgabe anonym, Server summiert ohne Namen, Lehrkraft-Seite zeigt „📊 Schwierige Aufgaben“
 *   mit Klartext („… → S – Symptom (richtig: E – …)“), Zurücksetzen löscht die Statistik.
 * Start:  (cd worker && npm install)  dann  node tests/statistik.test.js */
'use strict';
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL } = require('./hilfen');
const { ohneTags, klickText, loesen } = require('./loeser');

const PASSWORT = 'statistik-test';

(async () => {
  const worker = await workerStarten(8900 + Math.floor(Math.random() * 80), PASSWORT);
  const { server, basis } = await serverStarten(worker.url);
  const lk = (weg, daten) => fetch(worker.url + weg, {
    method: daten ? 'POST' : 'GET', headers: { 'X-Passwort': PASSWORT, ...(daten ? { 'Content-Type': 'application/json' } : {}) },
    body: daten ? JSON.stringify(daten) : undefined
  }).then((r) => r.json());
  await lk('/api/lehrkraft/import', { text: '3BFP2/1;Statistik S.;02.02.2004' });
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  try {
    const k = await browser.newContext(MOBIL);
    await k.clock.install();
    const s = await k.newPage();
    beobachten(s, protokoll, 'sus');
    await s.goto(basis + 'drainage/');
    await s.waitForSelector('.wahl');
    await s.click('.wahl'); await s.fill('#konto-vn', 'Statistik'); await s.fill('#konto-tag', '2'); await s.fill('#konto-monat', '2'); await s.fill('#konto-jahr', '2004');
    await s.click('#konto-anmelden');
    await s.waitForSelector('.konto-leiste');

    // Übung 5 mit allen Aufgaben in Pool-Reihenfolge vorbereiten (Aufgabe 1 = PESR Frau Kramer, Aufgabe 2 = PESR Angst)
    await s.goto(basis + 'drainage/5/');
    await s.waitForSelector('#lern-los');
    const pool = await s.evaluate(() => POOL);
    const ids = await s.evaluate(() => POOL.map((a) => ILS.aufgabeId(a)));
    pruefe(new Set(ids).size === ids.length && ids.every((x) => /^[a-z0-9]{1,8}$/.test(x)), 'jede Aufgabe hat eine eigene Kennung', ids);
    await s.evaluate(() => {
      const konto = JSON.parse(localStorage.getItem('ils-konto'));
      localStorage.setItem(`ils-lern|${konto.klasse}|${konto.name}|drainage|5`, JSON.stringify({ sig: ILSLern.signatur(POOL), phase: 'karten',
        ziehung: POOL.map((_, i) => i), i: 0, fehler: 0, zuSchnell: 0, fehlerfrei: 0, themen: [], neustarts: 0, zuSchnellGesamt: 0,
        pauseBis: 0, grund: '', schreibenAb: 0, selbst: null, selbstMax: null, gemeldet: false }));
    });
    await s.reload();
    await s.waitForSelector('.sort-text');

    console.log('Sortieren: zwei Fehlklicks beim selben Begriff');
    const pesr = pool[0];
    await s.clock.fastForward(10000);
    const t = ohneTags(await s.textContent('.sort-text'));
    const e = pesr.elemente.find((x) => ohneTags(x.t) === t);
    const falsch = pesr.kategorien.map((_, i) => i).filter((i) => i !== e.k).slice(0, 2);
    await klickText(s, '.sort-knopf', ohneTags(pesr.kategorien[falsch[0]]));
    pruefe((await s.textContent('.herzen')) === '❤️❤️❤️🤍', '1. Fehlklick kostet ein Herz');
    await klickText(s, '.sort-knopf', ohneTags(pesr.kategorien[falsch[1]]));
    pruefe((await s.textContent('.herzen')) === '❤️❤️❤️🤍' && /kein weiteres Herz/.test(await s.textContent('.lern-hinweis')),
      '2. Fehlklick beim selben Begriff kostet kein weiteres Herz');
    // Rest richtig lösen
    for (let n = 0; n < pesr.elemente.length; n++) {
      if (!(await s.$('.sort-text'))) break;
      const tx = ohneTags(await s.textContent('.sort-text'));
      await klickText(s, '.sort-knopf', ohneTags(pesr.kategorien[pesr.elemente.find((x) => ohneTags(x.t) === tx).k]));
      await s.clock.fastForward(3000);
    }
    await s.waitForSelector('#lern-weiter:not(.hidden)');
    pruefe(/mit 1 Fehler\b/.test(await s.textContent('.fb')), 'Aufgabe gelöst „mit 1 Fehler“');
    await s.clock.fastForward(5000);
    await s.click('#lern-weiter');

    console.log('Zweite Aufgabe fehlerfrei');
    await s.waitForSelector('.lern-karte');
    await loesen(s, pool[1]);
    await s.waitForSelector('#lern-weiter:not(.hidden)');

    console.log('Server: anonyme Summen');
    let st = null;
    for (let v = 0; v < 40; v++) {
      st = await lk('/api/lehrkraft/statistik?ils=drainage');
      if (st.statistik && st.statistik['5'] && st.statistik['5'][ids[1]]) break;
      await new Promise((ok) => setTimeout(ok, 250));
    }
    const a1 = st.statistik['5'][ids[0]];
    const a2 = st.statistik['5'][ids[1]];
    const i0 = pesr.elemente.indexOf(e);
    pruefe(a1 && a1.n === 1 && a1.ok === 0 && a1.f === 1 && a1.x === 0, 'PESR 1: 1× gelöst, 1 Fehler (Herz)', a1);
    pruefe(a1 && a1.d[`e${i0}>${falsch[0]}`] === 1 && a1.d[`e${i0}>${falsch[1]}`] === 1, 'PESR 1: beide Fehlklicks einzeln gezählt (Begriff → Spalte)', a1 && a1.d);
    pruefe(a2 && a2.n === 1 && a2.ok === 1 && a2.f === 0, 'PESR 2: 1× gelöst ohne Fehler', a2);
    pruefe(!JSON.stringify(st).includes('Statistik'), 'Statistik enthält keinen Namen');

    const sendeTest = async (token, daten) => (await fetch(worker.url + '/api/statistik', { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(daten) })).status;
    const token = await s.evaluate(() => JSON.parse(localStorage.getItem('ils-konto')).token);
    const gut = { a: ids[0], i: 0, geloest: 1, fehlerfrei: 0, abbruch: 0, f: 1, d: ['e0>1'] };
    pruefe((await sendeTest(null, { ils: 'drainage', schritt: '5', eintraege: [gut] })) === 401, 'Server: ohne Anmeldung abgelehnt');
    pruefe((await sendeTest(token, { ils: 'drainage', schritt: '9', eintraege: [gut] })) === 400, 'Server: unbekannte Übung abgelehnt');
    pruefe((await sendeTest(token, { ils: 'drainage', schritt: '5', eintraege: [{ ...gut, d: ['<script>'] }] })) === 400, 'Server: ungültiger Fehlklick abgelehnt');
    pruefe((await sendeTest(token, { ils: 'drainage', schritt: '5', eintraege: [{ ...gut, fehlerfrei: 1 }] })) === 400, 'Server: „fehlerfrei mit Fehler“ abgelehnt');

    console.log('Lehrkraft: 📊 Schwierige Aufgaben');
    const l = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    beobachten(l, protokoll, 'lehrkraft');
    l.on('dialog', (d) => d.accept());
    await l.goto(basis + 'lehrkraft/');
    await l.fill('#lk-pw', PASSWORT);
    await l.click('.lk-login button[type=submit]');
    await l.waitForSelector('#lk-ils');
    await l.selectOption('#lk-ils', 'drainage');
    await l.click('#lk-statistik-knopf');
    await l.waitForSelector('table.lk-stat');
    const zeilen = await l.$$eval('table.lk-stat tbody tr', (tr) => tr.map((z) => z.textContent));
    pruefe(zeilen.length === 2 && /Sortieren: Pflegeproblem nach dem PESR-Schema: Ordnen/.test(zeilen[0]), 'Tabelle: schwierigste Aufgabe oben, mit Klartext', zeilen);
    const richtigeSpalte = ohneTags(pesr.kategorien[e.k]);
    pruefe(zeilen[0].includes(`1× „${t}“ → ${ohneTags(pesr.kategorien[falsch[0]])} (richtig: ${richtigeSpalte})`),
      'Tabelle: Fehlklick im Klartext („Begriff“ → Spalte, richtige Spalte)', zeilen[0]);
    pruefe(/\b1,0\b/.test(zeilen[0]) && /0 %/.test(zeilen[0]), 'Tabelle: 1,0 Fehler je Bearbeitung, 0 % ohne Fehler');
    if (process.env.BILDER) await l.screenshot({ path: require('path').join(process.env.BILDER, 'statistik_lehrkraft.png'), fullPage: true });
    await l.click('#lk-statistik-loeschen');
    await l.waitForSelector('#lk-statistik >> text=Noch keine Daten');
    const nachher = await lk('/api/lehrkraft/statistik?ils=drainage');
    pruefe(!Object.keys(nachher.statistik).length, 'Statistik zurücksetzen löscht alles für diesen Auftrag');

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
