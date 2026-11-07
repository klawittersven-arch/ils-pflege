"""Arbeitsblatt (Infotext + QR-Codes + Examens-Training) für den ILS-Auftrag „Wunddrainagen“.

Aufruf: python3 tools/ab_drainage.py   → arbeitsblatt/ILS_Wunddrainagen_AB.docx (+ .pdf mit LibreOffice)
Fachliche Grundlage: Pflegias Band 1 (S. 643–648, 684–686) und Band 2 (S. 359, 418, 801, 811).
"""
import subprocess
import sys
from pathlib import Path

import qrcode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc, TABLE_W  # noqa: E402
import drainage_inhalt as I  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/drainage/"
KURZ = "klawittersven-arch.github.io/ils-pflege/drainage/"
MAIL = "Sven.Klawitter@Karoline-Breitinger-Schule.de"
BUILD = ROOT / "tools/build_drainage"
PNG = BUILD / "png"
VORLAGE = ROOT / "tools/vorlage"
AUS = ROOT / "arbeitsblatt"


def qr(teil):
    PNG.mkdir(parents=True, exist_ok=True)
    out = PNG / f"qr-{teil.strip('/').replace('/', '-') or 'start'}.png"
    qrcode.make(BASE + teil, box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M).save(out)
    return out


def linien(d, n):
    """Schreiblinien als Tabelle mit waagerechten Linien."""
    grenzen = ('<w:top w:val="nil"/><w:left w:val="nil"/><w:right w:val="nil"/>'
               '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>'
               '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/><w:insideV w:val="nil"/>')
    halten = '<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>'
    zeilen = "".join(f'<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="440" w:hRule="exact"/></w:trPr>'
                     f'{d.cell(halten if k < n - 1 else "<w:p/>", TABLE_W)}</w:tr>' for k in range(n))
    return (f'<w:tbl><w:tblPr><w:tblW w:w="{TABLE_W}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>{grenzen}</w:tblBorders>'
            f'<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="{TABLE_W}"/></w:tblGrid>{zeilen}</w:tbl>')


def examens_training(d, nr, schreiben, zeilen):
    auftrag = schreiben["auftrag"].replace("<strong>", "**").replace("</strong>", "**")
    kopf = (f'<w:p>{d.ppr(0, 40, keep=True)}{d.image_run(VORLAGE / "icon_stift.png", 0.55)}'
            f'{d.runs(f"  Examens-Training {nr}", bold=True)}</w:p>')
    kopf += d.p_xml(auftrag, after=40, keep=True)
    kopf += d.p_xml("Schreiben Sie in ganzen Sätzen oder Stichpunkten mit Fachbegriffen – wie im Examen. Danach vergleichen Sie am Handy "
                    "mit dem Erwartungshorizont.", size=9, color="404040", after=0, keep=True)
    d.add(d.table_xml([d.cell(kopf, TABLE_W, "FFF4E8")], [TABLE_W], "B4572A", 8, cant_split=True))
    d.add(linien(d, zeilen))
    d.space(8)


def qr_uebung(d, nr, titel, zeilen):
    d.qr_task(qr(f"{nr}/"), f"Übung {nr}: {titel}", zeilen, f"{KURZ}{nr}/")


