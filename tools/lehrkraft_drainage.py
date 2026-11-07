"""Lehrkraft-Information zum ILS-Auftrag „Wunddrainagen“ (Erwartungshorizonte, Quellen, Ergänzungen).

Aufruf: python3 tools/lehrkraft_drainage.py → arbeitsblatt/ILS_Wunddrainagen_Lehrkraft.docx (+ .pdf)
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402
import drainage_inhalt as I  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
AUS = ROOT / "arbeitsblatt"


def build():
    d = Doc(ROOT / "tools/vorlage/ab_vorlage_kbs.docx", ROOT / "tools/build_drainage/docx_lk")
    d.header_replace = {
        "3BFP2 | KB I | Lo / ": "3BFP2 | Skills | ",
        "Themenblock I – Thema: Diabetes mellitus · Regelkreis &amp; sicheres Handeln": "Lehrkraft-Information · ILS Wunddrainagen",
    }
    d.h1("ILS Wunddrainagen – Information für Lehrkräfte")
    d.p("**Ablauf (ca. 90 Minuten):** Die SuS lesen einen Abschnitt auf dem Arbeitsblatt (10 Seiten), lösen danach die Übung am Smartphone "
        "(QR-Code) und schreiben im Kasten „Examens-Training“ eine Antwort selbst. Zum Schluss folgt das Abschlussquiz.", after=40)
    d.bullets([
        "Start für die SuS: **klawittersven-arch.github.io/ils-pflege/drainage/** (einmal anmelden: Klasse, Vorname, Geburtstag)",
        "Übersicht für Sie: **klawittersven-arch.github.io/ils-pflege/lehrkraft/** → ILS-Auftrag „Wunddrainagen“ wählen",
        "In der Tabelle: **✓ Datum** = erledigt, **⚠2** = zwei Neustarts (zu viele Fehler oder zu schnell getippt – Hinweis auf Raten), "
        "**✍5/7** = im Examens-Training selbst abgehakte Punkte. „Wer fehlt noch?“ liefert den Text für die PPT.",
        "Schutz gegen Raten: Aufgaben einzeln, 3 Fehler erlaubt, dann 60 s Lesepause und neue Aufgaben; Mindest-Lesezeit je Aufgabe "
        "(3× zu schnell = Neustart); Abschlussquiz (10 aus 25, max. 2 Fehler) erst nach allen Übungen – das prüft auch der Server.",
    ], after_last=60)

    d.h2("Übungen und Examensbezug", before=120)
    d.table(["Übung", "Inhalte", "Aufgabentypen", "Examensbezug"], [
        ["1 Wozu Drainagen?", "Definition, Nutzen, Nachteile, Einteilung, Redon/Robinson", "Sortieren, Bild antippen, Mehrfachauswahl, Lückentext", "Nennen, Erklären"],
        ["2 Beobachten", "Kriterien, Kontrollintervalle, Dokumentation, Bilanz aus dem Drainageprotokoll", "Zahl aus Protokoll, Ampel-Sortierung, Richtig/Falsch mit Begründung", "Pool Tag 3: „Nennen Sie (x) Beobachtungskriterien …“"],
        ["3 Komplikationen", "Nachblutung, Schock (Früh-/Spätphase), Sofortmaßnahmen, SBAR, Infektion, Hämatom", "Fallentscheidung mit Verzweigung, Reihenfolge (SBAR), Sortieren", "Tag 3 / CE 06: Anzeichen + Sofortmaßnahmen"],
        ["4 Umgang, Hygiene, Recht", "Information/Mobilisation, Flaschenwechsel, Robinson leeren, WHO-Händehygiene, Delegation, Remonstration", "Reihenfolge, Bild antippen, Gesprächssimulation, Sortieren", "„Ablauf in (x) Schritten“, Delegation (6 von 7 Tag-3-Prüfungen)"],
        ["5 Pflegeprozess", "PESR, überprüfbare Ziele, konkrete Interventionen", "PESR-Sortierung, Ziel-Check, Reihenfolge", "PESR/Ziele/Interventionen in jeder Prüfung"],
        ["Abschluss", "Transfer auf neuen Fall (Robinson nach Gallen-OP)", "gemischt, 10 aus 25", "–"],
    ], [1700, 3000, 2460, 1900], size=9, first_col_bold=True)

    d.h2("Erwartungshorizonte Examens-Training", before=120)
    for nr, sch in enumerate([I.SCHREIBEN1, I.SCHREIBEN2, I.SCHREIBEN3, I.SCHREIBEN4, I.SCHREIBEN5], 1):
        d.p(f"**{nr}.** " + sch["auftrag"].replace("<strong>", "**").replace("</strong>", "**"), after=20, keep=True)
        d.bullets([p.replace(" (⚑)", "") for p in sch["punkte"]], after_last=60)

    d.h2("Fachliche Grundlage und Ergänzungen", before=120)
    d.p("Grundlage ist **Pflegias** (Cornelsen): Band 1 S. 643–648 (Überwachung nach einem Eingriff, Umgang mit Wunddrainagen), S. 684–686 "
        "(Verbandwechsel), S. 691 (Hämatom); Band 2 S. 359 (Pflege nach OP am Bewegungsapparat), S. 418, 801, 811 (Schock). "
        "Begriffe, Zahlen und die Reihenfolge des Flaschenwechsels sind daraus übernommen.", after=40)
    d.p("**Diese Punkte stehen so nicht in Pflegias** (Standardwissen) – bitte mit Ihrem Hausstandard abgleichen:", after=20, keep=True)
    d.bullets([
        "Zuordnung **Robinson = Schwerkraft**, **Easy-Flow = Kapillarwirkung** (Pflegias nennt nur „passiv: Schwerkraft oder Kapillarwirkung“).",
        "Robinson-Beutel **immer unter Wundniveau** (Rückfluss) und **Leeren über den Ablaufstutzen** als Ablauf.",
        "**Grünlich-braunes (galliges) Sekret** in der Robinson → Ärztin informieren.",
        "**Meldegrenzen** (z. B. mehr als 100 ml in 1 Stunde) stehen bewusst in der fiktiven ärztlichen Anordnung des Falls – Pflegias nennt keine Richtwerte.",
        "Der Begriff **Nachblutung** (in Pflegias Band 1 ohne eigenen Abschnitt); Schockzeichen und Sofortmaßnahmen sind aus Band 2.",
        "Bei Schockverdacht **nüchtern lassen**, bis die Ärztin entschieden hat.",
        "Vakuumindikator nach Wechsel **sofort wieder entfaltet** → Leck oder verrutschte Drainage.",
        "**Herausgerutschte Drainage:** steril abdecken, Ärztin informieren, Drainage zur Kontrolle aufbewahren, nicht wieder einführen.",
        "**Händedesinfektion** beim Flaschenwechsel (Pflegias nennt Handschuhe und Sprühdesinfektion des Ansatzstücks).",
        "**Beobachtung und Dokumentation nach dem Entfernen**; ob mit oder ohne Sog gezogen wird → laut AB „Standard Ihres Hauses“.",
        "**Delegation des Ziehens** wird als „in manchen Häusern“ thematisiert – laut Pflegias entfernt der Arzt die Redon.",
    ], after_last=60)
    d.p("Klassenliste, Fortschritt und Passwort verwalten Sie auf der Lehrkraft-Seite (Verwaltung). Gelöscht wird nur von Hand.", size=9, color="404040")

    fuss = d.work / "word/footer1.xml"
    fuss.write_text(fuss.read_text(encoding="utf-8").replace("KB I · Regelkreis &amp; sicheres Handeln · Seite ",
                                                             "ILS Wunddrainagen · Lehrkraft · Seite "), encoding="utf-8")
    out = d.save(AUS / "ILS_Wunddrainagen_Lehrkraft.docx")
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(AUS), str(out)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    print("geschrieben:", out, out.with_suffix(".pdf"))


if __name__ == "__main__":
    build()
