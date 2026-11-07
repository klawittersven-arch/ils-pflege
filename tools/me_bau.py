"""Erzeugt die Smartphone-Seiten des ILS-Auftrags „Materialentfernung und pflegerische Nachsorge“ (me/…).

Aufruf: python3 tools/grafiken_me.py && python3 tools/me_bau.py <version>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seite_lern import seite  # noqa: E402
from challenge_bau import challenge_seite  # noqa: E402
import me_inhalt as I  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
V = sys.argv[1] if len(sys.argv) > 1 else "1"
HOT = json.loads((ROOT / "tools/build_me/hotspots.json").read_text(encoding="utf-8"))
KICKER = "ILS Materialentfernung"


def pool_js(pool):
    """Pool als JS; '@osteo' / '@fuss' werden durch die SVGs ersetzt, Bild-Aufgaben bekommen alle Namen."""
    out = []
    for a in pool:
        a = dict(a)
        if a.get("svg", "").startswith("@"):
            schl = a["svg"][1:]
            a["svg"] = HOT[schl]
            a.setdefault("namen", {"osteo": I.NAMEN_OSTEO, "fuss": I.NAMEN_FUSS}[schl])
        out.append(a)
    # (⚑) markiert im Quelltext Stellen, die nicht aus Pflegias stammen – für die SuS unsichtbar
    return json.dumps(out, ensure_ascii=False, indent=1).replace(" (⚑)", "").replace("(⚑)", "")


def uebung(nr, titel, pool, schreiben, ziehen, **extra):
    cfg = {
        "mount": "#app", "ils": "me", "schritt": str(nr),
        "abschnitt": I.ABSCHNITT[nr], "ziehen": ziehen,
        **extra,
    }
    js = "const POOL = " + pool_js(pool) + ";\n"
    js += ("const SCHREIBEN = " + json.dumps(schreiben, ensure_ascii=False).replace(" (⚑)", "") + ";\n") if schreiben else ""
    js += "ILSLern.uebung(Object.assign(" + json.dumps(cfg, ensure_ascii=False) + ", { pool: POOL" + (", schreiben: SCHREIBEN" if schreiben else "") + " }));"
    pfad = ROOT / f"me/{nr}"
    pfad.mkdir(parents=True, exist_ok=True)
    seite(pfad / "index.html", titel, f"{KICKER} · Übung {nr} von 5", js, "../../", V)


def main():
    (ROOT / "me").mkdir(exist_ok=True)
    seite(ROOT / "me/index.html", "ILS-Auftrag: Materialentfernung", "Karoline-Breitinger-Schule · 3BFP2 · Materialentfernung und pflegerische Nachsorge",
          "ILSKonto.uebersicht({ mount: '#app', ils: 'me' });", "../", V)
    uebung(1, "Übung 1: Osteosynthese und Materialentfernung", I.UEBUNG1, I.SCHREIBEN1, 7)
    uebung(2, "Übung 2: Nach der OP überwachen", I.UEBUNG2, I.SCHREIBEN2, 7)
    uebung(3, "Übung 3: Komplikationen erkennen", I.UEBUNG3, I.SCHREIBEN3, 6)
    uebung(4, "Übung 4: Schmerz und Mobilisation", I.UEBUNG4, I.SCHREIBEN4, 7)
    uebung(5, "Übung 5: Information, Schulung und Entlassung", I.UEBUNG5, I.SCHREIBEN5, 6)
    cfg = {"mount": "#app", "ils": "me", "schritt": "quiz", "abschluss": True,
           "abschnitt": "alle Abschnitte des Arbeitsblatts", "ziehen": 10, "fehlerMax": 2, "pauseSek": 180,
           "intro": "Neuer Fall: <strong>Frau Schäfer</strong> (52) wurde eine Platte am rechten <strong>Unterarm</strong> entfernt. "
                    "Dazu kommen Fragen zu allen Abschnitten. Sie dürfen höchstens 2 Fehler machen."}
    js = "const POOL = " + pool_js(I.ABSCHLUSS) + ";\nILSLern.uebung(Object.assign(" + json.dumps(cfg, ensure_ascii=False) + ", { pool: POOL }));"
    (ROOT / "me/abschluss").mkdir(exist_ok=True)
    seite(ROOT / "me/abschluss/index.html", "Abschlussquiz Materialentfernung", f"{KICKER} · Abschluss", js, "../../", V)
    challenge_seite(ROOT, "me", "Materialentfernung", KICKER, [
        (I.ABSCHNITT[1], I.UEBUNG1, 3), (I.ABSCHNITT[2], I.UEBUNG2, 3), (I.ABSCHNITT[3], I.UEBUNG3, 3),
        (I.ABSCHNITT[4], I.UEBUNG4, 3), (I.ABSCHNITT[5], I.UEBUNG5, 3), ("Abschlussquiz", I.ABSCHLUSS, 5)], V, pool_js)
    print("Seiten erzeugt.")


if __name__ == "__main__":
    main()
