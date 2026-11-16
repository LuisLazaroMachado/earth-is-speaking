// Stage 5 check: voice parsing and commands (fed directly), audio-only mode.
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function ({ page, base, ROOT, log }) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('eis.lang', '"en"'); } catch (e) {}
    window.__spoken = [];
    const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u) => { window.__spoken.push(u.text); try { orig(u); } catch (e) {} };
  });
  await page.goto(base, { waitUntil: 'networkidle0' });
  log('mic button visible (speech recognition in this browser):', await page.evaluate(() => !document.getElementById('btn-mic').hidden));
  const parse = await page.evaluate(async () => {
    const { parseUtterance } = await import('./js/voice.js');
    return ['Venice', 'surprise me', 'Sorpréndeme', 'I want to hear Japan', 'quiero escuchar Perú', 'más fuerte', 'where am I',
      'night lights', 'siguiente capa', 'modo solo audio', 'empezar el recorrido', 'lee los datos', 'Lima'].map((x) => `${x} -> ${JSON.stringify(parseUtterance(x))}`);
  });
  parse.forEach((p) => log('  parse', p));
  await page.click('#btn-audio-only');
  await wait(900);
  log('audio-only:', await page.evaluate(() => ({ on: window.__eis.state.audioOnly, pressed: document.getElementById('btn-audio-toggle').getAttribute('aria-pressed'),
    banner: !document.getElementById('audio-banner').hidden, hoverLocked: document.getElementById('opt-hover').disabled })));
  log('spoken so far:', await page.evaluate(() => window.__spoken.slice(-3)));
  const r = await page.evaluate(async () => {
    const E = window.__eis; const out = [];
    for (const words of [['Japan'], ['quiero escuchar Venecia'], ['louder'], ['next layer'], ['xyzzy qwerty']]) {
      const ok = await E.handleVoice(words);
      await new Promise((r) => setTimeout(r, 700));
      out.push(`${words[0]} -> understood=${ok} layer=${E.state.layerId} place="${document.getElementById('p-place').textContent}" vol=${document.getElementById('vol').value}`);
      E.engine.stopAll();
    }
    return out;
  });
  r.forEach((x) => log('  voice', x));
  await page.evaluate(() => { window.__spoken = []; });
  await page.keyboard.press('w');
  await wait(800);
  log('W in audio-only, spoken count (should be 1):', await page.evaluate(() => window.__spoken.length), await page.evaluate(() => window.__spoken));
  const box = await (await page.$('#map canvas')).boundingBox();
  await page.evaluate(() => { window.__spoken = []; });
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.3);
  await wait(800);
  log('tap in audio-only speaks:', await page.evaluate(() => window.__spoken));
  await page.click('#btn-audio-toggle');
  await wait(600);
  log('audio-only off:', await page.evaluate(() => window.__eis.state.audioOnly));
  await page.addScriptTag({ content: fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8') });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map((x) => x.id));
  log('axe:', v.length ? v : 'no violations');
  await page.screenshot({ path: ROOT + '/tools/shot_stage5.png' });
}
