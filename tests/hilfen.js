/* Gemeinsame Hilfen für die automatischen Tests (Playwright, Chromium, lokaler Worker).
 * Start:  (cd worker && npm install)  und dann  node tests/ablauf.test.js */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const WURZEL = path.resolve(__dirname, '..');
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json'
};

/* Lokaler Webserver für die Website; ils-server.js zeigt auf den Test-Worker. */
function serverStarten(workerUrl) {
  return new Promise((ok) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const datei = path.join(WURZEL, p);
      if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); res.end('nicht gefunden'); return; }
      res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      if (p === '/assets/ils-server.js') { res.end(`window.ILS_SERVER = '${workerUrl}';\n`); return; }
      fs.createReadStream(datei).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => ok({ server, basis: `http://127.0.0.1:${server.address().port}/` }));
  });
}

/* Startet den Worker lokal (wrangler dev, Daten in einem leeren Ordner). */
function workerStarten(port, passwort, variablen = {}) {
  const wrangler = path.join(WURZEL, 'worker', 'node_modules', '.bin', 'wrangler');
  const zustand = fs.mkdtempSync(path.join(os.tmpdir(), 'ils-wrangler-'));
  const kind = spawn(wrangler, ['dev', '--config', path.join(WURZEL, 'wrangler.jsonc'), '--port', String(port), '--ip', '127.0.0.1',
    '--var', `LEHRKRAFT_PASSWORT:${passwort}`, ...Object.entries(variablen).flatMap(([k, v]) => ['--var', `${k}:${v}`]),
    '--persist-to', zustand, '--show-interactive-dev-session=false'],
  { cwd: WURZEL, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } });
  let log = '';
  kind.stdout.on('data', (d) => { log += d; });
  kind.stderr.on('data', (d) => { log += d; });
  const url = `http://127.0.0.1:${port}`;
  return new Promise((ok, fehler) => {
    const start = Date.now();
    (function warten() {
      fetch(url + '/').then((r) => (r.ok ? ok({ url, beenden: () => kind.kill('SIGTERM') }) : setTimeout(warten, 300)))
        .catch(() => (Date.now() - start > 60000 ? fehler(new Error('Worker startet nicht:\n' + log)) : setTimeout(warten, 300)));
    })();
  });
}

let fehlerZahl = 0, pruefZahl = 0;
function pruefe(bedingung, text, details) {
  pruefZahl++;
  if (bedingung) console.log('  ✓ ' + text);
  else { fehlerZahl++; console.log('  ✗ ' + text + (details !== undefined ? '  → ' + JSON.stringify(details) : '')); }
}
function ergebnis() {
  console.log(`\n${pruefZahl - fehlerZahl} von ${pruefZahl} Prüfungen bestanden.`);
  return fehlerZahl === 0;
}

function beobachten(seite, protokoll, name) {
  seite.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) protokoll.konsole.push(`[${name}] ${m.text()}`); });
  seite.on('pageerror', (e) => protokoll.konsole.push(`[${name}] ${e.message}`));
  seite.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) protokoll.extern.push(u);
  });
}

const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

module.exports = { serverStarten, workerStarten, pruefe, ergebnis, beobachten, MOBIL, WURZEL };
