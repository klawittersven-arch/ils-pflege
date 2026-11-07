"""Probe-Auftrag im Lernmodus: zeigt alle Aufgabentypen (zum Testen der Technik)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from seite_lern import seite  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
V = sys.argv[1] if len(sys.argv) > 1 else "1"

seite(ROOT / "probe/index.html", "Probe-Auftrag", "ILS mit Anmeldung · zum Testen",
      "ILSKonto.uebersicht({ mount: '#app', ils: 'probe' });", "../", V)

seite(ROOT / "probe/1/index.html", "Übung 1: Erste Probe", "Probe-Auftrag · Übung 1 von 2", r"""
ILSLern.uebung({
  mount: '#app', ils: 'probe', schritt: '1',
  abschnitt: 'Probe-Abschnitt 1 (nur zum Testen)',
  ziehen: 5,
  pool: [
    { typ: 'wahl', frage: 'Welche Drainage arbeitet mit Sog?', optionen: ['Redon-Drainage', 'Robinson-Drainage', 'Easy-Flow-Drainage'], richtig: 0,
      erklaerung: 'Die Redon-Drainage hängt an einer Vakuumflasche (aktive Drainage).' },
    { typ: 'rf', frage: 'Stimmt diese Aussage?', aussage: 'Wenn der Vakuumindikator entfaltet ist, muss die Redonflasche gewechselt werden.', richtig: true,
      begruendung: { optionen: ['Dann ist kein ausreichender Sog mehr vorhanden.', 'Dann ist die Flasche zu leicht.', 'Dann ist die Drainage verstopft.'], richtig: 0 },
      erklaerung: 'Der Indikator zeigt, ob noch genug Vakuum da ist.' },
    { typ: 'mehrfach', frage: 'Welche Angaben gehören in die Dokumentation eines Flaschenwechsels?', optionen: ['Uhrzeit', 'Fördermenge der entfernten Flasche', 'Lieblingsessen'], richtig: [0, 1],
      erklaerung: 'Dokumentiert werden der Wechsel und die Fördermenge der entfernten Flasche.' },
    { typ: 'zahl', frage: 'Um 8 Uhr stand die Skala bei 120 ml, um 14 Uhr bei 270 ml. Wie viel ml hat die Drainage in dieser Zeit gefördert?', richtig: 150, einheit: 'ml',
      erklaerung: '270 ml − 120 ml = 150 ml.' },
    { typ: 'luecke', frage: 'Ergänzen Sie den Merksatz.', text: 'Die Redon-Drainage ist eine {{aktive}} Drainage, die Robinson-Drainage eine {{passive}}.', extra: ['offene'],
      erklaerung: 'Aktiv = mit Sog, passiv = Schwerkraft oder Kapillarwirkung.' }
  ]
});
""", "../../", V)

SVG = """<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Probe-Bild">
<rect x="20" y="40" width="80" height="120" rx="10" fill="#e8eef5" stroke="#555"/><text x="60" y="105" text-anchor="middle" font-size="14">Flasche</text>
<circle cx="200" cy="70" r="30" fill="#f6e6dc" stroke="#555"/><text x="200" y="75" text-anchor="middle" font-size="14">Anzeige</text>
<rect x="160" y="130" width="110" height="40" fill="#eee" stroke="#555"/><text x="215" y="155" text-anchor="middle" font-size="14">Klemme</text>
<g data-ziel="flasche"><rect class="feld" x="15" y="35" width="90" height="130"/></g>
<g data-ziel="anzeige"><circle class="feld" cx="200" cy="70" r="36"/></g>
<g data-ziel="klemme"><rect class="feld" x="155" y="125" width="120" height="50"/></g>
</svg>"""

seite(ROOT / "probe/2/index.html", "Übung 2: Zweite Probe", "Probe-Auftrag · Übung 2 von 2", r"""
ILSLern.uebung({
  mount: '#app', ils: 'probe', schritt: '2',
  abschnitt: 'Probe-Abschnitt 2 (nur zum Testen)',
  ziehen: 4,
  pool: [
    { typ: 'reihe', frage: 'Bringen Sie die Schritte in die richtige Reihenfolge.', schritte: ['Anmelden', 'Infotext lesen', 'Übung lösen', 'Abschlussquiz machen'], erklaerung: 'Genau so.' },
    { typ: 'sortieren', frage: 'Ordnen Sie zu: aktive oder passive Drainage?', kategorien: ['aktiv (Sog)', 'passiv'],
      elemente: [{ t: 'Redon', k: 0 }, { t: 'Robinson', k: 1, warum: 'Die Robinson leitet ohne Sog ab.' }, { t: 'Easy-Flow', k: 1 }], erklaerung: 'Nur die Redon arbeitet mit Sog.' },
    { typ: 'bild', frage: 'Tippen Sie im Bild auf die gesuchten Teile.', svg: __SVG__,
      ziele: [{ id: 'anzeige', frage: 'Tippen Sie auf die <b>Anzeige</b>.', name: 'die Anzeige' }, { id: 'klemme', frage: 'Tippen Sie auf die <b>Klemme</b>.', name: 'die Klemme' }],
      erklaerung: 'Gut gefunden.' },
    { typ: 'dialog', stil: 'chat', frage: 'Gespräch üben', knoten: [
      { sprecher: 'Frau K.', text: 'Muss ich die Flasche beim Laufen in der Hand tragen?', frage: 'Was antworten Sie?', optionen: [
        { t: 'Nein, wir befestigen sie sicher, damit der Schlauch nicht abknickt.', richtig: true, rueck: 'Sicher fixieren, nicht abknicken.' },
        { t: 'Ja, halten Sie sie am Schlauch.', richtig: false, rueck: 'Am Schlauch zu ziehen kann die Drainage herausziehen.' }] },
      { sprecher: 'Frau K.', text: 'Und wenn mir etwas komisch vorkommt?', frage: 'Was antworten Sie?', optionen: [
        { t: 'Dann klingeln Sie bitte sofort.', richtig: true, rueck: 'Klingel in Reichweite.' },
        { t: 'Dann warten Sie bis zur Visite.', richtig: false, rueck: 'Veränderungen sollen sofort gemeldet werden.' }] }
    ], erklaerung: 'So informieren Sie verständlich.' }
  ],
  schreiben: { auftrag: '<strong>Nennen Sie</strong> 3 Dinge, die Sie bei einer Redon-Drainage beobachten.', ort: 'auf ein Blatt Papier', minSek: 20,
    punkte: ['Fördermenge', 'Vakuumindikator / Sog', 'Durchgängigkeit (nicht abgeknickt)', 'Austrittsstelle'] }
});
""".replace("__SVG__", repr(SVG)), "../../", V)

seite(ROOT / "probe/abschluss/index.html", "Abschlussquiz", "Probe-Auftrag · Abschluss", r"""
ILSLern.uebung({
  mount: '#app', ils: 'probe', schritt: 'quiz', abschluss: true,
  abschnitt: 'alle Probe-Abschnitte',
  ziehen: 4, fehlerMax: 1, pauseSek: 180,
  pool: [
    { typ: 'rf', aussage: 'Die Lehrkraft sieht, welche Übungen Sie erledigt haben.', richtig: true, erklaerung: 'Ja – auf ihrer Übersichtsseite.' },
    { typ: 'rf', aussage: 'Ihre einzelnen Antworten werden an die Lehrkraft geschickt.', richtig: false, erklaerung: 'Nein – nur, ob Sie die Übung geschafft haben.' },
    { typ: 'rf', aussage: 'Ohne Internet geht Ihr Ergebnis verloren.', richtig: false, erklaerung: 'Nein – es wird später automatisch nachgereicht.' },
    { typ: 'rf', aussage: 'Sie müssen sich auf jedem Gerät einmal anmelden.', richtig: true, erklaerung: 'Ja – mit Klasse, Vorname und Geburtstag.' },
    { typ: 'rf', aussage: 'Wer zu schnell tippt, muss die Übung neu starten.', richtig: true, erklaerung: 'Nach drei Warnungen.' }
  ]
});
""", "../../", V)
