// Download and process the satellite map once. Results land in assets/map/ and
// are committed, so `npm run build` works offline afterwards.
//
//   npm run fetch-map              fetch missing tiles, (re)process images + borders
//   npm run fetch-map -- --offline process from the tile cache only
//   npm run fetch-map -- --quality 74   override WebP quality
//
// Imagery: EOxCloudless 2016 (s2cloudless_3857), CC BY 4.0, by EOX IT Services GmbH.
// Borders: Natural Earth 1:10m via the world-atlas npm package (public domain).
// Raw tiles are cached in .cache/tiles (git ignored) and never downloaded twice.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import sharp from 'sharp';
import * as topojson from 'topojson-client';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/map');
const CACHE = path.join(ROOT, '.cache/tiles');
const OFFLINE = process.argv.includes('--offline');
const qArg = process.argv.indexOf('--quality');
const QUALITY = qArg > -1 ? +process.argv[qArg + 1] : 80;

const LAYER = 's2cloudless_3857';
const TILE_URL = (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/${LAYER}/default/GoogleMapsCompatible/${z}/${y}/${x}.jpg`;
const UA = 'FlyGuide-build/20 (one-off basemap preparation; tiles cached locally)';
const MAX_CONCURRENT = 4;

const geoCtx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/geo.js'), 'utf8'), geoCtx);
const { REGION_META, REGION_ORDER, IMAGERY_BOUNDS } = geoCtx;

// ── Web Mercator ────────────────────────────────────────────────
const mx = (lon) => (lon + 180) / 360;
const my = (lat) => { const p = (lat * Math.PI) / 180; return (1 - Math.log(Math.tan(p) + 1 / Math.cos(p)) / Math.PI) / 2; };
const worldPx = (z) => 256 * Math.pow(2, z);

// ── Layers to build ─────────────────────────────────────────────
function boxFromLonLat(lon0, lat0, lon1, lat1) { // lat0 north, lat1 south
  return { x0: mx(Math.min(lon0, lon1)), x1: mx(Math.max(lon0, lon1)), y0: my(Math.max(lat0, lat1)), y1: my(Math.min(lat0, lat1)) };
}
const layers = [];
layers.push({ id: 'country', z: 7, box: boxFromLonLat(IMAGERY_BOUNDS.lon0, IMAGERY_BOUNDS.lat0, IMAGERY_BOUNDS.lon1, IMAGERY_BOUNDS.lat1) });
for (const k of REGION_ORDER) {
  const m = REGION_META[k];
  const C = 1.6;
  layers.push({ id: k + '-context', region: k, z: 9, box: boxFromLonLat(m.c[0] - C, m.c[1] + C, m.c[0] + C, m.c[1] - C) });
  const pts = m.venues.map((v) => v.p).concat(m.towns.map((t) => t.p));
  const M = 0.15;
  const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
  layers.push({ id: k + '-detail', region: k, z: 11, box: boxFromLonLat(Math.min(...lons) - M, Math.max(...lats) + M, Math.max(...lons) + M, Math.min(...lats) - M) });
}

// Snap every box to whole pixels at its zoom so bounds are exact.
for (const L of layers) {
  const W = worldPx(L.z);
  L.px0 = Math.floor(L.box.x0 * W); L.py0 = Math.floor(L.box.y0 * W);
  L.px1 = Math.ceil(L.box.x1 * W); L.py1 = Math.ceil(L.box.y1 * W);
  L.w = L.px1 - L.px0; L.h = L.py1 - L.py0;
  L.tx0 = Math.floor(L.px0 / 256); L.ty0 = Math.floor(L.py0 / 256);
  L.tx1 = Math.floor((L.px1 - 1) / 256); L.ty1 = Math.floor((L.py1 - 1) / 256);
  L.bounds = { x0: L.px0 / W, y0: L.py0 / W, x1: L.px1 / W, y1: L.py1 / W };
}

// ── Tile download (polite, cached) ──────────────────────────────
const tilePath = (z, x, y) => path.join(CACHE, 'eox-2016', String(z), String(y), x + '.jpg');
async function download(z, x, y) {
  const p = tilePath(z, x, y);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) return 'cached';
  if (OFFLINE) throw new Error('Tile not cached and --offline set: ' + p);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(TILE_URL(z, x, y), { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error('Tile too small');
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, buf);
      return 'fetched';
    } catch (e) {
      if (attempt === 4) throw new Error(`Tile ${z}/${x}/${y} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt * attempt));
    }
  }
}
async function fetchAll(list) {
  let i = 0, fetched = 0, cached = 0;
  async function worker() {
    while (i < list.length) {
      const t = list[i++];
      const r = await download(t.z, t.x, t.y);
      if (r === 'fetched') { fetched++; await new Promise((res) => setTimeout(res, 120)); } else cached++;
    }
  }
  await Promise.all(Array.from({ length: MAX_CONCURRENT }, worker));
  return { fetched, cached };
}

