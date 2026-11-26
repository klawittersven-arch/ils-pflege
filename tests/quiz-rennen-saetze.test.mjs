/* Test der Fragensätze des Quiz-Rennens (assets/quiz-rennen-fragen.js) – Inhalt aller Sätze und ein kurzer Lauf
 * mit dem SPIKES-Rennen (zweimal „S“ über „zeichen“) und dem Schock-Rennen am Beamer und auf dem Handy.
 * Läuft ohne wrangler (Worker in Node nachgebaut). Start: node tests/quiz-rennen-saetze.test.mjs  (Bilder: BILDER=/pfad) */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { workerNachbauen } from './worker-nachbau.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { serverStarten, pruefe, ergebnis, beobachten, MOBIL, WURZEL } = require('./hilfen.js');
const BILDER = process.env.BILDER || '';
const foto = async (s, n) => { if (BILDER) await s.screenshot({ path: path.join(BILDER, n + '.png') }); };

const w = await workerNachbauen();
const { zeitLimit } = await import('../worker/src/rennen.js');
const SETS = globalThis.QUIZ_RENNEN_SETS;
const css = fs.readFileSync(path.join(WURZEL, 'assets/quiz-rennen.css'), 'utf8');

console.log('Inhalt aller Fragensätze');
const alleIds = [];
for (const [id, s] of Object.entries(SETS)) {
  const ks = s.kategorien.map((k) => k.k);
  pruefe(s.id === id && s.titel && s.aufgabe, `${id}: Kennung, Titel und Arbeitsauftrag`);
  pruefe(ks.every((k) => /^[A-Z]$/.test(k)) && new Set(ks).size === ks.length, `${id}: Kategorien mit eindeutigem Buchstaben A–Z (${ks.join(' ')})`);
  pruefe(s.kategorien.every((k) => k.name && k.kurz && k.frage), `${id}: jede Kategorie mit Name, Kurzname und Leitfrage`);
  pruefe(ks.every((k) => css.includes(`.k-${k} {`)), `${id}: Farbe für jeden Buchstaben in quiz-rennen.css`);
  pruefe(s.fragen.every((f) => ks.includes(f.k) && f.text && f.warum), `${id}: jede Frage mit gültiger Lösung und Begründung`);
  const jeK = ks.map((k) => s.fragen.filter((f) => f.k === k).length);
  pruefe(Math.min(...jeK) >= 7, `${id}: mindestens 7 Fragen je Kategorie (${jeK.join('/')})`);
  pruefe(new Set(s.fragen.map((f) => f.text)).size === s.fragen.length, `${id}: keine Frage doppelt`);
  pruefe(s.fragen.every((f) => zeitLimit(f.text) >= 3000 && zeitLimit(f.text) <= 7000), `${id}: Zeitlimit je Frage 3–7 s`);
  alleIds.push(...s.fragen.map((f) => f.id));
}
pruefe(alleIds.every((i) => /^[a-z0-9]{1,8}$/.test(i)) && new Set(alleIds).size === alleIds.length, 'Frage-Kennungen gültig und über alle Sätze eindeutig');
const sp = SETS.spikes;
pruefe(sp.kategorien.map((k) => k.zeichen || k.k).join('') === 'SPIKES', 'SPIKES-Rennen: Knöpfe zeigen S P I K E S');

