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
  (beim Abschlussquiz mit Punktzahl). **Einzelne Antworten werden nie übertragen.**
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
- **Fehlerbudget** (Standard 3 ❤️): Beim 4. Fehler Lesepause (Standard 60 s, Abschlussquiz 180 s) mit Hinweis auf
  die Stellen im Arbeitsblatt, danach Neustart mit neu gezogenen Aufgaben. Jeder Fehlklick zählt – auch beim Sortieren,
  bei der Reihenfolge, im Lückentext und beim Bild.
- **Tempo-Kontrolle:** Jede Aufgabe hat eine Mindest-Lesezeit (nach Wortzahl). Zu frühes Tippen zählt nicht und gibt
  eine Warnung; nach 3 Warnungen Lesepause und Neustart.
- **Nach einem Fehler** bleibt die Erklärung 4 Sekunden stehen, bevor „Weiter“ geht.
- **Zwischenstand** (aktuelle Aufgabe, Fehler, laufende Lesepause, Schreibzeit) bleibt auf dem Gerät gespeichert.
- **Examens-Training** (optional `schreiben`): Schreibauftrag auf Papier mit Mindestzeit, danach Checkliste
  (Erwartungshorizont) zum Selbstabhaken, Hinweis auf Eigenverantwortung und E-Mail an die Lehrkraft mit Betreff.
- **Abschlussquiz** (`abschluss: true`): erst nach allen Übungen – das prüft auch der Server.
- **Lehrkraft-Tabelle:** ⚠n = Neustarts, ✍x/y = selbst abgehakte Punkte im Examens-Training.

Aufgabentypen: `wahl`, `rf` (mit Begründung), `mehrfach`, `reihe`, `sortieren` (auch PESR, Ampel), `zahl`,
`luecke`, `bild` (Stellen im SVG antippen), `dialog` (Fallentscheidung oder Gespräch) – Felder siehe Kopf von
`assets/ils-lern.js`.

### Neu erzeugen (Wunddrainagen und Materialentfernung)

```
python3 tools/grafiken_drainage.py && python3 tools/drainage_bau.py <version>   # Smartphone-Seiten drainage/
python3 tools/ab_drainage.py && python3 tools/lehrkraft_drainage.py             # Arbeitsblatt + Lehrkraft-Info
python3 tools/grafiken_me.py && python3 tools/me_bau.py <version>               # Smartphone-Seiten me/
python3 tools/ab_me.py && python3 tools/lehrkraft_me.py
node tests/inhalt.test.js            # spielt jede Aufgabe aller Pools einmal durch
```

Die Inhalte stehen in `tools/drainage_inhalt.py` und `tools/me_inhalt.py`. Mit (⚑) markierte Stellen stammen nicht aus
Pflegias (Standardwissen) – die Markierung ist für die SuS unsichtbar und in den Lehrkraft-Informationen aufgelistet.
`<version>` ist ein beliebiger kurzer Text (Cache-Bremse für die Browser), z. B. das Datum.
