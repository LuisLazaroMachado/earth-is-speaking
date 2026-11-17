const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT }) {
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem('eis.lang', '"en"'); } catch (e) {} });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(800);
  const mb = await (await page.$('#map canvas')).boundingBox();
  await page.touchscreen.tap(mb.x + mb.width * 0.3, mb.y + mb.height * 0.6);
  await wait(500);
  await page.screenshot({ path: ROOT + '/tools/shot_mobile_final.png' });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#btn-start');
  await wait(800);
  await page.screenshot({ path: ROOT + '/tools/shot_desktop_final.png' });
}
