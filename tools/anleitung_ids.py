"""Kurze Lehrkraft-Anleitung: IDs prüfen (ILS DK und SPK) – mit QR-Codes zu den Prüfseiten.

Enthält die Lehrkraft-Links mit Schlüssel – nicht veröffentlichen!
Aufruf: python3 tools/anleitung_ids.py <vorlage.docx> <ausgabe.docx>
"""
import json
import sys
from pathlib import Path

import qrcode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/"
B = json.loads((ROOT / "tools/bausteine.json").read_text(encoding="utf-8"))
ILS = [
    ("dk", "ILS 1 – Transurethraler Dauerkatheter (DK)", "-".join(B["DK"]), "DK-XXXX-XXXX"),
    ("spk", "ILS 2 – Suprapubischer Katheter (SPK)", "-".join(B["SPK"]), "SPK-XXXX-XXXX"),
]


def qr(url, name):
    out = ROOT / "tools/png" / f"qr-lehrkraft-{name}.png"
    qrcode.make(url, box_size=10, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M).save(out)
    return out


def build(template, out):
    d = Doc(template, ROOT / "tools/build_anleitung")
    d.header_replace = {"> (DK)</w:t>": "> DK + SPK</w:t>", "> Dauerkatheter</w:t>": "> IDs prüfen</w:t>"}
    d.h1("Anleitung: IDs der SuS prüfen")
    d.box(d.p_xml("🔒 Nur für Lehrkräfte. Die Links unten enthalten den Schlüssel. Nicht an Schülerinnen und Schüler weitergeben.", bold=True))

    d.h2("1 | Die Prüfseiten", before=0)
    d.p("Jeder ILS-Auftrag hat eine eigene Prüfseite. Der Schlüssel ist im Link schon enthalten. QR-Code scannen oder Link öffnen – "
        "am besten als Lesezeichen speichern.", after=80)
    for slug, titel, key, fmt in ILS:
        url = f"{BASE}{slug}/lehrkraft/#k={key}"
        d.qr_task(qr(url, slug), titel,
                  [f"Prüft IDs der Form **{fmt}**.",
                   f"Schlüssel (falls Sie ihn von Hand eingeben müssen): **{key}**"], url)

    d.h2("2 | So prüfen Sie")
    d.steps([
        "Prüfseite öffnen (QR-Code oder Link). Unter dem Schlüsselfeld muss **„✓ Schlüssel korrekt“** stehen.",
        "In Outlook nach **„DK-“** bzw. **„SPK-“** suchen, alle Treffer markieren (**Strg+A**), kopieren (**Strg+C**) und in das große Feld "
        "einfügen (**Strg+V**). Absender, Datum usw. stören nicht. Klappt das nicht: Betreffzeilen einzeln kopieren – eine pro Zeile.",
        "Optional: **Klassenliste** einfügen (eine Person pro Zeile, „Vorname N.“). Dann zeigt die Seite, wer noch fehlt.",
        "Auf **„Prüfen“** tippen und das Ergebnis lesen (siehe unten).",
        "Ergebnis sichern: **Screenshot** machen oder Tabelle kopieren – die Seite speichert nichts.",
    ], after_last=80)

    d.h2("3 | Das Ergebnis")
    d.table(["Anzeige", "Bedeutung", "Was tun?"], [
        ["**✓ gültig**", "Name und ID passen zusammen: alle 5 Bausteine und das Abschlussquiz geschafft.", "nichts"],
        ["**✗ Name und ID passen nicht zusammen**", "ID gehört zu einem anderen Namen – oder der Name im Betreff ist anders geschrieben als auf der Abschlussseite.",
         "Nachfragen, welcher Name eingegeben wurde. Wiederholt sich das: ID vermutlich übernommen."],
        ["**✗ keine ID gefunden**", "Keine ID dieses ILS-Auftrags in der Zeile (z. B. DK-ID auf der SPK-Seite).", "Betreff ansehen, ggf. auf der anderen Prüfseite prüfen."],
    ], [2700, 3700, 2660], size=9.5, first_col_bold=False)

    d.h2("4 | Gut zu wissen")
    d.bullets([
        "**Schreibweise:** Groß-/Kleinschreibung, Umlaute, Leerzeichen und Bindestriche sind egal („Anna-Lena M.“ = „annalena m“). "
        "Andere Namen oder Spitznamen zählen als anderer Name.",
        "**DK und SPK getrennt prüfen** – eine DK-ID ist auf der SPK-Seite ungültig und umgekehrt.",
        "**Persönliche Bausteine:** Die SuS geben in jeder Übung ihren Namen ein und bekommen Bausteine mit 3 Ziffern (z. B. „HAUS-482“). "
        "Bausteine von anderen funktionieren deshalb nicht.",
        "**Grenzen:** Ohne Login lässt sich nicht verhindern, dass jemand alle Übungen unter dem Namen einer anderen Person macht. "
        "Ergänzung: kurze Abfrage (3–5 Fragen) in der nächsten Präsenzstunde.",
        "**Testen:** Mit einem Testnamen alle Übungen bis zur ID durchspielen und die ID prüfen – so sehen Sie, wie „✓ gültig“ aussieht.",
    ])

    d.h2("5 | Weitere Links")
    d.table(["Was", "Adresse"], [
        ["Übungen ILS 1 (DK) – Übersicht", BASE + "dk/"],
        ["Übungen ILS 2 (SPK) – Übersicht", BASE + "spk/"],
        ["Startseite aller ILS-Aufträge", BASE],
        ["Quellcode (GitHub)", "https://github.com/klawittersven-arch/ils-pflege"],
    ], [3600, 5460], size=9.5)
    d.p("**Falls etwas nicht geht:** Seite lädt nicht → auf GitHub prüfen, ob unter Settings → Pages „main / (root)“ eingestellt ist. "
        "„✗ Schlüssel falsch“ → Link vollständig öffnen (mit „#k=…“) oder Schlüssel von oben eingeben. "
        "Änderungen an den Übungen: in Claude Code das Repository „klawittersven-arch/ils-pflege“ öffnen und die Änderung beschreiben.",
        size=9.5, before=80)
    return d.save(out, footer_text="Anleitung IDs prüfen · vertraulich")


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
