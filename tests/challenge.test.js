/* Test der ILS-Challenge: Sperre vor dem Abschlussquiz, zwei Durchgänge mit unterschiedlichen Ergebnissen,
 * Bestenliste je Klasse, Prüfungen des Servers (Zeit, Punkte, Lauf), Spalte und Siegerehrung auf der Lehrkraft-Seite,
 * Siegerwappen (malen, Bestenliste, nur angesehene am Beamer, löschen, vom Malen ausschließen).
 * Start: node tests/challenge.test.js   (Bilder: BILDER=/pfad) – alle Namen erfunden. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL } = require('./hilfen');
const { loesen, falschLoesen } = require('./loeser');

const PASSWORT = 'challenge-test';
const BILDER = process.env.BILDER || '';
const foto = async (s, n) => { if (BILDER) await s.screenshot({ path: path.join(BILDER, n + '.png'), fullPage: true }); };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function lk(worker, weg, daten) {
  const r = await fetch(worker.url + weg, { method: daten ? 'POST' : 'GET', headers: { 'X-Passwort': PASSWORT }, body: daten ? JSON.stringify(daten) : undefined });
  return r.json();
}

// kleines PNG im Browser erzeugen (Größe in Pixeln)
const pngMachen = (s, g) => s.evaluate((g) => {
  const c = document.createElement('canvas'); c.width = g; c.height = g;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, g, g); x.fillStyle = '#2471a3'; x.fillRect(g / 4, g / 4, g / 2, g / 2);
  return c.toDataURL('image/png');
}, g);

// malt mit der Maus ein Zeichen auf die Malfläche
async function malen(s) {
  const box = await (await s.$('#wappen-flaeche')).boundingBox();
  const p = (x, y) => [box.x + box.width * x, box.y + box.height * y];
  await s.mouse.move(...p(0.2, 0.2)); await s.mouse.down();
  for (const [x, y] of [[0.5, 0.8], [0.8, 0.2]]) await s.mouse.move(...p(x, y), { steps: 8 });
  await s.mouse.up();
  await s.click('.farbe[aria-label="Farbe #f1c40f"]');
  await s.click('.dicke:has-text("dick")');
  await s.mouse.move(...p(0.5, 0.35)); await s.mouse.down(); await s.mouse.up();
}

async function anmelden(s, basis, vorname, t, m, j) {
  await s.goto(basis + 'drainage/');
  await s.waitForSelector('.wahl');
  await s.locator('.wahl', { hasText: '3BFP2/1' }).click();
  await s.fill('#konto-vn', vorname); await s.fill('#konto-tag', t); await s.fill('#konto-monat', m); await s.fill('#konto-jahr', j);
  await s.click('#konto-anmelden');
  await s.waitForSelector('.konto-leiste');
}

// Spielt einen Durchgang; mitFehlern = Anzahl absichtlich falscher Einzelantworten
async function spielen(s, mitFehlern) {
  const startReal = Date.now();
  await s.click('#ch-start');
  await s.waitForSelector('.lern-karte');
  let falsch = 0;
  for (let n = 0; n < 20; n++) {
    await s.waitForSelector('.lern-karte');
    const auf = await s.evaluate(() => {
      const k = JSON.parse(localStorage.getItem('ils-konto'));
      const st = JSON.parse(localStorage.getItem(`ils-challenge|${k.klasse}|${k.name}|drainage`));
      const ref = st.karten[st.pos];
      return POOLS[ref.p].aufgaben[ref.i];
    });
    try {
      if (falsch < mitFehlern) { if (await falschLoesen(s, auf)) falsch++; } else await loesen(s, auf);
    } catch (e) {
      const dom = await s.evaluate(() => ({ frage: document.querySelector('.lern-karte .q-text')?.textContent, typ: document.querySelector('.lern-karte')?.dataset.typ,
        knoepfe: [...document.querySelectorAll('.antwort')].map((b) => b.textContent + (b.disabled ? ' [aus]' : '')) }));
      console.log('DEBUG erwartet:', auf.typ, auf.frage, '\nDEBUG angezeigt:', JSON.stringify(dom));
      throw e;
    }
    await s.waitForSelector('#ch-weiter:not(.hidden)');
    if (n === 19) { const rest = 21000 - (Date.now() - startReal); if (rest > 0) await warte(rest); }   // Mindestzeit (1 s je Aufgabe) einhalten
    await s.click('#ch-weiter');
  }
  await s.waitForSelector('.ch-ergebnis', { timeout: 15000 });
  return falsch;
}

(async () => {
  const worker = await workerStarten(8600 + Math.floor(Math.random() * 80), PASSWORT, { CHALLENGE_MIN_SEK_JE_AUFGABE: 1 });
  const { server, basis } = await serverStarten(worker.url);
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  try {
    await lk(worker, '/api/lehrkraft/import', { text: '3BFP2/1;Lena M.;05.09.2004\n3BFP2/1;Mohamed A.;01.02.2003\n3BFP2/2;Anna S.;31.12.2003' });
    const stand = await lk(worker, '/api/lehrkraft/stand');
    const sid = (n) => stand.schueler.find((x) => x.name === n).sid;

    console.log('Sperre vor dem Abschlussquiz');
    const k1 = await browser.newContext(MOBIL); await k1.clock.install();
    const lena = await k1.newPage(); beobachten(lena, protokoll, 'lena');
    await anmelden(lena, basis, 'Lena', '05', '09', '2004');
    await lena.goto(basis + 'drainage/challenge/');
    await lena.waitForSelector('.card.gesperrt');
    pruefe(/gesperrt/.test(await lena.textContent('.card.gesperrt')), 'Challenge vor dem Abschlussquiz gesperrt (Seite)');
    const token = await lena.evaluate(() => JSON.parse(localStorage.getItem('ils-konto')).token);
    const r0 = await fetch(worker.url + '/api/challenge/start', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ ils: 'drainage' }) });
    pruefe(r0.status === 409, 'Server: Start ohne Abschlussquiz abgelehnt', r0.status);

    // Lehrkraft trägt für Lena und Mohamed alle Schritte von Hand ein
    for (const n of ['Lena M.', 'Mohamed A.']) {
      for (const sch of ['1', '2', '3', '4', '5', 'quiz']) await lk(worker, '/api/lehrkraft/haken', { sid: sid(n), ils: 'drainage', schritt: sch, setzen: true });
    }
    await lena.goto(basis + 'drainage/');
    await lena.waitForSelector('.challenge-knopf');
    pruefe(true, 'Übersicht zeigt nach dem Abschluss den Knopf „ILS-Challenge“');

    console.log('Durchgang Lena (fehlerfrei)');
    await lena.goto(basis + 'drainage/challenge/');
    await lena.waitForSelector('#ch-start');
    await lena.waitForFunction(() => /Noch niemand/.test(document.body.textContent));
    pruefe(/20 Aufgaben/.test(await lena.textContent('.challenge')), 'Startseite mit Regeln und leerer Bestenliste');
    await foto(lena, 'c1_start');
    await spielen(lena, 0);
    const erg1 = await lena.textContent('.ch-ergebnis');
    const p1 = parseInt((await lena.textContent('.ch-gesamt')).replace(/\D/g, ''), 10);
    pruefe(p1 > 3000 && p1 <= 3750 && /Aufgaben: 3000 von 3000/.test(erg1), 'alles richtig: 3000 Aufgabenpunkte + Zeitbonus', erg1);
    pruefe(/Platz 1 von 1/.test(erg1) && /Neuer persönlicher Rekord/.test(erg1), 'Platz 1 von 1, neuer Rekord');
    pruefe(/Alles richtig/.test(await lena.textContent('body')), 'keine Fehlerliste bei 100 %');
    await foto(lena, 'c2_ergebnis_lena');

    console.log('Siegerwappen malen (Lena)');
    pruefe(/Siegerwappen malen/.test(await lena.textContent('#wappen-malen')), 'Ergebnisseite: Knopf „Siegerwappen malen“');
    await lena.click('#wappen-malen');
    await lena.waitForSelector('#wappen-flaeche');
    await lena.click('#wappen-speichern');
    pruefe(/zuerst etwas/.test(await lena.textContent('.wappen-editor .fb')), 'leere Malfläche wird nicht gespeichert');
    await malen(lena);
    await foto(lena, 'c2b_malen');
    await lena.click('#wappen-speichern');
    await lena.waitForSelector('#wappen-box img.wappen.gross');
    pruefe(/neu malen/.test(await lena.textContent('#wappen-malen')), 'nach dem Speichern: eigenes Wappen + „neu malen“');
    pruefe(!!(await lena.$('.bestenliste li.ich img.wappen')), 'eigenes Wappen erscheint sofort in der Bestenliste');
    await lena.reload();
    await lena.waitForSelector('.ch-ergebnis');
    pruefe(!!(await lena.$('.bestenliste li.ich img.wappen')) && !!(await lena.$('#wappen-box img.wappen.gross')), 'Wappen nach dem Neuladen noch da');

    console.log('Durchgang Mohamed (mit Fehlern)');
    const k2 = await browser.newContext(MOBIL); await k2.clock.install();
    const mo = await k2.newPage(); beobachten(mo, protokoll, 'mohamed');
    await anmelden(mo, basis, 'Mohamed', '01', '02', '2003');
    await mo.goto(basis + 'drainage/challenge/');
    await mo.waitForSelector('#ch-start');
    pruefe(/Lena M\./.test(await mo.textContent('.bestenliste')), 'Bestenliste der Klasse zeigt Lena M. vor dem Start');
    pruefe(!!(await mo.$('.bestenliste img[alt="Siegerwappen von Lena M."]')), 'Mohamed sieht Lenas Siegerwappen in der Bestenliste');
    pruefe(!(await mo.$('#wappen-malen')), 'ohne eigenes Ergebnis kein Knopf zum Malen');
    const falsch = await spielen(mo, 4);
    const erg2 = await mo.textContent('.ch-ergebnis');
    const p2 = parseInt((await mo.textContent('.ch-gesamt')).replace(/\D/g, ''), 10);
    pruefe(falsch === 4 && p2 < p1 && /Platz 2 von 2/.test(erg2), `mit ${falsch} Fehlern weniger Punkte (${p2} < ${p1}), Platz 2 von 2`, erg2);
    pruefe((await mo.locator('.ch-fehler').count()) === 4 && (await mo.locator('.ch-loesung').count()) === 4, 'am Ende: 4 Fehler mit Lösung');
    const reihen = await mo.locator('.bestenliste li').allTextContents();
    pruefe(/Lena M\./.test(reihen[0]) && /Mohamed A\./.test(reihen[1]), 'Bestenliste: 1. Lena, 2. Mohamed', reihen);
    pruefe(!!(await mo.$('.bestenliste li:first-child img.wappen')) && !!(await mo.$('.bestenliste li:nth-child(2) .wappen.leer')),
      'Ergebnisliste: Lena mit Wappen, Mohamed mit leerem Platzhalter');
    await foto(mo, 'c3_ergebnis_mohamed');

    console.log('Server-Prüfungen');
    const tok2 = await mo.evaluate(() => JSON.parse(localStorage.getItem('ils-konto')).token);
    const post = (weg, d) => fetch(worker.url + weg, { method: 'POST', headers: { Authorization: 'Bearer ' + tok2 }, body: JSON.stringify(d) });
    const st = await (await post('/api/challenge/start', { ils: 'drainage' })).json();
    const zuSchnell = await post('/api/challenge/ende', { ils: 'drainage', laufId: st.laufId, aufgabenPunkte: 3000, anzahl: 20 });
    pruefe(zuSchnell.status === 400 && (await zuSchnell.json()).grund === 'zu-schnell', 'Server: sofortiges Ende wird als „zu schnell“ abgelehnt');
    const zuViel = await post('/api/challenge/ende', { ils: 'drainage', laufId: st.laufId, aufgabenPunkte: 3200, anzahl: 20 });
    pruefe(zuViel.status === 400, 'Server: mehr Punkte als möglich abgelehnt');
    const fremd = await post('/api/challenge/ende', { ils: 'drainage', laufId: 'AAAAAAAAAAAAAAAA', aufgabenPunkte: 100, anzahl: 20 });
    pruefe(fremd.status === 409, 'Server: unbekannter Lauf abgelehnt');
    const liste = await (await fetch(worker.url + '/api/challenge/liste?ils=drainage', { headers: { Authorization: 'Bearer ' + tok2 } })).json();
    pruefe(liste.liste.length === 2 && liste.platz === 2 && !JSON.stringify(liste).includes('sid'), 'Bestenliste nur mit Name, Punkten, Zeit, Wappen (keine Kennungen)');
    pruefe(/^data:image\/png;base64,/.test(liste.liste[0].wappen || '') && liste.liste[1].wappen === null, 'Bestenliste liefert Lenas Wappen mit');
    const wPost = (bild, tok) => fetch(worker.url + '/api/challenge/wappen', { method: 'POST', headers: { Authorization: 'Bearer ' + (tok || tok2) }, body: JSON.stringify({ ils: 'drainage', bild }) });
    pruefe((await wPost('data:image/png;base64,AAAAAAAA')).status === 400, 'Server: kaputtes PNG abgelehnt');
    pruefe((await wPost('data:image/png;base64,' + 'A'.repeat(50000))).status === 400, 'Server: zu großes Bild abgelehnt');
    pruefe((await wPost(await pngMachen(mo, 16))).status === 400, 'Server: zu kleines Bild (16 px) abgelehnt');
    pruefe((await wPost('<svg onload=alert(1)>')).status === 400, 'Server: kein PNG (SVG/Text) abgelehnt');
    const anna = await (await fetch(worker.url + '/api/anmelden', { method: 'POST', body: JSON.stringify({ klasse: '3BFP2/2', vorname: 'Anna', geburtstag: '2003-12-31' }) })).json();
    const rAnna = await wPost(await pngMachen(mo, 64), anna.token);
    pruefe(rAnna.status === 409, 'Server: Wappen ohne eigenes Challenge-Ergebnis abgelehnt', rAnna.status);
    pruefe((await wPost(await pngMachen(mo, 64))).status === 200, 'Server: gültiges Wappen (Mohamed, 64 px) gespeichert');
    const rMe = await fetch(worker.url + '/api/challenge/wappen', { method: 'POST', headers: { Authorization: 'Bearer ' + tok2 }, body: JSON.stringify({ ils: 'me', bild: await pngMachen(mo, 64) }) });
    pruefe(rMe.status === 409, 'Server: Wappen gilt je Auftrag (für ILS 2 noch kein Ergebnis)');

    console.log('Lehrkraft: Spalte und Siegerehrung');
    const kl = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const l = await kl.newPage(); beobachten(l, protokoll, 'lehrkraft');
    await l.goto(basis + 'lehrkraft/');
    await l.fill('#lk-pw', PASSWORT); await l.click('text=Anmelden');
    await l.waitForSelector('#lk-haupt');
    await l.selectOption('#lk-ils', 'drainage');
    await l.selectOption('#lk-klasse', '3BFP2/1');
    const zeileLena = await l.locator('table.lk tbody tr', { hasText: 'Lena M.' }).textContent();
    pruefe(zeileLena.includes(`${p1} P.`), 'Tabelle: Spalte „🏁 Challenge“ mit bestem Ergebnis', zeileLena);
    pruefe(/🛡️ neu/.test(zeileLena), 'Tabelle: Hinweis „🛡️ neu“ bei Lena');
    pruefe(/2 neu/.test(await l.textContent('#lk-wappen-knopf')), 'Knopf „Siegerwappen (2 neu)“');
    l.on('dialog', (d) => d.accept());
    await l.click('#lk-siegerehrung');
    await l.waitForSelector('.se-p1.zeigen', { timeout: 8000 });
    pruefe(/Lena M\./.test(await l.textContent('.se-p1')) && /Mohamed A\./.test(await l.textContent('.se-p2')), 'Siegerehrung: Treppchen 1 Lena, 2 Mohamed');
    pruefe((await l.locator('.se-wappen').count()) === 0, 'Siegerehrung: noch nicht angesehene Wappen werden nicht gezeigt');
    await l.keyboard.press('Escape');
    pruefe(!(await l.$('#se-overlay')), 'Esc schließt die Siegerehrung');

    console.log('Lehrkraft: Siegerwappen');
    await l.click('#lk-wappen-knopf');
    await l.waitForSelector('.wappen-kachel');
    pruefe((await l.locator('.wappen-kachel.neu').count()) === 2, 'Galerie: 2 neue Wappen (Lena, Mohamed)');
    await foto(l, 'c5_galerie');
    await l.click('.wappen-kachel:has-text("Mohamed A.") >> text=Löschen');
    await l.waitForFunction(() => document.querySelectorAll('.wappen-kachel').length === 1);
    const nachLoeschen = await (await fetch(worker.url + '/api/challenge/liste?ils=drainage', { headers: { Authorization: 'Bearer ' + tok2 } })).json();
    pruefe(nachLoeschen.liste[1].wappen === null && nachLoeschen.meinWappen === null, 'Löschen: Mohameds Wappen ist weg');
    await l.click('#lk-wappen-alle');
    await l.waitForFunction(() => !document.querySelector('.wappen-kachel.neu'));
    const ohneNeu = await l.waitForFunction(() => !/neu/.test(document.querySelector('#lk-wappen-knopf').textContent), null, { timeout: 8000 }).then(() => true, () => false);
    pruefe(ohneNeu, 'alle angesehen: Knopf ohne „neu“');
    await l.click('#lk-siegerehrung');
    await l.waitForSelector('.se-p1.zeigen', { timeout: 8000 });
    pruefe(!!(await l.$('.se-p1 img.se-wappen')), 'Siegerehrung zeigt Lenas angesehenes Wappen');
    await warte(1200);
    await foto(l, 'c4_siegerehrung');
    await l.keyboard.press('Escape');

    // Lena vom Malen ausschließen
    await l.click('.wappen-kachel:has-text("Lena M.") >> text=Vom Malen ausschließen');
    await l.waitForSelector('.wappen-gesperrt');
    pruefe((await l.locator('.wappen-kachel').count()) === 0 && /Lena M\./.test(await l.textContent('.wappen-gesperrt')), 'Ausschließen: Wappen gelöscht, Lena in der Liste „ausgeschlossen“');
    const rGesperrt = await wPost(await pngMachen(mo, 64), token);
    pruefe(rGesperrt.status === 403, 'Server: ausgeschlossene Person kann kein Wappen speichern', rGesperrt.status);
    await lena.goto(basis + 'drainage/challenge/');
    await lena.waitForSelector('#wappen-box');
    await lena.waitForFunction(() => /ausgeschaltet/.test(document.querySelector('#wappen-box').textContent), null, { timeout: 8000 }).catch(() => {});
    pruefe(/ausgeschaltet/.test(await lena.textContent('#wappen-box')) && !(await lena.$('#wappen-malen')), 'Lena sieht (nach Neuladen der Ergebnisseite): Malen ausgeschaltet');
    await l.click('.wappen-gesperrt >> text=Wieder zulassen');
    await l.waitForFunction(() => !document.querySelector('.wappen-gesperrt'));
    pruefe((await wPost(await pngMachen(mo, 64), token)).status === 200, 'wieder zugelassen: Lena kann wieder speichern');

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
