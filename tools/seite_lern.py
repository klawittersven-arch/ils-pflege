"""Erzeugt den HTML-Rahmen einer Seite im Lernmodus (Kopf, Skripte). Der Inhalt steht in <script>."""
import sys

VORLAGE = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{titel}</title>
<link rel="stylesheet" href="{wurzel}assets/ils.css?v={v}">
</head>
<body>
<header class="top"><div class="wrap"><div class="kicker">{kicker}</div><h1>{titel}</h1></div></header>
<main>
<div id="app"></div>
<footer>Karoline-Breitinger-Schule · ILS-Auftrag · 3BFP2</footer>
</main>
<script src="{wurzel}assets/ils.js?v={v}"></script>
<script src="{wurzel}assets/ils-server.js?v={v}"></script>
<script src="{wurzel}assets/auftraege.js?v={v}"></script>
<script src="{wurzel}assets/ils-konto.js?v={v}"></script>
<script src="{wurzel}assets/ils-lern.js?v={v}"></script>
{skripte}<script>
{inhalt}
</script>
</body>
</html>
"""


def seite(pfad, titel, kicker, inhalt, wurzel, v, skripte=()):
    extra = "".join(f'<script src="{s}?v={v}"></script>\n' for s in skripte)
    with open(pfad, "w", encoding="utf-8") as f:
        f.write(VORLAGE.format(titel=titel, kicker=kicker, inhalt=inhalt.strip(), wurzel=wurzel, v=v, skripte=extra))


if __name__ == "__main__":
    print(__doc__, file=sys.stderr)
