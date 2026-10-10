"""Gemeinsamer Baukasten für die Übungsseiten aller ILS-Aufträge.

Jeder ILS-Auftrag ist ein „Thema“ mit eigenem Ordner (z. B. dk/, spk/), eigenem ID-Präfix (DK, SPK)
und eigenen Lösungswörtern (Bausteinen) in tools/bausteine.json (wird NICHT veröffentlicht).
"""
import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XKEY = "KBS-ILS-2026"
MAIL = "Sven.Klawitter@Karoline-Breitinger-Schule.de"
THEMEN = [
    ("dk/", "Transurethraler Dauerkatheter (DK)"),
    ("spk/", "Suprapubischer Katheter (SPK)"),
]


def enc(word):
    raw = bytes(ord(c) ^ ord(XKEY[i % len(XKEY)]) for i, c in enumerate(word))
    return base64.b64encode(raw).decode()


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def bausteine(prefix):
    return json.loads((ROOT / "tools/bausteine.json").read_text(encoding="utf-8"))[prefix]


def page(path, title, kicker, body, depth=2, footer_thema=""):
    up = "../" * depth
    html = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{title}</title>
<link rel="stylesheet" href="{up}assets/ils.css">
</head>
<body>
<header class="top"><div class="wrap"><div class="kicker">{kicker}</div><h1>{title}</h1></div></header>
<main>
{body}
<footer>Karoline-Breitinger-Schule · ILS-Auftrag „{footer_thema}“ · 3BFP2<br>Diese Seite speichert keine Daten auf einem Server.</footer>
</main>
<script src="{up}assets/ils.js"></script>
</body>
</html>
"""
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")


def startseite():
    links = "".join(f'<a class="btn secondary block" href="{href}">{name}</a>' for href, name in THEMEN)
    page("index.html", "ILS-Aufträge Pflege", "Karoline-Breitinger-Schule", f"""
<div class="card intro">Interaktive Übungen zu ILS-Aufträgen der Pflegeausbildung.</div>
<div class="links">{links}</div>
""", depth=0, footer_thema="Pflege")


class Thema:
    def __init__(self, slug, prefix, titel, kurz):
        self.slug, self.prefix, self.titel, self.kurz = slug, prefix, titel, kurz
        self.bausteine = bausteine(prefix)

    def page(self, path, title, kicker, body, depth=2):
        page(path, title, kicker, body, depth, footer_thema=self.titel)

    def uebung(self, nr, title, intro, questions, hint, pass_ratio=0.8):
        data = json.dumps(questions, ensure_ascii=False, indent=1)
        body = f"""<div id="app"></div>
<script>
document.addEventListener('DOMContentLoaded', () => ILS.quiz({{
  mount: '#app',
  intro: {json.dumps(intro, ensure_ascii=False)},
  pass: {pass_ratio},
  baustein: '{enc(self.bausteine[nr - 1])}',
  storeKey: 'ils-{self.slug}-b{nr}',
  hint: {json.dumps(hint, ensure_ascii=False)},
  questions: {data}
}}));
</script>"""
        self.page(f"{self.slug}/{nr}/index.html", title, f"ILS {self.kurz} · Übung {nr} von {len(self.bausteine)}", body)

    def ende(self, pool):
        s, P, MAILX = self.slug, self.prefix, MAIL
        checks = [sha(f"{P}|{i + 1}|{w}") for i, w in enumerate(self.bausteine)]
        key_hash = sha(f"{P}|KEY|{'-'.join(self.bausteine)}")
        self.page(f"{s}/ende/index.html", "Abschluss: Quiz und persönliche ID", f"ILS {self.kurz} · Abschluss", f"""
