/* Inhaltstest: spielt in jeder Übung der ILS-Aufträge ALLE Aufgaben des Pools einmal fehlerfrei durch
 * (Lösungen aus dem Pool der Seite). Prüft so, dass jede Aufgabe lösbar ist und ohne Fehler angezeigt wird.
 * Start: node tests/inhalt.test.js [auftrag …]   (Bilder jeder Aufgabe: BILDER=/pfad) */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { chromium } = require('playwright');
const { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL, WURZEL } = require('./hilfen');

const PASSWORT = 'inhalt-test';
const BILDER = process.env.BILDER || '';
const kontext = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(path.join(WURZEL, 'assets/auftraege.js'), 'utf8'), kontext);
const AUFTRAEGE = kontext.globalThis.ILS_AUFTRAEGE.filter((a) => a.id !== 'probe' && (process.argv.length < 3 || process.argv.includes(a.id)));
const ohneTags = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function klickText(s, selektor, text) {
  const ok = await s.evaluate(([sel, t]) => {
    const norm = (x) => x.replace(/\s+/g, ' ').trim();
    const el = [...document.querySelectorAll(sel)].find((e) => norm(e.textContent) === t && !e.disabled);
    if (el) el.click();
    return !!el;
  }, [selektor, text]);
  if (!ok) throw new Error(`nicht gefunden: ${selektor} „${text}“`);
}
const vor = (s, ms = 16000) => s.clock.fastForward(ms);

async function loesen(s, a) {
  await vor(s);
  switch (a.typ) {
    case 'wahl': await klickText(s, '.antwort', ohneTags(a.optionen[a.richtig])); break;
    case 'rf':
      await klickText(s, '.antwort', a.richtig ? 'Richtig' : 'Falsch');
      if (a.begruendung) { await vor(s); await klickText(s, '.antwort', ohneTags(a.begruendung.optionen[a.begruendung.richtig])); }
      break;
    case 'mehrfach':
      for (const i of a.richtig) await klickText(s, '.antwort', ohneTags(a.optionen[i]));
      await s.click('.lern-pruefen'); break;
    case 'reihe': for (const t of a.schritte) await klickText(s, '.order-pool .order-item', ohneTags(t)); break;
    case 'sortieren':
      for (let n = 0; n < a.elemente.length; n++) {
        const t = ohneTags(await s.textContent('.sort-text'));
        const e = a.elemente.find((x) => ohneTags(x.t) === t);
        if (!e) throw new Error('Element nicht gefunden: ' + t);
        await klickText(s, '.sort-knopf', ohneTags(a.kategorien[e.k]));
        await vor(s, 6000);
      }
      break;
    case 'zahl': await s.fill('.lern-zahl', String(a.richtig).replace('.', ',')); await s.click('.lern-zahlzeile button'); break;
    case 'luecke':
      for (const m of a.text.matchAll(/\{\{([^}]+)\}\}/g)) await klickText(s, '.chip', m[1]);
      break;
    case 'bild':
      for (const z of a.ziele) { await s.locator(`[data-ziel="${z.id}"] .feld`).click(); await vor(s, 8000); }
      break;
    case 'dialog':
      for (const k of a.knoten) { await klickText(s, '.antwort', ohneTags(k.optionen.find((o) => o.richtig).t)); await vor(s); }
      break;
    default: throw new Error('unbekannter Typ ' + a.typ);
  }
}

// statische Prüfungen der Pools
function pruefePool(name, pool) {
  const fehler = [];
  pool.forEach((a, i) => {
    const w = `${name} #${i + 1} (${a.typ})`;
    if (a.typ === 'wahl' && !(a.richtig >= 0 && a.richtig < a.optionen.length)) fehler.push(w + ': richtig außerhalb');
    if (a.typ === 'mehrfach' && !a.richtig.every((r) => r < a.optionen.length)) fehler.push(w + ': richtig außerhalb');
    if (a.typ === 'sortieren' && !a.elemente.every((e) => e.k < a.kategorien.length)) fehler.push(w + ': Kategorie fehlt');
    if (a.typ === 'sortieren' && new Set(a.elemente.map((e) => ohneTags(e.t))).size !== a.elemente.length) fehler.push(w + ': doppelte Elemente');
    if (a.typ === 'luecke') {
      const woerter = [...a.text.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]);
      if (new Set([...woerter, ...(a.extra || [])]).size !== woerter.length + (a.extra || []).length) fehler.push(w + ': doppelte Wörter/Ablenker');
    }
    if (a.typ === 'bild' && !a.ziele.every((z) => a.svg.includes(`data-ziel='${z.id}'`) || a.svg.includes(`data-ziel="${z.id}"`))) fehler.push(w + ': Ziel fehlt im Bild');
    if (a.typ === 'dialog' && !a.knoten.every((k) => k.optionen.filter((o) => o.richtig).length === 1)) fehler.push(w + ': nicht genau eine richtige Option');
    if (a.typ === 'rf' && a.begruendung && !(a.begruendung.richtig < a.begruendung.optionen.length)) fehler.push(w + ': Begründung');
    if (!a.erklaerung) fehler.push(w + ': Erklärung fehlt');
  });
  return fehler;
}

