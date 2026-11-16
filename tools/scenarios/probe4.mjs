const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '#v=1&lang=en&m=air,10,10,Test', { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(800);
  await page.click('#song-close');
  await page.click('#search', { clickCount: 3 });
  await page.keyboard.type('Tokyo');
  await page.keyboard.press('Enter');
  await wait(500);
  log('temp:', await page.evaluate(() => JSON.stringify(window.__eis.state.tempName)), await page.$eval('#p-place', (e) => e.textContent));
  const vis = await page.evaluate(() => { const b = document.getElementById('btn-share-place'); const r = b.getBoundingClientRect(); return [r.top, r.height, getComputedStyle(b).display, document.elementFromPoint(r.left + 5, r.top + 5)?.id]; });
  log('share btn:', vis);
  await page.click('#btn-share-place');
  await wait(400);
  log('url:', await page.$eval('#share-url', (e) => e.value), '| live:', await page.$eval('#live', (e) => e.textContent));
}
