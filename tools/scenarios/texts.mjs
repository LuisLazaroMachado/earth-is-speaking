// Text review: EN/ES key parity, placeholders, and data-i18n keys used in the HTML.
import fs from 'node:fs';
export default async function ({ page, base, ROOT, log }) {
  await page.goto(base, { waitUntil: 'networkidle0' });
  const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
  const used = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]).concat([...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) => m[1].split(';').map((p) => p.split(':')[1])));
  const js = ['js/main.js', 'js/song.js', 'js/content.js', 'js/ui/docs.js'].map((f) => fs.readFileSync(ROOT + '/' + f, 'utf8')).join('\n');
  const usedJs = [...js.matchAll(/\bt\('([a-z_0-9]+)'/g)].map((m) => m[1]);
  const r = await page.evaluate(async (keys) => {
    const mod = await import('./js/i18n.js');
    const out = { missingEs: [], missingEn: [], placeholderMismatch: [], unknown: [] };
    const get = (lang, k) => { mod.setLang(lang); return mod.t(k); };
    for (const k of keys) {
      const en = get('en', k); const es = get('es', k);
      if (en === k) out.unknown.push(k);
      if (es === en && !['title', 'normal', 'data_nasa', 'mic'].includes(k) && en.length > 6) out.missingEs.push(k);
      const ph = (s) => (s.match(/\{[a-z]+\}/g) || []).sort().join(',');
      if (ph(en) !== ph(es)) out.placeholderMismatch.push(k);
    }
    mod.setLang('en');
    return out;
  }, [...new Set([...used, ...usedJs])]);
  log('keys checked:', new Set([...used, ...usedJs]).size);
  log(JSON.stringify(r, null, 1));
}