(async () => {
  const worker = await workerStarten(8700 + Math.floor(Math.random() * 80), PASSWORT);
  const { server, basis } = await serverStarten(worker.url);
  await fetch(worker.url + '/api/lehrkraft/import', { method: 'POST', headers: { 'X-Passwort': PASSWORT }, body: JSON.stringify({ text: '3BFP2/1;Test T.;01.01.2004' }) });
  const browser = await chromium.launch();
  const protokoll = { konsole: [], extern: [] };
  try {
    const k = await browser.newContext(MOBIL);
    await k.clock.install();
    const s = await k.newPage();
    beobachten(s, protokoll, 'sus');
    await s.goto(basis + AUFTRAEGE[0].pfad);
    await s.waitForSelector('.wahl');
    await s.click('.wahl'); await s.fill('#konto-vn', 'Test'); await s.fill('#konto-tag', '1'); await s.fill('#konto-monat', '1'); await s.fill('#konto-jahr', '2004');
    await s.click('#konto-anmelden');
    await s.waitForSelector('.konto-leiste');
    for (const auftrag of AUFTRAEGE) {
      console.log(`\n${auftrag.titel}`);
      for (const schritt of auftrag.schritte) {
        await s.goto(basis + schritt.pfad);
        await s.waitForSelector('#lern-los');
        const pool = await s.evaluate(() => POOL);
        const statisch = pruefePool(schritt.titel, pool);
        pruefe(!statisch.length, `${schritt.titel}: Pool (${pool.length} Aufgaben) formal in Ordnung`, statisch);
        // Durchgang mit ALLEN Aufgaben vorbereiten
        await s.evaluate(([ils, sch]) => {
          const konto = JSON.parse(localStorage.getItem('ils-konto'));
          const schl = `ils-lern|${konto.klasse}|${konto.name}|${ils}|${sch}`;
          const st = { sig: ILSLern.signatur(POOL), phase: 'karten', ziehung: POOL.map((_, i) => i), i: 0, fehler: 0, zuSchnell: 0, fehlerfrei: 0, themen: [],
            neustarts: 0, zuSchnellGesamt: 0, pauseBis: 0, grund: '', schreibenAb: 0, selbst: null, selbstMax: null, gemeldet: false };
          localStorage.setItem(schl, JSON.stringify(st));
        }, [auftrag.id, schritt.id]);
        await s.reload();
        await s.waitForSelector('.lern-karte');
        let fehlerText = '';
        for (let i = 0; i < pool.length; i++) {
          try {
            await s.waitForSelector('.lern-karte');
            await loesen(s, pool[i]);
            await s.waitForSelector('#lern-weiter:not(.hidden)', { timeout: 3000 });
            const fb = await s.getAttribute('.fb', 'class');
            if (!/ ok/.test(fb)) throw new Error('nicht als richtig gewertet: ' + (await s.textContent('.fb')));
            if (BILDER) await s.screenshot({ path: path.join(BILDER, `${auftrag.id}-${schritt.id}-${String(i + 1).padStart(2, '0')}.png`), fullPage: true });
            await vor(s, 6000);
            await s.click('#lern-weiter');
          } catch (e) {
            fehlerText = `Aufgabe ${i + 1} (${pool[i].typ}): ${e.message.split('\n')[0]}`;
            break;
          }
        }
        pruefe(!fehlerText, `${schritt.titel}: alle ${pool.length} Aufgaben fehlerfrei lösbar`, fehlerText || undefined);
        if (fehlerText) continue;
        if (await s.$('#lern-geschrieben')) {
          await vor(s, 300000);
          await s.click('#lern-geschrieben');
          for (const h of await s.$$('.checkliste input')) await h.check();
          await s.click('#lern-verglichen');
        }
        await s.waitForSelector('.lern-fertig .meldung.ok', { timeout: 8000 });
        pruefe(true, `${schritt.titel}: abgeschlossen und eingetragen`);
      }
    }
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
