"""Erzeugt die Seite der ILS-Challenge eines Auftrags (Highscore-Spiel nach dem Abschlussquiz).

Aus jeder Übung werden 3 Aufgaben gezogen, aus dem Abschlussquiz 5 – zusammen 20.
Aufgaben, die das Arbeitsblatt brauchen (Protokoll, Anordnung auf Seite 1), sind ausgenommen.
"""
import json
import re

from seite_lern import seite

NUR_MIT_PAPIER = re.compile(r"Arbeitsblatt|Seite 1|\(Seite|Fallsituation")


def challenge_seite(root, ils, titel, kicker, pools, v, pool_js):
    """pools: Liste von (Name, Aufgaben, Anzahl). pool_js: Funktion, die eine Aufgabenliste als JS-Text liefert."""
    teile = []
    for name, aufgaben, anzahl in pools:
        nutzbar = [a for a in aufgaben if not NUR_MIT_PAPIER.search(a.get("frage", "") + a.get("aussage", ""))]
        # Gruppen je Pool eindeutig machen
        nutzbar = [dict(a, gruppe=f"{name}:{a['gruppe']}") if a.get("gruppe") else a for a in nutzbar]
        teile.append("{ name: " + json.dumps(name, ensure_ascii=False) + f", ziehen: {anzahl}, aufgaben: " + pool_js(nutzbar) + " }")
    js = ("const POOLS = [\n" + ",\n".join(teile) + "\n];\n"
          f"ILSChallenge.start({{ mount: '#app', ils: '{ils}', pools: POOLS }});")
    ziel = root / ils / "challenge"
    ziel.mkdir(parents=True, exist_ok=True)
    seite(ziel / "index.html", f"ILS-Challenge: {titel}", f"{kicker} · Highscore", js, "../../", v, skripte=["../../assets/ils-challenge.js"])
