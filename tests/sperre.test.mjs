/* Sperre pro Gerät/Netz bei der Anmeldung (Worker in Node nachgebaut, ohne wrangler; alle Namen erfunden):
 *  · 5 falsche Geburtstage für denselben Namen aus einem Netz → nur dieser Name aus diesem Netz 1 Stunde gesperrt
 *  · 20 Fehlversuche aus einem Netz in 10 Minuten → aus diesem Netz 10 Minuten keine neuen Anmeldungen
 *  · ein einzelnes Netz kann die Klasse nicht mehr sperren (Grenze 20 < 40), andere Netze sind nicht betroffen
 *  · gespeichert wird nur ein Prüfwert der Internet-Adresse; der Alarm löscht abgelaufene Zähler
 *  · Handy zeigt verständliche Meldungen
 * Start:  node tests/sperre.test.mjs   (Bildschirmfoto der Meldung: BILDER=/pfad) */
import { createRequire } from 'node:module';
import path from 'node:path';
import { workerNachbauen } from './worker-nachbau.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { serverStarten, pruefe, ergebnis, MOBIL } = require('./hilfen.js');

const w = await workerNachbauen({ LEHRKRAFT_PASSWORT: 'pw' });
const post = (weg, daten, kopf = {}) => fetch(w.url + weg, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...kopf }, body: JSON.stringify(daten)
}).then(async (r) => ({ status: r.status, d: await r.json() }));
const netz = (n) => ({ 'CF-Connecting-IP': n });
const anmelden = (klasse, name, geburtstag, ip) => post('/api/anmelden', { klasse, id: ids[klasse + name], geburtstag }, netz(ip));