def build():
    d = Doc(VORLAGE / "ab_vorlage_kbs.docx", BUILD / "docx")
    d.header_replace = {
        "3BFP2 | KB I | Lo / ": "3BFP2 | Skills | ",
        "Themenblock I – Thema: Diabetes mellitus · Regelkreis &amp; sicheres Handeln":
            "Themenblock 2 – Notfall/Katastrophe · ILS Wunddrainagen",
    }

    # ================================================================ Start
    d.h1("ILS-Auftrag: Wunddrainagen – Redon- und Robinson-Drainage")
    d.box(
        d.p_xml("So bearbeiten Sie diesen ILS-Auftrag (ca. 90 Minuten)", bold=True, after=60)
        + d.list_xml([
            "Scannen Sie den QR-Code **Start** und melden Sie sich **einmal** an: Klasse antippen, Vorname, Geburtstag.",
            "Lesen Sie einen Abschnitt auf diesem Arbeitsblatt. Scannen Sie dann den QR-Code der **Übung** und lösen Sie die Aufgaben am Handy.",
            "Ihre Lehrkraft sieht automatisch, welche Übungen Sie erledigt haben – Sie müssen nichts abschreiben oder per E-Mail schicken.",
            "Am Ende jeder Übung schreiben Sie im Kasten **Examens-Training** eine Antwort selbst – so wie im Examen.",
            "Zum Schluss machen Sie das **Abschlussquiz**. Es wird erst freigeschaltet, wenn alle Übungen erledigt sind.",
        ], "decimal")
        + d.p_xml("**Wichtig:** Erst lesen, dann tippen! Die Übungen merken, wenn Sie schneller antworten, als man lesen kann. "
                  "Bei mehr als 3 Fehlern gibt es eine Lesepause von 30 Sekunden und neue Aufgaben. "
                  "Ihr Zwischenstand bleibt gespeichert, auch wenn Sie das Handy weglegen.", size=10, before=60)
    )
    d.qr_task(qr(""), "Start: Anmelden und Übersicht", ["Hier sehen Sie auch jederzeit, welche Übungen Sie schon erledigt haben."], KURZ)
    d.table(
        ["Schritt", "Inhalt", "Zeit", "Erledigt"],
        [
            ["Start", "Fallsituation lesen, am Handy anmelden", "5 Min.", "☐"],
            ["Abschnitt 1", "Wozu Wunddrainagen?  →  Übung 1  →  Examens-Training 1", "15 Min.", "☐"],
            ["Abschnitt 2", "Beobachten und dokumentieren  →  Übung 2  →  Examens-Training 2", "20 Min.", "☐"],
            ["Abschnitt 3", "Komplikationen erkennen und handeln  →  Übung 3  →  Examens-Training 3", "20 Min.", "☐"],
            ["Abschnitt 4", "Sicherer Umgang, Hygiene und Recht  →  Übung 4  →  Examens-Training 4", "15 Min.", "☐"],
            ["Abschnitt 5", "Examens-Training Pflegeprozess  →  Übung 5", "10 Min.", "☐"],
            ["Abschluss", "Abschlussquiz", "5 Min.", "☐"],
        ],
        [1500, 5560, 1000, 1000], size=10,
    )
    d.p("**Lernziele:** Nach diesem ILS-Auftrag können Sie …", after=40, keep=True)
    d.bullets([
        "Zweck, Arten und Aufbau von Wunddrainagen erklären und Redon- und Robinson-Drainage unterscheiden,",
        "eine Drainage fachgerecht beobachten, die Fördermenge bilanzieren und dokumentieren,",
        "Komplikationen wie Nachblutung und Schock erkennen und richtig handeln,",
        "sicher und hygienisch mit Drainagen umgehen und die rechtlichen Grundlagen der Delegation erläutern,",
        "zu einer Patientin mit Drainage Pflegeprobleme (PESR), überprüfbare Ziele und konkrete Maßnahmen formulieren.",
    ], after_last=80)

    fall = (d.p_xml("Fallsituation", bold=True, size=12, after=60, keep=True)
            + d.p_xml("Frau Elke Kramer (74 Jahre) hat wegen einer Hüftgelenksarthrose rechts heute Vormittag eine **Hüft-Totalendoprothese (Hüft-TEP)** bekommen. "
                      "Um 14:30 Uhr übernehmen Sie sie aus dem Aufwachraum auf Ihre Station (Orthopädie/Unfallchirurgie). "
                      "Im Wundgebiet liegt eine **Redon-Drainage**, die an einer Redonflasche mit hohem Sog angeschlossen ist. "
                      "Zur Thromboseprophylaxe bekommt Frau Kramer **Enoxaparin** (ein Heparin) subkutan.", after=60)
            + d.p_xml("Frau Kramer ist wach und orientiert. Sie sagt: „Ich habe Angst, mich falsch zu bewegen und den Schlauch herauszureißen.“ "
                      "Morgen soll sie mit der Physiotherapie zum ersten Mal aufstehen.", after=0))
    d.box(fall, fill="F2F2F2")
    anordnung = (d.p_xml("Ärztliche Anordnung (Dr. Weber, Stationsärztin)", bold=True, after=40, keep=True)
                 + d.list_xml([
                     "Fördermenge der Redon in den ersten 6 Stunden **stündlich** ablesen und dokumentieren, danach **4-stündlich**.",
                     "Ärztin **sofort** informieren bei: mehr als **100 ml in einer Stunde**, hellrotem (frisch-blutigem) Sekret mit steigender Menge, "
                     "**keiner Förderung** in den ersten Stunden, **Puls über 100/min** oder **systolischem Blutdruck unter 100 mmHg**.",
                     "Entfernung der Redon voraussichtlich am 2. Tag nach der OP durch die Ärztin.",
                 ], "bullet"))
    d.add(d.table_xml([d.cell(anordnung, TABLE_W, "FFFFFF")], [TABLE_W], "000000", 12))
    d.space(6)

    # ================================================================ Abschnitt 1
    d.h2("Abschnitt 1: Wozu Wunddrainagen?", before=280)
    d.p("**Wunddrainagen** liegen in einer Körperhöhle oder im Gewebe. Sie leiten **Wundsekret und Blut** aus dem Körper ab – "
        "man nennt sie deshalb auch **äußere Drainagen**. Davon unterscheidet man **innere Drainagen**: Sie verbinden zwei Organe oder "
        "schienen einen verengten Gang, z. B. den Gallengang.", after=60)
    d.p("Drainagen werden **kurativ** eingesetzt (z. B. um Eiter aus einem Abszess oder ein Hämatom abzuleiten) oder **präventiv** – "
        "vor allem nach Operationen, um Blut und Wundsekret abzuleiten.", after=60)
    d.table(["Nutzen (Ziele)", "Mögliche Nachteile"], [[
        ["verhindern die Bildung eines **Hämatoms** (Bluterguss)", "senken das **Infektionsrisiko**",
         "beugen einer **Nahtdehiszenz** vor (Auseinanderklaffen der Wundränder)", "unterstützen, dass sich innere Wundflächen aneinanderlegen",
         "sollen die **Mobilisation** ermöglichen"],
        ["**Eintrittspforte für Erreger** – bei unhygienischem Umgang aufsteigende Infektionen, vor allem bei länger liegenden Drainagen",
         "das starre Schlauchende kann Gewebe schädigen (Blutungen, Verwachsungen)", "offene Drainagen: Haut weicht auf (Mazeration), Wundinfektion",
         "der Anblick kann Angst auslösen – auch Angst vor der Mobilisation"],
    ]], [4530, 4530], size=10)
    d.h3("Einteilung")
    d.table(["nach dem Wirkprinzip", "nach dem System"], [[
        ["**aktiv:** mit einer Saugquelle (Sog), z. B. **Redon-Drainage**", "**passiv:** ohne Sog – das Sekret fließt durch **Schwerkraft** (z. B. **Robinson-Drainage**) "
         "oder durch **Kapillarwirkung** (z. B. Easy-Flow-Drainage)"],
        ["**offen:** Sekret läuft direkt in den Verband (z. B. Penrose-Drainage)", "**halboffen:** abnehmbarer Auffangbehälter (z. B. Easy-Flow-Drainage)",
         "**geschlossen:** Auffangbehälter fest mit der Drainage verbunden, Entleerung über einen Ablaufstutzen (z. B. **Robinson-Drainage**)"],
    ]], [4530, 4530], size=10)

    d.h3("Die Redon-Drainage")
    d.p("Die Redon-Drainage ist eine **Saug- bzw. Vakuumdrainage**. Der dünne Drainagekatheter mit vielen seitlichen Öffnungen wird während der OP "
        "mit einem Redonspieß gelegt – z. B. im Gelenk, unter einer Muskelfaszie oder im Unterhautfettgewebe. Er tritt an einer **eigenen Stelle** "
        "neben der OP-Naht aus und ist dort mit einer Naht fixiert. Über einen Ableitungsschlauch ist er mit der **Redonflasche** (Vakuumflasche) verbunden. "
        "Durch den Sog legen sich die Wundränder schneller aneinander. In der Orthopädie wird meist **hoher Sog** verwendet, in der Neurochirurgie z. B. niedriger Sog. "
        "Nach Eingriffen am Bewegungsapparat können ein bis drei Drainagen liegen.", after=40)
    d.image(PNG / "redon-system.png", 13, "Abb. 1: Redon-Drainage mit Redonflasche (schematisch)")
    d.p("Der ziehharmonikaähnliche **Vakuumindikator** zeigt, ob noch genug Sog vorhanden ist:", after=20, keep=True)
    d.image(PNG / "vakuumindikator.png", 9, "Abb. 2: Vakuumindikator – zusammengezogen und entfaltet")
    d.p("Die Redon bleibt je nach Fördermenge meist **48–72 Stunden** liegen und wird dann von der Ärztin entfernt.", after=60)

    d.h3("Die Robinson-Drainage")
    d.p("Die Robinson-Drainage ist ein **geschlossenes** System ohne Sog: Ein weicher Schlauch leitet das Sekret aus einer Körperhöhle – häufig dem "
        "**Bauchraum**, z. B. nach einer Gallenblasen- oder Darm-OP – in einen Beutel ab. Der Beutel ist fest mit der Drainage verbunden und wird über einen "
        "**Ablaufstutzen** geleert. Weil das Sekret durch die **Schwerkraft** abfließt, hängt der Beutel immer **unterhalb des Wundniveaus**. "
        "Beispiel: Herr Yilmaz (58) hat nach einer Gallenblasen-OP eine Robinson-Drainage.", after=40)
    d.image(PNG / "robinson.png", 11, "Abb. 3: Robinson-Drainage mit Auffangbeutel (schematisch)")
    d.table(["", "Redon-Drainage", "Robinson-Drainage"], [
        ["Prinzip", "aktiv: Sog (Vakuumflasche)", "passiv: Schwerkraft"],
        ["System", "geschlossenes Saugsystem mit Flasche", "geschlossen: Beutel fest verbunden, Ablaufstutzen"],
        ["typischer Einsatz", "Bewegungsapparat (z. B. Hüft-TEP), Weichteile", "Bauchraum (z. B. Gallen-, Darm-OP)"],
        ["Darauf achten", "Vakuumindikator: zusammengezogen = Sog vorhanden", "Beutel immer unterhalb des Wundniveaus"],
    ], [1900, 3580, 3580], size=10, first_col_bold=True)
    qr_uebung(d, 1, "Wozu Wunddrainagen?", ["7 Aufgaben: Arten, Aufbau, Nutzen und Nachteile."])
    examens_training(d, 1, I.SCHREIBEN1, 5)

    # ================================================================ Abschnitt 2
    d.h2("Abschnitt 2: Beobachten und dokumentieren", before=280)
    d.p("**Übernahme aus dem OP:** Bei der Übergabe erhalten Sie Informationen zu allen Ableitungen (Drainagen, Sonden, Katheter) und ihren Fördermengen. "
        "Lassen Sie sich die Ableitungen zeigen, damit Sie sich selbst ein Bild machen. Danach wird die Patientin **engmaschig** kontrolliert – "
        "wenn nichts anderes angeordnet ist, in der Regel: **in der ersten Stunde alle 15 Minuten, in den nächsten zwei Stunden halbstündlich, danach stündlich**. "
        "Die Klingel liegt in Reichweite.", after=60)
    d.table(["Kriterium", "Worauf achten Sie?", "Warum?"], [
        ["Fördermenge", "regelmäßig ablesen (laut Anordnung), mit Datum und Uhrzeit dokumentieren", "eine Nachblutung früh erkennen; plötzlich keine Förderung → verstopft?"],
        ["Aussehen des Sekrets", "Farbe, Konsistenz und Geruch: blutig → blutig-serös → serös (wässrig); trüb oder eitrig (purulent), übel riechend", "Hinweis auf Blutung oder Infektion"],
        ["Sog (Redon)", "Vakuumindikator zusammengezogen?", "entfaltet = kein Sog mehr → Flasche wechseln"],
        ["Durchgängigkeit", "Schlauch nicht abgeknickt; die Patientin liegt nicht auf dem Schlauch", "Förderstau → Hämatom; Dekubitusgefahr durch den Schlauch"],
        ["Fixierung, Austrittsstelle, Verband", "sicher fixiert? Rötung, Schwellung, Sekret an der Austrittsstelle? Verband durchgeblutet?", "Herausrutschen, Infektion, Nachblutung"],
        ["die Patientin selbst", "Schmerzen, Puls, Blutdruck, Hautfarbe, Bewusstsein", "Schockzeichen und Schmerzen früh erkennen"],
    ], [1900, 3880, 3280], size=10, first_col_bold=True)
    d.p("**Dokumentation:** Die Fördermenge wird mit **Datum und Uhrzeit** in der Patientenkurve dokumentiert. Beim Flaschenwechsel dokumentieren Sie "
        "den **Wechsel** und die **Fördermenge der entfernten Flasche** – sonst stimmt die Gesamtmenge später nicht. Fördert die Redon in den ersten Stunden "
        "nach der OP **gar nicht**, informieren Sie die Ärztin.", after=80)
    d.p("**Drainageprotokoll von Frau Kramer** (Stand der Skala in ml)", after=40, keep=True)
    d.table(["Uhrzeit", "Skala", "Aussehen", "Vakuumindikator", "Puls / RR", "Bemerkung"], [
        ["14:30", "40 ml", "blutig", "zusammengezogen", "80 / 130/80", "Übernahme aus dem Aufwachraum"],
        ["15:30", "90 ml", "blutig", "zusammengezogen", "82 / 128/78", ""],
        ["16:30", "125 ml", "blutig-serös", "zusammengezogen", "80 / 130/80", ""],
        ["17:30", "150 ml", "blutig-serös", "zusammengezogen", "78 / 132/80", ""],
        ["18:30", "170 ml", "blutig-serös", "zusammengezogen", "76 / 130/78", ""],
        ["19:30", "185 ml", "blutig-serös", "zusammengezogen", "78 / 128/76", ""],
        ["20:30", "195 ml", "blutig-serös", "**entfaltet**", "76 / 130/80", "Flasche gewechselt, alte Flasche: 195 ml"],
        ["0:30", "30 ml", "serös-blutig", "zusammengezogen", "72 / 126/78", "neue Flasche"],
    ], [900, 900, 1500, 1700, 1460, 2600], size=9)
    qr_uebung(d, 2, "Beobachten und dokumentieren", ["8 Aufgaben – einige brauchen das Drainageprotokoll und die ärztliche Anordnung."])
    examens_training(d, 2, I.SCHREIBEN2, 7)

    # ================================================================ Abschnitt 3
    d.h2("Abschnitt 3: Komplikationen erkennen und handeln", before=280)
    d.table(["Komplikation", "Hinweise", "Was tun?"], [
        ["Nachblutung", "plötzlich viel, hellrotes (frisch-blutiges) Sekret; Verband durchgeblutet; Schwellung; Schockzeichen", "sofort Ärztin informieren, bei der Patientin bleiben, Vitalzeichen engmaschig (siehe Schock)"],
        ["keine Förderung", "in den ersten Stunden nach der OP fließt nichts", "auf Knicke prüfen, Ärztin informieren – oft sind die Öffnungen im Körper verklebt"],
        ["Sog verloren / undicht", "Vakuumindikator entfaltet; nach dem Wechsel sofort wieder entfaltet", "Flasche wechseln; entfaltet er sich wieder: Verbindungen prüfen, Ärztin informieren (Leck oder verrutschte Drainage)"],
        ["Hämatom", "Schwellung, Schmerzen, Haut rötlich bis blau-violett (später grün, gelb)", "beobachten, kühlen nach Anordnung, Ärztin informieren"],
        ["Infektion", "trübes, eitriges oder übel riechendes Sekret; Rötung, Schwellung, Überwärmung, Schmerz an der Austrittsstelle; Fieber", "Ärztin informieren, Befund dokumentieren"],
        ["herausgerutscht / gelöst", "Drainage liegt außerhalb, Verbindung offen", "Austrittsstelle steril abdecken, Ärztin informieren, Drainage zur Kontrolle aufbewahren – nie wieder einschieben"],
    ], [1900, 3580, 3580], size=10, first_col_bold=True)
    d.merke("Niemals eigenmächtig", [
        "eine blutig fördernde Drainage **abklemmen**: Das Blut sammelt sich dann im Gewebe (Hämatom) und die Blutung bleibt unbemerkt,",
        "die Flasche oder den Beutel über das Wundniveau heben, den Sog verändern oder eine Drainage anspülen – nur auf ärztliche Anordnung.",
    ])
    d.h3("Nachblutung → Schock")
    d.p("Ein **hämorrhagischer Schock** ist ein Volumenmangelschock durch akuten Blutverlust: Sauerstoffangebot und -bedarf stehen nicht mehr im Gleichgewicht. "
        "**Achtung:** In der Frühphase ist der Blutdruck oft **noch normal** – achten Sie früh auf Puls, Haut und Bewusstsein.", after=40)
    d.table(["Merkmal (Erwachsene)", "Frühphase", "Spätphase"], [
        ["Puls", "schwach, schnell, über 100/min", "über 120/min"],
        ["systolischer Blutdruck", "normal", "unter 100 mmHg"],
        ["Haut", "blass, kühl, feucht", "klebriger Schweiß, Zyanose"],
        ["Atmung", "beschleunigt", "über 20/min, Hyperventilation"],
        ["Bewusstsein", "ängstlich, unruhig", "teilnahmslos, benommen"],
        ["Urin", "20–30 ml pro Stunde", "Oligurie bzw. Anurie"],
    ], [3020, 3020, 3020], size=10, first_col_bold=True)
    d.p("**Sofortmaßnahmen:** Hilfe holen und die Ärztin sofort informieren · die Person **nicht allein lassen** · Vitalzeichen engmaschig messen · "
        "Blutung stillen, wenn möglich · **Schocklagerung** (Beine ca. 30° hoch – nicht bei Herzinfarkt oder Atemnot) · **Wärme erhalten**, aber nicht aktiv anwärmen · "
        "Ruhe und Zuspruch · keine Schmerzen provozieren · danach dokumentieren.", after=60)
    d.box(d.p_xml("Meldung an die Ärztin nach dem **SBAR-Schema**", bold=True, after=40)
          + d.list_xml([
              "**S – Situation:** „Frau Kramer, Zimmer 12: Ich vermute eine Nachblutung.“",
              "**B – Hintergrund (Background):** „Sie hat eine Hüft-TEP rechts und bekommt Enoxaparin.“",
              "**A – Einschätzung (Assessment):** „130 ml hellrotes Blut in einer Stunde, Puls 108, blass und feucht.“",
              "**R – Empfehlung (Recommendation):** „Bitte kommen Sie sofort.“",
          ], "bullet"))
    qr_uebung(d, 3, "Komplikationen erkennen", ["6 Aufgaben – mit einer Fallentscheidung: Was tun Sie zuerst?"])
    examens_training(d, 3, I.SCHREIBEN3, 7)

    # ================================================================ Abschnitt 4
    d.h2("Abschnitt 4: Sicherer Umgang, Hygiene und Recht", before=280)
    d.p("**Information nimmt Angst:** Wer schon vor der OP weiß, dass eine Drainage gelegt wird, und den Umgang geübt hat, hat weniger Angst vor der Mobilisation. "
        "Erklären Sie der Patientin, wozu die Drainage dient, wie sie sich damit bewegt und dass sie sich bei Unsicherheit oder Schmerzen sofort meldet – "
        "die **Klingel** liegt in Reichweite.", after=40)
    d.bullets([
        "Schlauch und Flasche **sicher fixieren**, der Schlauch darf **nicht abknicken**; die Patientin soll **nicht auf dem Schlauch liegen**.",
        "Beim Aufstehen und Gehen die Flasche bzw. den Beutel sicher befestigen (z. B. am Rollator oder in einer Halterung) – nie am Schlauch tragen.",
        "Robinson-Beutel immer **unterhalb des Wundniveaus** – auch beim Transport. Sonst kann Sekret zurückfließen.",
    ], after_last=60)
    d.h3("Wechsel der Redonflasche")
    d.p("Die Flasche wird gewechselt, wenn sie **voll** oder der **Vakuumindikator entfaltet** ist.", after=20)
    d.steps([
        "Patientin informieren: Beim Öffnen setzt sofort Sog ein – das kann einen kurzen **Sekundenschmerz** auslösen.",
        "Hände desinfizieren, Einmalhandschuhe anziehen.",
        "**Erst die patientennahe, dann die patientenferne Klemme schließen.**",
        "Ableitung von der alten Flasche lösen, das **Ansatzstück sprühdesinfizieren**.",
        "Neue Redonflasche mit **sichtbarem Sog** und verschlossener Ableitung anschließen.",
        "**Erst die patientennahe, dann die patientenferne Klemme öffnen**, Sog am Vakuumindikator prüfen.",
        "Fördermenge der alten Flasche ablesen, Flasche entsorgen, Handschuhe ausziehen, Hände desinfizieren, **Wechsel und Fördermenge dokumentieren**.",
    ], after_last=60)
    d.p("**Robinson-Beutel leeren:** Mit Einmalhandschuhen über den **Ablaufstutzen** in einen Messbecher entleeren, den Stutzen desinfizieren und verschließen, "
        "Menge und Aussehen dokumentieren. Die Verbindung zwischen Drainage und Beutel wird dabei nicht geöffnet.", after=60)
    d.h3("Hygiene")
    d.p("Die Drainage ist eine **Eintrittspforte für Erreger**. Desinfizieren Sie Ihre Hände nach den **5 Indikationen der WHO**: vor dem Kontakt mit der Patientin, "
        "**vor aseptischen Tätigkeiten** (z. B. vor dem Lösen der Verbindung), nach Kontakt mit potenziell infektiösem Material (z. B. Wundsekret), "
        "nach dem Kontakt mit der Patientin und nach Kontakt mit ihrer direkten Umgebung. Öffnen Sie das System nur, wenn es nötig ist.", after=60)
    d.h3("Entfernen der Drainage")
    d.p("Die Redon wird je nach Fördermenge nach 48–72 Stunden **von der Ärztin** entfernt. Ihre Aufgaben: die Patientin informieren, nach Anordnung **rechtzeitig "
        "ein Schmerzmittel** geben, assistieren und danach beobachten und dokumentieren (Uhrzeit, Menge und Aussehen des Sekrets, ob die Drainage **vollständig** ist, "
        "Austrittsstelle und Verband). Ob mit oder ohne Sog gezogen wird, regelt der **Standard Ihres Hauses**.", after=60)
    recht = (d.p_xml("Recht: Delegation ärztlicher Maßnahmen", bold=True, after=40)
             + d.p_xml("In manchen Häusern werden Aufgaben wie das Ziehen einer Drainage an Pflegefachpersonen **delegiert**. Dann gilt:", size=10, after=20)
             + d.list_xml([
                 "**Ärztin – Anordnungsverantwortung:** entscheidet, ob und wann; ordnet klar und eindeutig an (am besten schriftlich: Name, was, wann); "
                 "wählt eine geeignete, befähigte Person aus und überwacht.",
                 "**Pflegefachperson – Durchführungsverantwortung:** führt die Maßnahme fachgerecht durch und dokumentiert sie.",
                 "**Remonstration:** Wer sich nicht befähigt fühlt oder die Anordnung für falsch hält, hat das Recht und die Pflicht, die Durchführung abzulehnen – "
                 "möglichst schriftlich.",
             ], "bullet"))
    d.add(d.table_xml([d.cell(recht, TABLE_W, "FFFFFF")], [TABLE_W], "000000", 12))
    d.space(6)
    qr_uebung(d, 4, "Umgang, Hygiene und Recht", ["7 Aufgaben – mit einem Gespräch mit Frau Kramer."])
    examens_training(d, 4, I.SCHREIBEN4, 7)

    # ================================================================ Abschnitt 5
    d.h2("Abschnitt 5: Examens-Training Pflegeprozess", before=280)
    d.p("Im Examen wird in **jeder** Prüfung der Pflegeprozess abgefragt: Pflegeprobleme im **PESR-Schema** (meist je 1 Punkt für P, E, S und R), "
        "**überprüfbare Pflegeziele** und **konkrete Pflegemaßnahmen** – immer mit Bezug zum Fall.", after=60)
    d.table(["", "Bedeutung", "Beispiel Frau Kramer"], [
        ["P", "Problem (Pflegediagnose)", "Gefahr einer Nachblutung"],
        ["E", "Einflussfaktoren / Ursachen", "Hüft-TEP rechts heute, Redon-Drainage im Wundgebiet, Enoxaparin hemmt die Gerinnung"],
        ["S", "Symptome / Kennzeichen (bei Risiken: Hinweise aus dem Fall)", "Verband leicht durchgeblutet, Redon fördert blutig-serös"],
        ["R", "Ressourcen", "wach und orientiert, meldet sich bei Veränderungen"],
    ], [700, 3300, 5060], size=10, first_col_bold=True)
    d.p("**Überprüfbare Ziele** beschreiben den gewünschten Zustand der Patientin mit einem **beobachtbaren Kriterium** und einem **Zeitpunkt** "
        "(z. B. nach SMART: spezifisch, messbar, akzeptiert, realistisch, terminiert). Beispiel: „Frau Kramer ist bis zur Entfernung der Redon kreislaufstabil "
        "(Puls unter 100/min, systolischer Blutdruck über 100 mmHg).“", after=60)
    d.p("**Konkrete Pflegemaßnahmen** beantworten: **Wer? Was? Wann bzw. wie oft? Womit?** Beispiel: „Die Pflegefachperson liest bis 20 Uhr stündlich die Fördermenge "
        "der Redon ab und dokumentiert Menge und Aussehen in der Kurve.“ – nicht nur: „Drainage beobachten“.", after=60)
    qr_uebung(d, 5, "Examens-Training Pflegeprozess", ["6 Aufgaben: PESR zuordnen, Ziele prüfen, Maßnahmen konkretisieren."])
    examens_training(d, 5, I.SCHREIBEN5, 7)

    # ================================================================ Abschluss
    d.h2("Abschluss", before=120)
    d.qr_task(qr("abschluss/"), "Abschlussquiz", ["Neuer Fall: Herr Yilmaz mit Robinson-Drainage. 10 Fragen, höchstens 2 Fehler.",
                                                 "Das Quiz wird erst freigeschaltet, wenn alle 5 Übungen erledigt sind.",
                                                 "Danach: 🏁 ILS-Challenge (freiwillig) – 20 Aufgaben, Highscore-Liste Ihrer Klasse."], f"{KURZ}abschluss/")
    d.p(f"**Ihre Verantwortung:** Die Examens-Trainings prüft niemand automatisch nach – Sie bereiten sich damit selbst auf das Examen vor. "
        f"Sie möchten eine Rückmeldung? Schicken Sie ein Foto Ihrer Antworten an **{MAIL}** mit dem Betreff **„ILS Drainage“**.", size=10)

    fuss = d.work / "word/footer1.xml"   # Fußzeile der Vorlage behalten, nur den Text tauschen
    fuss.write_text(fuss.read_text(encoding="utf-8").replace("KB I · Regelkreis &amp; sicheres Handeln · Seite ",
                                                             "ILS Wunddrainagen · Skills · Seite "), encoding="utf-8")
    out = d.save(AUS / "ILS_Wunddrainagen_AB.docx")
    print("geschrieben:", out)
    try:
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(AUS), str(out)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
        print("PDF:", out.with_suffix(".pdf"))
    except Exception as e:  # noqa: BLE001
        print("PDF nicht erzeugt:", e)


if __name__ == "__main__":
    build()
