const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  const r = await page.evaluate(() => { const el = document.querySelector('.hero-sub'); const b = el.getBoundingClientRect(); el.dataset.ctHide = '1';
    const st = document.createElement('style'); st.textContent = '[data-ct-hide], [data-ct-hide] * { color: transparent !important; }'; document.head.appendChild(st);
    return { x: b.left, y: b.top, w: b.width, h: b.height, color: getComputedStyle(el).color }; });
  log(JSON.stringify(r));
  await page.screenshot({ path: ROOT + '/tools/shot_ct_probe.png', clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
}
