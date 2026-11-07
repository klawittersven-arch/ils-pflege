"""Grafiken für den ILS-Auftrag „Materialentfernung und pflegerische Nachsorge“ (SVG).

Erzeugt in me/img/:  osteosynthese.svg (beschriftet), fuss-dms.svg (beschriftet)
und tools/build_me/hotspots.json (unbeschriftete Varianten zum Antippen am Handy).
"""
import json
from pathlib import Path

from grafiken_drainage import SCHRIFT, LINIE, badge, legende

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "me/img"
BUILD = ROOT / "tools/build_me"
KNOCHEN, MARK, METALL = "#f4ecd8", "#e9dcbc", "#8e9aa6"


def knochen(x, y, b, h, bruch=True):
    s = (f"<rect x='{x}' y='{y}' width='{b}' height='{h}' rx='{b / 2}' fill='{KNOCHEN}' stroke='{LINIE}' stroke-width='1.6'/>"
         f"<rect x='{x + b * 0.3}' y='{y + 18}' width='{b * 0.4}' height='{h - 36}' rx='{b * 0.2}' fill='{MARK}'/>")
    if bruch:
        m = y + h / 2
        s += (f"<path d='M{x - 2},{m - 6} L{x + b * 0.3},{m + 6} L{x + b * 0.6},{m - 8} L{x + b + 2},{m + 4}' fill='none' "
              f"stroke='#b3261e' stroke-width='2.2' stroke-dasharray='5 3'/>")
    return s


def schraube(x1, y, x2):
    return (f"<line x1='{x1}' y1='{y}' x2='{x2}' y2='{y}' stroke='{METALL}' stroke-width='5' stroke-linecap='round'/>"
            f"<rect x='{x2 - 2}' y='{y - 7}' width='9' height='14' rx='2' fill='{METALL}' stroke='{LINIE}'/>")


def osteosynthese(beschriftet=True):
    h = 380 if beschriftet else 330
    s = [f"<svg viewBox='0 0 640 {h}' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Osteosyntheseverfahren'>",
         f"<rect width='640' height='{h}' fill='#fff'/>"]
    # A Platte + Schrauben
    s += [knochen(70, 40, 44, 250), f"<rect x='114' y='70' width='13' height='190' rx='4' fill='{METALL}' stroke='{LINIE}'/>"]
    s += [schraube(76, y, 128) for y in (88, 118, 192, 222)]
    # B Marknagel mit Verriegelungsschrauben
    s += [knochen(230, 40, 44, 250), f"<rect x='246' y='30' width='12' height='250' rx='5' fill='{METALL}' stroke='{LINIE}'/>",
          schraube(222, 70, 280), schraube(222, 250, 280)]
    # C Spickdrähte (Kirschner-Drähte)
    s += [knochen(390, 90, 44, 170),
          f"<line x1='370' y1='130' x2='452' y2='236' stroke='{METALL}' stroke-width='3.5'/>",
          f"<line x1='454' y1='130' x2='372' y2='236' stroke='{METALL}' stroke-width='3.5'/>"]
    # D Fixateur externe
    s += [knochen(530, 40, 44, 250)]
    for y in (70, 110, 210, 250):
        s.append(f"<line x1='540' y1='{y}' x2='618' y2='{y}' stroke='{METALL}' stroke-width='5'/>")
        s.append(f"<rect x='604' y='{y - 9}' width='16' height='18' rx='3' fill='#5c6b78'/>")
    s.append(f"<rect x='620' y='56' width='10' height='208' rx='4' fill='#5c6b78' stroke='{LINIE}'/>")
    s.append(f"<path d='M566,58 q8,-12 18,0' fill='none' stroke='#c96a5a' stroke-width='0'/>")
    if beschriftet:
        for x, titel in [(98, "A  Platte + Schrauben"), (252, "B  Marknagel"), (412, "C  Spickdrähte"), (560, "D  Fixateur externe")]:
            s.append(f"<text x='{x}' y='330' font-size='15' font-weight='bold' fill='#222' text-anchor='middle'>{titel}</text>")
        s.append("<text x='320' y='365' font-size='13' fill='#b3261e' text-anchor='middle'>rot gestrichelt: Bruchspalt</text>")
    else:
        s += ["<g data-ziel='platte'><rect class='feld' x='108' y='60' width='30' height='210' rx='6'/></g>",
              "<g data-ziel='schraube'><rect class='feld' x='60' y='176' width='46' height='32' rx='6'/></g>",
              "<g data-ziel='nagel'><rect class='feld' x='236' y='90' width='32' height='150' rx='6'/></g>",
              "<g data-ziel='draht'><rect class='feld' x='362' y='120' width='100' height='126' rx='8'/></g>",
              "<g data-ziel='fixateur'><rect class='feld' x='586' y='44' width='54' height='232' rx='8'/></g>"]
    s.append("</svg>")
    return "".join(s)


