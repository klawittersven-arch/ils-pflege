"""Erzeugt die Übungsseiten für den ILS-Auftrag SPK (suprapubischer Katheter / Cystofix).

Aufruf: python3 tools/seiten_spk.py
Baut auf ILS DK auf: Wissen zu Katheteraufbau, Ableitungssystem, Infektionsprophylaxe usw. wird
vorausgesetzt und nicht noch einmal abgefragt.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web_bau import Thema, startseite  # noqa: E402

T = Thema("spk", "SPK", "Suprapubischer Katheter", "Suprapubischer Katheter")

# ---------------------------------------------------------------- Übung 1
DSB = ["nur DK", "nur SPK", "bei beiden"]
U1_AUSSAGEN = [
    ("Der Katheter geht durch die Bauchdecke in die Blase.", 1, "Suprapubisch = über dem Schambein durch die Bauchdecke."),
    ("Die Harnröhre kann durch den Katheter verletzt werden oder sich später verengen.", 0,
     "Beim SPK liegt kein Katheter in der Harnröhre. Das ist ein großer Vorteil."),
    ("Ein geschlossenes Ableitungssystem und ein Beutel unter Blasenniveau sind wichtig.", 2,
     "Das kennen Sie aus ILS 1 – es gilt genauso beim SPK."),
    ("Die Person kann mit liegendem Katheter versuchen, selbst Wasser zu lassen (Miktionsversuch).", 1,
     "Beim SPK ist die Harnröhre frei. Deshalb ist ein Miktionsversuch möglich."),
    ("Pflegefachpersonen dürfen den Katheter nach ärztlicher Anordnung erstmals legen.", 0,
     "Einen DK dürfen Pflegefachpersonen nach Delegation legen. Einen SPK legt immer die Ärztin oder der Arzt (Punktion)."),
    ("Es gibt eine Einstichstelle in der Haut, die einen Verband braucht.", 1,
     "Die Einstichstelle ist eine kleine Wunde. Sie wird beobachtet und steril verbunden."),
    ("Harnwegsinfektionen sind möglich.", 2,
     "Auch beim SPK können Bakterien in die Blase gelangen – das Risiko ist aber geringer als beim DK."),
]
U1 = [{"type": "mc", "keep": True, "section": "Teil A: DK, SPK oder bei beiden?", "q": q, "options": DSB, "correct": c,
       "explain": e, "hint": "Abschnitt 1, Tabelle „SPK und DK im Vergleich“."} for q, c, e in U1_AUSSAGEN]
U1 += [
    {"type": "mc", "section": "Teil B: Grundlagen", "q": "Was bedeutet <b>suprapubisch</b>?",
     "options": ["über dem Schambein", "unter dem Nabel, neben der Leiste", "durch die Harnröhre", "hinter der Blase"], "correct": 0,
     "explain": "supra = über, Os pubis = Schambein.", "hint": "Abschnitt 1, erster Absatz."},
    {"type": "mc", "section": "Teil B: Grundlagen", "q": "Was ist <b>„Cystofix“</b>?",
     "options": ["Der Handelsname eines Sets für einen SPK. Viele sagen deshalb „Cystofix“ zum SPK.",
                 "Ein Medikament gegen Blasenentzündung", "Ein Desinfektionsmittel für die Einstichstelle", "Eine Klemme für den Miktionsversuch"],
     "correct": 0, "explain": "Cystofix ist ein Produktname (Firma B. Braun). Im Alltag wird der Name oft für jeden SPK benutzt.",
     "hint": "Abschnitt 1."},
    {"type": "mc", "section": "Teil B: Grundlagen", "q": "Warum ist das Infektionsrisiko beim SPK <b>geringer</b> als beim DK?",
     "options": ["Die Einstichstelle liegt weit weg von Harnröhre, Scheide und After. Dort gibt es weniger Keime.",
                 "Der SPK ist immer aus Silber.", "Beim SPK braucht man keinen Urinbeutel.", "Der SPK wird jeden Tag gewechselt."],
     "correct": 0, "explain": "Im Intimbereich sind viele Darm- und Hautkeime. Beim SPK ist die Eintrittsstelle weiter davon entfernt.",
     "hint": "Abschnitt 1, Vergleichstabelle."},
    {"type": "mc", "section": "Teil B: Grundlagen", "q": "Was ist beim SPK eine <b>Fistel</b>?",
     "options": ["Ein Kanal von der Haut bis in die Blase, der sich um den Katheter bildet",
                 "Ein Riss in der Harnröhre", "Ein Knick im Katheter", "Eine Entzündung der Niere"],
     "correct": 0, "explain": "Nach einigen Wochen ist der Kanal stabil. Dann kann der Katheter gewechselt werden.",
     "hint": "Abschnitt 1, „Die Fistel“."},
]

# ---------------------------------------------------------------- Übung 2
CATS = ["SPK ist sinnvoll", "Kein SPK – eine andere Lösung ist besser", "Kein SPK – Kontraindikation (Ärztin/Arzt entscheidet)"]
U2_FAELLE = [
    ("Herr Novak (72) hat seit 5 Tagen einen DK. Seine Prostata-OP ist erst in 6 Wochen. Bis dahin muss der Urin abgeleitet werden.", 0,
     "Der Urin muss lange abgeleitet werden. Dann ist ein SPK besser als ein DK."),
    ("Frau Weber (67) hat Multiple Sklerose. Ihre Blase entleert sich nicht. Selbstkatheterismus geht nicht, weil ihre Hände zittern.", 0,
     "Dauerhafte Ableitung bei neurogener Blasenstörung, wenn Selbstkatheterismus nicht möglich ist: typische Indikation."),
    ("Herr Schulz (45) hat einen Beckenbruch. An der Harnröhrenöffnung ist Blut. Er kann kein Wasser lassen.", 0,
     "Ein DK ist hier kontraindiziert (Verdacht auf Harnröhrenverletzung, siehe ILS 1). Ein SPK leitet den Urin ab, ohne die Harnröhre zu berühren."),
    ("Herr Lange (58) hat eine akute Prostataentzündung mit Fieber und kann kein Wasser lassen.", 0,
     "Bei akuter Prostatitis ist ein DK kontraindiziert. Der SPK ist die richtige Ableitung."),
    ("Frau Klein (50) soll einen SPK bekommen. Ihre Blase ist leer und lässt sich nicht füllen. Im Ultraschall sieht man sie nicht.", 2,
     "Ohne gefüllte Blase liegt der Darm direkt hinter der Bauchdecke. Die Punktion wäre gefährlich."),
    ("Herr Fuchs (77) nimmt einen Gerinnungshemmer. Sein INR-Wert ist stark erhöht.", 2,
     "Bei Gerinnungsstörungen besteht Blutungsgefahr. Die Ärztin oder der Arzt entscheidet, ob und wann punktiert wird."),
    ("Frau Roth (70) hat einen bekannten Blasentumor.", 2,
     "Bei einem Blasentumor wird nicht suprapubisch punktiert (Gefahr der Tumorzell-Verschleppung, Blutung)."),
    ("Von Herrn Yilmaz (35) braucht man einmal eine sterile Urinprobe.", 1,
     "Für eine einzelne Probe reicht ein Einmalkatheter oder Mittelstrahlurin. Eine Punktion wäre viel zu aufwendig."),
    ("Frau Jansen (54) hatte eine große Unterleibs-OP. Der Urin muss einige Tage abgeleitet werden. Danach soll sie wieder selbst Wasser lassen lernen.", 0,
     "Mit SPK sind später Miktionsversuche möglich, ohne den Katheter zu ziehen."),
    ("Herr Bauer (80) ist nachts manchmal inkontinent. Sonst hat er keine Probleme beim Wasserlassen.", 1,
     "Inkontinenz allein ist keine Indikation für einen Katheter – weder DK noch SPK. Besser: Inkontinenzmaterial, Toilettengänge."),
]
U2 = [{"type": "mc", "keep": True, "q": f, "options": CATS, "correct": c, "explain": e,
       "hint": "Abschnitt 2, Tabelle „Indikationen und Kontraindikationen“."} for f, c, e in U2_FAELLE]

# ---------------------------------------------------------------- Übung 3
U3 = [
    {"type": "order", "section": "Teil A: Anlage eines SPK – die richtige Reihenfolge",
     "q": "Bringen Sie die Schritte in die richtige Reihenfolge. Der erste Schritt gehört ganz nach oben.",
     "items": [
         "Ärztin/Arzt klärt auf, Patient unterschreibt die Einwilligung",
         "Gerinnungswerte prüfen, Gerinnungshemmer nach Anordnung pausieren",
         "Blase gut füllen (trinken lassen oder Infusion nach Anordnung), nicht mehr zur Toilette gehen",
         "Haare am Unterbauch kürzen, Patient flach auf den Rücken lagern",
         "Ärztin/Arzt kontrolliert mit Ultraschall, ob die Blase voll ist",
         "Hautdesinfektion und örtliche Betäubung durch die Ärztin/den Arzt – Pflege reicht steril an",
         "Punktion: Katheter einführen, Urin fließt, Ballon blocken oder Katheter annähen",
         "Ableitungssystem anschließen, steriler Verband mit Schlitzkompresse",
         "Nachsorge: Vitalzeichen, Urin, Verband und Bauch beobachten, dokumentieren",
     ],
     "explain": "So ist die richtige Reihenfolge. Am wichtigsten: Die Blase muss vor der Punktion gut gefüllt sein.",
     "hint": "Abschnitt 3, „Vorbereitung“ und „So läuft die Anlage ab“."},
    {"type": "mc", "section": "Teil B: Fragen zur Anlage",
     "q": "Warum muss die Blase vor der Punktion <b>gut gefüllt</b> sein?",
     "options": ["Die volle Blase schiebt Bauchfell und Darm nach oben. So wird der Darm nicht verletzt.",
                 "Damit der Urin schneller in den Beutel läuft.", "Damit die Haut besser desinfiziert werden kann.", "Damit der Ballon weniger Flüssigkeit braucht."],
     "correct": 0, "explain": "Bei leerer Blase liegt der Darm direkt hinter der Bauchdecke (Abb. 1).",
     "hint": "Abb. 1 (Abschnitt 1) und Abschnitt 3, „Vorbereitung“."},
    {"type": "mc", "section": "Teil B: Fragen zur Anlage",
     "q": "Wer legt einen SPK?",
     "options": ["Die Ärztin oder der Arzt", "Die Pflegefachperson nach Delegation", "Auszubildende unter Anleitung", "Die Praxisanleitung"],
     "correct": 0, "explain": "Die Anlage ist eine Punktion und damit eine ärztliche Aufgabe. Die Pflege bereitet vor, assistiert und übernimmt die Nachsorge.",
     "hint": "Abschnitt 2, Merke-Kasten."},
    {"type": "mc", "section": "Teil B: Fragen zur Anlage",
     "q": "Herr Novak hat seit 2 Stunden einen SPK. Der Urin ist leicht rötlich, ohne Gerinnsel. Er hat keine Schmerzen. Was tun Sie?",
     "options": ["Das kann am Anfang normal sein. Urin weiter beobachten und dokumentieren.",
                 "Sofort den Katheter entfernen.", "Den Katheter mit Wasser spülen.", "Nichts – Urinfarbe ist unwichtig."],
     "correct": 0, "explain": "Leicht blutiger Urin ist nach der Punktion häufig. Wird er stärker, kommen Gerinnsel oder fließt kein Urin mehr: Ärztin/Arzt informieren.",
     "hint": "Abschnitt 3, „Nachsorge“."},
    {"type": "mc", "section": "Teil B: Fragen zur Anlage",
     "q": "Am Abend nach der Anlage hat Herr Novak einen harten, sehr schmerzhaften Bauch und Fieber. Woran denken Sie?",
     "options": ["An eine Verletzung des Darms mit Bauchfellentzündung – sofort Ärztin/Arzt informieren",
                 "An Blähungen – Tee anbieten", "An Muskelkater – abwarten", "An eine normale Reaktion – nichts tun"],
     "correct": 0, "explain": "Ein harter Bauch, starke Schmerzen und Fieber sind Warnzeichen (Peritonitis). Das ist ein Notfall.",
     "hint": "Abschnitt 3, „Nachsorge“."},
]

# ---------------------------------------------------------------- Übung 4
U4 = [
    {"type": "errors", "section": "Teil A: Fehlersuche – Pflegerin Mia macht bei Frau Weber einen Verbandswechsel",
     "q": "Frau Weber hat seit 2 Jahren einen SPK. Mia arbeitet beim ambulanten Pflegedienst. <b>Tippen Sie auf jeden Satz, in dem Mia einen Fehler macht.</b>",
     "sentences": [
         {"t": "Mia erklärt Frau Weber, was sie jetzt macht.", "wrong": False},
         {"t": "Sie desinfiziert die Hände und zieht unsterile Handschuhe an.", "wrong": False},
         {"t": "Sie zieht den alten Verband mit einem Ruck ab. Den Katheter hält sie dabei nicht fest.", "wrong": True,
          "explain": "Den Katheter immer festhalten und den Verband vorsichtig lösen. Sonst zieht man am Katheter."},
         {"t": "Sie schaut sich den alten Verband an: Er ist trocken und sauber.", "wrong": False},
         {"t": "Sie zieht die Handschuhe aus und desinfiziert die Hände.", "wrong": False},
         {"t": "Sie beurteilt die Einstichstelle: Ist sie gerötet oder geschwollen? Gibt es Sekret oder tritt Urin aus?", "wrong": False},
         {"t": "Sie desinfiziert die Haut kreisförmig von außen nach innen zur Einstichstelle hin.", "wrong": True,
          "explain": "Richtig ist: von innen nach außen – von der Einstichstelle weg. Sonst wischt man Keime zur Einstichstelle."},
         {"t": "Sie wartet die Einwirkzeit des Antiseptikums ab.", "wrong": False},
         {"t": "Sie legt mit einer sterilen Pinzette eine sterile Schlitzkompresse um den Katheter.", "wrong": False},
         {"t": "Sie fixiert den Katheter straff und ohne Schlaufe, damit er nicht wackelt.", "wrong": True,
          "explain": "Der Katheter wird in einer kleinen Schlaufe zugfrei fixiert. Straffer Zug reizt die Einstichstelle und kann den Katheter herausziehen."},
         {"t": "Den Urinbeutel legt sie neben Frau Webers Bauch auf das Bett.", "wrong": True,
          "explain": "Der Beutel muss unter Blasenniveau hängen (ILS 1). Sonst fließt Urin zurück in die Blase."},
         {"t": "Sie dokumentiert Datum, Zustand der Einstichstelle und den Verband.", "wrong": False},
         {"t": "Frau Weber fragt, ob sie duschen darf. Mia sagt: „Nie, solange Sie einen Katheter haben.“", "wrong": True,
          "explain": "Ist die Einstichstelle abgeheilt und reizlos, ist Duschen meist erlaubt (Hausstandard). Danach Verband wechseln."},
     ],
     "explain": "Die Erklärungen zu jedem Fehler stehen direkt unter den Sätzen.",
     "hint": "Abschnitt 4, „Verbandswechsel Schritt für Schritt“."},
    {"type": "mc", "section": "Teil B: Pflege bei liegendem SPK",
     "q": "Die Einstichstelle bei Frau Weber ist heute gerötet, geschwollen und es kommt gelbliches Sekret. Was tun Sie?",
     "options": ["Beobachtungen dokumentieren, Ärztin/Arzt informieren, steril verbinden",
                 "Den Katheter selbst herausziehen", "Eine Salbe aus dem Badezimmer auftragen", "Nichts – das ist normal"],
     "correct": 0, "explain": "Das sind Zeichen einer Infektion der Einstichstelle. Die Ärztin oder der Arzt entscheidet über die Behandlung.",
     "hint": "Abschnitt 4, „Beobachtung der Einstichstelle“."},
    {"type": "mc", "section": "Teil B: Pflege bei liegendem SPK",
     "q": "Beim <b>Katheterwechsel</b> ist besonders wichtig:",
     "options": ["Den neuen Katheter sofort einführen, weil sich der Kanal schnell verkleinert",
                 "Nach dem Ziehen eine Stunde warten, damit die Stelle sich erholt", "Den alten Katheter abwaschen und wieder verwenden", "Den Ballon mit Luft blocken"],
     "correct": 0, "explain": "Der Fistelkanal zieht sich schnell zusammen. Deshalb liegt alles bereit und der neue Katheter wird sofort eingeführt.",
     "hint": "Abschnitt 4, „Katheterwechsel“."},
    {"type": "mc", "section": "Teil B: Pflege bei liegendem SPK",
     "q": "Was ist richtig zum <b>Katheterventil</b> (statt Urinbeutel)?",
     "options": ["Das Ventil wird regelmäßig geöffnet, z. B. alle 3–4 Stunden. Dazwischen füllt sich die Blase – das trainiert sie.",
                 "Das Ventil bleibt immer offen.", "Ein Ventil braucht keine ärztliche Anordnung.", "Mit Ventil darf man nicht aus dem Bett aufstehen."],
     "correct": 0, "explain": "Das Ventil gibt es nur nach ärztlicher Anordnung. Die Person muss es bedienen können und die Blase muss die Füllung vertragen.",
     "hint": "Abschnitt 4, „Katheterventil“."},
]

# ---------------------------------------------------------------- Übung 5
TF = [
    ("Beim SPK darf der Katheter für einen Miktionsversuch nach ärztlicher Anordnung abgeklemmt werden.", True,
     "Beim DK ist Abklemmen nicht sinnvoll (ILS 1). Beim SPK ist der Miktionsversuch mit Abklemmen ein normales Vorgehen."),
    ("Beim Miktionsversuch wird der Restharn über den SPK abgelassen und gemessen.", True,
     "Das ist ein großer Vorteil des SPK: Man braucht keinen Einmalkatheter für die Restharnmessung."),
    ("Bei starken Schmerzen bleibt die Klemme trotzdem zu – der Versuch muss durchgehalten werden.", False,
     "Bei Schmerzen, starkem Druck oder Urin an der Einstichstelle wird die Klemme sofort geöffnet."),
    ("Rutscht ein SPK heraus, hat man mehrere Tage Zeit, bis sich der Kanal verschließt.", False,
     "Der Kanal kann sich innerhalb weniger Stunden verschließen. Deshalb schnell handeln!"),
    ("Nach dem Entfernen des SPK wird die Einstichstelle steril abgedeckt.", True,
     "Die Stelle verschließt sich meist in 1–2 Tagen. Bis dahin steril abdecken."),
    ("Nach dem Entfernen kann in den ersten Tagen etwas Urin an der Einstichstelle austreten.", True,
     "Das ist normal. Den Verband bei Bedarf wechseln. Regelmäßig zur Toilette gehen hilft."),
    ("Beim SPK braucht man keine Maßnahmen gegen Infektionen, weil die Harnröhre frei ist.", False,
     "Auch beim SPK gilt alles aus ILS 1: geschlossenes System, Beutel unter Blasenniveau, Hygiene."),
    ("Einen verstopften SPK dürfen Pflegende jederzeit ohne Anordnung spülen.", False,
     "Spülen nur nach ärztlicher Anordnung und aseptisch."),
]
U5 = [{"type": "tf", "section": "Teil A: Richtig oder falsch?", "q": t, "correct": c, "explain": e,
       "hint": "Abschnitt 5 „Miktionsversuch, Komplikationen und Entfernung“."} for t, c, e in TF]
U5 += [
    {"type": "mc", "section": "Teil B: Fallsituationen",
     "q": "Nach seiner Prostata-OP macht Herr Novak einen Miktionsversuch. Er lässt 300 ml Wasser. Danach laufen 40 ml über den SPK ab. <b>Wie viel Restharn hat er?</b>",
     "options": ["40 ml", "300 ml", "340 ml", "260 ml"], "correct": 0,
     "explain": "Restharn = der Urin, der nach dem Wasserlassen noch in der Blase ist. Das sind die 40 ml aus dem SPK.",
     "hint": "Abschnitt 5, Abb. 3."},
    {"type": "mc", "section": "Teil B: Fallsituationen",
     "q": "Herr Novaks Restharn: 40 ml, 35 ml, 45 ml. Laut Anordnung soll er unter 50 ml liegen. <b>Was tun Sie?</b>",
     "options": ["Werte dokumentieren und der Ärztin/dem Arzt melden – sie oder er entscheidet über die Entfernung",
                 "Den SPK sofort selbst entfernen", "Den Miktionsversuch abbrechen", "Die Klemme dauerhaft geschlossen lassen"],
     "correct": 0, "explain": "Die Entfernung wird ärztlich angeordnet. Ihre Dokumentation ist die Grundlage für die Entscheidung.",
     "hint": "Abschnitt 5, Abb. 3."},
    {"type": "mc", "section": "Teil B: Fallsituationen",
     "q": "Frau Weber ruft an: Beim Anziehen ist ihr SPK herausgerutscht. <b>Was ist richtig?</b>",
     "options": ["Einstichstelle steril abdecken und sofort Ärztin/Arzt informieren – der Kanal kann sich in wenigen Stunden verschließen",
                 "Bis morgen warten, dann kommt die Ärztin sowieso", "Den alten Katheter abwaschen und wieder hineinschieben", "Nichts tun, solange sie keine Schmerzen hat"],
     "correct": 0, "explain": "Schnell handeln! Ein neuer Katheter muss bald gelegt werden, solange der Kanal noch offen ist.",
     "hint": "Abschnitt 5, „Komplikationen“."},
    {"type": "mc", "section": "Teil B: Fallsituationen",
     "q": "Seit 3 Stunden kommt kein Urin in den Beutel. Der Unterbauch ist gespannt. An der Einstichstelle tritt Urin aus. Der Schlauch ist <b>nicht</b> abgeknickt. <b>Woran denken Sie?</b>",
     "options": ["An einen verstopften Katheter – Ärztin/Arzt informieren (Spülen oder Wechsel nach Anordnung)",
                 "An zu viel Trinken", "An eine normale Reaktion", "An einen zu kleinen Urinbeutel"],
     "correct": 0, "explain": "Urin staut sich in der Blase und sucht sich einen anderen Weg. Der Katheter ist wahrscheinlich verstopft.",
     "hint": "Abschnitt 5, „Komplikationen“."},
]

T.uebung(1, "Übung 1: SPK – Grundlagen und Vergleich",
         "<strong>So geht's:</strong> Teil A: Gilt die Aussage nur für den DK, nur für den SPK oder für beide? Teil B: 4 Fragen. "
         "Den Baustein bekommen Sie nur, wenn <strong>alle Aufgaben richtig</strong> sind.", U1,
         "Lesen Sie Abschnitt 1 noch einmal, besonders die Vergleichstabelle. Ändern Sie dann die rot markierten Antworten.")
T.uebung(2, "Übung 2: Ist ein SPK sinnvoll?",
         "<strong>So geht's:</strong> Lesen Sie jeden Fall. Entscheiden Sie: Ist ein SPK sinnvoll? Ist eine andere Lösung besser? "
         "Oder ist ein SPK gefährlich (Kontraindikation)? Den Baustein bekommen Sie nur, wenn <strong>alle Aufgaben richtig</strong> sind.", U2,
         "Lesen Sie Abschnitt 2 noch einmal, besonders die Tabelle. Ändern Sie dann die rot markierten Antworten.")
T.uebung(3, "Übung 3: Assistenz bei der Anlage",
         "<strong>So geht's:</strong> In Teil A ordnen Sie 9 Schritte. Jeder Schritt in der richtigen Reihenfolge gibt 1 Punkt. "
         "Teil B hat 4 Fragen. Den Baustein bekommen Sie nur, wenn <strong>alle Aufgaben richtig</strong> sind.", U3,
         "Lesen Sie Abschnitt 3 noch einmal. Verschieben Sie die rot markierten Schritte an die richtige Stelle.")
T.uebung(4, "Übung 4: Verbandswechsel und Pflege",
         "<strong>So geht's:</strong> In Teil A finden Sie Fehler in einer Geschichte. Für jeden richtig beurteilten Satz gibt es 1 Punkt. "
         "Teil B hat 3 Fragen. Den Baustein bekommen Sie nur, wenn <strong>alle Aufgaben richtig</strong> sind.", U4,
         "Lesen Sie Abschnitt 4 noch einmal, besonders „Verbandswechsel Schritt für Schritt“.")
T.uebung(5, "Übung 5: Miktionsversuch, Komplikationen, Entfernung",
         "<strong>So geht's:</strong> 8 Aussagen (richtig oder falsch) und 4 Fragen zu Fällen. "
         "Den Baustein bekommen Sie nur, wenn <strong>alle Aufgaben richtig</strong> sind.", U5,
         "Lesen Sie Abschnitt 5 noch einmal. Ändern Sie dann die rot markierten Antworten.")

# ---------------------------------------------------------------- Abschluss
POOL = [
    {"type": "mc", "q": "Wo liegt die Einstichstelle eines SPK?", "options": ["Etwa 2 Querfinger über dem Schambein", "Am Nabel", "In der Leiste", "Am Rücken über der Niere"], "correct": 0, "explain": "Suprapubisch = über dem Schambein, in der Mitte."},
    {"type": "mc", "q": "Was ist ein Vorteil des SPK gegenüber dem DK?", "options": ["Die Harnröhre wird nicht verletzt und ein Miktionsversuch ist möglich.", "Man braucht keinen Urinbeutel.", "Er wird nie gewechselt.", "Pflegende dürfen ihn selbst legen."], "correct": 0, "explain": "Weitere Vorteile: geringeres Infektionsrisiko, angenehmer für viele Menschen."},
    {"type": "mc", "q": "Was ist ein Nachteil des SPK?", "options": ["Die Anlage ist eine Punktion mit Risiken wie Blutung oder Darmverletzung.", "Er verletzt die Harnröhre.", "Er kann nur bei Frauen gelegt werden.", "Man kann damit nicht duschen."], "correct": 0, "explain": "Deshalb gibt es Kontraindikationen und eine sorgfältige Vorbereitung."},
    {"type": "mc", "q": "Welche Voraussetzung ist für die Punktion am wichtigsten?", "options": ["Die Blase ist gut gefüllt.", "Der Patient ist nüchtern seit 2 Tagen.", "Die Blase ist ganz leer.", "Der Patient sitzt."], "correct": 0, "explain": "Die volle Blase schiebt Bauchfell und Darm nach oben."},
    {"type": "mc", "q": "Welcher Patient sollte <b>keinen</b> SPK bekommen?", "options": ["Ein Patient mit bekanntem Blasentumor", "Ein Patient mit Harnröhrenverletzung", "Eine Patientin, deren Urin für Wochen abgeleitet werden muss", "Ein Patient mit akuter Prostataentzündung und Harnverhalt"], "correct": 0, "explain": "Blasentumor ist eine Kontraindikation."},
    {"type": "mc", "q": "Wie desinfizieren Sie die Einstichstelle beim Verbandswechsel?", "options": ["Kreisförmig von innen nach außen", "Kreisförmig von außen nach innen", "Von oben nach unten mit einem Tupfer", "Gar nicht, nur trocken tupfen"], "correct": 0, "explain": "Von der Einstichstelle weg – so gelangen keine Keime hinein."},
    {"type": "mc", "q": "Wie wird der SPK nach dem Verbandswechsel fixiert?", "options": ["In einer kleinen Schlaufe, zugfrei und nicht abgeknickt", "Straff ohne Schlaufe", "Gar nicht", "Mit einem Knoten im Schlauch"], "correct": 0, "explain": "Zug reizt die Einstichstelle und kann den Katheter herausziehen."},
    {"type": "mc", "q": "Was beobachten Sie an der Einstichstelle?", "options": ["Rötung, Schwellung, Sekret, Urinaustritt, Schmerzen", "Nur die Farbe des Pflasters", "Die Haarfarbe", "Nichts – nur der Urin ist wichtig"], "correct": 0, "explain": "Das sind Zeichen für Infektion oder Probleme mit dem Katheter."},
    {"type": "mc", "q": "Was messen Sie beim Miktionsversuch?", "options": ["Die Menge des Spontanurins und den Restharn über den SPK", "Nur den Blutdruck", "Nur das Gewicht", "Die Länge des Katheters"], "correct": 0, "explain": "Restharn = Urin, der nach dem Wasserlassen noch in der Blase ist."},
    {"type": "mc", "q": "Der SPK ist herausgerutscht. Warum müssen Sie schnell handeln?", "options": ["Der Kanal (Fistel) kann sich in wenigen Stunden verschließen.", "Der Urinbeutel läuft über.", "Die Haut wird kalt.", "Es ist nicht eilig."], "correct": 0, "explain": "Einstichstelle steril abdecken, sofort Ärztin/Arzt informieren."},
    {"type": "mc", "q": "Was ist beim Katheterwechsel besonders wichtig?", "options": ["Den neuen Katheter sofort nach dem Ziehen einführen", "Zwischen Ziehen und Einführen eine Pause machen", "Den Ballon mit NaCl blocken", "Den alten Katheter aufheben und wiederverwenden"], "correct": 0, "explain": "Der Kanal zieht sich schnell zusammen."},
    {"type": "mc", "q": "Woran erkennen Sie eine mögliche Darmverletzung nach der Anlage?", "options": ["Harter, sehr schmerzhafter Bauch und Fieber", "Leicht rötlicher Urin in den ersten Stunden", "Durst", "Müdigkeit am Abend"], "correct": 0, "explain": "Warnzeichen einer Bauchfellentzündung: sofort Ärztin/Arzt informieren."},
    {"type": "tf", "q": "Einen SPK legt immer die Ärztin oder der Arzt.", "correct": True, "explain": "Die Anlage ist eine Punktion – eine ärztliche Aufgabe."},
    {"type": "tf", "q": "Vor der Anlage wird der Unterbauch mit einer Klinge rasiert.", "correct": False, "explain": "Haare werden gekürzt (z. B. mit einem Clipper). Rasieren verletzt die Haut und erhöht das Infektionsrisiko."},
    {"type": "tf", "q": "Leicht blutiger Urin in den ersten Stunden nach der Anlage kann normal sein.", "correct": True, "explain": "Beobachten. Wird es stärker oder kommen Gerinnsel: Ärztin/Arzt informieren."},
    {"type": "tf", "q": "Beim SPK ist ein Miktionsversuch mit Abklemmen nach Anordnung möglich.", "correct": True, "explain": "Die Harnröhre ist frei – die Person kann selbst Wasser lassen."},
    {"type": "tf", "q": "Auch beim SPK hängt der Urinbeutel unter Blasenniveau.", "correct": True, "explain": "Das gilt für jede Harnableitung (ILS 1)."},
    {"type": "tf", "q": "Ein Katheterventil darf ohne ärztliche Anordnung verwendet werden.", "correct": False, "explain": "Nur nach ärztlicher Anordnung."},
    {"type": "tf", "q": "Nach dem Entfernen des SPK wird die Einstichstelle steril abgedeckt.", "correct": True, "explain": "Sie verschließt sich meist innerhalb von 1–2 Tagen."},
    {"type": "tf", "q": "Bei Schmerzen während des Miktionsversuchs wird die Klemme geöffnet.", "correct": True, "explain": "Dann Ärztin/Arzt informieren und dokumentieren."},
]
T.ende(POOL)
T.lehrkraft()
T.uebersicht([
    ("1/", "Übung 1: SPK – Grundlagen und Vergleich"),
    ("2/", "Übung 2: Ist ein SPK sinnvoll?"),
    ("3/", "Übung 3: Assistenz bei der Anlage"),
    ("4/", "Übung 4: Verbandswechsel und Pflege"),
    ("5/", "Übung 5: Miktionsversuch, Komplikationen, Entfernung"),
    ("ende/", "Abschluss: Quiz und persönliche ID"),
])
startseite()

print("SPK-Seiten erzeugt. Lehrkraft-Schlüssel:", "-".join(T.bausteine))
