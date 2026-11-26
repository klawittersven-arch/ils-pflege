/* Fragen für das Quiz-Rennen im Klassenraum (Beamer + Handys, /quiz-rennen/).
 *
 * Diese Datei liest NUR der Server (worker/src/rennen.js): Er stellt die Fragen und prüft die Antworten.
 * Die Handys bekommen die Lösung erst, nachdem geantwortet wurde.
 *
 * Aufbau eines Fragensatzes
 *   titel       steht groß am Beamer und auf dem Handy
 *   aufgabe     Arbeitsauftrag über jeder Frage
 *   regel       (optional) erste Regel auf dem Handy, z. B. „Sie sehen einen Satz aus einem Gespräch.“
 *   kategorien  die Antwortknöpfe: k (Buchstabe A–Z, je Satz eindeutig), name, kurz, frage (Leitfrage – steht klein auf dem Knopf),
 *               zeichen (optional: angezeigter Buchstabe, wenn zwei Kategorien gleich heißen – SPIKES hat zweimal S)
 *               Farben der Buchstaben: assets/quiz-rennen.css (.k-A … .k-Z)
 *   fragen      id (a–z, 0–9, max. 8 Zeichen, nie wiederverwenden), text, k (richtige Kategorie), warum (Rückmeldung bei Fehler)
 *
 * Am Beamer: …/quiz-rennen/beamer/ (ABCDE) · …/quiz-rennen/beamer/?set=schock · …/quiz-rennen/beamer/?set=spikes
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
  },
  /* Schock-Rennen (KB I, TB 2 Notfallsituationen, 3BFP2): Welche Schockform passt zu Ursache, Befund oder Maßnahme?
   * Begriffe nach Pflegias Band 2: S. 801 (Schockformen: Volumenmangel, anaphylaktisch, neurogen, kardiogen – septisch
   * hier bewusst weggelassen, im Unterricht nur am Rand), S. 811 (keine Schocklagerung bei kardiogenem Schock: Oberkörper hoch),
   * S. 831 (Anaphylaxie: Allergenzufuhr stoppen, Adrenalin). Fälle wie im „Schockform-Detektiv“ der KB-I-Stunden-App. */
  schock: {
    id: 'schock',
    titel: 'Schock-Rennen',
    aufgabe: 'Welche Schockform passt?',
    regel: 'Sie sehen eine Ursache, einen Befund oder eine Maßnahme.',
    kategorien: [
      { k: 'V', name: 'Volumenmangel', kurz: 'hypovolämisch', frage: 'Fehlt Blut oder Flüssigkeit?' },
      { k: 'A', name: 'Anaphylaxie', kurz: 'anaphylaktisch', frage: 'Reagiert der Körper heftig auf einen Stoff (Allergie)?' },
      { k: 'N', name: 'Nerven', kurz: 'neurogen', frage: 'Sind die Nerven gestört, die die Gefäße eng stellen?' },
      { k: 'K', name: 'Herz', kurz: 'kardiogen', frage: 'Pumpt das Herz zu schwach?' }
    ],
    fragen: [
      // V – Volumenmangel: Fehlt Blut oder Flüssigkeit?
      { id: 'shv1', k: 'V', text: 'Starke Blutung am Bein nach einem Sturz', warum: 'Durch den Blutverlust fehlt Blut in den Gefäßen: Volumenmangelschock.' },
      { id: 'shv2', k: 'V', text: 'Die Drainage füllt sich mit hellrotem Blut.', warum: 'Blutverlust nach der Operation: Es fehlt Volumen.' },
      { id: 'shv3', k: 'V', text: 'Seit drei Tagen Brechdurchfall, die Bewohnerin trinkt kaum.', warum: 'Viel Flüssigkeit geht verloren und es kommt kaum etwas nach: Volumenmangel – auch ohne Blutung.' },
      { id: 'shv4', k: 'V', text: 'Großer Durst, trockene Mundschleimhaut', warum: 'Durst und trockene Schleimhäute zeigen: Dem Körper fehlt Flüssigkeit.' },
      { id: 'shv5', k: 'V', text: 'Er erbricht Blut, der Stuhl ist schwarz wie Teer.', warum: 'Blutung im Magen oder Darm: Das Blut fehlt im Kreislauf.' },
      { id: 'shv6', k: 'V', text: 'Große Verbrennung an Brust und Armen', warum: 'Über die verbrannte Haut geht viel Flüssigkeit verloren: Volumenmangel.' },
      { id: 'shv7', k: 'V', text: 'Oberschenkelbruch: Das Bein wird dick, sie wird immer blasser.', warum: 'Bei einem Oberschenkelbruch kann viel Blut ins Gewebe fließen (innere Blutung).' },
      { id: 'shv8', k: 'V', text: 'Sommerhitze: Die Bewohnerin hat tagelang kaum getrunken.', warum: 'Zu wenig Flüssigkeit im Körper: Volumenmangel.' },
      { id: 'shv9', k: 'V', text: 'Erste Maßnahme: die Blutung stillen', warum: 'Wer die Blutung stillt, verhindert, dass noch mehr Volumen verloren geht.' },
      { id: 'shv10', k: 'V', text: 'Nach der Hüft-OP ist der Verband voll Blut, Puls 120/min.', warum: 'Blutverlust nach der Operation, der Puls ist schnell: Volumenmangel.' },

      // A – Anaphylaxie: Reagiert der Körper heftig auf einen Stoff?
      { id: 'sha1', k: 'A', text: 'Wespenstich – kurz danach Quaddeln am ganzen Körper', warum: 'Der Körper reagiert heftig auf das Gift. Hautzeichen kurz nach dem Kontakt: Anaphylaxie.' },
      { id: 'sha2', k: 'A', text: 'Nach dem Erdnuss-Riegel sagt er: „Mein Hals wird so eng.“', warum: 'Allergie auf ein Lebensmittel, die Atemwege schwellen an: Anaphylaxie.' },
      { id: 'sha3', k: 'A', text: 'Kurz nach Beginn der Antibiotika-Infusion juckt die Haut überall.', warum: 'Reaktion auf ein Medikament kurz nach dem Kontakt: Anaphylaxie. Infusion sofort stoppen!' },
      { id: 'sha4', k: 'A', text: 'Lippen und Augenlider schwellen plötzlich an.', warum: 'Plötzliche Schwellungen im Gesicht sind typisch für eine allergische Reaktion.' },
      { id: 'sha5', k: 'A', text: 'Mittel der ersten Wahl: Adrenalin', warum: 'Bei Anaphylaxie ist Adrenalin das Mittel der ersten Wahl (z. B. Autoinjektor aus dem Notfallset).' },
      { id: 'sha6', k: 'A', text: 'Sie stoppen sofort die Zufuhr des Allergens.', warum: 'Die erste Maßnahme bei Anaphylaxie: Allergenzufuhr stoppen, z. B. die Infusion abstellen.' },
      { id: 'sha7', k: 'A', text: 'Nach dem Kontrastmittel: Gesicht rot, Blutdruck fällt', warum: 'Der Körper reagiert auf das Kontrastmittel: Anaphylaxie.' },
      { id: 'sha8', k: 'A', text: 'Nach der neuen Tablette: Quaddeln, Atemnot, Puls 130/min', warum: 'Haut, Atmung und Kreislauf reagieren auf das Medikament: Anaphylaxie.' },
      { id: 'sha9', k: 'A', text: 'Bienenstich, danach Bauchkrämpfe, Blutdruck 80/50 mmHg', warum: 'Bei Anaphylaxie können auch Magen und Darm reagieren – und der Blutdruck fällt.' },
      { id: 'sha10', k: 'A', text: 'Rote, juckende Haut und Atemnot direkt nach einer Spritze', warum: 'Reaktion kurz nach der Spritze mit Haut- und Atemzeichen: Anaphylaxie.' },

      // N – neurogen: Sind die Nerven gestört, die die Gefäße eng stellen?
      { id: 'shn1', k: 'N', text: 'Motorradunfall: Er spürt seine Beine nicht mehr.', warum: 'Das Rückenmark ist verletzt. Die Nerven stellen die Gefäße nicht mehr eng: neurogener Schock.' },
      { id: 'shn2', k: 'N', text: 'Blutdruck niedrig – aber die Haut ist warm und trocken.', warum: 'Die Gefäße sind weit, deshalb ist die Haut warm. Bei Volumenmangel wäre sie blass und kalt, bei Anaphylaxie rot mit Quaddeln.' },
      { id: 'shn3', k: 'N', text: 'Blutdruck 85/50 mmHg – und der Puls ist langsam (50/min).', warum: 'Bei den anderen Schockformen ist der Puls schnell. Ein langsamer Puls passt zum neurogenen Schock.' },
      { id: 'shn4', k: 'N', text: 'Kopfsprung ins flache Wasser: Arme und Beine sind gelähmt.', warum: 'Verletzung der Halswirbelsäule und des Rückenmarks: neurogener Schock.' },
      { id: 'shn5', k: 'N', text: 'Querschnittlähmung nach einem Unfall', warum: 'Das Rückenmark ist verletzt. Die Nerven können die Gefäße nicht mehr eng stellen.' },
      { id: 'shn6', k: 'N', text: 'Wirbelsäule verletzt? Die Person nicht bewegen.', warum: 'Beim neurogenen Schock nach einem Unfall ist oft die Wirbelsäule verletzt – nicht bewegen, keine Schocklagerung.' },
      { id: 'shn7', k: 'N', text: 'Die Nerven, die die Gefäße eng stellen, sind gestört.', warum: 'Das ist die Ursache des neurogenen Schocks: Die Gefäße werden weit, der Blutdruck fällt.' },
      { id: 'shn8', k: 'N', text: 'Nach dem Sturz: Beine gelähmt, Puls 52/min, Haut warm', warum: 'Lähmung, langsamer Puls und warme Haut: neurogener Schock.' },

      // K – kardiogen: Pumpt das Herz zu schwach?
      { id: 'shk1', k: 'K', text: 'Herzinfarkt: Das Herz pumpt zu wenig Blut.', warum: 'Das Herz selbst ist die Ursache: kardiogener Schock.' },
      { id: 'shk2', k: 'K', text: 'Brustschmerz zieht in den linken Arm, Blutdruck fällt', warum: 'Zeichen eines Herzinfarkts: Das Herz kann nicht mehr genug pumpen.' },
      { id: 'shk3', k: 'K', text: 'Gestaute Halsvenen, Atemnot, Puls 124/min', warum: 'Das Blut staut sich vor dem schwachen Herzen (gestaute Halsvenen): kardiogener Schock.' },
      { id: 'shk4', k: 'K', text: 'Keine Schocklagerung: Oberkörper hoch, Herz entlasten', warum: 'Beim kardiogenen Schock würden hochgelegte Beine das schwache Herz zusätzlich belasten.' },
      { id: 'shk5', k: 'K', text: 'Rasselnde Atmung: Wasser staut sich in der Lunge.', warum: 'Das schwache Herz pumpt das Blut nicht weiter. Es staut sich bis in die Lunge.' },
      { id: 'shk6', k: 'K', text: 'Puls 180/min und unregelmäßig, Blutdruck fällt', warum: 'Herzrhythmusstörung: Bei so schnellem, unregelmäßigem Herzschlag pumpt das Herz zu wenig Blut.' },
      { id: 'shk7', k: 'K', text: 'Schwere Herzschwäche, jetzt Blutdruck 80/50 und Atemnot', warum: 'Das kranke Herz schafft es nicht mehr: kardiogener Schock.' },
      { id: 'shk8', k: 'K', text: 'Das Herz ist die Ursache: Es pumpt zu schwach.', warum: 'Das ist der kardiogene Schock.' }
    ]
  },

  /* SPIKES-Rennen (KB II, TB 2 Notfallsituationen, 3BFP2): Zu welchem Schritt gehört der Satz oder die Handlung?
   * SPIKES steht nicht in Pflegias (Landeslehrplan CE 05). Zuordnung wie im KB-II-Arbeitsblatt „Schlechte Nachrichten
   * überbringen“ und der Handy-Übung kb2ab05: vorwarnen = Invitation · Pausen beim Informieren = Knowledge ·
   * Schweigen aushalten = Emotions · Rückruf, Nummer, dokumentieren = Strategy and Summary. */
  spikes: {
    id: 'spikes',
    titel: 'SPIKES-Rennen',
    aufgabe: 'Zu welchem SPIKES-Schritt gehört das?',
    regel: 'Sie sehen einen Satz oder eine Handlung aus einem Gespräch mit Angehörigen.',
    kategorien: [
      { k: 'S', name: 'Setting', kurz: 'Rahmen', frage: 'Ist der Rahmen für das Gespräch vorbereitet?' },
      { k: 'P', name: 'Perception', kurz: 'Wissensstand', frage: 'Was weiß die Person schon?' },
      { k: 'I', name: 'Invitation', kurz: 'Einladung', frage: 'Vorwarnen: Wie viel möchte die Person wissen?' },
      { k: 'K', name: 'Knowledge', kurz: 'Wissen', frage: 'Sage ich es klar und in kleinen Schritten?' },
      { k: 'E', name: 'Emotions', kurz: 'Gefühle', frage: 'Gehe ich auf die Gefühle ein?' },
      { k: 'Z', zeichen: 'S', name: 'Strategy and Summary', kurz: 'Plan und Zusammenfassung', frage: 'Wie geht es weiter?' }
    ],
    fragen: [
      // S – Setting: Rahmen vorbereiten, vorstellen, Zeit klären
      { id: 'sps1', k: 'S', text: 'Sie gehen für das Gespräch in einen ruhigen Raum.', warum: 'Setting: Den Rahmen vorbereiten – ein ruhiger, ungestörter Ort.' },
      { id: 'sps2', k: 'S', text: 'Sie stellen sich mit Namen und Funktion vor.', warum: 'Setting: Zum Rahmen gehört, dass Sie sich vorstellen.' },
      { id: 'sps3', k: 'S', text: '„Können Sie gerade in Ruhe sprechen?“', warum: 'Setting: Klären, ob die Person gerade Zeit hat und sprechen kann.' },
      { id: 'sps4', k: 'S', text: 'Sie schalten Ihr Diensttelefon auf lautlos.', warum: 'Setting: Störungen vermeiden.' },
      { id: 'sps5', k: 'S', text: 'Sie legen die Unterlagen bereit, bevor Sie anrufen.', warum: 'Setting: Gut vorbereitet ins Gespräch gehen.' },
      { id: 'sps6', k: 'S', text: 'Sie setzen sich zu der Angehörigen auf Augenhöhe.', warum: 'Setting: Ein guter Rahmen – Sie nehmen sich Zeit und sind auf Augenhöhe.' },
      { id: 'sps7', k: 'S', text: 'Sie fragen, ob jemand beim Gespräch dabei sein soll.', warum: 'Setting: Klären, wer beim Gespräch dabei ist.' },

      // P – Perception: Was weiß die Person schon?
      { id: 'spp1', k: 'P', text: '„Was wissen Sie schon über den Unfall?“', warum: 'Perception: Erst fragen, was die Person schon weiß.' },
      { id: 'spp2', k: 'P', text: '„Was hat man Ihnen heute schon erzählt?“', warum: 'Perception: Den Wissensstand erfragen.' },
      { id: 'spp3', k: 'P', text: '„Wie haben Sie Ihre Mutter in den letzten Tagen erlebt?“', warum: 'Perception: Was hat die Angehörige selbst schon bemerkt?' },
      { id: 'spp4', k: 'P', text: 'Sie hören zuerst zu, was die Angehörige schon vermutet.', warum: 'Perception: Erst zuhören, dann informieren.' },
      { id: 'spp5', k: 'P', text: '„Hat man Sie heute schon angerufen?“', warum: 'Perception: Klären, ob die Person schon informiert ist.' },
      { id: 'spp6', k: 'P', text: '„Was denken Sie, warum ich Sie anrufe?“', warum: 'Perception: Erfragen, was die Person schon ahnt.' },
      { id: 'spp7', k: 'P', text: '„Was haben die Ärzte Ihnen gestern gesagt?“', warum: 'Perception: Den Wissensstand erfragen, bevor Sie Neues sagen.' },

      // I – Invitation: vorwarnen, wie viel möchte die Person wissen?
      { id: 'spi1', k: 'I', text: '„Ich muss Ihnen leider etwas Ernstes sagen.“', warum: 'Invitation: Vorwarnen – die Person kann sich innerlich vorbereiten.' },
      { id: 'spi2', k: 'I', text: '„Möchten Sie, dass ich Ihnen alles genau erkläre?“', warum: 'Invitation: Klären, wie viel die Person wissen möchte.' },
      { id: 'spi3', k: 'I', text: '„Wie ausführlich soll ich es Ihnen erzählen?“', warum: 'Invitation: Die Person entscheidet, wie viel sie hören möchte.' },
      { id: 'spi4', k: 'I', text: '„Leider habe ich keine guten Nachrichten.“', warum: 'Invitation: Ein Satz zur Vorwarnung, bevor die Nachricht kommt.' },
      { id: 'spi5', k: 'I', text: 'Sie kündigen an, dass jetzt eine schwere Nachricht kommt.', warum: 'Invitation: Vorwarnen.' },
      { id: 'spi6', k: 'I', text: '„Möchten Sie lieber, dass ich mit Ihrem Bruder spreche?“', warum: 'Invitation: Manche möchten nicht alles selbst hören – fragen, wer informiert werden soll.' },
      { id: 'spi7', k: 'I', text: '„Darf ich Ihnen jetzt sagen, was passiert ist?“', warum: 'Invitation: Um Erlaubnis fragen, bevor Sie die Nachricht sagen.' },

      // K – Knowledge: in kleinen Schritten, einfache, eindeutige Worte, Pausen
      { id: 'spk1', k: 'K', text: '„Ihre Mutter ist gestürzt. Sie ist jetzt im Krankenhaus.“', warum: 'Knowledge: Die Nachricht selbst – kurz, klar, in kleinen Schritten.' },
      { id: 'spk2', k: 'K', text: 'Sie sagen die Nachricht in kurzen, einfachen Sätzen.', warum: 'Knowledge: Einfache Worte und kurze Sätze.' },
      { id: 'spk3', k: 'K', text: 'Sie benutzen keine Fachwörter.', warum: 'Knowledge: Verständlich informieren – ohne Fachsprache.' },
      { id: 'spk4', k: 'K', text: 'Sie sagen die Nachricht in kleinen Schritten, mit Pausen.', warum: 'Knowledge: Kleine Schritte und Pausen, damit die Person folgen kann. (Schweigen aushalten, wenn jemand weint → Emotions)' },
      { id: 'spk5', k: 'K', text: '„Konnten Sie mir folgen?“', warum: 'Knowledge: Prüfen, ob die Information angekommen ist.' },
      { id: 'spk6', k: 'K', text: '„Sie hat sich die Hüfte gebrochen.“ – statt „Da ist was passiert.“', warum: 'Knowledge: Eindeutige Worte statt Andeutungen.' },
      { id: 'spk7', k: 'K', text: '„Die Ärztin hat einen Bruch am Oberschenkel festgestellt.“', warum: 'Knowledge: Die Information klar weitergeben.' },

      // E – Emotions: Gefühle ansprechen, Schweigen aushalten
      { id: 'spe1', k: 'E', text: '„Das ist ein großer Schreck für Sie.“', warum: 'Emotions: Das Gefühl wahrnehmen und ansprechen.' },
      { id: 'spe2', k: 'E', text: 'Die Tochter weint. Sie sagen nichts und warten.', warum: 'Emotions: Weinen und Schweigen aushalten.' },
      { id: 'spe3', k: 'E', text: '„Ich höre, dass Sie sich große Sorgen machen.“', warum: 'Emotions: Die Sorge ansprechen.' },
      { id: 'spe4', k: 'E', text: '„Sie machen sich Vorwürfe.“ Dann lassen Sie ihm Zeit.', warum: 'Emotions: Das Gefühl benennen und Zeit lassen.' },
      { id: 'spe5', k: 'E', text: 'Der Sohn schreit wütend. Sie bleiben ruhig und hören zu.', warum: 'Emotions: Auch Wut ist eine Reaktion auf die Nachricht – ruhig bleiben, zuhören.' },
      { id: 'spe6', k: 'E', text: '„Es ist ganz normal, dass Sie jetzt so reagieren.“', warum: 'Emotions: Die Gefühle annehmen.' },
      { id: 'spe7', k: 'E', text: 'Die Angehörige schweigt lange. Sie halten die Stille aus.', warum: 'Emotions: Schweigen aushalten.' },

      // S – Strategy and Summary: zusammenfassen, nächste Schritte, Rückruf, dokumentieren
      { id: 'spz1', k: 'Z', text: '„Ich fasse kurz zusammen: …“', warum: 'Strategy and Summary: Am Ende zusammenfassen.' },
      { id: 'spz2', k: 'Z', text: '„Hier ist die Nummer der Station.“', warum: 'Strategy and Summary: Eine Ansprechperson nennen.' },
      { id: 'spz3', k: 'Z', text: '„Ich rufe Sie heute Abend noch einmal an.“', warum: 'Strategy and Summary: Den nächsten Schritt vereinbaren (Rückruf).' },
      { id: 'spz4', k: 'Z', text: '„Was brauchen Sie jetzt? Soll jemand zu Ihnen kommen?“', warum: 'Strategy and Summary: Gemeinsam planen, wie es weitergeht.' },
      { id: 'spz5', k: 'Z', text: 'Sie besprechen, wann der Sohn in die Klinik fahren kann.', warum: 'Strategy and Summary: Die nächsten Schritte besprechen.' },
      { id: 'spz6', k: 'Z', text: 'Nach dem Telefonat dokumentieren Sie das Gespräch.', warum: 'Strategy and Summary: Zum Abschluss gehört die Dokumentation.' },
      { id: 'spz7', k: 'Z', text: '„Haben Sie noch Fragen?“ Dann verabschieden Sie sich.', warum: 'Strategy and Summary: Offene Fragen klären und das Gespräch abschließen.' }
    ]
  }
};
