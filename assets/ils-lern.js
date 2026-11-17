/* ILS-Lernmodus – Aufgaben nacheinander, mit Schutz gegen Raten und Durchklicken.
   Braucht vorher: ils.js, ils-server.js, auftraege.js, ils-konto.js.

   ILSLern.uebung({
     mount: '#app', ils: 'drainage', schritt: '1',
     abschnitt: 'Abschnitt 1 „Wozu Drainagen?“ (S. 2–3)',   // worauf sich die Übung bezieht
     ziehen: 8,             // so viele Aufgaben pro Durchgang (aus dem Pool)
     fehlerMax: 4,          // erlaubte Fehler (Abschlussquiz: 2); beim nächsten Fehler → Lesepause + Neustart
     pauseSek: 30,          // Lesepause nach zu vielen Fehlern (auch im Abschlussquiz)
     zuSchnellMax: 3,       // so oft zu schnell getippt → kurze Lesepause, danach weiter mit derselben Aufgabe
     tempoPauseSek: 15,     // Länge dieser Lesepause (auch im Abschlussquiz)
     abschluss: false,      // true = Abschlussquiz (erst nach allen Übungen)
     pool: [ …Aufgaben… ],
     schreiben: { auftrag, ort, minSek, punkte: [...], muster: [...], hinweis }   // optional: Examens-Training mit Musterantwort und Checkliste
   })

   Aufgabentypen (Feld typ) – alle mit frage (HTML), erklaerung, optional thema, gruppe, fest, bild:
     wahl      optionen[], richtig (Index), behalten
     rf        aussage → richtig (true/false), optional begruendung { optionen[], richtig }
     mehrfach  optionen[], richtig [Indizes]
     reihe     schritte[] (in richtiger Reihenfolge)
     sortieren kategorien[], elemente [{ t, k (Index der Kategorie), warum }]
     zahl      richtig (Zahl), toleranz, einheit
     luecke    text mit {{Lösungswort}}, extra [Ablenker], optional tausch [[Wort, Wort]] (Reihenfolge egal)
     bild      svg (mit data-ziel="…"), ziele [{ id, frage, name }], namen { id: 'Name' } für weitere Stellen
     dialog    stil 'fall'|'chat', knoten [{ sprecher, text, frage, optionen [{ t, richtig, rueck }] }]
   Zwischenstand (aktuelle Aufgabe, Fehler, Lesepause) bleibt auf dem Gerät gespeichert. */
