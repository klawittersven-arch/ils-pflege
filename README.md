# ILS-Aufträge Pflege – interaktive Übungen

Übungsseiten zu ILS-Aufträgen der Pflegeausbildung (Karoline-Breitinger-Schule, Klassen 3BFP2/1 und 3BFP2/2).
Die Seiten werden über GitHub Pages veröffentlicht und über QR-Codes auf den gedruckten Arbeitsblättern aufgerufen.

- `dk/`, `spk/` – ILS-Aufträge „Transurethraler Dauerkatheter“ und „Suprapubischer Katheter“ (2026, mit Bausteinen
  und persönlicher ID per E-Mail; **ohne** Server – daran hat sich nichts geändert)
- `drainage/` – ILS-Auftrag „Wunddrainagen: Redon- und Robinson-Drainage“ (Lernmodus, 5 Übungen + Abschlussquiz)
- `me/` – ILS-Auftrag „Materialentfernung und pflegerische Nachsorge“ (Lernmodus, 5 Übungen + Abschlussquiz)
- `arbeitsblatt/` – Arbeitsblätter (Word + PDF) und Lehrkraft-Informationen zu den beiden neuen Aufträgen
- `probe/` – Probe-Auftrag zum Testen der Anmeldung (zeigt alle Aufgabentypen)
- `lehrkraft/` – Lehrkraft-Übersicht: Wer hat welche Übung erledigt? (mit Passwort, nirgends verlinkt)
- `assets/` – gemeinsames Design, Quiz-Logik (`ils.js`), Anmeldung (`ils-konto.js`), Auftragsliste (`auftraege.js`)
- `worker/`, `wrangler.jsonc` – Cloudflare-Worker (Server) für die Anmeldung und den Fortschritt
- `tools/` – Skripte, die Seiten, Grafiken und Arbeitsblätter erzeugen
- `tests/` – automatischer Ende-zu-Ende-Test (Playwright, lokaler Worker)

---

## ILS mit Anmeldung (ab November 2026)

Statt Bausteine abzuschreiben und eine ID per E-Mail zu schicken, melden sich die SuS **einmal pro Gerät** an:
Klasse antippen, Vorname, Geburtstag. Danach wird jede bestandene Übung automatisch eingetragen.
Auf **`/lehrkraft/`** sehen Sie eine Tabelle: wer welche Übung wann erledigt hat, wer abgeschlossen hat,
wer noch nie angemeldet war.

- **Anmeldung:** Der Geburtstag wird mit der Klassenliste abgeglichen. Beim Vornamen genügt der richtige
  Anfangsbuchstabe (Schreibvarianten wie „Mohamed/Mohammed“ stören nicht); haben zwei Personen einer Klasse
  denselben Geburtstag, entscheidet der Vorname.
- **Ohne Internet** bleibt das Ergebnis auf dem Handy und wird automatisch nachgereicht.
- **Abschlussquiz** wird erst freigeschaltet, wenn alle Übungen erledigt sind.
- **Schutz:** 40 falsche Anmeldungen in einer Klasse innerhalb von 10 Minuten → diese Klasse 10 Minuten gesperrt.
  10 falsche Lehrkraft-Passwörter in 15 Minuten → Lehrkraft-Seite 15 Minuten gesperrt.

### Einrichtung (einmalig, ca. 10 Minuten – wie bei Tetris und kb1-diabetes)

**1. Worker mit GitHub verbinden**

1. https://dash.cloudflare.com öffnen → links **Workers & Pages** → **Create** → **Import a repository**.
2. GitHub-Konto **klawittersven-arch**, Repository **ils-pflege** wählen
   (fehlt es: über „Configure GitHub App“ der Cloudflare-App Zugriff auf `ils-pflege` geben).
3. **Project name `ils-pflege`** (genau so), Build command leer, Deploy command `npx wrangler deploy`,
   Root directory `/` → **Deploy**.
4. Nach ca. 1 Minute zeigt https://ils-pflege.klawittersven.workers.dev
   `{"dienst":"ILS Pflege – Fortschritt","ok":true,"passwortGesetzt":false}`.

**2. Passwort für die Lehrkraft-Seite festlegen**

