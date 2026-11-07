/* Test der Selbst-Aktualisierung: Eine offene Seite lädt sich genau einmal neu, wenn assets/version.json
 * eine neuere Fassung meldet – und nicht in einer Schleife, falls danach noch die alte Seite kommt.
 * Start: node tests/version.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL, WURZEL } = require('./hilfen');

(async () => {
  const worker = await workerStarten(8800 + Math.floor(Math.random() * 80), 'version-test');
  const { server, basis } = await serverStarten(worker.url);
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  await fetch(worker.url + '/api/lehrkraft/import', { method: 'POST', headers: { 'X-Passwort': 'version-test' }, body: JSON.stringify({ text: '3BFP2/1;Test T.;01.01.2004' }) });
  const aktuell = JSON.parse(fs.readFileSync(path.join(WURZEL, 'assets/version.json'), 'utf8')).version;
  try {
    const k = await browser.newContext(MOBIL);
    await k.clock.install();
    const s = await k.newPage();
    beobachten(s, protokoll, 'sus');
    let ladungen = 0;
    s.on('load', () => { ladungen += 1; });
    let gemeldet = aktuell;
    await s.route('**/assets/version.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: gemeldet }) }));

    await s.goto(basis + 'drainage/1/');
    await s.waitForSelector('.wahl');
    const v = await s.evaluate(() => new URL(document.querySelector('script[src*="ils-konto.js"]').src).searchParams.get('v'));
    pruefe(v === aktuell, `Seite und assets/version.json haben dieselbe Version (${v})`, aktuell);
    await s.evaluate(() => { window.__marke = 1; });
    await s.clock.fastForward(61000);
    await s.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await s.waitForTimeout(1500);
    pruefe(ladungen === 1 && (await s.evaluate(() => window.__marke)) === 1, 'gleiche Version: kein Neuladen');

    console.log('Neue Fassung veröffentlicht');
    gemeldet = 'neuer-als-die-seite';
    await s.clock.fastForward(61000);
    await s.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));   // Handy holt den Tab wieder nach vorn
    await s.waitForFunction(() => window.__marke === undefined, null, { timeout: 8000 });
    await s.waitForSelector('.wahl');
    pruefe(ladungen === 2, 'neue Fassung: Seite lädt sich einmal neu', ladungen);
    await s.clock.fastForward(61000);
    await s.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await s.waitForTimeout(2000);
    pruefe(ladungen === 2, 'keine Neulade-Schleife, wenn danach noch die alte Seite kommt', ladungen);

    pruefe(protokoll.konsole.length === 0, 'keine JavaScript-Fehler', protokoll.konsole);
    pruefe(protokoll.extern.length === 0, 'keine Anfragen an fremde Adressen', protokoll.extern);
  } catch (e) {
    console.error(e);
    pruefe(false, 'Test abgebrochen: ' + e.message);
  } finally {
    await browser.close(); server.close(); worker.beenden();
  }
  process.exit(ergebnis() ? 0 : 1);
})();