const { server, basis } = await serverStarten(w.url);
const browser = await chromium.launch();
const protokoll = { konsole: [], extern: [] };
try {
  for (const setId of ['spikes', 'schock']) {
    const S = SETS[setId];
    const loesung = (id) => S.fragen.find((f) => f.id === id).k;
    console.log(`${S.titel}: Beamer und ein Handy`);
    const bk = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const beamer = await bk.newPage();
    beobachten(beamer, protokoll, 'beamer-' + setId);
    beamer.on('dialog', (d) => d.accept());
    await beamer.goto(basis + 'quiz-rennen/beamer/?set=' + setId);
    await beamer.waitForSelector('#qz-code');
    pruefe((await beamer.textContent('body')).includes(S.titel), `${setId}: Beamer zeigt „${S.titel}“`);
    await beamer.selectOption('#qz-zeit', 'aus');
    await beamer.waitForFunction(() => !document.querySelector('.rb-unter').textContent.includes('zu langsam'));
    const url = await beamer.getAttribute('#qz-qr-bild', 'data-url');
    const hk = await browser.newContext(MOBIL);
    const h = await hk.newPage();
    beobachten(h, protokoll, 'handy-' + setId);
    await h.goto(url);
    await h.waitForSelector('#qz-vorname');
    await h.fill('#qz-vorname', 'Lea');
    await h.fill('#qz-initial', 'B');
    await h.click('#qz-mitmachen');
    await h.waitForSelector('#qz-warten');
    const leit = await h.locator('.qz-leitfragen li').allTextContents();
    pruefe(leit.length === S.kategorien.length, `${setId}: Wartebildschirm zeigt ${S.kategorien.length} Leitfragen`);
    pruefe((await h.textContent('.qz-regeln')).includes(S.regel), `${setId}: eigene erste Regel („${S.regel.slice(0, 30)} …“)`);
    const buchstaben = await h.locator('.qz-leitfragen .qz-buchstabe').allTextContents();
    pruefe(buchstaben.join('') === S.kategorien.map((k) => k.zeichen || k.k).join(''), `${setId}: Buchstaben am Start ${buchstaben.join(' ')}`);
    await foto(h, `handy-${setId}-warten`);
    await beamer.click('#qz-haupt');
    await h.waitForSelector('#qz-text', { timeout: 9000 });
    pruefe((await h.textContent('.qz-auftrag')) === S.aufgabe, `${setId}: Arbeitsauftrag über der Frage`);
    pruefe(await h.locator('.qz-knopf').count() === S.kategorien.length, `${setId}: ${S.kategorien.length} Antwortknöpfe`);
    await foto(h, `handy-${setId}-frage`);
    // zwei richtige Antworten, dann eine falsche
    for (let i = 0; i < 2; i++) {
      await h.waitForSelector('#qz-knoepfe:not(.gesperrt)', { timeout: 8000 });
      const id = await h.getAttribute('#qz-text', 'data-id');
      await h.click(`.qz-knopf[data-k="${loesung(id)}"]`);
      await h.waitForFunction((alt) => { const x = document.querySelector('#qz-text'); return x && x.dataset.id !== alt; }, id, { timeout: 8000 });
    }
    pruefe(true, `${setId}: zwei richtige Antworten angenommen`);
    await h.waitForSelector('#qz-knoepfe:not(.gesperrt)', { timeout: 8000 });
    const id = await h.getAttribute('#qz-text', 'data-id');
    const k = loesung(id);
    // bei SPIKES gezielt die „andere S“-Kategorie tippen, wenn die Lösung S oder Z ist
    const falsch = k === 'S' && setId === 'spikes' ? 'Z' : (k === 'Z' ? 'S' : S.kategorien.find((x) => x.k !== k).k);
    await h.click(`.qz-knopf[data-k="${falsch}"]`);
    await h.waitForSelector('#qz-falsch', { timeout: 8000 });
    const kat = S.kategorien.find((x) => x.k === k);
    pruefe((await h.textContent('.qz-loesung')).includes(`Richtig: ${kat.name} – ${kat.kurz}`) && (await h.textContent('.qz-loesung .qz-buchstabe')) === (kat.zeichen || kat.k), `${setId}: Lösung mit Buchstabe ${kat.zeichen || kat.k} und Namen`);
    pruefe((await h.textContent('.qz-warum')) === S.fragen.find((f) => f.id === id).warum, `${setId}: Begründung aus dem Fragensatz`);
    await foto(h, `handy-${setId}-falsch`);
    await beamer.click('#qz-fehler-knopf');
    await beamer.waitForSelector('.qz-fehler-liste li');
    const fehlerText = await beamer.textContent('#qz-fehler');
    pruefe(fehlerText.includes(S.fragen.find((f) => f.id === id).text), `${setId}: Häufige Fehler am Beamer zeigen die Frage`);
    if (setId === 'spikes' && (k === 'S' || k === 'Z')) {
      pruefe(fehlerText.includes('S (Rahmen)') && fehlerText.includes('S (Plan und Zusammenfassung)'), 'spikes: Verwechslung der beiden S mit Kurznamen unterscheidbar');
    }
    await foto(beamer, `beamer-${setId}-fehler`);
    await bk.close();
    await hk.close();
  }
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
