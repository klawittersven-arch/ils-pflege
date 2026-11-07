"""Erzeugt die Smartphone-Seiten des ILS-Auftrags „Wunddrainagen“ (drainage/…).

Aufruf: python3 tools/grafiken_drainage.py && python3 tools/drainage_bau.py <version>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seite_lern import seite  # noqa: E402
from challenge_bau import challenge_seite  # noqa: E402
import drainage_inhalt as I  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
V = sys.argv[1] if len(sys.argv) > 1 else "1"
HOT = json.loads((ROOT / "tools/build_drainage/hotspots.json").read_text(encoding="utf-8"))
KICKER = "ILS Wunddrainagen"


def pool_js(pool):
    """Pool als JS; '@redon' / '@robinson' werden durch die SVGs ersetzt, Bild-Aufgaben bekommen alle Namen."""
    out = []
    for a in pool:
        a = dict(a)
        if a.get("svg", "").startswith("@"):
            schl = a["svg"][1:]
            a["svg"] = HOT[schl]
            if schl == "redon":
                a.setdefault("namen", I.NAMEN_REDON)
        out.append(a)
    # (⚑) markiert im Quelltext Stellen, die nicht aus Pflegias stammen – für die SuS unsichtbar
    return json.dumps(out, ensure_ascii=False, indent=1).replace(" (⚑)", "").replace("(⚑)", "")


def uebung(nr, titel, pool, schreiben, ziehen, **extra):
    cfg = {
        "mount": "#app", "ils": "drainage", "schritt": str(nr),
        "abschnitt": I.ABSCHNITT[nr], "ziehen": ziehen,
        **extra,
    }
    js = "const POOL = " + pool_js(pool) + ";\n"
    js += ("const SCHREIBEN = " + json.dumps(schreiben, ensure_ascii=False).replace(" (⚑)", "") + ";\n") if schreiben else ""
    js += "ILSLern.uebung(Object.assign(" + json.dumps(cfg, ensure_ascii=False) + ", { pool: POOL" + (", schreiben: SCHREIBEN" if schreiben else "") + " }));"
    pfad = ROOT / f"drainage/{nr}"
    pfad.mkdir(parents=True, exist_ok=True)
    seite(pfad / "index.html", titel, f"{KICKER} · Übung {nr} von 5", js, "../../", V)


def main():
    (ROOT / "drainage").mkdir(exist_ok=True)
    seite(ROOT / "drainage/index.html", "ILS-Auftrag: Wunddrainagen", "Karoline-Breitinger-Schule · 3BFP2 · Redon- und Robinson-Drainage",
          "ILSKonto.uebersicht({ mount: '#app', ils: 'drainage' });", "../", V)
    uebung(1, "Übung 1: Wozu Wunddrainagen?", I.UEBUNG1, I.SCHREIBEN1, 7)
    uebung(2, "Übung 2: Beobachten und dokumentieren", I.UEBUNG2, I.SCHREIBEN2, 8)
    uebung(3, "Übung 3: Komplikationen erkennen", I.UEBUNG3, I.SCHREIBEN3, 6)
    uebung(4, "Übung 4: Umgang, Hygiene und Recht", I.UEBUNG4, I.SCHREIBEN4, 7)
    uebung(5, "Übung 5: Examens-Training Pflegeprozess", I.UEBUNG5, I.SCHREIBEN5, 6)
    # Abschlussquiz
    cfg = {"mount": "#app", "ils": "drainage", "schritt": "quiz", "abschluss": True,
           "abschnitt": "alle Abschnitte des Arbeitsblatts", "ziehen": 10, "fehlerMax": 2, "pauseSek": 180,
           "intro": "Neuer Fall: <strong>Herr Yilmaz</strong> (58) hat nach einer Gallenblasen-OP eine <strong>Robinson-Drainage</strong>. "
                    "Dazu kommen Fragen zu allen Abschnitten. Sie dürfen höchstens 2 Fehler machen."}
    js = "const POOL = " + pool_js(I.ABSCHLUSS) + ";\nILSLern.uebung(Object.assign(" + json.dumps(cfg, ensure_ascii=False) + ", { pool: POOL }));"
    (ROOT / "drainage/abschluss").mkdir(exist_ok=True)
    seite(ROOT / "drainage/abschluss/index.html", "Abschlussquiz Wunddrainagen", f"{KICKER} · Abschluss", js, "../../", V)
    challenge_seite(ROOT, "drainage", "Wunddrainagen", KICKER, [
        (I.ABSCHNITT[1], I.UEBUNG1, 3), (I.ABSCHNITT[2], I.UEBUNG2, 3), (I.ABSCHNITT[3], I.UEBUNG3, 3),
        (I.ABSCHNITT[4], I.UEBUNG4, 3), (I.ABSCHNITT[5], I.UEBUNG5, 3), ("Abschlussquiz", I.ABSCHLUSS, 5)], V, pool_js)
    print("Seiten erzeugt.")


if __name__ == "__main__":
    main()