1. Im Cloudflare-Dashboard: **Workers & Pages → ils-pflege → Settings → Variables and Secrets → Add**.
2. Type **Secret**, Variable name **`LEHRKRAFT_PASSWORT`**, Value: ein Passwort Ihrer Wahl → **Deploy**.
3. Die Adresse oben zeigt jetzt `"passwortGesetzt":true`. Das Passwort steht nirgends im Code;
   ändern können Sie es jederzeit an derselben Stelle.

**3. Klassenliste eintragen**

1. https://klawittersven-arch.github.io/ils-pflege/lehrkraft/ öffnen, mit dem Passwort anmelden.
2. Unten **Verwaltung → Klassenliste einfügen**: eine Zeile pro Person
   `Klasse;Vorname N.;TT.MM.JJJJ` (z. B. `3BFP2/1;Lena M.;05.09.2004`) → **Übernehmen**.
   Spalten aus Excel (mit Tabulator) gehen auch.
3. **Die Klassenliste gehört nie in dieses Repository** – es ist öffentlich.

**4. Testen:** https://klawittersven-arch.github.io/ils-pflege/probe/ am Handy öffnen, anmelden, Probe-Übungen
lösen – auf der Lehrkraft-Seite erscheint der Haken (Auftrag „Probe-Auftrag“ wählen).

### Im Alltag (Lehrkraft-Seite)

- **ILS-Auftrag** und **Klasse** oben wählen. Die Seite aktualisiert sich alle 30 Sekunden.
- **Klick auf ein Feld** trägt eine Übung von Hand ein (z. B. analog vorgezeigt) oder entfernt den Haken.
- **„Wer fehlt noch?“** → fertiger Text mit allen Namen, die noch nicht abgeschlossen haben (z. B. für die PPT).
- **„Excel-Datei (CSV)“** → Tabelle mit Datum je Übung und Quiz-Punkten.
- **Verwaltung:** Personen nachtragen (einfach eine Zeile importieren), alle Geräte einer Person abmelden
  (verlorenes Handy), Person löschen, Fortschritt eines Auftrags löschen, **alles löschen**
  (z. B. am Schuljahresende). Automatisch gelöscht wird nichts.

### Datenschutz

- Gespeichert werden (beim Cloudflare-Worker, in einem „Durable Object“): Klasse, Anzeigename („Vorname N.“),
  ein **Prüfwert** des Geburtsdatums (HMAC-SHA-256 mit einem geheimen Schlüssel, der den Server nie verlässt –
  das Datum selbst wird nicht gespeichert), Zeitpunkt der ersten Anmeldung und welche Übung wann bestanden wurde
  (beim Abschlussquiz mit Punktzahl). **Einzelne Antworten werden nicht personenbezogen gespeichert.**
- **Anonyme Fehlerstatistik (seit 17.11.2026):** Nach jeder Aufgabe meldet das Handy, ob sie gelöst wurde, wie viele
  Fehler es gab und welche falschen Antworten getippt wurden (als Kennung, z. B. „Begriff 2 → Spalte S“). Der Server
  addiert das nur zu Summen je Aufgabe (`stat:<ils>:<schritt>`), **ohne Person, Klasse oder Zeitpunkt der einzelnen Antwort**.
  Senden dürfen nur angemeldete Geräte (damit niemand Fantasiezahlen schickt). Lehrkraft-Seite: **📊 Schwierige Aufgaben**
  (mit Klartext der Aufgaben, den die Seite aus den Übungsseiten liest), „Statistik zurücksetzen“; „Fortschritt eines
  Auftrags löschen“ und „Alles löschen“ löschen sie mit. Ändert man eine Aufgabe, beginnt ihre Zählung neu.
  Test: `node tests/statistik.test.js`.
- Lesen kann nur, wer das Lehrkraft-Passwort kennt. Cloudflare-Protokolle sind abgeschaltet.
- Hinweis: Die Haken werden vom Handy gemeldet. Wer sich mit Technik auskennt, könnte einen Haken auch ohne
  Übung setzen – wie früher beim Weitergeben von Bausteinen. Für ILS-Aufträge ist das vertretbar.

### Einen neuen ILS-Auftrag anlegen

1. In `assets/auftraege.js` einen Eintrag ergänzen (`id`, `titel`, `pfad`, `schritte` – der letzte Schritt
   mit `abschluss: true`).