// ── Image assembly and grading ──────────────────────────────────
async function assemble(L) {
  const tiles = [];
  for (let ty = L.ty0; ty <= L.ty1; ty++) for (let tx = L.tx0; tx <= L.tx1; tx++) tiles.push({ tx, ty });
  const cw = (L.tx1 - L.tx0 + 1) * 256, ch = (L.ty1 - L.ty0 + 1) * 256;
  const canvas = sharp({ create: { width: cw, height: ch, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite(tiles.map((t) => ({ input: tilePath(L.z, t.tx, t.ty), left: (t.tx - L.tx0) * 256, top: (t.ty - L.ty0) * 256 })));
  const { data, info } = await canvas.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left: L.px0 - L.tx0 * 256, top: L.py0 - L.ty0 * 256, width: L.w, height: L.h });
}
// Baked grade: a little darker and less saturated so white labels read, gentle contrast lift.
const grade = (img) => img.modulate({ brightness: 0.88, saturation: 0.92 }).linear(1.06, -(128 * 0.06) + 2);

// ── Borders (Natural Earth via world-atlas) ─────────────────────
function buildBorders() {
  const topo = require('world-atlas/countries-10m.json');
  const SA = '710', LS = '426', SZ = '748';
  const NEAR = new Set([SA, LS, SZ, '516', '072', '716', '508']); // + Namibia, Botswana, Zimbabwe, Mozambique
  const geoms = topo.objects.countries;
  const W = worldPx(7);
  const clip = { lon0: 11, lon1: 38, lat0: -15, lat1: -38 };
  const inClip = ([lon, lat]) => lon >= clip.lon0 && lon <= clip.lon1 && lat <= clip.lat0 && lat >= clip.lat1;
  function toPath(mesh, minStep) {
    let d = '';
    for (const line of mesh.coordinates) {
      let run = [];
      const flush = () => {
        if (run.length > 1) {
          let last = null, s = '';
          run.forEach((p, i) => {
            const x = mx(p[0]) * W, y = my(p[1]) * W;
            if (last && i < run.length - 1 && Math.hypot(x - last[0], y - last[1]) < minStep) return;
            s += (s ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
            last = [x, y];
          });
          d += s;
        }
        run = [];
      };
      for (const p of line) { if (inClip(p)) run.push(p); else flush(); }
      flush();
    }
    return d;
  }
  const id = (g) => String(g.id);
  return {
    // world units: z7 pixels (256 * 2^7 per world width)
    worldSize: W,
    saLand: toPath(topojson.mesh(topo, geoms, (a, b) => a !== b && (id(a) === SA || id(b) === SA) && ![LS, SZ].includes(id(a)) && ![LS, SZ].includes(id(b))), 0.08),
    enclave: toPath(topojson.mesh(topo, geoms, (a, b) => a !== b && ([LS, SZ].includes(id(a)) || [LS, SZ].includes(id(b)))), 0.08),
    others: toPath(topojson.mesh(topo, geoms, (a, b) => a !== b && id(a) !== SA && id(b) !== SA && ![LS, SZ].includes(id(a)) && ![LS, SZ].includes(id(b)) && (NEAR.has(id(a)) || NEAR.has(id(b)))), 0.15),
    coast: toPath(topojson.mesh(topo, geoms, (a, b) => a === b && NEAR.has(id(a))), 0.15)
  };
}

// ── Main ────────────────────────────────────────────────────────
const tileList = [];
for (const L of layers) for (let ty = L.ty0; ty <= L.ty1; ty++) for (let tx = L.tx0; tx <= L.tx1; tx++) tileList.push({ z: L.z, x: tx, y: ty });
const uniq = [...new Map(tileList.map((t) => [t.z + '/' + t.x + '/' + t.y, t])).values()];
console.log(`Layers: ${layers.length}, tiles needed: ${uniq.length}`);
const stats = await fetchAll(uniq);
console.log(`Tiles fetched: ${stats.fetched}, from cache: ${stats.cached}`);

fs.mkdirSync(OUT, { recursive: true });
const manifest = {
  source: 'EOxCloudless 2016 (Sentinel-2 cloudless, layer s2cloudless_3857), CC BY 4.0',
  attribution: 'EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)',
  bordersAttribution: 'Borders and coastline: Natural Earth',
  projection: 'Web Mercator; bounds in normalised world units 0..1',
  quality: QUALITY,
  generated: new Date().toISOString(),
  images: []
};
let total = 0;
for (const L of layers) {
  const file = L.id + '.webp';
  const img = grade(await assemble(L));
  const buf = await img.webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toBuffer();
  fs.writeFileSync(path.join(OUT, file), buf);
  total += buf.length;
  manifest.images.push({ id: L.id, region: L.region || null, z: L.z, file, bounds: L.bounds, px: { w: L.w, h: L.h }, bytes: buf.length });
  console.log(`${file.padEnd(22)} z${L.z} ${String(L.w).padStart(5)}×${String(L.h).padEnd(5)} ${(buf.length / 1024).toFixed(0).padStart(5)} KB`);
}
// Flat ocean colour sampled from the country image's open sea (south west corner)
{
  const c = manifest.images[0];
  const { data } = await sharp(path.join(OUT, c.file)).extract({ left: 8, top: c.px.h - 120, width: 112, height: 112 }).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0; const n = data.length / 3;
  for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  manifest.ocean = '#' + hex(r) + hex(g) + hex(b);
}
manifest.totalBytes = total;
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const borders = buildBorders();
fs.writeFileSync(path.join(OUT, 'borders.json'), JSON.stringify(borders));
console.log(`Imagery total ${(total / 1024 / 1024).toFixed(2)} MB (budget 2.5 MB). Ocean ${manifest.ocean}. Borders ${(JSON.stringify(borders).length / 1024).toFixed(0)} KB.`);
if (total > 2.5 * 1024 * 1024) { console.error('Imagery is over the 2.5 MB budget.'); process.exitCode = 2; }
