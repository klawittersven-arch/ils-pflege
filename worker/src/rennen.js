/* Quiz-Rennen im Klassenraum (z. B. „ABCDE-Rennen“) – ein eigenes Durable Object je Raum.
 *
 * Ablauf  Die Beamer-Seite (/quiz-rennen/beamer/) legt einen Raum an und zeigt QR-Code UND Rennen auf demselben
 *         Bildschirm – so kann jederzeit jemand dazukommen (scannen) oder nach einem Ausfall wieder einsteigen.
 *         Die SuS geben Vorname + Anfangsbuchstaben des Nachnamens ein und ordnen Befunde zu (A–E).
 *         Wer zuerst <ziel> richtige HINTEREINANDER schafft, ist im Ziel. Ein Fehler → zurück auf 0.
 *         Der Server stellt die Fragen und prüft die Antworten: Die Lösung kommt erst nach der Antwort aufs Handy,
 *         und durch Neuladen lässt sich keine Frage überspringen (die aktuelle Frage bleibt dieselbe).
 *
 * Schnittstelle (JSON; <lk> = Schlüssel der Beamer-Seite, <token> = Schlüssel eines Handys, beide als Bearer)
 *   POST /api/rennen/neu        { set, ziel? }                    → { raum, lk }
 *   GET  /api/rennen/beamer?raum=…     (Bearer lk)              → Stand aller Bahnen
 *   POST /api/rennen/steuern    { raum, aktion, ziel?, an?, id? } (Bearer lk)  aktion: start | stopp | runde | ziel | zeitlimit | entfernen | loeschen
 *   GET  /api/rennen/fehler?raum=…     (Bearer lk)              → häufige Fehler je Frage (anonym, nur Summen)
 *   GET  /api/rennen/info?raum=…                                → { titel, status } (gibt es den Raum? – vor der Namenseingabe)
 *   POST /api/rennen/beitreten  { raum, vorname, initial, token? } → { token, id, name }
 *   GET  /api/rennen/ich?raum=…        (Bearer token)           → eigener Stand + aktuelle Frage (ohne Lösung)
 *   POST /api/rennen/antwort    { raum, frage, wahl }             (Bearer token) → richtig?, Lösung + Begründung, nächste Frage
 *                               { raum, frage, zeit: true }       Zeit abgelaufen (das Handy meldet es) → wie ein Fehler
 *   POST /api/rennen/verlassen  { raum }                          (Bearer token) → eigene Bahn entfernen (z. B. Name vertippt)
 *
 * Datenschutz: Gespeichert werden nur der Anzeigename („Anna K.“) und der Spielstand – keine Klasse, kein Gerät,
 * keine einzelnen Antworten einer Person (die Fehlerstatistik je Frage ist anonym). Der Raum löscht sich
 * 3 Stunden nach der letzten Aktivität selbst (Alarm); „Neue Klasse“ auf der Beamer-Seite löscht sofort. */
import { DurableObject } from 'cloudflare:workers';
import '../../assets/quiz-rennen-fragen.js';   // legt globalThis.QUIZ_RENNEN_SETS an

const SETS = globalThis.QUIZ_RENNEN_SETS || {};

