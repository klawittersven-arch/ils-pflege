"""Erzeugt die schematischen Grafiken (SVG) für AB und Übungen. Graustufen, druckfreundlich."""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "dk" / "img"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "font-family='Arial, Helvetica, sans-serif'"


def svg(w, h, body):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}' {FONT}>"
            f"<rect width='{w}' height='{h}' fill='#ffffff'/>{body}</svg>")


def marker(x, y, n, r=15):
    fs = round(r * 1.13)
    return (f"<circle cx='{x}' cy='{y}' r='{r}' fill='#222'/>"
            f"<text x='{x}' y='{y + fs * 0.36:.0f}' font-size='{fs}' font-weight='700' fill='#fff' text-anchor='middle'>{n}</text>")


def label(x, y, text, anchor="start", size=17, weight="400"):
    lines = text.split("|")
    out = ""
    for i, line in enumerate(lines):
        out += f"<text x='{x}' y='{y + i * (size + 3)}' font-size='{size}' font-weight='{weight}' fill='#222' text-anchor='{anchor}'>{line}</text>"
    return out


def katheter(with_labels):
    b = []
    # Ballon (geblockt)
    b.append("<ellipse cx='150' cy='150' rx='52' ry='42' fill='#d9d9d9' stroke='#444' stroke-width='3'/>")
    # Schaft vorne + Spitze
    b.append("<path d='M40 150 Q40 136 56 136 L380 136 L380 164 L56 164 Q40 164 40 150 Z' fill='#f2f2f2' stroke='#333' stroke-width='3'/>")
    # Auge
    b.append("<ellipse cx='70' cy='143' rx='11' ry='5' fill='#555'/>")
    # Bruchzeichen (Katheter ist lang)
    b.append("<path d='M378 128 L392 172 M398 128 L412 172' stroke='#333' stroke-width='3' fill='none'/>")
    # Schaft hinten
    b.append("<path d='M404 136 L640 136 L640 164 L404 164 Z' fill='#f2f2f2' stroke='#333' stroke-width='3'/>")
    # Kanäle angedeutet
    b.append("<path d='M56 150 L380 150 M410 150 L640 150' stroke='#999' stroke-width='2' stroke-dasharray='6 5'/>")
    # Trichter (Anschluss Ableitungssystem)
    b.append("<path d='M640 136 L720 128 L800 112 L800 188 L720 172 L640 164 Z' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
    # Seitenarm Blockungskanal
    b.append("<path d='M600 164 L700 246 L716 230 L630 150' fill='#f2f2f2' stroke='#333' stroke-width='3' stroke-linejoin='round'/>")
    # Ventil
    b.append("<rect x='694' y='232' width='58' height='40' rx='8' transform='rotate(40 723 252)' fill='#7a7a7a' stroke='#222' stroke-width='3'/>")
    b.append("<text x='560' y='122' font-size='15' fill='#444'>14 Ch · 10 ml</text>")
    # Querschnitt
    b.append("<g transform='translate(840 40)'><circle cx='0' cy='0' r='26' fill='#f2f2f2' stroke='#333' stroke-width='3'/>"
             "<circle cx='-3' cy='3' r='15' fill='#fff' stroke='#333' stroke-width='2'/><circle cx='14' cy='-14' r='5' fill='#fff' stroke='#333' stroke-width='2'/></g>")
    if with_labels:
        b.append("<path d='M70 143 L70 70' stroke='#222' stroke-width='1.5'/>" + marker(70, 58, 1) + label(90, 52, "Katheterspitze|mit Auge", size=16))
        b.append("<path d='M170 186 L190 246' stroke='#222' stroke-width='1.5'/>" + marker(190, 258, 2) + label(212, 254, "Ballon (geblockt)", size=16))
        b.append("<path d='M500 164 L500 230' stroke='#222' stroke-width='1.5'/>" + marker(500, 244, 3) + label(410, 278, "Schaft mit 2 Kanälen", size=16))
        b.append("<path d='M790 150 L840 150' stroke='#222' stroke-width='1.5'/>" + marker(855, 150, 4) + label(855, 190, "Anschluss|Urinbeutel", "middle", size=16))
        b.append("<path d='M740 268 L790 292' stroke='#222' stroke-width='1.5'/>" + marker(803, 298, 5) + label(828, 304, "Block-|ventil", size=16))
        b.append(label(840, 92, "Querschnitt", "middle", 14))
    else:
        b.append("<path d='M70 143 L70 80' stroke='#222' stroke-width='3'/>" + marker(70, 52, 1, 30))
        b.append("<path d='M170 186 L190 236' stroke='#222' stroke-width='3'/>" + marker(196, 270, 2, 30))
        b.append("<path d='M500 164 L500 236' stroke='#222' stroke-width='3'/>" + marker(500, 270, 3, 30))
        b.append("<path d='M790 150 L830 150' stroke='#222' stroke-width='3'/>" + marker(866, 150, 4, 30))
        b.append("<path d='M740 268 L776 286' stroke='#222' stroke-width='3'/>" + marker(806, 296, 5, 30))
    return svg(920, 330, "".join(b))


def harnroehre():
    b = []
    # ---------- Frau ----------
    b.append(label(150, 34, "Frau", "middle", 22, "700"))
    b.append("<g transform='translate(0 40)'>")
    b.append("<ellipse cx='130' cy='120' rx='70' ry='55' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
    b.append(label(130, 125, "Harnblase", "middle", 16))
    b.append("<ellipse cx='225' cy='175' rx='16' ry='30' fill='#bdbdbd' stroke='#333' stroke-width='2'/>")
    b.append(label(250, 160, "Scham-|bein", "start", 14))
    b.append("<path d='M140 174 L160 236' stroke='#222' stroke-width='9' stroke-linecap='round'/>")
    b.append("<path d='M100 172 Q92 230 108 290' stroke='#888' stroke-width='16' fill='none' stroke-linecap='round'/>")
    b.append(label(60, 310, "Scheide (hinten)", "start", 14))
    b.append("<path d='M165 205 L205 220' stroke='#222' stroke-width='1.5'/>")
    b.append(label(208, 230, "Harnröhre:|3–5 cm, gerade", "start", 15, "700"))
    # Trenner
    b.append("</g><line x1='330' y1='20' x2='330' y2='430' stroke='#bbb' stroke-width='2' stroke-dasharray='6 6'/>")

    # ---------- Mann (Penis hängt) ----------
    def mann(ox, lifted):
        g = [f"<g transform='translate({ox} 0)'>"]
        g.append("<ellipse cx='120' cy='105' rx='65' ry='50' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
        g.append(label(120, 105, "Harnblase", "middle", 15))
        g.append("<ellipse cx='205' cy='150' rx='15' ry='28' fill='#bdbdbd' stroke='#333' stroke-width='2'/>")
        g.append("<ellipse cx='120' cy='172' rx='26' ry='20' fill='#cfcfcf' stroke='#333' stroke-width='2'/>")
        g.append(label(60, 178, "Prostata", "end", 14))
        g.append("<rect x='80' y='200' width='80' height='10' fill='#9e9e9e'/>")
        g.append(label(60, 212, "Schließ-|muskel", "end", 14))
        if not lifted:
            g.append("<path d='M235 210 Q262 214 268 260 L276 340 Q278 356 262 356 L244 356 Q232 356 232 340 L226 262 Q224 236 210 232' fill='#ededed' stroke='#333' stroke-width='3'/>")
            g.append("<path d='M120 152 L120 222 Q122 248 160 246 Q205 242 232 228 Q252 220 252 262 L256 350' stroke='#222' stroke-width='7' fill='none' stroke-linecap='round'/>")
            g.append(marker(150, 268, 1) + marker(275, 228, 2))
            g.append(label(150, 388, "Penis hängt: 2 Krümmungen", "middle", 15, "700"))
        else:
            g.append("<path d='M228 202 L300 188 Q316 186 316 202 L316 220 Q316 234 300 232 L228 240' fill='#ededed' stroke='#333' stroke-width='3'/>")
            g.append("<path d='M120 152 L120 222 Q122 248 160 246 Q200 242 230 222 L306 208' stroke='#222' stroke-width='7' fill='none' stroke-linecap='round'/>")
            g.append(marker(150, 268, 1))
            g.append(label(160, 370, "Penis gestreckt, ca. 90° zum Körper:", "middle", 15, "700"))
            g.append(label(160, 388, "Krümmung ② ist jetzt gerade", "middle", 15, "700"))
        g.append("</g>")
        return "".join(g)

    b.append("<defs><marker id='pfeil' viewBox='0 0 10 10' refX='5' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0 0 L10 5 L0 10 z' fill='#222'/></marker></defs>")
    b.append(label(655, 34, "Mann", "middle", 22, "700"))
    b.append(label(655, 58, "Harnröhre: 20–25 cm, 2 Krümmungen, Engstellen (Prostata, Schließmuskel)", "middle", 15))
    b.append("<g transform='translate(0 40)'>" + mann(350, False) + mann(660, True) + "</g>")
    b.append(label(660, 465, "① feste Krümmung unter dem Schambein   ② bewegliche Krümmung im Penis", "middle", 15))
    return svg(990, 480, "".join(b))


def ableitung():
    b = []
    b.append("<defs><marker id='pf' viewBox='0 0 10 10' refX='5' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0 0 L10 5 L0 10 z' fill='#222'/></marker></defs>")
    # Boden
    b.append("<line x1='20' y1='400' x2='880' y2='400' stroke='#333' stroke-width='3'/>")
    b.append("<path d='M30 400 l14 12 M80 400 l14 12 M130 400 l14 12 M180 400 l14 12 M230 400 l14 12 M280 400 l14 12 M330 400 l14 12 M380 400 l14 12 M430 400 l14 12 M480 400 l14 12 M530 400 l14 12 M580 400 l14 12 M630 400 l14 12 M680 400 l14 12' stroke='#999' stroke-width='2'/>")
    b.append(label(590, 428, "Boden", "start", 14))
    # Bett
    b.append("<rect x='60' y='170' width='560' height='34' rx='6' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
    b.append("<rect x='60' y='204' width='560' height='14' fill='#9e9e9e'/>")
    b.append("<path d='M80 218 L80 400 M600 218 L600 400' stroke='#333' stroke-width='6'/>")
    # Patient
    b.append("<circle cx='110' cy='140' r='26' fill='#cfcfcf' stroke='#333' stroke-width='3'/>")
    b.append("<path d='M140 128 Q160 110 260 112 L560 122 Q585 124 585 146 Q585 168 560 168 L150 168 Q138 160 140 128 Z' fill='#d9d9d9' stroke='#333' stroke-width='3'/>")
    # Blase
    b.append("<circle cx='320' cy='146' r='13' fill='#fff' stroke='#222' stroke-width='3'/>")
    b.append(label(320, 100, "Blase", "middle", 15, "700"))
    b.append("<line x1='320' y1='146' x2='860' y2='146' stroke='#222' stroke-width='2' stroke-dasharray='8 6'/>")
    b.append(label(860, 136, "Blasenniveau", "end", 15, "700"))
    # Schlauch
    b.append("<path d='M330 156 Q380 170 640 176 Q690 178 690 220 L690 248' stroke='#222' stroke-width='5' fill='none'/>")
    # Probeentnahmestelle
    b.append("<circle cx='690' cy='232' r='7' fill='#fff' stroke='#222' stroke-width='3'/>")
    # Haken am Bett
    b.append("<path d='M620 210 L660 210 L660 250' stroke='#555' stroke-width='4' fill='none'/>")
    # Beutel
    b.append("<rect x='652' y='250' width='92' height='26' rx='6' fill='#cfcfcf' stroke='#333' stroke-width='3'/>")
    b.append("<path d='M650 276 L746 276 L746 340 Q746 352 734 352 L662 352 Q650 352 650 340 Z' fill='#f2f2f2' stroke='#333' stroke-width='3'/>")
    b.append("<path d='M652 318 L744 318 L744 340 Q744 350 734 350 L662 350 Q652 350 652 340 Z' fill='#cfcfcf'/>")
    b.append("<path d='M698 352 L698 372' stroke='#333' stroke-width='6'/>")
    # Labels rechts
    b.append("<path d='M698 232 L780 214' stroke='#222' stroke-width='1.5'/>" + label(784, 210, "Probeentnahme-|stelle", "start", 14))
    b.append("<path d='M744 262 L780 262' stroke='#222' stroke-width='1.5'/>" + label(784, 258, "Tropfkammer +|Rückflussventil", "start", 14))
    b.append("<path d='M746 312 L780 312' stroke='#222' stroke-width='1.5'/>" + label(784, 316, "Urinbeutel", "start", 14))
    b.append("<path d='M704 366 L780 360' stroke='#222' stroke-width='1.5'/>" + label(784, 364, "Ablassventil", "start", 14))
    # Abstand zum Boden
    b.append("<path d='M630 374 L630 396' stroke='#222' stroke-width='2' marker-start='url(#pf)' marker-end='url(#pf)'/>")
    b.append(label(560, 390, "Abstand", "end", 14))
    # Merkpunkte links unten
    b.append(label(120, 262, "✔ Beutel unter Blasenniveau", "start", 17, "700"))
    b.append(label(120, 290, "✔ Beutel nicht auf dem Boden", "start", 17, "700"))
    b.append(label(120, 318, "✔ Schlauch ohne Knick, ohne Schlaufe", "start", 17, "700"))
    b.append(label(120, 346, "✔ System bleibt geschlossen", "start", 17, "700"))
    return svg(900, 440, "".join(b))


(OUT / "katheter-beschriftet.svg").write_text(katheter(True), encoding="utf-8")
(OUT / "katheter-nummern.svg").write_text(katheter(False), encoding="utf-8")
(OUT / "harnroehre.svg").write_text(harnroehre(), encoding="utf-8")
(OUT / "ableitung.svg").write_text(ableitung(), encoding="utf-8")
print("ok", sorted(p.name for p in OUT.glob("*.svg")))
