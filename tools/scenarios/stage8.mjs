// Stage 8 check: guided journey stops, options, pulse.
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('eis.lang', '"en"'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-journey');
  const info = () => page.evaluate(() => [document.getElementById('journey-step').textContent, document.getElementById('journey-h').textContent,
    window.__eis.state.layerId, document.getElementById('p-place').textContent, document.getElementById('p-phrase').textContent].join(' | '));
  await wait(2500);
  log('stop:', await info());
  for (let i = 1; i < 8; i++) {
    await page.click('#j-next');
    await wait(2500);
    log('stop:', await info());
    if (i === 5) await page.screenshot({ path: ROOT + '/tools/shot_journey.png' });
  }
  await page.screenshot({ path: ROOT + '/tools/shot_journey_lima.png' });
  // let the last stop finish -> end of journey
  await wait(14000);
  log('journey hidden after end:', await page.$eval('#journey', (e) => e.hidden), '| live:', await page.$eval('#live', (e) => e.textContent));
  // back button + end
  await page.click('#btn-journey2');
  await wait(1500);
  await page.click('#j-next');
  await wait(800);
  await page.click('#j-back');
  await wait(800);
  log('after back:', await info());
  await page.click('#j-end');
  log('ended:', await page.$eval('#journey', (e) => e.hidden));
  // options + pulse
  await page.click('#btn-options');
  log('options:', await page.evaluate(() => ({ hover: document.getElementById('opt-hover').checked, vib: document.getElementById('opt-vibration').checked,
    vibRowHidden: document.getElementById('opt-vibration-row').hidden, pulse: document.getElementById('opt-pulse').checked })));
  await page.addScriptTag({ content: fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8') });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map((x) => x.id));
  log('axe options dialog:', v.length ? v : 'no violations');
  await page.keyboard.press('Escape');
  await page.click('.card[data-layer="air"]');
  await wait(500);
  const box = await (await page.$('#map canvas')).boundingBox();
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.35);
  await wait(200);
  log('pulse opacity during sound:', await page.$eval('#pulse', (e) => e.style.opacity));
}