const RAUM_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // ohne I, O, 0, 1 (verwechselbar)
export const RAUM_MUSTER = /^[A-HJ-NP-Z2-9]{4}$/;
const TOKEN_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TOKEN_MUSTER = /^[A-Za-z0-9]{24,40}$/;
const ID_ZEICHEN = 'abcdefghijkmnpqrstuvwxyz23456789';
const ID_MUSTER = /^[a-z0-9]{8}$/;
const FRAGE_MUSTER = /^[a-z0-9]{1,8}$/;
const VORNAME_MUSTER = /^\p{L}[\p{L}\p{N}' -]{0,19}$/u;   // Ziffern erlaubt (z. B. „Anna2“, wenn der Name schon vergeben ist)
const INITIAL_MUSTER = /^\p{L}$/u;
const AKTIONEN = new Set(['start', 'stopp', 'runde', 'ziel', 'zeitlimit', 'entfernen', 'loeschen']);

export const ZIELE = [5, 8, 10, 12, 15, 20];
export const ZIEL_STANDARD = 10;
const MAX_SPIELER = 60;
export const LEBEN_MS = 3 * 3600000;        // Raum löscht sich 3 h nach der letzten Aktivität
export const COUNTDOWN_MS = 5000;           // „5 – 4 – 3 – 2 – 1 – Los!“ – lang genug, dass jedes wartende Handy ihn mitbekommt
const MIN_ANTWORT_MS = 350;                 // schneller kann kein Mensch lesen (Schutz gegen Skripte)
// Zeitlimit je Frage (am Beamer abschaltbar): kurze Befunde bis 20 Zeichen 3 s, je weiteres Zeichen 0,08 s mehr
// (die längsten Sätze im ABCDE-Satz: gut 6 s). Die Zeit läuft ab dem Erscheinen der Frage auf dem Handy.
const ZEIT_KURZ_MS = 3000;
const ZEIT_KURZ_ZEICHEN = 20;
const ZEIT_JE_ZEICHEN_MS = 80;
export function zeitLimit(text) {
  const extra = Math.max(0, [...String(text)].length - ZEIT_KURZ_ZEICHEN) * ZEIT_JE_ZEICHEN_MS;
  return Math.min(9000, Math.round((ZEIT_KURZ_MS + extra) / 100) * 100);
}
const UEBERNAHME_MS = 60000;                // gleicher Name: nach 1 Minute ohne Lebenszeichen darf ein anderes Gerät übernehmen
const SICHERN_SPAETESTENS_MS = 60000;
const MAX_KOERPER = 4000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Passwort',
  'Access-Control-Max-Age': '86400'
};
const STATUS_HTTP = { 'kein-raum': 404, unbekannt: 404, schluessel: 403, ungueltig: 400 };

function antwort(daten, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS }
  });
}
const mitStatus = (e) => antwort(e, e.ok ? 200 : (STATUS_HTTP[e.grund] || 200));
const ungueltig = () => antwort({ ok: false, grund: 'ungueltig' }, 400);

