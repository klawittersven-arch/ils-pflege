/* Ende-zu-Ende-Test: Klassenliste importieren → SuS melden sich an → Übungen → Abschluss →
 * Lehrkraft-Tabelle, „Wer fehlt noch?“, CSV, Haken von Hand, Offline-Nachreichen, Sperren.
 * Alle Namen und Geburtstage hier sind erfunden.
 * Start:  (cd worker && npm install)  dann  node tests/ablauf.test.js   (Bildschirmfotos: BILDER=/pfad) */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL } = require('./hilfen');

const PASSWORT = 'test-passwort-123';
const BILDER = process.env.BILDER || '';
const LISTE = [
  'Klasse;Name;Geburtsdatum',
  '3BFP2/1;Lena M.;05.09.2004',
  '3BFP2/1;Mohamed A.;01.02.2003',
  '3BFP2/1;Maria K.;05.09.2004',
  '3BFP2/1;Jonas T.;17.03.2005',
  '3BFP2/2;Anna Maria S.;31.12.2003',
  '3BFP2/2;Kaputt;31.02.2003'
].join('\n');


async function foto(seite, name) {
  if (BILDER) await seite.screenshot({ path: path.join(BILDER, name + '.png'), fullPage: true });
}

async function anmelden(seite, klasse, vorname, t, m, j) {
  await seite.locator('.wahl', { hasText: klasse }).click();
  await seite.fill('#konto-vn', vorname);
  await seite.fill('#konto-tag', t);
  await seite.fill('#konto-monat', m);
  await seite.fill('#konto-jahr', j);
  await seite.click('#konto-anmelden');
}

/* ---------- Lernmodus: Hilfen (Uhr wird im Test vorgespult, damit die Lesezeit-Kontrolle greift) ---------- */
async function lesen(s) { await s.clock.fastForward(15000); }
async function weiterKlicken(s) {
  await s.waitForSelector('#lern-weiter:not(.hidden)');
  await s.clock.fastForward(5000);
  await s.click('#lern-weiter');
}
const typ = (s) => s.getAttribute('.lern-karte', 'data-typ');

// Probe-Übung 1: wahl, rf (+Begründung), mehrfach, zahl, luecke
async function probe1(s) {
  await s.click('#lern-los');
  await lesen(s); await s.click('.antwort:has-text("Redon-Drainage")'); await weiterKlicken(s);
  await lesen(s); await s.click('.lern-optionen.zwei .antwort:has-text("Richtig")');
  await lesen(s); await s.click('.antwort:has-text("kein ausreichender Sog")'); await weiterKlicken(s);
  await lesen(s); await s.click('.antwort:has-text("Uhrzeit")'); await s.click('.antwort:has-text("Fördermenge der entfernten")');
  await s.click('.lern-pruefen'); await weiterKlicken(s);
  await lesen(s); await s.fill('.lern-zahl', '150'); await s.click('.lern-zahlzeile button'); await weiterKlicken(s);
  await lesen(s); await s.click('.chip:has-text("aktive")'); await s.click('.chip:has-text("passive")'); await weiterKlicken(s);
}

const SORT = { Redon: 'aktiv', Robinson: 'passiv', 'Easy-Flow': 'passiv' };
// Probe-Übung 2 (ohne Fehler): reihe, sortieren, bild, dialog
async function probe2(s) {
  await lesen(s);
  for (const t of ['Anmelden', 'Infotext lesen', 'Übung lösen', 'Abschlussquiz machen']) await s.click(`.order-pool .order-item:has-text("${t}")`);
  await weiterKlicken(s);
  await lesen(s);
  for (let i = 0; i < 3; i++) {
    const t = (await s.textContent('.sort-text')).trim();
    await s.click(`.sort-knopf:has-text("${SORT[t]}")`);
    await s.clock.fastForward(3000);
  }
  await weiterKlicken(s);
  await lesen(s); await s.locator('[data-ziel="anzeige"] .feld').click();
  await lesen(s); await s.locator('[data-ziel="klemme"] .feld').click();
  await weiterKlicken(s);
  await lesen(s); await s.click('.antwort:has-text("Nein, wir befestigen")');
  await lesen(s); await s.click('.antwort:has-text("klingeln Sie bitte sofort")');
  await weiterKlicken(s);
}

const QUIZ = { 'Die Lehrkraft sieht': 'Richtig', 'einzelnen Antworten': 'Falsch', 'Ohne Internet': 'Falsch', 'auf jedem Gerät': 'Richtig', 'zu schnell tippt': 'Richtig' };