2. Seiten anlegen (Vorlage: `probe/`):
   - Übersicht: `ILSKonto.uebersicht({ mount: '#app', ils: 'drainage' })`
   - Übung: `ILSKonto.uebung({ mount: '#app', ils: 'drainage', schritt: '1', questions: [...], pass: 1.0, intro: '…' })`
   - Abschluss: `ILSKonto.abschluss({ mount: '#app', ils: 'drainage', schritt: 'quiz', fragen: () => [...], pass: 0.8 })`
   Fragetypen: siehe Kommentar in `assets/ils.js` (mc, tf, select, order, errors).
3. Die Lehrkraft-Tabelle bekommt die Spalten automatisch.

### Tests

```
(cd worker && npm install)
node tests/ablauf.test.js            # 53 Prüfungen; Bildschirmfotos: BILDER=/pfad node tests/ablauf.test.js
```

Der Test startet den Worker lokal (`wrangler dev`) mit erfundenen Namen und prüft Import, Anmeldung,
Schreibvarianten, Übungen, Sperre des Abschlussquiz, Offline-Nachreichen, Lehrkraft-Tabelle, „Wer fehlt noch?“,
CSV, Haken von Hand, Abmelden, Löschen, Sperren nach Fehlversuchen und dass DK/SPK unverändert laufen.

---

## DK und SPK (Bausteine + ID, ohne Server)

Die Lösungswörter (Bausteine) liegen nicht in diesem Repository.

```
python3 tools/grafiken.py                 # Grafiken (SVG)
python3 tools/seiten.py                   # Übungsseiten (braucht tools/bausteine.json)
python3 tools/ab_dk.py VORLAGE.docx AB.docx
```

---

## Lernmodus (assets/ils-lern.js) – Schutz gegen Raten und Durchklicken

Neue ILS-Übungen laufen im Lernmodus (`ILSLern.uebung({...})`, Beispiel: `probe/`, erzeugt mit `tools/probe_bau.py`):

- **Eine Aufgabe nach der anderen**, sofortige Rückmeldung mit Erklärung. Pro Durchgang werden Aufgaben aus einem
  größeren Pool gezogen (Varianten über `gruppe`, feste über `fest`).
- **Fehlerbudget** (Standard 4 ❤️): Beim 5. Fehler (Abschlussquiz: beim 3.) Lesepause von 30 s mit Hinweis auf
  die Stellen im Arbeitsblatt, danach Neustart mit neu gezogenen Aufgaben. Jeder Fehlklick zählt – auch bei der
  Reihenfolge, im Lückentext und beim Bild. **Beim Sortieren zählt je Begriff nur der erste Fehlklick** (weitere Versuche
  beim selben Begriff kosten kein Herz) – sonst kostet ein unsicherer Begriff bei vier Spalten bis zu drei Herzen.
- **Tempo-Kontrolle (seit 17.11.2026 gelockert):** Jede Aufgabe hat eine Lesezeit: 0,8 s + 0,1 s je Wort (≈ 600 Wörter/Minute,
  schnelles Lesen), höchstens 6 s; gezählt werden Frage und Antwortmöglichkeiten, beim Lückentext nur der Text bis zur
  ersten Lücke. Folgeschritte (nächster Begriff, Begründung): 0,3 s + 0,06 s je Wort.
  - **Richtige Antworten zählen immer**, auch wenn sie vor Ablauf der Lesezeit kommen – schnelle Leser werden nicht ausgebremst.
  - **Schnell und falsch** (vor Ablauf der Lesezeit) = geraten: zählt als Fehler **und** gibt eine Warnung.
  - **Unmöglich schnell** (unter 35 % der Lesezeit): zählt nicht, Warnung („Langsam!“) – Schutz gegen Durchklicken.
  - Nach 3 Warnungen 15 s Lesepause, danach geht es weiter (kein Neustart): mit derselben Aufgabe bzw. – wenn die
    3. Warnung bei einer abgeschlossenen Aufgabe kam – mit der nächsten. Test: `node tests/tempo.test.js`.
  - Die Challenge hat weiterhin keine Lesezeit.
- **Feste Reihenfolge der Antworten** (`behalten`) nur, wenn die richtige Antwort dann nicht immer oben steht (prüft der Inhaltstest).
- **Nach einem Fehler** bleibt die Erklärung 4 Sekunden stehen, bevor „Weiter“ geht.
- **Sortieren ohne Muster:** Die Begriffe werden zufällig gemischt, durchschaubare Reihenfolgen werden aber verworfen
  (bei zwei Kategorien kein ständiges Links-rechts-Wechseln und nicht „erst alle links, dann alle rechts“; nie mehr als
  3 Begriffe derselben Kategorie hintereinander). Gilt auch in der Challenge; der Inhaltstest prüft es je Aufgabe.