const ILSLern = (() => {
  'use strict';
  const el = ILS.el;
  const K = ILSKonto;
  const MAIL = 'Sven.Klawitter@Karoline-Breitinger-Schule.de';
  const STANDARD = {
    ziehen: 8, fehlerMax: 4, pauseSek: 30, zuSchnellMax: 3, tempoPauseSek: 15,
    leseBasisMs: 800, leseProWortMs: 100, leseMaxMs: 6000,       // ≈ 600 Wörter/Minute (schnelles Lesen)
    folgeBasisMs: 300, folgeProWortMs: 60,
    // Unterhalb dieses Anteils der Lesezeit kann niemand Frage und Antwort gelesen haben: Dann zählt die Antwort
    // nicht (Warnung). Darüber zählt eine richtige Antwort immer; eine falsche gilt als geraten (Fehler + Warnung).
    mindestAnteil: 0.35,
    weiterNachFehlerSek: 4
  };

  /* ---------- Hilfen ---------- */
  const speicher = {
    lesen(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    schreiben(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } }
  };
  const ohneTags = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ');
  const woerter = (...teile) => teile.flat().map(ohneTags).join(' ').split(/\s+/).filter(Boolean).length;
  const mischen = ILS.shuffle;
  const span = (htmlText, cls) => el('span', { class: cls || null, html: String(htmlText) });
  const zeit = (sek) => `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;

  function signatur(pool) {
    const s = JSON.stringify(pool.map((a) => [a.typ, a.frage || '', a.aussage || '', (a.optionen || a.schritte || a.elemente || a.ziele || a.knoten || []).length]));
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  }

  // Aufgaben ziehen: feste immer, je Gruppe möglichst nur eine Variante, Reihenfolge wie im Pool
  function ziehen(pool, n) {
    const alle = pool.map((_, i) => i);
    const gewaehlt = alle.filter((i) => pool[i].fest);
    const gruppen = new Set(gewaehlt.map((i) => pool[i].gruppe).filter(Boolean));
    const rest = mischen(alle.filter((i) => !pool[i].fest));
    for (const i of rest) {
      if (gewaehlt.length >= n) break;
      const g = pool[i].gruppe;
      if (g && gruppen.has(g)) continue;
      gewaehlt.push(i);
      if (g) gruppen.add(g);
    }
    for (const i of rest) {
      if (gewaehlt.length >= n) break;
      if (!gewaehlt.includes(i)) gewaehlt.push(i);
    }
    return gewaehlt.slice(0, n).sort((x, y) => x - y);
  }

  // Text, der vor der ersten Antwort gelesen werden muss
  function lesetext(a) {
    switch (a.typ) {
      case 'wahl': case 'mehrfach': return woerter(a.frage, a.optionen);
      case 'rf': return woerter(a.frage, a.aussage);
      case 'reihe': return woerter(a.frage) + Math.min(20, woerter(a.schritte));
      case 'sortieren': return woerter(a.frage, a.elemente[0] ? a.elemente[0].t : '');
      case 'zahl': return woerter(a.frage);
      case 'luecke': return woerter(a.frage, a.text.split('{{')[0]);   // nur bis zur ersten Lücke
      case 'bild': return woerter(a.frage, a.ziele[0] ? a.ziele[0].frage : '');
      case 'dialog': return woerter(a.frage, a.knoten[0].text, a.knoten[0].frage, a.knoten[0].optionen.map((o) => o.t));
      default: return woerter(a.frage);
    }
  }

  /* ---------- Aufgabentypen ---------- */
  const TYPEN = {};

  function antwortKnoepfe(texte, onTap, cls) {
    const liste = el('div', { class: 'lern-optionen' + (cls ? ' ' + cls : '') });
    const knoepfe = texte.map((t, i) => {
      const b = el('button', { type: 'button', class: 'antwort' }, span(t));
      b.addEventListener('click', () => onTap(i, b));
      liste.append(b);
      return b;
    });
    return { liste, knoepfe };
  }

  TYPEN.wahl = (a, api) => {
    const reihen = a.behalten ? a.optionen.map((_, i) => i) : mischen(a.optionen.map((_, i) => i));
    const { liste, knoepfe } = antwortKnoepfe(reihen.map((i) => a.optionen[i]), (pos, b) => {
      if (!api.versuch()) return;
      const gewaehlt = reihen[pos];
      knoepfe.forEach((k, p) => { k.disabled = true; if (reihen[p] === a.richtig) k.classList.add('richtig'); });
      const ok = gewaehlt === a.richtig;
      if (!ok) b.classList.add('falsch');
      api.antwort(ok, ok ? '' : `Richtig ist: „${ohneTags(a.optionen[a.richtig]).trim()}“.`, ok ? null : 'o' + gewaehlt);
    });
    api.karte.append(liste);
  };

  TYPEN.rf = (a, api) => {
    api.karte.append(el('div', { class: 'lern-aussage', html: a.aussage }));
    const { liste, knoepfe } = antwortKnoepfe(['Richtig', 'Falsch'], (pos, b) => {
      if (!api.versuch()) return;
      const wahl = pos === 0;
      knoepfe.forEach((k) => { k.disabled = true; });
      knoepfe[a.richtig ? 0 : 1].classList.add('richtig');
      if (wahl !== a.richtig) {
        b.classList.add('falsch');
        api.antwort(false, `Die Aussage ist ${a.richtig ? 'richtig' : 'falsch'}.`, 'rf');
        return;
      }
      if (!a.begruendung) { api.antwort(true); return; }
      const bg = a.begruendung;
      api.karte.append(el('div', { class: 'q-text lern-stufe2' }, 'Richtig erkannt! Und warum? Wählen Sie die passende Begründung:'));
      api.neuerText(woerter(bg.optionen), true);
      const reihen = mischen(bg.optionen.map((_, i) => i));
      const z = antwortKnoepfe(reihen.map((i) => bg.optionen[i]), (p2, b2) => {
        if (!api.versuch()) return;
        z.knoepfe.forEach((k, p) => { k.disabled = true; if (reihen[p] === bg.richtig) k.classList.add('richtig'); });
        const ok = reihen[p2] === bg.richtig;
        if (!ok) b2.classList.add('falsch');
        api.antwort(ok, ok ? '' : `Die passende Begründung: „${ohneTags(bg.optionen[bg.richtig]).trim()}“.`, ok ? null : 'b' + reihen[p2]);
      });
      api.karte.append(z.liste);
    }, 'zwei');
    api.karte.append(liste);
  };

  TYPEN.mehrfach = (a, api) => {
    api.karte.append(el('p', { class: 'small lern-tipp' }, 'Mehrere Antworten können richtig sein. Tippen Sie alle richtigen an und dann auf „Prüfen“.'));
    const reihen = a.behalten ? a.optionen.map((_, i) => i) : mischen(a.optionen.map((_, i) => i));
    const an = new Set();
    const { liste, knoepfe } = antwortKnoepfe(reihen.map((i) => a.optionen[i]), (pos, b) => {
      const i = reihen[pos];
      if (an.has(i)) { an.delete(i); b.setAttribute('aria-pressed', 'false'); } else { an.add(i); b.setAttribute('aria-pressed', 'true'); }
    }, 'mehrfach');
    knoepfe.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    const pruefen = el('button', { type: 'button', class: 'btn block lern-pruefen' }, 'Prüfen');
    pruefen.addEventListener('click', () => {
      if (!an.size) { api.hinweis('Tippen Sie zuerst mindestens eine Antwort an.'); return; }
      if (!api.versuch()) return;
      const soll = new Set(a.richtig);
      const ok = soll.size === an.size && [...soll].every((i) => an.has(i));
      knoepfe.forEach((k, p) => {
        k.disabled = true;
        const i = reihen[p];
        if (soll.has(i)) k.classList.add('richtig'); else if (an.has(i)) k.classList.add('falsch');
      });
      pruefen.remove();
      // Statistik: o3+ = fälschlich angekreuzt, o1- = richtige Antwort nicht angekreuzt
      const details = a.optionen.map((_, i) => (an.has(i) && !soll.has(i) ? `o${i}+` : !an.has(i) && soll.has(i) ? `o${i}-` : null)).filter(Boolean);
      api.antwort(ok, ok ? '' : 'Grün markiert sind alle richtigen Antworten.', details);
    });
    api.karte.append(liste, pruefen);
  };

  TYPEN.reihe = (a, api) => {
    const liste = el('ol', { class: 'order-list' });
    const pool = el('div', { class: 'order-pool' });
    let items = mischen(a.schritte.map((t, i) => ({ t, i })));
    for (let k = 0; k < 20 && items.length > 1 && items[0].i === 0; k++) items = mischen(items);
    items.forEach((it) => {
      const b = el('button', { type: 'button', class: 'order-item' }, span(it.t));
      b.addEventListener('click', () => {
        if (b.parentElement !== pool || !api.versuch()) return;
        if (it.i === liste.children.length) {
          liste.append(el('li', { class: 'order-item ok' }, span(it.t)));
          b.remove();
          if (!pool.children.length) api.geloest();
        } else {
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          api.fehler('Das ist noch nicht der nächste Schritt.', `s${liste.children.length}>${it.i}`);
        }
      });
      pool.append(b);
    });
    api.karte.append(liste, el('div', { class: 'order-label' }, 'Tippen Sie auf den nächsten Schritt:'), pool);
  };

  // Reihenfolge beim Sortieren: zufällig, aber ohne durchschaubares Muster. Verworfen werden
  // · bei zwei Kategorien: (fast) ständiges Abwechseln links–rechts und „erst alle links, dann alle rechts“,
  // · bei allen: mehr als 3 Begriffe derselben Kategorie hintereinander.
  function sortierFolge(elemente, anzahlKategorien) {
    const n = elemente.length;
    const passt = (f) => {
      let wechsel = 0;
      let kette = 1;
      let maxKette = 1;
      for (let i = 1; i < n; i++) {
        if (f[i].k !== f[i - 1].k) { wechsel++; kette = 1; } else { kette++; maxKette = Math.max(maxKette, kette); }
      }
      if (maxKette > 3) return false;
      if (anzahlKategorien === 2 && n >= 4) {
        if (wechsel > Math.ceil((n - 1) / 2)) return false;
        if (n >= 5 && wechsel < 2) return false;
      }
      return true;
    };
    let f = mischen(elemente);
    for (let versuch = 0; versuch < 500 && !passt(f); versuch++) f = mischen(elemente);
    return f;
  }

  TYPEN.sortieren = (a, api) => {
    const elemente = sortierFolge(a.elemente, a.kategorien.length);
    const spalten = a.kategorien.map((k) => el('div', { class: 'sort-spalte' }, el('div', { class: 'sort-titel', html: k }), el('ul', {})));
    const frage = el('div', { class: 'sort-element', 'aria-live': 'polite' });
    const zaehler = el('div', { class: 'small' });
    const knoepfe = a.kategorien.map((k, i) => {
      const b = el('button', { type: 'button', class: 'antwort sort-knopf' }, span(k));
      b.addEventListener('click', () => waehlen(i, b));
      return b;
    });
    let pos = 0;
    let schonFalsch = false;   // je Begriff zählt nur der erste Fehlklick als Fehler (❤️)
    function zeigen() {
      frage.innerHTML = '';
      frage.append(el('span', { class: 'small' }, 'Wohin gehört …'), el('div', { class: 'sort-text', html: elemente[pos].t }));
      zaehler.textContent = `${pos + 1} von ${elemente.length}`;
    }
    function waehlen(i, b) {
      if (!api.versuch()) return;
      const e = elemente[pos];
      if (i !== e.k) {
        b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
        const detail = `e${a.elemente.indexOf(e)}>${i}`;
        if (schonFalsch) api.nochmal('Auch das passt nicht – versuchen Sie eine andere Spalte. (Kostet kein weiteres Herz.)', detail);
        else api.fehler(e.warum ? `Nicht ganz: ${e.warum}` : 'Das passt hier nicht.', detail);
        schonFalsch = true;
        return;
      }
      spalten[i].querySelector('ul').append(el('li', { html: e.t }));
      pos++;
      schonFalsch = false;
      if (pos >= elemente.length) {
        frage.remove(); zaehler.remove();
        knoepfe.forEach((k) => { k.disabled = true; });
        api.geloest();
        return;
      }
      zeigen();
      api.neuerText(woerter(elemente[pos].t), true);
    }
    zeigen();
    api.karte.append(zaehler, frage, el('div', { class: 'sort-knoepfe' + (a.kategorien.length > 3 ? ' viele' : '') }, knoepfe),
      el('div', { class: 'sort-ergebnis' + (a.kategorien.length > 2 ? ' drei' : '') }, spalten));
  };

  TYPEN.zahl = (a, api) => {
    const feld = el('input', { type: 'text', inputmode: 'decimal', class: 'lern-zahl', 'aria-label': 'Ihre Antwort', autocomplete: 'off' });
    const knopf = el('button', { type: 'button', class: 'btn' }, 'Prüfen');
    knopf.addEventListener('click', () => {
      // die letzte Zahl zählt: „35 ml“, „ca. 35“ und „125 - 90 = 35“ ergeben 35, „1,5 l“ ergibt 1,5
      const zahlen = feld.value.match(/\d+(?:[.,]\d+)?/g);
      const wert = zahlen ? parseFloat(zahlen[zahlen.length - 1].replace(',', '.')) : NaN;
      if (!Number.isFinite(wert)) { api.hinweis('Bitte geben Sie eine Zahl ein.'); return; }
      if (!api.versuch()) return;
      feld.disabled = true; knopf.disabled = true;
      const ok = Math.abs(wert - a.richtig) <= (a.toleranz || 0);
      feld.classList.add(ok ? 'ok' : 'bad');
      api.antwort(ok, ok ? '' : `Richtig ist: ${String(a.richtig).replace('.', ',')} ${a.einheit || ''}.`, 'zahl');
    });
    feld.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') knopf.click(); });
    api.karte.append(el('div', { class: 'lern-zahlzeile' }, feld, a.einheit ? el('span', { class: 'einheit' }, a.einheit) : null, knopf));
  };

  TYPEN.luecke = (a, api) => {
    const teile = a.text.split(/(\{\{[^}]+\}\})/);
    const luecken = [];
    const text = el('div', { class: 'luecken-text' });
    teile.forEach((t) => {
      const m = /^\{\{([^}]+)\}\}$/.exec(t);
      if (m) {
        const s = el('span', { class: 'luecke' }, '…');
        luecken.push({ wort: m[1], s });
        text.append(s);
      } else if (t) text.append(span(t));
    });
    const chips = el('div', { class: 'chips' });
    let pos = 0;
    const markieren = () => luecken.forEach((l, i) => l.s.classList.toggle('aktiv', i === pos));
    // tausch: Wörter, deren Reihenfolge egal ist („Datum und Uhrzeit“) – dann passt jedes davon in die markierte Lücke
    const tauschbar = (x, y) => (a.tausch || []).some((g) => g.includes(x) && g.includes(y));
    const alleWoerter = [...luecken.map((l) => l.wort), ...(a.extra || [])];   // Reihenfolge wie im Text (für die Statistik)
    mischen(alleWoerter).forEach((w) => {
      const b = el('button', { type: 'button', class: 'chip' }, w);
      b.addEventListener('click', () => {
        if (b.disabled || !api.versuch()) return;
        if (w !== luecken[pos].wort && tauschbar(w, luecken[pos].wort)) {
          const spaeter = luecken.findIndex((l, j) => j > pos && l.wort === w);
          if (spaeter > pos) { luecken[spaeter].wort = luecken[pos].wort; luecken[pos].wort = w; }
        }
        if (w === luecken[pos].wort) {
          luecken[pos].s.textContent = w;
          luecken[pos].s.classList.add('gefuellt');
          b.disabled = true;
          pos++;
          markieren();
          if (pos >= luecken.length) { chips.querySelectorAll('.chip').forEach((c) => { c.disabled = true; }); api.geloest(); }
        } else {
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          api.fehler('Dieses Wort passt nicht in die markierte Lücke.', `l${pos}>${alleWoerter.indexOf(w)}`);
        }
      });
      chips.append(b);
    });
    markieren();
    api.karte.append(text, el('div', { class: 'small' }, 'Tippen Sie das Wort für die markierte Lücke an:'), chips);
  };

  TYPEN.bild = (a, api) => {
    const rahmen = el('div', { class: 'hotspot', html: a.svg });
    const aufgabe = el('div', { class: 'hotspot-frage', 'aria-live': 'polite' });
    let pos = 0;
    const zeigen = () => { aufgabe.innerHTML = ''; aufgabe.append(el('span', { class: 'small' }, `${pos + 1} von ${a.ziele.length}`), el('div', { html: a.ziele[pos].frage })); };
    const svg = rahmen.querySelector('svg');
    svg.addEventListener('click', (ev) => {
      if (pos >= a.ziele.length || !api.versuch()) return;
      const ziel = ev.target.closest('[data-ziel]');
      const gesucht = a.ziele[pos];
      // auch: weitere Stellen, die ebenfalls richtig sind (z. B. der Nagel der Großzehe gehört auch zu „die Zehen“)
      if (ziel && (ziel.getAttribute('data-ziel') === gesucht.id || (gesucht.auch || []).includes(ziel.getAttribute('data-ziel')))) {
        ziel.classList.add('getroffen');
        pos++;
        if (pos >= a.ziele.length) { aufgabe.remove(); api.geloest(); return; }
        zeigen();
        api.neuerText(woerter(a.ziele[pos].frage), true);
      } else {
        const id = ziel && ziel.getAttribute('data-ziel');
        const getippt = id && ((a.ziele.find((z) => z.id === id) || {}).name || (a.namen || {})[id]);
        if (ziel) { ziel.classList.remove('daneben'); void ziel.getBoundingClientRect(); ziel.classList.add('daneben'); }
        api.fehler(getippt ? `Das ist ${getippt}.` : 'Das ist nicht die gesuchte Stelle.', `z${pos}>${id || 'x'}`);
      }
    });
    zeigen();
    api.karte.append(aufgabe, rahmen);
  };

  TYPEN.dialog = (a, api) => {
    const verlauf = el('div', { class: 'dialog ' + (a.stil === 'chat' ? 'chat' : 'fall') });
    api.karte.append(verlauf);
    let pos = 0;
    function knoten() {
      const k = a.knoten[pos];
      if (k.text) verlauf.append(el('div', { class: 'blase ' + (k.sprecher ? 'links' : 'info') }, k.sprecher ? el('strong', {}, k.sprecher + ': ') : null, span(k.text)));
      if (k.frage) verlauf.append(el('div', { class: 'q-text' }, span(k.frage)));
      const reihen = mischen(k.optionen.map((_, i) => i));
      const z = antwortKnoepfe(reihen.map((i) => k.optionen[i].t), (p, b) => {
        if (!api.versuch()) return;
        const o = k.optionen[reihen[p]];
        if (!o.richtig) {
          b.disabled = true; b.classList.add('falsch');
          api.fehler(o.rueck || 'Das ist hier nicht die beste Wahl.', `k${pos}>${reihen[p]}`);
          return;
        }
        z.knoepfe.forEach((x) => { x.disabled = true; });
        b.classList.add('richtig');
        z.liste.replaceWith(el('div', { class: 'blase rechts' }, span(o.t)));
        if (o.rueck) verlauf.append(el('div', { class: 'blase info ok' }, span('✓ ' + o.rueck)));
        pos++;
        if (pos >= a.knoten.length) { api.geloest(); return; }
        const n = a.knoten[pos];
        api.neuerText(woerter(n.text, n.frage, n.optionen.map((x) => x.t)));
        knoten();
      });
      verlauf.append(z.liste);
    }
    knoten();
  };

  /* ---------- Übung ---------- */
  function uebung(cfg0) {
    const cfg = { ...STANDARD, ...cfg0 };
    const { oben, info, inhalt } = K.rahmen(cfg);
    const a = K.auftrag(cfg.ils);
    const schritt = a && a.schritte.find((s) => s.id === cfg.schritt);
    const sig = signatur(cfg.pool);
    const n = Math.min(cfg.ziehen, cfg.pool.length);
    let S = null;
    let uhr = null;

    const schluessel = () => `ils-lern|${K.werIst(K.konto()) || 'gast'}|${cfg.ils}|${cfg.schritt}`;
    const sichern = () => speicher.schreiben(schluessel(), S);
    const neu = () => ({ sig, phase: 'start', ziehung: [], i: 0, fehler: 0, zuSchnell: 0, fehlerfrei: 0, themen: [],
      neustarts: 0, zuSchnellGesamt: 0, pauseBis: 0, grund: '', schreibenAb: 0, selbst: null, selbstMax: null, gemeldet: false });

    function leeren() { clearInterval(uhr); inhalt.innerHTML = ''; window.scrollTo(0, 0); }
    const titelKarte = (titel, ...kinder) => el('div', { class: 'card lern-start' }, el('div', { class: 'q-text' }, titel), ...kinder);

    function herzen() {
      const rest = Math.max(0, cfg.fehlerMax - S.fehler);
      return el('span', { class: 'herzen', title: `noch ${rest} Fehler erlaubt` },
        '❤️'.repeat(rest) + '🤍'.repeat(cfg.fehlerMax - rest));
    }

    function durchgangStarten() {
      Object.assign(S, { ziehung: ziehen(cfg.pool, n), i: 0, fehler: 0, zuSchnell: 0, fehlerfrei: 0, themen: [], phase: 'karten', gemeldet: false, schreibenAb: 0, tempoPauseFaellig: false });
      sichern();
      zeigen();
    }

    // 3 Warnungen: kurze Lesepause, danach geht es mit derselben (bzw. der nächsten) Aufgabe weiter (kein Neustart)
    function tempoPause(naechste) {
      Object.assign(S, { phase: 'pause', grund: 'tempo', zuSchnell: 0, tempoNaechste: !!naechste, pauseBis: Date.now() + cfg.tempoPauseSek * 1000 });
      sichern();
      zeigen();
    }

    function weiterNachTempoPause() {
      Object.assign(S, { phase: 'karten', grund: '' });
      sichern();
      zeigen();
    }

    function neustart(grund) {
      Object.assign(S, { phase: 'pause', grund, neustarts: S.neustarts + 1, pauseBis: Date.now() + cfg.pauseSek * 1000 });
      sichern();
      zeigen();
    }

    function zeigen() {
      leeren();
      if (S.phase === 'karten' && S.i >= S.ziehung.length) S.phase = cfg.schreiben ? 'schreiben' : 'fertig';
      // 3. Warnung bei einer schnellen, falschen Antwort: Lesepause vor der nächsten Aufgabe
      if (S.tempoPauseFaellig) {
        S.tempoPauseFaellig = false;
        if (S.phase === 'karten') { tempoPause(true); return; }
        sichern();
      }
      // Live-Stand für das Live-Rennen der Lehrkraft (Übung, Phase, Aufgabe i von n)
      if (K.live) K.live(cfg.ils, cfg.schritt, { phase: S.phase, i: Math.min(S.i, S.ziehung.length), n: S.ziehung.length });
      ({ start: startZeigen, karten: karteZeigen, pause: pauseZeigen, schreiben: schreibenZeigen, checkliste: checklisteZeigen, fertig: fertigZeigen }[S.phase] || startZeigen)();
    }

    function startZeigen() {
      const regeln = [
        `Sie bekommen ${n} Aufgaben, eine nach der anderen. Nach jeder Antwort sehen Sie sofort, ob sie stimmt.`,
        `Sie dürfen höchstens ${cfg.fehlerMax} Fehler machen (❤️). Beim ${cfg.fehlerMax + 1}. Fehler gibt es eine Lesepause von ${cfg.pauseSek >= 120 ? Math.round(cfg.pauseSek / 60) + ' Minuten' : cfg.pauseSek + ' Sekunden'} – danach starten Sie mit neuen Aufgaben von vorn.`,
        `Lesen Sie jede Aufgabe in Ruhe. Richtige Antworten zählen immer – auch wenn Sie schnell lesen. Wer aber schneller tippt, als man lesen kann, oder schnell danebenliegt (Raten), bekommt eine Warnung – nach ${cfg.zuSchnellMax} Warnungen gibt es eine Lesepause von ${cfg.tempoPauseSek} Sekunden, danach geht es weiter.`,
        'Ihr Zwischenstand bleibt gespeichert, auch wenn Sie die Seite schließen.'
      ];
      inhalt.append(titelKarte(cfg.abschluss ? '🏁 Abschlussquiz' : '📄 Zuerst lesen, dann üben',
        cfg.abschnitt ? el('p', {}, 'Lesen Sie zuerst auf dem Arbeitsblatt: ', el('strong', {}, cfg.abschnitt)) : null,
        cfg.intro ? el('p', { html: cfg.intro }) : null,
        el('ul', { class: 'lern-regeln' }, regeln.map((r) => el('li', {}, r))),
        el('button', { type: 'button', class: 'btn block', id: 'lern-los', onclick: durchgangStarten }, S.neustarts ? 'Noch einmal üben' : 'Los geht’s')));
    }

    function pauseZeigen() {
      const themen = [...new Set(S.themen)].filter(Boolean);
      const karte = titelKarte(S.grund === 'tempo' ? '⏳ Zu schnell getippt' : '📖 Zu viele Fehler',
        el('p', {}, S.grund === 'tempo'
          ? 'Sie haben mehrmals sehr schnell getippt – schneller, als man die Aufgabe lesen kann, oder schnell und falsch. Durchklicken und Raten bringen nichts – lesen Sie in Ruhe. ' +
            (S.tempoNaechste ? 'Danach geht es mit der nächsten Aufgabe weiter.' : 'Danach geht es mit derselben Aufgabe weiter.')
          : 'Kein Problem – genau dafür ist die Übung da. Lesen Sie diese Stellen auf dem Arbeitsblatt noch einmal gründlich:'),
        S.grund === 'tempo' ? null : themen.length ? el('ul', {}, themen.map((t) => el('li', { html: t }))) : (cfg.abschnitt ? el('p', {}, el('strong', {}, cfg.abschnitt)) : null));
      const anzeige = el('div', { class: 'countdown', 'aria-live': 'polite' });
      const knopf = S.grund === 'tempo'
        ? el('button', { type: 'button', class: 'btn block', id: 'lern-fortsetzen', disabled: true, onclick: weiterNachTempoPause }, `Weiter mit Aufgabe ${S.i + 1}`)
        : el('button', { type: 'button', class: 'btn block', id: 'lern-neustart', disabled: true, onclick: durchgangStarten }, 'Mit neuen Aufgaben neu starten');
      karte.append(anzeige, knopf);
      inhalt.append(karte);
      const ticken = () => {
        const rest = Math.ceil((S.pauseBis - Date.now()) / 1000);
        if (rest > 0) { anzeige.textContent = `Lesepause: noch ${zeit(rest)}`; knopf.disabled = true; } else {
          anzeige.textContent = 'Die Lesepause ist vorbei.'; knopf.disabled = false; clearInterval(uhr);
        }
      };
      ticken();
      uhr = setInterval(ticken, 1000);
    }

    function karteZeigen() {
      const auf = cfg.pool[S.ziehung[S.i]];
      const anteil = Math.round((S.i / S.ziehung.length) * 100);
      inhalt.append(
        el('div', { class: 'lern-kopf' }, el('span', {}, `Aufgabe ${S.i + 1} von ${S.ziehung.length}`), herzen()),
        el('div', { class: 'balken lern-balken' }, el('span', { style: `width:${anteil}%` })));
      const karte = el('div', { class: 'card lern-karte', 'data-typ': auf.typ });
      if (auf.frage) karte.append(el('div', { class: 'q-text', html: auf.frage }));
      if (auf.bild) karte.append(el('div', { class: 'figure' }, el('img', { src: auf.bild, alt: auf.bildAlt || '' })));
      const hinweis = el('div', { class: 'lern-hinweis', role: 'status', 'aria-live': 'polite' });
      const fb = el('div', { class: 'fb', 'aria-live': 'polite' });
      const weiter = el('button', { type: 'button', class: 'btn block hidden', id: 'lern-weiter' }, S.i + 1 < S.ziehung.length ? 'Weiter' : 'Fertig');
      inhalt.append(karte, hinweis, fb, weiter);

      let fehlerHier = 0;
      let abgeschlossen = false;
      let leseStart = Date.now();
      let leseNoetig = Math.min(cfg.leseMaxMs, cfg.leseBasisMs + lesetext(auf) * cfg.leseProWortMs);
      let gelesen = false;
      let schnell = false;      // dieser Versuch kam vor Ablauf der Lesezeit (richtig → zählt, falsch → Warnung)
      let tempoNotiz = '';
      const poolNr = S.ziehung[S.i];
      const details = [];       // Fehlklicks dieser Karte (z. B. „e2>1“ = Begriff 2 in Spalte 1) – nur für die anonyme Statistik

      // Anonyme Fehlerstatistik (ohne Namen): wie oft wurde diese Aufgabe gelöst, mit wie vielen Fehlern, welche Fehlklicks?
      function statistikMelden(geloest, fehlerfrei, abbruch) {
        if (!K.statistik || (!geloest && !details.length)) return;
        K.statistik(cfg.ils, cfg.schritt, { a: ILS.aufgabeId(auf), i: poolNr, geloest, fehlerfrei, abbruch, f: fehlerHier, d: details.slice(0, 30) });
      }
      const merken = (d) => { for (const x of [].concat(d || [])) details.push(String(x)); };

      const hinweisZeigen = (text, art) => {
        hinweis.className = 'lern-hinweis zeigen ' + (art || '');
        hinweis.textContent = text;
      };

      // Warnung zählen; true = jetzt sind es zu viele → Lesepause
      function tempoWarnung() {
        S.zuSchnell += 1;
        S.zuSchnellGesamt += 1;
        return S.zuSchnell >= cfg.zuSchnellMax;
      }
      const ratenText = () => `⏳ Das ging sehr schnell – und war falsch. Raten bringt nichts, lesen Sie in Ruhe. (Warnung ${S.zuSchnell} von ${cfg.zuSchnellMax})`;

      function abschliessen(ok, zusatz) {
        if (abgeschlossen) return;
        abgeschlossen = true;
        if (tempoNotiz) hinweisZeigen(tempoNotiz, 'bad'); else hinweis.className = 'lern-hinweis';
        const fehlerfrei = fehlerHier === 0 && ok;
        fb.className = 'fb show ' + (fehlerfrei ? 'ok' : ok ? 'hint' : 'bad');
        fb.innerHTML = '';
        fb.append(...[el('strong', {}, fehlerfrei ? '✓ Richtig. ' : ok ? `✓ Geschafft – mit ${fehlerHier} Fehler${fehlerHier === 1 ? '' : 'n'}. ` : '✗ Leider falsch. '),
          zusatz ? span(zusatz + ' ') : null, auf.erklaerung ? span(auf.erklaerung) : null].filter(Boolean));
        statistikMelden(1, fehlerfrei ? 1 : 0, 0);
        // Zwischenstand sofort sichern (die Karte gilt als bearbeitet)
        S.fehlerfrei += fehlerfrei ? 1 : 0;
        S.i += 1;
        if (S.i >= S.ziehung.length) S.phase = cfg.schreiben ? 'schreiben' : 'fertig';
        sichern();
        weiter.classList.remove('hidden');
        const warten = fehlerfrei ? 0 : cfg.weiterNachFehlerSek;
        if (warten > 0) {
          weiter.disabled = true;
          let rest = warten;
          weiter.textContent = `Erklärung lesen … ${rest}`;
          const t = setInterval(() => {
            rest--;
            if (rest <= 0) { clearInterval(t); weiter.disabled = false; weiter.textContent = S.phase === 'karten' ? 'Weiter' : 'Fertig'; } else weiter.textContent = `Erklärung lesen … ${rest}`;
          }, 1000);
        }
        weiter.addEventListener('click', zeigen);
        fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      const api = {
        karte,
        hinweis: (text) => hinweisZeigen(text, 'hint'),
        // Darf diese Eingabe ausgewertet werden? Unmöglich schnell (unter mindestAnteil der Lesezeit) → nein, Warnung.
        // Schnell, aber möglich → ja: Eine richtige Antwort zählt, eine falsche gilt als geraten (Fehler + Warnung).
        versuch() {
          if (abgeschlossen || S.phase !== 'karten') return false;
          schnell = false;
          if (gelesen) return true;
          const dauer = Date.now() - leseStart;
          if (dauer >= leseNoetig) { gelesen = true; return true; }
          if (dauer >= leseNoetig * cfg.mindestAnteil) { schnell = true; return true; }
          const pause = tempoWarnung();
          sichern();
          if (pause) { statistikMelden(0, 0, 0); tempoPause(); return false; }
          hinweisZeigen(`⏳ Langsam! So schnell kann niemand die Aufgabe lesen. Diese Antwort zählt nicht. (Warnung ${S.zuSchnell} von ${cfg.zuSchnellMax})`, 'bad');
          return false;
        },
        neuerText(anzahlWoerter, leicht) {
          gelesen = false;
          leseStart = Date.now();
          leseNoetig = leicht
            ? cfg.folgeBasisMs + anzahlWoerter * cfg.folgeProWortMs
            : Math.min(cfg.leseMaxMs, cfg.leseBasisMs + anzahlWoerter * cfg.leseProWortMs);
        },
        // Fehlklick bei mehrschrittigen Aufgaben (Sortieren, Reihenfolge, Lücke, Bild, Gespräch)
        fehler(text, detail) {
          const geraten = schnell;
          schnell = false;
          merken(detail);
          fehlerHier += 1;
          S.fehler += 1;
          S.themen.push(auf.thema || cfg.abschnitt || '');
          const pause = geraten && tempoWarnung();
          sichern();
          inhalt.querySelector('.herzen').replaceWith(herzen());
          if (S.fehler > cfg.fehlerMax) { statistikMelden(0, 0, 1); neustart('fehler'); return false; }
          if (pause) { statistikMelden(0, 0, 0); tempoPause(); return false; }
          hinweisZeigen('✗ ' + (text || 'Leider falsch.') + (geraten ? ' ' + ratenText() : ''), 'bad');
          return true;
        },
        // Weiterer Fehlklick, der kein Herz kostet (Sortieren: je Begriff zählt nur der erste Fehler)
        nochmal(text, detail) {
          const geraten = schnell;
          schnell = false;
          merken(detail);
          const pause = geraten && tempoWarnung();
          sichern();
          if (pause) { statistikMelden(0, 0, 0); tempoPause(); return false; }
          hinweisZeigen('✗ ' + text + (geraten ? ' ' + ratenText() : ''), 'bad');
          return true;
        },
        antwort(ok, zusatz, detail) {
          const geraten = schnell && !ok;
          schnell = false;
          if (!ok) {
            merken(detail);
            fehlerHier += 1;
            S.fehler += 1;
            S.themen.push(auf.thema || cfg.abschnitt || '');
            if (geraten && tempoWarnung()) S.tempoPauseFaellig = true;   // Lesepause vor der nächsten Aufgabe
            if (geraten) tempoNotiz = ratenText();
            sichern();
            inhalt.querySelector('.herzen').replaceWith(herzen());
            if (S.fehler > cfg.fehlerMax) { S.tempoPauseFaellig = false; statistikMelden(0, 0, 1); neustart('fehler'); return; }
          }
          abschliessen(ok, zusatz);
        },
        geloest(zusatz) { abschliessen(true, zusatz); }
      };

      (TYPEN[auf.typ] || TYPEN.wahl)(auf, api);
    }

    function schreibenZeigen() {
      const sch = cfg.schreiben;
      if (!S.schreibenAb) { S.schreibenAb = Date.now(); sichern(); }
      const karte = titelKarte('✍️ Examens-Training',
        el('p', {}, 'Die Aufgaben am Handy sind geschafft. Jetzt üben Sie das, was im Examen verlangt wird: eine Antwort ', el('strong', {}, 'selbst schreiben'), '.'),
        el('div', { class: 'lern-auftrag', html: sch.auftrag }),
        el('p', {}, 'Schreiben Sie Ihre Antwort ', el('strong', {}, sch.ort || 'in den Kasten „Examens-Training“ auf dem Arbeitsblatt'), '. Danach vergleichen Sie hier mit dem Erwartungshorizont.'));
      const anzeige = el('div', { class: 'countdown small' });
      const knopf = el('button', { type: 'button', class: 'btn block', id: 'lern-geschrieben', disabled: true }, 'Ich habe meine Antwort aufgeschrieben');
      knopf.addEventListener('click', () => { S.phase = 'checkliste'; sichern(); zeigen(); });
      karte.append(anzeige, knopf);
      inhalt.append(karte);
      const ticken = () => {
        const rest = Math.ceil((S.schreibenAb + (sch.minSek || 30) * 1000 - Date.now()) / 1000);
        if (rest > 0) { anzeige.textContent = `Nehmen Sie sich Zeit zum Schreiben – weiter geht es in ${zeit(rest)}.`; knopf.disabled = true; } else {
          anzeige.textContent = ''; knopf.disabled = false; clearInterval(uhr);
        }
      };
      ticken();
      uhr = setInterval(ticken, 1000);
    }

    // Musterantwort: Zeilen mit „• “ werden Aufzählungspunkte, **…** wird fett
    function musterHtml(zeilen) {
      const fett = (t) => String(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      let html = '';
      let liste = false;
      for (const z of zeilen) {
        if (z.startsWith('• ')) { if (!liste) { html += '<ul>'; liste = true; } html += `<li>${fett(z.slice(2))}</li>`; continue; }
        if (liste) { html += '</ul>'; liste = false; }
        html += `<p>${fett(z)}</p>`;
      }
      return html + (liste ? '</ul>' : '');
    }

    function checklisteZeigen() {
      const sch = cfg.schreiben;
      const haken = sch.punkte.map((p, i) => el('input', { type: 'checkbox', id: `lern-p${i}` }));
      const karte = titelKarte('✍️ Vergleichen Sie mit dem Erwartungshorizont',
        el('div', { class: 'lern-auftrag small', html: sch.auftrag }),
        sch.muster ? el('div', { class: 'musterantwort' },
          el('div', { class: 'muster-titel' }, '📝 Musterantwort – so hätte eine sehr gute Antwort im Examen ausgesehen'),
          el('div', { class: 'muster-text', html: musterHtml(sch.muster) })) : null,
        el('p', {}, sch.muster ? 'Vergleichen Sie Ihre Antwort damit und haken Sie ehrlich ab, was Sie (sinngemäß) aufgeschrieben haben. Was fehlt, ergänzen Sie in einer anderen Farbe.'
          : 'Haken Sie ehrlich ab, was Sie (sinngemäß) aufgeschrieben haben. Was fehlt, ergänzen Sie in einer anderen Farbe.'),
        sch.muster ? el('div', { class: 'q-text checkliste-titel' }, 'Erwartungshorizont zum Abhaken') : null,
        el('div', { class: 'checkliste' }, sch.punkte.map((p, i) => el('label', { class: 'opt', for: `lern-p${i}` }, haken[i], span(p)))),
        sch.hinweis ? el('p', { class: 'small', html: sch.hinweis }) : null);
      const knopf = el('button', { type: 'button', class: 'btn block', id: 'lern-verglichen' }, 'Fertig verglichen');
      knopf.addEventListener('click', () => {
        S.selbst = haken.filter((h) => h.checked).length;
        S.selbstMax = sch.punkte.length;
        S.phase = 'fertig';
        sichern();
        zeigen();
      });
      karte.append(knopf);
      inhalt.append(karte);
    }

    function fertigZeigen() {
      const betreff = (a && a.betreff) || 'ILS';
      const karte = el('div', { class: 'card lern-fertig' },
        el('div', { class: 'geschafft' }, cfg.abschluss ? '🎉 Geschafft! Ihr ILS-Auftrag ist abgeschlossen.' : '✓ Übung geschafft!'),
        el('p', {}, `${S.fehlerfrei} von ${S.ziehung.length} Aufgaben ohne Fehler` + (S.neustarts ? ` · Neustarts: ${S.neustarts}` : '') + '.'));
      if (S.selbstMax) {
        karte.append(el('div', { class: 'card selbst' },
          el('p', {}, el('strong', {}, `Examens-Training: Sie haben ${S.selbst} von ${S.selbstMax} Punkten genannt.`)),
          el('p', { class: 'small' }, 'Diese Selbstkontrolle prüft niemand nach – Sie sind selbst dafür verantwortlich, sich gut auf das Examen vorzubereiten. Nutzen Sie die Chance!'),
          el('p', { class: 'small' }, 'Sie möchten eine Rückmeldung von Ihrer Lehrkraft? Schicken Sie Ihre Antwort (Foto oder abgetippt) per E-Mail an ',
            el('a', { href: `mailto:${MAIL}?subject=${encodeURIComponent(betreff)}` }, MAIL), ` – Betreff: „${betreff}“.`)));
      }
      const zeile = el('p', { class: 'meldung' }, '⏳ Wird bei Ihrer Lehrkraft eingetragen …');
      karte.append(zeile);
      if (!S.gemeldet) {
        S.gemeldet = true;
        sichern();
        K.meldungsZeile(zeile, K.melden(cfg.ils, cfg.schritt, S.fehlerfrei, S.ziehung.length, {
          neustarts: S.neustarts, zuSchnell: S.zuSchnellGesamt,
          ...(S.selbstMax ? { selbst: S.selbst, selbstMax: S.selbstMax } : {})
        }));
      } else {
        K.meldungsZeile(zeile, K.nachreichen());
      }
      const w = K.weiterKnopf(a, cfg.schritt);
      if (cfg.abschluss && a && a.challenge) {
        karte.append(el('a', { class: 'btn block challenge-knopf weiter', href: K.link(a.challenge) }, '🏁 Jetzt die ILS-Challenge spielen – Highscore! (freiwillig)'));
      }
      if (w) karte.append(w);
      karte.append(el('button', { type: 'button', class: 'btn secondary block weiter', onclick: () => { S.phase = 'start'; sichern(); zeigen(); } }, 'Noch einmal üben'));
      inhalt.append(karte);
    }

    K.bereich(oben, async () => {
      S = speicher.lesen(schluessel());
      if (!S || S.sig !== sig) S = neu();
      const st = await K.standHolen();
      const meins = (st[cfg.ils] || {});
      if (cfg.abschluss && a) {
        const fehlt = a.schritte.filter((s) => !s.abschluss && !meins[s.id]);
        if (fehlt.length) {
          info.append(el('div', { class: 'card gesperrt' },
            el('div', { class: 'q-text' }, '🔒 Das Abschlussquiz ist noch gesperrt'),
            el('p', {}, 'Es wird freigeschaltet, wenn Sie alle Übungen erledigt haben. Es fehlen noch:'),
            el('div', { class: 'links' }, fehlt.map((s) => el('a', { class: 'btn secondary block', href: K.link(s.pfad) }, s.titel)))));
          return;
        }
      }
      const e = meins[cfg.schritt];
      if (e && S.phase === 'start') {
        info.append(el('div', { class: 'card erledigt' }, `✓ ${cfg.abschluss ? 'Abschlussquiz bestanden' : 'Diese Übung haben Sie schon erledigt'} (${K.datum(e.um)}). Sie können sie gern noch einmal üben.`));
      }
      inhalt.classList.remove('hidden');
      zeigen();
    });

    return { schritt };
  }

  // Mindest-Lesezeit einer Aufgabe in ms (für Tests und zum Nachrechnen)
  const lesezeit = (a, c = STANDARD) => Math.min(c.leseMaxMs, c.leseBasisMs + lesetext(a) * c.leseProWortMs);

  return { uebung, ziehen, signatur, TYPEN, sortierFolge, lesezeit, STANDARD };
})();
