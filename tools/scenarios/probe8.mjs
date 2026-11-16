export default async function ({ page, base, log }) {
  await page.goto(base, { waitUntil: 'networkidle0' });
  const r = await page.evaluate(async () => {
    const E = window.__eis; const L = E.LAYERS;
    await Promise.all(Object.values(L).map((l) => l.load()));
    const out = {};
    const s = (id, la, lo) => { const x = L[id].sample(la, lo); delete x.layer; return JSON.stringify(x); };
    out.antarctica = s('air', -80, 60);
    out.sahara = s('air', 23, 12);
    out.saharaHot = (() => { let best = null; for (let la = 15; la <= 30; la += 1) for (let lo = -10; lo <= 30; lo += 1) { const x = L.air.sample(la, lo); if (x.hasData && (!best || x.t > best.t)) best = { ...x }; } return JSON.stringify(best); })();
    out.dust1540 = s('aero', 15, -40);
    const near = (id, la0, lo0, pred, R = 10) => { let best = null, bd = 1e9; for (let la = la0 - R; la <= la0 + R; la += 0.5) for (let lo = lo0 - R; lo <= lo0 + R; lo += 0.5) { const x = L[id].sample(la, lo); if (pred(x)) { const d = (la - la0) ** 2 + (lo - lo0) ** 2; if (d < bd) { bd = d; best = { la, lo, x: JSON.stringify(x).slice(0, 90) }; } } } return JSON.stringify(best); };
    out.dustNear = near('aero', 15, -40, (x) => x.cat === 'dust');
    out.gulf = s('ocean', 36, -70);
    out.gulfStrong = near('ocean', 36, -70, (x) => x.hasData && x.intensity >= 0.6, 5);
    out.humboldt = s('ocean', -12, -79);
    out.lights35105 = s('lights', 35, 105);
    out.lightsNear = near('lights', 35, 105, (x) => x.kind === 'more', 5);
    out.limaLights = s('lights', -12.05, -77.04);
    out.limaLightsNear = near('lights', -12.05, -77.04, (x) => x.kind === 'more', 1);
    out.limaAir = s('air', -12.05, -77.04);
    out.limaCoastAir = s('air', -12.1, -77.3);
    return out;
  });
  Object.entries(r).forEach(([k, v]) => log(k.padEnd(16), v));
}
