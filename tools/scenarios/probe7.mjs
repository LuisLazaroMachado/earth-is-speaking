const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(600);
  await page.click('.card[data-layer="lightning"]');
  await wait(800);
  log(await page.evaluate(() => ({ layer: window.__eis.state.layerId, grid: !!window.__eis.LAYERS.lightning.grid })));
  const box = await (await page.$('#map canvas')).boundingBox();
  log('box', JSON.stringify(box));
  const el = await page.evaluate((x, y) => document.elementFromPoint(x, y).outerHTML.slice(0, 120), box.x + box.width * 0.36, box.y + box.height * 0.42);
  log('element at point:', el);
  await page.mouse.click(box.x + box.width * 0.36, box.y + box.height * 0.42);
  await wait(300);
  log(await page.evaluate(() => [document.getElementById('p-phrase').textContent, JSON.stringify(window.__eis.state.last)]));
}
