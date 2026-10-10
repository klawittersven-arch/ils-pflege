"""Erzeugt das Arbeitsblatt (Infotext + QR-Codes) für den ILS-Auftrag DK als .docx.

Aufruf: python3 tools/ab_dk.py <vorlage.docx> <ausgabe.docx>
"""
import sys
from pathlib import Path

import qrcode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/dk/"
SHORT = "klawittersven-arch.github.io/ils-pflege/dk/"
MAIL = "Sven.Klawitter@Karoline-Breitinger-Schule.de"
PNG = ROOT / "tools/png"


def qr(path_part):
    out = PNG / f"qr-{path_part.strip('/').replace('/', '-') or 'start'}.png"
    img = qrcode.make(BASE + path_part, box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    img.save(out)
    return out


def build(template, out):
    d = Doc(template, ROOT / "tools/build_ab")

    # ================================================================ Start
    d.h1("Transurethraler Dauerkatheter (DK)")
    d.box(
        d.p_xml("So bearbeiten Sie diesen ILS-Auftrag (ca. 135 Minuten = 3 Schulstunden)", bold=True, after=60)
        + d.list_xml([
            "Sie brauchen: dieses Arbeitsblatt, einen Stift und ein Smartphone oder Tablet mit Internet.",
            "Lesen Sie die Abschnitte der Reihe nach. **Fachwörter** erklärt das Glossar am Ende.",
            "Nach jedem Abschnitt scannen Sie den **QR-Code** und machen die Übung.",
            "Geben Sie in jeder Übung zuerst Ihren **Vornamen** und den **1. Buchstaben Ihres Nachnamens** ein – immer gleich geschrieben.",
            "Sind **alle Aufgaben** einer Übung **richtig**, bekommen Sie einen **persönlichen Baustein**: ein Wort mit 3 Ziffern (z. B. „HAUS-482“). "
            "Er gilt **nur für Ihren Namen**. Schreiben Sie ihn in das Kästchen ✍️.",
            "Am Ende geben Sie alle 5 Bausteine ein, machen ein kurzes Abschlussquiz und bekommen Ihre **persönliche ID**.",
            f"Sie schicken die ID per E-Mail an **{MAIL}**. So sehe ich, dass Sie den Auftrag bearbeitet haben.",
        ], "decimal")
    )
    d.table(
        ["Schritt", "Inhalt", "Zeit", "Erledigt"],
        [
            ["Start", "Fallsituation und Lernziele lesen", "10 Min.", "☐"],
            ["Abschnitt 1", "Katheter und Material  →  Übung 1", "25 Min.", "☐"],
            ["Abschnitt 2", "Indikation und Risiken  →  Übung 2", "20 Min.", "☐"],
            ["Abschnitt 3", "Vorbereitung und Durchführung  →  Übung 3, Video, Übung 4", "45 Min.", "☐"],
            ["Abschnitt 4–5", "Pflege, Beobachtung, Entfernung  →  Übung 5", "25 Min.", "☐"],
            ["Abschluss", "Abschlussquiz, ID per E-Mail schicken", "10 Min.", "☐"],
        ],
        [1500, 5560, 1000, 1000], size=10,
    )

    d.p("🎯 **Lernziele:** Nach diesem ILS-Auftrag können Sie …", after=40, keep=True)
    d.bullets([
        "den Aufbau, die Größen und die Materialien eines Blasenkatheters erklären und passendes Material auswählen.",
        "begründen, wann ein DK sinnvoll ist, wann nicht und welche Alternativen es gibt.",
        "das Legen eines DK bei Frau und Mann in der richtigen Reihenfolge und aseptisch beschreiben.",
        "Maßnahmen zur Vorbeugung von Harnwegsinfektionen bei liegendem DK begründen und umsetzen.",
        "Komplikationen erkennen, richtig reagieren und einen DK fachgerecht entfernen.",
    ], after_last=120)

    d.box(
        d.p_xml("📋 Fallsituation", bold=True, after=60, keep=True)
        + d.p_xml("Sie sind im Praxiseinsatz. Ihre Praxisanleiterin sagt: „Heute haben wir zwei Menschen mit Blasenkatheter. "
                  "Da müssen wir gut nachdenken und sehr sauber arbeiten.“", after=80)
        + d.p_xml("**Herr Novak (72 Jahre)** kommt in die Notaufnahme. Er kann seit 10 Stunden kein Wasser lassen. "
                  "Sein Unterbauch ist hart und tut weh. Der Blasenscanner zeigt 900 ml Urin. Die Ärztin vermutet eine "
                  "vergrößerte Prostata. Sie ordnet einen transurethralen Dauerkatheter an.", after=80)
        + d.p_xml("**Frau Brandt (81 Jahre)** liegt auf der Unfallchirurgie. Vor zwei Tagen wurde ihre Hüfte operiert "
                  "(Schenkelhalsfraktur). Im OP hat sie einen Dauerkatheter bekommen. Heute ist Frau Brandt unruhig und "
                  "verwirrt. Der Urin im Beutel ist trüb.", after=80)
        + d.p_xml("**Fragen:** Warum braucht Herr Novak einen DK? Wie wird er gelegt – und was ist beim Mann anders? "
                  "Was kann bei Frau Brandt los sein? Am Ende dieses ILS-Auftrags können Sie diese Fragen beantworten.", after=0)
    )

    # ================================================================ 1
    d.h2("1 | Was ist ein transurethraler Dauerkatheter?", page_break=True, before=0)
    d.lernziel("Sie können den Aufbau, die Größen und die Materialien eines Blasenkatheters erklären.")
    d.p("Ein **Blasenkatheter** ist ein dünner, weicher Schlauch. Er leitet Urin aus der Harnblase ab. "
        "**Transurethral** heißt: durch die Harnröhre (lat. Urethra). Ein **Dauerkatheter (DK)** bleibt längere Zeit in der Blase. "
        "Andere Namen sind Blasenverweilkatheter oder Ballonkatheter.")
    d.p("An der Spitze hat der DK einen kleinen **Ballon**. In der Blase füllen Sie den Ballon mit Flüssigkeit. Das nennt man "
        "**blocken**. Jetzt kann der Katheter nicht mehr herausrutschen.", before=60)
    d.p("**Andere Katheter:** Ein **Einmalkatheter** wird sofort wieder entfernt (z. B. für eine sterile Urinprobe oder bei "
        "Harnverhalt). Ein **Spülkatheter** hat 3 Kanäle; über den dritten Kanal kann die Blase gespült werden "
        "(z. B. nach Operationen an Prostata oder Blase).", before=60)
    d.image(PNG / "katheter-beschriftet.png", 15.5, "Abb. 1: Aufbau eines Ballonkatheters (2-Wege-Katheter). Rechts oben: Querschnitt mit großem Kanal (Urin) und kleinem Kanal (Ballon).",
            descr="Schema eines Ballonkatheters")
    d.table(
        ["Teil", "Aufgabe"],
        [
            ["① Spitze mit Auge", "Seitliche Öffnungen. Hier fließt der Urin in den Katheter."],
            ["② Ballon", "Wird in der Blase geblockt. Er hält den Katheter in der Blase."],
            ["③ Schaft mit 2 Kanälen", "Großer Kanal: Urin fließt ab. Kleiner Kanal: führt zum Ballon."],
            ["④ Anschluss (Trichter)", "Hier wird das Urinableitungssystem angeschlossen."],
            ["⑤ Blockventil", "Hier setzen Sie die Spritze an (blocken, entblocken). Aufdruck: Größe in Ch und Ballonvolumen in ml."],
        ],
        [2600, 6460], size=10, first_col_bold=True,
    )
    d.h3("Größe: Charrière (Ch)")
    d.p("Die Dicke eines Katheters wird in **Charrière (Ch)** angegeben (manchmal auch French, Fr). "
        "**1 Ch = 1/3 mm** Außendurchmesser. Beispiel: 15 Ch = 5 mm. Am Blockventil hilft ein Farbcode beim Erkennen der Größe.")
    d.bullets([
        "Regel: **So dünn wie möglich, so dick wie nötig.** Dicke Katheter reizen die Harnröhre mehr.",
        "Erwachsene Frau: meist **12–14 Ch**. Erwachsener Mann: meist **14–16 Ch** (bis 18 Ch). Kinder: kleiner (z. B. 8–10 Ch).",
        "Die Größe steht in der ärztlichen Anordnung bzw. im Hausstandard.",
    ])
    d.h3("Länge")
    d.p("**Frauenkatheter** sind kurz (ca. 20–26 cm). **Standard- oder Männerkatheter** sind lang (ca. 40–45 cm). "
        "❗ Bei einem Mann **nie** einen kurzen Frauenkatheter verwenden: Er erreicht die Blase nicht. "
        "Der Ballon würde in der Harnröhre geblockt. Das verletzt die Harnröhre schwer.")
    d.h3("Spitze und Material")
    d.table(
        None,
        [
            ["Nelaton-Spitze", "Gerade, abgerundete Spitze. Standard für Frau und Mann."],
            ["Tiemann-Spitze", "Leicht gebogene Spitze, z. B. bei vergrößerter Prostata. Die Biegung zeigt beim Einführen nach oben. "
                               "Wird meist von Ärztin/Arzt oder erfahrenen Pflegefachpersonen gelegt."],
            ["Latex (beschichtet)", "Nur für kurze Zeit (wenige Tage). Nicht bei Latexallergie!"],
            ["Silikon (Vollsilikon)", "Gut verträglich, latexfrei. Für eine längere Liegedauer (mehrere Wochen)."],
        ],
        [2600, 6460], size=10, first_col_bold=True,
    )
    d.p("❗ Wie lange ein Katheter liegen darf, steht in der **Herstellerangabe**. Daran halten Sie sich.", after=60)

    d.h3("Das geschlossene Urinableitungssystem")
    d.p("Ein DK wird immer an ein **geschlossenes Urinableitungssystem** angeschlossen. **Geschlossen** heißt: Katheter und "
        "Beutel bleiben fest verbunden. So kommen keine Bakterien in das System. Oft sind Katheter und Beutel schon im Set "
        "verbunden. Wichtige Teile:")
    d.bullets([
        "**Rückflussventil:** Urin kann nicht aus dem Beutel zurück in die Blase fließen.",
        "**Probeentnahmestelle:** Hier entnehmen Sie Urinproben (vorher desinfizieren).",
        "**Tropfkammer:** Der Urin tropft frei in den Beutel. **Luftfilter:** Luft kann entweichen, damit sich der Beutel füllt.",
        "**Ablassventil:** unten am Beutel. Hier leeren Sie den Beutel.",
        "Für eine genaue Messung (z. B. jede Stunde) gibt es Systeme mit Messkammer (**Urimeter**).",
    ])
    d.image(PNG / "ableitung.png", 14.5, "Abb. 2: Geschlossenes Urinableitungssystem am Bett", descr="Patient im Bett mit Urinbeutel unter Blasenniveau")
    d.qr_task(qr("1/"), "Arbeitsauftrag 1: Übung 1 – Katheter und Material",
              ["Scannen Sie den QR-Code. Beschriften Sie den Katheter und beantworten Sie die Fragen.",
               "Nur wenn **alle 10 Aufgaben richtig** sind, bekommen Sie Baustein 1."], SHORT + "1", 1)

    # ================================================================ 2
    d.h2("2 | Indikation: Braucht dieser Mensch wirklich einen DK?")
    d.lernziel("Sie können begründen, wann ein DK sinnvoll ist, wann nicht und welche Alternativen es gibt.")
    d.p("Ein DK ist ein **Fremdkörper**. Über den Katheter können Bakterien in die Blase wandern. Die **katheterassoziierte "
        "Harnwegsinfektion** gehört zu den häufigsten Infektionen im Krankenhaus (**nosokomiale Infektion**). "
        "Mit jedem Tag, an dem der DK liegt, steigt das Risiko.")
    d.merke("Merke", [
        "Ein DK wird nur gelegt, wenn es einen klaren medizinischen Grund gibt (**Indikation**).",
        "Die **Ärztin oder der Arzt ordnet** den DK an. Das Legen kann an Pflegefachpersonen delegiert werden. Auszubildende legen einen DK nur unter Anleitung.",
        "Die Indikation wird **jeden Tag** überprüft. Der DK bleibt **so kurz wie möglich**.",
        "Die Person wird informiert und muss **einwilligen**.",
    ])
    d.table(
        ["✅ Indikation (DK ist sinnvoll)", "🚫 Keine Indikation", "⛔ Kontraindikation"],
        [[
            ["akuter **Harnverhalt** oder Abflussstörung (z. B. vergrößerte Prostata), wenn ein Einmalkatheter nicht reicht",
             "genaue **Bilanz** / stündliche Urinmessung bei schwer kranken Menschen (z. B. Intensivstation)",
             "bestimmte **Operationen** (z. B. lange OPs, OPs an Harnwegen)",
             "**Inkontinenz und offene Wunde** im Gesäß- oder Intimbereich (z. B. Dekubitus Kat. 3–4)",
             "**Palliativpflege:** auf Wunsch, für mehr Komfort",
             "strenge Ruhigstellung (z. B. instabile Becken- oder Wirbelsäulenfraktur)"],
            ["**Inkontinenz allein**",
             "„weil es für das Personal einfacher ist“ (Zeit- oder Personalmangel)",
             "eine einzelne **Urinprobe** → Einmalkatheter oder Mittelstrahlurin",
             "**Restharn** messen → Blasenscanner oder Einmalkatheter",
             "Grund ist weggefallen (z. B. Patient ist wieder mobil) → DK entfernen"],
            ["Verdacht auf **Verletzung der Harnröhre** (z. B. Blut an der Harnröhrenöffnung nach Beckentrauma)",
             "akute **Entzündung** von Harnröhre, Prostata oder Nebenhoden",
             "bekannte Engstelle der Harnröhre (Striktur): nur ärztlich",
             "→ Kein DK durch die Pflege. **Ärztin oder Arzt informieren**."],
        ]],
        [3020, 3020, 3020], size=9.5,
    )
    d.h3("Alternativen zum DK")
    d.bullets([
        "**Einmalkatheterismus** (intermittierend, auch als Selbstkatheterismus): geringeres Infektionsrisiko.",
        "**Kondomurinal** beim Mann, **Inkontinenzmaterial**, regelmäßige Toilettengänge, Toilettentraining.",
    ])
    d.h3("Mögliche Komplikationen")
    d.table(
        None,
        [
            ["Harnwegsinfektion", "häufigste Komplikation; im schlimmsten Fall **Urosepsis** (Blutvergiftung, lebensgefährlich)"],
            ["Verletzung", "Verletzung der Harnröhre, falscher Weg (**Via falsa**), Blutung; Ballon in der Harnröhre geblockt"],
            ["Paraphimose", "Die Vorhaut bleibt hinter der Eichel. Die Eichel schwillt an und wird schlecht durchblutet."],
            ["Verstopfung", "Ablagerungen am Katheter (**Inkrustation**), Blasensteine; der Urin fließt nicht mehr ab"],
            ["Sonstiges", "Blasenkrämpfe, Urin läuft neben dem Katheter heraus, später Engstelle der Harnröhre (Striktur)"],
        ],
        [2400, 6660], size=10, first_col_bold=True,
    )
    d.qr_task(qr("2/"), "Arbeitsauftrag 2: Übung 2 – Braucht diese Person einen DK?",
              ["Entscheiden Sie bei 10 Fällen: DK sinnvoll? Alternative? Kontraindikation?",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 2."], SHORT + "2", 2)

    # ================================================================ 3
    d.h2("3 | Vorbereitung und Durchführung")
    d.lernziel("Sie können das Legen eines DK bei Frau und Mann aseptisch und in der richtigen Reihenfolge beschreiben.")
    d.p("Die Harnblase ist normalerweise **keimfrei (steril)**. Deshalb arbeiten Sie beim Legen eines DK **aseptisch**: "
        "Alles, was in die Harnröhre kommt, muss steril sein. Sie fassen den Katheter nur mit sterilen Handschuhen "
        "(oder mit einer sterilen Pinzette) an – nie mit unsterilen Händen.")
    d.image(PNG / "harnroehre.png", 15.5, "Abb. 3: Harnröhre bei Frau und Mann (vereinfacht, Seitenansicht)", descr="Vergleich der Harnröhre bei Frau und Mann")
    d.h3("Vor dem Legen")
    d.bullets([
        "**Anordnung prüfen:** Art, Größe (Ch) und Material des Katheters, Blockmenge.",
        "Person **informieren** und **Einwilligung** einholen. Jeden Schritt ruhig erklären.",
        "**Intimsphäre schützen:** Tür schließen, Sichtschutz, nur den Intimbereich aufdecken. Scham ist normal. Fragen Sie, ob eine "
        "Pflegeperson des gleichen Geschlechts gewünscht ist (z. B. aus kulturellen oder religiösen Gründen).",
        "Eine **zweite Pflegeperson** zur Assistenz ist hilfreich (z. B. zum Anreichen oder bei unruhigen Menschen).",
        "**Intimpflege** vorher mit Wasser und Waschlotion (unsterile Handschuhe). Danach Hände desinfizieren.",
        "**Lagerung:** Rückenlage, Oberkörper flach, Schutzunterlage unter das Gesäß. "
        "Frau: Beine angewinkelt und gespreizt. Mann: Beine leicht gespreizt.",
    ])
    d.h3("Material")
    d.table(
        None,
        [
            ["Steriles Katheterset", "sterile Unterlage, Lochtuch, Tupfer, Pinzette, sterile Handschuhe; je nach Set auch Blockspritze und Gleitmittel"],
            ["Katheter", "in passender Größe und Länge **+ 1 Reservekatheter**"],
            ["Schleimhaut-Antiseptikum", "z. B. auf Octenidin-Basis (Einwirkzeit nach Hersteller). Kein alkoholisches Hautdesinfektionsmittel!"],
            ["Gleitmittel (steril)", "Frau: steriles Gleitmittel. Mann: Gleitmittel **mit Lokalanästhetikum** (z. B. Lidocain-Gel in Einmalspritze)"],
            ["Blockspritze", "mit **sterilem Aqua dest.** oder **8–10 % Glycerinlösung** – nach Herstellerangabe. "
                             "❗ Kein NaCl 0,9 % (bildet Kristalle, verstopft den Kanal). Keine Luft (Ballon schwimmt auf)."],
            ["Ableitungssystem", "geschlossenes Urinableitungssystem mit Halterung"],
            ["Außerdem", "Händedesinfektionsmittel, unsterile Handschuhe, Schutzunterlage, Abwurf, Fixiermaterial, gutes Licht"],
        ],
        [2600, 6460], size=10, first_col_bold=True,
    )
    d.h3("Durchführung bei der Frau")
    d.steps([
        "Hände desinfizieren. Katheterset auf einer sauberen Arbeitsfläche **steril öffnen**. Katheter und Ableitungssystem steril dazulegen.",
        "Hände desinfizieren, **sterile Handschuhe** anziehen. Lochtuch auflegen. Tupfer mit Antiseptikum tränken, Katheter mit dem Beutel verbinden, Blockspritze bereitlegen.",
        "Mit der **nicht-dominanten Hand** (Rechtshänder: links) die großen Schamlippen spreizen. ❗ Diese Hand ist jetzt **unsteril**. Sie bleibt bis zum Blocken an der gleichen Stelle.",
        "**Desinfizieren** mit Pinzette und Tupfer: **von oben nach unten** (von der Symphyse Richtung Anus), **für jeden Wisch einen neuen Tupfer** – große Schamlippen, kleine Schamlippen, zuletzt die Harnröhrenöffnung. Den letzten Tupfer vor den Scheideneingang legen. Einwirkzeit beachten.",
        "Katheterspitze mit Gleitmittel versehen. Katheter mit der sterilen Hand langsam einführen (ca. 4–6 cm), **bis Urin fließt**. Dann noch **2–3 cm weiter** schieben.",
        "Ballon mit der angegebenen Menge **blocken** (steht auf dem Ventil, meist 10 ml). Die Patientin nach Schmerzen fragen.",
        "Katheter vorsichtig **zurückziehen**, bis ein leichter Widerstand spürbar ist. Jetzt liegt der Ballon am Blasenausgang.",
        "Tupfer entfernen, Intimbereich abtrocknen. Katheter **ohne Zug** am Oberschenkel fixieren. Beutel **unter Blasenniveau** aufhängen.",
        "Patientin bequem lagern, Material entsorgen, Hände desinfizieren, **dokumentieren**.",
    ], after_last=60)
    d.p("❗ **Katheter in der Scheide?** Den Katheter liegen lassen (als Orientierung). Mit einem **neuen, sterilen Katheter** neu beginnen.", after=60)
    d.qr_task(qr("3/"), "Arbeitsauftrag 3: Übung 3 – Den DK bei einer Frau legen",
              ["Bringen Sie 10 Schritte in die richtige Reihenfolge und beantworten Sie 4 Fragen.",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 3."], SHORT + "3", 3)

    d.h3("Beim Mann ist anders")
    d.p("Die Harnröhre des Mannes ist **20–25 cm** lang. Sie hat **2 Krümmungen** und **Engstellen** (Prostata, Schließmuskel). "
        "Deshalb gilt zusätzlich:", after=40)
    d.bullets([
        "Penis mit einer sterilen Kompresse in die nicht-dominante Hand nehmen (diese Hand ist unsteril). **Vorhaut zurückschieben.**",
        "**Desinfizieren:** Harnröhrenöffnung und Eichel **kreisförmig von innen nach außen** – von der Harnröhrenöffnung weg, mehrmals, immer mit neuem Tupfer.",
        "**Gleitmittel mit Lokalanästhetikum** langsam in die Harnröhre spritzen. Harnröhrenöffnung kurz zuhalten. **Einwirkzeit** nach Herstellerangabe abwarten.",
        "Penis **gestreckt, ca. 90° zum Körper** (beim Liegen: senkrecht nach oben) halten. So wird die bewegliche Krümmung gerade (Abb. 3).",
        "Katheter langsam einführen. Bei Widerstand (Schließmuskel, Prostata): Penis langsam **Richtung Beine senken**, Patient tief und ruhig atmen lassen.",
        "❗ **Nie mit Gewalt schieben!** Bei starkem Widerstand abbrechen und die Ärztin oder den Arzt informieren.",
        "Wenn Urin fließt: Katheter **fast bis zur Gabelung** einführen, dann blocken und zurückziehen, bis ein Widerstand spürbar ist.",
        "❗ **Vorhaut wieder nach vorne schieben!** Sonst droht eine **Paraphimose**.",
        "Katheter ohne Zug fixieren (je nach Hausstandard am Oberschenkel oder am Unterbauch).",
    ], after_last=60)
    d.box(
        d.p_xml("💧 Große Urinmenge (z. B. Herr Novak mit 900 ml)", bold=True, after=40, keep=True)
        + d.p_xml("Ältere Standards empfehlen, sehr große Urinmengen in Portionen abzulassen. Neuere Studien zeigen dafür keinen klaren "
                  "Nutzen. Halten Sie sich an den **Hausstandard** und beobachten Sie immer **Kreislauf** (Blutdruck, Puls) und "
                  "**Urin** (Blut?).", after=0)
    )
    d.p("**Dokumentation:** Datum und Uhrzeit, Grund/Anordnung, Kathetertyp, Material, Größe (Ch), Blockmenge, Urinmenge und "
        "Aussehen, Besonderheiten (z. B. Widerstand, Schmerzen), Handzeichen.", after=80)
    d.qr_task(qr("video/"), "Video: Den DK bei einem Mann legen (ca. 7 Min.)",
              ["Pflegefachfrauen aus Schweden zeigen das Legen eines DK beim Mann.",
               "Auf der Seite finden Sie einen Beobachtungsauftrag."],
              SHORT + "video")
    d.qr_task(qr("4/"), "Arbeitsauftrag 4: Übung 4 – Den DK bei einem Mann legen",
              ["Finden Sie die Fehler, die Pfleger Tim macht. Beantworten Sie 3 Fragen zum Video.",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 4."], SHORT + "4", 4)

    # ================================================================ 4
    d.h2("4 | Pflege bei liegendem DK")
    d.lernziel("Sie können Maßnahmen gegen Harnwegsinfektionen begründen und Komplikationen früh erkennen.")
    d.p("Bakterien kommen auf **zwei Wegen** in die Blase: **außen** am Katheter entlang (von der Haut im Intimbereich) und "
        "**innen** durch den Katheter (wenn das System geöffnet wird oder Urin zurückfließt). Ihre Pflege schützt vor beiden Wegen.", after=60)
    d.table(
        ["Das tun Sie", "Warum?"],
        [
            ["**Indikation täglich prüfen** lassen: „Braucht die Person den DK noch?“", "Jeder Tag weniger mit DK senkt das Infektionsrisiko."],
            ["**System geschlossen halten.** Katheter und Beutel nie trennen. Urinproben nur über die **Probeentnahmestelle** (vorher desinfizieren).", "Jedes Öffnen ist ein Weg für Bakterien."],
            ["Beutel **immer unter Blasenniveau**, aber **nie auf dem Boden** – auch beim Transport und beim Aufstehen.", "Kein Rückfluss in die Blase. Keine Keime vom Boden."],
            ["Schlauch **ohne Knick** und **ohne durchhängende Schlaufe**. Die Person liegt nicht auf dem Schlauch.", "Der Urin kann frei abfließen."],
            ["Beutel **rechtzeitig leeren** (spätestens bei 2/3): Hände desinfizieren, Einmalhandschuhe, **eigenes Gefäß** für jede Person. Das Ablassventil berührt das Gefäß nicht.", "Keine Übertragung von Keimen."],
            ["**Intimpflege** täglich und bei Bedarf mit **Wasser und pH-neutraler Waschlotion**. Krusten am Katheter vorsichtig entfernen. Vom Körper weg wischen. Beim Mann: Vorhaut zurück- und wieder vorschieben.", "Weniger Keime an der Harnröhrenöffnung. Desinfektionsmittel sind dafür nicht nötig."],
            ["Katheter **ohne Zug fixieren**, Fixierstelle regelmäßig wechseln.", "Keine Verletzung, keine Druckstellen."],
            ["**Viel trinken** lassen (z. B. 1,5–2 l pro Tag), wenn es erlaubt ist.", "Viel Urin spült Blase und Katheter."],
            ["**Kein** routinemäßiger Katheterwechsel nach festen Zeiten, **keine** Blasenspülung zur Vorbeugung, **kein** Abklemmen („Blasentraining“).", "Diese Maßnahmen schützen nicht vor Infektionen. Gewechselt wird nach Herstellerangabe oder bei Bedarf."],
        ],
        [5400, 3660], size=9.5,
    )
    d.h3("Beobachtung")
    d.bullets([
        "**Urin:** Menge (Ausfuhr, Bilanz), Farbe, Geruch, Trübung, Beimengungen (Blut, Flocken).",
        "**Zeichen einer Harnwegsinfektion:** Fieber, Schmerzen, Brennen, trüber und übel riechender Urin. "
        "❗ Bei alten Menschen oft nur: **neue Verwirrtheit, Unruhe** oder ein Sturz (→ Frau Brandt!).",
        "**Harnröhrenöffnung:** Rötung, Schwellung, Sekret, Druckstellen.",
        "**Katheter:** Fließt Urin ab? Läuft Urin neben dem Katheter heraus? Hat die Person Blasenkrämpfe?",
    ])
    d.box(
        d.p_xml("🔍 Es kommt kein Urin? Prüfen Sie zuerst:", bold=True, after=40, keep=True)
        + d.list_xml(["Ist der Schlauch abgeknickt oder liegt die Person darauf?", "Ist der Beutel voll oder hängt er zu hoch?",
                      "Ist der Katheter verstopft? Trinkt die Person zu wenig?",
                      "Können Sie die Ursache nicht beheben: **Ärztin oder Arzt informieren** (ggf. Blasenscanner)."], "bullet")
        + d.p_xml("**Bei Zeichen einer Infektion:** Vitalzeichen messen, Ärztin oder Arzt informieren, dokumentieren. "
                  "Eine Urinprobe nur nach Anordnung und nur aus der **Probeentnahmestelle** – nie aus dem Beutel.", before=60, after=0)
    )

    # ================================================================ 5
    d.h2("5 | Den DK entfernen")
    d.lernziel("Sie können einen DK fachgerecht entfernen und die Person danach beobachten.")
    d.bullets([
        "Nur nach **ärztlicher Anordnung**. Am besten **am Vormittag** – dann kann man tagsüber beobachten, ob die Person wieder selbst Wasser lassen kann.",
        "**Material:** Einmalhandschuhe, leere Spritze (passend zur Blockmenge), Zellstoff, Schutzunterlage, Abwurf.",
    ])
    d.steps([
        "Person informieren, Intimsphäre schützen, Schutzunterlage legen. Hände desinfizieren, Handschuhe anziehen.",
        "Fixierung lösen. Spritze auf das Blockventil setzen.",
        "Ballon **passiv entblocken:** Die Flüssigkeit läuft von selbst in die Spritze. Nicht kräftig ziehen – sonst bilden sich Falten am Ballon, die die Harnröhre verletzen können.",
        "Menge kontrollieren: Ist so viel Flüssigkeit in der Spritze, wie geblockt wurde?",
        "Person ausatmen lassen. Katheter **langsam und gleichmäßig** herausziehen. Katheter auf Vollständigkeit prüfen.",
        "Intimpflege, Material entsorgen, Hände desinfizieren, dokumentieren.",
    ], after_last=60)
    d.merke("Achtung", [
        "Der Ballon lässt sich **nicht entblocken**? **Nicht ziehen!** Ärztin oder Arzt informieren.",
        "**Danach beobachten:** Wann und wie viel Urin? Leichtes Brennen am Anfang ist normal. Kann die Person nach einigen Stunden "
        "(Hausstandard, meist ca. 6 Stunden) kein Wasser lassen oder hat sie Bauchschmerzen → Blasenscanner, Ärztin oder Arzt informieren (Harnverhalt?).",
    ])
    d.qr_task(qr("5/"), "Arbeitsauftrag 5: Übung 5 – Pflege, Beobachtung und Entfernung",
              ["12 Aussagen: richtig oder falsch? Dazu 2 Fragen zu Frau Brandt und Herrn Novak.",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 5."], SHORT + "5", 5)

    # ================================================================ Abschluss
    d.h2("Abschluss: Quiz und persönliche ID")
    d.p("Haben Sie alle 5 Bausteine? Dann scannen Sie den letzten QR-Code. Geben Sie Ihren Vornamen, den 1. Buchstaben Ihres "
        "Nachnamens und die 5 Bausteine ein. Danach machen Sie ein Abschlussquiz mit 10 Fragen. Ab 8 richtigen Antworten bekommen "
        "Sie Ihre **persönliche ID**.", after=80)
    d.qr_task(qr("ende/"), "Abschlussquiz und ID",
              ["Bausteine eingeben → Abschlussquiz → persönliche ID.",
               "Die ID passt nur zu Ihrem Namen. Geben Sie sie nicht weiter."], SHORT + "ende")
    d.box(
        d.p_xml("✉️ So schicken Sie mir Ihre ID", bold=True, after=60, keep=True)
        + d.list_xml([f"An: **{MAIL}**", "Betreff: **Vorname, 1. Buchstabe Nachname und ID** – z. B. „Lena M. DK-7F3A-92C0“",
                      "Der Text der E-Mail darf leer bleiben. Auf der Abschlussseite gibt es einen Knopf, der die E-Mail für Sie vorbereitet."], "decimal")
        + d.p_xml("✍️ Meine ID:   DK – _ _ _ _ – _ _ _ _", size=13, bold=True, before=200, after=60)
    )
    d.box(
        d.p_xml("🔄 Zurück zur Fallsituation", bold=True, after=40, keep=True)
        + d.p_xml("Können Sie die Fragen vom Anfang jetzt beantworten? Warum braucht Herr Novak einen DK? Was ist beim Mann anders? "
                  "Was kann bei Frau Brandt los sein, und was tun Sie? Wenn nicht: Lesen Sie die passenden Abschnitte noch einmal.", after=0)
    )

    # ================================================================ Checkliste
    d.h2("Praxis-Checkliste: DK legen (für den Praxiseinsatz)", page_break=True, before=0)
    d.p("Die praktische Übung findet später in der Praxisanleitung bzw. im Skills-Lab statt. Nehmen Sie diese Checkliste mit.", size=10, after=60)
    d.table(
        ["Phase", "Ich denke an …", "✓"],
        [
            ["Vorher", "Anordnung · Information/Einwilligung · Intimsphäre · Material vollständig (Reservekatheter!) · Intimpflege · Lagerung", "☐"],
            ["Asepsis", "Händedesinfektion · steriles Set · sterile Handschuhe · nicht-dominante Hand = unsteril · Non-Touch", "☐"],
            ["Frau", "Desinfektion von oben nach unten, je Wisch neuer Tupfer · Urin fließt → 2–3 cm weiter → blocken", "☐"],
            ["Mann", "Vorhaut zurück · kreisförmig von innen nach außen · Gel mit Lokalanästhetikum + Einwirkzeit · Penis 90° · nie Gewalt · bis zur Gabelung · Vorhaut wieder vor!", "☐"],
            ["Blocken", "Aqua dest. oder Glycerinlösung nach Hersteller · Menge laut Ventil · zurückziehen bis Widerstand", "☐"],
            ["Danach", "Fixierung ohne Zug · Beutel unter Blasenniveau, nicht auf dem Boden · Dokumentation", "☐"],
        ],
        [1400, 7060, 600], size=9.5, first_col_bold=True,
    )

    # ================================================================ Glossar
    d.h2("Glossar", before=240)
    glossar = [
        ("Antiseptikum", "Mittel, das Keime auf Haut oder Schleimhaut abtötet"),
        ("aseptisch", "ohne Keime arbeiten; alles, was in den Körper kommt, ist steril"),
        ("Bilanz", "Vergleich: Wie viel Flüssigkeit kommt in den Körper, wie viel geht hinaus?"),
        ("blocken / entblocken", "den Ballon des Katheters mit Flüssigkeit füllen / die Flüssigkeit wieder herauslassen"),
        ("Charrière (Ch)", "Maß für die Dicke eines Katheters; 1 Ch = 1/3 mm"),
        ("delegieren", "eine Aufgabe an eine andere Person übertragen (z. B. Ärztin → Pflegefachperson)"),
        ("dominante Hand", "die Hand, mit der man schreibt (Rechtshänder: rechts)"),
        ("Einwilligung", "Die Person sagt: „Ja, ich bin einverstanden.“"),
        ("Harnverhalt", "Die Blase ist voll, aber die Person kann kein Wasser lassen."),
        ("Indikation", "der medizinische Grund für eine Maßnahme"),
        ("Inkontinenz", "Urin (oder Stuhl) kann nicht gehalten werden."),
        ("Inkrustation", "harte Ablagerungen (Krusten) am oder im Katheter"),
        ("Kontraindikation", "ein Grund, warum eine Maßnahme nicht gemacht werden darf"),
        ("Lokalanästhetikum", "Medikament, das eine Körperstelle betäubt (z. B. Lidocain)"),
        ("Miktion", "Wasserlassen; Spontanmiktion = die Person lässt selbst Wasser"),
        ("nosokomial", "im Krankenhaus oder in einer Pflegeeinrichtung erworben"),
        ("Paraphimose", "Die zurückgeschobene Vorhaut schnürt die Eichel ein. Notfall!"),
        ("Prostata", "Drüse beim Mann unter der Harnblase; die Harnröhre geht durch sie hindurch"),
        ("Restharn", "Urin, der nach dem Wasserlassen noch in der Blase ist"),
        ("Schleimhaut", "feuchte Haut im Inneren des Körpers, z. B. in der Harnröhre"),
        ("steril", "frei von allen lebenden Keimen"),
        ("Symphyse", "Schambeinfuge, vorne am Becken"),
        ("transurethral", "durch die Harnröhre"),
        ("Urosepsis", "Blutvergiftung, die von den Harnwegen ausgeht; lebensgefährlich"),
        ("Via falsa", "„falscher Weg“: Der Katheter verletzt die Harnröhre und bildet einen falschen Kanal."),
    ]
    d.table(["Fachwort", "Erklärung in einfacher Sprache"], [[a, b] for a, b in glossar], [2600, 6460], size=10, first_col_bold=True)
    d.p("Quellen: Landeslehrplan BW Berufsfachschule Pflege (CE 05); KRINKO-Empfehlung „Prävention und Kontrolle Katheter-assoziierter "
        "Harnwegsinfektionen“ (2015); Lehrbuch Pflegias. Abbildungen: eigene Darstellungen (vereinfacht).", size=8, color="404040", before=80)

    return d.save(out, footer_text="ILS-Auftrag DK · 3BFP2")


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