async function jsonLesen(request) {
  const text = await request.text();
  if (text.length > MAX_KOERPER) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

function bearer(request) {
  const m = /^Bearer\s+([A-Za-z0-9]{24,40})$/.exec(request.headers.get('Authorization') || '');
  return m ? m[1] : '';
}

function zufall(laenge, zeichen) {
  const zahlen = new Uint32Array(laenge);
  crypto.getRandomValues(zahlen);
  let aus = '';
  for (let i = 0; i < laenge; i++) aus += zeichen[zahlen[i] % zeichen.length];
  return aus;
}

function normName(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

function mischen(x) {
  const a = x.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const z = new Uint32Array(1);
    crypto.getRandomValues(z);
    const j = z[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function anzeigeName(vorname, initial) {
  const v = vorname.trim().replace(/\s+/g, ' ');
  return v.charAt(0).toLocaleUpperCase('de-DE') + v.slice(1) + ' ' + initial.toLocaleUpperCase('de-DE') + '.';
}

const raumObjekt = (env, raum) => env.RENNEN.get(env.RENNEN.idFromName('raum:' + raum));

/* ---------- Anfragen an /api/rennen/… (aus worker/src/index.js weitergereicht) ---------- */
export async function rennenAnfrage(request, env, url, weg) {
  if (!env.RENNEN) return antwort({ ok: false, grund: 'nicht-eingerichtet' }, 503);
  const aktion = weg.slice('/api/rennen/'.length);
  const methode = request.method;

  if (methode === 'GET') {
    const raum = String(url.searchParams.get('raum') || '').toUpperCase();
    if (!RAUM_MUSTER.test(raum)) return ungueltig();
    const r = raumObjekt(env, raum);
    if (aktion === 'info') return mitStatus(await r.info());
    const schluessel = bearer(request);
    if (!schluessel) return antwort({ ok: false, grund: 'unbekannt' }, 401);
    if (aktion === 'beamer') return mitStatus(await r.beamer(schluessel));
    if (aktion === 'fehler') return mitStatus(await r.fehlerListe(schluessel));
    if (aktion === 'ich') return mitStatus(await r.ich(schluessel));
    return antwort({ ok: false, grund: 'nicht-gefunden' }, 404);
  }
  if (methode !== 'POST') return antwort({ ok: false, grund: 'nicht-gefunden' }, 404);
  const d = await jsonLesen(request);
  if (!d || typeof d !== 'object') return ungueltig();

  if (aktion === 'neu') {
    const set = String(d.set ?? 'abcde');
    if (!Object.prototype.hasOwnProperty.call(SETS, set)) return ungueltig();
    const ziel = ZIELE.includes(Number(d.ziel)) ? Number(d.ziel) : ZIEL_STANDARD;
    const zeitlimit = d.zeitlimit !== false;
    for (let versuch = 0; versuch < 8; versuch++) {
      const raum = zufall(4, RAUM_ZEICHEN);
      const lk = zufall(32, TOKEN_ZEICHEN);
      const e = await raumObjekt(env, raum).anlegen(raum, set, lk, ziel, zeitlimit);
      if (e.ok) return antwort({ ok: true, raum, lk });
    }
    return antwort({ ok: false, grund: 'kein-raum-frei' }, 503);
  }

  const raum = String(d.raum ?? '').toUpperCase();
  if (!RAUM_MUSTER.test(raum)) return ungueltig();
  const r = raumObjekt(env, raum);

  if (aktion === 'beitreten') {
    const vorname = String(d.vorname ?? '').trim().replace(/\s+/g, ' ');
    const initial = String(d.initial ?? '').trim().replace(/\.$/, '');
    const token = typeof d.token === 'string' && TOKEN_MUSTER.test(d.token) ? d.token : '';
    if (!VORNAME_MUSTER.test(vorname) || !INITIAL_MUSTER.test(initial)) return ungueltig();
    return mitStatus(await r.beitreten(vorname, initial, token));
  }

  const schluessel = bearer(request);
  if (!schluessel) return antwort({ ok: false, grund: 'unbekannt' }, 401);
  if (aktion === 'antwort') {
    const frage = String(d.frage ?? '');
    const zeit = d.zeit === true;
    const wahl = zeit ? '' : String(d.wahl ?? '');
    if (!FRAGE_MUSTER.test(frage) || (!zeit && !/^[A-Z]$/.test(wahl))) return ungueltig();
    return mitStatus(await r.antworten(schluessel, frage, wahl, zeit));
  }
  if (aktion === 'verlassen') return mitStatus(await r.verlassen(schluessel));
  if (aktion === 'steuern') {
    const was = String(d.aktion ?? '');
    if (!AKTIONEN.has(was)) return ungueltig();
    let wert = null;
    if (was === 'ziel') { wert = Number(d.ziel); if (!ZIELE.includes(wert)) return ungueltig(); }
    if (was === 'entfernen') { wert = String(d.id ?? ''); if (!ID_MUSTER.test(wert)) return ungueltig(); }
    if (was === 'zeitlimit') { if (typeof d.an !== 'boolean') return ungueltig(); wert = d.an; }
    return mitStatus(await r.steuern(schluessel, was, wert));
  }
  return antwort({ ok: false, grund: 'nicht-gefunden' }, 404);
}

/* ---------- Durable Object: ein Raum ----------
 * Speicher: ein einziger Schlüssel „raum“ =
 *   { raum, set, lk, angelegt, zuletzt, status: 'warten'|'laeuft'|'beendet', start, ende, ziel, zeitlimit, runde,
 *     spieler: { <id>: { id, token, name, schl, beigetreten, zuletzt, serie, best, fehler, zeit, richtig, imZiel,
 *                        frage: { id, um } | null, wieder: [{ id, in }], beutel: [ids] } },
 *     stat: { <frage>: { n, falsch, zeit, als: { <Buchstabe>: anzahl } } } }   (anonym, für „Häufige Fehler“)
 * serie = richtige hintereinander (Fortschritt auf der Bahn), best = längste Serie, imZiel = Zeitpunkt des Zieleinlaufs,
 * fehler = alle Fehler (auch Zeit abgelaufen), zeit = davon „zu langsam“. */
export class Rennen extends DurableObject {
  async laden() {
    if (this.r === undefined) this.r = (await this.ctx.storage.get('raum')) || null;
    return this.r;
  }

  async sichern() {
    const jetzt = Date.now();
    this.r.zuletzt = jetzt;
    await this.ctx.storage.put('raum', this.r);
    this.gesichert = jetzt;
    if (!this.alarmGesetzt || jetzt - this.alarmGesetzt > 10 * 60000) {
      this.alarmGesetzt = jetzt;
      await this.ctx.storage.setAlarm(jetzt + LEBEN_MS);
    }
  }

  // Lesende Abfragen (Beamer, wartende Handys) halten den Raum am Leben, ohne jedes Mal zu schreiben
  async beruehren() {
    this.r.zuletzt = Date.now();
    if (!this.gesichert || Date.now() - this.gesichert > SICHERN_SPAETESTENS_MS) await this.sichern();
  }

  async alarm() {
    const r = await this.laden();
    if (r && Date.now() - r.zuletzt < LEBEN_MS - 5000) {
      await this.ctx.storage.setAlarm(r.zuletzt + LEBEN_MS);
      return;
    }
    await this.ctx.storage.deleteAll();
    this.r = null;
  }

  async anlegen(raum, set, lk, ziel, zeitlimit = true) {
    if (await this.laden()) return { ok: false, grund: 'belegt' };
    const jetzt = Date.now();
    this.r = { raum, set, lk, angelegt: jetzt, zuletzt: jetzt, status: 'warten', start: null, ende: null, ziel, zeitlimit, runde: 1, spieler: {}, stat: {} };
    await this.sichern();
    return { ok: true };
  }

  spielerZu(token) {
    return Object.values(this.r.spieler).find((p) => p.token === token) || null;
  }

  rangliste() {
    return Object.values(this.r.spieler).sort((a, b) => (!!b.imZiel - !!a.imZiel)
      || (a.imZiel && b.imZiel ? a.imZiel - b.imZiel : 0)
      || (b.serie - a.serie) || (b.best - a.best) || (a.beigetreten - b.beigetreten));
  }

  set() {
    return SETS[this.r.set];
  }

  /* Nächste Frage für eine Person: zuerst fällige Wiederholungen (falsch beantwortete Fragen kommen nach 2–4 anderen
     wieder), sonst aus einem gemischten „Beutel“ – so kommt jede Frage einmal dran, bevor sich etwas wiederholt. */
  naechste(p) {
    const ids = this.set().fragen.map((f) => f.id);
    const letzte = p.frage ? p.frage.id : null;
    p.wieder = (p.wieder || []).filter((w) => ids.includes(w.id));
    for (const w of p.wieder) w.in -= 1;
    let id = null;
    const i = p.wieder.findIndex((w) => w.in <= 0 && w.id !== letzte);
    if (i >= 0) id = p.wieder.splice(i, 1)[0].id;
    else {
      p.beutel = (p.beutel || []).filter((x) => ids.includes(x));
      if (!p.beutel.length) p.beutel = mischen(ids);
      id = p.beutel.pop();
      if (id === letzte && ids.length > 1) {
        if (!p.beutel.length) p.beutel = mischen(ids.filter((x) => x !== letzte));
        const ersatz = p.beutel.pop();
        p.beutel.unshift(id);
        id = ersatz;
      }
    }
    p.beutel = (p.beutel || []).filter((x) => x !== id);
    return { id, um: Date.now() };
  }

  frageGeben(p, jetzt) {
    if (this.r.status !== 'laeuft' || jetzt < this.r.start || p.frage) return false;
    p.frage = this.naechste(p);
    return true;
  }

  zustand(p, jetzt) {
    const r = this.r;
    const liste = this.rangliste();
    const f = r.status === 'laeuft' && jetzt >= r.start && p.frage ? this.set().fragen.find((x) => x.id === p.frage.id) : null;
    const mitZeit = r.zeitlimit !== false;
    return {
      ok: true, jetzt, raum: r.raum, status: r.status, start: r.start, ende: r.ende, ziel: r.ziel, zeitlimit: mitZeit, runde: r.runde,
      id: p.id, name: p.name, serie: p.serie, best: p.best, imZiel: p.imZiel,
      platz: liste.indexOf(p) + 1, von: liste.length,
      frage: f ? { id: f.id, text: f.text, zeit: mitZeit ? zeitLimit(f.text) : null } : null
    };
  }

  beamerStand(jetzt) {
    const r = this.r;
    const s = this.set();
    return {
      ok: true, jetzt, raum: r.raum, set: { id: s.id, titel: s.titel }, status: r.status, start: r.start, ende: r.ende,
      ziel: r.ziel, ziele: ZIELE, zeitlimit: r.zeitlimit !== false, runde: r.runde,
      spieler: this.rangliste().map((p) => ({ id: p.id, name: p.name, serie: p.serie, best: p.best, fehler: p.fehler, zeit: p.zeit || 0,
        richtig: p.richtig, imZiel: p.imZiel, zuletzt: p.zuletzt, beigetreten: p.beigetreten }))
    };
  }

  /* ----- Beamer ----- */
  async beamer(lk) {
    if (!(await this.laden())) return { ok: false, grund: 'kein-raum' };
    if (this.r.lk !== lk) return { ok: false, grund: 'schluessel' };
    await this.beruehren();
    return this.beamerStand(Date.now());
  }

  async steuern(lk, was, wert) {
    const r = await this.laden();
    if (!r) return { ok: false, grund: 'kein-raum' };
    if (r.lk !== lk) return { ok: false, grund: 'schluessel' };
    const jetzt = Date.now();
    const zuruecksetzen = () => {
      for (const p of Object.values(r.spieler)) Object.assign(p, { serie: 0, best: 0, fehler: 0, zeit: 0, richtig: 0, imZiel: null, frage: null, wieder: [] });
    };
    if (was === 'loeschen') {
      await this.ctx.storage.deleteAll();
      await this.ctx.storage.deleteAlarm();
      this.r = null;
      return { ok: true, geloescht: true };
    }
    if (was === 'start') { zuruecksetzen(); Object.assign(r, { status: 'laeuft', start: jetzt + COUNTDOWN_MS, ende: null, runde: r.runde + 1 }); }
    else if (was === 'stopp') { if (r.status === 'laeuft') Object.assign(r, { status: 'beendet', ende: jetzt }); }
    else if (was === 'runde') { zuruecksetzen(); Object.assign(r, { status: 'warten', start: null, ende: null, runde: r.runde + 1 }); }
    else if (was === 'ziel') { if (r.status === 'laeuft') return { ok: false, grund: 'laeuft' }; r.ziel = wert; }
    else if (was === 'zeitlimit') { if (r.status === 'laeuft') return { ok: false, grund: 'laeuft' }; r.zeitlimit = wert; }
    else if (was === 'entfernen') delete r.spieler[wert];
    await this.sichern();
    return this.beamerStand(jetzt);
  }

  async fehlerListe(lk) {
    if (!(await this.laden())) return { ok: false, grund: 'kein-raum' };
    if (this.r.lk !== lk) return { ok: false, grund: 'schluessel' };
    const s = this.set();
    const liste = s.fragen.map((f) => ({ id: f.id, text: f.text, k: f.k, warum: f.warum, zeit: 0, ...(this.r.stat[f.id] || { n: 0, falsch: 0, als: {} }) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => ((b.falsch + b.zeit) - (a.falsch + a.zeit)) || ((b.falsch + b.zeit) / b.n - (a.falsch + a.zeit) / a.n) || a.id.localeCompare(b.id));
    return { ok: true, kategorien: s.kategorien, liste };
  }

  /* ----- Handys ----- */
  async info() {
    if (!(await this.laden())) return { ok: false, grund: 'kein-raum' };
    await this.beruehren();
    const s = this.set();
    return { ok: true, raum: this.r.raum, titel: s.titel, status: this.r.status, ziel: this.r.ziel };
  }

  async beitreten(vorname, initial, token) {
    const r = await this.laden();
    if (!r) return { ok: false, grund: 'kein-raum' };
    const jetzt = Date.now();
    const alt = token ? this.spielerZu(token) : null;
    if (alt) { alt.zuletzt = jetzt; return { ok: true, token: alt.token, id: alt.id, name: alt.name }; }
    const schl = normName(vorname) + '|' + normName(initial);
    const gleich = Object.values(r.spieler).find((p) => p.schl === schl);
    if (gleich) {
      // gleicher Name: neues Handy derselben Person (Akku leer, anderer Browser) – oder jemand anderes mit gleichem Namen
      if (jetzt - gleich.zuletzt < UEBERNAHME_MS) return { ok: false, grund: 'name-belegt' };
      gleich.token = zufall(24, TOKEN_ZEICHEN);
      gleich.zuletzt = jetzt;
      await this.sichern();
      return { ok: true, token: gleich.token, id: gleich.id, name: gleich.name, uebernommen: true };
    }
    if (Object.keys(r.spieler).length >= MAX_SPIELER) return { ok: false, grund: 'voll' };
    let id;
    do id = zufall(8, ID_ZEICHEN); while (r.spieler[id]);
    const p = { id, token: zufall(24, TOKEN_ZEICHEN), name: anzeigeName(vorname, initial), schl, beigetreten: jetzt, zuletzt: jetzt,
      serie: 0, best: 0, fehler: 0, zeit: 0, richtig: 0, imZiel: null, frage: null, wieder: [], beutel: [] };
    r.spieler[id] = p;
    await this.sichern();
    return { ok: true, token: p.token, id, name: p.name };
  }

  async ich(token) {
    if (!(await this.laden())) return { ok: false, grund: 'kein-raum' };
    const p = this.spielerZu(token);
    if (!p) return { ok: false, grund: 'unbekannt' };
    const jetzt = Date.now();
    p.zuletzt = jetzt;
    if (this.frageGeben(p, jetzt)) await this.sichern();
    else await this.beruehren();
    const s = this.set();
    return { ...this.zustand(p, jetzt), set: { id: s.id, titel: s.titel, aufgabe: s.aufgabe, kategorien: s.kategorien } };
  }

  async antworten(token, frageId, wahl, zeit = false) {
    const r = await this.laden();
    if (!r) return { ok: false, grund: 'kein-raum' };
    const p = this.spielerZu(token);
    if (!p) return { ok: false, grund: 'unbekannt' };
    const jetzt = Date.now();
    p.zuletzt = jetzt;
    if (r.status !== 'laeuft' || jetzt < r.start) {
      await this.beruehren();
      return { ...this.zustand(p, jetzt), ok: false, grund: r.status === 'beendet' ? 'beendet' : 'nicht-gestartet' };
    }
    if (!p.frage || p.frage.id !== frageId) {
      // doppelt getippt oder alte Seite: aktuelle Frage zurückgeben
      const neu = this.frageGeben(p, jetzt);
      if (neu) await this.sichern(); else await this.beruehren();
      return { ...this.zustand(p, jetzt), ok: false, grund: 'veraltet' };
    }
    if (!zeit && jetzt - p.frage.um < MIN_ANTWORT_MS) return { ...this.zustand(p, jetzt), ok: false, grund: 'zu-schnell' };
    const f = this.set().fragen.find((x) => x.id === frageId);
    if (!f || (!zeit && !this.set().kategorien.some((k) => k.k === wahl))) return { ok: false, grund: 'ungueltig' };
    const richtig = !zeit && f.k === wahl;
    const st = r.stat[f.id] || (r.stat[f.id] = { n: 0, falsch: 0, zeit: 0, als: {} });
    st.n += 1;
    if (richtig) {
      p.richtig += 1;
      if (!p.imZiel) {
        p.serie += 1;
        p.best = Math.max(p.best, p.serie);
        if (p.serie >= r.ziel) p.imZiel = jetzt;
      }
    } else {
      if (zeit) {   // Zeit abgelaufen: zählt wie ein Fehler, in der Statistik getrennt („zu langsam“)
        st.zeit = (st.zeit || 0) + 1;
        p.zeit = (p.zeit || 0) + 1;
      } else {
        st.falsch += 1;
        st.als[wahl] = (st.als[wahl] || 0) + 1;
      }
      p.fehler += 1;
      if (!p.imZiel) p.serie = 0;
      p.wieder = (p.wieder || []).filter((w) => w.id !== f.id);
      p.wieder.push({ id: f.id, in: 3 + Math.floor(Math.random() * 3) });
    }
    p.frage = this.naechste(p);
    await this.sichern();
    return { ...this.zustand(p, jetzt), richtig, gewaehlt: wahl || null, zuLangsam: zeit, loesung: f.k, warum: f.warum, ok: true };
  }

  async verlassen(token) {
    if (!(await this.laden())) return { ok: false, grund: 'kein-raum' };
    const p = this.spielerZu(token);
    if (!p) return { ok: true };
    delete this.r.spieler[p.id];
    await this.sichern();
    return { ok: true };
  }
}
