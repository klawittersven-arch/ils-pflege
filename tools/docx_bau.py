"""Bausteine, um auf Basis der AB-Vorlage (Karoline-Breitinger-Schule) Word-Dateien zu erzeugen.

Die Vorlage wird entpackt, Kopf-/Fußzeile, Formatvorlagen und Seitenränder bleiben erhalten.
Nur der Inhalt von word/document.xml wird ersetzt.
"""
import re
import shutil
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

EMU_PER_CM = 360000
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿⭐⬆↔-⇿⌚-⏿]️?")
GREY_BORDER = "B7B7B7"
TABLE_W = 9060


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


class Doc:
    def __init__(self, template, workdir):
        self.work = Path(workdir)
        if self.work.exists():
            shutil.rmtree(self.work)
        with zipfile.ZipFile(template) as z:
            z.extractall(self.work)
        self.body = []
        self.rels = []
        self.next_rid = 100
        self.next_pic = 5000
        self.next_num = 200
        self.nums = []
        self.header_replace = {}
        # Bild der Vorlage (Diabetes) entfernen
        rels = (self.work / "word/_rels/document.xml.rels").read_text(encoding="utf-8")
        m = re.search(r'<Relationship Id="rId8"[^>]*Target="(media/[^"]+)"/>', rels)
        if m:
            rels = rels.replace(m.group(0), "")
            (self.work / "word" / m.group(1)).unlink(missing_ok=True)
            (self.work / "word/_rels/document.xml.rels").write_text(rels, encoding="utf-8")

    # ------------------------------------------------------------ Text
    @staticmethod
    def runs(text, size=None, bold=False, italic=False, color=None):
        """**fett**, __kursiv__; Emojis bekommen die Emoji-Schrift."""
        out = []
        parts = re.split(r"(\*\*.+?\*\*|__.+?__)", text)
        for part in parts:
            if not part:
                continue
            b, i, t = bold, italic, part
            if part.startswith("**") and part.endswith("**"):
                b, t = True, part[2:-2]
            elif part.startswith("__") and part.endswith("__"):
                i, t = True, part[2:-2]
            pos = 0
            for m in EMOJI.finditer(t):
                if m.start() > pos:
                    out.append(Doc._run(t[pos:m.start()], size, b, i, color))
                out.append(Doc._run(m.group(0), size, b, i, color, font="Segoe UI Emoji"))
                pos = m.end()
            if pos < len(t):
                out.append(Doc._run(t[pos:], size, b, i, color))
        return "".join(out)

    @staticmethod
    def _run(t, size, b, i, color, font=None):
        rpr = ""
        if font:
            rpr += f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/>'
        if b:
            rpr += "<w:b/><w:bCs/>"
        if i:
            rpr += "<w:i/><w:iCs/>"
        if color:
            rpr += f'<w:color w:val="{color}"/>'
        if size:
            rpr += f'<w:sz w:val="{int(size * 2)}"/><w:szCs w:val="{int(size * 2)}"/>'
        return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{escape(t)}</w:t></w:r>'

    @staticmethod
    def ppr(before=0, after=0, keep=False, align=None, num=None, ind=None, shade=None, page_break_before=False, keep_lines=False):
        x = ""
        if keep:
            x += "<w:keepNext/>"
        if keep_lines:
            x += "<w:keepLines/>"
        if page_break_before:
            x += "<w:pageBreakBefore/>"
        if num is not None:
            x += f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num}"/></w:numPr>'
        if shade:
            x += f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>'
        x += f'<w:spacing w:before="{before}" w:after="{after}" w:line="240" w:lineRule="auto"/>'
        if ind:
            x += ind
        if align:
            x += f'<w:jc w:val="{align}"/>'
        return f"<w:pPr>{x}</w:pPr>"

    def p_xml(self, text="", size=None, bold=False, italic=False, before=0, after=0, keep=False, align=None, color=None, **kw):
        return f"<w:p>{self.ppr(before, after, keep, align, **kw)}{self.runs(text, size, bold, italic, color)}</w:p>"

    def add(self, xml):
        self.body.append(xml)

    def p(self, text="", **kw):
        self.add(self.p_xml(text, **kw))

    def space(self, pt=6):
        self.add(f'<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="{pt * 2}"/></w:rPr></w:pPr></w:p>')

    def h1(self, text, page_break=False):
        # wie in der Vorlage: fett, 16 pt
        self.add(self.p_xml(text, size=16, bold=True, after=80, keep=True, page_break_before=page_break))

    def h2(self, text, page_break=False, before=200):
        self.add(self.p_xml(text, size=13, bold=True, before=before, after=60, keep=True, page_break_before=page_break))

    def h3(self, text, before=120):
        self.add(self.p_xml(text, size=11, bold=True, before=before, after=20, keep=True))

    def page_break(self):
        self.add('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    # ------------------------------------------------------------ Listen
    def _new_num(self, abstract):
        nid = self.next_num
        self.next_num += 1
        self.nums.append(f'<w:num w:numId="{nid}"><w:abstractNumId w:val="{abstract}"/>'
                         f'<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>')
        return nid

    def list_xml(self, items, kind="bullet", after_last=0):
        abstract = {"bullet": 900, "decimal": 901, "letter": 902, "check": 903}[kind]
        nid = self._new_num(abstract)
        out = []
        for k, it in enumerate(items):
            out.append(f'<w:p>{self.ppr(0, after_last if k == len(items) - 1 else 20, num=nid)}{self.runs(it)}</w:p>')
        return "".join(out)

    def bullets(self, items, **kw):
        self.add(self.list_xml(items, "bullet", **kw))

    def steps(self, items, **kw):
        self.add(self.list_xml(items, "decimal", **kw))

    # ------------------------------------------------------------ Bilder
    def _image_rel(self, path):
        rid = f"rId{self.next_rid}"
        self.next_rid += 1
        name = f"bild{self.next_rid}{Path(path).suffix}"
        shutil.copy(path, self.work / "word/media" / name)
        self.rels.append(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{name}"/>')
        return rid

    def image_run(self, path, width_cm, anchor_right=False, descr=""):
        w, h = png_size(path)
        cx = int(width_cm * EMU_PER_CM)
        cy = int(cx * h / w)
        rid = self._image_rel(path)
        pid = self.next_pic
        self.next_pic += 1
        graphic = (
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{pid}" name="Bild {pid}" descr="{escape(descr)}"/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            '</pic:pic></a:graphicData></a:graphic>')
        locks = '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        if anchor_right:
            return ('<w:r><w:drawing><wp:anchor distT="0" distB="45720" distL="114300" distR="0" simplePos="0" relativeHeight="251658240" '
                    'behindDoc="0" locked="0" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/>'
                    '<wp:positionH relativeFrom="column"><wp:align>right</wp:align></wp:positionH>'
                    '<wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>'
                    f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="left"/>'
                    f'<wp:docPr id="{pid}" name="Bild {pid}" descr="{escape(descr)}"/>{locks}{graphic}</wp:anchor></w:drawing></w:r>')
        return (f'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
                f'<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{pid}" name="Bild {pid}" descr="{escape(descr)}"/>{locks}{graphic}</wp:inline></w:drawing></w:r>')

    def image(self, path, width_cm, caption=None, descr=""):
        self.add(f'<w:p>{self.ppr(60, 0 if caption else 60, keep=bool(caption), align="center")}{self.image_run(path, width_cm, descr=descr)}</w:p>')
        if caption:
            self.add(self.p_xml(caption, size=9, italic=True, after=80, align="center", color="404040"))

    # ------------------------------------------------------------ Tabellen
    @staticmethod
    def _borders(color=GREY_BORDER, sz=4):
        return "".join(f'<w:{s} w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>' for s in ("top", "left", "bottom", "right", "insideH", "insideV"))

    @staticmethod
    def cell(content_xml, width, fill=None, valign="top", borders=None, span=None, margins=(80, 110, 80, 110)):
        tcpr = f'<w:tcW w:w="{width}" w:type="dxa"/>'
        if span:
            tcpr += f'<w:gridSpan w:val="{span}"/>'
        if borders:
            tcpr += f"<w:tcBorders>{borders}</w:tcBorders>"
        if fill:
            tcpr += f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>'
        t, l, b, r = margins
        tcpr += (f'<w:tcMar><w:top w:w="{t}" w:type="dxa"/><w:left w:w="{l}" w:type="dxa"/>'
                 f'<w:bottom w:w="{b}" w:type="dxa"/><w:right w:w="{r}" w:type="dxa"/></w:tcMar>')
        tcpr += f'<w:vAlign w:val="{valign}"/>'
        if not content_xml.strip().endswith("</w:p>"):
            content_xml += "<w:p/>"
        return f"<w:tc><w:tcPr>{tcpr}</w:tcPr>{content_xml}</w:tc>"

    def table_xml(self, rows_xml, widths, border_color=GREY_BORDER, border_sz=4, cant_split=True, header_row=False):
        grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
        rows = ""
        for k, r in enumerate(rows_xml):
            trpr = ("<w:cantSplit/>" if cant_split else "") + ("<w:tblHeader/>" if header_row and k == 0 else "")
            rows += f"<w:tr><w:trPr>{trpr}</w:trPr>{r}</w:tr>"
        return (f'<w:tbl><w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/><w:jc w:val="center"/>'
                f"<w:tblBorders>{self._borders(border_color, border_sz)}</w:tblBorders>"
                '<w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
                f"</w:tblPr><w:tblGrid>{grid}</w:tblGrid>{rows}</w:tbl>")

    def table(self, header, rows, widths, size=10, header_fill="D9D9D9", zebra=None, first_col_bold=False):
        out = []
        if header:
            out.append("".join(self.cell(self.p_xml(h, size=size, bold=True, keep=True), w, header_fill) for h, w in zip(header, widths)))
        for k, row in enumerate(rows):
            cells = []
            for j, (c, w) in enumerate(zip(row, widths)):
                if isinstance(c, list):
                    content = self.list_xml(c, "bullet") if c else self.p_xml("")
                else:
                    content = "".join(self.p_xml(line, size=size, bold=(first_col_bold and j == 0), after=20) for line in c.split("\n"))
                cells.append(self.cell(content, w, zebra if (zebra and k % 2) else None))
            out.append("".join(cells))
        self.add(self.table_xml(out, widths, header_row=bool(header)))
        self.space(4)

    def box(self, content_xml, fill="F2F2F2", border_color=GREY_BORDER, border_sz=4):
        """Grauer Kasten wie in der Vorlage."""
        self.add(self.table_xml([self.cell(content_xml, TABLE_W, fill)], [TABLE_W], border_color, border_sz, cant_split=False))
        self.space(6)

    def merke(self, title, items):
        content = self.p_xml(f"❗ {title}", bold=True, after=40, keep=True) + self.list_xml(items, "bullet")
        self.add(self.table_xml([self.cell(content, TABLE_W, "FFFFFF")], [TABLE_W], "000000", 12))
        self.space(6)

    def lernziel(self, text):
        self.add(self.p_xml(f"🎯 **Lernziel:** {text}", before=0, after=60))

    def qr_task(self, qr_png, title, lines, url_text, baustein_nr=None, grenze="Ab 80 % richtig"):
        left = f'<w:p>{self.ppr(0, 0, align="center")}{self.image_run(qr_png, 2.9, descr=url_text)}</w:p>'
        mid = self.p_xml(f"📱 {title}", bold=True, after=40, keep=True)
        mid += "".join(self.p_xml(l, size=10, after=20) for l in lines)
        mid += self.p_xml(f"Link: {url_text}", size=8, color="404040", before=40)
        widths = [1900, 4560, 2600] if baustein_nr else [1900, 7160]
        cells = [self.cell(left, widths[0], "FFFFFF", "center"), self.cell(mid, widths[1], "F2F2F2", "center")]
        if baustein_nr:
            right = self.p_xml(f"✍️ Baustein {baustein_nr}:", bold=True, size=10, after=0)
            right += self.p_xml("", after=600)
            right += self.p_xml(grenze, size=8, color="404040", align="right")
            cells.append(self.cell(right, widths[2], "FFFFFF", "top"))
        self.add(self.table_xml(["".join(cells)], widths, "595959", 8))
        self.space(6)

    # ------------------------------------------------------------ Speichern
    def save(self, out_path, footer_text=None):
        w = self.work
        doc = (w / "word/document.xml").read_text(encoding="utf-8")
        start = doc.index("<w:body>") + len("<w:body>")
        sect = doc.index("<w:sectPr")
        doc = doc[:start] + "".join(self.body) + doc[sect:]
        (w / "word/document.xml").write_text(doc, encoding="utf-8")

        if self.header_replace:
            h_p = w / "word/header1.xml"
            h = h_p.read_text(encoding="utf-8")
            for old, new in self.header_replace.items():
                assert old in h, old
                h = h.replace(old, new)
            h_p.write_text(h, encoding="utf-8")

        rels_p = w / "word/_rels/document.xml.rels"
        rels = rels_p.read_text(encoding="utf-8").replace("</Relationships>", "".join(self.rels) + "</Relationships>")
        rels_p.write_text(rels, encoding="utf-8")

        num_p = w / "word/numbering.xml"
        num = num_p.read_text(encoding="utf-8")
        abstracts = (
            self._abstract(900, "bullet", "•", 284, 227, font="Arial")
            + self._abstract(901, "decimal", "%1.", 360, 360)
            + self._abstract(902, "lowerLetter", "%1)", 360, 360)
            + self._abstract(903, "bullet", "☐", 360, 360, font="Segoe UI Symbol")
        )
        first_num = num.index("<w:num ")
        num = num[:first_num] + abstracts + num[first_num:]
        last = num.rindex("</w:num>") + len("</w:num>")
        num = num[:last] + "".join(self.nums) + num[last:]
        num_p.write_text(num, encoding="utf-8")

        if footer_text is not None:
            f_p = w / "word/footer1.xml"
            f = f_p.read_text(encoding="utf-8")
            para = ('<w:p><w:pPr><w:pStyle w:val="Fuzeile"/><w:jc w:val="right"/></w:pPr>'
                    f'<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">{escape(footer_text)}   Seite </w:t></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve"> von </w:t></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r>'
                    '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p>')
            m = re.search(r"<w:p[ >].*</w:p>", f, re.S)
            f = f[:m.start()] + para + f[m.end():] if m else f.replace("</w:ftr>", para + "</w:ftr>")
            f_p.write_text(f, encoding="utf-8")

        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if out_path.exists():
            out_path.unlink()
        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
            ct = w / "[Content_Types].xml"
            z.write(ct, "[Content_Types].xml")
            for f in sorted(w.rglob("*")):
                if f.is_file() and f != ct:
                    z.write(f, f.relative_to(w).as_posix())
        return out_path

    @staticmethod
    def _abstract(aid, fmt, text, left, hanging, font=None):
        rpr = f'<w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:hint="default"/></w:rPr>' if font else ""
        return (f'<w:abstractNum w:abstractNumId="{aid}"><w:multiLevelType w:val="singleLevel"/>'
                f'<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="{fmt}"/><w:lvlText w:val="{text}"/>'
                f'<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="{left}" w:hanging="{hanging}"/></w:pPr>{rpr}</w:lvl></w:abstractNum>')
