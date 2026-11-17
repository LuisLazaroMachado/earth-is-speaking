// Stage 6 check: 3D globe - switch, tap -> same lat/lon and sound as the map, keyboard, zoom,
// markers and outline kept when switching, global layers fall back to the map.
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('eis.lang', '"en"'); localStorage.setItem('eis.audioOnly', 'false'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(700);
  // a marker and a searched country before switching
  await page.click('#search');
  await page.keyboard.type('Peru');
  await page.keyboard.press('Enter');
  await wait(600);
  await page.click('#btn-add-marker');
  await page.keyboard.press('s');
  log('view switch:', await page.$eval('#view-switch', (e) => e.innerText.replace(/\s+/g, ' ')));
  await page.click('#view-switch [data-mode="globe"]');
  await wait(2500);
  const st = await page.evaluate(() => ({
    globeVisible: !document.getElementById('globe').hidden, mapHidden: document.getElementById('map').hidden,
    focus: document.activeElement.id, pressed: document.querySelector('[data-mode="globe"]').getAttribute('aria-pressed'),
    help: document.getElementById('map-help').textContent.slice(0, 60), live: document.getElementById('live').textContent.slice(0, 40),
  }));
  log('after switch:', JSON.stringify(st));
  await page.screenshot({ path: ROOT + '/tools/shot_globe_peru.png' });

  // coordinate consistency: project known points to the screen, tap them, compare lat/lon
  const checks = await page.evaluate(async () => {
    const E = window.__eis;
    const g = E.view.globe;
    const out = [];
    for (const [la, lo] of [[-12.05, -77.04], [-9, -75], [-15, -70], [0, -60]]) {
      g.flyTo(la, lo, 2.2);
      await new Promise((r) => setTimeout(r, 700));
      const xy = g.toXY(la, lo);
      const rect = g.canvas.getBoundingClientRect();
      const dpr = g.canvas.width / rect.width;
      const hit = g._hit(rect.left + xy.x / dpr, rect.top + xy.y / dpr);
      out.push(`target ${la},${lo} -> hit ${hit.lat.toFixed(2)},${hit.lon.toFixed(2)}`);
    }
    return out;
  });
  checks.forEach((c) => log('  ', c));

  // tap the centre of the globe (Lima after the last flyTo? use explicit centre) and compare with map sample
  const tapRes = await page.evaluate(async () => {
    const E = window.__eis;
    const g = E.view.globe;
    g.flyTo(-12.05, -77.04, 2.2);
    await new Promise((r) => setTimeout(r, 700));
    const rect = g.canvas.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await page.mouse.click(tapRes.x, tapRes.y);
  await wait(400);
  const panelGlobe = await page.$eval('#p-place', (e) => e.textContent) + ' | ' + await page.$eval('#d-value', (e) => e.textContent);
  const mapSample = await page.evaluate(() => { const s = window.__eis.LAYERS.air.sample(-12.05, -77.04); return `${s.t} degC`; });
  log('globe tap at centre (Lima):', panelGlobe, '| map sample at Lima:', mapSample);

  // keyboard: arrows rotate 5 degrees, Enter makes a marker
  await page.focus('#globe');
  const c0 = await page.evaluate(() => ({ ...window.__eis.view.globe.center }));
  await page.keyboard.press('ArrowRight');
  await wait(600);
  const c1 = await page.evaluate(() => ({ ...window.__eis.view.globe.center }));
  log('arrow right: lon', c0.lon.toFixed(2), '->', c1.lon.toFixed(2), '| panel:', await page.$eval('#p-place', (e) => e.textContent));
  await page.keyboard.press('Enter');
  await wait(300);
  log('Enter on globe ->', await page.$eval('#btn-song', (e) => e.textContent));
  await page.keyboard.press('+');
  await wait(600);
  log('zoom dist:', await page.evaluate(() => window.__eis.view.globe.dist.toFixed(2)));
  log('markers on globe:', await page.evaluate(() => window.__eis.view.globe.markerGroup.children.length), '| outline lines:', await page.evaluate(() => window.__eis.view.globe.overlay.children.length));

  // drag rotates without sound or marker
  const r = await page.evaluate(() => { const b = document.querySelector('#globe canvas').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  const before = await page.evaluate(() => window.__eis.view.globe.center.lon);
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  await page.mouse.move(r.x - 120, r.y, { steps: 6 });
  await page.mouse.up();
  await wait(300);
  log('drag rotated lon by', (await page.evaluate(() => window.__eis.view.globe.center.lon) - before).toFixed(1), 'deg; markers:', await page.$eval('#btn-song', (e) => e.textContent));

  // each flat layer texture on the globe
  for (const id of ['lights', 'ocean', 'aero']) {
    await page.click(`.card[data-layer="${id}"]`);
    await wait(1500);
    await page.screenshot({ path: `${ROOT}/tools/shot_globe_${id}.png` });
  }
  // global layer falls back to the map
  await page.click('.card[data-layer="forest"]');
  await wait(900);
  log('forest -> mode:', await page.evaluate(() => window.__eis.view.mode), '| switch:', await page.$eval('#view-switch', (e) => e.innerText));
  await page.click('.card[data-layer="air"]');
  await wait(800);
  await page.keyboard.press('g');
  await wait(1200);
  log('G key -> mode:', await page.evaluate(() => window.__eis.view.mode));
  await page.addScriptTag({ content: fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8') });
  log('axe:', await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map((x) => `${x.id} ${x.nodes[0].target}`)));
}
