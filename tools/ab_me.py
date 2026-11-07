"""Arbeitsblatt (Infotext + QR-Codes + Examens-Training) für den ILS-Auftrag „Materialentfernung und pflegerische Nachsorge“.

Aufruf: python3 tools/ab_me.py → arbeitsblatt/ILS_Materialentfernung_AB.docx (+ .pdf)
Fachliche Grundlage: Pflegias Band 2 (S. 325, 335, 349–359, 426–434, 474–475) und Band 1 (S. 643–646, 688–691).
"""
import subprocess
import sys
from pathlib import Path

import qrcode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc, TABLE_W  # noqa: E402
from ab_drainage import linien  # noqa: E402
import me_inhalt as I  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://klawittersven-arch.github.io/ils-pflege/me/"
KURZ = "klawittersven-arch.github.io/ils-pflege/me/"
MAIL = "Sven.Klawitter@Karoline-Breitinger-Schule.de"
BUILD = ROOT / "tools/build_me"
PNG = BUILD / "png"
VORLAGE = ROOT / "tools/vorlage"
AUS = ROOT / "arbeitsblatt"


def qr(teil):
    PNG.mkdir(parents=True, exist_ok=True)
    out = PNG / f"qr-{teil.strip('/').replace('/', '-') or 'start'}.png"
    qrcode.make(BASE + teil, box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M).save(out)
    return out


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
        "Themenblock I – Thema: Diabetes mellitus · Regelkreis &amp; sicheres Handeln": "Themenblock 2 – Notfall/Katastrophe · ILS Materialentfernung",
    }

    # ================================================================ Start
    d.h1("ILS-Auftrag: Materialentfernung und pflegerische Nachsorge")
    d.box(
        d.p_xml("So bearbeiten Sie diesen ILS-Auftrag (ca. 90 Minuten)", bold=True, after=60)
        + d.list_xml([
            "Scannen Sie den QR-Code **Start**. Wenn Sie sich schon beim ILS „Wunddrainagen“ angemeldet haben, sind Sie auf dem gleichen Handy noch angemeldet.",
            "Lesen Sie einen Abschnitt auf diesem Arbeitsblatt. Scannen Sie dann den QR-Code der **Übung** und lösen Sie die Aufgaben am Handy.",
            "Ihre Lehrkraft sieht automatisch, welche Übungen Sie erledigt haben.",
            "Am Ende jeder Übung schreiben Sie im Kasten **Examens-Training** eine Antwort selbst – so wie im Examen.",
            "Zum Schluss machen Sie das **Abschlussquiz**. Es wird erst freigeschaltet, wenn alle Übungen erledigt sind.",
        ], "decimal")
        + d.p_xml("**Tipp:** Bearbeiten Sie zuerst den ILS-Auftrag „Wunddrainagen“ – Herr Brandt hat auch eine Redon-Drainage. "
                  "**Erst lesen, dann tippen:** Bei mehr als 3 Fehlern oder zu schnellem Tippen gibt es eine Lesepause und neue Aufgaben.", size=10, before=60)
    )
    d.qr_task(qr(""), "Start: Anmelden und Übersicht", ["Hier sehen Sie auch jederzeit, welche Übungen Sie schon erledigt haben."], KURZ)
    d.table(
        ["Schritt", "Inhalt", "Zeit", "Erledigt"],
        [
            ["Start", "Fallsituation und ärztliche Anordnung lesen", "5 Min.", "☐"],
            ["Abschnitt 1", "Osteosynthese und Materialentfernung  →  Übung 1  →  Examens-Training 1", "15 Min.", "☐"],
            ["Abschnitt 2", "Nach der OP überwachen  →  Übung 2  →  Examens-Training 2", "20 Min.", "☐"],
            ["Abschnitt 3", "Komplikationen erkennen  →  Übung 3  →  Examens-Training 3", "15 Min.", "☐"],
            ["Abschnitt 4", "Schmerz und Mobilisation  →  Übung 4  →  Examens-Training 4", "15 Min.", "☐"],
            ["Abschnitt 5", "Information, Schulung und Entlassung  →  Übung 5  →  Examens-Training 5", "15 Min.", "☐"],
            ["Abschluss", "Abschlussquiz", "5 Min.", "☐"],
        ],
        [1500, 5560, 1000, 1000], size=10,
    )
    d.p("**Lernziele:** Nach diesem ILS-Auftrag können Sie …", after=40, keep=True)
    d.bullets([
        "Osteosyntheseverfahren unterscheiden und erklären, wann und warum Material entfernt wird,",
        "einen Menschen nach einer Operation am Bein überwachen – mit Vitalzeichen, Schmerzskala und DMS-Kontrolle,",
        "Komplikationen wie Thrombose, Wundinfektion, Hämatom oder Refraktur erkennen und die Thromboseentstehung erklären,",
        "Schmerzmanagement nach dem Expertenstandard ableiten und sicher mit Unterarmgehstützen mobilisieren,",
        "Information, Schulung und Beratung unterscheiden und ein Entlassungsgespräch fachgerecht gestalten.",
    ], after_last=80)

    fall = (d.p_xml("Fallsituation", bold=True, size=12, after=60, keep=True)
            + d.p_xml("Herr Jonas Brandt (24 Jahre) ist Kfz-Mechatroniker und spielt im Verein Fußball. Vor 18 Monaten hat er sich beim Fußball "
                      "das rechte Sprunggelenk gebrochen (Außenknöchel). Der Bruch wurde mit einer **Plattenosteosynthese** versorgt (Platte und Schrauben). "
                      "Der Knochen ist laut Röntgenbild verheilt. Seit Monaten **drückt und schmerzt die Platte**, vor allem in Fußballschuhen. "
                      "Deshalb wurde heute Morgen das Material entfernt – im Lehrbuch Pflegias heißt das **Materialentfernung** (in Kliniken oft „Metallentfernung“, kurz ME).", after=60)
            + d.p_xml("Um 10:30 Uhr übernehmen Sie Herrn Brandt aus dem Aufwachraum. Er hat einen Verband am rechten Sprunggelenk und eine **Redon-Drainage**. "
                      "Er ist wach und sagt: „Krücken brauche ich nicht, ich bin doch jung. Und wann kann ich wieder kicken?“", after=0))
    d.box(fall, fill="F2F2F2")
    anordnung = (d.p_xml("Ärztliche Anordnung (Dr. Sommer, Unfallchirurgie)", bold=True, after=40, keep=True)
                 + d.list_xml([
                     "Vitalzeichen, Schmerz (NRS) und **DMS rechts** in den ersten 6 Stunden **alle 2 Stunden**, danach 3-mal täglich.",
                     "Bein hochlagern, kühlen. Schmerzmittel nach Schmerzschema; **Bedarfsmedikation ab NRS 4**.",
                     "Mobilisation heute Nachmittag; Belastung **schmerzadaptiert** (so viel, wie die Schmerzen zulassen) mit **2 Unterarmgehstützen**.",
                     "**Enoxaparin** 1-mal täglich s.c. für 7 Tage – Herr Brandt spritzt sich zu Hause selbst (Schulung vor der Entlassung).",
                     "Redon-Entfernung morgen früh durch die Ärztin, danach Entlassung. **Fäden am 14. Tag** beim Hausarzt. **Kein Fußball für 6 Wochen.**",
                 ], "bullet"))
    d.add(d.table_xml([d.cell(anordnung, TABLE_W, "FFFFFF")], [TABLE_W], "000000", 12))
    d.space(6)

    # ================================================================ Abschnitt 1
    d.h2("Abschnitt 1: Osteosynthese und Materialentfernung", before=280)
    d.p("Ein Knochenbruch wird in drei Schritten behandelt: **Reposition** (Einrichten – unter Narkose, weil es sehr schmerzhaft ist), "
        "**Fixation** (in der richtigen Stellung halten) und **Ruhigstellung**. Konservativ geschieht das z. B. mit einem Gips- oder Kunststoffverband (Cast). "
        "Dabei heilt der Knochen **sekundär** über eine Knochenschwiele (Kallus).", after=60)
    d.p("Bei einer **Osteosynthese** werden die Bruchstücke operativ mit Material verbunden. Ziel ist eine möglichst schonende (biologische) "
        "Osteosynthese, die eine **primäre** Knochenheilung ermöglicht. Wichtige Verfahren:", after=40)
    d.image(PNG / "osteosynthese.png", 15, "Abb. 1: Osteosyntheseverfahren (schematisch)")
    d.p("Der **Fixateur externe** liegt außerhalb des Körpers: Metallpins werden im Knochen verankert und mit Stäben verbunden – z. B. bei offenen Brüchen "
        "2. und 3. Grades mit Weichteilverletzung. Er ist übungsstabil, aber nicht belastbar; die Eintrittsstellen werden täglich aseptisch versorgt.", after=60)
    d.table(["Die Knochenheilung hängt ab von …", ""], [[
        ["exakter Ruhigstellung", "Asepsis (keimfreiem Arbeiten)", "Blutversorgung"],
        ["Stabilität der Osteosynthese", "Umfang der Weichteilverletzung", "Medikamenten: Kortikoide und Chemotherapeutika wirken negativ"],
    ]], [4530, 4530], size=10)
    d.h3("Materialentfernung")
    d.p("Das Material wird **nach Abschluss der Knochenheilung** bei bestmöglicher Stabilität entfernt – **in der Regel nach 1,5 bis 2 Jahren**. "
        "Es muss aber nicht immer heraus:", after=40)
    d.table(["Spricht dafür", "Spricht dagegen"], [[
        ["Lockerung des Materials", "Entzündung am Material", "Beschwerden durch das Material, z. B. Druck, Schmerzen, eingeschränkte Beweglichkeit (wie bei Herrn Brandt)"],
        ["Eine zweite OP wäre ein sehr großes Risiko (z. B. hohes Alter, schwere Vorerkrankungen) – und …", "… das Material stört die Beweglichkeit nicht und schmerzt nicht."],
    ]], [4530, 4530], size=10)
    qr_uebung(d, 1, "Osteosynthese und Materialentfernung", ["7 Aufgaben – mit einem Bild, in dem Sie das Material erkennen."])
    examens_training(d, 1, I.SCHREIBEN1, 6)

    # ================================================================ Abschnitt 2
    d.h2("Abschnitt 2: Nach der OP überwachen", before=280)
    d.p("**Übernahme aus dem Aufwachraum:** Nur Pflegefachpersonen übernehmen. Sie erfahren: OP, Verlauf und Komplikationen, Anästhesieverfahren, "
        "Infusionen, Ableitungen und Fördermengen (hier: Redon), Bewusstseinszustand sowie Anweisungen aus dem Aufwachraum. Danach wird engmaschig "
        "kontrolliert – wie oft, steht in der Anordnung (hier: in den ersten 6 Stunden alle 2 Stunden).", after=60)
    d.table(["Sie beobachten …", "Worauf achten Sie?"], [
        ["Kreislauf und Bewusstsein", "Puls, Blutdruck, Atmung, Bewusstsein, Übelkeit (PONV)"],
        ["Schmerz", "Schmerzskala NRS (0–10) in Ruhe und bei Bewegung; Bedarfsmedikation laut Anordnung"],
        ["Wunde, Verband, Redon", "durchgeblutet? Fördermenge und Aussehen der Redon (siehe ILS Wunddrainagen)"],
        ["DMS – Durchblutung, Motorik, Sensibilität", "immer körperfern (unterhalb) der OP-Stelle, im Vergleich mit dem gesunden Bein (siehe unten)"],
        ["Ausscheidung", "erste Urinausscheidung **spätestens 8 Stunden** nach der OP (sonst an Harnverhalt denken)"],
    ], [3200, 5860], size=10, first_col_bold=True)
    d.image(PNG / "fuss-dms.png", 7.5, "Abb. 2: DMS-Kontrolle am rechten Fuß")
    d.table(["", "So prüfen Sie", "Auffällig – Ärztin sofort informieren"], [
        ["D – Durchblutung", "Hautfarbe und Temperatur der Zehen; Fußpuls am Fußrücken; Nagelbettprobe: Farbe kehrt in unter 2 Sekunden zurück", "blass, kalt, kein Puls, Nagelbettprobe verzögert"],
        ["M – Motorik", "Zehen bewegen, Fuß heben und senken lassen", "kann Zehen oder Fuß nicht bewegen"],
        ["S – Sensibilität", "nach Kribbeln oder Taubheit fragen; spürt er eine Berührung?", "Kribbeln, Taubheit (neu oder zunehmend)"],
    ], [1900, 4080, 3080], size=10, first_col_bold=True)
    d.p("**Hochlagern und Kühlen** fördern den Abfluss von Blut und Lymphe (Ödemabfluss) und lindern Schwellung und Schmerz. Beim Kühlen auf Dauer und "
        "Temperatur achten, nie direkt auf die Haut – sonst drohen Kälteschäden.", after=40)
    d.p("**Erste Mobilisation** am OP-Tag oder am Folgetag – nach Röntgenkontrolle und Absprache mit der Ärztin: Kreislauf kontrollieren, "
        "**über die operierte Seite** aufstehen lassen, Unterarmgehstützen nutzen, am OP-Tag begleiten (Sturzgefahr nach der Narkose). "
        "Wird ihm beim Aufsetzen schwindelig: hinlegen, Beine hoch, Vitalzeichen messen, bei ihm bleiben.", after=60)
    qr_uebung(d, 2, "Nach der OP überwachen", ["7 Aufgaben – mit DMS-Bild und einer Fallentscheidung zur ersten Mobilisation."])
    examens_training(d, 2, I.SCHREIBEN2, 7)

    # ================================================================ Abschnitt 3
    d.h2("Abschnitt 3: Komplikationen erkennen", before=280)
    d.table(["Komplikation", "Hinweise", "Was tun?"], [
        ["Nachblutung / Hämatom", "Verband durchgeblutet, Redon fördert viel hellrotes Blut; Schwellung, Schmerz, Haut rötlich bis blau-violett "
                                  "(nach 4–5 Tagen dunkelgrün, nach ca. 8 Tagen gelblich)", "Ärztin informieren, Vitalzeichen (Schockzeichen!), kühlen und hochlagern nach Anordnung"],
        ["Wundinfektion", "Rötung, Schwellung, Überwärmung, Schmerz, Funktionseinschränkung, Eiter, Fieber", "Ärztin informieren, Befund dokumentieren"],
        ["Wunddehiszenz", "Wundränder klaffen auseinander, Schwellung, Rötung, Wundexsudat", "Ärztin informieren"],
        ["Nervenreizung", "Taubheit oder Kribbeln, z. B. an einer Stelle am Fußrücken", "der Äußerung nachgehen, Ärztin informieren, dokumentieren"],
        ["Refraktur (erneuter Bruch)", "Die leeren Schraubenlöcher sind anfangs Schwachstellen im Knochen.", "Belastung und Sportpause nach Anordnung (bei Herrn Brandt: 6 Wochen kein Fußball)"],
        ["Kompartment­syndrom", "Schmerzen nehmen trotz Schmerzmittel und Hochlagern stark zu, Muskulatur prall gespannt, Kribbeln, Bewegungsstörung",
         "sofort Ärztin informieren – Druck im Gewebe gefährdet Nerven und Muskeln"],
    ], [2100, 4060, 2900], size=10, first_col_bold=True)
    d.h3("Thrombose")
    d.p("Nach Operationen und Verletzungen am Bein ist das Thromboserisiko erhöht. Ein Blutgerinnsel entsteht nach der **Virchow-Trias** durch:", after=20)
    d.table(["Faktor", "Bedeutung", "Bei Herrn Brandt"], [
        ["Endothelläsion", "Schaden der Gefäßwand", "Operation am Bein"],
        ["Hypozirkulation", "verlangsamter Blutfluss", "schont das Bein, bewegt sich weniger, liegt viel – die Muskelpumpe fehlt"],
        ["Hyperkoagulabilität", "erhöhte Gerinnbarkeit des Blutes", "während und nach Operationen erhöht; zu wenig Trinken verstärkt das"],
    ], [2400, 2900, 3760], size=10, first_col_bold=True)
    d.p("**Leitsymptome:** Schwellung mit ziehenden Schmerzen, Überwärmung, Spannungs- oder Schweregefühl. Die gefährlichste Komplikation ist die "
        "**Lungenembolie** (Atemnot, Brustschmerz) → **sofort 112**. Bei Verdacht auf Thrombose die Wade nicht massieren.", after=60)
    qr_uebung(d, 3, "Komplikationen erkennen", ["6 Aufgaben – mit Symptom-Detektiv und einem Telefonat mit Herrn Brandt."])
    examens_training(d, 3, I.SCHREIBEN3, 7)

    # ================================================================ Abschnitt 4
    d.h2("Abschnitt 4: Schmerz und Mobilisation", before=280)
    d.p("Der **Expertenstandard „Schmerzmanagement in der Pflege“** verlangt: Schmerzen **regelmäßig einschätzen** (z. B. NRS, in Ruhe und bei Bewegung), "
        "Schmerzmittel **nach Anordnung** geben und **Wirkung und Nebenwirkungen überprüfen**, **nicht-medikamentöse Maßnahmen** nutzen (Hochlagern, "
        "Kühlen, Ablenkung, Entspannung), den Patienten **informieren, schulen und beraten** – und alles dokumentieren. Vor einer Mobilisation geben Sie das "
        "Schmerzmittel nach Anordnung **rechtzeitig vorher** (z. B. 30–45 Minuten), damit es wirkt, wenn die Bewegung schmerzt.", after=60)
    d.h3("Gehen mit Unterarmgehstützen")
    d.bullets([
        "Unterarmgehstützen werden nach Operationen an Hüfte oder Beinen meist gebraucht. Voraussetzungen: genug Kraft in den Armen, Koordination, Gleichgewicht.",
        "**Einstellung:** Handgriff etwa auf Höhe des Oberschenkelknochens (Hüfte), Ellenbogen leicht gebeugt, Schultern nicht hochgezogen. "
        "Die Stützen möglichst **vor der OP** bereitstellen und mit dem physiotherapeutischen Team anpassen und üben.",
        "**Belastung** nur nach ärztlicher Anordnung – bei Herrn Brandt schmerzadaptiert.",
        "**Treppe:** Hinauf geht das **gesunde Bein** zuerst, dann folgen operiertes Bein und Stützen. Hinunter gehen die **Stützen und das operierte Bein** "
        "zuerst, dann folgt das gesunde Bein. So trägt immer das gesunde Bein die Last.",
    ], after_last=60)
    d.h3("Sturz- und Thromboseprophylaxe")
    d.p("**Sturz:** Nach der Narkose ist das Sturzrisiko oft nur kurz erhöht – am OP-Tag reicht meist die Begleitung zur Toilette. Weitere Maßnahmen aus dem "
        "Expertenstandard Sturzprophylaxe: festes Schuhwerk, Klingel in Reichweite, Bremsen feststellen, Betthöhe anpassen, Nachtlicht, Stolperfallen beseitigen.", after=40)
    d.p("**Thrombose:** Die beste Prophylaxe ist **Bewegung** – mehrmals täglich kurze Strecken gehen (nur Stehen oder langes Sitzen aktiviert die Muskelpumpe nicht). "
        "Dazu Bewegungsübungen (Füße kreisen, Zehen anziehen und spreizen, Füße kopfwärts ziehen, Waden anspannen), mindestens **1,5 Liter** trinken "
        "(falls erlaubt) und **Heparin** nach Anordnung (hier Enoxaparin s.c.). Thromboseprophylaxestrümpfe werden nicht routinemäßig, sondern nach Abwägung eingesetzt.", after=60)
    qr_uebung(d, 4, "Schmerz und Mobilisation", ["7 Aufgaben – mit einem Gespräch über die Unterarmgehstützen."])
    examens_training(d, 4, I.SCHREIBEN4, 7)

    # ================================================================ Abschnitt 5
    d.h2("Abschnitt 5: Information, Schulung und Entlassung", before=280)
    d.table(["", "Was passiert?", "Beispiel Herr Brandt"], [
        ["Information", "Wissen wird verständlich weitergegeben.", "wann die Fäden gezogen werden; Merkblatt mit Warnzeichen"],
        ["Schulung", "Fertigkeiten werden gezielt vermittelt, geübt und überprüft.", "Selbstinjektion des Enoxaparins; Treppensteigen mit Stützen"],
        ["Beratung", "Gemeinsam und ergebnisoffen wird eine Lösung für ein Problem gesucht.", "Wie organisiert er Arbeit und Sport in den nächsten Wochen?"],
    ], [1700, 3600, 3760], size=10, first_col_bold=True)
    d.p("**Verhaltensweisen nach dem Eingriff**, über die Herr Brandt vor der Entlassung Bescheid wissen muss:", after=20, keep=True)
    d.bullets([
        "**Wunde** sauber und trocken halten, nur mit wasserdichtem Schutz (z. B. Duschpflaster) duschen – sonst Infektionsgefahr.",
        "**Fäden** laut Arztbrief am 14. Tag beim Hausarzt ziehen lassen. Den Zeitpunkt legt die Ärztin fest; nach Pflegias an der unteren Extremität meist nach "
        "12–14 Tagen, in Gelenknähe nach 21 Tagen oder später. Oft wird zuerst jeder zweite Faden entfernt.",
        "**Warnzeichen:** Wunde rot, warm, dick oder nässend, Fieber → zum Arzt. Wade dick, warm, schmerzhaft → Thromboseverdacht, sofort abklären. "
        "Atemnot oder Brustschmerz → **112**.",
        "**Enoxaparin** täglich selbst spritzen (7 Tage), viel bewegen und trinken – Thromboseprophylaxe.",
        "**Belastung** mit Stützen nach Anordnung, **6 Wochen kein Fußball** – Refrakturgefahr. Bei Schwellung hochlagern und kühlen, Schmerzmittel nach Plan.",
    ], after_last=60)
    d.p("**Das Informationsgespräch gestalten:** vorbereiten (Inhalte, Merkblatt, ruhiger Raum, genug Zeit) → begrüßen, Ziel nennen, Vorwissen und Sorgen erfragen "
        "→ verständlich und in kleinen Schritten informieren, Fachwörter erklären → Fragen zulassen, wiederholen lassen → zusammenfassen, Merkblatt mitgeben, dokumentieren.", after=40)
    d.p("**Entlassungsmanagement** beginnt schon bei der Aufnahme: Die Pflegefachperson schätzt ein, welche Unterstützung nach der Entlassung nötig ist, plant die "
        "Entlassung, informiert, schult und berät, stimmt sich mit Hausarzt und anderen Diensten ab und überprüft, ob alles geklappt hat "
        "(Expertenstandard „Entlassungsmanagement in der Pflege“).", after=60)
    qr_uebung(d, 5, "Information, Schulung und Entlassung", ["6 Aufgaben – mit einem Entlassungsgespräch."])
    examens_training(d, 5, I.SCHREIBEN5, 8)

    # ================================================================ Abschluss
    d.h2("Abschluss", before=120)
    d.qr_task(qr("abschluss/"), "Abschlussquiz", ["Neuer Fall: Frau Schäfer, Materialentfernung am Unterarm. 10 Fragen, höchstens 2 Fehler.",
                                                 "Das Quiz wird erst freigeschaltet, wenn alle 5 Übungen erledigt sind."], f"{KURZ}abschluss/")
    d.p(f"**Ihre Verantwortung:** Die Examens-Trainings prüft niemand automatisch nach – Sie bereiten sich damit selbst auf das Examen vor. "
        f"Sie möchten eine Rückmeldung? Schicken Sie ein Foto Ihrer Antworten an **{MAIL}** mit dem Betreff **„ILS Metallentfernung“**.", size=10)

    fuss = d.work / "word/footer1.xml"
    fuss.write_text(fuss.read_text(encoding="utf-8").replace("KB I · Regelkreis &amp; sicheres Handeln · Seite ",
                                                             "ILS Materialentfernung · Skills · Seite "), encoding="utf-8")
    out = d.save(AUS / "ILS_Materialentfernung_AB.docx")
    print("geschrieben:", out)
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(AUS), str(out)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    print("PDF:", out.with_suffix(".pdf"))


if __name__ == "__main__":
    build()