<div id="step1">
  <div class="card intro"><strong>Fast geschafft!</strong> Geben Sie Ihren Namen und Ihre 5 Bausteine ein.
  Danach machen Sie ein kurzes Abschlussquiz (10 Fragen). Dann bekommen Sie Ihre persönliche ID.</div>
  <div class="card">
    <div class="grid2">
      <div class="field"><label for="vn">Vorname</label><input id="vn" autocomplete="given-name" placeholder="z. B. Lena"></div>
      <div class="field"><label for="nn">1. Buchstabe Nachname</label><input id="nn" maxlength="1" autocomplete="off" placeholder="z. B. M"></div>
    </div>
    <p class="small">Schreiben Sie Ihren Vornamen so, wie Sie ihn auch in der Schule benutzen.</p>
  </div>
  <div class="card" id="bs"></div>
  <p id="msg1" class="fb"></p>
  <button class="btn block" id="go1" type="button">Weiter zum Abschlussquiz</button>
</div>
<div id="step2" class="hidden"><div id="quiz"></div></div>
<div id="step3" class="hidden">
  <div class="card">
    <p><strong>Herzlichen Glückwunsch, <span id="nm"></span>!</strong> Sie haben den ILS-Auftrag abgeschlossen. Ihre persönliche ID:</p>
    <div class="idbox" id="id"></div>
    <p>Schreiben Sie die ID auch auf Ihr Arbeitsblatt.</p>
  </div>
  <h2>Jetzt die E-Mail schicken</h2>
  <div class="card">
    <ol class="steps">
      <li>An: <b>{MAILX}</b></li>
      <li>Betreff: <span class="subject" id="subj"></span></li>
      <li>Der Text der E-Mail darf leer bleiben.</li>
    </ol>
    <p><a class="btn block" id="mailto" href="#">✉️ E-Mail-Programm öffnen</a></p>
    <p><button class="btn secondary block" id="copy" type="button">Betreff kopieren</button></p>
    <p class="small">Funktioniert der Knopf nicht? Dann schreiben Sie die E-Mail selbst (z. B. in Outlook oder im Web-Mail). Wichtig ist nur der Betreff.</p>
  </div>