(async () => {
  const worker = await workerStarten(8790 + Math.floor(Math.random() * 100), PASSWORT);
  const { server, basis } = await serverStarten(worker.url);
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  try {
    /* ---------- Lehrkraft: Anmeldung und Import ---------- */
    console.log('Lehrkraft: Anmeldung und Klassenliste');
    const lkKontext = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
    const lk = await lkKontext.newPage();
    beobachten(lk, protokoll, 'lehrkraft');
    lk.on('dialog', (d) => d.accept());
    await lk.goto(basis + 'lehrkraft/');
    await lk.fill('#lk-pw', 'falsch');
    await lk.click('text=Anmelden');
    await lk.waitForSelector('.fb.show.bad');
    pruefe(/falsch/.test(await lk.textContent('.fb.show.bad')), 'falsches Passwort wird abgelehnt');
    await lk.fill('#lk-pw', PASSWORT);
    await lk.click('text=Anmelden');
    await lk.waitForSelector('#lk-haupt');
    pruefe(/Noch keine Klassenliste/.test(await lk.textContent('#lk-tabelle')), 'Hinweis bei leerer Klassenliste');
    await lk.click('#lk-verwaltung summary');
    await lk.fill('#lk-import', LISTE);
    await lk.click('#lk-import-knopf');
    await lk.waitForSelector('#lk-verwaltung .fb.show');
    const importText = await lk.textContent('#lk-verwaltung .fb.show');
    pruefe(/5 neu eingetragen/.test(importText) && /Zeile 7/.test(importText), 'Import: 5 Personen, fehlerhafte Zeile gemeldet', importText);
    pruefe((await lk.inputValue('#lk-import')) !== '', 'Liste bleibt bei Fehlern zum Korrigieren stehen');
    await lk.waitForSelector('table.lk');
    pruefe((await lk.locator('table.lk tbody tr').count()) === 5, 'Tabelle zeigt 5 Personen');

    /* ---------- SuS 1: Anmeldung am Handy ---------- */
    console.log('SuS: Anmeldung');
    const susKontext = await browser.newContext(MOBIL);
    await susKontext.clock.install();
    const sus = await susKontext.newPage();
    beobachten(sus, protokoll, 'sus');
    sus.on('dialog', (d) => d.accept());
    await sus.goto(basis + 'probe/');
    await sus.waitForSelector('.wahl');
    pruefe((await sus.locator('.wahl').count()) === 2, 'zwei Klassen zur Auswahl');
    await foto(sus, '1_anmeldung_handy');
    await anmelden(sus, '3BFP2/1', 'Lena', '06', '09', '2004');
    await sus.waitForSelector('.konto-karte .fb.show.bad');
    pruefe(/nicht in der Klassenliste/.test(await sus.textContent('.konto-karte .fb.show')), 'falscher Geburtstag wird abgelehnt');
    await sus.fill('#konto-tag', '31'); await sus.fill('#konto-monat', '02');
    await sus.click('#konto-anmelden');
    pruefe(/Geburtstag/.test(await sus.textContent('.konto-karte .fb.show')), 'unmögliches Datum wird schon am Handy abgefangen');
    await sus.fill('#konto-tag', '5'); await sus.fill('#konto-monat', '9');
    await sus.click('#konto-anmelden');
    await sus.waitForSelector('.konto-leiste strong');
    pruefe((await sus.textContent('.konto-leiste strong')) === 'Lena M.', 'Anmeldung mit 5.9.2004 klappt (Lena M.)');
    pruefe(/0 von 3 erledigt/.test(await sus.textContent('.fortschritt')), 'Übersicht: 0 von 3 erledigt');
    pruefe(/🔒/.test(await sus.textContent('.schritte-liste')), 'Abschlussquiz zuerst gesperrt');
    await foto(sus, '2_uebersicht_handy');

    console.log('SuS: Lernmodus Übung 1 (Tempo-Kontrolle, alle Typen)');
    await sus.goto(basis + 'probe/1/');
    await sus.waitForSelector('#lern-los');
    pruefe(/Lesen Sie zuerst/.test(await sus.textContent('.lern-start')), 'Startkarte verweist auf das Arbeitsblatt');
    await sus.click('#lern-los');
    await sus.click('.antwort:has-text("Redon-Drainage")');   // sofort – zu schnell
    pruefe(/Langsam/.test(await sus.textContent('.lern-hinweis')), 'zu schnelles Tippen wird nicht gewertet („Langsam!“)');
    pruefe((await sus.locator('.antwort.richtig').count()) === 0, 'zu schnelle Antwort wird nicht ausgewertet');
    await sus.goto(basis + 'probe/1/');                         // zurück zum Start: Durchgang läuft weiter
    await sus.waitForSelector('.lern-karte');
    pruefe((await typ(sus)) === 'wahl', 'nach Neuladen: dieselbe Aufgabe (Zwischenstand)');
    await lesen(sus); await sus.click('.antwort:has-text("Redon-Drainage")'); await weiterKlicken(sus);
    await lesen(sus); await sus.click('.lern-optionen.zwei .antwort:has-text("Richtig")');
    await lesen(sus); await sus.click('.antwort:has-text("kein ausreichender Sog")'); await weiterKlicken(sus);
    await lesen(sus); await sus.click('.antwort:has-text("Uhrzeit")'); await sus.click('.antwort:has-text("Fördermenge der entfernten")');
    await sus.click('.lern-pruefen'); await weiterKlicken(sus);
    await lesen(sus); await sus.fill('.lern-zahl', '150'); await sus.click('.lern-zahlzeile button'); await weiterKlicken(sus);
    await lesen(sus); await sus.click('.chip:has-text("aktive")'); await sus.click('.chip:has-text("passive")');
    await foto(sus, '3_uebung_luecke_handy');
    await weiterKlicken(sus);
    await sus.waitForSelector('.lern-fertig .meldung.ok');
    pruefe(/5 von 5/.test(await sus.textContent('.lern-fertig')), 'Übung 1 geschafft: 5 von 5 ohne Fehler, eingetragen');

    console.log('SuS: Abschluss gesperrt (Seite und Server)');
    await sus.goto(basis + 'probe/abschluss/');
    await sus.waitForSelector('.card.gesperrt');
    pruefe(/Zweite Probe/.test(await sus.textContent('.card.gesperrt')), 'Abschluss gesperrt, Übung 2 fehlt');
    const tokenLena = await sus.evaluate(() => JSON.parse(localStorage.getItem('ils-konto')).token);
    const direkt = await fetch(worker.url + '/api/melden', { method: 'POST', headers: { Authorization: 'Bearer ' + tokenLena },
      body: JSON.stringify({ ils: 'probe', schritt: 'quiz', punkte: 4, max: 4 }) });
    pruefe(direkt.status === 409, 'Server lehnt Abschluss ohne alle Übungen ab (auch direkt per API)', direkt.status);
    const fremd = await fetch(worker.url + '/api/melden', { method: 'POST', headers: { Authorization: 'Bearer ' + tokenLena },
      body: JSON.stringify({ ils: 'probe', schritt: 'gibtsnicht', punkte: 1, max: 1 }) });
    pruefe(fremd.status === 400, 'Server lehnt unbekannte Schritte ab', fremd.status);

    console.log('SuS: Übung 2 (Fehlerbudget, Lesepause, Neustart, Schreibaufgabe)');
    await sus.goto(basis + 'probe/2/');
    await sus.waitForSelector('#lern-los');
    await sus.click('#lern-los');
    await lesen(sus);
    await sus.click('.order-pool .order-item:has-text("Abschlussquiz machen")');   // falsch → 1 Fehler
    pruefe(/nächste Schritt/.test(await sus.textContent('.lern-hinweis')), 'Reihenfolge: falscher Schritt = Fehler');
    for (const t of ['Anmelden', 'Infotext lesen', 'Übung lösen', 'Abschlussquiz machen']) await sus.click(`.order-pool .order-item:has-text("${t}")`);
    await weiterKlicken(sus);
    await sus.reload();
    await sus.waitForSelector('.lern-karte');
    pruefe((await typ(sus)) === 'sortieren' && (await sus.textContent('.herzen')).split('❤️').length - 1 === 3, 'nach Neuladen: nächste Aufgabe, Fehler bleiben gezählt (3 ❤️ übrig)');
    await lesen(sus);
    for (let i = 0; i < 4; i++) {   // vier falsche Zuordnungen → 5. Fehler insgesamt → Lesepause
      const t = (await sus.textContent('.sort-text')).trim();
      await sus.click(`.sort-knopf:has-text("${SORT[t] === 'aktiv' ? 'passiv' : 'aktiv'}")`);
    }
    await sus.waitForSelector('#lern-neustart');
    pruefe(/Zu viele Fehler/.test(await sus.textContent('.lern-start')) && await sus.isDisabled('#lern-neustart'), 'zu viele Fehler → Lesepause, Neustart gesperrt');
    await foto(sus, '4_lesepause_handy');
    await sus.reload();
    await sus.waitForSelector('#lern-neustart');
    pruefe(await sus.isDisabled('#lern-neustart'), 'Lesepause übersteht Neuladen');
    await sus.clock.fastForward(20000);
    pruefe(await sus.isDisabled('#lern-neustart'), 'nach 20 s noch Lesepause');
    await sus.clock.fastForward(11000);
    await sus.waitForSelector('#lern-neustart:not([disabled])');
    pruefe(true, 'nach 30 s ist die Lesepause vorbei');
    await sus.click('#lern-neustart');
    await sus.waitForSelector('.lern-karte');
    pruefe(/Aufgabe 1 von 4/.test(await sus.textContent('.lern-kopf')), 'nach der Pause: neuer Durchgang von vorn');
    await probe2(sus);
    await sus.waitForSelector('#lern-geschrieben');
    pruefe(await sus.isDisabled('#lern-geschrieben'), 'Schreibaufgabe: „aufgeschrieben“ erst nach Mindestzeit');
    await foto(sus, '5_schreibaufgabe_handy');
    await sus.clock.fastForward(21000);
    await sus.waitForSelector('#lern-geschrieben:not([disabled])');
    await sus.click('#lern-geschrieben');
    await sus.check('#lern-p0'); await sus.check('#lern-p1');
    await sus.click('#lern-verglichen');
    await sus.waitForSelector('.lern-fertig .meldung.ok');
    pruefe(/2 von 4 Punkten/.test(await sus.textContent('.lern-fertig')) && /ILS%20Probe/.test(await sus.getAttribute('.lern-fertig a[href^="mailto"]', 'href')),
      'Selbstkontrolle 2/4, Hinweis Eigenverantwortung + E-Mail mit Betreff');
    await foto(sus, '6_fertig_handy');

    console.log('SuS: Abschlussquiz (Tempo-Pause ohne Neustart)');
    await sus.goto(basis + 'probe/abschluss/');
    await sus.waitForSelector('#lern-los');
    await sus.click('#lern-los');
    await sus.waitForSelector('.lern-aussage');
    const ersteAussage = await sus.textContent('.lern-aussage');
    for (let i = 0; i < 3; i++) await sus.click('.lern-optionen.zwei .antwort >> nth=0');   // 3× zu schnell
    await sus.waitForSelector('#lern-fortsetzen');
    pruefe(/Zu schnell/.test(await sus.textContent('.lern-start')) && /derselben Aufgabe/.test(await sus.textContent('.lern-start')) &&
      await sus.isDisabled('#lern-fortsetzen'), '3× zu schnell → Lesepause, danach dieselbe Aufgabe');
    await foto(sus, '7_zu_schnell_handy');
    await sus.clock.fastForward(10000);
    pruefe(await sus.isDisabled('#lern-fortsetzen'), 'Tempo-Pause: nach 10 s noch gesperrt');
    await sus.clock.fastForward(6000);   // Tempo-Pause 15 s
    await sus.waitForSelector('#lern-fortsetzen:not([disabled])');
    await sus.click('#lern-fortsetzen');
    await sus.waitForSelector('.lern-aussage');
    pruefe((await sus.textContent('.lern-aussage')) === ersteAussage && /Aufgabe 1 von 4/.test(await sus.textContent('.lern-kopf')),
      'nach 15 s: weiter mit derselben Aufgabe (kein Neustart, auch im Abschlussquiz)');
    for (let i = 0; i < 4; i++) {
      await sus.waitForSelector('.lern-aussage');
      const aussage = await sus.textContent('.lern-aussage');
      const schl = Object.keys(QUIZ).find((k) => aussage.includes(k));
      await lesen(sus);
      await sus.click(`.lern-optionen.zwei .antwort:has-text("${QUIZ[schl]}")`);
      await weiterKlicken(sus);
    }
    await sus.waitForSelector('.lern-fertig .meldung.ok');
    pruefe(/abgeschlossen/.test(await sus.textContent('.lern-fertig')), 'Abschlussquiz bestanden: „ILS-Auftrag abgeschlossen“');
    await sus.goto(basis + 'probe/');
    await sus.waitForSelector('.card.erledigt');
    pruefe(/3 von 3 erledigt/.test(await sus.textContent('.fortschritt')), 'Übersicht: 3 von 3 erledigt');
    await foto(sus, '7_uebersicht_fertig_handy');

    /* ---------- SuS 2: Schreibvariante + offline ---------- */
    console.log('SuS 2: Schreibvariante und offline');
    const sus2Kontext = await browser.newContext(MOBIL);
    await sus2Kontext.clock.install();
    const sus2 = await sus2Kontext.newPage();
    beobachten(sus2, protokoll, 'sus2');
    await sus2.goto(basis + 'probe/1/');
    await sus2.waitForSelector('.wahl');
    await anmelden(sus2, '3BFP2/1', 'Mohammed', '01', '02', '2003');
    await sus2.waitForSelector('.konto-leiste strong');
    pruefe((await sus2.textContent('.konto-leiste strong')) === 'Mohamed A.', '„Mohammed“ findet „Mohamed A.“');
    await sus2.waitForSelector('#lern-los');
    await sus2Kontext.setOffline(true);
    await probe1(sus2);
    await sus2.waitForSelector('.lern-fertig .meldung.hint');
    pruefe(/Noch nicht übertragen/.test(await sus2.textContent('.lern-fertig .meldung')), 'offline: „Noch nicht übertragen“');
    await sus2Kontext.setOffline(false);
    await sus2.evaluate(() => window.dispatchEvent(new Event('online')));
    await sus2.waitForSelector('.lern-fertig .meldung.ok', { timeout: 10000 });
    pruefe(true, 'wieder online: automatisch nachgereicht');

    /* ---------- Lehrkraft: Tabelle ---------- */
    console.log('Lehrkraft: Übersicht');
    await lk.click('text=Aktualisieren');
    await lk.waitForFunction(() => /abgeschlossen/.test(document.querySelector('#lk-tabelle')?.textContent || ''));
    const zeileLena = lk.locator('table.lk tbody tr', { hasText: 'Lena M.' });
    pruefe(/✓ abgeschlossen/.test(await zeileLena.textContent()), 'Lena M.: ✓ abgeschlossen');
    pruefe(/4\/4/.test(await zeileLena.textContent()), 'Quiz-Punkte stehen in der Tabelle (4/4)');
    const zelleU2 = await zeileLena.locator('td.zelle').nth(1).textContent();
    pruefe(/⚠1/.test(zelleU2) && /✍2\/4/.test(zelleU2), 'Tabelle Ü2: ⚠1 Neustart und ✍2/4 Selbstkontrolle', zelleU2);
    const zelleQuiz = await zeileLena.locator('td.zelle').nth(2).textContent();
    pruefe(/⏳3/.test(zelleQuiz) && !/⚠/.test(zelleQuiz), 'Tabelle Quiz: ⏳3 (dreimal zu schnell), kein Neustart', zelleQuiz);
    const zeileMo = lk.locator('table.lk tbody tr', { hasText: 'Mohamed A.' });
    pruefe(/1 von 3/.test(await zeileMo.textContent()), 'Mohamed A.: 1 von 3 (offline nachgereicht)');
    pruefe(/nie angemeldet/.test(await lk.locator('table.lk tbody tr', { hasText: 'Jonas T.' }).textContent()), 'Jonas T.: nie angemeldet');
    pruefe(/1 von 4 abgeschlossen/.test(await lk.textContent('#lk-zusammenfassung')), 'Zusammenfassung 3BFP2/1: 1 von 4 abgeschlossen');
    // Haken von Hand
    await zeileMo.locator('td.zelle').nth(1).locator('button').click();
    await lk.waitForFunction(() => /✓ Hand/.test(document.querySelector('#lk-tabelle')?.textContent || ''));
    pruefe(/2 von 3/.test(await lk.locator('table.lk tbody tr', { hasText: 'Mohamed A.' }).textContent()), 'Haken von Hand: Mohamed A. jetzt 2 von 3');
    await foto(lk, '8_lehrkraft_tabelle');
    // Wer fehlt noch?
    await lk.click('#lk-wer-fehlt');
    const fehlt = await lk.inputValue('#lk-fehlt-text');
    pruefe(/Mohamed A\./.test(fehlt) && /Jonas T\./.test(fehlt) && /Anna Maria S\./.test(fehlt) && !/Lena M\./.test(fehlt), '„Wer fehlt noch?“ listet die richtigen Namen', fehlt);
    await foto(lk, '9_lehrkraft_wer_fehlt');
    // CSV
    const [download] = await Promise.all([lk.waitForEvent('download'), lk.click('#lk-csv')]);
    const csv = fs.readFileSync(await download.path(), 'utf8');
    pruefe(csv.charCodeAt(0) === 0xfeff && /Klasse;Name;Übung 1: Erste Probe/.test(csv) && /3BFP2\/1;Lena M\.;.*;ja/.test(csv) && /Neustarts: 1/.test(csv), 'CSV für Excel (BOM, Semikolon, Inhalt, Neustarts)');
    // Klasse filtern
    await lk.selectOption('#lk-klasse', '3BFP2/2');
    pruefe((await lk.locator('table.lk tbody tr').count()) === 1, 'Filter Klasse 3BFP2/2: 1 Person');
    await lk.selectOption('#lk-klasse', '');

    /* ---------- Geräte abmelden ---------- */
    console.log('Lehrkraft: Gerät abmelden, Person löschen');
    const sidMo = await lk.locator('#lk-person option', { hasText: 'Mohamed A.' }).getAttribute('value');
    await lk.selectOption('#lk-person', sidMo);
    await lk.click('text=Alle Geräte abmelden');
    await lk.waitForFunction(() => /abgemeldet/.test(document.querySelector('#lk-verwaltung')?.textContent || ''));
    await sus2.goto(basis + 'probe/');
    await sus2.waitForSelector('.konto-karte');
    pruefe(true, 'abgemeldetes Handy muss sich neu anmelden');
    const sidJonas = await lk.locator('#lk-person option', { hasText: 'Jonas T.' }).getAttribute('value');
    await lk.selectOption('#lk-person', sidJonas);
    await lk.click('text=Person löschen');
    await lk.waitForFunction(() => document.querySelectorAll('table.lk tbody tr').length === 4);
    pruefe(true, 'Person gelöscht (4 Zeilen)');

    /* ---------- Sperre nach vielen Fehlversuchen ---------- */
    console.log('Sperren');
    let letzte;
    for (let i = 0; i < 41; i++) {
      letzte = await fetch(worker.url + '/api/anmelden', { method: 'POST', body: JSON.stringify({ klasse: '3BFP2/2', vorname: 'Anna', geburtstag: `1990-01-${String((i % 28) + 1).padStart(2, '0')}` }) });
    }
    pruefe(letzte.status === 429, 'nach 40 Fehlversuchen ist die Klasse 10 Minuten gesperrt', letzte.status);
    const andere = await fetch(worker.url + '/api/anmelden', { method: 'POST', body: JSON.stringify({ klasse: '3BFP2/1', vorname: 'Maria', geburtstag: '2004-09-05' }) });
    pruefe(andere.status === 200 && (await andere.json()).name === 'Maria K.', 'andere Klasse nicht betroffen; gleicher Geburtstag → richtige Person über Vornamen');
    const ohnePw = await fetch(worker.url + '/api/lehrkraft/stand');
    pruefe(ohnePw.status === 401, 'Lehrkraft-Daten ohne Passwort: 401');
    const sus2Stand = await fetch(worker.url + '/api/ich', { headers: { Authorization: 'Bearer ' + 'x'.repeat(32) } });
    pruefe(sus2Stand.status === 401, 'fremder/erfundener Schlüssel: 401');

    /* ---------- Alles löschen ---------- */
    await lk.fill('#lk-alles', 'ALLES LÖSCHEN');
    await lk.click('button:has-text("Alles löschen")');
    await lk.waitForFunction(() => /Noch keine Klassenliste/.test(document.querySelector('#lk-tabelle')?.textContent || ''));
    pruefe(true, 'Alles löschen: Tabelle leer');

    /* ---------- alte Aufträge (DK/SPK) unverändert ---------- */
    console.log('Alte ILS-Seiten');
    const alt = await susKontext.newPage();
    beobachten(alt, protokoll, 'dk');
    await alt.goto(basis + 'dk/1/');
    await alt.waitForSelector('button:has-text("Auswerten")');
    pruefe(!(await alt.locator('.konto').count()), 'DK-Übung 1 lädt wie bisher (ohne Anmeldung)');

    pruefe(protokoll.konsole.length === 0, 'keine JavaScript-Fehler', protokoll.konsole);
    pruefe(protokoll.extern.length === 0, 'keine Anfragen an fremde Adressen', protokoll.extern);
  } catch (e) {
    console.error(e);
    pruefe(false, 'Test abgebrochen: ' + e.message);
  } finally {
    await browser.close();
    server.close();
    worker.beenden();
  }
  process.exit(ergebnis() ? 0 : 1);
})();
