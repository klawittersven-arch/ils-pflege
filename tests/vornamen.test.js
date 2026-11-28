/* Anmeldung am Server:
 *  · Namensauswahl (GET /api/namen, Anmeldung mit id + Geburtstag) – nur Kennung und Anzeigename werden herausgegeben
 *  · Rückfall Vornamen-Feld: jeder eingetragene Vorname zählt (Rufnamen): „Lea“ bei „Kim Lea V.“, „Joy“ bei „Ada Joy O.“,
 *    „Paul“ bei „Max-Paul D.“. Bei gleichem Geburtstag in einer Klasse entscheidet zuerst wie bisher der erste Vorname.
 * Alle Namen und Geburtsdaten sind erfunden.
 * Start:  (cd worker && npm install)  dann  node tests/vornamen.test.js */
'use strict';
const { workerStarten, pruefe, ergebnis } = require('./hilfen');

const PASSWORT = 'vornamen-test';
const LISTE = [
  '3BFP2/2;Kim Lea V.;11.11.2001',
  '3BFP2/2;Ada Joy O.;12.12.2002',
  '3BFP2/2;Bo Tim W.;13.01.2003',
  '3BFP2/1;Max-Paul D.;14.02.2004',
  '3BFP2/1;Lena M.;05.09.2004',
  '3BFP2/1;Maria K.;05.09.2004',
  '3BFP2/1;Anna Maria S.;31.12.2003',
  '3BFP2/1;Maria Z.;31.12.2003',
  '3BFP2/1;Nora G.;15.03.1999'
].join('\n');

