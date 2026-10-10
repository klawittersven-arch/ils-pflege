"""Erzeugt die Musterlösung zu allen Übungen eines ILS-Auftrags als .docx.

Die Aufgaben werden direkt aus den veröffentlichten Übungsseiten gelesen – die Musterlösung
passt dadurch immer zum aktuellen Stand der Webseiten.

Aufruf: python3 tools/loesung.py <dk|spk> <vorlage.docx> <ausgabe.docx>
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_bau import Doc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
THEMEN = {
    "dk": {"titel": "Transurethraler Dauerkatheter (DK)", "header": {}, "bild1": "katheter-beschriftet.png",
           "video": "Video „Katheterisierung mit Dauerkatheter: Mann“ – Beobachtungsauftrag ohne Bewertung."},
    "spk": {"titel": "Suprapubischer Katheter (SPK) – Cystofix",
            "header": {"> (DK)</w:t>": "> (SPK)</w:t>", "> Dauerkatheter</w:t>": "> Cystofix</w:t>"}, "bild1": None, "video": None},
}


def md(html):
    """HTML aus den Übungsseiten in die einfache **fett**-Schreibweise des Dokument-Bausteins umwandeln."""
    t = re.sub(r"</?(b|strong)>", "**", html)
    t = re.sub(r"<[^>]+>", "", t)
    return t.replace("&nbsp;", " ").strip()


def lade(slug, nr):
    html = (ROOT / slug / str(nr) / "index.html").read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", html).group(1)
    intro = json.loads(re.search(r"intro: (\".*?\"),\n", html).group(1))
    qs = json.loads(re.search(r"questions: (\[[\s\S]*?\n\])\n", html).group(1))
    return title, md(intro), qs


def pool(slug):
    html = (ROOT / slug / "ende" / "index.html").read_text(encoding="utf-8")
    return json.loads(re.search(r"const POOL = (\[.*?\]);\n", html).group(1))


def antwort(q):
    if q["type"] in ("mc", "select"):
        return md(q["options"][q["correct"]])
    if q["type"] == "tf":
        return "Richtig" if q["correct"] else "Falsch"
    return ""


def build(slug, template, out):
    cfg = THEMEN[slug]
    d = Doc(template, ROOT / f"tools/build_loesung_{slug}")
    d.header_replace = cfg["header"]
    d.h1(f"Musterlösung: {cfg['titel']}")
    d.box(d.p_xml("Musterlösung zu allen Übungen hinter den QR-Codes und zum Abschlussquiz. Die Reihenfolge der Antwortmöglichkeiten "
                  "wird auf den Übungsseiten bei jedem Aufruf gemischt – maßgeblich ist der Text der Antwort, nicht ihre Position.", size=10))
    widths = [500, 3900, 2300, 2360]

    for nr in range(1, 6):
        title, intro, qs = lade(slug, nr)
        d.h2(title, page_break=nr > 1, before=0 if nr > 1 else 200)
        d.p(intro, size=10, color="404040", after=80)
        section = None
        rows = []

        def flush():
            if rows:
                d.table(["Nr.", "Aufgabe", "Richtige Antwort", "Erklärung"], list(rows), widths, size=9)
                rows.clear()

        for i, q in enumerate(qs, 1):
            if q.get("section") and q["section"] != section:
                flush()
                section = q["section"]
                d.h3(section)
            if q["type"] in ("mc", "select", "tf"):
                if q["type"] == "select" and i == 1 and slug == "dk" and cfg["bild1"]:
                    d.image(ROOT / "tools/png" / cfg["bild1"], 13, "Lösung zur Beschriftung (Aufgaben 1–5)")
                rows.append([str(i), md(q["q"]), f"**{antwort(q)}**", md(q.get("explain", ""))])
            elif q["type"] == "order":
                flush()
                d.p(f"**Aufgabe {i}:** {md(q['q'])}", size=10, after=40, keep=True)
                d.steps([md(t) for t in q["items"]], after_last=40)
                if q.get("explain"):
                    d.p(md(q["explain"]), size=9.5, italic=True, color="404040", after=80)
            elif q["type"] == "errors":
                flush()
                d.p(f"**Aufgabe {i}:** {md(q['q'])}", size=10, after=40, keep=True)
                n = sum(1 for s in q["sentences"] if s["wrong"])
                srows = [[str(k), md(s["t"]), "**✗ Fehler**" if s["wrong"] else "✓ richtig", md(s.get("explain", "")) if s["wrong"] else ""]
                         for k, s in enumerate(q["sentences"], 1)]
                d.table(["Satz", "Text", "Bewertung", "Begründung"], srows, [600, 4300, 1300, 2860], size=9)
                d.p(f"Insgesamt {n} Fehler.", size=9.5, italic=True, color="404040", after=80)
        flush()
        if nr == 3 and slug == "dk" and cfg["video"]:
            d.h2("Video-Seite", before=200)
            d.p(cfg["video"], size=10)

    d.h2("Abschlussquiz (Pool – je Versuch werden 10 Fragen zufällig gezogen, bestanden ab 8)", page_break=True, before=0)
    rows = [[str(i), md(q["q"]), f"**{antwort(q)}**", md(q.get("explain", ""))] for i, q in enumerate(pool(slug), 1)]
    d.table(["Nr.", "Frage", "Richtige Antwort", "Erklärung"], rows, widths, size=9)
    return d.save(out, footer_text=f"Musterlösung ILS {slug.upper()}")


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2], sys.argv[3]))
