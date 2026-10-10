# ILS-Aufträge Pflege – interaktive Übungen

Übungsseiten zu ILS-Aufträgen der Pflegeausbildung (Karoline-Breitinger-Schule, Klasse 3BFP2).
Die Seiten werden über GitHub Pages veröffentlicht und über QR-Codes auf den gedruckten Arbeitsblättern aufgerufen.

- `dk/` – ILS-Auftrag „Transurethraler Dauerkatheter“ (Übungen 1–5, Video-Seite, Abschluss mit ID, Prüfseite für Lehrkräfte)
- `assets/` – gemeinsames Design und Quiz-Logik
- `tools/` – Skripte, die Seiten, Grafiken und Arbeitsblätter erzeugen

Es werden keine Daten auf einem Server gespeichert. Die Lösungswörter (Bausteine) liegen nicht in diesem Repository.

Neu erzeugen:

```
python3 tools/grafiken.py                 # Grafiken (SVG)
python3 tools/seiten.py                   # Übungsseiten (braucht tools/bausteine.json)
python3 tools/ab_dk.py VORLAGE.docx AB.docx
```
