const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, log }) {
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-journey');
  await wait(1200);
  for (let i = 0; i < 7; i++) { await page.click('#j-next'); await wait(400); }
  const t0 = Date.now();
  await page.waitForFunction(() => document.getElementById('journey').hidden, { timeout: 60000 });
  log(`journey ended by itself after ${(Date.now() - t0) / 1000}s; focus on`, await page.evaluate(() => document.activeElement.id),
    '| live:', await page.$eval('#live', (e) => e.textContent));
}