- **Antwortlängen:** Die richtige Antwort ist höchstens 20 % länger als die längste falsche und je Auftrag in höchstens
  40 % der Fälle die längste (bzw. kürzeste) – Prüfung: `python3 tools/laengen_check.py` und Inhaltstest.
- **Zwischenstand** (aktuelle Aufgabe, Fehler, laufende Lesepause, Schreibzeit) bleibt auf dem Gerät gespeichert.
- **Examens-Training** (optional `schreiben`, mit `muster` = Musterantwort mit konkretem Fallbezug, die vor der
  Checkliste erscheint): Schreibauftrag auf Papier mit Mindestzeit (`minSek`, in beiden Aufträgen 30 s), danach Checkliste
  (Erwartungshorizont) zum Selbstabhaken, Hinweis auf Eigenverantwortung und E-Mail an die Lehrkraft mit Betreff.
- **Abschlussquiz** (`abschluss: true`): erst nach allen Übungen – das prüft auch der Server.
- **Lehrkraft-Tabelle:** ⚠n = Neustarts wegen Fehlern, ⏳n = Tempo-Warnungen (unmöglich schnell oder schnell und falsch), ✍x/y = selbst abgehakte Punkte im Examens-Training.

Aufgabentypen: `wahl`, `rf` (mit Begründung), `mehrfach`, `reihe`, `sortieren` (auch PESR, Ampel), `zahl`,
`luecke`, `bild` (Stellen im SVG antippen), `dialog` (Fallentscheidung oder Gespräch) – Felder siehe Kopf von
`assets/ils-lern.js`. Lückentext: `tausch: [["Datum", "Uhrzeit"]]` für Wörter, deren Reihenfolge egal ist („Datum und
Uhrzeit“ = „Uhrzeit und Datum“). Bild: `auch: ["nagel"]` an einem Ziel für weitere Stellen, die ebenfalls richtig sind.
Zahl: Es zählt die letzte Zahl der Eingabe („125 - 90 = 35“ → 35).

### Neu erzeugen (Wunddrainagen und Materialentfernung)

```
python3 tools/grafiken_drainage.py && python3 tools/grafiken_me.py   # nur wenn sich Grafiken ändern
python3 tools/alles_bauen.py                                         # alle Smartphone-Seiten + assets/version.json
python3 tools/ab_drainage.py && python3 tools/lehrkraft_drainage.py  # Arbeitsblatt + Lehrkraft-Info
python3 tools/ab_me.py && python3 tools/lehrkraft_me.py
node tests/inhalt.test.js            # spielt jede Aufgabe aller Pools einmal durch
node tests/tempo.test.js             # Tempo-Kontrolle: richtig zählt, schnell + falsch = Warnung
```

Die Inhalte stehen in `tools/drainage_inhalt.py` und `tools/me_inhalt.py`. Mit (⚑) markierte Stellen stammen nicht aus
Pflegias (Standardwissen) – die Markierung ist für die SuS unsichtbar und in den Lehrkraft-Informationen aufgelistet.
`tools/alles_bauen.py [version]` setzt in allen Seiten dieselbe Version (Cache-Bremse, ohne Angabe Datum + Uhrzeit) und
schreibt sie nach `assets/version.json`. **Selbst-Aktualisierung:** Offene Seiten auf den Handys fragen beim Öffnen und
beim Zurückholen des Tabs (höchstens einmal pro Minute) `assets/version.json` ab und laden sich bei einer neueren
Fassung einmal selbst neu – der Zwischenstand bleibt erhalten. Test: `node tests/version.test.js`.

## ILS-Challenge (Highscore) – nach dem Abschlussquiz

Wer das Abschlussquiz bestanden hat, kann freiwillig die **ILS-Challenge** spielen (`drainage/challenge/`, `me/challenge/`),
beliebig oft – wie die Klausur-Challenge der Lernkarten:

- **20 Aufgaben** aus allen Übungen des Auftrags (je Übung 3, aus dem Abschlussquiz 5), zufällige Reihenfolge.
  Aufgaben, die das Arbeitsblatt brauchen (Drainageprotokoll, Anordnung), sind ausgenommen.
