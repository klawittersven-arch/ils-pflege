/* Nachbau der Cloudflare-Umgebung in Node – für Tests ohne wrangler (z. B. ohne Internet für npm install).
 * Durable Objects laufen als normale Objekte mit einem Speicher im Arbeitsspeicher; Aufrufe gehen wie bei
 * Cloudflare (RPC) über eine Kopie der Daten (structuredClone). Ein kleiner HTTP-Server reicht Anfragen an
 * worker/src/index.js weiter.  Nutzung:  const w = await workerNachbauen();  …  w.url, w.env, w.beenden()  */
import { register } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// „cloudflare:workers“ gibt es nur bei Cloudflare – hier eine schlanke Ersatz-Klasse
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spez, kontext, weiter) {
  if (spez === 'cloudflare:workers') {
    return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent('export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }') };
  }
  return weiter(spez, kontext);
}
export async function load(url, kontext, weiter) {
  if (url.includes('/worker/src/') && url.endsWith('.js')) return weiter(url, { ...kontext, format: 'module' });
  return weiter(url, kontext);
}`));

// Speicher wie bei Cloudflare (auch die Mehrfach-Formen: get([…]), put({…}), delete([…]); list sortiert nach Schlüssel)
class Speicher {
  constructor() { this.m = new Map(); this.alarmZeit = null; }
  async get(k) {
    if (Array.isArray(k)) return new Map(k.filter((x) => this.m.has(x)).map((x) => [x, structuredClone(this.m.get(x))]));
    return this.m.has(k) ? structuredClone(this.m.get(k)) : undefined;
  }
  async put(k, v) {
    if (k && typeof k === 'object') { for (const [a, b] of Object.entries(k)) this.m.set(a, structuredClone(b)); return; }
    this.m.set(k, structuredClone(v));
  }
  async delete(k) {
    if (Array.isArray(k)) { let n = 0; for (const x of k) if (this.m.delete(x)) n++; return n; }
    return this.m.delete(k);
  }
  async deleteAll() { this.m.clear(); }
  async list({ prefix = '', start, end, limit, reverse } = {}) {
    let e = [...this.m].filter(([k]) => k.startsWith(prefix) && (start === undefined || k >= start) && (end === undefined || k < end))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (reverse) e.reverse();
    if (limit) e = e.slice(0, limit);
    return new Map(e.map(([k, v]) => [k, structuredClone(v)]));
  }
  async setAlarm(t) { this.alarmZeit = Number(t); }
  async getAlarm() { return this.alarmZeit; }
  async deleteAlarm() { this.alarmZeit = null; }
}

function namensraum(Klasse, env) {
  const objekte = new Map();
  return {
    objekte,
    idFromName: (name) => name,
    get(id) {
      if (!objekte.has(id)) objekte.set(id, new Klasse({ storage: new Speicher(), blockConcurrencyWhile: (f) => f() }, env));
      const o = objekte.get(id);
      return new Proxy({}, { get: (_, name) => async (...args) => structuredClone(await o[name](...args.map((a) => structuredClone(a)))) });
    }
  };
}

export async function workerNachbauen(variablen = {}) {
  const mod = await import(pathToFileURL(path.join(WURZEL, 'worker/src/index.js')).href);
  const env = { LEHRKRAFT_PASSWORT: 'test', ...variablen };
  env.DATEN = namensraum(mod.Daten, env);
  env.RENNEN = namensraum(mod.Rennen, env);
  const server = http.createServer(async (req, res) => {
    const teile = [];
    for await (const t of req) teile.push(t);
    const koerper = Buffer.concat(teile);
    try {
      const anfrage = new Request('http://127.0.0.1' + req.url, {
        method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : koerper
      });
      const r = await mod.default.fetch(anfrage, env);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.writeHead(500); res.end(String(e && e.stack));
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, env, mod, beenden: () => server.close() };
}