(async () => {
  const worker = await workerStarten(8980 + Math.floor(Math.random() * 15), PASSWORT);
  const post = (weg, daten, kopf = {}) => fetch(worker.url + weg, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...kopf }, body: JSON.stringify(daten)
  }).then(async (r) => ({ status: r.status, d: await r.json() }));
  const anmelden = (klasse, vorname, geburtstag) => post('/api/anmelden', { klasse, vorname, geburtstag });
  try {
    const imp = await post('/api/lehrkraft/import', { text: LISTE }, { 'X-Passwort': PASSWORT });
    pruefe(imp.status === 200 && imp.d.neu === 9, 'Klassenliste importiert', imp.d);

    console.log('Rufnamen und weitere Vornamen');
    for (const [vorname, name, klasse, geb] of [
      ['Lea', 'Kim Lea V.', '3BFP2/2', '2001-11-11'],
      ['Kim', 'Kim Lea V.', '3BFP2/2', '2001-11-11'],
      ['Kim Lea', 'Kim Lea V.', '3BFP2/2', '2001-11-11'],
      ['Joy', 'Ada Joy O.', '3BFP2/2', '2002-12-12'],
      ['Ada', 'Ada Joy O.', '3BFP2/2', '2002-12-12'],
      ['Tim', 'Bo Tim W.', '3BFP2/2', '2003-01-13'],
      ['Paul', 'Max-Paul D.', '3BFP2/1', '2004-02-14'],
      ['Max', 'Max-Paul D.', '3BFP2/1', '2004-02-14'],
      ['nora', 'Nora G.', '3BFP2/1', '1999-03-15']
    ]) {
      const r = await anmelden(klasse, vorname, geb);
      pruefe(r.status === 200 && r.d.name === name, `„${vorname}“ → ${name}`, r.d);
    }

    console.log('Was weiterhin nicht klappt');
    const falschBuchstabe = await anmelden('3BFP2/2', 'Zoe', '2001-11-11');
    pruefe(falschBuchstabe.status === 401, 'Vorname, der zu keinem eingetragenen Vornamen passt → nicht gefunden', falschBuchstabe.d);
    const nachname = await anmelden('3BFP2/2', 'Vogel', '2001-11-11');
    pruefe(nachname.status === 401, 'Nachname statt Vorname → nicht gefunden (Initial „V.“ zählt nicht als Vorname)', nachname.d);
    const falscheKlasse = await anmelden('3BFP2/2', 'Nora', '1999-03-15');
    pruefe(falscheKlasse.status === 401, 'falsche Klasse → nicht gefunden', falscheKlasse.d);
    const falschesDatum = await anmelden('3BFP2/2', 'Lea', '2001-11-10');
    pruefe(falschesDatum.status === 401, 'falsches Geburtsdatum → nicht gefunden', falschesDatum.d);

    console.log('Gleicher Geburtstag in einer Klasse (wie bisher)');
    for (const [vorname, name, geb] of [
      ['Maria', 'Maria K.', '2004-09-05'],
      ['Lena', 'Lena M.', '2004-09-05'],
      ['Maria', 'Maria Z.', '2003-12-31'],
      ['Mar', 'Maria Z.', '2003-12-31'],
      ['Anna', 'Anna Maria S.', '2003-12-31'],
      ['Anna Maria', 'Anna Maria S.', '2003-12-31']
    ]) {
      const r = await anmelden('3BFP2/1', vorname, geb);
      pruefe(r.status === 200 && r.d.name === name, `${geb}: „${vorname}“ → ${name}`, r.d);
    }
    const nurM = await anmelden('3BFP2/1', 'M', '2003-12-31');
    pruefe(nurM.status === 200 && nurM.d.name === 'Maria Z.', 'nur „M“ → Maria Z. (erster Vorname geht vor, wie bisher)', nurM.d);

    console.log('Namensauswahl');
    const namenAntwort = await fetch(worker.url + '/api/namen?klasse=' + encodeURIComponent('3BFP2/1'));
    const nl = await namenAntwort.json();
    pruefe(namenAntwort.status === 200 && JSON.stringify(nl.namen.map((n) => n.name)) ===
      JSON.stringify(['Anna Maria S.', 'Lena M.', 'Maria K.', 'Maria Z.', 'Max-Paul D.', 'Nora G.']), 'Namensliste 3BFP2/1 alphabetisch, nur diese Klasse', nl);
    pruefe(nl.namen.every((n) => JSON.stringify(Object.keys(n).sort()) === '["id","name"]'), 'Liste enthält nur Kennung und Namen (kein Prüfwert, kein Fortschritt)', nl.namen[0]);
    const leer = await (await fetch(worker.url + '/api/namen?klasse=GIBTS-NICHT')).json();
    pruefe(leer.ok && leer.namen.length === 0, 'unbekannte Klasse → leere Liste');
    const kaputt = await fetch(worker.url + '/api/namen?klasse=' + encodeURIComponent('<script>'));
    pruefe(kaputt.status === 400, 'ungültiger Klassenname → 400');
    const id = (name, liste = nl) => liste.namen.find((n) => n.name === name).id;
    const nora = await post('/api/anmelden', { klasse: '3BFP2/1', id: id('Nora G.'), geburtstag: '1999-03-15' });
    pruefe(nora.status === 200 && nora.d.name === 'Nora G.' && /^[A-Za-z0-9]{32}$/.test(nora.d.token), 'Name angetippt + richtiger Geburtstag → angemeldet', nora.d);
    const maria = await post('/api/anmelden', { klasse: '3BFP2/1', id: id('Maria K.'), geburtstag: '2004-09-05' });
    const lena = await post('/api/anmelden', { klasse: '3BFP2/1', id: id('Lena M.'), geburtstag: '2004-09-05' });
    pruefe(maria.d.name === 'Maria K.' && lena.d.name === 'Lena M.', 'gleicher Geburtstag: angetippter Name entscheidet', [maria.d.name, lena.d.name]);
    const falsch = await post('/api/anmelden', { klasse: '3BFP2/1', id: id('Nora G.'), geburtstag: '1999-03-16' });
    pruefe(falsch.status === 401 && falsch.d.grund === 'nicht-gefunden', 'falscher Geburtstag → nicht angemeldet', falsch.d);
    const fremdeKlasse = await post('/api/anmelden', { klasse: '3BFP2/2', id: id('Nora G.'), geburtstag: '1999-03-15' });
    pruefe(fremdeKlasse.status === 401, 'Name aus einer anderen Klasse → nicht angemeldet', fremdeKlasse.d);
    const ungueltig = await post('/api/anmelden', { klasse: '3BFP2/1', id: '../x', geburtstag: '1999-03-15' });
    pruefe(ungueltig.status === 400, 'ungültige Kennung → 400', ungueltig.d);
    let letzte;
    for (let i = 0; i < 41; i++) {   // aus vielen Netzen: dann greift die Sperre je Klasse
      letzte = await post('/api/anmelden', { klasse: '3BFP2/1', id: id('Nora G.'), geburtstag: `1980-01-${String((i % 28) + 1).padStart(2, '0')}` },
        { 'CF-Connecting-IP': `10.7.0.${i + 1}` });
    }
    pruefe(letzte.status === 429 && letzte.d.grund === 'gesperrt', 'Raten aus vielen Netzen: nach 40 Fehlversuchen ist die Klasse gesperrt', letzte.d);
  } finally {
    worker.beenden();
  }
  process.exit(ergebnis() ? 0 : 1);
})();