- **Punkte:** 150 je Aufgabe, bei mehrschrittigen Aufgaben anteilig (jeder Fehlklick kostet, beim Sortieren nur der erste je Begriff). **Zeitbonus** bis 750 Punkte,
  sinkt in 15 Minuten linear auf 0 und zählt nur anteilig zu den richtigen Antworten. Die **Zeit misst der Server**;
  ein Durchgang unter 2 Sekunden je Aufgabe (40 s für 20 Aufgaben) wird nicht gewertet (Schutz gegen Manipulation).
  **Keine Mindest-Lesezeit** in der Challenge: Richtige Antworten zählen sofort – Tempo bringt Zeitbonus. Raten lohnt
  sich trotzdem nicht, weil falsche Antworten 0 Punkte bringen und der Bonus nur anteilig zu den richtigen zählt.
- **Lösungen erst am Ende**, dazu Punkte je Abschnitt (schwächster oben) mit Verweis aufs Arbeitsblatt.
- **Bestenliste je ILS-Auftrag und Klasse** mit Vorname + Initial (Top 10, eigener Platz). Es zählt das beste Ergebnis.
  In der Übersicht steht **von Anfang an** der Knopf „🏆 Highscore Ihrer Klasse ansehen“ (`challenge/#bestenliste`),
  nach dem Abschluss direkt unter dem Challenge-Knopf. Ansehen geht schon vor der Freischaltung, mitspielen erst danach.
- **Lehrkraft-Seite:** Spalte „🏁 Challenge“ (auch in der CSV) und **🏆 Siegerehrung** am Beamer: Treppchen 2 – 1 – 3,
  Plätze 4–12, Konfetti. Tasten **F** Vollbild, **R**/Leertaste nochmal, **Esc** schließen. Ohne gewählte Klasse wird sie zuerst abgefragt.
- „Fortschritt eines Auftrags löschen“, „Person löschen“ und „Alles löschen“ löschen auch die Challenge-Ergebnisse und Siegerwappen.
- Test: `node tests/challenge.test.js`

### Live-Rennen am Beamer

Für ILS im Klassenraum: Lehrkraft-Seite → ILS-Auftrag und Klasse wählen → **🏁 Live-Rennen**.

- Jede Person hat eine Bahn mit Namen: Start → Ü1 … Ü5 → 🏁 Ziel (Abschlussquiz). Die Figur rückt mit jeder erledigten
  Übung vor und auch **innerhalb** einer Übung: Das Handy meldet bei jedem Wechsel kurz den Stand
  (`POST /api/live` { ils, schritt, phase, i, n } – z. B. „Ü3 · Aufgabe 4/8“, „⏸ Lesepause“, „✍️ schreibt“).
  Aktualisierung alle 5 Sekunden; wer vorne liegt, rutscht nach oben (Überhol-Animation).
- **▶ Rennen starten** setzt die Uhr auf 0 (gespeichert nur im Browser der Lehrkraft, je Auftrag und Klasse; im Hintergrund läuft nichts). **⏹ Rennen beenden** setzt sie zurück. Gewertet werden
  nur Zieleinläufe ab dem Start; wer schon vorher fertig war, steht als „schon vorher fertig“ ohne Platz in der Liste.
- Jeder neue Zieleinlauf wird groß eingeblendet („Anna A. ist im Ziel – Platz 2!“) mit Konfetti; rechts die Zielliste.
- **🔟 Nur Top 10** (Taste T): nur die ersten 10 Bahnen, dafür größer; wer nach vorn kommt, gleitet ins Bild (Wahl wird im Browser gemerkt).
- **🏆 Siegerehrung Top 5**: Treppchen 2–1–3, dann Plätze 4 und 5, mit Zeit seit dem Start. Tasten: F Vollbild,
  R nochmal, Esc zurück/schließen.
- Speicher im Worker: `live:<ils>:<sid>` = { schritt, phase, i, n, um } (wird mit Person/Auftrag gelöscht).
- Test: `node tests/rennen.test.js`

### Siegerwappen

Wer ein Challenge-Ergebnis hat, darf mit dem Finger ein kleines **Siegerwappen** malen (je ILS-Auftrag eines, jederzeit neu malbar).
Es erscheint neben dem Namen in der Bestenliste der Klasse.