def fuss(beschriftet=True):
    h = 530 if beschriftet else 400
    s = [f"<svg viewBox='0 0 360 {h}' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Rechter Fuß von oben mit Verband am Sprunggelenk'>",
         f"<rect width='360' height='{h}' fill='#fff'/>",
         # Unterschenkel und Fuß (von oben)
         "<path d='M130,10 L230,10 L232,150 Q250,190 262,250 Q275,320 250,350 L110,350 Q92,320 100,250 Q110,190 128,150 Z' fill='#f6d9c4' stroke='#4a4a4a' stroke-width='1.6'/>",
         # Verband
         "<path d='M126,100 L236,100 L238,175 L122,175 Z' fill='#ffffff' stroke='#9aa9b5' stroke-width='2'/>",
         "".join(f"<line x1='124' y1='{y}' x2='238' y2='{y}' stroke='#d6dde4' stroke-width='1.5'/>" for y in range(112, 175, 12)),
         # Zehen
         "".join(f"<ellipse cx='{x}' cy='{y}' rx='{rx}' ry='{ry}' fill='#f6d9c4' stroke='#4a4a4a' stroke-width='1.4'/>"
                 for x, y, rx, ry in [(128, 362, 22, 30), (170, 370, 15, 22), (204, 368, 13, 20), (234, 362, 12, 18), (258, 350, 11, 15)]),
         # Nagel der Großzehe
         "<rect x='118' y='342' width='20' height='18' rx='6' fill='#fbeee6' stroke='#b08a78'/>",
         # Fußrücken-Puls
         "<circle cx='196' cy='245' r='7' fill='#c0392b'/><circle cx='196' cy='245' r='13' fill='none' stroke='#c0392b' stroke-dasharray='3 3'/>"]
    if beschriftet:
        s.append("<text x='180' y='92' font-size='13' fill='#555' text-anchor='middle'>Verband (OP-Wunde)</text>")
        s += [badge(1, 300, 140), badge(2, 230, 245), badge(3, 92, 345), badge(4, 300, 360), badge(5, 300, 290)]
        s.append(legende([(1, "Verband: durchgeblutet? (Nachblutung)"), (2, "Fußpuls (A. dorsalis pedis)"),
                          (3, "Nagelbettprobe: Rekapillarisierung"), (4, "Zehen bewegen (Motorik)"),
                          (5, "Haut: Farbe, Temperatur, Gefühl")], 405, spalten=1, breite=360))
        s.append("<line x1='286' y1='140' x2='238' y2='140' stroke='#888'/><line x1='286' y1='360' x2='262' y2='352' stroke='#888'/>"
                 "<line x1='286' y1='290' x2='256' y2='290' stroke='#888'/>")
    else:
        s += ["<g data-ziel='verband'><rect class='feld' x='118' y='96' width='124' height='84' rx='8'/></g>",
              "<g data-ziel='puls'><circle class='feld' cx='196' cy='245' r='24'/></g>",
              "<g data-ziel='nagel'><rect class='feld' x='106' y='332' width='44' height='38' rx='8'/></g>",
              "<g data-ziel='zehen'><rect class='feld' x='152' y='336' width='126' height='60' rx='10'/></g>",
              "<g data-ziel='haut'><rect class='feld' x='104' y='190' width='70' height='130' rx='10'/></g>"]
    s.append("</svg>")
    return "".join(s)


def osteo_hoch():
    """2×2-Raster zum Antippen am Handy (große Ziele, ohne Beschriftung)."""
    s = [f"<svg viewBox='0 0 360 600' xmlns='http://www.w3.org/2000/svg' {SCHRIFT} role='img' aria-label='Osteosyntheseverfahren'>",
         "<rect width='360' height='600' fill='#fff'/>",
         "<line x1='180' y1='10' x2='180' y2='590' stroke='#eee'/><line x1='10' y1='300' x2='350' y2='300' stroke='#eee'/>"]
    # A Platte + Schrauben (oben links)
    s += [knochen(60, 30, 48, 240), f"<rect x='108' y='60' width='16' height='180' rx='4' fill='{METALL}' stroke='{LINIE}'/>"]
    s += [schraube(66, y, 126) for y in (78, 108, 192, 222)]
    # B Marknagel (oben rechts)
    s += [knochen(246, 30, 48, 240), f"<rect x='264' y='22' width='13' height='240' rx='5' fill='{METALL}' stroke='{LINIE}'/>",
          schraube(238, 60, 298), schraube(238, 236, 298)]
    # C Spickdrähte (unten links)
    s += [knochen(70, 360, 48, 180), f"<line x1='46' y1='400' x2='138' y2='510' stroke='{METALL}' stroke-width='4'/>",
          f"<line x1='140' y1='400' x2='48' y2='510' stroke='{METALL}' stroke-width='4'/>"]
    # D Fixateur externe (unten rechts)
    s += [knochen(220, 330, 44, 240)]
    for y in (360, 400, 500, 540):
        s.append(f"<line x1='230' y1='{y}' x2='318' y2='{y}' stroke='{METALL}' stroke-width='5'/><rect x='304' y='{y - 9}' width='16' height='18' rx='3' fill='#5c6b78'/>")
    s.append(f"<rect x='320' y='346' width='12' height='208' rx='4' fill='#5c6b78' stroke='{LINIE}'/>")
    s += ["<g data-ziel='platte'><rect class='feld' x='102' y='50' width='38' height='200' rx='8'/></g>",
          "<g data-ziel='schraube'><rect class='feld' x='50' y='180' width='52' height='56' rx='8'/></g>",
          "<g data-ziel='nagel'><rect class='feld' x='252' y='80' width='36' height='140' rx='8'/></g>",
          "<g data-ziel='draht'><rect class='feld' x='36' y='384' width='112' height='140' rx='10'/></g>",
          "<g data-ziel='fixateur'><rect class='feld' x='296' y='336' width='52' height='228' rx='10'/></g>",
          "</svg>"]
    return "".join(s)


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    (IMG / "osteosynthese.svg").write_text(osteosynthese(True), encoding="utf-8")
    (IMG / "fuss-dms.svg").write_text(fuss(True), encoding="utf-8")
    (BUILD / "hotspots.json").write_text(json.dumps({"osteo": osteo_hoch(), "fuss": fuss(False)}, ensure_ascii=False), encoding="utf-8")
    print("Grafiken geschrieben:", sorted(p.name for p in IMG.glob("*.svg")))


if __name__ == "__main__":
    main()
