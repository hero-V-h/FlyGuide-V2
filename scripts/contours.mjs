// Topographic contour texture for the field-journal design.
// A seeded terrain field (sum of Gaussian hills and hollows) is traced with
// marching squares into contour lines; every fifth line is an index contour,
// drawn heavier, as on a survey map. The SVG is used as a CSS mask, so its
// colour comes from the theme. Deterministic: the same seed gives the same lines.

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function contourSvg({ w = 960, h = 600, seed = 7, nx = 80, ny = 50, count = 18 } = {}) {
  const R = rng(seed);
  const hills = Array.from({ length: 16 }, () => ({ x: R() * w, y: R() * h, s: 60 + R() * 220, a: (R() < 0.75 ? 1 : -0.6) * (0.5 + R()) }));
  const field = (x, y) => hills.reduce((v, k) => v + k.a * Math.exp(-((x - k.x) ** 2 + (y - k.y) ** 2) / (2 * k.s * k.s)), 0) + 0.15 * Math.sin(x / 170) * Math.cos(y / 130);
  const gx = w / (nx - 1), gy = h / (ny - 1), G = [];
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j < ny; j++) { G.push([]); for (let i = 0; i < nx; i++) { const v = field(i * gx, j * gy); G[j].push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  const paths = { minor: [], index: [] };
  for (let n = 1; n < count; n++) {
    const L = lo + ((hi - lo) * n) / count;
    const segs = [];
    const lerp = (a, b, va, vb) => a + ((L - va) / (vb - va)) * (b - a);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const v0 = G[j][i], v1 = G[j][i + 1], v2 = G[j + 1][i + 1], v3 = G[j + 1][i];
      const x0 = i * gx, y0 = j * gy, x1 = x0 + gx, y1 = y0 + gy;
      const e = [];
      if ((v0 < L) !== (v1 < L)) e.push([lerp(x0, x1, v0, v1), y0]);
      if ((v1 < L) !== (v2 < L)) e.push([x1, lerp(y0, y1, v1, v2)]);
      if ((v3 < L) !== (v2 < L)) e.push([lerp(x0, x1, v3, v2), y1]);
      if ((v0 < L) !== (v3 < L)) e.push([x0, lerp(y0, y1, v0, v3)]);
      if (e.length === 2) segs.push(e);
      else if (e.length === 4) { segs.push([e[0], e[1]]); segs.push([e[2], e[3]]); }
    }
    // join segments into polylines
    const key = (p) => p[0].toFixed(2) + ',' + p[1].toFixed(2);
    const ends = new Map();
    segs.forEach((s, k) => { for (const p of s) { const kk = key(p); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); } });
    const used = new Set();
    for (let k = 0; k < segs.length; k++) {
      if (used.has(k)) continue;
      used.add(k);
      let line = [segs[k][0], segs[k][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0];
          const next = (ends.get(key(tip)) || []).find((m) => !used.has(m));
          if (next === undefined) break;
          used.add(next);
          const s = segs[next], other = key(s[0]) === key(tip) ? s[1] : s[0];
          if (dir) line.push(other); else line.unshift(other);
        }
      }
      if (line.length < 4) continue;
      // Chaikin smoothing, one pass
      const sm = [line[0]];
      for (let q = 0; q < line.length - 1; q++) { const a = line[q], b = line[q + 1]; sm.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      sm.push(line[line.length - 1]);
      const d = 'M' + sm.map((p) => Math.round(p[0]) + ' ' + Math.round(p[1])).join('L');
      (n % 5 === 0 ? paths.index : paths.minor).push(d);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#000" stroke-linejoin="round" stroke-linecap="round"><path stroke-width="1" d="${paths.minor.join('')}"/><path stroke-width="2" d="${paths.index.join('')}"/></g></svg>`;
}

export function contourDataUri(opts) {
  return 'data:image/svg+xml,' + encodeURIComponent(contourSvg(opts)).replace(/%20/g, ' ').replace(/%2C/g, ',').replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%3D/g, '=').replace(/%22/g, "'");
}
