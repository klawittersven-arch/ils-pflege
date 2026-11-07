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
const { ohneTags, klickText, vor, loesen } = require('./loeser');

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

// Antwortlängen: Man soll die richtige Antwort nicht an ihrer Länge erkennen können (wie tools/laengen_check.py).
const LAENGE = { faktor: 1.2, anteil: 0.4, mehrfach: 1.3 };
function laengen(name, pool) {
  const faelle = [];
  const fehler = [];
  pool.forEach((a, i) => {
    const w = `${name} #${i + 1}`;
    const fall = (ort, opt, r) => {
      const L = opt.map((o) => ohneTags(o).length);
      const andere = L.filter((_, j) => j !== r);
      faelle.push({ laengste: L[r] > Math.max(...andere), kuerzeste: L[r] < Math.min(...andere) });
      if (L[r] > LAENGE.faktor * Math.max(...andere)) fehler.push(`${ort}: richtige Antwort ${(L[r] / Math.max(...andere)).toFixed(2)}× so lang wie die längste falsche`);
    };
    if (a.typ === 'wahl') fall(w, a.optionen, a.richtig);
    if (a.typ === 'rf' && a.begruendung) fall(w + ' (Begründung)', a.begruendung.optionen, a.begruendung.richtig);
    if (a.typ === 'dialog') a.knoten.forEach((k, j) => fall(`${w} Schritt ${j + 1}`, k.optionen.map((o) => o.t), k.optionen.findIndex((o) => o.richtig)));
    if (a.typ === 'mehrfach') {
      const L = a.optionen.map((o) => ohneTags(o).length);
      const mittel = (x) => x.reduce((u, v) => u + v, 0) / x.length;
      const r = mittel(a.richtig.map((j) => L[j]));
      const f = mittel(L.filter((_, j) => !a.richtig.includes(j)));
      if (r > LAENGE.mehrfach * f) fehler.push(`${w}: richtige Antworten im Mittel ${(r / f).toFixed(2)}× so lang wie die falschen`);
    }
  });
  return { faelle, fehler };
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
      const alleFaelle = [];
      for (const schritt of auftrag.schritte) {
        await s.goto(basis + schritt.pfad);
        await s.waitForSelector('#lern-los');
        const pool = await s.evaluate(() => POOL);
        const statisch = pruefePool(schritt.titel, pool);
        pruefe(!statisch.length, `${schritt.titel}: Pool (${pool.length} Aufgaben) formal in Ordnung`, statisch);
        // Sortieren: 400-mal mischen – kein Links-rechts-Wechselmuster, keine langen Ketten, trotzdem zufällig
        const muster = await s.evaluate(() => POOL.map((a, nr) => {
          if (a.typ !== 'sortieren') return null;
          const folgen = new Set();
          let fehler = '';
          for (let i = 0; i < 400; i++) {
            const k = ILSLern.sortierFolge(a.elemente, a.kategorien.length).map((e) => e.k);
            folgen.add(k.join(''));
            let wechsel = 0, kette = 1, maxKette = 1;
            for (let j = 1; j < k.length; j++) { if (k[j] !== k[j - 1]) { wechsel++; kette = 1; } else maxKette = Math.max(maxKette, ++kette); }
            if (a.kategorien.length === 2 && k.length >= 4 && wechsel === k.length - 1) fehler = `#${nr + 1}: reines Abwechseln (${k.join('')})`;
            if (maxKette > 3) fehler = `#${nr + 1}: ${maxKette}× dieselbe Kategorie hintereinander (${k.join('')})`;
          }
          if (folgen.size < 3) fehler = `#${nr + 1}: zu wenig verschiedene Reihenfolgen (${folgen.size})`;
          return fehler || 'ok';
        }).filter(Boolean));
        if (muster.length) pruefe(muster.every((m) => m === 'ok'), `${schritt.titel}: Sortieren ohne durchschaubares Muster (${muster.length} Aufgabe/n)`, muster.filter((m) => m !== 'ok'));
        const lg = laengen(schritt.titel, pool);
        alleFaelle.push(...lg.faelle);
        pruefe(!lg.fehler.length, `${schritt.titel}: richtige Antwort nicht an der Länge erkennbar`, lg.fehler);
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
          pruefe(await s.isDisabled('#lern-geschrieben'), `${schritt.titel}: Schreibzeit läuft`);
          await vor(s, 31000);   // Mindest-Schreibzeit 30 s
          await s.click('#lern-geschrieben', { timeout: 5000 });
          for (const h of await s.$$('.checkliste input')) await h.check();
          await s.click('#lern-verglichen');
        }
        await s.waitForSelector('.lern-fertig .meldung.ok', { timeout: 8000 });
        pruefe(true, `${schritt.titel}: abgeschlossen und eingetragen`);
      }
      const n = alleFaelle.length;
      const lang = alleFaelle.filter((f) => f.laengste).length;
      const kurz = alleFaelle.filter((f) => f.kuerzeste).length;
      pruefe(lang <= LAENGE.anteil * n && kurz <= LAENGE.anteil * n,
        `${auftrag.titel}: richtige Antwort in ${lang} von ${n} Fällen die längste (${Math.round(100 * lang / n)} %), in ${kurz} die kürzeste (${Math.round(100 * kurz / n)} %) – je höchstens 40 %`);
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
