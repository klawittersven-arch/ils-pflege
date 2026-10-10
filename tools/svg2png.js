// SVG -> PNG (2x) mit Chromium
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [,, outDir, ...files] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2.5 });
  for (const f of files) {
    const svg = fs.readFileSync(f, 'utf8');
    const m = svg.match(/viewBox='0 0 (\d+) (\d+)'/);
    await page.setViewportSize({ width: +m[1], height: +m[2] });
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.screenshot({ path: path.join(outDir, path.basename(f, '.svg') + '.png'), clip: { x: 0, y: 0, width: +m[1], height: +m[2] } });
  }
  await browser.close();
})();