- Malfläche mit 9 Farben (Weiß = Radierer), 3 Strichstärken, Rückgängig, Neu. Gespeichert wird ein PNG mit 128 × 128 Pixeln
  (meist 3–15 KB). Der Server nimmt nur echte PNG-Bilder zwischen 32 und 128 Pixeln und bis ca. 30 KB an – kein Text, kein SVG.
  Ohne Internet wird das Wappen auf dem Handy gemerkt und beim nächsten Öffnen der Challenge-Seite gesendet.
- **Sofort sichtbar** für die Klasse (Vertrauen statt Vorabkontrolle). Die Lehrkraft-Seite zeigt neue Wappen an:
  Knopf **🛡️ Siegerwappen (2 neu)**, in der Tabelle „🛡️ neu“.
- **Galerie** (Knopf 🛡️ Siegerwappen): alle Wappen des gewählten Auftrags/der Klasse, neue zuerst. Je Wappen
  „✓ Angesehen“, „Löschen“ (Person kann neu malen) und „Vom Malen ausschließen“ (löscht alle Wappen der Person, kein neues möglich;
  „Wieder zulassen“ in der Galerie oder unter Verwaltung → Einzelne Person → „Siegerwappen: Malen aus/an“). In der Tabelle: 🚫.
- Die **🏆 Siegerehrung** am Beamer zeigt **nur Wappen, die Sie als angesehen markiert haben** – ein frisch gemaltes Bild
  landet also nie ungeprüft an der Wand.
- Speicher im Worker: `w:<ils>:<sid>` = { bild, um, gesehen }, `wsperre:<sid>`.

### Galeriegang (wöchentlich am Beamer)

Lehrkraft-Seite → **🖼️ Galeriegang** (neben „🛡️ Siegerwappen“): die Siegerwappen einer Klasse feierlich und groß.

- Samtvorhang mit Startkarte („4 Kunstwerke hängen in der Galerie, davon 1 neu“), dann öffnet sich der Vorhang und man
  „geht“ die Galeriewand entlang: ein Werk nach dem anderen im Scheinwerferlicht, in Gold-, Nussbaum- oder Silberrahmen
  mit Passepartout und Messing-Namensschild (Vorname N., ILS-Auftrag, Monat). Am Ende alle Werke im Saal mit
  „Danke an alle Künstlerinnen und Künstler!“.
- Gezeigt werden – wie bei der Siegerehrung – **nur Wappen, die Sie als angesehen markiert haben**, aus allen ILS-Aufträgen
  der gewählten Klasse (ohne gewählte Klasse wird sie zuerst abgefragt). Noch nicht freigegebene werden auf der Startkarte gezählt.
- **Nur die neuen:** Der Browser merkt sich, welche Werke in dieser Klasse schon gezeigt wurden; neu gemalte oder neu
  freigegebene Wappen tragen „✨ Neu“ und lassen sich allein zeigen – ideal für den wöchentlichen Stundenbeginn.
- Tasten: **← →** blättern, **Leertaste** Pause, **T** Tempo (langsam 9 s / normal 6,5 s / schnell 4 s je Werk),
  **G** alle Werke, **R** von vorn, **F** Vollbild, **Esc** schließen. Die Knöpfe blenden sich aus, wenn die Maus ruht.
- Test: `node tests/galerie.test.js`

---

## Quiz-Rennen im Klassenraum (z. B. „ABCDE-Rennen“) – Beamer + Handys, ohne Anmeldung

Für das Ende einer Stunde: Am Beamer **https://klawittersven-arch.github.io/ils-pflege/quiz-rennen/beamer/** öffnen.
QR-Code und Rennen stehen auf **demselben Bildschirm** – wer später kommt oder dessen Handy ausfällt, scannt einfach (neu).

- **Handy:** QR-Code scannen (oder `…/ils-pflege/quiz-rennen/` öffnen und den 4-stelligen Code eingeben), Vorname +
  Anfangsbuchstabe des Nachnamens eingeben → am Start warten (mit den Leitfragen) → Countdown 5-4-3-2-1 → Karten zuordnen (z. B. A–E).
- **Regel:** Wer zuerst die eingestellten *richtigen Antworten hintereinander* schafft (5, 8, **10**, 12, 15 oder 20), ist im Ziel.
  **Ein Fehler → zurück auf 0**; das Handy zeigt die richtige Lösung, die Begründung und die Leitfrage („Weiter“ erst nach 3 s).
  Falsch beantwortete Befunde kommen nach 2–4 anderen Fragen wieder.
