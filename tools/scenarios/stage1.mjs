// Stage 1 check: map loads, clicks give temperatures, keyboard works, scale runs.
export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.getElementById('date').textContent.length > 0);
  log('date:', await page.$eval('#date', (e) => e.textContent));
  const box = await (await page.$('#map canvas')).boundingBox();
  const click = async (lat, lon) => {
    const x = box.x + ((lon + 180) / 360) * box.width;
    const y = box.y + ((90 - lat) / 180) * box.height;
    await page.mouse.click(x, y);
    await new Promise((r) => setTimeout(r, 120));
    return page.$eval('#value', (e) => e.textContent + ' | ' + document.getElementById('sound').textContent);
  };
  for (const [name, lat, lon] of [['Antarctica interior', -80, 60], ['Sahara', 23, 12], ['Lima', -12.05, -77.04],
    ['Siberia', 62, 100], ['Brazil gray patch', -9.4, -56], ['Mid Pacific', 0, -150]]) {
    log(name.padEnd(20), await click(lat, lon));
  }
  await page.focus('#map');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  log('keyboard:', await page.$eval('#value', (e) => e.textContent));
  await page.click('#scale');
  await new Promise((r) => setTimeout(r, 3000));
  log('scale:', await page.$eval('#value', (e) => e.textContent));
  const voices = await page.evaluate(async () => (await import('./js/core/audio.js')).engine.voices.length);
  log('active voices during scale:', voices);
  await page.screenshot({ path: ROOT + '/tools/shot_stage1.png' });
}
