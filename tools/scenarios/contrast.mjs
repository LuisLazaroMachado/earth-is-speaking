// Real contrast measurement for every text element axe could not decide (gradients, images,
// translucent layers): hide the text, screenshot the real background behind it, and compute
// the WCAG contrast against the worst background pixel. Writes tools/contrast-result.json.
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function ({ page, base, ROOT, log }) {
  const axeSrc = fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8');
  const all = [];
  const measure = async (label) => {
    await page.addScriptTag({ content: axeSrc });
    const targets = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ['color-contrast'] });
      const inc = r.incomplete.find((x) => x.id === 'color-contrast');
      return inc ? inc.nodes.map((n) => n.target[0]) : [];
    });
    for (const sel of [...new Set(targets)]) {
      const info = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const cs = getComputedStyle(el);
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        const box = el.getBoundingClientRect();
        // content box only: borders and padding are not behind the text
        const px = (v) => parseFloat(v) || 0;
        const r = {
          left: box.left + px(cs.borderLeftWidth) + px(cs.paddingLeft), top: box.top + px(cs.borderTopWidth) + px(cs.paddingTop),
          width: box.width - px(cs.borderLeftWidth) - px(cs.borderRightWidth) - px(cs.paddingLeft) - px(cs.paddingRight),
          height: box.height - px(cs.borderTopWidth) - px(cs.borderBottomWidth) - px(cs.paddingTop) - px(cs.paddingBottom),
        };
        if (r.width < 2 || r.height < 2) return null;
        const color = cs.color; // read BEFORE hiding the text (computed style is live)
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10);
        el.dataset.ctHide = '1';
        const st = document.createElement('style');
        st.id = 'ct-style';
        st.textContent = '[data-ct-hide], [data-ct-hide] * { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }';
        document.head.appendChild(st);
        // must be fully on screen and not covered by another element (fixed bars, bottom sheet)
        const onScreen = r.top >= 0 && r.left >= 0 && r.top + r.height <= window.innerHeight && r.left + r.width <= window.innerWidth;
        const pts = [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5]];
        const uncovered = onScreen && pts.every(([fx, fy]) => { const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return hit && (hit === el || el.contains(hit) || hit.contains(el)); });
        const vis = onScreen && uncovered;
        // screenshot clips use document coordinates
        return { color, size, weight, x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height, vis, text: el.textContent.trim().slice(0, 40) };
      }, sel);
      if (!info) continue;
      if (!info.vis) { await page.evaluate((q) => { const el = document.querySelector(q); if (el) delete el.dataset.ctHide; document.getElementById('ct-style')?.remove(); }, sel); continue; }
      const shot = await page.screenshot({ clip: { x: Math.max(0, info.x), y: Math.max(0, info.y), width: info.w, height: info.h }, encoding: 'base64', captureBeyondViewport: false });
      await page.evaluate((s) => { const el = document.querySelector(s); if (el) delete el.dataset.ctHide; document.getElementById('ct-style')?.remove(); }, sel);
      const res = await page.evaluate(async (b64, color) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
        const m = color.match(/[\d.]+/g).map(Number);
        const [tr, tg, tb, ta = 1] = m;
        const ratios = [];
        for (let i = 0; i < d.length; i += 4) {
          // text colour composited over this background pixel (for translucent text)
          const cr = tr * ta + d[i] * (1 - ta), cg = tg * ta + d[i + 1] * (1 - ta), cb = tb * ta + d[i + 2] * (1 - ta);
          const l1 = L(cr, cg, cb), l2 = L(d[i], d[i + 1], d[i + 2]);
          ratios.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
        }
        ratios.sort((x, y) => x - y);
        // 2nd percentile: the contrast reached over 98 % of the background behind the text
        return ratios[Math.floor(ratios.length * 0.02)];
      }, shot, info.color);
      const large = info.size >= 24 || (info.size >= 18.66 && info.weight >= 700);
      const need = large ? 3 : 4.5;
      all.push({ state: label, sel, text: info.text, size: info.size, worst: Math.round(res * 100) / 100, need, ok: res >= need });
      if (res < need) fs.writeFileSync(`${ROOT}/tools/ct_fail_${all.length}.png`, Buffer.from(shot, 'base64'));
    }
  };

  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem('eis.lang', '"en"'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await measure('welcome');
  await page.click('#btn-start');
  await wait(800);
  await page.focus('#map');
  await page.keyboard.press('ArrowRight');
  await wait(400);
  await measure('explorer');
  await page.click('#btn-help');
  await wait(300);
  await measure('help dialog');
  await page.keyboard.press('Escape');
  await page.click('#btn-journey2');
  await wait(2500);
  await measure('journey');
  await page.click('#j-end');
  await page.click('#btn-song');
  await wait(300);
  await measure('song panel');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(800);
  await measure('mobile explorer');

  fs.writeFileSync(ROOT + '/tools/contrast-result.json', JSON.stringify(all, null, 2));
  const fails = all.filter((x) => !x.ok);
  const min = all.reduce((m, x) => Math.min(m, x.worst), Infinity);
  log(`measured ${all.length} text elements; lowest contrast ${min.toFixed(2)}:1; below the WCAG AA minimum: ${fails.length}`);
  fails.forEach((f) => log('  FAIL', f.state, f.sel, `"${f.text}"`, f.worst, 'need', f.need));
  const low = [...all].sort((a, b) => a.worst - b.worst).slice(0, 8);
  low.forEach((f) => log('  lowest:', f.state, f.sel, `"${f.text}"`, `${f.worst}:1`, `(size ${f.size}px, need ${f.need})`));
}
