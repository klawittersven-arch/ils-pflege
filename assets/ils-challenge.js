/* ILS-Challenge – freiwilliges Highscore-Spiel nach dem bestandenen Abschlussquiz (wie die Klausur-Challenge der Lernkarten).
   Braucht vorher: ils.js, ils-server.js, auftraege.js, ils-konto.js, ils-lern.js.

   ILSChallenge.start({ mount: '#app', ils: 'drainage', pools: [{ name: 'Abschnitt 1 …', ziehen: 3, aufgaben: [...] }, …] })

   · 20 Aufgaben aus allen Übungen des Auftrags (aus jedem Abschnitt mindestens 3), in zufälliger Reihenfolge.
   · 150 Punkte je Aufgabe; bei Aufgaben mit mehreren Schritten anteilig – jeder Fehlklick kostet.
   · Zeitbonus bis 750 Punkte, sinkt in 15 Minuten auf 0 und zählt nur anteilig zu den richtigen Antworten.
     Die Zeit misst der Server (Start bis Ende), die Mindest-Lesezeit je Aufgabe gilt weiter.
   · Lösungen gibt es erst am Ende. Bestenliste je ILS-Auftrag und Klasse (Vorname + Initial). */
const ILSChallenge = (() => {
  'use strict';
  const el = ILS.el;
  const K = ILSKonto;
  const L = ILSLern;
  const PUNKTE = 150;
  const LESEN = { basis: 1500, proWort: 230, max: 14000, folgeBasis: 600, folgeProWort: 120 };
  const ohneTags = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const woerter = (...t) => t.flat().map(ohneTags).join(' ').split(/\s+/).filter(Boolean).length;
  const span = (h, c) => el('span', { class: c || null, html: String(h) });
  const uhr = (sek) => `${Math.floor(sek / 60)}:${String(Math.floor(sek % 60)).padStart(2, '0')}`;
  const speicher = {
    lesen(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    schreiben(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } }
  };

  function lesetext(a) {
    switch (a.typ) {
      case 'wahl': case 'mehrfach': return woerter(a.frage, a.optionen);
      case 'rf': return woerter(a.frage, a.aussage);
      case 'reihe': return woerter(a.frage) + Math.min(20, woerter(a.schritte));
      case 'sortieren': return woerter(a.frage, a.elemente[0].t);
      case 'luecke': return woerter(a.frage, a.text.replace(/\{\{[^}]+\}\}/g, '___'));
      case 'bild': return woerter(a.frage, a.ziele[0].frage);
      case 'dialog': return woerter(a.frage, a.knoten[0].text, a.knoten[0].frage, a.knoten[0].optionen.map((o) => o.t));
      default: return woerter(a.frage);
    }
  }

  // Wie viele Teilschritte hat eine Aufgabe? (für anteilige Punkte)
  function teile(a) {
    switch (a.typ) {
      case 'reihe': return a.schritte.length;
      case 'sortieren': return a.elemente.length;
      case 'luecke': return (a.text.match(/\{\{[^}]+\}\}/g) || []).length;
      case 'bild': return a.ziele.length;
      case 'dialog': return a.knoten.length;
      default: return 1;
    }
  }

  // Lösung als Text für die Auswertung am Ende
  function loesung(a) {
    switch (a.typ) {
      case 'wahl': return ohneTags(a.optionen[a.richtig]);
      case 'rf': return `Die Aussage ist ${a.richtig ? 'richtig' : 'falsch'}.` + (a.begruendung ? ' ' + ohneTags(a.begruendung.optionen[a.begruendung.richtig]) : '');
      case 'mehrfach': return a.richtig.map((i) => ohneTags(a.optionen[i])).join(' · ');
      case 'zahl': return `${String(a.richtig).replace('.', ',')} ${a.einheit || ''}`;
      case 'reihe': return a.schritte.map((t, i) => `${i + 1}. ${ohneTags(t)}`).join(' → ');
      case 'sortieren': return a.kategorien.map((k, i) => `${ohneTags(k)}: ${a.elemente.filter((e) => e.k === i).map((e) => ohneTags(e.t)).join(', ')}`).join(' | ');
      case 'luecke': return ohneTags(a.text.replace(/\{\{([^}]+)\}\}/g, '[$1]'));
      case 'bild': return a.ziele.map((z) => `${ohneTags(z.frage)} → ${z.name}`).join(' · ');
      case 'dialog': return a.knoten.map((k) => ohneTags(k.optionen.find((o) => o.richtig).t)).join(' → ');
      default: return '';
    }
  }

  function start(cfg) {
    const { oben, info, inhalt } = K.rahmen(cfg);
    const a = K.auftrag(cfg.ils);
    const quiz = a && a.schritte.find((s) => s.abschluss);
    const pools = cfg.pools;
    const sig = L.signatur(pools.flatMap((p) => p.aufgaben));
    const schluessel = () => `ils-challenge|${K.werIst(K.konto()) || 'gast'}|${cfg.ils}`;
    let S = null;
    let ticker = null;
    const sichern = () => speicher.schreiben(schluessel(), S);
    const leeren = () => { clearInterval(ticker); inhalt.innerHTML = ''; window.scrollTo(0, 0); };

    function bestenliste(liste, eigenerName) {
      if (!liste || !liste.length) return el('p', { class: 'small' }, 'Noch niemand aus Ihrer Klasse hat die Challenge gespielt – seien Sie die oder der Erste!');
      return el('ol', { class: 'bestenliste' }, liste.map((e, i) => el('li', { class: e.name === eigenerName ? 'ich' : null },
        el('span', { class: 'platz' }, ['🥇', '🥈', '🥉'][i] || `${i + 1}.`), el('span', { class: 'name' }, e.name),
        el('span', { class: 'pkt' }, `${e.punkte} P.`), el('span', { class: 'zeit' }, uhr(e.sekunden)))));
    }

    async function startZeigen() {
      leeren();
      const karte = el('div', { class: 'card lern-start challenge' },
        el('div', { class: 'q-text' }, '🏁 ILS-Challenge'),
        el('ul', { class: 'lern-regeln' }, [
          '20 Aufgaben aus allen Übungen dieses ILS-Auftrags – in zufälliger Reihenfolge.',
          '150 Punkte je richtiger Aufgabe. Bei Aufgaben mit mehreren Schritten kostet jeder Fehlklick Punkte.',
          'Zeitbonus bis 750 Punkte: Er sinkt mit jeder Sekunde (nach 15 Minuten ist er weg) und zählt nur anteilig zu Ihren richtigen Antworten – Raten lohnt sich nicht.',
          'Lesen müssen Sie trotzdem: Zu schnelles Tippen wird nicht gewertet und kostet nur Zeit.',
          'Die Lösungen sehen Sie am Ende. Sie können die Challenge so oft spielen, wie Sie möchten – Ihr bestes Ergebnis zählt.',
          'Ihr Name (Vorname und 1. Buchstabe des Nachnamens) erscheint in der Bestenliste Ihrer Klasse.'
        ].map((t) => el('li', {}, t))));
      const knopf = el('button', { type: 'button', class: 'btn block', id: 'ch-start' }, 'Challenge starten');
      const meldung = el('div', { class: 'fb' });
      karte.append(knopf, meldung);
      const liste = el('div', { class: 'card' }, el('div', { class: 'q-text' }, 'Bestenliste Ihrer Klasse'), el('p', { class: 'small' }, 'wird geladen …'));
      inhalt.append(karte, liste);
      knopf.addEventListener('click', async () => {
        knopf.disabled = true;
        try {
          const k = K.konto();
          const { status, d } = await K.api('/api/challenge/start', { methode: 'POST', token: k && k.token, daten: { ils: cfg.ils } });
          if (status === 200 && d.laufId) {
            const karten = [];
            pools.forEach((p, pi) => L.ziehen(p.aufgaben, Math.min(p.ziehen, p.aufgaben.length)).forEach((i) => karten.push({ p: pi, i })));
            S = { sig, phase: 'lauf', laufId: d.laufId, start: Date.now(), karten: ILS.shuffle(karten), pos: 0, ergebnisse: [] };
            sichern();
            zeigen();
            return;
          }
          meldung.className = 'fb show bad';
          meldung.textContent = d.grund === 'voraussetzung' ? 'Die Challenge wird nach dem bestandenen Abschlussquiz freigeschaltet.'
            : status === 401 ? 'Bitte melden Sie sich oben an.' : 'Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.';
        } catch (e) {
          meldung.className = 'fb show bad';
          meldung.textContent = 'Keine Verbindung. Für die Challenge brauchen Sie Internet.';
        }
        knopf.disabled = false;
      });
      try {
        const k = K.konto();
        const { status, d } = await K.api('/api/challenge/liste?ils=' + encodeURIComponent(cfg.ils), { token: k && k.token });
        liste.innerHTML = '';
        liste.append(el('div', { class: 'q-text' }, `Bestenliste ${d.klasse || ''}`));
        if (status === 200) {
          liste.append(bestenliste(d.liste, k && k.name));
          if (d.best) liste.append(el('p', { class: 'small' }, `Ihr bestes Ergebnis: ${d.best.punkte} Punkte (${uhr(d.best.sekunden)}) – Platz ${d.platz} von ${d.von}.`));
        }
      } catch (e) { liste.querySelector('.small').textContent = 'Bestenliste gerade nicht erreichbar.'; }
    }

    function kopf() {
      const pkt = S.ergebnisse.reduce((x, e) => x + e.punkte, 0);
      const zeit = el('span', { class: 'ch-uhr' }, '⏱ ' + uhr((Date.now() - S.start) / 1000));
      ticker = setInterval(() => { zeit.textContent = '⏱ ' + uhr((Date.now() - S.start) / 1000); }, 1000);
      return el('div', { class: 'lern-kopf ch-kopf' }, el('span', {}, `Aufgabe ${S.pos + 1} von ${S.karten.length}`), zeit, el('span', { class: 'ch-punkte' }, `⭐ ${pkt}`));
    }

    function karteZeigen() {
      const ref = S.karten[S.pos];
      const auf = pools[ref.p].aufgaben[ref.i];
      inhalt.append(kopf(), el('div', { class: 'balken lern-balken' }, el('span', { style: `width:${Math.round((S.pos / S.karten.length) * 100)}%` })));
      const karte = el('div', { class: 'card lern-karte', 'data-typ': auf.typ });
      if (auf.frage) karte.append(el('div', { class: 'q-text', html: auf.frage }));
      if (auf.bild) karte.append(el('div', { class: 'figure' }, el('img', { src: auf.bild, alt: auf.bildAlt || '' })));
      const hinweis = el('div', { class: 'lern-hinweis', role: 'status', 'aria-live': 'polite' });
      const fb = el('div', { class: 'fb', 'aria-live': 'polite' });
      const weiter = el('button', { type: 'button', class: 'btn block hidden', id: 'ch-weiter' }, S.pos + 1 < S.karten.length ? 'Weiter' : 'Auswerten');
      inhalt.append(karte, hinweis, fb, weiter);
      let fehlerHier = 0;
      let fertig = false;
      let leseStart = Date.now();
      let noetig = Math.min(LESEN.max, LESEN.basis + lesetext(auf) * LESEN.proWort);
      let gelesen = false;
      const zeigeHinweis = (t, art) => { hinweis.className = 'lern-hinweis zeigen ' + art; hinweis.textContent = t; };

      function abschliessen(anteil) {
        if (fertig) return;
        fertig = true;
        const punkte = Math.max(0, Math.round(PUNKTE * anteil));
        S.ergebnisse.push({ p: ref.p, i: ref.i, punkte, max: PUNKTE });
        S.pos += 1;
        if (S.pos >= S.karten.length) S.phase = 'senden';
        sichern();
        hinweis.className = 'lern-hinweis';
        fb.className = 'fb show ' + (punkte === PUNKTE ? 'ok' : punkte > 0 ? 'hint' : 'bad');
        fb.textContent = punkte === PUNKTE ? `✓ Richtig! +${punkte}` : punkte > 0 ? `◐ Teilweise richtig: +${punkte}` : '✗ Leider falsch: +0 – die Lösung sehen Sie am Ende.';
        weiter.classList.remove('hidden');
        weiter.addEventListener('click', zeigen);
      }

      const api = {
        karte,
        hinweis: (t) => zeigeHinweis(t, 'hint'),
        versuch() {
          if (fertig) return false;
          if (gelesen) return true;
          if (Date.now() - leseStart >= noetig) { gelesen = true; return true; }
          zeigeHinweis('⏳ Erst lesen! Diese Antwort zählt nicht – zu schnelles Tippen kostet nur Zeit.', 'bad');
          return false;
        },
        neuerText(n, leicht) {
          gelesen = false;
          leseStart = Date.now();
          noetig = leicht ? LESEN.folgeBasis + n * LESEN.folgeProWort : Math.min(LESEN.max, LESEN.basis + n * LESEN.proWort);
        },
        fehler() {
          fehlerHier += 1;
          zeigeHinweis(`✗ Fehlklick – kostet Punkte (${fehlerHier})`, 'bad');
          return true;
        },
        antwort(ok) { abschliessen(ok ? 1 : 0); },
        geloest() { abschliessen(Math.max(0, 1 - fehlerHier / teile(auf))); }
      };
      (L.TYPEN[auf.typ] || L.TYPEN.wahl)(auf, api);
    }

    async function senden() {
      leeren();
      const karte = el('div', { class: 'card lern-start' }, el('div', { class: 'q-text' }, '⏳ Ergebnis wird ausgewertet …'));
      inhalt.append(karte);
      const aufgabenPunkte = S.ergebnisse.reduce((x, e) => x + e.punkte, 0);
      try {
        const k = K.konto();
        const { status, d } = await K.api('/api/challenge/ende', { methode: 'POST', token: k && k.token,
          daten: { ils: cfg.ils, laufId: S.laufId, aufgabenPunkte, anzahl: S.karten.length } });
        if (status === 200) { S.phase = 'ende'; S.resultat = d; sichern(); zeigen(); return; }
        karte.innerHTML = '';
        karte.append(el('div', { class: 'q-text' }, 'Ergebnis nicht gewertet'),
          el('p', {}, d.grund === 'zu-schnell' ? 'Das ging schneller, als man die Aufgaben lesen kann – dieser Durchgang zählt nicht.'
            : d.grund === 'lauf-unbekannt' ? 'Dieser Durchgang ist nicht mehr gültig (z. B. weil Sie auf einem anderen Gerät neu gestartet haben).'
              : 'Das Ergebnis konnte nicht gewertet werden.'),
          el('button', { type: 'button', class: 'btn block', onclick: () => { S = null; speicher.schreiben(schluessel(), null); startZeigen(); } }, 'Neu starten'));
      } catch (e) {
        karte.innerHTML = '';
        karte.append(el('div', { class: 'q-text' }, '📶 Keine Verbindung'),
          el('p', {}, `Sie haben ${aufgabenPunkte} Aufgabenpunkte. Ihr Ergebnis ist gespeichert – senden Sie es, sobald Sie wieder online sind.`),
          el('button', { type: 'button', class: 'btn block', id: 'ch-senden', onclick: senden }, 'Ergebnis senden'));
      }
    }

    function endeZeigen() {
      const r = S.resultat;
      const k = K.konto();
      const kopfKarte = el('div', { class: 'card ch-ergebnis' },
        el('div', { class: 'small' }, 'Ihr Ergebnis'),
        el('div', { class: 'ch-gesamt' }, `${r.punkte} Punkte`),
        el('p', {}, `Aufgaben: ${r.aufgabenPunkte} von ${S.karten.length * PUNKTE} · Zeitbonus: ${r.bonus} · Zeit: ${uhr(r.sekunden)}`),
        r.neuerRekord ? el('p', { class: 'geschafft' }, '🎉 Neuer persönlicher Rekord!') : el('p', { class: 'small' }, `Ihr Rekord: ${r.best.punkte} Punkte`),
        el('p', { class: 'q-text' }, `Platz ${r.platz} von ${r.von} in Ihrer Klasse`));
      const liste = el('div', { class: 'card' }, el('div', { class: 'q-text' }, 'Bestenliste Ihrer Klasse'), bestenliste(r.liste, k && k.name));
      // Punkte je Abschnitt
      const jeAbschnitt = pools.map((p, pi) => {
        const e = S.ergebnisse.filter((x) => x.p === pi);
        return { name: p.name, ist: e.reduce((x, y) => x + y.punkte, 0), max: e.length * PUNKTE };
      }).filter((x) => x.max).sort((x, y) => x.ist / x.max - y.ist / y.max);
      const themen = el('div', { class: 'card' }, el('div', { class: 'q-text' }, 'Punkte je Abschnitt (schwächster oben)'),
        el('ul', { class: 'ch-themen' }, jeAbschnitt.map((x) => el('li', {}, el('span', {}, x.name), el('strong', {}, `${x.ist}/${x.max}`)))),
        el('p', { class: 'small' }, 'Lesen Sie den schwächsten Abschnitt auf dem Arbeitsblatt noch einmal – dann holen Sie beim nächsten Mal mehr Punkte.'));
      // Fehler mit Lösung
      const fehler = S.ergebnisse.filter((e) => e.punkte < e.max);
      const loesungen = el('div', { class: 'card' }, el('div', { class: 'q-text' }, fehler.length ? `Ihre Fehler mit Lösung (${fehler.length})` : 'Alles richtig – stark! 💪'),
        fehler.map((e) => {
          const auf = pools[e.p].aufgaben[e.i];
          return el('div', { class: 'ch-fehler' },
            el('div', { class: 'small' }, `${pools[e.p].name} · +${e.punkte}`),
            el('div', { class: 'ch-frage' }, ohneTags(auf.frage || auf.aussage || '')),
            auf.aussage && auf.frage ? el('div', { class: 'small' }, '„' + ohneTags(auf.aussage) + '“') : null,
            el('div', { class: 'ch-loesung' }, '✓ ' + loesung(auf)),
            auf.erklaerung ? el('div', { class: 'small' }, ohneTags(auf.erklaerung)) : null);
        }));
      const knoepfe = el('div', { class: 'links' },
        el('button', { type: 'button', class: 'btn block', id: 'ch-nochmal', onclick: () => { S = null; speicher.schreiben(schluessel(), null); startZeigen(); } }, 'Nochmal spielen'),
        a ? el('a', { class: 'btn secondary block', href: K.link(a.pfad) }, 'Zur Übersicht') : null);
      inhalt.append(kopfKarte, liste, themen, loesungen, knoepfe);
    }

    function zeigen() {
      leeren();
      if (!S) return startZeigen();
      if (S.phase === 'lauf') return karteZeigen();
      if (S.phase === 'senden') return senden();
      if (S.phase === 'ende') return endeZeigen();
      return startZeigen();
    }

    K.bereich(oben, async () => {
      const st = await K.standHolen();
      if (quiz && !(st[cfg.ils] && st[cfg.ils][quiz.id])) {
        info.append(el('div', { class: 'card gesperrt' },
          el('div', { class: 'q-text' }, '🔒 Die ILS-Challenge ist noch gesperrt'),
          el('p', {}, 'Sie wird freigeschaltet, wenn Sie das Abschlussquiz bestanden haben.'),
          el('a', { class: 'btn secondary block', href: K.link(a.pfad) }, 'Zur Übersicht')));
        return;
      }
      S = speicher.lesen(schluessel());
      if (S && S.sig !== sig) S = null;
      inhalt.classList.remove('hidden');
      zeigen();
    });
  }

  return { start, loesung, teile };
})();
