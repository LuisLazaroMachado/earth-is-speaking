// Stage 3 check: four flat layers, place search, country sweep + summary, coastal waters, compare.
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
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('eis.lang', '"en"'); localStorage.setItem('eis.speed', '"fast"'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(800);
  const panel = () => page.evaluate(() => [document.getElementById('p-phrase').textContent, document.getElementById('p-place').textContent,
    document.getElementById('d-value').textContent].join(' | '));
  const tap = async (lat, lon) => {
    const box = await (await page.$('#map canvas')).boundingBox();
    await page.evaluate(() => window.__eis && document.getElementById('btn-zoom-reset').click());
    await page.mouse.click(box.x + ((lon + 180) / 360) * box.width, box.y + ((90 - lat) / 180) * box.height);
    await wait(250);
    return panel();
  };

  for (const [id, pts] of Object.entries({
    lights: [['Nile delta', 30.5, 31.2], ['Moscow', 55.76, 37.62], ['Paris', 48.86, 2.35], ['Atlantic', 0, -30]],
    ocean: [['Gulf Stream', 38, -68], ['off Lima', -12.3, -78.0], ['Pacific calm', -20, -130], ['Sahara (land)', 23, 12]],
    aero: [['Saharan dust route', 15, -40], ['central Africa smoke', -8, 22], ['Southern Ocean', -50, -100], ['Australia', -25, 133]],
  })) {
    await page.click(`.card[data-layer="${id}"]`);
    await wait(700);
    log(`--- ${id}: credit ok=${(await page.$eval('#map-credit', (e) => e.textContent)).length > 20}`);
    for (const [name, lat, lon] of pts) log(`  ${name.padEnd(22)} ${await tap(lat, lon)}`);
  }

  // place search
  await page.click('.card[data-layer="air"]');
  await wait(400);
  await page.click('#search');
  await page.keyboard.type('Peru');
  await wait(200);
  log('search options:', await page.$$eval('#search-list li', (l) => l.slice(0, 4).map((x) => x.textContent).join(' / ')));
  await page.keyboard.press('Enter');
  await wait(24 * 0.24 * 1000 + 1500);
  log('Peru summary (air):', await page.$eval('#p-summary-text', (e) => e.textContent));
  await page.screenshot({ path: ROOT + '/tools/shot_peru.png' });

  for (const id of ['lights', 'ocean', 'aero']) {
    await page.click(`.card[data-layer="${id}"]`);
    await wait(600);
    log(`Peru summary (${id}):`, await page.$eval('#p-summary-text', (e) => e.textContent));
  }
  const r = await page.evaluate(async () => {
    const E = window.__eis;
    const out = {};
    for (const name of ['Bolivia', 'Japan', 'Vatican', 'Spain']) {
      const c = E.geo.countries.find((x) => x.en.startsWith(name));
      const st = await E.hearCountry(c, { fly: false });
      E.engine.stopAll();
      out[name] = JSON.stringify(st).slice(0, 160);
    }
    return out;
  });
  log('ocean summaries:', r);

  // Spanish search with accents
  await page.click('.topbar [data-lang="es"]');
  await page.click('#search', { clickCount: 3 });
  await page.keyboard.type('japon');
  await wait(200);
  log('ES search "japon":', await page.$$eval('#search-list li', (l) => l.slice(0, 3).map((x) => x.textContent).join(' / ')));
  await page.keyboard.press('Escape');
  await page.click('#search', { clickCount: 3 });
  await page.keyboard.type('venecia');
  await page.keyboard.press('Enter');
  await wait(500);
  log('Venecia:', await panel());
  await page.click('.topbar [data-lang="en"]');

  // compare
  await page.click('.card[data-layer="air"]');
  await wait(400);
  await page.click('#btn-compare');
  await page.click('#cmp-a');
  await page.keyboard.type('Peru');
  await page.keyboard.press('Enter');
  await page.click('#cmp-b');
  await page.keyboard.type('Japan');
  await page.keyboard.press('Enter');
  await wait(300);
  log('compare table (air):', await page.$eval('#cmp-result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 600)));
  await page.screenshot({ path: ROOT + '/tools/shot_compare.png' });
  await axe(page, ROOT, 'compare dialog', log);
  await page.keyboard.press('Escape');
  await page.click('.card[data-layer="lights"]');
  await wait(400);
  await page.click('#btn-compare');
  await wait(300);
  log('compare table (lights):', await page.$eval('#cmp-result', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 400)));
  await page.keyboard.press('Escape');
  await axe(page, ROOT, 'explorer stage 3', log);
}
