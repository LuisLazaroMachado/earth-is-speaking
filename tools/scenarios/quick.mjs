// Quick probe: samples and summaries through the app's own modules.
export default async function ({ page, base, log }) {
  await page.goto(base, { waitUntil: 'networkidle0' });
  const out = await page.evaluate(async () => {
    const E = window.__eis;
    await E.geo.load();
    const r = {};
    await E.LAYERS.aero.load();
    for (const [n, la, lo] of [['dust route', 15, -40], ['Southern Ocean', -50, -100], ['Sahara', 22, 10], ['Erin', 33, -68], ['Lima', -12.05, -77.04]]) {
      const s = E.LAYERS.aero.sample(la, lo);
      r['aero ' + n] = `${s.cat}${s.second ? '+' + s.second : ''} ${s.intensity.toFixed(2)}`;
    }
    await E.selectLayer('ocean', { quiet: true });
    for (const name of ['Bolivia', 'Peru', 'Japan', 'Chile']) {
      const c = E.geo.countries.find((x) => x.en === name);
      const st = await E.hearCountry(c, { fly: false });
      E.engine.stopAll();
      r['ocean ' + name] = JSON.stringify(st);
    }
    return r;
  });
  Object.entries(out).forEach(([k, v]) => log(k.padEnd(22), v));
}
