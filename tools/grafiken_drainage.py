"""Grafiken für den ILS-Auftrag „Wunddrainagen“ (SVG).

Erzeugt in drainage/img/:
  redon-system.svg      beschriftet (Arbeitsblatt)
  vakuumindikator.svg   zusammengezogen / entfaltet (Arbeitsblatt)
  robinson.svg          beschriftet (Arbeitsblatt)
und tools/build_drainage/hotspots.json mit unbeschrifteten Varianten (Bild antippen am Handy).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "drainage/img"
BUILD = ROOT / "tools/build_drainage"

HAUT, GEWEBE, SCHLAUCH, SEKRET, LINIE = "#f1c9ad", "#fbe6d6", "#7fa7bf", "#c96a5a", "#4a4a4a"
SCHRIFT = "font-family='Arial, Helvetica, sans-serif'"


def klemme(x, y, farbe="#3d6fb6"):
    return (f"<g transform='translate({x},{y})'><rect x='-14' y='-9' width='28' height='18' rx='4' fill='{farbe}' stroke='{LINIE}'/>"
            f"<rect x='-10' y='-3' width='20' height='6' rx='2' fill='#ffffff' opacity='.55'/></g>")


def badge(nr, x, y):
    return (f"<circle cx='{x}' cy='{y}' r='11' fill='#b4572a' stroke='#fff' stroke-width='2'/>"
            f"<text x='{x}' y='{y + 4.5}' font-size='12' font-weight='bold' fill='#fff' text-anchor='middle'>{nr}</text>")


def legende(eintraege, y0, spalten=3, breite=640):
    out = [f"<line x1='20' y1='{y0 - 14}' x2='{breite - 20}' y2='{y0 - 14}' stroke='#ddd'/>"]
    proz = (breite - 40) / spalten
    for k, (nr, text) in enumerate(eintraege):
        x = 20 + (k % spalten) * proz
        y = y0 + (k // spalten) * 22
        out.append(f"<circle cx='{x + 9}' cy='{y}' r='9' fill='#b4572a'/><text x='{x + 9}' y='{y + 4}' font-size='10.5' font-weight='bold' fill='#fff' text-anchor='middle'>{nr}</text>"
                   f"<text x='{x + 23}' y='{y + 4.5}' font-size='12' fill='#222'>{text}</text>")
    return "".join(out)


def faltenbalg(x, y, entfaltet=False, breite=34):
    """Ziehharmonika-Vakuumindikator; x,y = Mitte unten."""
    falten = 5
    h = 9 if not entfaltet else 17
    out = []
    for i in range(falten):
        yy = y - (i + 1) * h
        out.append(f"<path d='M{x - breite / 2},{yy + h} L{x - breite / 2 - 6},{yy + h / 2} L{x - breite / 2},{yy} "
                   f"L{x + breite / 2},{yy} L{x + breite / 2 + 6},{yy + h / 2} L{x + breite / 2},{yy + h} Z' fill='#eef3f7' stroke='{LINIE}' stroke-width='1.4'/>")
    out.append(f"<rect x='{x - breite / 2 - 2}' y='{y - falten * h - 7}' width='{breite + 4}' height='7' rx='2' fill='#9aa9b5' stroke='{LINIE}'/>")
    return "".join(out)


def redon(beschriftet=True, ziele=False):
    s = [f"<svg viewBox='0 0 640 400' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Redon-Drainage mit Redonflasche'>",
         "<rect width='640' height='400' fill='#ffffff'/>",
         # Gewebe und Haut
         f"<rect x='20' y='118' width='330' height='130' fill='{GEWEBE}'/>",
         f"<rect x='20' y='96' width='330' height='24' fill='{HAUT}' stroke='{LINIE}' stroke-width='1'/>",
         f"<text x='30' y='240' font-size='13' fill='#8a6a55'>Wundgebiet (z. B. Hüfte)</text>",
         # OP-Naht
         f"<line x1='60' y1='96' x2='230' y2='96' stroke='#7a3b2e' stroke-width='3'/>",
         "".join(f"<line x1='{x}' y1='88' x2='{x}' y2='104' stroke='#222' stroke-width='2'/>" for x in range(70, 231, 20)),
         f"<text x='95' y='80' font-size='13' fill='{LINIE}'>OP-Naht</text>",
         # Wundhöhle mit Sekret
         f"<ellipse cx='160' cy='175' rx='120' ry='38' fill='#f3cfc0' stroke='#d9a08d' stroke-dasharray='4 3'/>",
         # Drainagekatheter im Gewebe (perforiert)
         f"<path d='M70,175 L270,175 Q300,175 305,140 L312,108' fill='none' stroke='{SCHLAUCH}' stroke-width='7' stroke-linecap='round'/>",
         "".join(f"<circle cx='{x}' cy='175' r='2.4' fill='#ffffff'/>" for x in range(80, 241, 18)),
         # Austrittsstelle mit Fixiernaht
         f"<circle cx='312' cy='104' r='10' fill='none' stroke='#7a3b2e' stroke-width='2'/>",
         f"<path d='M300,96 q12,-14 24,0' fill='none' stroke='#222' stroke-width='1.8'/>",
         # Ableitungsschlauch außen
         f"<path d='M312,100 C330,40 420,40 440,95 L446,140' fill='none' stroke='{SCHLAUCH}' stroke-width='7' stroke-linecap='round'/>",
         klemme(392, 52),
         # Ansatzstück / Verbindung
         f"<rect x='436' y='140' width='20' height='26' rx='4' fill='#d9dde3' stroke='{LINIE}'/>",
         # kurzer Schlauch der Flasche mit patientenferner Klemme
         f"<path d='M446,166 L446,214' fill='none' stroke='{SCHLAUCH}' stroke-width='7'/>",
         klemme(446, 192, "#2f8f5b"),
         # Flasche
         f"<rect x='420' y='214' width='170' height='160' rx='18' fill='#f7fafc' stroke='{LINIE}' stroke-width='2'/>",
         f"<rect x='424' y='300' width='162' height='70' rx='14' fill='{SEKRET}' opacity='.55'/>",
         f"<text x='450' y='262' font-size='16' font-weight='bold' fill='{LINIE}'>Redon</text>",
         # Skala
         "".join(f"<line x1='566' y1='{y}' x2='584' y2='{y}' stroke='{LINIE}' stroke-width='1.5'/><text x='536' y='{y + 4}' font-size='10' fill='{LINIE}'>{ml}</text>"
                 for ml, y in [(400, 236), (300, 270), (200, 304), (100, 338)]),
         # Faltenbalg (zusammengezogen = Sog vorhanden)
         faltenbalg(520, 214)]
    if beschriftet:
        s[0] = s[0].replace("viewBox='0 0 640 400'", "viewBox='0 0 640 520'")
        s[1] = "<rect width='640' height='520' fill='#ffffff'/>"
        s += [badge(1, 150, 206), badge(2, 336, 122), badge(3, 340, 46), badge(4, 392, 26), badge(5, 476, 153),
              badge(6, 472, 192), badge(7, 562, 168), badge(8, 606, 286), badge(9, 404, 330)]
        s.append(legende([(1, "Drainagekatheter mit seitlichen Öffnungen"), (2, "Austrittsstelle (mit Naht fixiert)"),
                          (3, "Ableitungsschlauch"), (4, "patientennahe Klemme"), (5, "Ansatzstück (Verbindung)"),
                          (6, "patientenferne Klemme"), (7, "Vakuumindikator (Faltenbalg)"), (8, "Skala in ml"),
                          (9, "Redonflasche (Vakuumflasche)")], 418, spalten=2))
    if ziele:
        s += ["<g data-ziel='katheter'><rect class='feld' x='60' y='160' width='230' height='32' rx='8'/></g>",
              "<g data-ziel='austritt'><circle class='feld' cx='312' cy='104' r='20'/></g>",
              "<g data-ziel='naht'><rect class='feld' x='55' y='80' width='180' height='30' rx='6'/></g>",
              "<g data-ziel='schlauch'><path class='feld' d='M318,90 C335,30 425,30 450,90 L432,96 C415,52 340,52 330,96 Z'/></g>",
              "<g data-ziel='klemme_nah'><rect class='feld' x='370' y='36' width='44' height='34' rx='6'/></g>",
              "<g data-ziel='konnektor'><rect class='feld' x='428' y='134' width='36' height='38' rx='6'/></g>",
              "<g data-ziel='klemme_fern'><rect class='feld' x='424' y='176' width='44' height='32' rx='6'/></g>",
              "<g data-ziel='indikator'><rect class='feld' x='490' y='154' width='60' height='62' rx='6'/></g>",
              "<g data-ziel='skala'><rect class='feld' x='530' y='226' width='60' height='124' rx='6'/></g>",
              "<g data-ziel='flasche'><rect class='feld' x='420' y='250' width='106' height='124' rx='10'/></g>"]
    s.append("</svg>")
    return "".join(s)


def vakuum():
    return (f"<svg viewBox='0 0 520 210' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Vakuumindikator zusammengezogen und entfaltet'>"
            "<rect width='520' height='210' fill='#fff'/>"
            f"{faltenbalg(130, 140, False, 46)}"
            f"<text x='130' y='170' font-size='14' font-weight='bold' text-anchor='middle' fill='#1d7a46'>zusammengezogen</text>"
            f"<text x='130' y='190' font-size='13' text-anchor='middle' fill='#222'>Sog vorhanden ✓</text>"
            f"{faltenbalg(390, 140, True, 46)}"
            f"<text x='390' y='170' font-size='14' font-weight='bold' text-anchor='middle' fill='#b3261e'>entfaltet</text>"
            f"<text x='390' y='190' font-size='13' text-anchor='middle' fill='#222'>kein Sog mehr → Flasche wechseln</text>"
            "</svg>")


def robinson(beschriftet=True, ziele=False):
    s = [f"<svg viewBox='0 0 640 380' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Robinson-Drainage mit Beutel'>",
         "<rect width='640' height='380' fill='#fff'/>",
         # Bauch (Körperumriss liegend)
         f"<path d='M20,170 Q60,80 200,78 L360,78 Q420,80 430,170 Z' fill='{GEWEBE}' stroke='{LINIE}' stroke-width='1.5'/>",
         f"<path d='M20,170 L430,170' stroke='{LINIE}' stroke-width='1.5'/>",
         f"<text x='150' y='160' font-size='13' fill='#8a6a55'>Bauchraum</text>",
         # Wundnaht
         f"<line x1='170' y1='80' x2='280' y2='80' stroke='#7a3b2e' stroke-width='3'/>",
         "".join(f"<line x1='{x}' y1='72' x2='{x}' y2='88' stroke='#222' stroke-width='2'/>" for x in range(178, 281, 18)),
         # Drainage im Bauchraum, Austritt seitlich
         f"<path d='M150,130 Q250,128 330,120 Q385,112 398,100' fill='none' stroke='#c9a26b' stroke-width='9' stroke-linecap='round'/>",
         f"<circle cx='398' cy='100' r='9' fill='none' stroke='#7a3b2e' stroke-width='2'/>",
         # Schlauch nach unten zum Beutel
         f"<path d='M402,96 C470,90 500,140 500,210 L500,236' fill='none' stroke='#c9a26b' stroke-width='9' stroke-linecap='round'/>",
         # Wundniveau-Linie
         f"<line x1='20' y1='100' x2='630' y2='100' stroke='#b4572a' stroke-dasharray='6 5' stroke-width='1.5'/>",
         f"<text x='626' y='94' font-size='12' fill='#b4572a' text-anchor='end'>Wundniveau</text>",
         # Rücklaufsperre
         f"<path d='M488,236 L512,236 L500,252 Z' fill='#d9dde3' stroke='{LINIE}'/>",
         # Beutel
         f"<path d='M450,252 L550,252 L560,350 Q500,372 440,350 Z' fill='#f7fafc' stroke='{LINIE}' stroke-width='2'/>",
         f"<path d='M446,318 L556,318 L560,350 Q500,372 440,350 Z' fill='#e8c27a' opacity='.6'/>",
         "".join(f"<line x1='532' y1='{y}' x2='548' y2='{y}' stroke='{LINIE}'/>" for y in (272, 292, 312, 332)),
         # Ablaufstutzen
         f"<rect x='492' y='360' width='16' height='16' rx='3' fill='#9aa9b5' stroke='{LINIE}'/>",
         f"<text x='465' y='300' font-size='14' font-weight='bold' fill='{LINIE}'>Beutel</text>"]
    if beschriftet:
        s[0] = s[0].replace("viewBox='0 0 640 380'", "viewBox='0 0 640 470'")
        s[1] = "<rect width='640' height='470' fill='#fff'/>"
        s += [badge(1, 160, 112), badge(2, 418, 120), badge(3, 530, 236), badge(4, 576, 300), badge(5, 530, 368)]
        s.append(legende([(1, "Drainageschlauch im Bauchraum"), (2, "Austrittsstelle"), (3, "Rücklaufsperre (bei vielen Beuteln)"),
                          (4, "Auffangbeutel – unter Wundniveau"), (5, "Ablaufstutzen zum Entleeren")], 410, spalten=2))
    if ziele:
        s += ["<g data-ziel='austritt'><circle class='feld' cx='398' cy='100' r='22'/></g>",
              "<g data-ziel='beutel'><rect class='feld' x='440' y='256' width='120' height='96' rx='10'/></g>",
              "<g data-ziel='stutzen'><rect class='feld' x='480' y='352' width='40' height='28' rx='6'/></g>",
              "<g data-ziel='ruecklauf'><rect class='feld' x='478' y='226' width='44' height='30' rx='6'/></g>",
              "<g data-ziel='niveau'><rect class='feld' x='560' y='82' width='76' height='30' rx='6'/></g>"]
    s.append("</svg>")
    return "".join(s)


def redon_hoch():
    """Hochkant-Variante zum Antippen am Handy (große Ziele, keine Beschriftung)."""
    s = [f"<svg viewBox='0 0 360 560' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Redon-Drainage mit Redonflasche'>",
         "<rect width='360' height='560' fill='#ffffff'/>",
         f"<rect x='10' y='64' width='300' height='120' fill='{GEWEBE}'/>",
         f"<rect x='10' y='44' width='300' height='22' fill='{HAUT}' stroke='{LINIE}'/>",
         f"<line x1='30' y1='44' x2='180' y2='44' stroke='#7a3b2e' stroke-width='3'/>",
         "".join(f"<line x1='{x}' y1='36' x2='{x}' y2='52' stroke='#222' stroke-width='2'/>" for x in range(38, 181, 18)),
         f"<ellipse cx='120' cy='122' rx='105' ry='36' fill='#f3cfc0' stroke='#d9a08d' stroke-dasharray='4 3'/>",
         f"<path d='M30,122 L200,122 Q236,122 240,90 L246,56' fill='none' stroke='{SCHLAUCH}' stroke-width='9' stroke-linecap='round'/>",
         "".join(f"<circle cx='{x}' cy='122' r='2.8' fill='#fff'/>" for x in range(40, 190, 16)),
         f"<circle cx='246' cy='52' r='13' fill='none' stroke='#7a3b2e' stroke-width='2.5'/>",
         f"<path d='M246,46 C252,8 330,8 330,60 L330,250' fill='none' stroke='{SCHLAUCH}' stroke-width='9' stroke-linecap='round'/>",
         klemme(330, 160).replace("x='-14' y='-9' width='28' height='18'", "x='-20' y='-13' width='40' height='26'"),
         f"<rect x='314' y='250' width='32' height='40' rx='5' fill='#d9dde3' stroke='{LINIE}'/>",
         f"<path d='M330,290 L330,350' fill='none' stroke='{SCHLAUCH}' stroke-width='9'/>",
         klemme(330, 318, "#2f8f5b").replace("x='-14' y='-9' width='28' height='18'", "x='-20' y='-13' width='40' height='26'"),
         f"<rect x='150' y='350' width='200' height='196' rx='20' fill='#f7fafc' stroke='{LINIE}' stroke-width='2'/>",
         f"<rect x='154' y='450' width='192' height='92' rx='16' fill='{SEKRET}' opacity='.55'/>",
         f"<text x='250' y='420' font-size='20' font-weight='bold' fill='{LINIE}' text-anchor='middle'>Redon</text>",
         "".join(f"<line x1='160' y1='{y}' x2='182' y2='{y}' stroke='{LINIE}' stroke-width='2'/><text x='188' y='{y + 5}' font-size='12' fill='{LINIE}'>{ml}</text>"
                 for ml, y in [(400, 380), (300, 420), (200, 460), (100, 500)]),
         faltenbalg(240, 350, False, 52),
         "<g data-ziel='naht'><rect class='feld' x='24' y='26' width='164' height='34' rx='6'/></g>",
         "<g data-ziel='katheter'><rect class='feld' x='20' y='104' width='196' height='36' rx='8'/></g>",
         "<g data-ziel='austritt'><circle class='feld' cx='246' cy='52' r='24'/></g>",
         "<g data-ziel='schlauch'><path class='feld' d='M262,40 C270,0 346,0 346,60 L346,135 L314,135 L314,60 C314,26 276,26 268,52 Z'/></g>",
         "<g data-ziel='klemme_nah'><rect class='feld' x='300' y='138' width='60' height='44' rx='8'/></g>",
         "<g data-ziel='konnektor'><rect class='feld' x='300' y='244' width='60' height='52' rx='8'/></g>",
         "<g data-ziel='klemme_fern'><rect class='feld' x='300' y='298' width='60' height='42' rx='8'/></g>",
         "<g data-ziel='indikator'><rect class='feld' x='196' y='278' width='92' height='74' rx='8'/></g>",
         "<g data-ziel='skala'><rect class='feld' x='154' y='362' width='60' height='150' rx='8'/></g>",
         "<g data-ziel='flasche'><rect class='feld' x='222' y='430' width='124' height='112' rx='10'/></g>",
         "</svg>"]
    return "".join(s)


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    (IMG / "redon-system.svg").write_text(redon(True), encoding="utf-8")
    (IMG / "vakuumindikator.svg").write_text(vakuum(), encoding="utf-8")
    (IMG / "robinson.svg").write_text(robinson(True), encoding="utf-8")
    (BUILD / "hotspots.json").write_text(json.dumps({
        "redon": redon_hoch(),
        "robinson": robinson(False, True),
    }, ensure_ascii=False), encoding="utf-8")
    print("Grafiken geschrieben:", sorted(p.name for p in IMG.glob("*.svg")))


if __name__ == "__main__":
    main()
