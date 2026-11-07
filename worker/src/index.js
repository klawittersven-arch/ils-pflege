/* ILS-Fortschritt – Cloudflare-Worker mit einem Durable Object („Daten“) für die ganze Schule.
 *
 * Wofür?  Die SuS melden sich auf den ILS-Seiten einmal an (Klasse, Vorname, Geburtstag).
 *         Danach meldet das Handy jede erledigte Übung. Die Lehrkraft sieht auf /lehrkraft/
 *         eine Tabelle: wer hat welche Übung erledigt, wer hat den Auftrag abgeschlossen.
 *
 * Schnittstelle (alles JSON)
 *   SuS
 *     GET  /api/klassen                         → { klassen: ['3BFP2/1', …] }
 *     POST /api/anmelden  { klasse, vorname, geburtstag: 'JJJJ-MM-TT' }
 *                                               → { token, name, klasse }
 *     GET  /api/ich        (Authorization: Bearer <token>)  → { name, klasse, fortschritt }
 *     POST /api/melden     (Bearer) { ils, schritt, punkte, max, neustarts?, zuSchnell?, selbst?, selbstMax? }
 *                          nur bekannte Schritte (assets/auftraege.js); Abschluss erst nach allen Übungen
 *   Lehrkraft (Kopfzeile X-Passwort = Secret LEHRKRAFT_PASSWORT)
 *     GET  /api/lehrkraft/stand                 → alle SuS mit Fortschritt
 *     POST /api/lehrkraft/import    { text }    Zeilen „Klasse;Name;TT.MM.JJJJ“
 *     POST /api/lehrkraft/haken     { sid, ils, schritt, setzen }   von Hand abhaken / entfernen
 *     POST /api/lehrkraft/abmelden  { sid }     alle Geräte dieser Person abmelden
 *     POST /api/lehrkraft/schueler-loeschen     { sid }
 *     POST /api/lehrkraft/auftrag-loeschen      { ils }   Fortschritt eines ILS-Auftrags löschen
 *     POST /api/lehrkraft/alles-loeschen        { bestaetigung: 'ALLES LÖSCHEN' }
 *
 * Datenschutz: Geburtsdaten werden nie gespeichert, nur ein Prüfwert (HMAC-SHA-256 mit einem
 * geheimen Schlüssel, der nur im Durable Object liegt). Gespeichert werden Klasse, Anzeigename
 * („Vorname N.“) und welche Übung wann erledigt wurde – keine einzelnen Antworten.
 * Gelöscht wird nur von Hand (Lehrkraft-Seite). Cloudflare-Protokolle sind abgeschaltet.
 */
import { DurableObject } from 'cloudflare:workers';
import '../../assets/auftraege.js';   // legt globalThis.ILS_AUFTRAEGE an (gleiche Datei wie auf der Website)

const AUFTRAEGE = globalThis.ILS_AUFTRAEGE || [];
export function schrittFinden(ils, schritt) {
  const a = AUFTRAEGE.find((x) => x.id === ils);
  if (!a) return { auftrag: null, schritt: null };
  return { auftrag: a, schritt: a.schritte.find((x) => x.id === schritt) || null };
}

const MAX_KOERPER = 40000;          // Bytes je Anfrage (Import einer Klassenliste)
const MAX_SCHUELER = 400;
const MAX_AUFTRAEGE = 40;           // ILS-Aufträge je Person
const MAX_SCHRITTE = 30;            // Schritte je ILS-Auftrag
const FEHL_MAX = 40;                // fehlgeschlagene Anmeldungen je Klasse …
const FEHL_FENSTER_MS = 10 * 60000; // … in 10 Minuten, danach 10 Minuten Pause
const LK_FEHL_MAX = 10;             // falsche Lehrkraft-Passwörter …
const LK_FENSTER_MS = 15 * 60000;   // … in 15 Minuten

const KLASSE_MUSTER = /^[A-Za-z0-9][A-Za-z0-9/._ -]{0,19}$/;
const NAME_MUSTER = /^\p{L}[\p{L}\p{M} .'’-]{1,49}$/u;
const ILS_MUSTER = /^[a-z0-9-]{1,30}$/;
const SCHRITT_MUSTER = /^[a-z0-9-]{1,20}$/;
const TOKEN_MUSTER = /^[A-Za-z0-9]{32}$/;
const SID_MUSTER = /^[a-z0-9]{12}$/;
const DATUM_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Passwort',
  'Access-Control-Max-Age': '86400'
};

