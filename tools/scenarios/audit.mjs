// Full axe-core audit across app states, in English and Spanish, desktop and mobile.
// Writes tools/audit-result.json.
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function ({ page, base, ROOT, log }) {
  const axeSrc = fs.readFileSync(ROOT + '/tools/node_modules/axe-core/axe.min.js', 'utf8');
  const results = [];
  const run = async (label) => {
    await page.addScriptTag({ content: axeSrc });
    const r = await page.evaluate(async () => {
      const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] });
      return {
        violations: res.violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')}`),
        incomplete: res.incomplete.map((v) => `${v.id} (${v.nodes.length})`),
        passes: res.passes.length,
      };
    });
    results.push({ state: label, ...r });
    log(`${label.padEnd(34)} violations: ${r.violations.length ? r.violations.join(' | ') : 0}   passes: ${r.passes}   needs review: ${r.incomplete.join(', ') || '-'}`);
  };

  for (const lang of ['en', 'es']) {
    for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }]) {
      await page.setViewport(vp);
      await page.evaluateOnNewDocument((l) => { try { localStorage.clear(); localStorage.setItem('eis.lang', JSON.stringify(l)); } catch (e) {} }, lang);
      await page.goto(base, { waitUntil: 'networkidle0' });
      const tag = `${lang}/${vp.name}`;
      await run(`${tag} welcome`);
      await page.click('#btn-start');
      await wait(800);
      await page.focus('#map');
      await page.keyboard.press('ArrowRight');
      await wait(400);
      await run(`${tag} explorer (air, point)`);
      if (vp.name === 'desktop') {
        for (const id of ['lights', 'ocean', 'aero', 'forest', 'lightning']) {
          await page.click(`.card[data-layer="${id}"]`);
          await wait(600);
          await run(`${tag} layer ${id}`);
        }
        await page.click('.card[data-layer="air"]');
        await wait(400);
        for (const d of ['btn-how', 'btn-help', 'btn-about', 'btn-options', 'btn-compare']) {
          if (d === 'btn-how') { await page.evaluate(() => document.getElementById('btn-how').click()); }
          else await page.click(`#${d}`);
          await wait(400);
          await run(`${tag} dialog ${d.replace('btn-', '')}`);
          await page.keyboard.press('Escape');
          await wait(200);
        }
        await page.click('#btn-add-marker').catch(() => {});
        await page.click('#btn-song');
        await wait(300);
        await run(`${tag} My Earth Song panel`);
        await page.click('#song-close');
        await page.click('#btn-journey2');
        await wait(2500);
        await run(`${tag} guided journey`);
        await page.click('#j-end');
        await page.click('#view-switch [data-mode="globe"]');
        await wait(2000);
        await run(`${tag} 3D globe`);
        await page.click('#btn-audio-toggle');
        await wait(500);
        await run(`${tag} audio-only mode`);
        await page.click('#btn-audio-toggle');
      } else {
        await page.click('#sheet-handle');
        await wait(400);
        await run(`${tag} bottom sheet open`);
      }
    }
  }
  fs.writeFileSync(ROOT + '/tools/audit-result.json', JSON.stringify(results, null, 2));
  const total = results.reduce((n, r) => n + r.violations.length, 0);
  log(`\nStates audited: ${results.length}. Total violations: ${total}.`);
}
