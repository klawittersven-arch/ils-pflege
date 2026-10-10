"""Erzeugt die Lehrkraft-Info (enthält den Schlüssel – nicht veröffentlichen!).

Aufruf: python3 tools/lehrkraft_dk.py <vorlage.docx> <ausgabe.docx>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/dk/"
BAUSTEINE = json.loads((ROOT / "tools/bausteine.json").read_text(encoding="utf-8"))["DK"]
KEY = "-".join(BAUSTEINE)


def build(template, out):
    d = Doc(template, ROOT / "tools/build_lk")
    d.h1("Lehrkraft-Info: ILS-Auftrag DK")
    d.box(d.p_xml("🔒 Nur für Lehrkräfte. Dieses Dokument enthält die Lösungswörter. Nicht an Schülerinnen und Schüler weitergeben.", bold=True))

    d.h2("1 | Abgabe prüfen", before=0)
    d.p("Die SuS schicken eine E-Mail mit dem Betreff „Vorname N. DK-XXXX-XXXX“. So prüfen Sie:")
    d.steps([
        f"Lehrkraft-Link öffnen (am besten als Lesezeichen speichern): **{BASE}lehrkraft/#k={KEY}**",
        "Der Schlüssel ist dann schon eingetragen („✓ Schlüssel korrekt“). Sonst den Schlüssel unten von Hand eintragen.",
        "Betreffzeilen der E-Mails in das große Feld kopieren – eine pro Zeile. Tipp: In Outlook lassen sich mehrere markierte E-Mails oft mit Strg+C als Liste kopieren. "
        "Weitere Spalten (Absender, Datum) stören nicht.",
        "Optional die Klassenliste („Vorname N.“, eine Person pro Zeile) einfügen. Dann zeigt die Seite, wer noch fehlt.",
        "„Prüfen“ tippen: ✓ gültig = Name und ID passen zusammen.",
    ])
    d.table(None, [["Schlüssel", KEY]] + [[f"Baustein Übung {i + 1}", w] for i, w in enumerate(BAUSTEINE)], [3000, 6060], first_col_bold=True)
    d.p("**Wie sicher ist das?** Die ID wird aus Vorname, Anfangsbuchstabe und allen 5 Bausteinen berechnet und passt nur zum "
        "eingegebenen Namen. Eine ID einer Mitschülerin ist für andere Namen ungültig. Wer sich aber alle 5 Bausteine von anderen geben "
        "lässt und das Abschlussquiz besteht, kommt durch. Die ID belegt die Bearbeitung, nicht den Lernerfolg. Empfehlung: kurzes "
        "Quiz (5 Min.) zu Beginn der nächsten Präsenzstunde.", size=10, before=60)
    d.p("**Datenschutz:** Die Übungsseiten speichern nichts auf einem Server. Bausteine werden nur auf dem Gerät der SuS gemerkt "
        "(Browser-Speicher). Die Prüfseite rechnet ebenfalls nur lokal.", size=10, before=60)

    d.h2("2 | Links")
    d.table(["Seite", "Adresse"], [
        ["Übersicht aller Übungen", BASE],
        ["Übung 1 – Katheter und Material", BASE + "1/"],
        ["Übung 2 – Indikation", BASE + "2/"],
        ["Übung 3 – DK bei der Frau", BASE + "3/"],
        ["Video-Seite (Beobachtungsauftrag)", BASE + "video/"],
        ["Übung 4 – DK beim Mann", BASE + "4/"],
        ["Übung 5 – Pflege und Entfernung", BASE + "5/"],
        ["Abschluss (Quiz + ID)", BASE + "ende/"],
        ["Prüfseite Lehrkraft", BASE + "lehrkraft/"],
    ], [3600, 5460], size=9.5)
    d.p("Die QR-Codes auf dem Arbeitsblatt zeigen auf diese Adressen. Wenn das Video einmal nicht mehr verfügbar ist, wird nur die "
        "Video-Seite geändert – das gedruckte Arbeitsblatt bleibt gültig.", size=10)

    d.h2("3 | Ablauf und Bestehensgrenzen")
    d.table(["Übung", "Aufgaben", "Bestanden ab"], [
        ["1", "5 × Beschriftung Katheter, 5 × Multiple Choice (Ch, Länge, Material, Ableitungssystem)", "8 / 10"],
        ["2", "10 Fallentscheidungen: indiziert / Alternative / Kontraindikation", "8 / 10"],
        ["3", "10 Schritte ordnen (Frau) + 4 Fragen", "12 / 14"],
        ["4", "Fehlersuche: 13 Sätze (6 Fehler) + 3 Fragen zum Video", "13 / 16"],
        ["5", "12 × richtig/falsch + 2 Fallfragen (Frau Brandt, Herr Novak)", "12 / 14"],
        ["Abschluss", "10 Zufallsfragen aus einem Pool von 20", "8 / 10"],
    ], [1300, 6260, 1500], size=9.5)
    d.p("Bei „nicht bestanden“ sehen die SuS nur, welche Aufgaben falsch sind, plus einen Tipp zum Abschnitt im Infotext – nicht die "
        "richtige Lösung. Nach dem Bestehen werden alle Erklärungen angezeigt.", size=10)

    d.h2("4 | Fachlich mit Pflegias abgleichen")
    d.p("Diese Punkte werden in Lehrbüchern und Hausstandards unterschiedlich gehandhabt. Bitte kurz mit Pflegias vergleichen; "
        "Änderungen kann ich schnell einarbeiten:", after=40)
    d.bullets([
        "Blockflüssigkeit: steriles Aqua dest. **oder** 8–10 % Glycerinlösung (nach Herstellerangabe); kein NaCl.",
        "Große Urinmengen: im AB neutral formuliert (fraktioniertes Ablassen nach Hausstandard, neuere Evidenz ohne klaren Nutzen).",
        "Desinfektionsreihenfolge bei der Frau (große → kleine Schamlippen → Harnröhrenöffnung, letzter Tupfer vor den Scheideneingang).",
        "Mann: Penis ca. 90° zum Körper, bei Widerstand Richtung Beine senken; Fixierung Oberschenkel oder Unterbauch.",
        "Kathetergrößen (Frau 12–14 Ch, Mann 14–16 Ch) und Liegedauer (Latex wenige Tage, Silikon mehrere Wochen, Herstellerangabe).",
        "Zeitpunkt Spontanmiktion nach Entfernung („nach einigen Stunden, Hausstandard, meist ca. 6 Stunden“).",
    ])

    d.h2("5 | Videos")
    d.p("**Aufgenommen:** „Katheterisierung mit Dauerkatheter: Mann“ (Bactiguard, ca. 7 Min.). Realistische Demonstration – ersetzt "
        "zum Teil die praktische Übung. Die Video-Seite weist auf Abweichungen hin: Reinigung mit NaCl statt Schleimhaut-Antiseptikum "
        "(in D nach KRINKO: Antiseptikum), Herstellervideo (produktspezifische Hinweise), Vorhaut-Reposition, Fixierung, Beutel und "
        "Dokumentation nicht gezeigt. Übung 4 enthält 3 Fragen dazu.", size=10)
    d.p("**Nicht aufgenommen:** „Katheter | Pflege | Pflege Kanal“. Gründe: kaum Mehrwert gegenüber Abschnitt 1; viele Katheterarten "
        "ohne Bezug zum Thema (Pulmonalarterien-, Pigtail-, Doppel-J-Katheter) – für DaZ-Lernende eher verwirrend; feste Liegezeiten "
        "(Latex 1 Woche, Silikon 4–6 Wochen) statt Herstellerangabe; keine Hygiene, keine Indikationsstellung, keine Durchführung; "
        "Werbung im Video. Die 135 Minuten sind mit dem anderen Video besser genutzt.", size=10)

    d.h2("6 | Inhalte ändern")
    d.p("Alle Übungen stehen in der Datei tools/seiten.py, der Infotext in tools/ab_dk.py. Am einfachsten: Änderungswunsch an Claude "
        "geben – die Seiten und das Arbeitsblatt werden dann neu erzeugt. Die QR-Codes ändern sich dabei nicht.", size=10)
    return d.save(out, footer_text="Lehrkraft-Info DK · vertraulich")


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