function antwort(daten, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS }
  });
}

/* ---------- kleine Hilfen (exportiert für Tests) ---------- */

export function zufall(laenge, zeichen) {
  const zahlen = new Uint8Array(laenge);
  crypto.getRandomValues(zahlen);
  let aus = '';
  for (let i = 0; i < laenge; i++) aus += zeichen[zahlen[i] % zeichen.length];
  return aus;
}

// Namen vereinheitlichen: Groß/Klein, Umlaute, Akzente, Leer- und Sonderzeichen spielen keine Rolle.
export function normName(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

// „05.09.1999“, „5.9.1999“ oder „1999-09-05“ → „1999-09-05“ (sonst null)
export function datumLesen(text) {
  const t = String(text || '').trim();
  let j, m, d;
  let r = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (r) { d = +r[1]; m = +r[2]; j = +r[3]; } else {
    r = DATUM_ISO.exec(t);
    if (!r) return null;
    j = +r[1]; m = +r[2]; d = +r[3];
  }
  if (j < 1930 || j > 2020) return null;
  const dt = new Date(Date.UTC(j, m - 1, d));
  if (dt.getUTCFullYear() !== j || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${j}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Aus „Anna Maria S.“ → Vornamen „annamaria“ und erster Vorname „anna“
export function vornamenAus(name) {
  const teile = String(name).trim().split(/\s+/);
  const vor = teile.length > 1 ? teile.slice(0, -1) : teile;
  return { vn: normName(vor[0]), vnVoll: normName(vor.join('')) };
}

// Eine Zeile der Klassenliste: „Klasse;Name;Geburtsdatum“ (auch mit Tabulator, z. B. aus Excel)
export function zeileLesen(zeile) {
  const teile = zeile.split(/\t|;/).map((t) => t.trim());
  if (teile.length < 3) return { fehler: 'Drei Angaben nötig: Klasse; Name; Geburtsdatum' };
  const [klasse, name, datumText] = teile;
  if (!KLASSE_MUSTER.test(klasse)) return { fehler: 'Klasse ungültig' };
  const sauber = name.replace(/\s+/g, ' ');
  if (!NAME_MUSTER.test(sauber) || normName(sauber).length < 2) return { fehler: 'Name ungültig' };
  const datum = datumLesen(datumText);
  if (!datum) return { fehler: 'Geburtsdatum ungültig (Format TT.MM.JJJJ)' };
  return { klasse, name: sauber, datum };
}

function ganzzahl(w, min, max) {
  const n = Number(w);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

async function jsonLesen(request) {
  const text = await request.text();
  if (text.length > MAX_KOERPER) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

function bearer(request) {
  const m = /^Bearer\s+(\S+)$/.exec(request.headers.get('Authorization') || '');
  return m && TOKEN_MUSTER.test(m[1]) ? m[1] : null;
}

function passwortAus(request) {
  try { return decodeURIComponent(request.headers.get('X-Passwort') || ''); } catch (e) { return ''; }
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))));
}

// Vergleich in konstanter Zeit (über die Hashwerte, damit auch die Länge nichts verrät)
async function gleichSicher(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let u = 0;
  for (let i = 0; i < x.length; i++) u |= x[i] ^ y[i];
  return u === 0;
}

const STATUS = { ungueltig: 400, abgemeldet: 401, 'nicht-gefunden': 401, passwort: 401, gesperrt: 429, unbekannt: 404, voll: 409, voraussetzung: 409, 'passwort-fehlt': 503 };
const mitStatus = (erg) => antwort(erg, erg.ok ? 200 : (STATUS[erg.grund] || 400));

/* ---------- Worker ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const weg = url.pathname.replace(/\/+$/, '') || '/';
    const methode = request.method;
    if (methode === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const daten = env.DATEN.get(env.DATEN.idFromName('schule'));

    try {
      if (weg === '/' && methode === 'GET') {
        return antwort({ dienst: 'ILS Pflege – Fortschritt', ok: true, passwortGesetzt: !!env.LEHRKRAFT_PASSWORT });
      }

      /* ----- SuS ----- */
      if (weg === '/api/klassen' && methode === 'GET') return antwort(await daten.klassen());

      if (weg === '/api/anmelden' && methode === 'POST') {
        const d = await jsonLesen(request);
        const klasse = String(d?.klasse ?? '').trim();
        const vorname = String(d?.vorname ?? '').trim();
        const datum = DATUM_ISO.test(String(d?.geburtstag ?? '')) ? datumLesen(d.geburtstag) : null;
        if (!KLASSE_MUSTER.test(klasse) || normName(vorname).length < 1 || vorname.length > 60 || !datum) {
          return antwort({ ok: false, grund: 'ungueltig' }, 400);
        }
        return mitStatus(await daten.anmelden(klasse, vorname, datum));
      }

      if (weg === '/api/ich' && methode === 'GET') {
        const token = bearer(request);
        if (!token) return antwort({ ok: false, grund: 'abgemeldet' }, 401);
        return mitStatus(await daten.ich(token));
      }

      if (weg === '/api/melden' && methode === 'POST') {
        const token = bearer(request);
        if (!token) return antwort({ ok: false, grund: 'abgemeldet' }, 401);
        const d = await jsonLesen(request);
        const ils = String(d?.ils ?? '');
        const schritt = String(d?.schritt ?? '');
        const max = ganzzahl(d?.max, 1, 1000);
        const punkte = ganzzahl(d?.punkte, 0, 1000);
        if (!ILS_MUSTER.test(ils) || !SCHRITT_MUSTER.test(schritt) || max === null || punkte === null || punkte > max) {
          return antwort({ ok: false, grund: 'ungueltig' }, 400);
        }
        const bekannt = schrittFinden(ils, schritt);
        if (!bekannt.schritt) return antwort({ ok: false, grund: 'unbekannter-schritt' }, 400);
        const zusatz = {};
        for (const [feld, max2] of [['neustarts', 999], ['zuSchnell', 999], ['selbst', 100], ['selbstMax', 100]]) {
          if (d[feld] === undefined || d[feld] === null) continue;
          const w = ganzzahl(d[feld], 0, max2);
          if (w === null) return antwort({ ok: false, grund: 'ungueltig' }, 400);
          zusatz[feld] = w;
        }
        if (zusatz.selbst !== undefined && !(zusatz.selbstMax >= 1 && zusatz.selbst <= zusatz.selbstMax)) {
          return antwort({ ok: false, grund: 'ungueltig' }, 400);
        }
        const voraussetzungen = bekannt.schritt.abschluss ? bekannt.auftrag.schritte.filter((x) => !x.abschluss).map((x) => x.id) : [];
        return mitStatus(await daten.melden(token, ils, schritt, punkte, max, zusatz, voraussetzungen));
      }

      /* ----- Lehrkraft ----- */
      if (weg.startsWith('/api/lehrkraft/')) {
        if (!env.LEHRKRAFT_PASSWORT) return antwort({ ok: false, grund: 'passwort-fehlt' }, 503);
        const zugang = await daten.lehrkraftPruefen(passwortAus(request));
        if (!zugang.ok) return mitStatus(zugang);
        const aktion = weg.slice('/api/lehrkraft/'.length);

        if (aktion === 'stand' && methode === 'GET') return mitStatus(await daten.stand());
        if (methode !== 'POST') return antwort({ ok: false, grund: 'nicht-gefunden' }, 404);
        const d = await jsonLesen(request);
        if (!d || typeof d !== 'object') return antwort({ ok: false, grund: 'ungueltig' }, 400);
        const sid = String(d.sid ?? '');

        if (aktion === 'import') {
          if (typeof d.text !== 'string') return antwort({ ok: false, grund: 'ungueltig' }, 400);
          return mitStatus(await daten.importieren(d.text));
        }
        if (aktion === 'haken') {
          const ils = String(d.ils ?? ''), schritt = String(d.schritt ?? '');
          if (!SID_MUSTER.test(sid) || !ILS_MUSTER.test(ils) || !SCHRITT_MUSTER.test(schritt)) return antwort({ ok: false, grund: 'ungueltig' }, 400);
          return mitStatus(await daten.haken(sid, ils, schritt, d.setzen === true));
        }
        if (aktion === 'abmelden' || aktion === 'schueler-loeschen') {
          if (!SID_MUSTER.test(sid)) return antwort({ ok: false, grund: 'ungueltig' }, 400);
          return mitStatus(aktion === 'abmelden' ? await daten.abmeldenAlle(sid) : await daten.schuelerLoeschen(sid));
        }
        if (aktion === 'auftrag-loeschen') {
          const ils = String(d.ils ?? '');
          if (!ILS_MUSTER.test(ils)) return antwort({ ok: false, grund: 'ungueltig' }, 400);
          return mitStatus(await daten.auftragLoeschen(ils));
        }
        if (aktion === 'alles-loeschen') {
          if (d.bestaetigung !== 'ALLES LÖSCHEN') return antwort({ ok: false, grund: 'ungueltig' }, 400);
          return mitStatus(await daten.allesLoeschen());
        }
      }

      return antwort({ ok: false, grund: 'nicht-gefunden' }, 404);
    } catch (e) {
      return antwort({ ok: false, grund: 'serverfehler' }, 500);
    }
  }
};

