// Stage 4 check: markers, list, playlist, share link round trip, WAV download, postcard + reply.
import fs from 'node:fs';
import path from 'node:path';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT, log }) {
  const dl = path.join(ROOT, 'tools', `downloads-${Date.now()}`);
  fs.mkdirSync(dl, { recursive: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('eis.lang', '"en"'); localStorage.setItem('eis.audioOnly', 'false'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(700);
  await page.focus('#map');
  await page.keyboard.press('Enter');
  await wait(300);
  log('after Enter:', await page.$eval('#btn-song', (e) => e.textContent), '|', await page.$eval('#live', (e) => e.textContent));
  const box = await (await page.$('#map canvas')).boundingBox();
  await page.mouse.click(box.x + box.width * 0.53, box.y + box.height * 0.37);
  await wait(300);
  await page.click('#btn-add-marker');
  await page.click('#search');
  await page.keyboard.type('Lima');
  await page.keyboard.press('Enter');
  await wait(400);
  await page.click('#btn-add-marker');
  await wait(300);
  await page.evaluate(async () => {
    const E = window.__eis;
    const ids = ['air', 'lights', 'ocean', 'aero', 'forest', 'lightning'];
    for (let i = 0; i < 17; i++) {
      const id = ids[i % 6];
      await E.LAYERS[id].load();
      E.songApi.add({ layer: id, lat: -40 + i * 5, lon: -150 + i * 17 });
    }
  });
  log('count:', await page.$eval('#btn-song', (e) => e.textContent));
  await page.click('#btn-song');
  await wait(300);
  log('focus on open:', await page.evaluate(() => document.activeElement.id));
  log('rows:', await page.$$eval('#song-list li', (l) => l.length), '| row 3 aria-label:', await page.$eval('#song-list li:nth-child(3)', (e) => e.getAttribute('aria-label')));
  const row3 = (await page.$$('#song-list li'))[2];
  await (await row3.$$('button'))[1].click();
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('Home sweet Lima');
  await page.keyboard.press('Enter');
  await wait(200);
  log('renamed:', await page.$eval('#song-list li:nth-child(3) strong', (e) => e.textContent), '| focus:', await page.evaluate(() => document.activeElement.textContent.trim().slice(0, 30)));
  const rows = await page.$$('#song-list li');
  await (await rows[19].$$('button'))[2].click();
  await wait(200);
  log('after delete:', await page.$eval('#btn-song', (e) => e.textContent));
  for (const mode of ['order', 'lr', 'chord']) {
    await page.click(`input[name="song-mode"][value="${mode}"]`);
    await page.click('#song-play');
    await wait(1700);
    log(`playlist ${mode}:`, await page.$eval('#song-status', (e) => e.textContent), '| voices', await page.evaluate(() => window.__eis.engine.voices.length));
    await page.keyboard.press('s');
  }
  await page.click('#song-share');
  await wait(300);
  const url = await page.$eval('#share-url', (e) => e.value);
  log('share link length:', url.length, '| has m=:', url.includes('&m='), '| msg:', await page.$eval('#share-msg', (e) => e.textContent));
  await page.click('input[name="song-mode"][value="order"]');
  await page.click('#song-download');
  await wait(9000);
  log('downloads:', fs.readdirSync(dl).map((f) => `${f} (${fs.statSync(path.join(dl, f)).size} bytes)`));
  await page.addScriptTag({ content: fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8') });
  log('axe song panel:', await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map((x) => `${x.id} ${x.nodes[0].target}`)));
  await page.screenshot({ path: ROOT + '/tools/shot_song.png' });

  const p2 = await page.browser().newPage();
  await p2.setViewport({ width: 1440, height: 900 });
  await p2.goto(url, { waitUntil: 'networkidle0' });
  log('new tab welcome note:', await p2.$eval('#welcome-share', (e) => (e.hidden ? '(hidden)' : e.textContent)));
  await p2.click('#btn-start');
  await wait(800);
  log('new tab markers:', await p2.$eval('#btn-song', (e) => e.textContent), '| panel open:', await p2.evaluate(() => !document.getElementById('song').hidden),
    '| marker 3:', await p2.$eval('#song-list li:nth-child(3) strong', (e) => e.textContent));
  await p2.click('#song-close');
  await p2.click('#search', { clickCount: 3 });
  await p2.keyboard.type('Tokyo');
  await p2.keyboard.press('Enter');
  await wait(400);
  await p2.click('#btn-share-place');
  await wait(300);
  const card = await p2.$eval('#share-url', (e) => e.value);
  log('postcard link:', card.slice(card.indexOf('#')));
  const p3 = await page.browser().newPage();
  await p3.setViewport({ width: 1440, height: 900 });
  await p3.goto(card, { waitUntil: 'networkidle0' });
  log('postcard welcome:', await p3.$eval('#welcome-share', (e) => e.textContent));
  await p3.click('#btn-start');
  await wait(1500);
  log('postcard playing:', await p3.$eval('#postcard-text', (e) => e.textContent), '|', await p3.$eval('#p-place', (e) => e.textContent));
  await p3.click('#search', { clickCount: 3 });
  await p3.keyboard.type('Lima');
  await p3.keyboard.press('Enter');
  await wait(400);
  await p3.click('#btn-share-place');
  await wait(300);
  const reply = await p3.$eval('#share-url', (e) => e.value);
  log('reply link:', reply.slice(reply.indexOf('#')));
}
