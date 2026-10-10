/* ILS-Übungen – gemeinsame Logik für alle Übungsseiten.
   Keine Daten verlassen das Gerät: Es gibt keinen Server und keine Speicherung außer
   (optional) im Browser des Geräts (localStorage), damit Bausteine nicht verloren gehen. */
const ILS = (() => {
  const XKEY = 'KBS-ILS-2026';

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
    return n;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const decode = (b64) => {
    const raw = atob(b64);
    let out = '';
    for (let i = 0; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ XKEY.charCodeAt(i % XKEY.length));
    return out;
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privater Modus: egal */ } },
  };

  const sha256hex = async (str) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Namen vereinheitlichen: Groß/Klein, Umlaute, Akzente, Leer- und Sonderzeichen spielen keine Rolle.
  const normName = (s) => s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

  const normWord = (s) => s.toUpperCase()
    .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
    .replace(/[^A-Z]/g, '');

  const makeId = async (prefix, key, vorname, initial) => {
    const h = await sha256hex(`${prefix}|${normName(vorname)}|${normName(initial).slice(0, 1)}|${key}`);
    return `${prefix}-${h.slice(0, 4)}-${h.slice(4, 8)}`.toUpperCase();
  };

  // Persönlicher Baustein: WORT-123. Die 3 Ziffern hängen vom Namen ab – ein Baustein gilt nur für diese Person.
  const personalDigits = async (prefix, nr, word, vorname, initial) => {
    const h = await sha256hex(`SFX|${prefix}|${nr}|${normWord(word)}|${normName(vorname)}|${normName(initial).slice(0, 1)}`);
    return String(parseInt(h.slice(0, 8), 16) % 1000).padStart(3, '0');
  };
  const nameStore = {
    get: () => ({ vn: store.get('ils-vorname') || '', nn: store.get('ils-initial') || '' }),
    set: (vn, nn) => { store.set('ils-vorname', vn); store.set('ils-initial', nn); },
  };
  const nameOk = (vn, nn) => normName(vn).length >= 2 && normName(nn).length === 1;

  // Längste aufsteigende Teilfolge: Wie viele Schritte stehen in der richtigen Reihenfolge?
  // Liefert die Positionen dieser Schritte – alle anderen müssen noch verschoben werden.
  const lisPositions = (seq) => {
    const tails = [], tailPos = [], prev = new Array(seq.length).fill(-1);
    seq.forEach((x, pos) => {
      let lo = 0, hi = tails.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < x) lo = m + 1; else hi = m; }
      tails[lo] = x; tailPos[lo] = pos;
      prev[pos] = lo > 0 ? tailPos[lo - 1] : -1;
    });
    const out = new Set();
    for (let pos = tails.length ? tailPos[tails.length - 1] : -1; pos >= 0; pos = prev[pos]) out.add(pos);
    return out;
  };
  const lis = (seq) => lisPositions(seq).size;

  /* ---------- Fragetypen ----------
     mc:     { type:'mc', q, options:[...], correct:i, explain, keep:true (Reihenfolge der Optionen behalten) }
     tf:     { type:'tf', q, correct:true|false, explain }
     select: { type:'select', q, options:[...], correct:i, explain }
     order:  { type:'order', q, items:[... in richtiger Reihenfolge], explain }  (frei verschiebbar, nach dem Auswerten grün/rot)
     errors: { type:'errors', q, sentences:[{ t, wrong:bool, explain }] }
  */
  const renderQuestion = (q, idx) => {
    const card = el('div', { class: 'card' });
    const fb = el('div', { class: 'fb', 'aria-live': 'polite' });
    card.append(el('div', { class: 'q-num' }, `Aufgabe ${idx + 1}`));
    if (q.q) card.append(el('div', { class: 'q-text', html: q.q }));
    if (q.img) card.append(el('div', { class: 'figure' }, el('a', { href: q.img, target: '_blank', rel: 'noopener' }, el('img', { src: q.img, alt: q.imgAlt || '' })), el('div', { class: 'small' }, 'Bild antippen zum Vergrößern')));
    const name = `q${idx}`;
    let api;

    if (q.type === 'mc' || q.type === 'tf') {
      const opts = q.type === 'tf'
        ? [{ t: 'Richtig', v: true }, { t: 'Falsch', v: false }]
        : (q.keep ? q.options.map((t, i) => ({ t, v: i })) : shuffle(q.options.map((t, i) => ({ t, v: i }))));
      const wrap = el('div', { class: 'opts' + (q.type === 'tf' ? ' tf' : '') });
      for (const o of opts) {
        const input = el('input', { type: 'radio', name, value: String(o.v) });
        wrap.append(el('label', { class: 'opt' }, input, el('span', { html: o.t })));
      }
      card.append(wrap);
      api = {
        max: 1,
        answered: () => !!card.querySelector('input:checked'),
        score: () => {
          const c = card.querySelector('input:checked');
          if (!c) return 0;
          return String(q.correct) === c.value ? 1 : 0;
        },
      };
    } else if (q.type === 'select') {
      const sel = el('select', { 'aria-label': q.q.replace(/<[^>]+>/g, '') },
        el('option', { value: '' }, '– bitte wählen –'),
        ...q.options.map((t, i) => el('option', { value: String(i) }, t)));
      card.append(sel);
      api = {
        max: 1,
        answered: () => sel.value !== '',
        score: () => (sel.value === String(q.correct) ? 1 : 0),
      };
    } else if (q.type === 'order') {
      // Alle Schritte stehen in einer Liste und lassen sich frei verschieben:
      // ☰ gedrückt halten und ziehen – oder mit ▲ ▼ schrittweise.
      const list = el('ol', { class: 'order-list' });
      let items = shuffle(q.items.map((t, i) => ({ t, i })));
      for (let k = 0; k < 50 && lis(items.map((it) => it.i)) > Math.ceil(q.items.length / 2); k++) items = shuffle(items);
      const changed = () => {
        list.querySelectorAll('.order-item').forEach((n) => n.classList.remove('ok', 'bad'));
        fb.className = 'fb'; card.classList.remove('ok', 'bad');
      };
      const mk = (it) => {
        const li = el('li', { class: 'order-item' });
        li.dataset.i = it.i;
        const grip = el('span', { class: 'grip', title: 'Gedrückt halten und ziehen', 'aria-hidden': 'true' }, '☰');
        const up = el('button', { type: 'button', class: 'mv', 'aria-label': 'Schritt nach oben' }, '▲');
        const down = el('button', { type: 'button', class: 'mv', 'aria-label': 'Schritt nach unten' }, '▼');
        up.addEventListener('click', () => { if (li.previousElementSibling) { list.insertBefore(li, li.previousElementSibling); changed(); } });
        down.addEventListener('click', () => { if (li.nextElementSibling) { list.insertBefore(li.nextElementSibling, li); changed(); } });
        // Ziehen: Die Bewegung wird am Fenster verfolgt (nicht am Griff), weil das Umsortieren im DOM
        // einen Pointer-Capture aufheben würde. Am Bildschirmrand wird automatisch gescrollt.
        grip.addEventListener('pointerdown', (e) => {
          if (e.button !== undefined && e.button > 0) return;
          e.preventDefault();
          li.classList.add('dragging');
          let y = e.clientY, raf = 0;
          const place = () => {
            const others = Array.from(list.children).filter((n) => n !== li);
            const before = others.find((n) => { const r = n.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
            if (before !== li.nextElementSibling) list.insertBefore(li, before);
          };
          const tick = () => {
            const edge = 80;
            if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 4));
            else if (y > window.innerHeight - edge) window.scrollBy(0, Math.ceil((y - window.innerHeight + edge) / 4));
            place();
            raf = requestAnimationFrame(tick);
          };
          const move = (ev) => { if (ev.pointerId === e.pointerId) { y = ev.clientY; ev.preventDefault(); } };
          const end = (ev) => {
            if (ev.pointerId !== e.pointerId) return;
            cancelAnimationFrame(raf);
            place();
            li.classList.remove('dragging');
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            changed();
          };
          window.addEventListener('pointermove', move, { passive: false });
          window.addEventListener('pointerup', end);
          window.addEventListener('pointercancel', end);
          raf = requestAnimationFrame(tick);
        });
        li.append(grip, el('span', { class: 'txt' }, it.t), el('span', { class: 'mvs' }, up, down));
        return li;
      };
      items.forEach((it) => list.append(mk(it)));
      card.append(el('div', { class: 'order-label' }, 'Verschieben: ☰ gedrückt halten und ziehen – oder ▲ ▼ antippen.'), list);
      const seq = () => Array.from(list.children, (n) => Number(n.dataset.i));
      api = {
        max: q.items.length,
        answered: () => true,
        score: () => lis(seq()),
        detail: (s) => (s === q.items.length
          ? `Alle ${s} Schritte stehen in der richtigen Reihenfolge.`
          : `${s} von ${q.items.length} Schritten stehen in der richtigen Reihenfolge (grün). Die rot markierten Schritte müssen an eine andere Stelle.`),
        mark: () => {
          const ok = lisPositions(seq());
          Array.from(list.children).forEach((n, pos) => { n.classList.remove('ok', 'bad'); n.classList.add(ok.has(pos) ? 'ok' : 'bad'); });
        },
      };
    } else if (q.type === 'errors') {
      const btns = q.sentences.map((s) => {
        const b = el('button', { type: 'button', class: 'sent', 'aria-pressed': 'false' }, s.t);
        b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));
        card.append(b);
        return b;
      });
      api = {
        max: q.sentences.length,
        answered: () => true,
        score: () => q.sentences.reduce((n, s, i) => n + ((btns[i].getAttribute('aria-pressed') === 'true') === s.wrong ? 1 : 0), 0),
        detail: (s) => `${s} von ${q.sentences.length} Sätzen haben Sie richtig beurteilt.`,
        reveal: () => btns.forEach((b, i) => {
          const s = q.sentences[i];
          const right = (b.getAttribute('aria-pressed') === 'true') === s.wrong;
          if (s.wrong) b.insertAdjacentElement('afterend', el('div', { class: 'fb show ' + (right ? 'ok' : 'bad') }, (right ? '✓ Fehler gefunden: ' : '✗ Diesen Fehler haben Sie übersehen: ') + s.explain));
          else if (!right) b.insertAdjacentElement('afterend', el('div', { class: 'fb show bad' }, '✗ Dieser Satz ist richtig. ' + (s.explain || '')));
        }),
      };
    }

    card.append(fb);
    return { card, fb, q, ...api };
  };

  /* ---------- Übung ----------
     cfg: { mount, title, kicker, intro, questions, pass (0..1), baustein (verschlüsselt), storeKey,
            hint (Text bei "nicht bestanden"), onPass(box), onFail(box),
            personal: { prefix, nr } (persönlicher Baustein, fragt nach dem Namen) } */
  const quiz = (cfg) => {
    const root = typeof cfg.mount === 'string' ? document.querySelector(cfg.mount) : cfg.mount;
    root.innerHTML = '';
    if (cfg.intro) root.append(el('div', { class: 'card intro', html: cfg.intro }));
    let nameCard = null, vnIn = null, nnIn = null;
    if (cfg.personal) {
      const saved = nameStore.get();
      vnIn = el('input', { id: 'ils-vn', autocomplete: 'given-name', placeholder: 'z. B. Lena', value: saved.vn });
      nnIn = el('input', { id: 'ils-nn', maxlength: '1', autocomplete: 'off', placeholder: 'z. B. M', value: saved.nn });
      nameCard = el('div', { class: 'card' },
        el('div', { class: 'q-text' }, 'Ihr Name'),
        el('p', { class: 'small' }, 'Ihr Baustein wird für diesen Namen erstellt und gilt nur für Sie. Benutzen Sie in allen Übungen und auf der Abschlussseite denselben Namen.'),
        el('div', { class: 'grid2' },
          el('div', { class: 'field' }, el('label', { for: 'ils-vn' }, 'Vorname'), vnIn),
          el('div', { class: 'field' }, el('label', { for: 'ils-nn' }, '1. Buchstabe Nachname'), nnIn)),
        el('div', { class: 'fb' }));
      root.append(nameCard);
    }
    const qs = cfg.questions.map((q, i) => renderQuestion(q, i));
    let lastHeading = null;
    qs.forEach((r) => {
      if (r.q.section && r.q.section !== lastHeading) { root.append(el('h2', {}, r.q.section)); lastHeading = r.q.section; }
      root.append(r.card);
    });
    const result = el('div', { class: 'card result hidden', 'aria-live': 'polite' });
    const btn = el('button', { type: 'button', class: 'btn block' }, 'Auswerten');
    root.append(btn, result);

    btn.addEventListener('click', async () => {
      if (nameCard) {
        const nfb = nameCard.querySelector('.fb');
        if (!nameOk(vnIn.value, nnIn.value)) {
          nfb.className = 'fb show hint';
          nfb.textContent = 'Bitte geben Sie zuerst Ihren Vornamen und den 1. Buchstaben Ihres Nachnamens ein.';
          nameCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        nfb.className = 'fb';
        nameStore.set(vnIn.value.trim(), nnIn.value.trim());
      }
      const missing = qs.filter((r) => !r.answered());
      if (missing.length) {
        missing.forEach((r) => { r.fb.className = 'fb show hint'; r.fb.textContent = 'Bitte beantworten Sie diese Aufgabe noch.'; });
        missing[0].card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      let total = 0, max = 0;
      const scores = qs.map((r) => { const s = r.score(); total += s; max += r.max; return s; });
      const passed = total / max >= (cfg.pass ?? 0.8) - 1e-9;

      qs.forEach((r, i) => {
        const full = scores[i] === r.max;
        r.card.classList.remove('ok', 'bad');
        r.card.classList.add(full ? 'ok' : 'bad');
        r.card.querySelectorAll('.fb.show:not(:last-child)').forEach((n) => { if (n !== r.fb) n.remove(); });
        if (r.mark) r.mark();
        let text = r.detail ? r.detail(scores[i]) + ' ' : (full ? '✓ Richtig. ' : '✗ Leider falsch. ');
        if (passed) {
          text += r.q.explain || '';
          if (r.reveal) r.reveal();
        } else if (!full) {
          text += r.q.hint ? `Tipp: ${r.q.hint}` : 'Lesen Sie im Infotext noch einmal nach.';
        }
        r.fb.className = 'fb show ' + (full ? 'ok' : 'bad');
        r.fb.textContent = text;
      });

      result.classList.remove('hidden');
      result.innerHTML = '';
      const pct = Math.round((total / max) * 100);
      result.append(el('div', { class: 'small' }, 'Ihr Ergebnis'), el('div', { class: 'score' }, `${total} von ${max} Punkten (${pct} %)`));
      if (passed) {
        btn.disabled = true;
        btn.textContent = 'Geschafft ✓';
        if (cfg.baustein) {
          let code = decode(cfg.baustein);
          let fuer = '';
          if (cfg.personal) {
            const vn = vnIn.value.trim(), nn = nnIn.value.trim();
            code = `${code}-${await personalDigits(cfg.personal.prefix, cfg.personal.nr, code, vn, nn)}`;
            fuer = ` für ${vn} ${nn.toUpperCase()}.`;
            vnIn.disabled = true; nnIn.disabled = true;
          }
          if (cfg.storeKey) store.set(cfg.storeKey, code);
          result.append(
            el('p', {}, `Sehr gut! Ihr persönlicher Baustein${fuer}:`),
            el('div', { class: 'baustein' }, code),
            el('p', { class: 'small' }, '✍️ Schreiben Sie den Baustein mit den Ziffern jetzt in das Kästchen auf Ihrem Arbeitsblatt. Er gilt nur für Ihren Namen. Lesen Sie oben die Erklärungen zu allen Aufgaben.'));
        }
        if (cfg.onPass) cfg.onPass(result);
      } else {
        result.append(
          el('p', {}, (cfg.pass ?? 0.8) >= 1
            ? `Für den Baustein müssen alle Aufgaben richtig sein (${max} von ${max} Punkten).`
            : `Für den Baustein brauchen Sie mindestens ${Math.ceil((cfg.pass ?? 0.8) * max)} Punkte.`),
          el('p', { class: 'small' }, cfg.hint || 'Lesen Sie die rot markierten Themen im Infotext noch einmal. Ändern Sie dann Ihre Antworten und tippen Sie erneut auf „Auswerten“.'));
        if (cfg.onFail) cfg.onFail(result);
        const firstBad = qs.find((r, i) => scores[i] < r.max);
        if (firstBad) setTimeout(() => firstBad.card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
      if (passed) result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return { el, shuffle, decode, store, nameStore, nameOk, personalDigits, sha256hex, normName, normWord, makeId, quiz };
})();
