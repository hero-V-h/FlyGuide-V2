// Build dist/FlyGuide_v20.html: one self-contained file.
// Inlines CSS, the icon sprite, all data, the map imagery and hero photos (as
// data: URIs) and the app script. The only external requests are Google Fonts,
// Chart.js on cdnjs and the live runtime APIs (Open-Meteo, Wikipedia, Anthropic).
//
//   npm run build            minified
//   npm run build -- --dev   readable output
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { contourDataUri } from './contours.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = (p) => path.join(ROOT, p);
const read = (p) => fs.readFileSync(r(p), 'utf8');
const DEV = process.argv.includes('--dev');
const OUT = r('dist/FlyGuide_v20.html');

// ── Icons: Phosphor (regular) sprite + the custom FlyGuide fly/hook mark ──
const PHOSPHOR = {
  map: 'map-trifold', target: 'target', book: 'book-open', notebook: 'notebook', grid: 'squares-four', bell: 'bell',
  caret: 'caret-down', back: 'arrow-left', arrow: 'arrow-right', plus: 'plus', minus: 'minus', x: 'x', lock: 'lock',
  pin: 'map-pin', cloud: 'cloud-sun', moon: 'moon', water: 'waves', gauge: 'gauge', sun: 'sun', link: 'link',
  ruler: 'ruler', chart: 'chart-bar', chat: 'chat-circle', calendar: 'calendar-blank', info: 'info', bolt: 'lightning',
  scroll: 'scroll', fish: 'fish', print: 'printer', crosshair: 'crosshair'
};
function sprite() {
  let s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>\n';
  for (const [id, name] of Object.entries(PHOSPHOR)) {
    const svg = fs.readFileSync(r(`node_modules/@phosphor-icons/core/assets/regular/${name}.svg`), 'utf8');
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    s += `<symbol id="i-${id}" viewBox="0 0 256 256" fill="currentColor">${inner}</symbol>\n`;
  }
  // Brand mark (custom, kept from v19)
  s += '<symbol id="i-fly" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5v9.5a4 4 0 0 1-8 0v-1.5"/><path d="M6.5 11.5 5 13.5"/><path d="M14.5 6.5c2.5-2.5 5.5-2.5 6-1.5s-1.5 3.5-6 4"/><path d="M14.5 9.5c-2-3-5-4-6-3s.5 3.5 6 3"/></g></symbol>\n';
  return s + '</defs></svg>';
}

// ── Generated data: hero photos and map ──
const dataUri = (file, mime) => `data:${mime};base64,` + fs.readFileSync(r(file)).toString('base64');
const HERO = ['dullstroom', 'kzn', 'ec', 'cape'];
const heroJs = 'var REGION_HERO_IMAGES = ' + JSON.stringify(Object.fromEntries(HERO.map((k) => [k, dataUri(`assets/hero/${k}.webp`, 'image/webp')]))) + ';\n';

const manifest = JSON.parse(read('assets/map/manifest.json'));
const borders = JSON.parse(read('assets/map/borders.json'));
const country = manifest.images.find((i) => i.id === 'country');
const W7 = 256 * 128;
const MAP_DATA = {
  origin: { x: Math.round(country.bounds.x0 * W7), y: Math.round(country.bounds.y0 * W7) },
  sea: manifest.ocean,
  attribution: manifest.attribution,
  images: manifest.images.map((i) => ({ id: i.id, region: i.region, z: i.z, bounds: i.bounds, px: i.px, src: dataUri('assets/map/' + i.file, 'image/webp') })),
  borders: { saLand: borders.saLand, enclave: borders.enclave, others: borders.others, coast: borders.coast }
};
const mapJs = 'var MAP_DATA = ' + JSON.stringify(MAP_DATA) + ';\n';

// ── App script, in load order ──
const ORDER = [
  'src/data/config.js', 'src/data/regions.js', 'src/data/rigs.js', 'src/data/weather.js', 'src/data/chat.js',
  'src/data/wiki.js', 'src/data/legal.js', 'src/data/notifications.js', 'src/data/knowledge.js', 'src/data/geo.js',
  '@hero', '@map',
  'src/js/core/state.js', 'src/js/core/a11y.js', 'src/js/core/images.js', 'src/js/core/scoring.js', 'src/js/core/weather.js', 'src/js/core/tools.js',
  'src/js/core/log.js', 'src/js/core/auth.js', 'src/js/core/chat.js', 'src/js/core/knowledge.js',
  'src/js/ui/sheets.js', 'src/js/ui/nav.js', 'src/js/ui/hero.js', 'src/js/ui/map.js', 'src/js/ui/theme.js', 'src/js/ui/init.js'
];
// Every src/js file must be listed, so nothing is silently left out
const listed = new Set(ORDER.filter((f) => !f.startsWith('@')));
for (const dir of ['src/js/core', 'src/js/ui', 'src/data']) for (const f of fs.readdirSync(r(dir))) if (f.endsWith('.js') && !listed.has(`${dir}/${f}`)) throw new Error('Not in build order: ' + dir + '/' + f);