const LISTE = [
  ['3BFP2/1', 'Ada A.', '2001-01-01'], ['3BFP2/1', 'Bea B.', '2002-02-02'], ['3BFP2/1', 'Cleo C.', '2003-03-03'],
  ['3BFP2/1', 'Dina D.', '2004-04-04'], ['3BFP2/1', 'Eva E.', '2005-05-05'],
  ['3BFP2/2', 'Finn F.', '2001-06-06'], ['3BFP2/2', 'Gil G.', '2002-07-07'], ['3BFP2/2', 'Hans H.', '2003-08-08']
];
const ids = {};
let browser;
try {
  await post('/api/lehrkraft/import', { text: LISTE.map(([k, n, g]) => `${k};${n};${g.split('-').reverse().join('.')}`).join('\n') }, { 'X-Passwort': 'pw' });
  for (const kl of ['3BFP2/1', '3BFP2/2']) {
    const d = await (await fetch(w.url + '/api/namen?klasse=' + encodeURIComponent(kl))).json();
    for (const n of d.namen) ids[kl + n.name] = n.id;
  }

  console.log('Sperre pro Name und Netz');
  for (let i = 0; i < 5; i++) await anmelden('3BFP2/1', 'Ada A.', `1999-01-0${i + 1}`, '10.0.0.1');
  const gesperrt = await anmelden('3BFP2/1', 'Ada A.', '2001-01-01', '10.0.0.1');
  pruefe(gesperrt.status === 429 && gesperrt.d.grund === 'gesperrt-name' && gesperrt.d.minuten === 60,
    'nach 5 falschen Geburtstagen: dieser Name aus diesem Netz 60 Minuten gesperrt (auch mit richtigem Datum)', gesperrt.d);
  const anderesNetz = await anmelden('3BFP2/1', 'Ada A.', '2001-01-01', '10.0.0.2');
  pruefe(anderesNetz.status === 200 && anderesNetz.d.name === 'Ada A.', 'gleicher Name aus einem anderen Netz: klappt', anderesNetz.d);
  const andererName = await anmelden('3BFP2/1', 'Bea B.', '2002-02-02', '10.0.0.1');
  pruefe(andererName.status === 200 && andererName.d.name === 'Bea B.', 'anderer Name aus demselben Netz (z. B. Schul-WLAN): klappt', andererName.d);

  console.log('Richtige Anmeldung setzt den Zähler für den Namen zurück');
  for (let i = 0; i < 4; i++) await anmelden('3BFP2/1', 'Cleo C.', `1999-02-0${i + 1}`, '10.0.0.3');
  const richtig = await anmelden('3BFP2/1', 'Cleo C.', '2003-03-03', '10.0.0.3');
  for (let i = 0; i < 4; i++) await anmelden('3BFP2/1', 'Cleo C.', `1999-03-0${i + 1}`, '10.0.0.3');
  const nochmal = await anmelden('3BFP2/1', 'Cleo C.', '2003-03-03', '10.0.0.3');
  pruefe(richtig.status === 200 && nochmal.status === 200, '4 Fehler, richtig, 4 Fehler, richtig → nie gesperrt', [richtig.d, nochmal.d]);

  console.log('Sperre pro Netz');
  // 20 Fehlversuche aus einem Netz, verteilt auf Namen beider Klassen (je Name höchstens 4 → keine Namens-Sperre)
  const ziele = [['3BFP2/1', 'Dina D.'], ['3BFP2/1', 'Eva E.'], ['3BFP2/2', 'Finn F.'], ['3BFP2/2', 'Gil G.'], ['3BFP2/2', 'Hans H.']];
  let n = 0;
  for (const [kl, name] of ziele) for (let i = 0; i < 4; i++) { await anmelden(kl, name, `1998-0${i + 1}-1${n % 9}`, '10.0.0.4'); n++; }
  const netzGesperrt = await anmelden('3BFP2/1', 'Dina D.', '2004-04-04', '10.0.0.4');
  pruefe(n === 20 && netzGesperrt.status === 429 && netzGesperrt.d.grund === 'gesperrt-netz' && netzGesperrt.d.minuten === 10,
    'nach 20 Fehlversuchen: aus diesem Netz 10 Minuten keine neue Anmeldung', netzGesperrt.d);
  const getippt = await post('/api/anmelden', { klasse: '3BFP2/2', vorname: 'Gil', geburtstag: '2002-07-07' }, netz('10.0.0.4'));
  pruefe(getippt.status === 429 && getippt.d.grund === 'gesperrt-netz', 'gilt auch für den Rückfall mit getipptem Vornamen', getippt.d);
  const andereNetze = await Promise.all([anmelden('3BFP2/1', 'Dina D.', '2004-04-04', '10.0.0.5'), anmelden('3BFP2/2', 'Gil G.', '2002-07-07', '10.0.0.6')]);
  pruefe(andereNetze.every((r) => r.status === 200), 'andere Netze: beide Klassen nicht gesperrt (ein Netz allein sperrt keine Klasse mehr)', andereNetze.map((r) => r.d));

  console.log('Rückfall (getippter Vorname) zählt fürs Netz');
  for (let i = 0; i < 20; i++) await post('/api/anmelden', { klasse: '3BFP2/2', vorname: 'Xaver', geburtstag: `1997-01-${String(i + 1).padStart(2, '0')}` }, netz('10.0.0.7'));
  const getipptGesperrt = await post('/api/anmelden', { klasse: '3BFP2/2', vorname: 'Hans', geburtstag: '2003-08-08' }, netz('10.0.0.7'));
  pruefe(getipptGesperrt.status === 429 && getipptGesperrt.d.grund === 'gesperrt-netz', '20 Fehlversuche mit getipptem Vornamen → Netz gesperrt', getipptGesperrt.d);

  console.log('Gespeichert wird nur ein Prüfwert; Aufräumen per Alarm');
  const daten = w.env.DATEN.objekte.get('schule');
  const speicher = daten.ctx.storage;
  const alles = JSON.stringify([...speicher.m.keys(), ...speicher.m.values()]);
  pruefe(!/10\.0\.0\./.test(alles), 'keine Internet-Adresse im Klartext im Speicher');
  const netzSchluessel = [...speicher.m.keys()].filter((k) => k.startsWith('netzfehl:') || k.startsWith('namefehl:'));
  pruefe(netzSchluessel.length > 0 && netzSchluessel.every((k) => /^(netzfehl:[0-9a-f]{16}|namefehl:[0-9a-f]{16}:[a-z0-9]{12})$/.test(k)), 'Zähler nur unter Prüfwerten gespeichert', netzSchluessel.slice(0, 3));
  pruefe(speicher.alarmZeit && speicher.alarmZeit > Date.now() + 60 * 60000, 'Aufräumen ist geplant (Alarm in gut 1 Stunde)', speicher.alarmZeit);
  await daten.alarm();
  pruefe([...speicher.m.keys()].filter((k) => k.startsWith('netzfehl:') || k.startsWith('namefehl:')).length === netzSchluessel.length,
    'Alarm vor Ablauf: laufende Sperren bleiben');
  for (const k of [...speicher.m.keys()]) {
    if (/^(netzfehl|namefehl|fehl):/.test(k)) speicher.m.set(k, { ...speicher.m.get(k), start: Date.now() - 61 * 60000 });
  }
  await daten.alarm();
  pruefe([...speicher.m.keys()].filter((k) => /^(netzfehl|namefehl|fehl):/.test(k)).length === 0, 'Alarm nach Ablauf: alle Sperr-Zähler gelöscht');
  const wieder = await anmelden('3BFP2/1', 'Ada A.', '2001-01-01', '10.0.0.1');
  pruefe(wieder.status === 200, 'nach Ablauf: Anmeldung aus dem gesperrten Netz klappt wieder', wieder.d);
  pruefe((await (await fetch(w.url + '/api/lehrkraft/stand', { headers: { 'X-Passwort': 'pw' } })).json()).schueler.length === 8,
    'Klassenliste unverändert (8 Personen)');

  console.log('Meldungen am Handy');
  const { server, basis } = await serverStarten(w.url);
  try {
    browser = await chromium.launch();
    const k = await browser.newContext(MOBIL);
    const s = await k.newPage();
    let antwort = { grund: 'gesperrt-name', minuten: 60 };
    await s.route('**/api/anmelden', (r) => r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ ok: false, ...antwort }) }));
    await s.goto(basis + 'probe/');
    await s.locator('.klassen .wahl', { hasText: '3BFP2/1' }).click();
    await s.locator('.name-knopf', { hasText: 'Eva E.' }).click();
    await s.fill('#konto-tag', '5'); await s.fill('#konto-monat', '5'); await s.fill('#konto-jahr', '2005');
    await s.click('#konto-anmelden');
    await s.waitForSelector('.konto-karte .fb.show.bad');
    const t1 = await s.textContent('.konto-karte .fb.show');
    pruefe(/falsche Geburtstage für diesen Namen/.test(t1) && /60 Minuten/.test(t1), 'Meldung bei Namens-Sperre', t1);
    if (process.env.BILDER) await s.locator('.konto-karte').screenshot({ path: path.join(process.env.BILDER, 'sperre_name.png') });
    antwort = { grund: 'gesperrt-netz', minuten: 7 };
    await s.click('#konto-anmelden');
    await s.waitForFunction(() => /Internet-Anschluss/.test(document.querySelector('.konto-karte .fb.show')?.textContent || ''));
    const t2 = await s.textContent('.konto-karte .fb.show');
    pruefe(/Internet-Anschluss/.test(t2) && /7 Minuten/.test(t2), 'Meldung bei Netz-Sperre', t2);
  } finally { server.close(); }
} finally {
  if (browser) await browser.close();
  w.beenden();
}
process.exit(ergebnis() ? 0 : 1);