</div>
<script>
const CHECKS = {json.dumps(checks)};
const KEYHASH = '{key_hash}';
const POOL = {json.dumps(pool, ensure_ascii=False)};
const MAIL = '{MAILX}';
document.addEventListener('DOMContentLoaded', () => {{
  const $ = (s) => document.querySelector(s);
  const bs = $('#bs');
  bs.append(ILS.el('div', {{ class: 'q-text' }}, 'Ihre Bausteine aus den Übungen 1–5'));
  const inputs = CHECKS.map((_, i) => {{
    const inp = ILS.el('input', {{ id: 'b' + (i + 1), autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' }});
    inp.value = ILS.store.get('ils-{s}-b' + (i + 1)) || '';
    bs.append(ILS.el('div', {{ class: 'field' }}, ILS.el('label', {{ for: 'b' + (i + 1) }}, `Baustein aus Übung ${{i + 1}}`), inp));
    return inp;
  }});
  let words = [], vn = '', nn = '';
  $('#go1').addEventListener('click', async () => {{
    const msg = $('#msg1');
    vn = $('#vn').value.trim(); nn = $('#nn').value.trim();
    if (ILS.normName(vn).length < 2 || ILS.normName(nn).length !== 1) {{
      msg.className = 'fb show bad'; msg.textContent = 'Bitte Vorname und den 1. Buchstaben des Nachnamens eingeben.'; return;
    }}
    words = inputs.map((x) => ILS.normWord(x.value));
    const bad = [];
    for (let i = 0; i < words.length; i++) {{
      const ok = (await ILS.sha256hex(`{P}|${{i + 1}}|${{words[i]}}`)) === CHECKS[i];
      inputs[i].className = ok ? 'ok' : 'bad';
      if (!ok) bad.push(i + 1);
    }}
    if (bad.length) {{
      msg.className = 'fb show bad';
      msg.textContent = `Diese Bausteine stimmen nicht: Übung ${{bad.join(', ')}}. Prüfen Sie die Schreibweise oder machen Sie die Übung noch einmal.`;
      return;
    }}
    msg.className = 'fb';
    $('#step1').classList.add('hidden');
    $('#step2').classList.remove('hidden');
    startQuiz();
    window.scrollTo(0, 0);
  }});

  function startQuiz() {{
    const qs = ILS.shuffle(POOL).slice(0, 10);
    ILS.quiz({{
      mount: '#quiz', pass: 0.8, questions: qs,
      intro: '<strong>Abschlussquiz:</strong> 10 Fragen aus allen Abschnitten. Ab 8 richtigen Antworten bekommen Sie Ihre ID. Wenn es nicht klappt, bekommen Sie neue Fragen.',
      hint: 'Lesen Sie die Themen im Infotext noch einmal und versuchen Sie es mit neuen Fragen.',
      onFail: (box) => box.append(ILS.el('button', {{ class: 'btn secondary block', type: 'button', onclick: () => {{ startQuiz(); window.scrollTo(0, 0); }} }}, 'Neue Fragen')),
      onPass: async (box) => {{
        const key = words.join('-');
        if ((await ILS.sha256hex(`{P}|KEY|${{key}}`)) !== KEYHASH) return;
        const id = await ILS.makeId('{P}', key, vn, nn);
        const name = `${{vn}} ${{nn.toUpperCase()}}.`;
        const subject = `${{name}} ${{id}}`;
        box.append(ILS.el('button', {{ class: 'btn block', type: 'button', onclick: () => {{
          $('#step2').classList.add('hidden'); $('#step3').classList.remove('hidden');
          $('#nm').textContent = vn; $('#id').textContent = id; $('#subj').textContent = subject;
          $('#mailto').href = `mailto:${{MAIL}}?subject=${{encodeURIComponent(subject)}}`;
          window.scrollTo(0, 0);
        }} }}, 'Weiter zu meiner ID'));
      }},
    }});
  }}

  $('#copy').addEventListener('click', async () => {{
    try {{ await navigator.clipboard.writeText($('#subj').textContent); $('#copy').textContent = 'Kopiert ✓'; }}
    catch (e) {{ $('#copy').textContent = 'Bitte Betreff abschreiben'; }}
  }});
}});
</script>
""")

# ---------------------------------------------------------------- Lehrkraft

    def lehrkraft(self):
        s, P = self.slug, self.prefix
        key_hash = sha(f"{P}|KEY|{'-'.join(self.bausteine)}")
        self.page(f"{s}/lehrkraft/index.html", "Prüfseite für die Lehrkraft", f"ILS {self.kurz} · nur für Lehrkräfte", f"""
<div class="card intro">Kopieren Sie die Betreffzeilen der E-Mails hier hinein (eine pro Zeile). Die Seite prüft, ob Name und ID zusammenpassen.
Es werden keine Daten gesendet oder gespeichert.</div>
<div class="card">
  <div class="field"><label for="key">Schlüssel (steht im Lehrkraft-Link oder in Ihrer Lehrkraft-Info)</label><input id="key" autocomplete="off" spellcheck="false"></div>
  <p id="keymsg" class="small"></p>
  <div class="field"><label for="lines">Betreffzeilen (z. B. „Lena M. {P}-1A2B-3C4D“)</label><textarea id="lines" rows="10" spellcheck="false"></textarea></div>
  <div class="field"><label for="klasse">Optional: Klassenliste (eine Person pro Zeile, „Vorname N.“) – zeigt, wer noch fehlt</label><textarea id="klasse" rows="5" spellcheck="false"></textarea></div>
  <button class="btn block" id="check" type="button">Prüfen</button>
</div>
<div class="card hidden" id="out"></div>
<script>
const KEYHASH = '{key_hash}';
document.addEventListener('DOMContentLoaded', () => {{
  const $ = (s) => document.querySelector(s);
  const m = location.hash.match(/k=([^&]+)/);
  if (m) $('#key').value = decodeURIComponent(m[1]);
  const keyOk = async () => {{
    const k = $('#key').value.split('-').map(ILS.normWord).join('-');
    const ok = (await ILS.sha256hex(`{P}|KEY|${{k}}`)) === KEYHASH;
    $('#keymsg').textContent = ok ? '✓ Schlüssel korrekt' : '✗ Schlüssel falsch';
    $('#keymsg').style.color = ok ? 'var(--ok)' : 'var(--bad)';
    return ok ? k : null;
  }};
  $('#key').addEventListener('change', keyOk);
  keyOk();

  $('#check').addEventListener('click', async () => {{
    const key = await keyOk();
    const out = $('#out');
    out.classList.remove('hidden');
    if (!key) {{ out.textContent = 'Bitte zuerst den richtigen Schlüssel eingeben.'; return; }}
    const rows = [];
    const valid = new Set();
    for (const raw of $('#lines').value.split(/\\n/)) {{
      const line = raw.trim();
      if (!line) continue;
      const mm = line.match(/{P}-?([0-9A-F]{{4}})-?([0-9A-F]{{4}})/i);
      if (!mm) {{ rows.push([line, '', false, 'keine ID gefunden']); continue; }}
      const id = `{P}-${{mm[1]}}-${{mm[2]}}`.toUpperCase();
      const before = line.slice(0, mm.index).replace(/^(re|aw|wg|fw|fwd)\\s*:\\s*/i, '').trim();
      const toks = before.split(/[\\s,;|–—-]+/).filter(Boolean);
      let hit = null;
      for (let j = toks.length - 1; j >= 1 && !hit; j--) {{
        const ini = toks[j].replace(/\\./g, '');
        if (ILS.normName(ini).length !== 1) continue;
        for (let k = 1; k <= Math.min(3, j) && !hit; k++) {{
          const vn = toks.slice(j - k, j).join('');
          if ((await ILS.makeId('{P}', key, vn, ini)) === id) hit = `${{toks.slice(j - k, j).join(' ')}} ${{ini.toUpperCase()}}.`;
        }}
      }}
      if (hit) valid.add(ILS.normName(hit));
      rows.push([hit || before || line, id, !!hit, hit ? '' : 'Name und ID passen nicht zusammen']);
    }}
    out.innerHTML = '';
    const tbl = ILS.el('table', {{ class: 'check' }}, ILS.el('tr', {{}}, ILS.el('th', {{}}, 'Name'), ILS.el('th', {{}}, 'ID'), ILS.el('th', {{}}, 'Ergebnis')));
    rows.forEach(([n, id, ok, why]) => tbl.append(ILS.el('tr', {{}}, ILS.el('td', {{}}, n), ILS.el('td', {{}}, id),
      ILS.el('td', {{ class: 'st ' + (ok ? 'ok' : 'bad') }}, ok ? '✓ gültig' : '✗ ' + why))));
    const okCount = rows.filter((r) => r[2]).length;
    out.append(ILS.el('p', {{}}, ILS.el('b', {{}}, `${{okCount}} von ${{rows.length}} gültig`)), tbl);
    const klasse = $('#klasse').value.split(/\\n/).map((s) => s.trim()).filter(Boolean);
    if (klasse.length) {{
      const fehlt = klasse.filter((n) => !valid.has(ILS.normName(n)));
      out.append(ILS.el('h2', {{}}, `Noch keine gültige ID (${{fehlt.length}})`),
        fehlt.length ? ILS.el('ul', {{}}, ...fehlt.map((n) => ILS.el('li', {{}}, n))) : ILS.el('p', {{}}, 'Alle haben eine gültige ID geschickt. 🎉'));
    }}
  }});
}});
</script>
""")

    def uebersicht(self, links):
        """links: Liste (href, Text); der letzte Eintrag wird hervorgehoben."""
        items = "\n".join(f'<a class="btn {'block' if k == len(links) - 1 else 'secondary block'}" href="{h}">{t}</a>' for k, (h, t) in enumerate(links))
        self.page(f"{self.slug}/index.html", f"ILS-Auftrag: {self.titel}", "Karoline-Breitinger-Schule · 3BFP2", f"""
<div class="card intro">Hier finden Sie alle Übungen zum Arbeitsblatt. Arbeiten Sie in dieser Reihenfolge.</div>
<div class="links">
{items}
</div>
""", depth=1)
