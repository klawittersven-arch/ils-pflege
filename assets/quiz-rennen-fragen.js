/* Fragen für das Quiz-Rennen im Klassenraum (Beamer + Handys, /quiz-rennen/).
 *
 * Diese Datei liest NUR der Server (worker/src/rennen.js): Er stellt die Fragen und prüft die Antworten.
 * Die Handys bekommen die Lösung erst, nachdem geantwortet wurde.
 *
 * Aufbau eines Fragensatzes
 *   titel       steht groß am Beamer und auf dem Handy
 *   aufgabe     Arbeitsauftrag über jeder Frage
 *   kategorien  die Antwortknöpfe: k (Buchstabe), name, kurz, frage (Leitfrage – steht klein auf dem Knopf)
 *   fragen      id (a–z, 0–9, max. 8 Zeichen, nie wiederverwenden), text, k (richtige Kategorie), warum (Rückmeldung bei Fehler)
 *
 * ABCDE: Begriffe nach Pflegias Band 2 (S. 793–795: A obere Atemwege, Protektion der HWS · B Atmung und Oxygenisierung ·
 * C Kreislaufsituation, Blutstillung · D neurologischer Status · E komplette körperliche Untersuchung, Kontrolle einer
 * möglichen Hypothermie; S. 802 Kapillar-Füllung < 2 s; S. 370 Stridor/Giemen/Rasseln). Leitfragen und Grenzfälle wie in
 * der Präsentation „ABCDE trennscharf“ (W1_01b): Entscheidend ist, über welche Funktion ein Befund etwas sagt. */
