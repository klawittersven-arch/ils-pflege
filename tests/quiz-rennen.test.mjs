/* Test des Quiz-Rennens (Beamer + Handys): Raum mit QR-Code, Beitreten mit Namen, Start mit Countdown,
 * Schutz gegen zu schnelles Tippen, Fehler → zurück auf 0 (Handy und Beamer), Dazustoßen während des Rennens,
 * Ausfall und Wiedereinstieg mit neuem Handy, Zieleinlauf, Siegerehrung, häufige Fehler, Ende, neues Rennen,
 * Person entfernen, neue Klasse.  Läuft ohne wrangler (Worker in Node nachgebaut, siehe worker-nachbau.mjs).
 * Start: node tests/quiz-rennen.test.mjs   (Bilder: BILDER=/pfad) – alle Namen erfunden. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { workerNachbauen } from './worker-nachbau.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { serverStarten, pruefe, ergebnis, beobachten, MOBIL } = require('./hilfen.js');
// Hinweis: Countdown dauert 5 s (worker/src/rennen.js, COUNTDOWN_MS)

const BILDER = process.env.BILDER || '';
const foto = async (s, n) => { if (BILDER) await s.screenshot({ path: path.join(BILDER, n + '.png') }); };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const w = await workerNachbauen();
const { zeitLimit } = await import('../worker/src/rennen.js');
const SET = globalThis.QUIZ_RENNEN_SETS.abcde;
const loesung = (id) => SET.fragen.find((f) => f.id === id).k;
const { server, basis } = await serverStarten(w.url);
const browser = await chromium.launch();
const protokoll = { konsole: [], extern: [] };
const raumObjekt = (code) => w.env.RENNEN.objekte.get('raum:' + code);

async function handy(vorname, initial, optionen = MOBIL) {
  const k = await browser.newContext(optionen);
  const s = await k.newPage();
  beobachten(s, protokoll, vorname);
  return { k, s };
}
async function beitreten(h, url, vorname, initial) {
  await h.s.goto(url);
  await h.s.waitForSelector('#qz-vorname');
  await h.s.fill('#qz-vorname', vorname);
  await h.s.fill('#qz-initial', initial);
  await h.s.click('#qz-mitmachen');
}
// eine Frage beantworten (richtig oder falsch) – wartet die Lesezeit ab
async function antworten(h, richtig) {
  await h.s.waitForSelector('#qz-knoepfe:not(.gesperrt)', { timeout: 8000 });
  const id = await h.s.getAttribute('#qz-text', 'data-id');
  const k = loesung(id);
  const wahl = richtig ? k : (k === 'A' ? 'C' : 'A');
  await h.s.click(`.qz-knopf[data-k="${wahl}"]`);
  if (richtig) {
    await h.s.waitForFunction((alt) => { const x = document.querySelector('#qz-text'); return document.querySelector('#qz-ziel') || (x && x.dataset.id !== alt); }, id, { timeout: 8000 });
  } else {
    await h.s.waitForSelector('#qz-falsch', { timeout: 8000 });
  }
  return { id, k, wahl };
}
const bahnStatus = (beamer, name) => beamer.evaluate((n) => {
  const b = [...document.querySelectorAll('.rb-bahn')].find((x) => x.querySelector('.rb-name').textContent === n);
  return b ? { status: b.querySelector('.rb-status').textContent, klassen: b.className, breite: b.querySelector('.rb-fuellung').style.width } : null;
}, name);

try {
  console.log('Beamer: Raum und QR-Code');
  const bk = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const beamer = await bk.newPage();
  beobachten(beamer, protokoll, 'beamer');
  beamer.on('dialog', (d) => d.accept());
  await beamer.goto(basis + 'quiz-rennen/beamer/');
  await beamer.waitForSelector('#qz-code');
  const code = await beamer.textContent('#qz-code');
  const url = await beamer.getAttribute('#qz-qr-bild', 'data-url');
  pruefe(/^[A-HJ-NP-Z2-9]{4}$/.test(code), `Raumcode am Beamer (${code})`);
  pruefe(url === basis + 'quiz-rennen/?r=' + code, 'QR-Code führt zur Handy-Seite mit dem Code', url);
  pruefe(await beamer.isVisible('#qz-qr-bild svg'), 'QR-Code ist zu sehen');
  pruefe(await beamer.isVisible('#qz-leer'), 'ohne Mitspielende: Hinweis „QR-Code scannen“');
  await beamer.selectOption('#qz-ziel', '5');
  await beamer.waitForFunction(() => document.querySelector('.rb-unter').textContent.includes('5 richtige'));
  pruefe(true, 'Ziel am Beamer auf 5 gestellt');
  pruefe((await beamer.inputValue('#qz-zeit')) === 'an', 'Zeitlimit ist zu Beginn an');
  await beamer.selectOption('#qz-zeit', 'aus');   // für die folgenden Schritte (der Test bedient mehrere Handys nacheinander)
  await beamer.waitForFunction(() => !document.querySelector('.rb-unter').textContent.includes('zu langsam'));
  pruefe(true, 'Zeitlimit am Beamer abgeschaltet');
  await beamer.reload();
  await beamer.waitForSelector('#qz-code');
  pruefe((await beamer.textContent('#qz-code')) === code, 'Neuladen des Beamers: gleicher Raum, gleicher QR-Code');
  await foto(beamer, 'beamer-leer');

  console.log('Handys: Namen eingeben');
  const anna = await handy('Anna', 'k');
  await anna.s.goto(basis + 'quiz-rennen/');
  await anna.s.waitForSelector('#qz-code-feld');
  pruefe(true, 'ohne Code in der Adresse: Code-Eingabe');
  await anna.s.fill('#qz-code-feld', code.toLowerCase());
  await anna.s.click('form .btn');
  await anna.s.waitForSelector('#qz-vorname');
  pruefe(anna.s.url().endsWith('?r=' + code), 'Code eingegeben → Namenseingabe');
  await anna.s.click('#qz-mitmachen');
  pruefe((await anna.s.textContent('.fb.show')).includes('Vornamen'), 'leerer Name wird abgelehnt');
  await anna.s.fill('#qz-vorname', 'anna');
  await anna.s.fill('#qz-initial', 'k');
  await anna.s.click('#qz-mitmachen');
  await anna.s.waitForSelector('#qz-warten');
  pruefe((await anna.s.textContent('#qz-warten h2')) === 'Hallo Anna K.!', 'Name wird als „Anna K.“ angezeigt');
  pruefe((await anna.s.locator('.qz-leitfragen li').count()) === 5, 'Wartebildschirm zeigt die 5 Leitfragen');
  const ben = await handy('Ben', 'M');
  await beitreten(ben, url, 'Ben', 'M');
  await ben.s.waitForSelector('#qz-warten');
  const doppelt = await handy('Anna2', 'K');
  await beitreten(doppelt, url, 'Anna', 'K');
  await doppelt.s.waitForSelector('.fb.show, #qz-warten');
  const doppeltText = await doppelt.s.textContent('main');
  pruefe(doppeltText.includes('schon im Rennen'), 'gleicher Name, während die Person aktiv ist → abgelehnt', doppeltText);
  await doppelt.k.close();
  await beamer.waitForFunction(() => document.querySelectorAll('.rb-bahn').length === 2);
  pruefe(true, 'Beamer zeigt 2 Bahnen');
  pruefe(!(await beamer.isVisible('#qz-leer')), 'Hinweis verschwindet, sobald jemand dabei ist');
  await ben.s.reload();
  await ben.s.waitForSelector('#qz-warten');
  pruefe((await ben.s.textContent('#qz-warten h2')) === 'Hallo Ben M.!', 'Handy neu geladen: gleiche Bahn ohne neue Anmeldung');
  await foto(anna.s, 'handy-warten');
  await foto(beamer, 'beamer-warten');

  console.log('Start mit Countdown');
  await beamer.click('#qz-haupt');
  await beamer.waitForSelector('#qz-countdown:not(.hidden)');
  pruefe(/^[1-5]$/.test(await beamer.textContent('#qz-countdown')), 'Beamer zeigt den Countdown');
  await anna.s.waitForSelector('#qz-zahl');
  pruefe(true, 'Handy zeigt den Countdown');
  await foto(beamer, 'beamer-countdown');
  await anna.s.waitForSelector('#qz-text', { timeout: 9000 });
  await ben.s.waitForSelector('#qz-text', { timeout: 9000 });
  pruefe(true, 'nach dem Countdown: erste Frage auf beiden Handys');
  await foto(anna.s, 'handy-frage');

  console.log('Zu schnell getippt');
  const erste = await anna.s.getAttribute('#qz-text', 'data-id');
  await anna.s.click(`.qz-knopf[data-k="${loesung(erste) === 'A' ? 'B' : 'A'}"]`);
  await anna.s.waitForSelector('#qz-hinweis');
  pruefe((await anna.s.textContent('#qz-hinweis')).includes('Erst lesen'), 'Tippen während der Lesezeit → „Erst lesen, dann tippen“');
  pruefe((await anna.s.getAttribute('#qz-text', 'data-id')) === erste && !(await anna.s.isVisible('#qz-falsch')), '… und zählt nicht als Antwort');

  console.log('Richtig, richtig, richtig – dann ein Fehler');
  for (let i = 0; i < 3; i++) await antworten(anna, true);
  await beamer.waitForFunction(() => [...document.querySelectorAll('.rb-status')].some((x) => x.textContent.startsWith('3 / 5')));
  pruefe(true, 'Beamer: Anna bei 3 / 5');
  pruefe((await anna.s.locator('#qz-balken i.voll').count()) === 3, 'Handy: Balken zeigt 3 von 5');
  const fehler1 = await antworten(anna, false);
  pruefe((await anna.s.textContent('.qz-falsch-titel')).includes('zurück auf 0'), 'Fehler → „zurück auf 0“');
  pruefe((await anna.s.textContent('.qz-loesung')).includes(`Richtig: `) && (await anna.s.textContent('.qz-loesung .qz-buchstabe')) === fehler1.k, 'richtige Lösung wird gezeigt');
  pruefe((await anna.s.textContent('.qz-warum')) === SET.fragen.find((f) => f.id === fehler1.id).warum, 'Begründung wird gezeigt');
  pruefe(await anna.s.isDisabled('#qz-weiter'), '„Weiter“ ist zuerst gesperrt (Zeit zum Lesen)');
  pruefe((await anna.s.locator('#qz-balken i.voll').count()) === 0, 'Handy: Balken wieder leer');
  await beamer.waitForFunction(() => [...document.querySelectorAll('.rb-bahn.sturz')].length === 1, null, { timeout: 5000 });
  const annaBahn = await bahnStatus(beamer, 'Anna K.');
  pruefe(annaBahn.status.includes('zurück auf 0') && annaBahn.breite === '0%', 'Beamer: Bahn blinkt rot, Figur zurück am Start', annaBahn);
  await foto(anna.s, 'handy-falsch');
  await foto(beamer, 'beamer-sturz');
  await anna.s.waitForSelector('#qz-weiter:not([disabled])', { timeout: 5000 });
  await anna.s.click('#qz-weiter');
  await anna.s.waitForSelector('#qz-knoepfe');
  pruefe(!(await anna.s.isVisible('#qz-falsch')), '„Weiter“ → nächste Frage');

  console.log('Dazustoßen während des Rennens');
  const cem = await handy('Cem', 'Y');
  await beitreten(cem, url, 'Cem', 'Y');
  await cem.s.waitForSelector('#qz-text', { timeout: 8000 });
  pruefe(true, 'wer später kommt, steigt sofort mit einer Frage ein');
  await beamer.waitForFunction(() => document.querySelectorAll('.rb-bahn').length === 3);
  pruefe(true, 'Beamer: neue Bahn erscheint während des Rennens');

  console.log('Ausfall und Wiedereinstieg auf einem anderen Handy');
  await antworten(ben, true);
  await antworten(ben, true);
  await ben.k.close();
  await warte(800);   // eine letzte Abfrage des alten Handys darf noch ankommen, bevor wir „eine Minute später“ spielen
  const o = raumObjekt(code);
  const benId = Object.values(o.r.spieler).find((p) => p.name === 'Ben M.').id;
  o.r.spieler[benId].zuletzt -= 70000;   // Ben war über eine Minute weg
  await beamer.waitForFunction(() => [...document.querySelectorAll('.rb-bahn.offline .rb-name')].some((x) => x.textContent === 'Ben M.'), null, { timeout: 5000 });
  pruefe(true, 'Beamer: Bahn von Ben wird blass („offline“)');
  const ben2 = await handy('Ben', 'M');
  await beitreten(ben2, url, 'ben', 'm');
  await ben2.s.waitForSelector('#qz-text, .fb.show', { timeout: 8000 });
  pruefe(await ben2.s.isVisible('#qz-text'), 'neues Handy mit gleichem Namen übernimmt die Bahn', await ben2.s.textContent('main'));
  pruefe((await ben2.s.locator('#qz-balken i.voll').count()) === 2, 'neues Handy, gleicher Name: Ben macht mit seinem Stand (2) weiter');
  await beamer.waitForFunction(() => document.querySelectorAll('.rb-bahn').length === 3 && !document.querySelector('.rb-bahn.offline'), null, { timeout: 5000 });
  pruefe(true, 'Beamer: keine doppelte Bahn, Ben wieder aktiv');

  console.log('Zieleinlauf');
  for (let i = 0; i < 5; i++) await antworten(anna, true);
  await anna.s.waitForSelector('#qz-ziel');
  pruefe((await anna.s.textContent('#qz-platz')) === 'Platz 1', 'Anna im Ziel: Platz 1');
  await beamer.waitForFunction(() => document.querySelector('.rb-toast').textContent.includes('Anna K. ist im Ziel'), null, { timeout: 5000 });
  pruefe(true, 'Beamer: Einblendung „Anna K. ist im Ziel – Platz 1!“');
  pruefe((await beamer.textContent('#rb-ziel')).includes('Anna K.'), 'Beamer: Anna in der Zielliste');
  await foto(anna.s, 'handy-ziel');
  await warte(400);
  await foto(beamer, 'beamer-ziel');
  for (let i = 0; i < 5; i++) await antworten(cem, true);
  await cem.s.waitForSelector('#qz-ziel');
  pruefe((await cem.s.textContent('#qz-platz')) === 'Platz 2', 'Cem im Ziel: Platz 2');
  await anna.s.click('#qz-ueben');
  await anna.s.waitForSelector('#qz-text');
  pruefe((await anna.s.textContent('#qz-stand')).includes('Übungsmodus'), 'nach dem Ziel: weiter üben (zählt nicht mehr)');
  await antworten(anna, false);
  await warte(1800);
  pruefe(!(await bahnStatus(beamer, 'Anna K.')).klassen.includes('sturz'), 'Fehler im Übungsmodus: Bahn bleibt im Ziel');

  console.log('Siegerehrung und häufige Fehler');
  await beamer.click('#qz-ehrung');
  await beamer.waitForSelector('#qz-ehrung-ebene .se-p1.zeigen', { timeout: 8000 });
  pruefe((await beamer.textContent('#qz-ehrung-ebene .se-p1 .se-name')).includes('Anna K.'), 'Siegerehrung: Anna auf Platz 1');
  pruefe((await beamer.textContent('#qz-ehrung-ebene .se-p2 .se-name')).includes('Cem Y.'), 'Siegerehrung: Cem auf Platz 2');
  await foto(beamer, 'beamer-siegerehrung');
  await beamer.keyboard.press('Escape');
  pruefe(!(await beamer.$('#qz-ehrung-ebene')), 'Esc schließt die Siegerehrung');
  await beamer.click('#qz-fehler-knopf');
  await beamer.waitForSelector('.qz-fehler-liste li');
  const fehlerText = await beamer.textContent('.qz-fehler-liste');
  pruefe(fehlerText.includes(SET.fragen.find((f) => f.id === fehler1.id).text), 'häufige Fehler: der falsch zugeordnete Befund steht in der Liste');
  pruefe(!(await beamer.textContent('#qz-fehler')).includes('Anna'), 'häufige Fehler sind anonym (keine Namen)');
  await foto(beamer, 'beamer-fehler');
  await beamer.click('#qz-fehler-zurueck');

  console.log('Rennen beenden, neues Rennen');
  await beamer.click('#qz-haupt');   // Rennen beenden (Rückfrage wird bestätigt)
  await ben2.s.waitForSelector('#qz-ende', { timeout: 8000 });
  pruefe((await ben2.s.textContent('#qz-ende')).includes('beste Serie'), 'Handy ohne Ziel: Ende mit bester Serie');
  await cem.s.waitForSelector('#qz-ende', { timeout: 8000 });
  pruefe((await cem.s.textContent('#qz-ende')).includes('Platz 2'), 'Handy im Ziel: Ende mit Platz');
  await foto(ben2.s, 'handy-ende');
  await beamer.click('#qz-haupt');   // neues Rennen
  await ben2.s.waitForSelector('#qz-zahl', { timeout: 8000 });
  await ben2.s.waitForSelector('#qz-text', { timeout: 9000 });
  pruefe((await ben2.s.locator('#qz-balken i.voll').count()) === 0, 'neues Rennen: alle wieder bei 0');
  await anna.s.waitForSelector('#qz-text', { timeout: 9000 });
  pruefe(!(await anna.s.textContent('#qz-stand')).includes('Übungsmodus'), 'neues Rennen: Anna ist wieder im Rennen (nicht mehr im Ziel)');

  console.log('Person entfernen, neue Klasse');
  await beamer.evaluate(() => [...document.querySelectorAll('.rb-name')].find((x) => x.textContent === 'Cem Y.').click());
  await cem.s.waitForSelector('#qz-vorname', { timeout: 8000 });
  pruefe((await cem.s.textContent('.fb.show')).includes('nicht mehr im Rennen'), 'entfernte Person sieht die Namenseingabe mit Hinweis');
  await beamer.waitForFunction(() => document.querySelectorAll('.rb-bahn').length === 2);
  pruefe(true, 'Beamer: Bahn entfernt');
  await beamer.click('#qz-neue-klasse');
  await beamer.waitForFunction((alt) => document.querySelector('#qz-code') && document.querySelector('#qz-code').textContent !== alt, code);
  pruefe((await beamer.locator('.rb-bahn').count()) === 0, 'neue Klasse: neuer Code, keine Bahnen');
  await anna.s.waitForSelector('text=Dieses Rennen gibt es nicht mehr', { timeout: 8000 });
  pruefe(true, 'altes Handy: „Dieses Rennen gibt es nicht mehr“');
  pruefe(!raumObjekt(code).r, 'alter Raum ist gelöscht');

  console.log('Kleines Handy');
  const klein = await handy('Dana', 'D', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  const neuUrl = await beamer.getAttribute('#qz-qr-bild', 'data-url');
  await beitreten(klein, neuUrl, 'Dana', 'D');
  await klein.s.waitForSelector('#qz-warten');

  console.log('Zeitlimit');
  pruefe(zeitLimit('Puls 128/min') === 3000 && zeitLimit('Blutzucker 45 mg/dl') === 3000, 'kurze Befunde: 3 Sekunden');
  pruefe(zeitLimit('Die Zahnprothese hat sich gelöst und liegt im Rachen.') === 5600, 'langer Satz: mehr Zeit (5,6 s)');
  await beamer.selectOption('#qz-zeit', 'an');
  await beamer.waitForFunction(() => document.querySelector('.rb-unter').textContent.includes('zu langsam'));
  await klein.s.waitForFunction(() => document.querySelector('#qz-warten') && document.body.textContent.includes('Schnell sein'), null, { timeout: 6000 });
  pruefe(true, 'Wartebildschirm nennt das Zeitlimit, sobald es am Beamer an ist');
  await beamer.click('#qz-haupt');
  await klein.s.waitForSelector('#qz-text', { timeout: 9000 });
  const unten = await klein.s.evaluate(() => document.querySelector('.qz-knopf[data-k="E"]').getBoundingClientRect().bottom);
  pruefe(unten <= 640, 'kleines Handy (360×640): alle 5 Knöpfe und Zeitbalken ohne Scrollen sichtbar', unten);
  const zeitId = await klein.s.getAttribute('#qz-text', 'data-id');
  const soll = zeitLimit(SET.fragen.find((f) => f.id === zeitId).text);
  pruefe((await klein.s.getAttribute('#qz-zeit', 'data-ms')) === String(soll), `Zeitbalken passt zur Textlänge (${soll / 1000} s)`);
  await foto(klein.s, 'handy-klein-frage');
  const vorher = Date.now();
  await klein.s.waitForSelector('#qz-falsch', { timeout: soll + 4000 });
  const dauerMs = Date.now() - vorher;
  pruefe(dauerMs >= soll - 400, `nichts getippt → nach Ablauf der Zeit (${(dauerMs / 1000).toFixed(1)} s) …`);
  pruefe((await klein.s.textContent('.qz-falsch-titel')).includes('Zu langsam – zurück auf 0'), '… „Zu langsam – zurück auf 0!“ mit Lösung',
    await klein.s.textContent('#qz-falsch'));
  pruefe((await klein.s.textContent('.qz-loesung .qz-buchstabe')) === loesung(zeitId), 'richtige Lösung wird gezeigt');
  await beamer.waitForFunction(() => [...document.querySelectorAll('.rb-status')].some((x) => x.textContent.includes('zu langsam')), null, { timeout: 5000 });
  pruefe(true, 'Beamer: „⏱ zu langsam → 0“ auf der Bahn');
  await foto(klein.s, 'handy-klein-zu-langsam');
  await foto(beamer, 'beamer-zu-langsam');
  await klein.s.waitForSelector('#qz-weiter:not([disabled])', { timeout: 5000 });
  await klein.s.click('#qz-weiter');
  await antworten(klein, true);
  pruefe(true, 'mit Zeitlimit: rechtzeitig richtig getippt → weiter');
  await antworten(klein, false);
  await foto(klein.s, 'handy-klein-falsch');
  await beamer.click('#qz-fehler-knopf');
  await beamer.waitForSelector('.qz-fehler-liste li');
  pruefe((await beamer.textContent('#qz-fehler')).includes('zu langsam'), 'häufige Fehler zählen „zu langsam“ getrennt');
  await beamer.click('#qz-fehler-zurueck');
  const bk2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const beamer2 = await bk2.newPage();
  beobachten(beamer2, protokoll, 'beamer-720');
  await beamer2.goto(basis + 'quiz-rennen/beamer/');
  await beamer2.waitForSelector('#qz-code');
  const passt = await beamer2.evaluate(() => { const r = document.querySelector('.rb-knoepfe').getBoundingClientRect(); return r.bottom <= window.innerHeight; });
  pruefe(passt, 'Beamer 1280×720: alles sichtbar ohne Scrollen');
  await foto(beamer2, 'beamer-720');

  pruefe(protokoll.konsole.length === 0, 'keine JavaScript-Fehler', protokoll.konsole);
  pruefe(protokoll.extern.length === 0, 'keine Anfragen an fremde Adressen', protokoll.extern);
} catch (e) {
  console.error(e);
  pruefe(false, 'Test abgebrochen: ' + e.message);
} finally {
  await browser.close();
  server.close();
  w.beenden();
}
process.exit(ergebnis() ? 0 : 1);