let app = '';
for (const f of ORDER) {
  const code = f === '@hero' ? heroJs : f === '@map' ? mapJs : read(f);
  app += `\n/* ${f} */\n` + code + '\n';
}
const appOut = (await esbuild.transform(app, { loader: 'js', target: 'es2019', minify: !DEV, legalComments: 'none', charset: 'utf8' })).code;
// Top-level names must survive minification: inline onclick handlers call them
for (const name of ['go', 'mapRegion', 'selectVenue', 'handleLogin', 'handleSignup', 'saveEntry', 'sendChat', 'recommend', 'fishHere', 'showLegal']) {
  if (!new RegExp('function ' + name + '\\(').test(appOut)) throw new Error('Minifier renamed global function ' + name);
}
const shim = (await esbuild.transform(read('src/js/storage-shim.js'), { loader: 'js', target: 'es2019', minify: !DEV })).code;
// Topographic contour texture, generated (see scripts/contours.mjs) and used as a CSS mask
// --topo is a larger sheet for the page background, so lines stay fine on wide screens
const contourCss = ':root{--contours:url("' + contourDataUri({ seed: 11 }) + '");--topo:url("' + contourDataUri({ w: 1600, h: 1000, seed: 23, nx: 120, ny: 76, count: 30, hillCount: 28 }) + '")}\n';
const css = (await esbuild.transform(contourCss + read('src/styles.css'), { loader: 'css', minify: !DEV, target: ['chrome100', 'safari15', 'firefox100'] })).code;

const safeScript = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const headScripts =
  '<script>' + safeScript(shim.trim()) + '</script>\n' +
  '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>';

let html = read('src/index.html');
const put = (marker, content) => {
  if (!html.includes(marker)) throw new Error('Missing marker ' + marker);
  html = html.split(marker).join(content);
};
put('<!--BUILD:head-scripts-->', headScripts);
put('<!--BUILD:styles-->', css.trim());
put('<!--BUILD:icons-->', sprite());
// Decorative icons beside visible text are hidden from screen readers
html = html.replace(/<svg>(<use href="#i-[a-z]+"\/>)<\/svg>/g, '<svg aria-hidden="true" focusable="false">$1</svg>');
put('<!--BUILD:app-script-->', '<script>' + safeScript(appOut) + '</script>');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);

// claude.ai artifact variant: the platform wraps the page in its own document
// skeleton (doctype, html, head, body and a viewport meta with viewport-fit=cover),
// so this copy leaves those out and names the page by the product.
const ART = r('dist/FlyGuide_v20.artifact.html');
let art = html
  .replace(/^<!DOCTYPE html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*$/i, '')
  .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="UTF-8"\/>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<title>[^<]*<\/title>/i, '<title>FlyGuide</title>\n<script>document.documentElement.lang="en-ZA"</script>');
for (const t of ['<html', '<head>', '<body', 'name="viewport"']) if (art.toLowerCase().includes(t.toLowerCase())) throw new Error('Artifact variant still contains ' + t);
fs.writeFileSync(ART, art);

// ── Budget ──
const size = Buffer.byteLength(html);
const imagery = manifest.images.reduce((a, i) => a + i.bytes, 0);
const report = {
  file: 'dist/FlyGuide_v20.html', htmlBytes: size, mapImageryRawBytes: imagery,
  heroPhotoRawBytes: HERO.reduce((a, k) => a + fs.statSync(r(`assets/hero/${k}.webp`)).size, 0),
  scriptBytes: Buffer.byteLength(appOut), cssBytes: Buffer.byteLength(css),
  limits: { htmlBytes: 4 * 1024 * 1024, mapImageryRawBytes: 2.5 * 1024 * 1024 }
};
fs.writeFileSync(r('dist/build-report.json'), JSON.stringify(report, null, 2));
const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
console.log(`Built ${report.file}: ${mb(size)} (limit 4 MB). Map imagery ${mb(imagery)} raw (limit 2.5 MB). Script ${mb(report.scriptBytes)}, CSS ${(report.cssBytes / 1024).toFixed(0)} KB.`);
if (size > report.limits.htmlBytes || imagery > report.limits.mapImageryRawBytes) { console.error('Over budget'); process.exit(1); }
