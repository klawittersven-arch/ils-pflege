/* Alle ILS-Aufträge mit Anmeldung – daraus entstehen
   · die Übersichtsseite jedes Auftrags (welche Übung ist schon erledigt?) und
   · die Spalten der Lehrkraft-Tabelle (/lehrkraft/).

   id       kurzer Name ohne Leer- und Sonderzeichen (steht auch in der Adresse, z. B. /drainage/)
   schritte jede Übung, die gemeldet wird; der Schritt mit abschluss: true ist das Abschlussquiz.
            Er wird erst freigeschaltet, wenn alle anderen Schritte erledigt sind.
   Reihenfolge der Schritte = Reihenfolge auf der Übersichtsseite und in der Tabelle.
   betreff  Betreff für E-Mails an die Lehrkraft (Examens-Training)
   challenge Seite der ILS-Challenge (Highscore), freigeschaltet nach dem Abschlussquiz
   Diese Datei liest auch der Server (worker/src/index.js): Er nimmt nur bekannte Schritte an und das
   Abschlussquiz erst, wenn alle anderen Schritte erledigt sind. */
(typeof window !== 'undefined' ? window : globalThis).ILS_AUFTRAEGE = [
  {
    id: 'drainage',
    titel: 'Wunddrainagen: Redon- und Robinson-Drainage',
    kurz: 'Drainage',
    pfad: 'drainage/',
    betreff: 'ILS Drainage',
    challenge: 'drainage/challenge/',
    schritte: [
      { id: '1', titel: 'Übung 1: Wozu Wunddrainagen?', kurz: 'Ü1', pfad: 'drainage/1/' },
      { id: '2', titel: 'Übung 2: Beobachten und dokumentieren', kurz: 'Ü2', pfad: 'drainage/2/' },
      { id: '3', titel: 'Übung 3: Komplikationen erkennen', kurz: 'Ü3', pfad: 'drainage/3/' },
      { id: '4', titel: 'Übung 4: Umgang, Hygiene und Recht', kurz: 'Ü4', pfad: 'drainage/4/' },
      { id: '5', titel: 'Übung 5: Examens-Training Pflegeprozess', kurz: 'Ü5', pfad: 'drainage/5/' },
      { id: 'quiz', titel: 'Abschlussquiz', kurz: 'Quiz', pfad: 'drainage/abschluss/', abschluss: true }
    ]
  },
  {
    id: 'me',
    titel: 'Materialentfernung und pflegerische Nachsorge',
    kurz: 'Materialentf.',
    pfad: 'me/',
    betreff: 'ILS Metallentfernung',
    challenge: 'me/challenge/',
    schritte: [
      { id: '1', titel: 'Übung 1: Osteosynthese und Materialentfernung', kurz: 'Ü1', pfad: 'me/1/' },
      { id: '2', titel: 'Übung 2: Nach der OP überwachen', kurz: 'Ü2', pfad: 'me/2/' },
      { id: '3', titel: 'Übung 3: Komplikationen erkennen', kurz: 'Ü3', pfad: 'me/3/' },
      { id: '4', titel: 'Übung 4: Schmerz und Mobilisation', kurz: 'Ü4', pfad: 'me/4/' },
      { id: '5', titel: 'Übung 5: Information, Anleitung und Entlassung', kurz: 'Ü5', pfad: 'me/5/' },
      { id: 'quiz', titel: 'Abschlussquiz', kurz: 'Quiz', pfad: 'me/abschluss/', abschluss: true }
    ]
  },
  {
    id: 'probe',
    titel: 'Probe-Auftrag (zum Testen)',
    kurz: 'Probe',
    pfad: 'probe/',
    betreff: 'ILS Probe',
    schritte: [
      { id: '1', titel: 'Übung 1: Erste Probe', kurz: 'Ü1', pfad: 'probe/1/' },
      { id: '2', titel: 'Übung 2: Zweite Probe', kurz: 'Ü2', pfad: 'probe/2/' },
      { id: 'quiz', titel: 'Abschlussquiz', kurz: 'Quiz', pfad: 'probe/abschluss/', abschluss: true }
    ]
  }
];
