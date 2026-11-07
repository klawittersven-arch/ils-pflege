"""Lehrkraft-Information zum ILS-Auftrag „Materialentfernung“ (Erwartungshorizonte, Quellen, Ergänzungen).

Aufruf: python3 tools/lehrkraft_me.py → arbeitsblatt/ILS_Materialentfernung_Lehrkraft.docx (+ .pdf)
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402
import me_inhalt as I  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
AUS = ROOT / "arbeitsblatt"


def build():
    d = Doc(ROOT / "tools/vorlage/ab_vorlage_kbs.docx", ROOT / "tools/build_me/docx_lk")
    d.header_replace = {
        "3BFP2 | KB I | Lo / ": "3BFP2 | Skills | ",
        "Themenblock I – Thema: Diabetes mellitus · Regelkreis &amp; sicheres Handeln": "Lehrkraft-Information · ILS Materialentfernung",
    }
    d.h1("ILS Materialentfernung – Information für Lehrkräfte")
    d.p("**Ablauf (ca. 90 Minuten):** wie beim ILS Wunddrainagen – Abschnitt lesen, Übung am Smartphone, Examens-Training schreiben, "
        "zum Schluss das Abschlussquiz. Empfehlung: das ILS Wunddrainagen zuerst bearbeiten lassen (Herr Brandt hat eine Redon-Drainage).", after=40)
    d.bullets([
        "Start für die SuS: **klawittersven-arch.github.io/ils-pflege/me/** (wer beim ILS Wunddrainagen angemeldet war, bleibt auf dem Handy angemeldet)",
        "Übersicht für Sie: **klawittersven-arch.github.io/ils-pflege/lehrkraft/** → ILS-Auftrag „Materialentfernung“ wählen",
        "E-Mails der SuS zum Examens-Training kommen mit dem Betreff **„ILS Metallentfernung“**.",
        "**ILS-Challenge** (freiwillig, nach dem Abschlussquiz): 20 Aufgaben, 150 Punkte je Aufgabe + Zeitbonus (wie die Klausur-Challenge der Lernkarten), Bestenliste je Klasse mit Vorname + Initial. Auf der Lehrkraft-Seite: Spalte „🏁 Challenge“ und **🏆 Siegerehrung** am Beamer (Taste F = Vollbild, R = nochmal, Esc = schließen). **Siegerwappen:** Wer ein Ergebnis hat, darf ein kleines Bild malen, das sofort neben dem Namen in der Bestenliste erscheint. Knopf **🛡️ Siegerwappen** = Galerie: ansehen, löschen oder Person vom Malen ausschließen. In der Siegerehrung erscheinen nur Wappen, die Sie als angesehen markiert haben.",
        "Begriff: Pflegias schreibt **Materialentfernung**; das Arbeitsblatt nennt beim ersten Mal auch „Metallentfernung (ME)“.",
    ], after_last=60)

    d.h2("Übungen und Examensbezug", before=120)
    d.table(["Übung", "Inhalte", "Aufgabentypen", "Examensbezug"], [
        ["1 Osteosynthese, Materialentfernung", "Frakturtherapie, Verfahren, Knochenheilung, Gründe für/gegen ME, Zeitpunkt", "Bild antippen, Sortieren, Lückentext, Mehrfachauswahl", "Erläutern mit Fallbezug"],
        ["2 Überwachen", "Übernahme aus dem AWR, DMS, Schmerz (NRS), Hochlagern/Kühlen, Urin nach 8 h, erste Mobilisation", "Bild antippen (Fuß), D/M/S-Sortierung, Fallentscheidung, Zahl aus Anordnung", "Pool Tag 3: Beobachtungskriterien, Rückmeldung an die Ärztin"],
        ["3 Komplikationen", "Thrombose (Virchow-Trias), Lungenembolie, Infektion, Hämatom, Dehiszenz, Refraktur, Kompartment", "Telefonat-Dialog, Symptom-Detektiv, Virchow-Sortierung, Lückentext", "Leitfaden-Beispiel: „Erklären Sie die Entstehung einer Thrombose bei …“"],
        ["4 Schmerz, Mobilisation", "Expertenstandard Schmerz, Analgesie vor Mobilisation, Unterarmgehstützen, Sturz- und Thromboseprophylaxe", "Reihenfolge (Treppe), Gespräch, Sortieren, Zahl", "Expertenstandard Schmerz (5 von 7 Tag-3-Prüfungen)"],
        ["5 Information, Entlassung", "Information/Schulung/Beratung, Verhaltensweisen nach dem Eingriff, Gesprächsaufbau, Fäden, Entlassungsmanagement, PESR", "Sortieren, Entlassungsgespräch, Reihenfolge, PESR", "Pool Tag 1 II.1.d; Tag 2: Information, Schulung, Beratung"],
        ["Abschluss", "Transfer: Materialentfernung am Unterarm (Frau Schäfer)", "gemischt, 10 aus 25", "–"],
    ], [1900, 3000, 2260, 1900], size=9, first_col_bold=True)

    d.h2("Erwartungshorizonte Examens-Training", before=120)
    for nr, sch in enumerate([I.SCHREIBEN1, I.SCHREIBEN2, I.SCHREIBEN3, I.SCHREIBEN4, I.SCHREIBEN5], 1):
        d.p(f"**{nr}.** " + sch["auftrag"].replace("<strong>", "**").replace("</strong>", "**"), after=20, keep=True)
        d.bullets([p.replace(" (⚑)", "") for p in sch["punkte"]], after_last=60)

    d.h2("Fachliche Grundlage und Ergänzungen", before=120)
    d.p("Grundlage ist **Pflegias**: Band 2 S. 474–475 (Frakturen, Osteosynthese, Materialentfernung), S. 353–359 (Gips, Fixateur, Pflege nach OP am "
        "Bewegungsapparat), S. 426–434 (Thrombose), S. 349–352 (Sturz), S. 325 (Gehhilfen); Band 1 S. 643–646 (Überwachung), S. 688–691 "
        "(Fäden und Klammern, Wundheilungsstörungen).", after=40)
    d.p("**Diese Punkte stehen so nicht in Pflegias** (Standardwissen oder Prüfungs-Erwartungshorizonte) – bitte mit Ihrem Hausstandard abgleichen:", after=20, keep=True)
    d.bullets([
        "**Treppensteigen mit Unterarmgehstützen** (hinauf gesundes Bein zuerst, hinunter Stützen und operiertes Bein zuerst) – Gangarten und Treppe fehlen in Pflegias.",
        "**Refraktur** nach Materialentfernung und die **Sportpause** – im Fall als ärztliche Anordnung (6 Wochen).",
        "**Kompartmentsyndrom** (in Pflegias 0 Treffer) – nur als Warnzeichen „sofort Ärztin informieren“.",
        "Bei Thromboseverdacht **nicht massieren**; **zu wenig Trinken** als Faktor der Hyperkoagulabilität.",
        "**Duschen mit Duschpflaster** und Vergleich der DMS mit dem gesunden Fuß.",
        "**Analgesie 30–45 Minuten vor der Mobilisation** (aus dem Erwartungshorizont Juli 2024).",
        "Inhalte der Expertenstandards **Schmerzmanagement** und **Entlassungsmanagement** sowie die Unterscheidung **Information – Schulung – Beratung** "
        "(in den Prüfungen regelmäßig gefragt, im gelesenen Pflegias-Auszug nicht enthalten).",
        "Gründe für die Materialentfernung „Beschwerden/Bewegungseinschränkung“ sind aus Pflegias abgeleitet (dort: kann bleiben, wenn es nicht stört und nicht schmerzt).",
    ], after_last=60)
    d.p("Klassenliste, Fortschritt und Passwort verwalten Sie auf der Lehrkraft-Seite (Verwaltung). Gelöscht wird nur von Hand.", size=9, color="404040")

    fuss = d.work / "word/footer1.xml"
    fuss.write_text(fuss.read_text(encoding="utf-8").replace("KB I · Regelkreis &amp; sicheres Handeln · Seite ",
                                                             "ILS Materialentfernung · Lehrkraft · Seite "), encoding="utf-8")
    out = d.save(AUS / "ILS_Materialentfernung_Lehrkraft.docx")
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(AUS), str(out)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    print("geschrieben:", out, out.with_suffix(".pdf"))


if __name__ == "__main__":
    build()
