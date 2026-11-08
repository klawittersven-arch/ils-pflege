/* Test des Live-Rennens auf der Lehrkraft-Seite: Live-Meldung vom Handy, Bahnen mit Stand, Zieleinlauf in
 * der richtigen Reihenfolge (nur ab "Rennen starten"), Einblendung, Siegerehrung Top 5.
 * Start: node tests/rennen.test.js   (Bilder: BILDER=/pfad) – alle Namen erfunden. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL } = require('./hilfen');

const PASSWORT = 'rennen-test';
const BILDER = process.env.BILDER || '';
const foto = async (s, n) => { if (BILDER) await s.screenshot({ path: path.join(BILDER, n + '.png') }); };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const SCHRITTE = ['1', '2', '3', '4', '5'];

(async () => {
  const worker = await workerStarten(8900 + Math.floor(Math.random() * 80), PASSWORT);
  const { server, basis } = await serverStarten(worker.url);
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  const post = async (weg, daten, token) => {
    const r = await fetch(worker.url + weg, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : { 'X-Passwort': PASSWORT }, body: JSON.stringify(daten) });
    return { status: r.status, d: await r.json() };
  };
  try {
    await post('/api/lehrkraft/import', { text: ['3BFP2/1;Anna A.;01.01.2004', '3BFP2/1;Ben B.;02.02.2004', '3BFP2/1;Cem C.;03.03.2004',
      '3BFP2/1;Dana D.;04.04.2004', '3BFP2/1;Emil E.;05.05.2004', '3BFP2/2;Fritz F.;06.06.2004'].join('\n') });
    const anmelden = async (vorname, datum) => (await post('/api/anmelden', { klasse: '3BFP2/1', vorname, geburtstag: datum })).d.token;
    const tok = { anna: await anmelden('Anna', '2004-01-01'), ben: await anmelden('Ben', '2004-02-02'), cem: await anmelden('Cem', '2004-03-03'), dana: await anmelden('Dana', '2004-04-04') };
    const fertigMachen = async (t) => { for (const sch of [...SCHRITTE, 'quiz']) await post('/api/melden', { ils: 'drainage', schritt: sch, punkte: 8, max: 8 }, t); };

    console.log('Server: Live-Meldung');
    pruefe((await post('/api/live', { ils: 'drainage', schritt: '3', phase: 'karten', i: 3, n: 8 }, tok.dana)).status === 200, 'Live-Meldung wird angenommen');
    pruefe((await post('/api/live', { ils: 'drainage', schritt: 'gibtsnicht', phase: 'karten', i: 1, n: 8 }, tok.dana)).status === 400, 'unbekannter Schritt abgelehnt');
    pruefe((await post('/api/live', { ils: 'drainage', schritt: '3', phase: 'hacken', i: 1, n: 8 }, tok.dana)).status === 400, 'unbekannte Phase abgelehnt');
    pruefe((await post('/api/live', { ils: 'drainage', schritt: '3', phase: 'karten', i: 9, n: 8 }, tok.dana)).status === 400, 'i größer als n abgelehnt');
    pruefe((await post('/api/live', { ils: 'drainage', schritt: '3', phase: 'karten', i: 1, n: 8 }, 'A'.repeat(32))).status === 401, 'ohne gültige Anmeldung abgelehnt');
    for (const sch of ['1', '2']) await post('/api/melden', { ils: 'drainage', schritt: sch, punkte: 8, max: 8 }, tok.dana);
    await fertigMachen(tok.cem);   // Cem ist schon vor dem Rennen fertig

    console.log('Handy meldet den Stand von selbst');
    const k1 = await browser.newContext(MOBIL); await k1.clock.install();
    const emil = await k1.newPage(); beobachten(emil, protokoll, 'emil');
    await emil.goto(basis + 'drainage/2/');
    await emil.waitForSelector('.wahl');
    await emil.locator('.wahl', { hasText: '3BFP2/1' }).click();
    await emil.fill('#konto-vn', 'Emil'); await emil.fill('#konto-tag', '05'); await emil.fill('#konto-monat', '05'); await emil.fill('#konto-jahr', '2004');
    await emil.click('#konto-anmelden');
    await emil.waitForSelector('#lern-los');
    await emil.click('#lern-los');
    await emil.waitForSelector('.lern-karte');
    let staende = null;
    for (let v = 0; v < 20 && !(staende && staende.live.drainage); v++) {
      await warte(300);
      const st = await (await fetch(worker.url + '/api/lehrkraft/stand', { headers: { 'X-Passwort': PASSWORT } })).json();
      staende = st.schueler.find((x) => x.name === 'Emil E.');
    }
    const l = staende.live.drainage;
    pruefe(l && l.schritt === '2' && l.phase === 'karten' && l.i === 0 && l.n > 0, 'Übung geöffnet → Server kennt „Ü2, Aufgabe 1“', l);

    console.log('Lehrkraft: Live-Rennen');
    const kl = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const lk = await kl.newPage(); beobachten(lk, protokoll, 'lehrkraft');
    lk.on('dialog', (d) => d.accept());
    await lk.goto(basis + 'lehrkraft/');
    await lk.fill('#lk-pw', PASSWORT); await lk.click('text=Anmelden');
    await lk.waitForSelector('#lk-haupt');
    await lk.selectOption('#lk-ils', 'drainage');
    await lk.selectOption('#lk-klasse', '3BFP2/1');
    await lk.click('#lk-rennen');
    await lk.waitForSelector('.rb-bahn');
    pruefe((await lk.locator('.rb-bahn').count()) === 5, '5 Bahnen (nur die gewählte Klasse)');
    const bahn = (name) => lk.locator('.rb-bahn', { hasText: name });
    pruefe(/Ü3 · Aufgabe 4\/8/.test(await bahn('Dana D.').textContent()), 'Dana: „Ü3 · Aufgabe 4/8“ (Live-Stand)');
    pruefe(/Ü2 · Aufgabe 1/.test(await bahn('Emil E.').textContent()), 'Emil: „Ü2 · Aufgabe 1/…“ (vom Handy gemeldet)');
    pruefe(/noch nicht gestartet/.test(await lk.textContent('.rb-uhr')), 'vor dem Start: Uhr zeigt „noch nicht gestartet“');
    const sprite = await lk.evaluate(() => {
      const f = (n) => document.querySelector(`.rb-bahn[data-sid] .rb-name`) && [...document.querySelectorAll('.rb-bahn')].find((b) => b.querySelector('.rb-name').textContent === n).querySelector('.rb-figur');
      const dana = f('Dana D.'), anna = f('Anna A.'), cem = f('Cem C.');
      const st = (e) => getComputedStyle(e);
      return { bild: st(dana).backgroundImage.startsWith('url("data:image/png'), laeuft: st(dana).animationName === 'rb-lauf' && st(dana).animationPlayState === 'running',
        steht: st(anna).animationPlayState === 'paused', jubelt: cem.classList.contains('ziel') && st(cem).animationName === 'none' };
    });
    pruefe(sprite.bild && sprite.laeuft && sprite.steht && sprite.jubelt, 'Pixel-Krankenschwester: läuft (aktiv), steht (noch nicht dabei), jubelt (im Ziel)', sprite);
    await lk.click('#rb-start');
    await lk.waitForFunction(() => /⏱/.test(document.querySelector('.rb-uhr').textContent));
    pruefe(/schon vorher fertig/.test(await bahn('Cem C.').textContent()), 'Cem war vor dem Start fertig → „schon vorher fertig“, kein Platz');
    pruefe(/Noch niemand/.test(await lk.textContent('#rb-ziel')), 'Zielliste nach dem Start leer');
    await foto(lk, 'r1_rennen_start');

    await fertigMachen(tok.ben);
    await lk.waitForFunction(() => /Ben B\./.test(document.querySelector('#rb-ziel').textContent), null, { timeout: 15000 });
    pruefe(/Ben B\. ist im Ziel – Platz 1/.test(await lk.textContent('.rb-toast')), 'Einblendung „Ben B. ist im Ziel – Platz 1!“');
    await warte(1500);
    await fertigMachen(tok.anna);
    await lk.waitForFunction(() => /Anna A\./.test(document.querySelector('#rb-ziel').textContent), null, { timeout: 15000 });
    const ziel = await lk.locator('#rb-ziel li').allTextContents();
    pruefe(ziel.length === 2 && /Ben B\./.test(ziel[0]) && /Anna A\./.test(ziel[1]), 'Zielliste: 1. Ben, 2. Anna (Reihenfolge des Einlaufs)', ziel);
    await warte(1500);   // Überhol-Animation abwarten
    const reihen = await lk.$$eval('.rb-bahn', (b) => b.map((x) => ({ name: x.querySelector('.rb-name').textContent, y: new DOMMatrix(getComputedStyle(x).transform).m42 }))
      .sort((p, q) => p.y - q.y).map((x) => x.name));
    pruefe(reihen[0] === 'Ben B.' && reihen[1] === 'Anna A.' && reihen[2] === 'Cem C.' && reihen[3] === 'Dana D.',
      'Bahnen sortiert: Zieleinläufe oben, dann „vorher fertig“, dann nach Fortschritt', reihen);
    await foto(lk, 'r2_rennen_ziel');

    await lk.click('#rb-ehrung');
    await lk.waitForSelector('#rb-ehrung-ebene .se-p1.zeigen', { timeout: 8000 });
    pruefe(/Ben B\./.test(await lk.textContent('#rb-ehrung-ebene .se-p1')) && /Anna A\./.test(await lk.textContent('#rb-ehrung-ebene .se-p2')), 'Siegerehrung: 1. Ben, 2. Anna');
    pruefe((await lk.locator('#rb-ehrung-ebene .rb-sieger-figur').count()) === 2, 'Treppchen: jubelnde Krankenschwester bei jedem Platz');
    await warte(1200);
    await foto(lk, 'r3_siegerehrung');
    await lk.keyboard.press('Escape');
    pruefe(!(await lk.$('#rb-ehrung-ebene')) && !!(await lk.$('#rennen-overlay')), 'Esc: zurück zum Rennen');
    await lk.click('#rb-stopp');
    await lk.waitForFunction(() => /noch nicht gestartet/.test(document.querySelector('.rb-uhr').textContent));
    pruefe(await lk.isHidden('#rb-stopp') && /Rennen starten/.test(await lk.textContent('#rb-start')), '„Rennen beenden“: Uhr zurückgesetzt, Knopf wieder „Rennen starten“');
    await lk.keyboard.press('Escape');
    pruefe(!(await lk.$('#rennen-overlay')), 'Esc: Rennen geschlossen');

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
