"""Prüft, ob man richtige Antworten an ihrer Länge erkennen kann („die längste ist richtig“).

Aufruf: python3 tools/laengen_check.py [drainage|me] [-v]
Regeln (gleich im Inhaltstest tests/inhalt.test.js):
  · Einzelaufgabe (Auswahl, Begründung, Gesprächsschritt): die richtige Antwort ist höchstens 20 % länger
    als die längste falsche.
  · Je ILS-Auftrag: die richtige Antwort ist in höchstens 40 % der Fälle die längste
    und in höchstens 40 % der Fälle die kürzeste (sonst entsteht das umgekehrte Muster).
  · Mehrfachauswahl: richtige Antworten im Mittel höchstens 30 % länger als die falschen.
"""
import importlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
FAKTOR, ANTEIL, MEHRFACH = 1.2, 0.40, 1.3
POOLS = ["UEBUNG1", "UEBUNG2", "UEBUNG3", "UEBUNG4", "UEBUNG5", "ABSCHLUSS"]


def ohne(s):
    s = re.sub(r"<[^>]+>", " ", str(s)).replace("(⚑)", "").replace("⚑", "")
    return re.sub(r"\s+", " ", s).strip()


def faelle(modul):
    for pool in POOLS:
        for i, a in enumerate(getattr(modul, pool), 1):
            ort = f"{pool} #{i}"
            if a["typ"] == "wahl":
                yield ort, "wahl", ohne(a["frage"]), [ohne(o) for o in a["optionen"]], [a["richtig"]]
            elif a["typ"] == "rf" and a.get("begruendung"):
                b = a["begruendung"]
                yield ort, "begründung", ohne(a["aussage"]), [ohne(o) for o in b["optionen"]], [b["richtig"]]
            elif a["typ"] == "dialog":
                for j, k in enumerate(a["knoten"], 1):
                    yield (f"{ort} Schritt {j}", "dialog", ohne(k.get("frage") or k.get("text") or ""),
                           [ohne(o["t"]) for o in k["optionen"]], [n for n, o in enumerate(k["optionen"]) if o.get("richtig")])
            elif a["typ"] == "mehrfach":
                yield ort, "mehrfach", ohne(a["frage"]), [ohne(o) for o in a["optionen"]], list(a["richtig"])


def pruefen(name, ausgabe=True, ausfuehrlich=False):
    modul = importlib.import_module(f"{name}_inhalt")
    fehler, laengste, kuerzeste, n = [], 0, 0, 0
    for ort, typ, frage, opt, richtig in faelle(modul):
        L = [len(o) for o in opt]
        if typ == "mehrfach":
            r = sum(L[i] for i in richtig) / len(richtig)
            f = [L[i] for i in range(len(L)) if i not in richtig]
            if f and r > MEHRFACH * (sum(f) / len(f)):
                fehler.append((ort, typ, frage, opt, richtig, f"richtige im Mittel {r / (sum(f) / len(f)):.2f}× so lang"))
            continue
        n += 1
        ri = richtig[0]
        andere = [L[i] for i in range(len(L)) if i != ri]
        if L[ri] > max(andere):
            laengste += 1
        if L[ri] < min(andere):
            kuerzeste += 1
        if L[ri] > FAKTOR * max(andere):
            fehler.append((ort, typ, frage, opt, richtig, f"richtige {L[ri] / max(andere):.2f}× so lang wie die längste falsche"))
    ok = not fehler and laengste <= ANTEIL * n and kuerzeste <= ANTEIL * n
    if ausgabe:
        print(f"{name}: {n} Fälle · richtige = längste: {laengste} ({100 * laengste / n:.0f} %) · richtige = kürzeste: "
              f"{kuerzeste} ({100 * kuerzeste / n:.0f} %) · auffällige Einzelaufgaben: {len(fehler)}")
        for ort, typ, frage, opt, richtig, grund in fehler:
            print(f"  ✗ {ort} ({typ}): {grund}")
            if ausfuehrlich:
                print(f"      Frage: {frage}")
                for i, o in enumerate(opt):
                    print(f"      {'✓' if i in richtig else '·'} [{len(o):3}] {o}")
    return ok


if __name__ == "__main__":
    namen = [x for x in sys.argv[1:] if not x.startswith("-")] or ["drainage", "me"]
    alle = [pruefen(n, ausfuehrlich="-v" in sys.argv) for n in namen]
    sys.exit(0 if all(alle) else 1)
