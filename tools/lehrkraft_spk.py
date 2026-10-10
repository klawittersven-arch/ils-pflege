"""Erzeugt die Lehrkraft-Info für den ILS-Auftrag SPK (enthält den Schlüssel – nicht veröffentlichen!).

Aufruf: python3 tools/lehrkraft_spk.py <vorlage.docx> <ausgabe.docx>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/spk/"
BAUSTEINE = json.loads((ROOT / "tools/bausteine.json").read_text(encoding="utf-8"))["SPK"]
KEY = "-".join(BAUSTEINE)


def build(template, out):
    d = Doc(template, ROOT / "tools/build_lk_spk")
    d.header_replace = {"> (DK)</w:t>": "> (SPK)</w:t>", "> Dauerkatheter</w:t>": "> Cystofix</w:t>"}
    d.h1("Lehrkraft-Info: ILS-Auftrag SPK")
    d.box(d.p_xml("🔒 Nur für Lehrkräfte. Dieses Dokument enthält die Lösungswörter. Nicht an Schülerinnen und Schüler weitergeben.", bold=True))

    d.h2("1 | Abgabe prüfen", before=0)
    d.p("Die SuS schicken eine E-Mail mit dem Betreff „Vorname N. SPK-XXXX-XXXX“. Der Ablauf ist derselbe wie beim ILS DK – "
        "aber mit eigener Prüfseite und eigenem Schlüssel. DK-IDs werden hier nicht anerkannt.")
    d.steps([
        f"Lehrkraft-Link öffnen (als Lesezeichen speichern): **{BASE}lehrkraft/#k={KEY}**",
        "Betreffzeilen der E-Mails einfügen (eine pro Zeile), optional die Klassenliste, dann „Prüfen“.",
    ])
    d.table(None, [["Schlüssel", KEY]] + [[f"Baustein Übung {i + 1}", w] for i, w in enumerate(BAUSTEINE)], [3000, 6060], first_col_bold=True)

    d.h2("2 | Links")
    d.table(["Seite", "Adresse"], [
        ["Übersicht aller Übungen", BASE],
        ["Übung 1 – Grundlagen und Vergleich", BASE + "1/"],
        ["Übung 2 – Indikation", BASE + "2/"],
        ["Übung 3 – Assistenz bei der Anlage", BASE + "3/"],
        ["Übung 4 – Verbandswechsel und Pflege", BASE + "4/"],
        ["Übung 5 – Miktionsversuch, Komplikationen, Entfernung", BASE + "5/"],
        ["Abschluss (Quiz + ID)", BASE + "ende/"],
        ["Prüfseite Lehrkraft", BASE + "lehrkraft/"],
    ], [3800, 5260], size=9.5)

    d.h2("3 | Ablauf und Bestehensgrenzen")
    d.table(["Übung", "Aufgaben", "Bestanden ab"], [
        ["1", "7 × „nur DK / nur SPK / beide“, 4 Grundlagenfragen (suprapubisch, Cystofix, Infektionsrisiko, Fistel)", "11 / 11"],
        ["2", "10 Fälle: SPK sinnvoll / andere Lösung / Kontraindikation", "10 / 10"],
        ["3", "9 Schritte der Anlage ordnen + 4 Fragen (gefüllte Blase, wer legt, Hämaturie, Peritonitis)", "13 / 13"],
        ["4", "Fehlersuche Verbandswechsel: 13 Sätze (5 Fehler) + 3 Fragen (Infektion, Wechsel, Ventil)", "16 / 16"],
        ["5", "8 × richtig/falsch + 4 Fallfragen (Restharn, Entfernung, Dislokation, Verstopfung)", "12 / 12"],
        ["Abschluss", "10 Zufallsfragen aus einem Pool von 20", "8 / 10"],
    ], [1300, 6260, 1500], size=9.5)

    d.p("Alle Übungen verlangen 100 % (alle Aufgaben richtig). Das Abschlussquiz bleibt bei 8 von 10 (neue Zufallsfragen bei jedem Versuch).", size=10)

    d.h2("4 | Aufbau auf ILS 1 (DK)")
    d.p("Nicht erneut erklärt, nur als Wiederholungskasten genannt: Katheteraufbau, Charrière, Material, Blocken/Entblocken, "
        "geschlossenes Ableitungssystem, Beutel unter Blasenniveau, Infektionsprophylaxe, Urinbeobachtung, „kein Urin?“. "
        "Neu im ILS SPK: Lage/Punktion, Fistel, Vergleich DK–SPK, Indikation/Kontraindikation, Vorbereitung und Assistenz bei der Anlage, "
        "Nachsorge, Einstichstelle und Verbandswechsel, Alltag, Katheterventil, Katheterwechsel, Miktionsversuch (mit ausdrücklichem "
        "Hinweis auf den Unterschied zum DK, wo Abklemmen nicht empfohlen wird), Komplikationen inkl. Dislokation, Entfernung.", size=10)
    d.p("Die Fallsituation führt Herrn Novak aus ILS 1 weiter und ergänzt Frau Weber (ambulante Versorgung) – damit sind "
        "Akutklinik und häusliche Pflege abgedeckt.", size=10, before=60)

    d.h2("5 | Fachlich mit Pflegias abgleichen")
    d.p("Diese Punkte werden je nach Lehrbuch und Hausstandard unterschiedlich gehandhabt:", after=40)
    d.bullets([
        "Häufigkeit des Verbandswechsels (frisch: täglich bzw. nach Hausstandard; abgeheilt: z. B. alle 2–3 Tage; immer bei Bedarf).",
        "Wann ist die Fistel stabil, wer macht den ersten und die folgenden Katheterwechsel (Delegation an Pflegefachpersonen)?",
        "Faustregel „SPK statt DK bei Ableitung länger als ca. 5 Tage“.",
        "Ablauf des Miktionsversuchs (Abklemmzeiten, nachts offen) und Restharn-Grenzwert – im AB bewusst „laut Anordnung“.",
        "Antiseptikum für die Einstichstelle; Haarkürzung mit Clipper statt Rasur.",
        "Zeit bis zum Verschluss der Einstichstelle nach Entfernung (im AB: meist 1–2 Tage).",
    ])

    d.h2("6 | Video")
    d.p("Zu diesem ILS ist noch kein Video eingebunden. Wenn Sie ein passendes Video finden (z. B. Verbandswechsel am SPK), "
        "schicken Sie das Transkript – es kann wie beim ILS DK über eine eigene Video-Seite mit Beobachtungsauftrag eingebunden werden.", size=10)
    return d.save(out, footer_text="Lehrkraft-Info SPK · vertraulich")


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
