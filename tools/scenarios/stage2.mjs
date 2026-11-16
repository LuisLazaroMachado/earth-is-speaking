// Stage 2 check: welcome, explorer, panel, languages, dialogs, keyboard, mobile, axe.
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function axe(page, ROOT, label, log) {
  await page.addScriptTag({ content: fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8') });
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] });
    return r.violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0].target.join(' ')}`);
  });
  log(`axe [${label}]:`, res.length ? '\n  ' + res.join('\n  ') : 'no violations');
}

export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  log('lang:', await page.evaluate(() => document.documentElement.lang), '| title:', await page.$eval('.hero-title', (e) => e.textContent));
  await page.screenshot({ path: ROOT + '/tools/shot_welcome.png' });
  await axe(page, ROOT, 'welcome', log);

  await page.click('#btn-test');
  await wait(400);
  log('voices during test sound:', await page.evaluate(() => window.__eis.engine.voices.length));

  await page.click('[data-lang="es"]');
  log('ES subtitle:', await page.$eval('.hero-sub', (e) => e.textContent), '| html lang:', await page.evaluate(() => document.documentElement.lang));
  await page.click('[data-lang="en"]');

  await page.click('#btn-start');
  await wait(800);
  log('focused:', await page.evaluate(() => document.activeElement.id), '| map label:', await page.$eval('#map', (e) => e.getAttribute('aria-label')));
  const box = await (await page.$('#map canvas')).boundingBox();
  const click = async (lat, lon) => {
    await page.mouse.click(box.x + ((lon + 180) / 360) * box.width, box.y + ((90 - lat) / 180) * box.height);
    await wait(450);
    return page.evaluate(() => [document.getElementById('p-phrase').textContent, document.getElementById('p-place').textContent,
      document.getElementById('d-value').textContent, document.getElementById('p-fact').textContent, document.getElementById('live').textContent].join(' | '));
  };
  log('Lima   ->', await click(-12.05, -77.04));
  log('Sahara ->', await click(23, 12));
  log('Antarc ->', await click(-80, 60));
  log('why    ->', await page.$eval('#d-sounds', (e) => e.textContent));
  await page.click('#p-details summary');
  await page.screenshot({ path: ROOT + '/tools/shot_explorer.png' });
  await axe(page, ROOT, 'explorer', log);

  // keyboard
  await page.focus('#map');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await wait(400);
  log('keyboard ->', await page.$eval('#p-place', (e) => e.textContent));
  await page.keyboard.press('h');
  await wait(200);
  log('help open:', await page.evaluate(() => document.getElementById('dlg-help').open));
  await page.keyboard.press('Escape');
  await wait(200);
  log('help closed, focus back on:', await page.evaluate(() => document.activeElement.id));
  await page.click('#btn-about');
  await wait(200);
  await axe(page, ROOT, 'about dialog', log);
  await page.keyboard.press('Escape');

  // sweep
  await page.click('#btn-sweep');
  await wait(1500);
  log('sweep running, voices:', await page.evaluate(() => window.__eis.engine.voices.length), 'live:', await page.$eval('#live', (e) => e.textContent));
  await page.keyboard.press('s');
  await wait(200);

  // latest card + spanish explorer
  await page.click('.card.latest');
  await wait(500);
  log('banner:', await page.$eval('#latest-banner', (e) => e.textContent));
  await page.click('.topbar [data-lang="es"]');
  await wait(200);
  log('ES phrase:', await page.$eval('#p-phrase', (e) => e.textContent), '|', await page.$eval('#d-date', (e) => e.textContent));
  await page.click('.card[data-layer="lights"]');
  await wait(400);
  log('disabled card ->', await page.$eval('#live', (e) => e.textContent));

  // mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await wait(500);
  await page.click('#btn-start');
  await wait(800);
  const mb = await (await page.$('#map canvas')).boundingBox();
  await page.touchscreen.tap(mb.x + mb.width * 0.3, mb.y + mb.height * 0.6);
  await wait(500);
  await page.screenshot({ path: ROOT + '/tools/shot_mobile.png' });
  await page.click('#sheet-handle');
  await wait(400);
  await page.screenshot({ path: ROOT + '/tools/shot_mobile_open.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  log('mobile horizontal overflow:', overflow);
  await axe(page, ROOT, 'mobile', log);
}
