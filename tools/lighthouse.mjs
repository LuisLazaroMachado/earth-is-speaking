// Lighthouse audit of the welcome page, served locally and run in Microsoft Edge.
// Usage: node tools/lighthouse.mjs   -> prints the scores and writes tools/lighthouse-report.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;
const chrome = await chromeLauncher.launch({
  chromePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  chromeFlags: ['--headless=new', '--mute-audio'],
});
const results = {};
for (const formFactor of ['mobile', 'desktop']) {
  const r = await lighthouse(url, {
    port: chrome.port, output: 'json', logLevel: 'error',
    onlyCategories: ['accessibility', 'best-practices', 'seo', 'performance'],
    formFactor, screenEmulation: formFactor === 'desktop' ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } : undefined,
    throttlingMethod: 'provided',
  });
  const cats = r.lhr.categories;
  results[formFactor] = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const failed = Object.values(r.lhr.audits).filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
    .map((a) => `${a.id}: ${a.title}${a.displayValue ? ' (' + a.displayValue + ')' : ''}`);
  results[`${formFactor}_issues`] = failed;
}
fs.writeFileSync(path.join(ROOT, 'tools', 'lighthouse-report.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await chrome.kill();
server.close();