- **⏱ Zeitlimit** (Standard: an, am Beamer neben dem Ziel abschaltbar): kurze Befunde bis 20 Zeichen **3 Sekunden**,
  je weiteres Zeichen 0,08 s mehr (die längsten Sätze gut 6 s; `zeitLimit()` in worker/src/rennen.js). Auf dem Handy läuft
  ein Balken ab; zu langsam → wie ein Fehler zurück auf 0 mit Lösung. Am Beamer „⏱ zu langsam → 0“, in „Häufige Fehler“ getrennt gezählt.
- **Schutz gegen Raten:** Knöpfe erst nach einer kurzen Lesezeit frei („Erst lesen, dann tippen“); der Server prüft die
  Antworten selbst, die Lösung kommt erst nach der Antwort aufs Handy, Neuladen überspringt keine Frage.
- **Beamer:** Bahnen wie im ILS-Live-Rennen (Pixel-Schwester), bei einem Fehler blinkt die Bahn rot und die Figur läuft
  zurück zum Start; gelber Strich = beste Serie. Zieleinlauf mit Einblendung und Konfetti, **🏆 Siegerehrung** Top 5,
  **📊 Häufige Fehler** (anonym, für die Nachbesprechung: welcher Befund wie oft falsch und mit welchem Buchstaben verwechselt).
  ▶ Start / ⏹ Beenden / ▶ Neues Rennen (alle wieder auf 0, Namen bleiben). Name anklicken = Person herausnehmen.
  **🧹 Neue Klasse** löscht alles und erzeugt einen neuen QR-Code. Tasten: **F** Vollbild, **T** nur Top 10, **Q** QR klein/groß.
- **Wiedereinstieg:** Neuladen am selben Handy → gleiche Bahn. Neues Handy mit gleichem Namen → übernimmt die Bahn,
  wenn das alte Gerät seit 1 Minute still ist (vorher: „Name schon im Rennen“).
- **Datenschutz:** gespeichert werden nur „Vorname N.“ und der Spielstand, je Raum in einem eigenen Durable Object
  (`Rennen`, worker/src/rennen.js). Der Raum **löscht sich 3 Stunden nach der letzten Aktivität selbst**.
- **Fragensätze** (`assets/quiz-rennen-fragen.js`, liest nur der Server) – am Beamer öffnen mit:
  - **ABCDE-Rennen** (60 Befunde, A–E): https://klawittersven-arch.github.io/ils-pflege/quiz-rennen/beamer/
  - **Schock-Rennen** (36 Karten, KB I TB 2): Welche Schockform passt – **V**olumenmangel, **A**naphylaxie, **N**erven (neurogen),
    **K**ardiogen? Ursachen, Befunde und Maßnahmen nach Pflegias Band 2 (S. 801, 811, 831):
    https://klawittersven-arch.github.io/ils-pflege/quiz-rennen/beamer/?set=schock
  - **SPIKES-Rennen** (42 Sätze, KB II TB 2): Zu welchem Schritt gehört der Satz – S P I K E S? Zuordnung wie im
    KB-II-Arbeitsblatt „Schlechte Nachrichten überbringen“: https://klawittersven-arch.github.io/ils-pflege/quiz-rennen/beamer/?set=spikes
  Weitere Sätze dort ergänzen (`regel` = erste Regel auf dem Handy; `zeichen` = angezeigter Buchstabe, wenn zwei Kategorien
  gleich heißen – beim SPIKES-Rennen hat „Strategy and Summary“ intern den Buchstaben Z und zeigt S; Farben in
  `assets/quiz-rennen.css`). Frage-Kennungen nie wiederverwenden (die Fehlerstatistik zählt je Kennung).
  Test: `node tests/quiz-rennen-saetze.test.mjs` (Inhalt aller Sätze + kurzer Lauf mit Schock- und SPIKES-Rennen).
- **Einrichtung:** keine – der Worker bekommt die neue Klasse `Rennen` per Migration `v2` (wrangler.jsonc) beim nächsten Hochladen.
- Test (ohne wrangler, Worker in Node nachgebaut): `node tests/quiz-rennen.test.mjs` (Bilder: `BILDER=/pfad`).
