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

const ANTWORTEN = {   // Abschlussquiz des Probe-Auftrags (Wahr/Falsch)
  'Die Lehrkraft sieht': 'true', 'einzelnen Antworten': 'false', 'Ohne Internet': 'false', 'auf jedem Gerät': 'true'
};

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

async function uebung1(seite) {
  await seite.locator('.card', { hasText: 'Redon-Drainage' }).locator('label', { hasText: 'Richtig' }).click();
  await seite.locator('.card', { hasText: 'Wie viele Übungen' }).locator('label', { hasText: 'Zwei' }).click();
  await seite.click('button:has-text("Auswerten")');
}

async function uebung2(seite) {
  for (const schritt of ['Anmelden', 'Infotext lesen', 'Übung lösen', 'Abschlussquiz machen']) {
    await seite.locator('.order-pool .order-item', { hasText: schritt }).click();
  }
  await seite.click('button:has-text("Auswerten")');
}

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

    console.log('SuS: Übungen und Abschluss');
    await sus.goto(basis + 'probe/1/');
    await sus.waitForSelector('button:has-text("Auswerten")');
    await uebung1(sus);
    await sus.waitForSelector('.meldung.ok');
    pruefe(/eingetragen/.test(await sus.textContent('.meldung')), 'Übung 1: „Bei Ihrer Lehrkraft eingetragen“');
    await foto(sus, '3_uebung_bestanden_handy');
    await sus.goto(basis + 'probe/abschluss/');
    await sus.waitForSelector('.card.gesperrt');
    pruefe(/Zweite Probe/.test(await sus.textContent('.card.gesperrt')), 'Abschluss gesperrt, Übung 2 fehlt');
    await sus.goto(basis + 'probe/1/');
    await sus.waitForSelector('.card.erledigt');
    pruefe(/schon erledigt/.test(await sus.textContent('.card.erledigt')), 'Übung 1 zeigt „schon erledigt“');
    await sus.goto(basis + 'probe/2/');
    await sus.waitForSelector('.order-pool');
    await uebung2(sus);
    await sus.waitForSelector('.meldung.ok');
    pruefe(true, 'Übung 2 bestanden und eingetragen');
    await sus.goto(basis + 'probe/abschluss/');
    await sus.waitForSelector('button:has-text("Auswerten")');
    // erst absichtlich falsch → „Neue Fragen“
    for (const karte of await sus.locator('#app .card:has(.opts)').all()) await karte.locator('label', { hasText: 'Falsch' }).click();
    await sus.click('button:has-text("Auswerten")');
    await sus.waitForSelector('text=Neue Fragen');
    pruefe(true, 'nicht bestanden → „Neue Fragen“');
    await sus.click('text=Neue Fragen');
    for (const karte of await sus.locator('#app .card:has(.opts)').all()) {
      const text = await karte.textContent();
      const schl = Object.keys(ANTWORTEN).find((k) => text.includes(k));
      await karte.locator(`input[value="${ANTWORTEN[schl]}"]`).check({ force: true });
    }
    await sus.click('button:has-text("Auswerten")');
    await sus.waitForSelector('.meldung.ok');
    pruefe(/abgeschlossen/.test(await sus.textContent('.geschafft')), 'Abschlussquiz bestanden: „ILS-Auftrag abgeschlossen“');
    await sus.goto(basis + 'probe/');
    await sus.waitForSelector('.card.erledigt');
    pruefe(/3 von 3 erledigt/.test(await sus.textContent('.fortschritt')), 'Übersicht: 3 von 3 erledigt');
    await foto(sus, '4_uebersicht_fertig_handy');

    /* ---------- SuS 2: Schreibvariante + offline ---------- */
    console.log('SuS 2: Schreibvariante und offline');
    const sus2Kontext = await browser.newContext(MOBIL);
    const sus2 = await sus2Kontext.newPage();
    beobachten(sus2, protokoll, 'sus2');
    await sus2.goto(basis + 'probe/1/');
    await sus2.waitForSelector('.wahl');
    await anmelden(sus2, '3BFP2/1', 'Mohammed', '01', '02', '2003');
    await sus2.waitForSelector('.konto-leiste strong');
    pruefe((await sus2.textContent('.konto-leiste strong')) === 'Mohamed A.', '„Mohammed“ findet „Mohamed A.“');
    await sus2Kontext.setOffline(true);
    await uebung1(sus2);
    await sus2.waitForSelector('.meldung.hint');
    pruefe(/Noch nicht übertragen/.test(await sus2.textContent('.meldung')), 'offline: „Noch nicht übertragen“');
    await sus2Kontext.setOffline(false);
    await sus2.evaluate(() => window.dispatchEvent(new Event('online')));
    await sus2.waitForSelector('.meldung.ok', { timeout: 10000 });
    pruefe(true, 'wieder online: automatisch nachgereicht');

    /* ---------- Lehrkraft: Tabelle ---------- */
    console.log('Lehrkraft: Übersicht');
    await lk.click('text=Aktualisieren');
    await lk.waitForFunction(() => /abgeschlossen/.test(document.querySelector('#lk-tabelle')?.textContent || ''));
    const zeileLena = lk.locator('table.lk tbody tr', { hasText: 'Lena M.' });
    pruefe(/✓ abgeschlossen/.test(await zeileLena.textContent()), 'Lena M.: ✓ abgeschlossen');
    pruefe(/4\/4/.test(await zeileLena.textContent()), 'Quiz-Punkte stehen in der Tabelle (4/4)');
    const zeileMo = lk.locator('table.lk tbody tr', { hasText: 'Mohamed A.' });
    pruefe(/1 von 3/.test(await zeileMo.textContent()), 'Mohamed A.: 1 von 3 (offline nachgereicht)');
    pruefe(/nie angemeldet/.test(await lk.locator('table.lk tbody tr', { hasText: 'Jonas T.' }).textContent()), 'Jonas T.: nie angemeldet');
    pruefe(/1 von 4 abgeschlossen/.test(await lk.textContent('#lk-zusammenfassung')), 'Zusammenfassung 3BFP2/1: 1 von 4 abgeschlossen');
    // Haken von Hand
    await zeileMo.locator('td.zelle').nth(1).locator('button').click();
    await lk.waitForFunction(() => /✓ Hand/.test(document.querySelector('#lk-tabelle')?.textContent || ''));
    pruefe(/2 von 3/.test(await lk.locator('table.lk tbody tr', { hasText: 'Mohamed A.' }).textContent()), 'Haken von Hand: Mohamed A. jetzt 2 von 3');
    await foto(lk, '5_lehrkraft_tabelle');
    // Wer fehlt noch?
    await lk.click('#lk-wer-fehlt');
    const fehlt = await lk.inputValue('#lk-fehlt-text');
    pruefe(/Mohamed A\./.test(fehlt) && /Jonas T\./.test(fehlt) && /Anna Maria S\./.test(fehlt) && !/Lena M\./.test(fehlt), '„Wer fehlt noch?“ listet die richtigen Namen', fehlt);
    await foto(lk, '6_lehrkraft_wer_fehlt');
    // CSV
    const [download] = await Promise.all([lk.waitForEvent('download'), lk.click('#lk-csv')]);
    const csv = fs.readFileSync(await download.path(), 'utf8');
    pruefe(csv.charCodeAt(0) === 0xfeff && /Klasse;Name;Übung 1: Erste Probe/.test(csv) && /3BFP2\/1;Lena M\.;.*;ja/.test(csv), 'CSV für Excel (BOM, Semikolon, Inhalt)');
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
