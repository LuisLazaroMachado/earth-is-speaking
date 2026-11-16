// Stage 7 check: forest and lightning global views, no place, offer another layer.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('eis.lang', '"en"'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(600);
  const panel = () => page.evaluate(() => [document.getElementById('p-phrase').textContent, document.getElementById('p-place').textContent,
    document.getElementById('d-value').textContent, document.getElementById('sound-desc').textContent].join(' | '));
  const tapUV = async (u, v) => {
    const box = await (await page.$('#map canvas')).boundingBox();
    await page.mouse.click(box.x + u * box.width, box.y + v * box.height);
    await wait(250);
    return panel();
  };
  for (const id of ['forest', 'lightning']) {
    await page.click(`.card[data-layer="${id}"]`);
    await wait(700);
    const info = await page.evaluate(() => ({ view: document.getElementById('view-switch').textContent, zoomHidden: document.querySelector('.zoom').hidden,
      aspect: getComputedStyle(document.querySelector('#map canvas')).aspectRatio, badge: document.querySelector('.card[aria-current="true"] .card-badge').textContent }));
    log(`--- ${id}`, JSON.stringify(info));
    const pts = id === 'forest'
      ? [['Congo rainforest', 0.39, 0.47], ['Sahara', 0.37, 0.30], ['Indian Ocean', 0.65, 0.60], ['space', 0.1, 0.5]]
      : [['East Africa storms', 0.36, 0.42], ['Arabia', 0.43, 0.05], ['Indonesia night', 0.91, 0.55], ['Madagascar (none)', 0.49, 0.80]];
    for (const [n, u, v] of pts) log(`  ${n.padEnd(20)} ${await tapUV(u, v)}`);
    await page.click('#search', { clickCount: 3 });
    await page.keyboard.type('Peru');
    await page.keyboard.press('Enter');
    await wait(300);
    log('  search Peru ->', await page.$eval('#p-summary', (e) => e.innerText.replace(/\s+/g, ' ')));
    await page.screenshot({ path: `${ROOT}/tools/shot_${id}.png` });
  }
  await page.click('#p-summary-text button');
  await wait(800);
  log('offer -> layer', await page.evaluate(() => window.__eis.state.layerId), '|', await panel());
  await page.click('.card[data-layer="lightning"]');
  await wait(500);
  await page.click('#btn-scale');
  await wait(1500);
  log('scale voices', await page.evaluate(() => window.__eis.engine.voices.length), await page.$eval('#sound-desc', (e) => e.textContent));
  await page.keyboard.press('s');
  await page.click('#btn-sweep');
  await wait(1200);
  log('sweep voices', await page.evaluate(() => window.__eis.engine.voices.length));
}
