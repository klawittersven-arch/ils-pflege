/* Tempo-Kontrolle im Lernmodus (Probe-Übung 1: wahl, rf, mehrfach, zahl, luecke):
 *   · unmöglich schnell (unter 35 % der Lesezeit) → zählt nicht, Warnung
 *   · schnell, aber richtig → zählt, keine Warnung (schnelle Leser werden nicht ausgebremst)
 *   · schnell und falsch → Fehler + Warnung (Raten); 3. Warnung → Lesepause vor der nächsten Aufgabe
 *   · Zahl-Eingabe: die letzte Zahl zählt („270 - 120 = 150“)
 * Start:  (cd worker && npm install)  dann  node tests/tempo.test.js */
'use strict';
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL } = require('./hilfen');

const PASSWORT = 'tempo-test';

// Lesezeit der angezeigten Karte (so, wie die Seite sie berechnet)
async function lesezeit(s) {
  return s.evaluate(() => {
    const k = document.querySelector('.lern-karte');
    const text = (sel) => [...k.querySelectorAll(sel)].map((e) => e.textContent);
    const frage = text('.q-text')[0] || '';
    const typ = k.getAttribute('data-typ');
    if (typ === 'rf') return ILSLern.lesezeit({ typ, frage, aussage: text('.lern-aussage')[0] });
    if (typ === 'luecke') return ILSLern.lesezeit({ typ, frage, text: k.querySelector('.luecken-text').textContent.split('…')[0] + '{{x}}' });
    if (typ === 'zahl') return ILSLern.lesezeit({ typ, frage });
    return ILSLern.lesezeit({ typ, frage, optionen: text('.antwort') });
  });
}
const anteil = async (s, f) => s.clock.fastForward(Math.round((await lesezeit(s)) * f));
const hinweis = (s) => s.textContent('.lern-hinweis');
const sichtbarerHinweis = async (s) => /zeigen/.test(await s.getAttribute('.lern-hinweis', 'class'));
async function weiter(s) {
  await s.waitForSelector('#lern-weiter:not(.hidden)');
  await s.clock.fastForward(5000);
  await s.click('#lern-weiter');
}