(typeof window !== 'undefined' ? window : globalThis).QUIZ_RENNEN_SETS = {
  abcde: {
    id: 'abcde',
    titel: 'ABCDE-Rennen',
    aufgabe: 'Wohin gehört das?',
    kategorien: [
      { k: 'A', name: 'Airway', kurz: 'Atemwege', frage: 'Ist der Weg für die Luft frei?' },
      { k: 'B', name: 'Breathing', kurz: 'Atmung', frage: 'Kommt genug Sauerstoff in die Lunge und ins Blut?' },
      { k: 'C', name: 'Circulation', kurz: 'Kreislauf', frage: 'Bringt das Blut den Sauerstoff zu allen Organen?' },
      { k: 'D', name: 'Disability', kurz: 'Neurologie', frage: 'Arbeitet das Gehirn normal?' },
      { k: 'E', name: 'Exposure', kurz: 'ganzer Körper', frage: 'Was finde ich am ganzen Körper – und ist er zu kalt oder zu warm?' }
    ],
    fragen: [
      // A – Airway: Ist der Weg für die Luft frei?
      { id: 'a1', k: 'A', text: 'Gurgelndes Geräusch beim Atmen', warum: 'Flüssigkeit (z. B. Schleim oder Erbrochenes) liegt in den oberen Atemwegen. Der Weg für die Luft ist nicht frei.' },
      { id: 'a2', k: 'A', text: 'Schnarchendes Geräusch bei einer bewusstlosen Person', warum: 'Die Zunge ist nach hinten gefallen und verlegt den Weg für die Luft.' },
      { id: 'a3', k: 'A', text: 'Erbrochenes im Mund', warum: 'Erbrochenes kann den Weg für die Luft verlegen.' },
      { id: 'a4', k: 'A', text: 'Die Zahnprothese hat sich gelöst und liegt im Rachen.', warum: 'Ein Fremdkörper verlegt den Weg für die Luft.' },
      { id: 'a5', k: 'A', text: 'Die Person kann nicht sprechen und greift sich an den Hals.', warum: 'Typisch für einen Fremdkörper im Hals (z. B. ein Stück Essen): Der Weg für die Luft ist verlegt.' },
      { id: 'a6', k: 'A', text: 'Pfeifendes Geräusch beim Einatmen (Stridor)', warum: 'Stridor zeigt: Die oberen Atemwege sind eng. (Pfeifen beim Ausatmen = Giemen → B)' },
      { id: 'a7', k: 'A', text: 'Kann die Person sprechen?', warum: 'Wer normal sprechen kann, hat freie Atemwege. Das ist die erste Prüfung bei A.' },
      { id: 'a8', k: 'A', text: 'Viel Schleim im Mund – die Person kann ihn nicht abhusten.', warum: 'Schleim in Mund und Rachen kann den Weg für die Luft verlegen (z. B. absaugen).' },
      { id: 'a9', k: 'A', text: 'Sturz von der Leiter: Kopf und Hals erst einmal nicht bewegen', warum: 'Nach einem Unfall gehört der Schutz der Halswirbelsäule zu A.' },
      { id: 'a10', k: 'A', text: 'Der Brustkorb bewegt sich, aber es kommt keine Luft.', warum: 'Die Person versucht zu atmen, aber der Weg für die Luft ist blockiert.' },
      { id: 'a11', k: 'A', text: 'Wespenstich im Mund: Die Zunge schwillt stark an.', warum: 'Die Schwellung macht den Weg für die Luft eng.' },
      { id: 'a12', k: 'A', text: 'Der Mund ist voll mit Essensresten.', warum: 'Essensreste können den Weg für die Luft verlegen.' },

      // B – Breathing: Kommt genug Sauerstoff in die Lunge und ins Blut?
      { id: 'b1', k: 'B', text: 'Atemfrequenz 32/min', warum: 'Die Person atmet viel zu schnell. Die Atemfrequenz gehört zur Atmung.' },
      { id: 'b2', k: 'B', text: 'SpO₂ 86 %', warum: 'Die Sauerstoffsättigung ist zu niedrig: Es kommt zu wenig Sauerstoff ins Blut.' },
      { id: 'b3', k: 'B', text: 'Die Lippen sind bläulich (Zyanose).', warum: 'Blaue Lippen zeigen: Im Blut ist zu wenig Sauerstoff. (Blasse, graue Haut → C)' },
      { id: 'b4', k: 'B', text: 'Rasselndes Geräusch beim Atmen', warum: 'Rasseln entsteht in der Lunge (z. B. Flüssigkeit). Der Sauerstoff kommt schlecht ins Blut. (Gurgeln im Rachen → A)' },
      { id: 'b5', k: 'B', text: 'Pfeifendes Geräusch beim Ausatmen (Giemen)', warum: 'Giemen entsteht in den engen Bronchien (z. B. bei Asthma). Das gehört zur Atmung. (Pfeifen beim Einatmen = Stridor → A)' },
      { id: 'b6', k: 'B', text: 'Die Person spricht nur 2–3 Wörter am Stück.', warum: 'Sie kann sprechen, der Weg ist also frei. Aber sie hat Atemnot (Sprechdyspnoe).' },
      { id: 'b7', k: 'B', text: 'Beim Atmen gehen die Schultern mit hoch.', warum: 'Die Person setzt die Atemhilfsmuskulatur ein: Zeichen für Atemnot.' },
      { id: 'b8', k: 'B', text: 'Die Person sitzt aufrecht und stützt die Arme auf.', warum: 'So kann sie die Atemhilfsmuskulatur besser einsetzen: Zeichen für Atemnot.' },
      { id: 'b9', k: 'B', text: 'Die Atmung ist sehr flach.', warum: 'Bei flacher Atmung kommt zu wenig Luft in die Lunge.' },
      { id: 'b10', k: 'B', text: 'Der Brustkorb hebt sich nur auf einer Seite.', warum: 'Eine Seite der Lunge atmet nicht richtig mit.' },
      { id: 'b11', k: 'B', text: 'Die Person sagt: „Ich bekomme so schlecht Luft.“', warum: 'Sie kann sprechen (A ist frei), aber sie hat Atemnot.' },
      { id: 'b12', k: 'B', text: 'Atemfrequenz 6/min', warum: 'Die Person atmet viel zu langsam. Es kommt zu wenig Sauerstoff ins Blut.' },

      // C – Circulation: Bringt das Blut den Sauerstoff zu allen Organen?
      { id: 'c1', k: 'C', text: 'Puls 128/min', warum: 'Der Puls ist zu schnell. Der Puls gehört zum Kreislauf.' },
      { id: 'c2', k: 'C', text: 'Blutdruck 85/50 mmHg', warum: 'Der Blutdruck ist zu niedrig: Die Organe bekommen zu wenig Blut.' },
      { id: 'c3', k: 'C', text: 'Kapillar-Füllungszeit 4 Sekunden', warum: 'Normal sind unter 2 Sekunden. Länger heißt: Das Blut kommt schlecht bis in die kleinen Gefäße (z. B. bei Schock).' },
      { id: 'c4', k: 'C', text: 'Die Haut ist blass, kalt und feucht (kaltschweißig).', warum: 'Das Blut bleibt bei den wichtigen Organen (Zentralisation). Die Haut bekommt wenig Blut.' },
      { id: 'c5', k: 'C', text: 'Die Füße sind kalt und marmoriert.', warum: 'Die Füße bekommen zu wenig Blut. Die Hauttemperatur zeigt die Durchblutung.' },
      { id: 'c6', k: 'C', text: 'Urinbeutel: 30 ml in 4 Stunden', warum: 'Sehr wenig Urin: Die Nieren bekommen zu wenig Blut. (Nasse Hose, sichtbare Ausscheidung → E)' },
      { id: 'c7', k: 'C', text: 'Aus einer Wunde am Bein spritzt Blut.', warum: 'Eine starke Blutung ist ein C-Problem: Sie muss sofort gestillt werden. (Kleine Schürfwunde → E)' },
      { id: 'c8', k: 'C', text: 'Der Puls ist unregelmäßig.', warum: 'Ein unregelmäßiger Puls betrifft Herz und Kreislauf.' },
      { id: 'c9', k: 'C', text: 'Der Puls am Handgelenk ist kaum zu tasten.', warum: 'Ein schwacher Puls zeigt: Es kommt wenig Blut im Arm an.' },
      { id: 'c10', k: 'C', text: 'Hauttemperatur an Händen und Füßen fühlen', warum: 'Die Hauttemperatur zeigt die Durchblutung → C. (Körpertemperatur mit dem Thermometer → E)' },
      { id: 'c11', k: 'C', text: 'Die Haut ist grau und blass.', warum: 'Blasse Haut bekommt wenig Blut. (Blaue Lippen → B)' },
      { id: 'c12', k: 'C', text: 'Puls 42/min', warum: 'Der Puls ist viel zu langsam: Das Herz pumpt zu wenig Blut durch den Körper.' },

      // D – Disability: Arbeitet das Gehirn normal?
      { id: 'd1', k: 'D', text: 'Die Person reagiert nur auf einen Schmerzreiz.', warum: 'So prüfen Sie das Bewusstsein (AVPU: P = Pain). Das gehört zum neurologischen Status.' },
      { id: 'd2', k: 'D', text: 'Die Person weiß nicht, wo sie ist.', warum: 'Die Orientierung (Ort, Zeit, Person) zeigt, ob das Gehirn normal arbeitet.' },
      { id: 'd3', k: 'D', text: 'Die Pupillen sind unterschiedlich groß.', warum: 'Die Pupillen geben Hinweise auf das Gehirn.' },
      { id: 'd4', k: 'D', text: 'Die Pupillen reagieren nicht auf Licht.', warum: 'Die Pupillenreaktion gehört zum neurologischen Status.' },
      { id: 'd5', k: 'D', text: 'Ein Mundwinkel hängt herunter.', warum: 'Lähmung im Gesicht: Hinweis auf einen Schlaganfall (FAST-Test: F = Face).' },
      { id: 'd6', k: 'D', text: 'Die Person kann den rechten Arm nicht heben.', warum: 'Lähmung eines Arms: Hinweis auf einen Schlaganfall (FAST-Test: A = Arms).' },
      { id: 'd7', k: 'D', text: 'Die Person spricht verwaschen.', warum: 'Das Gehirn steuert die Sprache (FAST-Test: S = Speech). Bei A geht es nur darum, ob die Luft durchkommt.' },
      { id: 'd8', k: 'D', text: 'Blutzucker 45 mg/dl', warum: 'Das Gehirn braucht Zucker. Bei Unterzucker arbeitet es nicht richtig (Verwirrtheit, Bewusstlosigkeit).' },
      { id: 'd9', k: 'D', text: 'Blutzucker messen', warum: 'Bei D wird – wenn möglich – der Blutzucker gemessen: Zu wenig Zucker stört das Gehirn.' },
      { id: 'd10', k: 'D', text: 'Die Person reagiert erst, wenn man sie laut anspricht.', warum: 'So prüfen Sie das Bewusstsein (AVPU: V = Voice).' },
      { id: 'd11', k: 'D', text: 'Die Person erkennt ihre Tochter nicht.', warum: 'Die Orientierung zur Person ist gestört: Das Gehirn arbeitet nicht normal.' },
      { id: 'd12', k: 'D', text: 'Krampfanfall: Arme und Beine zucken.', warum: 'Ein Krampfanfall entsteht im Gehirn.' },

      // E – Exposure: Was finde ich am ganzen Körper – und ist er zu kalt oder zu warm?
      { id: 'e1', k: 'E', text: 'Körpertemperatur 34,5 °C (Thermometer)', warum: 'Die Person ist unterkühlt (Hypothermie). Bei E kontrollieren Sie die Körpertemperatur. (Hauttemperatur fühlen → C)' },
      { id: 'e2', k: 'E', text: 'Körpertemperatur 39,4 °C (Thermometer)', warum: 'Die gemessene Körpertemperatur gehört zu E: Ist der Körper zu kalt oder zu warm?' },
      { id: 'e3', k: 'E', text: 'Schwellung am Handgelenk', warum: 'Bei E sehen Sie den ganzen Körper an: Schwellungen, Wunden, Hämatome.' },
      { id: 'e4', k: 'E', text: 'Hämatom an der Hüfte', warum: 'Ein Hämatom (Bluterguss) finden Sie, wenn Sie den ganzen Körper ansehen.' },
      { id: 'e5', k: 'E', text: 'Ein Bein ist kürzer und nach außen gedreht.', warum: 'Eine Fehlstellung finden Sie bei der Untersuchung des ganzen Körpers.' },
      { id: 'e6', k: 'E', text: 'Kleine Schürfwunde am Knie', warum: 'Kleine Wunden gehören zu E. Nur eine starke Blutung ist ein C-Problem.' },
      { id: 'e7', k: 'E', text: 'Rötung am Steißbein (auf dieser Seite hat die Person gelegen)', warum: 'Bei E sehen Sie auch die Seite an, auf der die Person liegt.' },
      { id: 'e8', k: 'E', text: 'Die Hose ist nass vom Urin.', warum: 'Sichtbare Ausscheidungen finden Sie bei E. (Wenig Urin im Urinbeutel → C)' },
      { id: 'e9', k: 'E', text: 'Es riecht nach Stuhl.', warum: 'Gerüche und Ausscheidungen gehören zur Untersuchung des ganzen Körpers.' },
      { id: 'e10', k: 'E', text: 'Den ganzen Körper ansehen: Verletzungen, Schwellungen', warum: 'Das ist E: von Kopf bis Fuß, vorne und hinten.' },
      { id: 'e11', k: 'E', text: 'Nach der Untersuchung zudecken, damit die Person nicht auskühlt', warum: 'Wärme erhalten gehört zu E: Bei der Untersuchung kann der Körper auskühlen.' },
      { id: 'e12', k: 'E', text: 'Beim Abtasten der Hüfte stöhnt die Person vor Schmerz.', warum: 'Schmerzen beim Untersuchen des Körpers gehören zu E. (Schmerzreiz, um das Bewusstsein zu prüfen → D)' }
    ]
  }
};
