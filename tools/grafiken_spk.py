"""Schematische Grafiken (SVG) für den ILS-Auftrag SPK. Graustufen, druckfreundlich."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grafiken import label, marker, svg  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "spk" / "img"
OUT.mkdir(parents=True, exist_ok=True)

DEFS = ("<defs><marker id='pf' viewBox='0 0 10 10' refX='5' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'>"
        "<path d='M0 0 L10 5 L0 10 z' fill='#222'/></marker></defs>")


def lage():
    """Seitenansicht (Mensch steht, vorne = rechts): leere vs. gefüllte Blase."""
    def panel(ox, voll):
        g = [f"<g transform='translate({ox} 0)'>"]
        # Bauchdecke (vorne, rechts)
        g.append("<path d='M300 60 Q312 200 300 330' stroke='#333' stroke-width='16' fill='none' stroke-linecap='round'/>")
        g.append(label(318, 74, "Bauch-|decke", "start", 14))
        # Schambein (Symphyse)
        g.append("<ellipse cx='262' cy='300' rx='18' ry='34' fill='#bdbdbd' stroke='#333' stroke-width='2'/>")
        g.append(label(262, 360, "Schambein", "middle", 14))
        if voll:
            g.append("<ellipse cx='200' cy='225' rx='86' ry='82' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
            g.append(label(150, 205, "Harnblase|(gefüllt)", "middle", 15, "700"))
            # Bauchfell über der Blase, weit oben
            g.append("<path d='M40 120 Q120 128 170 140 Q230 138 280 92' stroke='#222' stroke-width='2.5' stroke-dasharray='7 5' fill='none'/>")
            g.append(label(60, 112, "Bauchfell", "start", 14))
            for cx, cy in ((90, 80), (140, 70), (190, 88), (240, 66)):
                g.append(f"<circle cx='{cx}' cy='{cy}' r='22' fill='#f2f2f2' stroke='#666' stroke-width='2'/>")
            g.append(label(140, 40, "Darm", "middle", 14))
            # Katheter durch Bauchdecke in Blase
            g.append("<path d='M380 214 L304 228 L232 240' stroke='#222' stroke-width='7' fill='none' stroke-linecap='round'/>")
            g.append("<ellipse cx='226' cy='241' rx='15' ry='12' fill='#9e9e9e' stroke='#222' stroke-width='2'/>")
            g.append(label(390, 210, "SPK", "start", 16, "700"))
            # 2 Querfinger
            g.append("<path d='M330 232 L330 270' stroke='#222' stroke-width='2' marker-start='url(#pf)' marker-end='url(#pf)'/>")
            g.append(label(338, 258, "ca. 2 Quer-|finger", "start", 13))
            g.append(label(200, 410, "✔ Blase gefüllt: Bauchfell und", "middle", 16, "700"))
            g.append(label(200, 430, "Darm liegen weiter oben – sicher", "middle", 16, "700"))
        else:
            g.append("<ellipse cx='205' cy='292' rx='48' ry='34' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
            g.append(label(205, 297, "Blase (leer)", "middle", 13, "700"))
            g.append("<path d='M40 214 Q140 230 170 252 Q215 240 288 196' stroke='#222' stroke-width='2.5' stroke-dasharray='7 5' fill='none'/>")
            g.append(label(50, 206, "Bauchfell", "start", 14))
            for cx, cy in ((100, 170), (150, 150), (200, 185), (250, 214), (230, 140)):
                g.append(f"<circle cx='{cx}' cy='{cy}' r='22' fill='#f2f2f2' stroke='#666' stroke-width='2'/>")
            g.append(label(150, 110, "Darm", "middle", 14))
            g.append("<path d='M380 232 L270 226' stroke='#222' stroke-width='7' stroke-dasharray='10 7' fill='none'/>")
            g.append("<path d='M244 206 L268 230 M268 206 L244 230' stroke='#000' stroke-width='6'/>")
            g.append(label(390, 228, "Nadel", "start", 16, "700"))
            g.append(label(200, 410, "✘ Blase leer: Darm liegt direkt", "middle", 16, "700"))
            g.append(label(200, 430, "hinter der Bauchdecke – Gefahr!", "middle", 16, "700"))
        g.append("</g>")
        return "".join(g)

    body = DEFS + panel(0, False) + "<line x1='470' y1='20' x2='470' y2='440' stroke='#bbb' stroke-width='2' stroke-dasharray='6 6'/>" + panel(480, True)
    return svg(960, 450, body)


def verband():
    """Draufsicht auf den Unterbauch: Einstichstelle, Schlitzkompresse, Schlaufe, Fixierung."""
    b = [DEFS]
    # Haut
    b.append("<rect x='20' y='20' width='520' height='340' rx='18' fill='#f7f7f7' stroke='#999' stroke-width='2'/>")
    b.append(label(36, 48, "Unterbauch (von vorne)", "start", 14))
    # Schlitzkompresse
    b.append("<rect x='150' y='120' width='150' height='150' fill='#ffffff' stroke='#333' stroke-width='3'/>")
    b.append("<path d='M225 195 L225 120' stroke='#333' stroke-width='3'/>")
    b.append("<path d='M160 130 L290 260 M160 260 L290 130' stroke='#e0e0e0' stroke-width='1'/>")
    # Einstichstelle + Katheter mit Schlaufe
    b.append("<circle cx='225' cy='195' r='9' fill='#555'/>")
    b.append("<path d='M225 195 Q330 210 360 160 Q385 110 330 100 Q290 96 300 150 Q310 220 420 250 L520 270' stroke='#222' stroke-width='9' fill='none' stroke-linecap='round'/>")
    # Pflaster
    b.append("<rect x='392' y='222' width='70' height='40' rx='6' transform='rotate(14 427 242)' fill='#cfcfcf' fill-opacity='.85' stroke='#333' stroke-width='2'/>")
    # Marker
    b.append(marker(110, 110, 1) + "<path d='M122 118 L216 190' stroke='#222' stroke-width='1.5'/>")
    b.append(marker(110, 300, 2) + "<path d='M122 292 L152 262' stroke='#222' stroke-width='1.5'/>")
    b.append(marker(380, 80, 3) + "<path d='M370 90 L355 112' stroke='#222' stroke-width='1.5'/>")
    b.append(marker(470, 320, 4) + "<path d='M462 308 L440 264' stroke='#222' stroke-width='1.5'/>")
    # Legende
    lx = 570
    b.append(label(lx, 60, "1  Einstichstelle: täglich beurteilen", "start", 16, "700"))
    b.append(label(lx, 92, "2  sterile Schlitzkompresse", "start", 16, "700"))
    b.append(label(lx, 124, "3  Schlaufe: Katheter liegt zugfrei,", "start", 16, "700"))
    b.append(label(lx + 22, 146, "nicht abgeknickt", "start", 16, "700"))
    b.append(label(lx, 178, "4  Fixierung mit Pflaster", "start", 16, "700"))
    # Desinfektion von innen nach außen
    b.append("<g transform='translate(700 280)'>"
             "<circle cx='0' cy='0' r='6' fill='#555'/>"
             "<path d='M0 -14 A14 14 0 1 1 -14 0 M0 -32 A32 32 0 1 1 -32 0 M0 -50 A50 50 0 1 1 -50 0' stroke='#222' stroke-width='2.5' fill='none' marker-end='url(#pf)'/>"
             "</g>")
    b.append(label(700, 352, "Desinfektion: kreisförmig", "middle", 15, "700"))
    b.append(label(700, 372, "von innen nach außen", "middle", 15, "700"))
    return svg(900, 390, "".join(b))


def miktion():
    """Ablauf Miktionsversuch."""
    b = [DEFS]
    boxes = [
        ("1", "Klemme zu", "SPK nach ärztlicher|Anordnung abklemmen"),
        ("2", "Wasser lassen", "bei Harndrang selbst|Wasser lassen, messen"),
        ("3", "Klemme auf", "Restharn läuft über|den SPK ab: messen"),
        ("4", "Dokumentieren", "Uhrzeit, Spontanurin,|Restharn, Befinden"),
    ]
    w, h, gap, y = 200, 128, 34, 40
    for k, (n, t, sub) in enumerate(boxes):
        x = 20 + k * (w + gap)
        b.append(f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='14' fill='#f2f2f2' stroke='#333' stroke-width='3'/>")
        b.append(marker(x + 26, y + 28, n))
        b.append(label(x + 48, y + 34, t, "start", 17, "700"))
        b.append(label(x + 16, y + 72, sub, "start", 15))
        if k < len(boxes) - 1:
            b.append(f"<path d='M{x + w + 4} {y + h / 2} L{x + w + gap - 6} {y + h / 2}' stroke='#222' stroke-width='3' marker-end='url(#pf)'/>")
    # Abbruch
    b.append("<rect x='20' y='200' width='490' height='96' rx='14' fill='#ffffff' stroke='#000' stroke-width='3'/>")
    b.append(label(36, 228, "❗ Klemme sofort öffnen, wenn …", "start", 16, "700"))
    b.append(label(36, 254, "starke Schmerzen, Druck oder Unruhe · Urin an der|Einstichstelle · kein Wasserlassen trotz Harndrang", "start", 15))
    b.append("<rect x='530' y='200' width='390' height='96' rx='14' fill='#e6e6e6' stroke='#333' stroke-width='3'/>")
    b.append(label(546, 228, "Restharn dauerhaft gering?", "start", 16, "700"))
    b.append(label(546, 254, "→ Ärztin/Arzt entscheidet über die|Entfernung des SPK (Grenzwert laut Anordnung)", "start", 15))
    return svg(940, 310, "".join(b))


(OUT / "spk-lage.svg").write_text(lage(), encoding="utf-8")
(OUT / "spk-verband.svg").write_text(verband(), encoding="utf-8")
(OUT / "spk-miktion.svg").write_text(miktion(), encoding="utf-8")
print("ok", sorted(p.name for p in OUT.glob("*.svg")))