(async () => {
  const worker = await workerStarten(8800 + Math.floor(Math.random() * 80), PASSWORT);
  const { server, basis } = await serverStarten(worker.url);
  await fetch(worker.url + '/api/lehrkraft/import', { method: 'POST', headers: { 'X-Passwort': PASSWORT }, body: JSON.stringify({ text: '3BFP2/1;Tempo T.;01.01.2004' }) });
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  try {
    const k = await browser.newContext(MOBIL);
    await k.clock.install();
    const s = await k.newPage();
    beobachten(s, protokoll, 'sus');
    await s.goto(basis + 'probe/');
    await s.waitForSelector('.wahl');
    await s.click('.wahl'); await s.fill('#konto-vn', 'Tempo'); await s.fill('#konto-tag', '1'); await s.fill('#konto-monat', '1'); await s.fill('#konto-jahr', '2004');
    await s.click('#konto-anmelden');
    await s.waitForSelector('.konto-leiste');
    await s.goto(basis + 'probe/1/');
    await s.waitForSelector('#lern-los');
    pruefe(/Richtige Antworten zählen immer/.test(await s.textContent('.lern-start')), 'Startkarte erklärt: richtige Antworten zählen immer');
    await s.click('#lern-los');
    await s.waitForSelector('.lern-karte');

    console.log('Aufgabe 1 (wahl)');
    await s.click('.antwort:has-text("Redon-Drainage")');               // sofort
    pruefe(/Langsam/.test(await hinweis(s)) && /Warnung 1 von 3/.test(await hinweis(s)), 'sofort getippt → „Langsam“, Warnung 1 von 3');
    pruefe((await s.locator('.antwort.richtig').count()) === 0, 'unmöglich schnelle Antwort wird nicht ausgewertet');
    await anteil(s, 0.6);                                               // schnell, aber möglich
    await s.click('.antwort:has-text("Redon-Drainage")');
    pruefe((await s.locator('.fb.show.ok').count()) === 1, 'schnelle, richtige Antwort zählt (✓ Richtig)');
    pruefe(!(await sichtbarerHinweis(s)), 'schnelle, richtige Antwort: keine Warnung');
    await weiter(s);

    console.log('Aufgabe 2 (rf)');
    await anteil(s, 0.6);
    await s.click('.lern-optionen.zwei .antwort:has-text("Falsch")');   // schnell und falsch
    pruefe((await s.locator('.fb.show.bad').count()) === 1, 'schnelle, falsche Antwort wird als Fehler gewertet');
    pruefe(/Raten/.test(await hinweis(s)) && /Warnung 2 von 3/.test(await hinweis(s)), 'schnell und falsch → Warnung 2 von 3', await hinweis(s));
    pruefe((await s.textContent('.herzen')) === '❤️❤️❤️🤍', 'ein Herz weniger');
    await weiter(s);

    console.log('Aufgabe 3 (mehrfach) – 3. Warnung');
    await s.click('.antwort:has-text("Lieblingsessen")');               // Auswahl zählt nicht als Versuch
    await anteil(s, 0.6);
    await s.click('.lern-pruefen');
    pruefe((await s.locator('.fb.show.bad').count()) === 1 && /Warnung 3 von 3/.test(await hinweis(s)), 'schnell und falsch → Warnung 3 von 3');
    await weiter(s);
    await s.waitForSelector('#lern-fortsetzen');
    pruefe(await s.isDisabled('#lern-fortsetzen') && /nächsten Aufgabe/.test(await s.textContent('.lern-start')),
      '3. Warnung → Lesepause, danach geht es mit der nächsten Aufgabe weiter');
    await s.clock.fastForward(16000);
    await s.waitForSelector('#lern-fortsetzen:not([disabled])');
    pruefe(/Aufgabe 4/.test(await s.textContent('#lern-fortsetzen')), 'Knopf: „Weiter mit Aufgabe 4“');
    await s.click('#lern-fortsetzen');
    await s.waitForSelector('.lern-karte');
    pruefe(/Aufgabe 4 von 5/.test(await s.textContent('.lern-kopf')), 'nach der Pause: Aufgabe 4 (kein Neustart)');

    console.log('Aufgabe 4 (zahl)');
    await s.clock.fastForward(15000);
    await s.fill('.lern-zahl', '270 - 120 = 150');
    await s.click('.lern-zahlzeile button');
    pruefe((await s.locator('.fb.show.ok').count()) === 1, 'Zahl: „270 - 120 = 150“ wird als 150 erkannt');
    await weiter(s);

    console.log('Aufgabe 5 (luecke) – mehrschrittig');
    await anteil(s, 0.6);
    await s.click('.chip:has-text("offene")');                          // schnell und falsch
    pruefe(/passt nicht/.test(await hinweis(s)) && /Warnung 1 von 3/.test(await hinweis(s)), 'Lücke: schnell und falsch → Fehler + Warnung 1 von 3 (nach der Pause neu gezählt)');
    await s.click('.chip:has-text("aktive")'); await s.click('.chip:has-text("passive")');
    pruefe((await s.locator('.fb.show.hint').count()) === 1, 'Lücke danach gelöst (mit 1 Fehler)');
    await weiter(s);

    await s.waitForSelector('.lern-fertig .meldung.ok');
    pruefe(/2 von 5/.test(await s.textContent('.lern-fertig')), 'Ergebnis: 2 von 5 ohne Fehler');
    const stand = await (await fetch(worker.url + '/api/lehrkraft/stand', { headers: { 'X-Passwort': PASSWORT } })).json();
    const e = stand.schueler.find((x) => x.name === 'Tempo T.').fortschritt.probe['1'];
    pruefe(e.zuSchnell === 4 && e.punkte === 2 && e.max === 5, 'Lehrkraft-Tabelle: ⏳4 (1× unmöglich schnell, 3× schnell und falsch)', e);

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
