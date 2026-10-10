"""Erzeugt die Übungsseiten für den ILS-Auftrag DK (Dauerkatheter).

Aufruf: python3 tools/seiten.py
Die Bausteine (Lösungswörter) stehen in tools/bausteine.json (nicht veröffentlicht). Auf den Seiten sind sie
verschlüsselt bzw. nur als Hash enthalten.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web_bau import Thema, startseite  # noqa: E402

VIDEO_URL = "https://www.youtube.com/watch?v=M5XTpbSTi1w"
T = Thema("dk", "DK", "Transurethraler Dauerkatheter", "Dauerkatheter")
uebung = T.uebung
page = T.page


# ---------------------------------------------------------------- Übung 1
# Auswahlliste für die Beschriftung: alphabetisch (keine Reihenfolge wie im Bild) und mit falschen Optionen,
# die nicht im Bild vorkommen.
TEILE = sorted([
    "Katheterspitze mit Auge", "Ballon", "Schaft mit 2 Kanälen", "Anschluss für den Urinbeutel", "Blockventil",
    "Urinbeutel", "Kanüle", "Rückflussventil", "Ablassventil", "Tropfkammer", "Probeentnahmestelle", "Urinflasche",
], key=str.casefold)
U1 = [
    {"type": "select", "section": "Teil A: Aufbau eines Ballonkatheters",
     "q": "Schauen Sie auf das Bild. Was ist <b>Nummer 1</b>?", "img": "../img/katheter-nummern.svg",
     "imgAlt": "Schema eines Ballonkatheters mit den Nummern 1 bis 5",
     "options": TEILE,
     "correct": TEILE.index("Katheterspitze mit Auge"), "explain": "An der Spitze sind seitliche Öffnungen (Augen). Dort fließt der Urin in den Katheter.",
     "hint": "Abschnitt 1, Bild „Aufbau eines Ballonkatheters“."},
    {"type": "select", "section": "Teil A: Aufbau eines Ballonkatheters", "q": "Was ist <b>Nummer 2</b>?",
     "options": TEILE,
     "correct": TEILE.index("Ballon"), "explain": "Der Ballon wird in der Blase mit Flüssigkeit gefüllt (geblockt). So rutscht der Katheter nicht heraus.",
     "hint": "Abschnitt 1, Bild „Aufbau eines Ballonkatheters“."},
    {"type": "select", "section": "Teil A: Aufbau eines Ballonkatheters", "q": "Was ist <b>Nummer 3</b>?",
     "options": TEILE,
     "correct": TEILE.index("Schaft mit 2 Kanälen"), "explain": "Im Schaft gibt es einen großen Kanal für den Urin und einen kleinen Kanal zum Ballon.",
     "hint": "Abschnitt 1, Bild „Aufbau eines Ballonkatheters“."},
    {"type": "select", "section": "Teil A: Aufbau eines Ballonkatheters", "q": "Was ist <b>Nummer 4</b>?",
     "options": TEILE,
     "correct": TEILE.index("Anschluss für den Urinbeutel"), "explain": "Am Trichter wird das Urinableitungssystem angeschlossen.",
     "hint": "Abschnitt 1, Bild „Aufbau eines Ballonkatheters“."},
    {"type": "select", "section": "Teil A: Aufbau eines Ballonkatheters", "q": "Was ist <b>Nummer 5</b>?",
     "options": TEILE,
     "correct": TEILE.index("Blockventil"), "explain": "Am Blockventil setzen Sie die Spritze zum Blocken und Entblocken an. Hier stehen auch Größe (Ch) und Ballonvolumen (ml).",
     "hint": "Abschnitt 1, Bild „Aufbau eines Ballonkatheters“."},
    {"type": "mc", "section": "Teil B: Größe, Länge, Material, Ableitungssystem",
     "q": "Auf einem Katheter steht <b>15 Ch</b>. Wie groß ist der Außendurchmesser?",
     "options": ["5 mm", "15 mm", "1,5 mm", "45 mm"], "correct": 0,
     "explain": "1 Charrière = 1/3 mm. 15 Ch : 3 = 5 mm.", "hint": "Abschnitt 1, „Größe: Charrière (Ch)“."},
    {"type": "mc", "section": "Teil B: Größe, Länge, Material, Ableitungssystem",
     "q": "Warum dürfen Sie bei einem <b>Mann</b> keinen kurzen Frauenkatheter (ca. 20 cm) verwenden?",
     "options": ["Der Ballon würde in der Harnröhre geblockt werden. Das verletzt die Harnröhre schwer.",
                 "Der Frauenkatheter ist immer zu dick.",
                 "Frauenkatheter haben keinen Ballon.",
                 "Das ist erlaubt, wenn der Mann jung ist."],
     "correct": 0, "explain": "Die Harnröhre des Mannes ist 20–25 cm lang. Ein kurzer Katheter erreicht die Blase nicht. Der Ballon liegt dann in der Harnröhre.",
     "hint": "Abschnitt 1, „Länge“."},
    {"type": "mc", "section": "Teil B: Größe, Länge, Material, Ableitungssystem",
     "q": "Herr A. (68 Jahre) braucht einen DK für <b>etwa 3 Wochen</b>. Welcher Katheter passt am besten?",
     "options": ["Silikon, 40–45 cm lang, 14 Ch",
                 "Latex (beschichtet), 40–45 cm lang, 14 Ch",
                 "Silikon, 20 cm lang (Frauenkatheter), 14 Ch",
                 "Silikon, 40–45 cm lang, 24 Ch",
                 "Einmalkatheter, 40 cm lang, 14 Ch"],
     "correct": 0, "explain": "Für 3 Wochen: Silikon (Latex nur für wenige Tage). Beim Mann: langer Katheter (40–45 cm). "
                              "Größe: so dünn wie möglich, beim Mann meist 14–16 Ch. Ein Einmalkatheter hat keinen Ballon und bleibt nicht liegen.",
     "hint": "Abschnitt 1: „Größe“, „Länge“ und „Spitze und Material“ – prüfen Sie jede Angabe."},
    {"type": "mc", "section": "Teil B: Größe, Länge, Material, Ableitungssystem",
     "q": "Welche Aufgabe hat das <b>Rückflussventil</b> am Urinbeutel?",
     "options": ["Es verhindert, dass Urin aus dem Beutel zurück in die Blase fließt.",
                 "Man lässt damit den Urin aus dem Beutel ab.",
                 "Man nimmt dort Urinproben.",
                 "Es misst die Urinmenge."],
     "correct": 0, "explain": "Zurückfließender Urin kann Bakterien in die Blase bringen. Das Rückflussventil verhindert das.",
     "hint": "Abschnitt 1, „Geschlossenes Ableitungssystem“."},
    {"type": "mc", "section": "Teil B: Größe, Länge, Material, Ableitungssystem",
     "q": "Was bedeutet <b>„geschlossenes Ableitungssystem“</b>?",
     "options": ["Katheter und Urinbeutel bleiben fest verbunden. Der Urin wird nur über das Ablassventil entleert.",
                 "Der Beutel wird jeden Tag gewechselt.",
                 "Der Katheter wird zum Leeren kurz vom Beutel getrennt.",
                 "Der Beutel hat einen Deckel."],
     "correct": 0, "explain": "Jedes Öffnen des Systems ist ein Weg für Bakterien. Deshalb bleibt die Verbindung zwischen Katheter und Beutel geschlossen.",
     "hint": "Abschnitt 1, „Geschlossenes Ableitungssystem“."},
]

# ---------------------------------------------------------------- Übung 2
CATS = ["DK ist sinnvoll (indiziert)", "Kein DK – es gibt eine bessere Alternative", "Kein DK – Kontraindikation: Ärztin/Arzt informieren"]
U2_FAELLE = [
    ("Herr Novak (72) kann seit 10 Stunden kein Wasser lassen. Der Blasenscanner zeigt 900 ml. Die Ärztin vermutet eine vergrößerte Prostata.", 0,
     "Akuter Harnverhalt ist eine klassische Indikation. Der DK leitet den Urin sicher ab."),
    ("Frau Krüger (85) ist harninkontinent. Im Nachtdienst ist wenig Personal da. Eine Kollegin sagt: „Ein DK wäre einfacher.“", 1,
     "Inkontinenz allein oder Personalmangel sind keine Indikation. Alternativen: Inkontinenzmaterial, Toilettengänge, Toilettentraining."),
    ("Herr Meier (34) hatte einen Motorradunfall mit Beckenbruch. An der Harnröhrenöffnung ist Blut.", 2,
     "Blut an der Harnröhrenöffnung nach einem Beckentrauma kann eine Harnröhrenverletzung bedeuten. Kein transurethraler DK! Die Ärztin oder der Arzt entscheidet über das weitere Vorgehen."),
    ("Frau Sommer (58) liegt im Schock auf der Intensivstation. Die Urinmenge soll jede Stunde gemessen werden.", 0,
     "Eine genaue, stündliche Bilanz bei schwer kranken Menschen ist eine Indikation (mit Urimeter)."),
    ("Von Frau Lang (79) braucht man eine sterile Urinprobe. Sie kann keinen Mittelstrahlurin abgeben.", 1,
     "Für eine einzelne Urinprobe reicht ein Einmalkatheter. Ein DK wäre ein unnötiges Infektionsrisiko."),
    ("Herr Peters (81) ist in der letzten Lebensphase. Jede Bewegung tut ihm sehr weh. Er wünscht sich einen Katheter.", 0,
     "In der Palliativpflege kann ein DK auf Wunsch der Person den Komfort verbessern."),
    ("Bei Frau Tran (66) soll geprüft werden, ob nach dem Wasserlassen noch Urin in der Blase ist (Restharn).", 1,
     "Restharn misst man mit dem Blasenscanner oder mit einem Einmalkatheter – nicht mit einem DK."),
    ("Frau Brandt (81) hat einen Dekubitus Kategorie 4 am Kreuzbein. Sie ist inkontinent. Die Wunde wird immer wieder mit Urin verschmutzt.", 0,
     "Bei Inkontinenz und einer offenen Wunde im Gesäß- oder Intimbereich kann ein DK die Wundheilung unterstützen."),
    ("Herr Roth (55) hat eine akute Prostataentzündung mit Fieber.", 2,
     "Bei einer akuten Entzündung von Prostata oder Harnröhre ist ein transurethraler DK kontraindiziert. Ärztin oder Arzt informieren."),
    ("Herr Jung (30) hatte vor 3 Tagen eine Knie-OP. Er läuft auf dem Flur. Der DK aus dem OP liegt noch.", 1,
     "Der DK ist nicht mehr nötig. Jeder Tag mit DK erhöht das Infektionsrisiko. Die Entfernung bei der Ärztin oder beim Arzt ansprechen."),
]
U2 = [{"type": "mc", "keep": True, "q": f, "options": CATS, "correct": c, "explain": e,
       "hint": "Abschnitt 2, Tabelle „Indikationen – keine Indikation – Kontraindikationen“."} for f, c, e in U2_FAELLE]

# ---------------------------------------------------------------- Übung 3
U3 = [
    {"type": "order", "section": "Teil A: DK bei einer Frau legen – die richtige Reihenfolge",
     "q": "Bringen Sie die Schritte in die richtige Reihenfolge. Tippen Sie zuerst auf den ersten Schritt, dann auf den zweiten usw.",
     "items": [
         "Anordnung prüfen, Patientin informieren und Einwilligung einholen",
         "Intimsphäre schützen, Patientin lagern, Intimpflege durchführen",
         "Hände desinfizieren, Katheterset steril öffnen",
         "Sterile Handschuhe anziehen, Lochtuch auflegen, Material vorbereiten",
         "Mit der nicht-dominanten Hand die Schamlippen spreizen",
         "Desinfizieren: von oben nach unten, für jeden Wisch ein neuer Tupfer",
         "Katheter mit Gleitmittel langsam einführen, bis Urin fließt – dann 2–3 cm weiter",
         "Ballon mit der angegebenen Menge Aqua dest. (oder Glycerinlösung) blocken",
         "Katheter vorsichtig zurückziehen, bis ein leichter Widerstand spürbar ist",
         "Katheter ohne Zug fixieren, Beutel unter Blasenniveau, dokumentieren",
     ],
     "explain": "So ist die richtige Reihenfolge. Wichtig: Erst blocken, wenn Urin fließt und der Katheter noch 2–3 cm weiter in der Blase ist.",
     "hint": "Abschnitt 3, „Durchführung bei der Frau“."},
    {"type": "mc", "section": "Teil B: Vorbereitung und Sicherheit",
     "q": "Womit blocken Sie den Ballon?",
     "options": ["Mit sterilem Aqua dest. oder 8–10 % Glycerinlösung (nach Herstellerangabe)", "Mit NaCl 0,9 %", "Mit Luft", "Mit Leitungswasser"],
     "correct": 0, "explain": "NaCl kann Kristalle bilden und den Blockkanal verstopfen. Luft lässt den Ballon aufschwimmen. Deshalb Aqua dest. oder Glycerinlösung – nach Herstellerangabe.",
     "hint": "Abschnitt 3, Materialliste."},
    {"type": "mc", "section": "Teil B: Vorbereitung und Sicherheit",
     "q": "Sie spreizen mit der nicht-dominanten Hand die Schamlippen. Was gilt für diese Hand?",
     "options": ["Sie ist jetzt unsteril und bleibt bis zum Blocken an derselben Stelle.",
                 "Sie bleibt steril und darf den Katheter anfassen.",
                 "Sie wird nach der Desinfektion wieder steril.",
                 "Sie hält die Pinzette mit den Tupfern."],
     "correct": 0, "explain": "Die Hand hat die Haut berührt und ist unsteril. Würde sie loslassen, schließen sich die Schamlippen und die desinfizierte Fläche wird wieder verschmutzt.",
     "hint": "Abschnitt 3, Schritt 4."},
    {"type": "mc", "section": "Teil B: Vorbereitung und Sicherheit",
     "q": "Der Katheter ist aus Versehen in die <b>Scheide</b> gerutscht. Was tun Sie?",
     "options": ["Katheter liegen lassen (Orientierung) und mit einem neuen sterilen Katheter neu beginnen",
                 "Katheter herausziehen und gleich noch einmal in die Harnröhre einführen",
                 "Katheter abwischen und erneut benutzen",
                 "Den Ballon trotzdem blocken"],
     "correct": 0, "explain": "Der Katheter ist jetzt unsteril. Er bleibt kurz liegen und zeigt, wo die Scheide ist. Für die Harnröhre nehmen Sie einen neuen, sterilen Katheter.",
     "hint": "Abschnitt 3, Hinweis „Katheter in der Scheide?“."},
    {"type": "mc", "section": "Teil B: Vorbereitung und Sicherheit",
     "q": "Wann blocken Sie den Ballon?",
     "options": ["Wenn Urin fließt und der Katheter danach noch ein Stück weiter vorgeschoben wurde",
                 "Sobald die Katheterspitze in der Harnröhre ist",
                 "Bevor der Katheter eingeführt wird",
                 "Wenn die Patientin Schmerzen hat"],
     "correct": 0, "explain": "Urin zeigt: Die Spitze ist in der Blase. Durch das Weiterschieben liegt auch der Ballon sicher in der Blase und nicht in der Harnröhre.",
     "hint": "Abschnitt 3, Schritte 6 und 7."},
]

# ---------------------------------------------------------------- Übung 4
U4 = [
    {"type": "errors", "section": "Teil A: Fehlersuche – Pfleger Tim legt Herrn Novak einen DK",
     "q": "Lesen Sie alle Sätze. <b>Tippen Sie auf jeden Satz, in dem Tim einen Fehler macht.</b> Es gibt mehrere Fehler.",
     "sentences": [
         {"t": "Tim informiert Herrn Novak über die Maßnahme und fragt, ob er einverstanden ist.", "wrong": False},
         {"t": "Er schließt die Tür, stellt einen Sichtschutz auf und deckt nur den Intimbereich auf.", "wrong": False},
         {"t": "Tim nimmt einen kurzen Frauenkatheter (20 cm), weil er gerade griffbereit liegt.", "wrong": True,
          "explain": "Beim Mann immer einen langen Katheter (ca. 40–45 cm) nehmen. Sonst wird der Ballon in der Harnröhre geblockt."},
         {"t": "Er desinfiziert die Hände und zieht sterile Handschuhe an.", "wrong": False},
         {"t": "Er schiebt die Vorhaut zurück und desinfiziert die Eichel kreisförmig von außen nach innen zur Harnröhrenöffnung hin.", "wrong": True,
          "explain": "Richtig ist: von innen nach außen – von der Harnröhrenöffnung weg. Sonst wischt man Keime zur Öffnung hin."},
         {"t": "Er spritzt das Gleitmittel mit Lokalanästhetikum langsam in die Harnröhre und wartet die Einwirkzeit ab.", "wrong": False},
         {"t": "Er hält den Penis gestreckt, etwa 90° zum Körper, und führt den Katheter langsam ein.", "wrong": False},
         {"t": "Bei einem starken Widerstand drückt Tim fest, damit der Katheter weitergeht.", "wrong": True,
          "explain": "Nie mit Gewalt! Penis langsam Richtung Beine senken, Patienten tief atmen lassen. Bei starkem Widerstand abbrechen und die Ärztin oder den Arzt informieren."},
         {"t": "Als Urin kommt, schiebt Tim den Katheter noch fast bis zur Gabelung vor.", "wrong": False},
         {"t": "Er blockt den Ballon mit 10 ml NaCl 0,9 %.", "wrong": True,
          "explain": "Nicht mit NaCl blocken (Kristalle können den Kanal verstopfen). Richtig: steriles Aqua dest. oder Glycerinlösung nach Herstellerangabe."},
         {"t": "Er zieht den Katheter vorsichtig zurück, bis er einen leichten Widerstand spürt.", "wrong": False},
         {"t": "Zum Schluss lässt Tim die Vorhaut hinter der Eichel, damit sie beim Fixieren nicht stört.", "wrong": True,
          "explain": "Die Vorhaut muss wieder nach vorne! Sonst droht eine Paraphimose (Schwellung und Durchblutungsstörung der Eichel)."},
         {"t": "Er hängt den Beutel unter Blasenniveau an das Bett und dokumentiert die Maßnahme.", "wrong": False},
     ],
     "explain": "Die Erklärungen zu jedem Fehler stehen direkt unter den Sätzen.",
     "hint": "Abschnitt 3, „Beim Mann ist anders“."},
    {"type": "mc", "section": "Teil B: Fragen zum Video (und zum Infotext)",
     "q": "Im Video wird die Harnröhrenöffnung mit <b>Kochsalzlösung (NaCl)</b> gereinigt. Was verwenden Sie in Deutschland nach den Hygiene-Empfehlungen (KRINKO)?",
     "options": ["Ein Schleimhaut-Antiseptikum (z. B. auf Octenidin-Basis) mit Einwirkzeit", "Leitungswasser", "Alkoholisches Hautdesinfektionsmittel", "Nur trockene Tupfer"],
     "correct": 0, "explain": "In Deutschland wird die Schleimhaut vor dem Legen eines DK mit einem Schleimhaut-Antiseptikum desinfiziert. Alkoholische Mittel sind für Schleimhaut nicht geeignet.",
     "hint": "Abschnitt 3, Materialliste und Kasten zum Video."},
    {"type": "mc", "section": "Teil B: Fragen zum Video (und zum Infotext)",
     "q": "Im Video spüren die Pflegenden einen Widerstand. Wo ist das typisch?",
     "options": ["Am äußeren Blasenschließmuskel bzw. an der Prostata", "Direkt an der Harnröhrenöffnung", "Im Ballon", "In der Niere"],
     "correct": 0, "explain": "Engstellen der männlichen Harnröhre: Schließmuskel und Prostata. Hier langsam und vorsichtig arbeiten, Patienten entspannen lassen.",
     "hint": "Abschnitt 3, Grafik „Harnröhre Frau und Mann“."},
    {"type": "mc", "section": "Teil B: Fragen zum Video (und zum Infotext)",
     "q": "Wie helfen die Pflegenden im Video dem Patienten, den Beckenboden zu entspannen?",
     "options": ["Er legt die Hände auf den Bauch und atmet tief ein.", "Er soll pressen.", "Er hält die Luft an.", "Er bekommt ein Schlafmittel."],
     "correct": 0, "explain": "Tiefes, ruhiges Atmen entspannt den Beckenboden. Das erleichtert das Einführen.",
     "hint": "Video, ca. 0:34–0:45, oder Abschnitt 3."},
]

# ---------------------------------------------------------------- Übung 5
TF = [
    ("Der Urinbeutel darf auf dem Boden stehen, wenn er unter Blasenniveau ist.", False,
     "Der Beutel hängt unter Blasenniveau, aber nie auf dem Boden (Keime vom Boden)."),
    ("Für eine Urinprobe trennen Sie kurz den Katheter vom Beutel.", False,
     "Urinproben nur über die Probeentnahmestelle (vorher desinfizieren). Das System bleibt geschlossen."),
    ("Die Indikation für den DK wird jeden Tag überprüft.", True,
     "Jeder Tag weniger mit DK senkt das Infektionsrisiko."),
    ("Für die Intimpflege bei liegendem DK reichen Wasser und eine pH-neutrale Waschlotion.", True,
     "Desinfektionsmittel werden bei der täglichen Pflege nicht routinemäßig verwendet."),
    ("Ein DK muss routinemäßig alle 7 Tage gewechselt werden.", False,
     "Es gibt keinen festen Wechsel-Rhythmus. Gewechselt wird nach Herstellerangabe oder bei Bedarf (z. B. Verstopfung, Infektion)."),
    ("Vor dem Entfernen klemmt man den Katheter ab, um die Blase zu trainieren.", False,
     "Abklemmen („Blasentraining“) wird nicht empfohlen."),
    ("Zum Entblocken lassen Sie die Flüssigkeit von selbst (passiv) in die Spritze laufen.", True,
     "Kräftiges Ziehen kann Falten am Ballon bilden. Diese können die Harnröhre verletzen."),
    ("Beim Leeren des Beutels hat jeder Patient ein eigenes Auffanggefäß.", True,
     "So werden keine Keime von Patient zu Patient übertragen."),
    ("Wenn sich der Ballon nicht entblocken lässt, ziehen Sie kräftig am Katheter.", False,
     "Nie ziehen! Ärztin oder Arzt informieren."),
    ("Bei alten Menschen kann neue Verwirrtheit ein Zeichen für eine Harnwegsinfektion sein.", True,
     "Ältere Menschen haben oft keine typischen Beschwerden. Unruhe, Verwirrtheit oder ein Sturz können Hinweise sein."),
    ("Ein DK wird am besten am späten Abend entfernt.", False,
     "Besser am Vormittag. Dann kann man am Tag beobachten, ob die Person wieder selbst Wasser lassen kann."),
    ("Viel trinken (wenn es erlaubt ist) hilft, Harnwegsinfektionen vorzubeugen.", True,
     "Viel Urin spült die Blase und den Katheter."),
]
U5 = [{"type": "tf", "section": "Teil A: Richtig oder falsch?", "q": t, "correct": c, "explain": e,
       "hint": "Abschnitt 4 „Pflege bei liegendem DK“ und Abschnitt 5 „Entfernung“."} for t, c, e in TF]
U5 += [
    {"type": "mc", "section": "Teil B: Fallsituation",
     "q": "Frau Brandt (81) hat seit 2 Tagen einen DK. Heute ist sie unruhig und verwirrt. Der Urin ist trüb und riecht stark. Temperatur: 38,4 °C. <b>Was tun Sie?</b>",
     "options": ["Vitalzeichen messen, Ärztin/Arzt informieren, Beobachtungen dokumentieren",
                 "Den Katheter selbst entfernen",
                 "Die Blase mit Kochsalzlösung spülen",
                 "Nur den Beutel wechseln und abwarten"],
     "correct": 0, "explain": "Das sind Zeichen einer Harnwegsinfektion. Die Ärztin oder der Arzt entscheidet über Diagnostik (z. B. Urinprobe aus der Probeentnahmestelle) und Therapie.",
     "hint": "Abschnitt 4, „Beobachtung“."},
    {"type": "mc", "section": "Teil B: Fallsituation",
     "q": "Im Beutel von Herrn Novak ist seit 2 Stunden kein Urin dazugekommen. <b>Was prüfen Sie zuerst?</b>",
     "options": ["Ob der Schlauch abgeknickt ist oder Herr Novak darauf liegt",
                 "Sofort einen neuen Katheter legen",
                 "Den Ballon mit mehr Flüssigkeit nachblocken",
                 "Nichts – das ist normal"],
     "correct": 0, "explain": "Zuerst einfache Ursachen prüfen: Knick, Schlaufe, Lage, Beutel voll oder zu hoch. Kommt weiter kein Urin: Ärztin/Arzt informieren.",
     "hint": "Abschnitt 4, „Es kommt kein Urin?“."},
]

uebung(1, "Übung 1: Katheter und Material",
       "<strong>So geht's:</strong> Beantworten Sie alle Aufgaben. Tippen Sie dann unten auf „Auswerten“. "
       "Ab 8 von 10 Punkten bekommen Sie Ihren Baustein.", U1,
       "Lesen Sie Abschnitt 1 noch einmal. Ändern Sie dann die rot markierten Antworten und werten Sie erneut aus.")
uebung(2, "Übung 2: Braucht diese Person einen DK?",
       "<strong>So geht's:</strong> Lesen Sie jeden Fall. Entscheiden Sie: Ist ein DK sinnvoll? Gibt es eine bessere Alternative? "
       "Oder ist ein DK sogar gefährlich (Kontraindikation)? Ab 8 von 10 Punkten bekommen Sie Ihren Baustein.", U2,
       "Lesen Sie Abschnitt 2 noch einmal, besonders die Tabelle. Ändern Sie dann die rot markierten Antworten.")
uebung(3, "Übung 3: Den DK bei einer Frau legen",
       "<strong>So geht's:</strong> In Teil A ordnen Sie 10 Schritte. Jeder Schritt in der richtigen Reihenfolge gibt 1 Punkt. "
       "Teil B hat 4 Fragen. Ab 12 von 14 Punkten bekommen Sie Ihren Baustein.", U3,
       "Lesen Sie in Abschnitt 3 die Schritte „Durchführung bei der Frau“ noch einmal. Tippen Sie auf Schritte in Ihrer Liste, um sie zu entfernen.")
uebung(4, "Übung 4: Den DK bei einem Mann legen",
       "<strong>So geht's:</strong> Schauen Sie zuerst das Video an (QR-Code auf dem Arbeitsblatt). "
       "In Teil A finden Sie Fehler in einer Geschichte. Für jeden richtig beurteilten Satz gibt es 1 Punkt. "
       "Teil B hat 3 Fragen. Ab 13 von 16 Punkten bekommen Sie Ihren Baustein.", U4,
       "Lesen Sie in Abschnitt 3 „Beim Mann ist anders“ noch einmal. Prüfen Sie jeden Satz der Geschichte Schritt für Schritt.")
uebung(5, "Übung 5: Pflege, Beobachtung und Entfernung",
       "<strong>So geht's:</strong> 12 Aussagen (richtig oder falsch) und 2 Fragen zu Fällen. "
       "Ab 12 von 14 Punkten bekommen Sie Ihren Baustein.", U5,
       "Lesen Sie Abschnitt 4 und 5 noch einmal. Ändern Sie dann die rot markierten Antworten.")

# ---------------------------------------------------------------- Video
page("dk/video/index.html", "Video: DK beim Mann legen", "ILS Dauerkatheter · Video", f"""
<div class="card">
<p><strong>Video:</strong> „Katheterisierung mit Dauerkatheter: Mann“ (ca. 7 Minuten, Deutsch).<br>
Zwei Pflegefachfrauen aus einer Universitätsklinik in Stockholm (Schweden) zeigen, wie man einem Mann einen DK legt.</p>
<p><a class="btn block" href="{VIDEO_URL}" target="_blank" rel="noopener">▶ Video auf YouTube öffnen</a></p>
<p class="small">Tipp: Schalten Sie die Untertitel ein (Zahnrad → Untertitel → Deutsch). Sie können das Video anhalten und zurückspulen.</p>
</div>
<h2>Beobachtungsauftrag</h2>
<div class="card">
<p>Schauen Sie das Video an. Achten Sie besonders auf diese Stellen:</p>
<ul class="steps">
<li><b>0:20–0:45</b> Aufklärung, Einwilligung, Entspannung des Beckenbodens</li>
<li><b>1:47–3:39</b> Vorbereitung des Materials, sterile Handschuhe</li>
<li><b>4:16–4:40</b> Vorhaut zurückziehen, Harnröhrenöffnung reinigen</li>
<li><b>4:54–5:34</b> Gleitmittel mit Lokalanästhetikum einbringen, Einwirkzeit</li>
<li><b>6:00–6:39</b> Einführen, Widerstand, bis zur Gabelung, Urin fließt, Ballon blocken</li>
</ul>
</div>
<h2>Achtung: In Deutschland ist manches anders</h2>
<div class="card">
<p>Das Video kommt aus Schweden und von einem Katheter-Hersteller. Vergleichen Sie mit dem Infotext:</p>
<ul class="steps">
<li><b>Reinigung:</b> Im Video wird mit Kochsalzlösung gereinigt. In Deutschland: <b>Schleimhaut-Antiseptikum</b> (z. B. Octenidin) mit Einwirkzeit.</li>
<li><b>Vorhaut:</b> Im Video sieht man das Ende nicht genau. Denken Sie daran: <b>Vorhaut nach dem Legen wieder nach vorne schieben</b> (Paraphimose!).</li>
<li><b>Gleitmittel:</b> Menge und Einwirkzeit immer <b>nach Herstellerangabe</b>.</li>
<li><b>Nicht im Video:</b> Fixierung, Beutel unter Blasenniveau, Dokumentation – siehe Infotext.</li>
</ul>
<p>Danach: zurück zum Arbeitsblatt und <b>Übung 4</b> machen.</p>
</div>
""")

# ---------------------------------------------------------------- Abschluss
POOL = [
    {"type": "mc", "q": "Was bedeutet <b>transurethral</b>?", "options": ["durch die Harnröhre", "durch die Speiseröhre", "durch die Niere", "durch den After"], "correct": 0, "explain": "trans = durch, Urethra = Harnröhre."},
    {"type": "mc", "q": "Wer ordnet einen DK an?", "options": ["Die Ärztin oder der Arzt", "Die Praxisanleitung", "Der Patient selbst", "Die Stationsleitung"], "correct": 0, "explain": "Der DK ist eine ärztlich angeordnete Maßnahme. Die Durchführung kann an Pflegefachpersonen delegiert werden."},
    {"type": "mc", "q": "Welche Komplikation eines DK ist am häufigsten?", "options": ["Harnwegsinfektion", "Allergie gegen Silikon", "Nierenversagen", "Thrombose"], "correct": 0, "explain": "Katheterassoziierte Harnwegsinfektionen gehören zu den häufigsten Infektionen im Krankenhaus."},
    {"type": "mc", "q": "Ein Katheter hat 18 Ch. Wie groß ist der Außendurchmesser?", "options": ["6 mm", "18 mm", "3 mm", "9 mm"], "correct": 0, "explain": "18 : 3 = 6 mm."},
    {"type": "mc", "q": "Wie desinfizieren Sie bei der Frau?", "options": ["Von oben nach unten (Richtung Anus), für jeden Wisch ein neuer Tupfer", "Von unten nach oben mit einem Tupfer", "Kreisförmig von außen nach innen", "Gar nicht, nur waschen"], "correct": 0, "explain": "So werden keine Keime vom Anus zur Harnröhrenöffnung gewischt."},
    {"type": "mc", "q": "Was ist eine <b>Paraphimose</b>?", "options": ["Die zurückgeschobene Vorhaut schnürt die Eichel ein (Schwellung).", "Eine Entzündung der Blase", "Ein verstopfter Katheter", "Eine Verletzung der Scheide"], "correct": 0, "explain": "Deshalb die Vorhaut nach dem Katheterisieren immer wieder nach vorne schieben."},
    {"type": "mc", "q": "Warum bekommt ein Mann Gleitmittel mit Lokalanästhetikum?", "options": ["Die lange Harnröhre wird betäubt und gleitfähig. Das senkt Schmerzen und Verletzungen.", "Es desinfiziert die Blase.", "Es ersetzt die sterilen Handschuhe.", "Es füllt den Ballon."], "correct": 0, "explain": "Einwirkzeit nach Herstellerangabe abwarten."},
    {"type": "mc", "q": "Wo hängt der Urinbeutel richtig?", "options": ["Unter Blasenniveau, ohne Bodenkontakt", "Auf dem Boden", "Auf dem Bauch der Patientin", "Über Blasenniveau am Infusionsständer"], "correct": 0, "explain": "Kein Rückfluss in die Blase, keine Keime vom Boden."},
    {"type": "mc", "q": "Welche Person braucht <b>keinen</b> DK?", "options": ["Eine Bewohnerin, die nur inkontinent ist", "Ein Patient mit akutem Harnverhalt", "Eine Patientin im Schock mit stündlicher Bilanz", "Ein Palliativpatient, der es wünscht, weil jede Bewegung schmerzt"], "correct": 0, "explain": "Inkontinenz allein ist keine Indikation."},
    {"type": "mc", "q": "Wie gelangen Bakterien bei einem DK in die Blase?", "options": ["Außen am Katheter entlang und innen durch den Katheter", "Nur über das Blut", "Nur über die Luft im Zimmer", "Gar nicht, der Katheter ist steril"], "correct": 0, "explain": "Deshalb: Intimpflege (außen) und geschlossenes System, kein Rückfluss (innen)."},
    {"type": "mc", "q": "Was dokumentieren Sie nach dem Legen eines DK <b>nicht</b> unbedingt?", "options": ["Die Farbe des Lochtuchs", "Kathetergröße (Ch) und Material", "Blockmenge", "Urinmenge und Aussehen"], "correct": 0, "explain": "Wichtig sind: Datum/Uhrzeit, Kathetertyp, Größe, Material, Blockmenge, Urin, Besonderheiten, Handzeichen."},
    {"type": "mc", "q": "Ein Patient hat seit dem Morgen keinen DK mehr. Es ist 16 Uhr. Er hat noch nicht uriniert und hat Bauchschmerzen. Was tun Sie?", "options": ["Blasenscanner/Ärztin oder Arzt: Verdacht auf Harnverhalt", "Abwarten bis morgen", "Ihm weniger zu trinken geben", "Sofort einen neuen DK legen, ohne Anordnung"], "correct": 0, "explain": "Nach der Entfernung die Spontanmiktion beobachten. Bei Problemen Restharn prüfen und ärztlich abklären."},
    {"type": "tf", "q": "Der Ballon wird geblockt, sobald die Katheterspitze in der Harnröhre ist.", "correct": False, "explain": "Erst blocken, wenn Urin fließt und der Katheter noch weiter vorgeschoben wurde."},
    {"type": "tf", "q": "Beim Mann wird der Katheter fast bis zur Gabelung eingeführt, bevor geblockt wird.", "correct": True, "explain": "So liegt der Ballon sicher in der Blase."},
    {"type": "tf", "q": "Silikonkatheter eignen sich für eine längere Liegedauer.", "correct": True, "explain": "Latex nur kurz; Silikon länger (Herstellerangabe)."},
    {"type": "tf", "q": "Der Ballon wird mit NaCl 0,9 % geblockt.", "correct": False, "explain": "Aqua dest. oder Glycerinlösung nach Herstellerangabe."},
    {"type": "tf", "q": "Bei Blut an der Harnröhrenöffnung nach einem Beckentrauma legen Pflegende keinen transurethralen DK.", "correct": True, "explain": "Verdacht auf Harnröhrenverletzung: Kontraindikation."},
    {"type": "tf", "q": "Ein Einmalkatheter hat ein geringeres Infektionsrisiko als ein Dauerkatheter.", "correct": True, "explain": "Er liegt nur kurz – deshalb ist er oft die bessere Alternative."},
    {"type": "tf", "q": "Zum Leeren des Beutels öffnet man die Verbindung zwischen Katheter und Beutel.", "correct": False, "explain": "Geleert wird nur über das Ablassventil."},
    {"type": "tf", "q": "Ein DK bleibt so kurz wie möglich liegen.", "correct": True, "explain": "Jeder Tag erhöht das Infektionsrisiko."},
]

T.ende(POOL)
T.lehrkraft()
T.uebersicht([
    ("1/", "Übung 1: Katheter und Material"),
    ("2/", "Übung 2: Braucht diese Person einen DK?"),
    ("3/", "Übung 3: Den DK bei einer Frau legen"),
    ("video/", "Video: DK beim Mann legen"),
    ("4/", "Übung 4: Den DK bei einem Mann legen"),
    ("5/", "Übung 5: Pflege, Beobachtung und Entfernung"),
    ("ende/", "Abschluss: Quiz und persönliche ID"),
])
startseite()

print("Seiten erzeugt. Lehrkraft-Schlüssel:", "-".join(T.bausteine))
