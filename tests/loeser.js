/* Löst eine Aufgabe des Lernmodus richtig (Lösung aus dem Pool) – für die automatischen Tests.
 * Die Uhr der Seite wird vor jeder Eingabe vorgespult, damit die Mindest-Lesezeit erfüllt ist. */
'use strict';
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

// warten: false = ohne Vorspulen der Uhr (z. B. ILS-Challenge: sofort antworten)
async function loesen(s, a, { warten = true } = {}) {
  const vor = (s2, ms) => (warten ? s2.clock.fastForward(ms || 16000) : null);
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

// Absichtlich falsch (nur bei Einzelantworten möglich) – sonst richtig lösen
async function falschLoesen(s, a) {
  if (a.typ === 'wahl') { await vor(s); await klickText(s, '.antwort', ohneTags(a.optionen[(a.richtig + 1) % a.optionen.length])); return true; }
  if (a.typ === 'rf') { await vor(s); await klickText(s, '.antwort', a.richtig ? 'Falsch' : 'Richtig'); return true; }
  if (a.typ === 'zahl') { await vor(s); await s.fill('.lern-zahl', String(a.richtig + 7)); await s.click('.lern-zahlzeile button'); return true; }
  await loesen(s, a);
  return false;
}

module.exports = { ohneTags, klickText, vor, loesen, falschLoesen };
