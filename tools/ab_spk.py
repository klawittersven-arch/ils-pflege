"""Erzeugt das Arbeitsblatt (Infotext + QR-Codes) für den ILS-Auftrag SPK als .docx.

Aufruf: python3 tools/ab_spk.py <vorlage.docx> <ausgabe.docx>
Baut auf dem ILS-Auftrag DK auf – dort Gelerntes wird nur kurz wiederholt, nicht erneut erklärt.
"""
import sys
from pathlib import Path

import qrcode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/spk/"
SHORT = "klawittersven-arch.github.io/ils-pflege/spk/"
MAIL = "Sven.Klawitter@Karoline-Breitinger-Schule.de"
PNG = ROOT / "tools/png"


def qr(path_part):
    out = PNG / f"qr-spk-{path_part.strip('/').replace('/', '-')}.png"
    img = qrcode.make(BASE + path_part, box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    img.save(out)
    return out


def build(template, out):
    d = Doc(template, ROOT / "tools/build_ab_spk")
    d.header_replace = {"> (DK)</w:t>": "> (SPK)</w:t>", "> Dauerkatheter</w:t>": "> Cystofix</w:t>"}

    # ================================================================ Start
    d.h1("Suprapubischer Katheter (SPK) – Cystofix")
    d.box(
        d.p_xml("So bearbeiten Sie diesen ILS-Auftrag (ca. 135 Minuten = 3 Schulstunden)", bold=True, after=60)
        + d.list_xml([
            "Dieser ILS-Auftrag baut auf dem ILS-Auftrag **„Transurethraler Dauerkatheter (DK)“** auf. Legen Sie das Arbeitsblatt dazu bereit.",
            "Sie brauchen: dieses Arbeitsblatt, einen Stift und ein Smartphone oder Tablet mit Internet.",
            "Lesen Sie die Abschnitte der Reihe nach. **Fachwörter** erklärt das Glossar am Ende.",
            "Nach jedem Abschnitt scannen Sie den **QR-Code** und machen die Übung. Geben Sie dort zuerst Ihren **Vornamen** und den **1. Buchstaben Ihres Nachnamens** ein.",
            "Sind **alle Aufgaben richtig**, bekommen Sie einen **persönlichen Baustein** mit 3 Ziffern (z. B. „HAUS-482“). Er gilt **nur für Ihren Namen** ✍️.",
            "Am Ende geben Sie alle 5 Bausteine ein, machen das Abschlussquiz und bekommen Ihre **persönliche ID**.",
            f"Sie schicken die ID per E-Mail an **{MAIL}**.",
        ], "decimal")
    )
    d.table(
        ["Schritt", "Inhalt", "Zeit", "Erledigt"],
        [
            ["Start", "Fallsituation, Lernziele, Wiederholung aus ILS 1", "10 Min.", "☐"],
            ["Abschnitt 1", "Was ist ein SPK? Vergleich mit dem DK  →  Übung 1", "25 Min.", "☐"],
            ["Abschnitt 2", "Indikationen und Kontraindikationen  →  Übung 2", "20 Min.", "☐"],
            ["Abschnitt 3", "Assistenz bei der Anlage  →  Übung 3", "25 Min.", "☐"],
            ["Abschnitt 4", "Pflege und Verbandswechsel  →  Übung 4", "30 Min.", "☐"],
            ["Abschnitt 5", "Miktionsversuch, Komplikationen, Entfernung  →  Übung 5", "15 Min.", "☐"],
            ["Abschluss", "Abschlussquiz, ID per E-Mail schicken", "10 Min.", "☐"],
        ],
        [1500, 5560, 1000, 1000], size=10,
    )
    d.p("🎯 **Lernziele:** Nach diesem ILS-Auftrag können Sie …", after=40, keep=True)
    d.bullets([
        "Lage und Funktion eines SPK beschreiben und den SPK mit dem DK vergleichen.",
        "Indikationen und Kontraindikationen eines SPK begründen.",
        "die Anlage eines SPK vorbereiten, dabei assistieren und die Nachsorge übernehmen.",
        "einen aseptischen Verbandswechsel am SPK beschreiben und die Einstichstelle beurteilen.",
        "einen Miktionsversuch begleiten, Komplikationen erkennen und richtig handeln.",
    ], after_last=120)
    d.box(
        d.p_xml("🔁 Das wissen Sie schon aus ILS 1 (Dauerkatheter)", bold=True, after=40, keep=True)
        + d.list_xml([
            "Aufbau eines Ballonkatheters, Größe in Charrière, Material (Silikon für eine lange Liegedauer)",
            "Blocken mit Aqua dest. oder Glycerinlösung, passives Entblocken",
            "geschlossenes Ableitungssystem, Beutel unter Blasenniveau, Urinproben aus der Probeentnahmestelle",
            "Maßnahmen gegen Harnwegsinfektionen, Beobachtung von Urin und Infektionszeichen, „Es kommt kein Urin?“",
        ], "bullet")
        + d.p_xml("👉 Das alles gilt **auch beim SPK**. In diesem ILS-Auftrag lernen Sie, was beim SPK **neu oder anders** ist.", before=60, after=0)
    )
    d.box(
        d.p_xml("📋 Fallsituation", bold=True, after=60, keep=True)
        + d.p_xml("Sie sind wieder im Praxiseinsatz.", after=80)
        + d.p_xml("**Herr Novak (72 Jahre)** kennen Sie schon: Er hat wegen eines Harnverhalts einen DK bekommen. Seine Prostata-OP ist "
                  "erst in 6 Wochen. Der Urologe sagt: „Für so lange Zeit ist ein DK nicht gut. Wir legen morgen einen suprapubischen "
                  "Katheter.“ Herr Novak fragt Sie: „Was ist das? Tut das weh? Was muss ich vorher machen?“", after=80)
        + d.p_xml("**Frau Weber (67 Jahre)** hat Multiple Sklerose. Sie lebt zu Hause und hat seit 2 Jahren einen SPK. Der ambulante "
                  "Pflegedienst macht regelmäßig den Verbandswechsel. Heute Morgen ruft Frau Weber aufgeregt an: „Mein Katheter ist beim "
                  "Anziehen herausgerutscht!“", after=80)
        + d.p_xml("**Fragen:** Warum bekommt Herr Novak einen SPK statt eines DK? Wie bereiten Sie ihn auf die Anlage vor? Wie versorgen "
                  "Sie die Einstichstelle bei Frau Weber? Was tun Sie, wenn der SPK herausgerutscht ist?", after=0)
    )

    # ================================================================ 1
    d.h2("1 | Was ist ein suprapubischer Katheter?")
    d.lernziel("Sie können Lage und Funktion eines SPK beschreiben und ihn mit dem DK vergleichen.")
    d.p("Ein **suprapubischer Katheter (SPK)** leitet den Urin **durch die Bauchdecke** direkt aus der Harnblase ab. "
        "**Suprapubisch** heißt: über dem Schambein. Die Einstichstelle liegt in der Mitte, etwa **2 Querfinger über dem Schambein**. "
        "Die Ärztin oder der Arzt sticht mit einer Hohlnadel durch die Bauchdecke in die **gefüllte** Blase (**Punktion**) und "
        "schiebt den Katheter hinein.")
    d.p("**Cystofix** ist der Handelsname eines Sets für einen SPK (Firma B. Braun). Im Alltag sagen viele „Cystofix“ zu jedem SPK.", before=60)
    d.image(PNG / "spk-lage.png", 15.5, "Abb. 1: Lage eines SPK (Seitenansicht, vereinfacht). Links: leere Blase – Gefahr für den Darm. Rechts: gefüllte Blase – sicherer Zugang.",
            descr="Seitenansicht: leere und gefüllte Blase mit SPK")
    d.h3("Kathetertypen")
    d.p("Meist ist der SPK ein **Ballonkatheter** aus Silikon – so wie Sie ihn aus ILS 1 kennen. Der Ballon hält ihn in der Blase. "
        "Bei manchen Systemen wird der Katheter stattdessen mit einer **Naht** oder einer **Fixierplatte** an der Haut befestigt. "
        "Welches System liegt, steht in der Dokumentation.")
    d.h3("Die Fistel")
    d.p("Um den Katheter herum entsteht mit der Zeit ein fester Kanal von der Haut bis in die Blase. Dieser Kanal heißt **Fistel**. "
        "Nach einigen Wochen ist sie stabil. Dann kann der Katheter gewechselt werden. ❗ Ohne Katheter zieht sich die Fistel "
        "**schnell** zusammen und verschließt sich – oft schon nach wenigen Stunden.")
    d.h3("SPK und DK im Vergleich")
    d.table(
        ["", "DK (transurethral)", "SPK (suprapubisch)"],
        [
            ["Weg", "durch die Harnröhre", "durch die Bauchdecke"],
            ["Wer legt ihn?", "Pflegefachperson (nach Delegation) oder Ärztin/Arzt", "**nur Ärztin/Arzt** (Punktion)"],
            ["Infektionsrisiko", "höher", "**geringer** (weit weg von Harnröhre und After)"],
            ["Harnröhre", "kann verletzt werden, später Engstelle möglich", "**bleibt frei**"],
            ["Selbst Wasser lassen", "nicht möglich", "**Miktionsversuch möglich**, Restharn über den SPK messbar"],
            ["Wunde", "keine", "**Einstichstelle** braucht Beobachtung und Verband"],
            ["Risiken beim Legen", "gering", "Blutung, Verletzung von Darm oder Bauchfell"],
            ["Wann?", "kurze Ableitung (wenige Tage)", "**längere Ableitung** oder wenn ein DK nicht möglich ist"],
            ["Alltag", "Katheter im Intimbereich stört (auch Sexualität)", "Intimbereich bleibt frei – für viele angenehmer"],
        ],
        [1900, 3460, 3700], size=9.5, first_col_bold=True,
    )
    d.qr_task(qr("1/"), "Arbeitsauftrag 1: Übung 1 – SPK: Grundlagen und Vergleich",
              ["Gilt eine Aussage nur für den DK, nur für den SPK oder für beide? Dazu 4 Fragen.",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 1."], SHORT + "1", 1)

    # ================================================================ 2
    d.h2("2 | Indikationen und Kontraindikationen")
    d.lernziel("Sie können begründen, wann ein SPK sinnvoll ist und wann nicht.")
    d.p("Ein SPK ist besser als ein DK, wenn der Urin **längere Zeit** abgeleitet werden muss (Faustregel: länger als etwa 5 Tage) "
        "oder wenn ein DK **nicht möglich** ist.")
    d.merke("Merke", [
        "Die **Ärztin oder der Arzt** stellt die Indikation und **legt** den SPK. Die Pflege bereitet vor, assistiert und übernimmt Nachsorge und Pflege.",
        "Die Person wird ärztlich **aufgeklärt** und gibt ihre **schriftliche Einwilligung** – die Punktion ist ein Eingriff.",
        "Auch beim SPK gilt: so lange wie nötig, so kurz wie möglich. Die Indikation wird regelmäßig überprüft.",
    ])
    d.table(
        ["✅ Indikationen (SPK ist sinnvoll)", "⛔ Kontraindikationen (kein SPK / ärztliche Abwägung)"],
        [[
            ["Urin muss **längere Zeit** abgeleitet werden (z. B. bis zu einer Operation)",
             "ein **DK ist nicht möglich** oder kontraindiziert: Verletzung oder Engstelle der Harnröhre, akute Entzündung von Prostata, Harnröhre oder Nebenhoden",
             "**neurogene Blasenstörung** (z. B. Multiple Sklerose, Querschnittlähmung), wenn Selbstkatheterismus nicht möglich ist",
             "große Operationen im Bauch oder Becken, wenn danach **Miktionsversuche** geplant sind"],
            ["Blase **nicht gefüllt** oder im Ultraschall nicht sicher zu sehen",
             "**Gerinnungsstörung** oder Gerinnungshemmer (Blutungsgefahr)",
             "**Blasentumor** (bekannt oder Verdacht)",
             "Narben oder frühere Operationen am Unterbauch (Darm kann verwachsen sein)",
             "Hautinfektion an der Einstichstelle; Schwangerschaft (ärztliche Abwägung)"],
        ]],
        [4530, 4530], size=9.5,
    )
    d.p("Für eine einzelne Urinprobe oder bei Inkontinenz allein ist ein SPK – genau wie ein DK – **nicht** angezeigt (siehe ILS 1).", after=60)
    d.qr_task(qr("2/"), "Arbeitsauftrag 2: Übung 2 – Ist ein SPK sinnvoll?",
              ["Entscheiden Sie bei 10 Fällen: SPK sinnvoll? Andere Lösung besser? Kontraindikation?",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 2."], SHORT + "2", 2)

    # ================================================================ 3
    d.h2("3 | Assistenz bei der Anlage")
    d.lernziel("Sie können die Anlage eines SPK vorbereiten, dabei assistieren und die Nachsorge übernehmen.")
    d.h3("Vorbereitung", before=0)
    d.bullets([
        "Ärztliche **Aufklärung** und **schriftliche Einwilligung** liegen vor.",
        "**Gerinnungswerte** (z. B. INR/Quick, PTT, Thrombozyten) nach Anordnung. Gerinnungshemmer nur nach **ärztlicher Anordnung** pausieren.",
        "**Blase gut füllen** (Abb. 1): Die Person trinkt reichlich oder bekommt eine Infusion nach Anordnung und geht vorher **nicht** zur Toilette. "
        "Hat die Person einen DK, füllt die Ärztin oder der Arzt die Blase darüber oder ordnet an, ihn abzuklemmen.",
        "**Haare kürzen** (z. B. mit einem Clipper) – **nicht rasieren**: Rasieren verursacht kleine Verletzungen und erhöht das Infektionsrisiko.",
        "**Vitalzeichen** messen (Ausgangswerte). **Lagerung:** flache Rückenlage. Intimsphäre schützen.",
        "Die Person **begleiten:** Ablauf erklären, Ängste ernst nehmen. Die Punktion erfolgt mit örtlicher Betäubung.",
    ])
    d.h3("Material")
    d.table(
        None,
        [
            ["Punktionsset", "SPK-Set (z. B. Cystofix): Punktionskanüle, Katheter, ggf. Fixierplatte"],
            ["Ultraschall", "Ultraschallgerät: Die Ärztin/der Arzt prüft damit, ob die Blase voll ist"],
            ["Desinfektion, Betäubung", "Hautantiseptikum (Einwirkzeit!), Lokalanästhetikum, Spritzen, Kanülen"],
            ["Steril", "Lochtuch, sterile Handschuhe, steriler Kittel, Mund-Nasen-Schutz, Haube, Skalpell, ggf. Nahtmaterial"],
            ["Katheter", "Blockspritze mit Aqua dest. oder Glycerinlösung (bei Ballonkatheter, nach Hersteller), geschlossenes Ableitungssystem"],
            ["Verband", "sterile Schlitzkompresse, Kompressen, Pflaster; Schutzunterlage, Abwurf"],
        ],
        [2600, 6460], size=10, first_col_bold=True,
    )
    d.h3("So läuft die Anlage ab")
    d.steps([
        "Die Ärztin/der Arzt kontrolliert die **volle Blase** mit Ultraschall und bestimmt die Einstichstelle.",
        "Hautdesinfektion, steriles Abdecken, örtliche Betäubung. **Sie reichen das Material steril an.**",
        "Kleiner Hautschnitt, Punktion mit der Hohlnadel. Fließt Urin, ist die Nadel in der Blase.",
        "Der Katheter wird durch die Nadel in die Blase geschoben, die Nadel wird entfernt.",
        "Ballon blocken oder Katheter mit Naht/Fixierplatte sichern. Ableitungssystem anschließen.",
        "Steriler Verband mit **Schlitzkompresse**. Während der ganzen Zeit: Person beruhigen und beobachten (Schmerzen, Kreislauf).",
    ], after_last=60)
    d.h3("Nachsorge")
    d.bullets([
        "**Vitalzeichen** kontrollieren (Blutung? Kreislauf?).",
        "**Urin:** In den ersten Stunden ist er oft leicht blutig – das kann normal sein. Stärkere Blutung, Gerinnsel oder kein Abfluss → Ärztin/Arzt informieren.",
        "**Verband:** Nachblutung? Tritt Urin aus?",
        "**Bauch:** ❗ Harter Bauch, starke Schmerzen und Fieber → Verdacht auf Verletzung des Darms mit Bauchfellentzündung (**Peritonitis**): **sofort** Ärztin/Arzt informieren!",
        "**Dokumentation:** Datum, Uhrzeit, Kathetertyp, Größe (Ch), Blockmenge, Urin, Besonderheiten.",
    ])
    d.qr_task(qr("3/"), "Arbeitsauftrag 3: Übung 3 – Assistenz bei der Anlage",
              ["Bringen Sie 9 Schritte in die richtige Reihenfolge und beantworten Sie 4 Fragen.",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 3."], SHORT + "3", 3)

    # ================================================================ 4
    d.h2("4 | Pflege bei liegendem SPK")
    d.lernziel("Sie können die Einstichstelle beurteilen und einen aseptischen Verbandswechsel beschreiben.")
    d.p("Für das Ableitungssystem gilt alles aus ILS 1. **Neu beim SPK ist die Einstichstelle.** Sie ist eine kleine Wunde und "
        "eine mögliche Eintrittspforte für Keime.")
    d.image(PNG / "spk-verband.png", 15, "Abb. 2: Verband und Fixierung eines SPK (Ansicht von vorne, vereinfacht)", descr="Verband mit Schlitzkompresse und Schlaufe")
    d.h3("Beobachtung der Einstichstelle")
    d.bullets([
        "**Rötung, Schwellung, Wärme, Schmerzen** → Zeichen einer Infektion?",
        "**Sekret:** Farbe, Geruch, Menge. **Urin** tritt aus → Katheter verstopft oder verrutscht?",
        "**„Wildes Fleisch“** (Hypergranulation): überschießendes, leicht blutendes Gewebe am Katheter.",
        "**Lage des Katheters:** Hat sich die Markierung an der Haut verschoben? Ist die Fixierung locker?",
    ])
    d.h3("Verbandswechsel – wie oft?")
    d.p("Solange die Einstichstelle **noch nicht abgeheilt** ist: aseptischer Verbandswechsel täglich oder nach Hausstandard. "
        "Ist sie **abgeheilt und reizlos**: seltener, z. B. alle 2–3 Tage. **Immer sofort**, wenn der Verband nass, verschmutzt oder gelöst ist.")
    d.h3("Verbandswechsel Schritt für Schritt")
    d.steps([
        "Person informieren. Material richten: Händedesinfektionsmittel, unsterile Handschuhe, sterile Pinzette (oder sterile Handschuhe), sterile Kompressen, Hautantiseptikum, sterile Schlitzkompresse, Pflaster, Abwurf.",
        "Hände desinfizieren, unsterile Handschuhe anziehen.",
        "Alten Verband vorsichtig lösen – **den Katheter dabei festhalten**. Verband ansehen (Sekret? Blut? Urin?) und entsorgen.",
        "Handschuhe ausziehen, Hände desinfizieren. **Einstichstelle beurteilen** (siehe oben).",
        "Desinfizieren mit sterilen Kompressen: **kreisförmig von innen nach außen**, für jeden Wisch eine neue Kompresse. Den Katheter nahe der Haut mit abwischen. Einwirkzeit beachten. Krusten vorsichtig lösen (z. B. mit steriler NaCl-Lösung).",
        "Sterile **Schlitzkompresse** um den Katheter legen, bei Bedarf eine Kompresse darüber, mit Pflaster fixieren.",
        "Katheter in einer kleinen **Schlaufe** zugfrei und ohne Knick auf der Haut fixieren (Abb. 2).",
        "Material entsorgen, Hände desinfizieren, **dokumentieren** (Zustand der Einstichstelle, Verband, Datum).",
    ], after_last=60)
    d.h3("Alltag mit SPK")
    d.bullets([
        "**Duschen:** Ist die Einstichstelle abgeheilt und reizlos, ist Duschen meist erlaubt (Hausstandard). Danach trocknen und neu verbinden.",
        "**Kleidung:** Hosenbund und Gürtel dürfen nicht auf Einstichstelle oder Katheter drücken.",
        "**Unterwegs:** Beinbeutel – der Beutel bleibt immer unter Blasenniveau.",
        "**Katheterventil:** Statt eines Beutels kann nach ärztlicher Anordnung ein Ventil benutzt werden. Es wird regelmäßig geöffnet "
        "(z. B. alle 3–4 Stunden und bei Harndrang). Dazwischen füllt sich die Blase und bleibt „trainiert“. Voraussetzung: Die Person "
        "kann das Ventil bedienen und die Blase verträgt die Füllung.",
    ])
    d.h3("Katheterwechsel")
    d.p("Der SPK wird nach **Herstellerangabe** oder bei Bedarf gewechselt (z. B. Verstopfung, Infektion). Den **ersten Wechsel** macht "
        "die Ärztin oder der Arzt. Ist die Fistel stabil, können Wechsel – je nach Einrichtung und Qualifikation – an Pflegefachpersonen "
        "delegiert werden. Es wird aseptisch gearbeitet. ❗ Alles liegt bereit: Der neue Katheter wird **sofort** nach dem Ziehen des "
        "alten eingeführt, weil sich der Kanal schnell zusammenzieht.", after=60)
    d.qr_task(qr("4/"), "Arbeitsauftrag 4: Übung 4 – Verbandswechsel und Pflege",
              ["Finden Sie die Fehler, die Pflegerin Mia beim Verbandswechsel macht. Dazu 3 Fragen.",
               "Nur wenn **alle Aufgaben richtig** sind, bekommen Sie Baustein 4."], SHORT + "4", 4)

    # ================================================================ 5
    d.h2("5 | Miktionsversuch, Komplikationen und Entfernung")
    d.lernziel("Sie können einen Miktionsversuch begleiten, Komplikationen erkennen und richtig handeln.")
    d.h3("Miktionsversuch (Blasentraining)", before=0)
    d.p("Ein großer Vorteil des SPK: Die Harnröhre ist frei. Die Person kann deshalb mit liegendem SPK üben, wieder selbst Wasser zu "
        "lassen – z. B. nach einer Prostata-OP. Der Restharn wird einfach über den SPK gemessen.")
    d.image(PNG / "spk-miktion.png", 15.5, "Abb. 3: Ablauf eines Miktionsversuchs", descr="Ablauf Miktionsversuch in 4 Schritten")
    d.merke("Achtung – Unterschied zu ILS 1", [
        "Beim **DK** ist Abklemmen („Blasentraining“) nicht sinnvoll.",
        "Beim **SPK** ist der Miktionsversuch mit Abklemmen ein normales Vorgehen – aber **nur nach ärztlicher Anordnung**. "
        "Wie oft und wie lange abgeklemmt wird, ordnet die Ärztin oder der Arzt an (z. B. tagsüber, nachts offen).",
        "Ist der Restharn mehrmals gering (Grenzwert laut Anordnung), entscheidet die Ärztin oder der Arzt über die Entfernung.",
    ])
    d.h3("Komplikationen – was tun Sie?")
    d.table(
        ["Komplikation", "Das tun Sie"],
        [
            ["**SPK herausgerutscht**", "Einstichstelle mit steriler Kompresse abdecken, **sofort** Ärztin/Arzt informieren – der Kanal kann sich in wenigen Stunden "
                                        "verschließen. Katheter aufbewahren, Person beobachten (Harndrang? Schmerzen?), dokumentieren."],
            ["**Verstopfung**\n(kein Urin, Bauch gespannt, Urin an der Einstichstelle)", "Knick und Lage prüfen (ILS 1). Hilft das nicht: Ärztin/Arzt "
                                                                                        "informieren. Spülen oder Wechsel **nur nach Anordnung**."],
            ["**Infektion der Einstichstelle**", "Dokumentieren, Ärztin/Arzt informieren, Verbandswechsel nach Anordnung."],
            ["**Blut im Urin**", "In den ersten Stunden nach der Anlage leicht blutig: beobachten. Stärker oder Gerinnsel: Ärztin/Arzt informieren."],
            ["**Wildes Fleisch, Blasenkrämpfe, Urin aus der Harnröhre**", "Dokumentieren und ärztlich abklären lassen."],
            ["**Darmverletzung** (selten, nach der Anlage)", "Harter Bauch, starke Schmerzen, Fieber: **Notfall** – sofort Ärztin/Arzt."],
        ],
        [3000, 6060], size=9.5,
    )
    d.h3("Den SPK entfernen")
    d.p("Nur nach **ärztlicher Anordnung** – meist nach erfolgreichen Miktionsversuchen. Wer entfernt (Ärztin/Arzt oder Pflegefachperson), "
        "regelt der Hausstandard.", after=40)
    d.steps([
        "Person informieren, Hände desinfizieren, Handschuhe anziehen. Verband und Fixierung lösen (eine Naht entfernt die Ärztin/der Arzt).",
        "Ballon **passiv entblocken** (wie in ILS 1). Katheter gleichmäßig herausziehen und auf Vollständigkeit prüfen.",
        "Einstichstelle desinfizieren und **steril abdecken**. Dokumentieren.",
    ], after_last=60)
    d.p("**Danach:** Die Einstichstelle verschließt sich meist innerhalb von **1–2 Tagen**. Bis dahin kann etwas Urin austreten → Verband "
        "bei Bedarf wechseln. Die Person soll regelmäßig zur Toilette gehen, damit die Blase nicht zu voll wird. Spontanmiktion beobachten (wie in ILS 1).", after=80)
    d.qr_task(qr("5/"), "Arbeitsauftrag 5: Übung 5 – Miktionsversuch, Komplikationen, Entfernung",
              ["8 Aussagen: richtig oder falsch? Dazu 4 Fragen zu Herrn Novak und Frau Weber.",
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
        + d.list_xml([f"An: **{MAIL}**", "Betreff: **Vorname, 1. Buchstabe Nachname und ID** – z. B. „Lena M. SPK-7F3A-92C0“",
                      "Der Text der E-Mail darf leer bleiben. Auf der Abschlussseite gibt es einen Knopf, der die E-Mail für Sie vorbereitet."], "decimal")
        + d.p_xml("✍️ Meine ID:   SPK – _ _ _ _ – _ _ _ _", size=13, bold=True, before=200, after=60)
    )
    d.box(
        d.p_xml("🔄 Zurück zur Fallsituation", bold=True, after=40, keep=True)
        + d.p_xml("Können Sie die Fragen vom Anfang jetzt beantworten? Warum bekommt Herr Novak einen SPK? Wie bereiten Sie ihn vor? "
                  "Wie versorgen Sie die Einstichstelle bei Frau Weber, und was tun Sie, wenn ihr SPK herausgerutscht ist? "
                  "Wenn nicht: Lesen Sie die passenden Abschnitte noch einmal.", after=0)
    )

    # ================================================================ Checkliste
    d.h2("Praxis-Checkliste: Verbandswechsel am SPK (für den Praxiseinsatz)", page_break=True, before=0)
    d.p("Die praktische Übung findet später in der Praxisanleitung bzw. im Skills-Lab statt. Nehmen Sie diese Checkliste mit.", size=10, after=60)
    d.table(
        ["Phase", "Ich denke an …", "✓"],
        [
            ["Vorher", "Information · Intimsphäre · Material vollständig (sterile Schlitzkompresse, Hautantiseptikum, Pinzette/sterile Handschuhe)", "☐"],
            ["Alter Verband", "Händedesinfektion · unsterile Handschuhe · Katheter festhalten · Verband ansehen · Handschuhe aus, Händedesinfektion", "☐"],
            ["Beurteilen", "Rötung · Schwellung · Sekret · Urinaustritt · wildes Fleisch · Lage/Markierung des Katheters", "☐"],
            ["Desinfektion", "kreisförmig von innen nach außen · je Wisch neue Kompresse · Katheter nahe der Haut mit abwischen · Einwirkzeit", "☐"],
            ["Neuer Verband", "sterile Schlitzkompresse · Pflaster · Katheter in Schlaufe, zugfrei, ohne Knick", "☐"],
            ["Danach", "Beutel unter Blasenniveau · Entsorgung · Händedesinfektion · Dokumentation", "☐"],
        ],
        [1600, 6860, 600], size=9.5, first_col_bold=True,
    )

    # ================================================================ Glossar
    d.h2("Glossar (neue Fachwörter)", before=240)
    glossar = [
        ("Assistenz", "Mithilfe bei einer ärztlichen Maßnahme, z. B. Material anreichen"),
        ("Dislokation", "Der Katheter ist verrutscht oder herausgerutscht."),
        ("Fistel", "Kanal von der Haut bis in die Blase, der sich um den SPK bildet"),
        ("Gerinnungshemmer", "Medikamente, die das Blut „dünner“ machen (z. B. Marcumar®). Blutungsgefahr bei Eingriffen."),
        ("Hypergranulation", "„wildes Fleisch“: zu viel neues Gewebe an der Einstichstelle"),
        ("INR / Quick", "Laborwerte, die zeigen, wie gut das Blut gerinnt"),
        ("Katheterventil", "kleiner Verschluss am Katheter statt Urinbeutel; wird regelmäßig geöffnet"),
        ("Miktionsversuch", "Die Person versucht, mit abgeklemmtem SPK selbst Wasser zu lassen."),
        ("neurogene Blasenstörung", "Die Blase funktioniert wegen einer Nervenerkrankung nicht richtig (z. B. bei MS)."),
        ("Peritonitis", "Entzündung des Bauchfells; Notfall"),
        ("Punktion", "Einstich mit einer Hohlnadel in ein Organ, z. B. in die Blase"),
        ("Querfinger", "Maß: die Breite eines Fingers (ca. 1,5–2 cm)"),
        ("Schlitzkompresse", "Kompresse mit einem Schlitz, die man um einen Katheter legen kann"),
        ("suprapubisch", "über dem Schambein (durch die Bauchdecke)"),
        ("Ultraschall (Sonografie)", "Untersuchung mit Schallwellen; zeigt z. B., ob die Blase gefüllt ist"),
    ]
    d.table(["Fachwort", "Erklärung in einfacher Sprache"], [[a, b] for a, b in glossar], [2800, 6260], size=10, first_col_bold=True)
    d.p("Quellen: Landeslehrplan BW Berufsfachschule Pflege (CE 05); KRINKO-Empfehlung „Prävention und Kontrolle Katheter-assoziierter "
        "Harnwegsinfektionen“ (2015); Lehrbuch Pflegias. Abbildungen: eigene Darstellungen (vereinfacht).", size=8, color="404040", before=80)

    return d.save(out, footer_text="ILS-Auftrag SPK · 3BFP2")


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