/* ---------- Durable Object: alle Daten der Schule ----------
 * Schlüssel im Speicher:
 *   geheim          zufälliger Schlüssel für die Geburtstags-Prüfwerte (verlässt das Objekt nie)
 *   s:<sid>         { sid, klasse, name, vn, vnVoll, geb (Prüfwert), angelegt, ersteAnmeldung, zuletzt }
 *   p:<sid>         { <ils>: { <schritt>: { um, punkte, max, quelle: 'sus'|'lehrkraft', zuletzt } } }
 *   t:<token>       { sid, um }   (angemeldetes Gerät)
 *   fehl:<klasse>   { start, anzahl }  fehlgeschlagene Anmeldungen
 *   lkfehl          { start, anzahl }  falsche Lehrkraft-Passwörter */
export class Daten extends DurableObject {
  async schluessel() {
    if (this._schluessel) return this._schluessel;
    let roh = await this.ctx.storage.get('geheim');
    if (!roh) {
      roh = zufall(64, '0123456789abcdef');
      await this.ctx.storage.put('geheim', roh);
    }
    const bytes = new Uint8Array(roh.match(/../g).map((h) => parseInt(h, 16)));
    this._schluessel = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return this._schluessel;
  }

  async pruefwert(datum) {
    const sig = await crypto.subtle.sign('HMAC', await this.schluessel(), new TextEncoder().encode('geb|' + datum));
    return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async alleSchueler() {
    return [...(await this.ctx.storage.list({ prefix: 's:' })).values()];
  }

  async klassen() {
    const k = [...new Set((await this.alleSchueler()).map((s) => s.klasse))].sort();
    return { ok: true, klassen: k };
  }

  /* ----- Anmeldung der SuS ----- */
  async anmelden(klasse, vorname, datum) {
    const jetzt = Date.now();
    const fehlSchl = 'fehl:' + klasse;
    const fehl = await this.ctx.storage.get(fehlSchl);
    if (fehl && fehl.anzahl >= FEHL_MAX && jetzt - fehl.start < FEHL_FENSTER_MS) {
      return { ok: false, grund: 'gesperrt', minuten: Math.ceil((fehl.start + FEHL_FENSTER_MS - jetzt) / 60000) };
    }
    const geb = await this.pruefwert(datum);
    const getippt = normName(vorname);
    // Der Geburtstag ist das Entscheidende; beim Vornamen genügt der richtige Anfangsbuchstabe
    // (so stören Schreibvarianten wie „Mohamed/Mohammed“ nicht).
    let treffer = (await this.alleSchueler()).filter((s) => s.klasse === klasse && s.geb === geb && s.vn[0] === getippt[0]);
    if (treffer.length > 1) {
      const gemeinsam = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
      const werte = treffer.map((s) => Math.max(gemeinsam(getippt, s.vnVoll), gemeinsam(getippt, s.vn)));
      const best = Math.max(...werte);
      treffer = treffer.filter((s, i) => werte[i] === best);
    }
    if (treffer.length !== 1) {
      const neu = !fehl || jetzt - fehl.start >= FEHL_FENSTER_MS ? { start: jetzt, anzahl: 1 } : { start: fehl.start, anzahl: fehl.anzahl + 1 };
      await this.ctx.storage.put(fehlSchl, neu);
      return { ok: false, grund: treffer.length > 1 ? 'mehrdeutig' : 'nicht-gefunden' };
    }
    const s = treffer[0];
    const token = zufall(32, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789');
    await this.ctx.storage.put('t:' + token, { sid: s.sid, um: jetzt });
    if (!s.ersteAnmeldung) { s.ersteAnmeldung = jetzt; await this.ctx.storage.put('s:' + s.sid, s); }
    return { ok: true, token, name: s.name, klasse: s.klasse };
  }

  async schuelerZuToken(token) {
    const t = await this.ctx.storage.get('t:' + token);
    if (!t) return null;
    return (await this.ctx.storage.get('s:' + t.sid)) || null;
  }

  async ich(token) {
    const s = await this.schuelerZuToken(token);
    if (!s) return { ok: false, grund: 'abgemeldet' };
    return { ok: true, name: s.name, klasse: s.klasse, fortschritt: (await this.ctx.storage.get('p:' + s.sid)) || {} };
  }

  async melden(token, ils, schritt, punkte, max, zusatz = {}, voraussetzungen = []) {
    const s = await this.schuelerZuToken(token);
    if (!s) return { ok: false, grund: 'abgemeldet' };
    const schl = 'p:' + s.sid;
    const p = (await this.ctx.storage.get(schl)) || {};
    const fehlt = voraussetzungen.filter((v) => !(p[ils] && p[ils][v]));
    if (fehlt.length) return { ok: false, grund: 'voraussetzung', fehlt };
    if (!p[ils] && Object.keys(p).length >= MAX_AUFTRAEGE) return { ok: false, grund: 'voll' };
    const auftrag = p[ils] || {};
    if (!auftrag[schritt] && Object.keys(auftrag).length >= MAX_SCHRITTE) return { ok: false, grund: 'voll' };
    const jetzt = Date.now();
    const alt = auftrag[schritt];
    if (!alt || alt.quelle === 'lehrkraft') {
      auftrag[schritt] = { um: alt ? alt.um : jetzt, punkte, max, quelle: 'sus', zuletzt: jetzt, ...zusatz };
    } else {
      // Erstes Erledigt-Datum bleibt; bestes Ergebnis zählt; Neustarts/Tempo-Warnungen sind Gesamtzahlen
      if (punkte / max > alt.punkte / alt.max) { alt.punkte = punkte; alt.max = max; }
      for (const f of ['neustarts', 'zuSchnell']) if (zusatz[f] !== undefined) alt[f] = Math.max(alt[f] || 0, zusatz[f]);
      if (zusatz.selbstMax && (!alt.selbstMax || zusatz.selbst / zusatz.selbstMax >= alt.selbst / alt.selbstMax)) {
        alt.selbst = zusatz.selbst; alt.selbstMax = zusatz.selbstMax;
      }
      alt.zuletzt = jetzt;
    }
    p[ils] = auftrag;
    s.zuletzt = jetzt;
    await this.ctx.storage.put({ [schl]: p, ['s:' + s.sid]: s });
    return { ok: true, fortschritt: p };
  }

  /* ----- Lehrkraft ----- */
  async lehrkraftPruefen(passwort) {
    const jetzt = Date.now();
    const fehl = await this.ctx.storage.get('lkfehl');
    if (fehl && fehl.anzahl >= LK_FEHL_MAX && jetzt - fehl.start < LK_FENSTER_MS) {
      return { ok: false, grund: 'gesperrt', minuten: Math.ceil((fehl.start + LK_FENSTER_MS - jetzt) / 60000) };
    }
    if (passwort && await gleichSicher(passwort, this.env.LEHRKRAFT_PASSWORT)) return { ok: true };
    const neu = !fehl || jetzt - fehl.start >= LK_FENSTER_MS ? { start: jetzt, anzahl: 1 } : { start: fehl.start, anzahl: fehl.anzahl + 1 };
    await this.ctx.storage.put('lkfehl', neu);
    return { ok: false, grund: 'passwort' };
  }

  async stand() {
    const [schueler, fortschritte, tokens] = await Promise.all([
      this.alleSchueler(),
      this.ctx.storage.list({ prefix: 'p:' }),
      this.ctx.storage.list({ prefix: 't:' })
    ]);
    const geraete = {};
    for (const t of tokens.values()) geraete[t.sid] = (geraete[t.sid] || 0) + 1;
    return {
      ok: true,
      jetzt: Date.now(),
      schueler: schueler.map((s) => ({
        sid: s.sid, klasse: s.klasse, name: s.name,
        ersteAnmeldung: s.ersteAnmeldung || null, zuletzt: s.zuletzt || null,
        geraete: geraete[s.sid] || 0,
        fortschritt: fortschritte.get('p:' + s.sid) || {}
      }))
    };
  }

  // Klassenliste übernehmen: neue Personen anlegen, bekannte (gleiche Klasse + Name) aktualisieren.
  // Niemand wird hier gelöscht; der Fortschritt bleibt erhalten.
  async importieren(text) {
    const zeilen = String(text).split(/\r?\n/);
    const vorhanden = await this.alleSchueler();
    const index = new Map(vorhanden.map((s) => [s.klasse + '|' + normName(s.name), s]));
    const fehler = [];
    const schreiben = {};
    let neu = 0, aktualisiert = 0;
    for (let i = 0; i < zeilen.length; i++) {
      const roh = zeilen[i].trim();
      if (!roh || /^klasse\s*[;\t]/i.test(roh)) continue;   // Leerzeilen und Kopfzeile überspringen
      const z = zeileLesen(roh);
      if (z.fehler) { fehler.push({ zeile: i + 1, text: z.fehler }); continue; }
      const schl = z.klasse + '|' + normName(z.name);
      const geb = await this.pruefwert(z.datum);
      const { vn, vnVoll } = vornamenAus(z.name);
      let s = index.get(schl);
      if (s) {
        s = { ...s, name: z.name, vn, vnVoll, geb };
        aktualisiert++;
      } else {
        if (index.size >= MAX_SCHUELER) { fehler.push({ zeile: i + 1, text: 'Zu viele Personen' }); continue; }
        s = { sid: zufall(12, 'abcdefghijkmnopqrstuvwxyz0123456789'), klasse: z.klasse, name: z.name, vn, vnVoll, geb, angelegt: Date.now() };
        neu++;
      }
      index.set(schl, s);
      schreiben['s:' + s.sid] = s;
    }
    const eintraege = Object.entries(schreiben);
    for (let i = 0; i < eintraege.length; i += 100) {
      await this.ctx.storage.put(Object.fromEntries(eintraege.slice(i, i + 100)));
    }
    return { ok: true, neu, aktualisiert, fehler };
  }

  async haken(sid, ils, schritt, setzen) {
    if (!(await this.ctx.storage.get('s:' + sid))) return { ok: false, grund: 'unbekannt' };
    const schl = 'p:' + sid;
    const p = (await this.ctx.storage.get(schl)) || {};
    if (setzen) {
      p[ils] = p[ils] || {};
      if (!p[ils][schritt]) p[ils][schritt] = { um: Date.now(), quelle: 'lehrkraft' };
    } else if (p[ils]) {
      delete p[ils][schritt];
      if (!Object.keys(p[ils]).length) delete p[ils];
    }
    await this.ctx.storage.put(schl, p);
    return { ok: true };
  }

  async tokensVon(sid) {
    const tokens = await this.ctx.storage.list({ prefix: 't:' });
    return [...tokens.entries()].filter(([, t]) => t.sid === sid).map(([k]) => k);
  }

  async abmeldenAlle(sid) {
    const weg = await this.tokensVon(sid);
    if (weg.length) await this.ctx.storage.delete(weg);
    return { ok: true, abgemeldet: weg.length };
  }

  async schuelerLoeschen(sid) {
    const weg = await this.tokensVon(sid);
    await this.ctx.storage.delete([...weg, 's:' + sid, 'p:' + sid]);
    return { ok: true };
  }

  async auftragLoeschen(ils) {
    const alle = await this.ctx.storage.list({ prefix: 'p:' });
    const schreiben = {};
    for (const [k, p] of alle) if (p[ils]) { delete p[ils]; schreiben[k] = p; }
    const eintraege = Object.entries(schreiben);
    for (let i = 0; i < eintraege.length; i += 100) {
      await this.ctx.storage.put(Object.fromEntries(eintraege.slice(i, i + 100)));
    }
    return { ok: true, betroffen: eintraege.length };
  }

  async allesLoeschen() {
    await this.ctx.storage.deleteAll();
    this._schluessel = null;
    return { ok: true };
  }
}
