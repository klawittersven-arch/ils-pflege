/* Alle ILS-Aufträge mit Anmeldung – daraus entstehen
   · die Übersichtsseite jedes Auftrags (welche Übung ist schon erledigt?) und
   · die Spalten der Lehrkraft-Tabelle (/lehrkraft/).

   id       kurzer Name ohne Leer- und Sonderzeichen (steht auch in der Adresse, z. B. /drainage/)
   schritte jede Übung, die gemeldet wird; der Schritt mit abschluss: true ist das Abschlussquiz.
            Er wird erst freigeschaltet, wenn alle anderen Schritte erledigt sind.
   Reihenfolge der Schritte = Reihenfolge auf der Übersichtsseite und in der Tabelle. */
window.ILS_AUFTRAEGE = [
  {
    id: 'probe',
    titel: 'Probe-Auftrag (zum Testen)',
    kurz: 'Probe',
    pfad: 'probe/',
    schritte: [
      { id: '1', titel: 'Übung 1: Erste Probe', kurz: 'Ü1', pfad: 'probe/1/' },
      { id: '2', titel: 'Übung 2: Zweite Probe', kurz: 'Ü2', pfad: 'probe/2/' },
      { id: 'quiz', titel: 'Abschlussquiz', kurz: 'Quiz', pfad: 'probe/abschluss/', abschluss: true }
    ]
  }
];
