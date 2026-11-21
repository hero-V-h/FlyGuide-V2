# FlyGuide v20 — complete build brief for Claude Code

> **How to use this file**
> 1. Make a new folder, e.g. `flyguide/`.
> 2. Put two files in it: this file (`BUILD_FLYGUIDE.md`) and the current app, `FlyGuide_v19.html`.
> 3. Open Claude Code in that folder and say: **"Read BUILD_FLYGUIDE.md and build it end to end. Ask me only if a STOP condition is hit."**
> 4. Claude Code needs internet access to: `tiles.maps.eox.at`, `s2maps.eu`, `registry.npmjs.org`, `fonts.googleapis.com`, `fonts.gstatic.com`, `cdnjs.cloudflare.com` (and optionally `s3.amazonaws.com` for terrain shading).

---

## 0. Your role and the goal

You are a senior design engineer. Rebuild **FlyGuide**, a South African fly fishing web app, as **v20**. v20 is v19 (the attached `FlyGuide_v19.html`) with one major upgrade and a cleaner codebase:

1. **The map becomes a lifelike satellite map of South Africa**, built into the file (no live tile loading at runtime). The user taps one of four regions, the camera flies in, and that region's waters appear as pins on real, sharp satellite imagery.
2. **Everything else in v19 is kept**, every feature, every word of content, every fix, and the visual system described below.
3. The source is reorganised into a small project with a build script that outputs **one self‑contained HTML file**.

Work autonomously. Use a task list. Commit to decisions; don't ask about things this brief already decides. Stop and ask only at the **STOP** points listed in section 13.

---

## 1. Deliverables

1. `dist/FlyGuide_v20.html`: one self‑contained file. All CSS, JS, data, icons and images inline. It must work when:
   - opened directly from disk,
   - uploaded to a static host (Netlify or similar),
   - published as a **claude.ai artifact** (sandboxed iframe with a strict CSP, see section 2).
2. A source project (see section 3) that rebuilds `dist/` with one command: `npm run build`.
3. `scripts/fetch-map-data.mjs`: downloads and processes the map imagery and borders once, caching the results in `assets/map/` so later builds work offline.
4. `tests/`: Playwright tests (section 12) passing.
5. `dist/screenshots/`: mobile (390×844) and desktop (1440×900) screenshots of every screen listed in section 12.
6. `REPORT.md`: what was built, final venue coordinates with a confidence note for each, the image byte budget, licence confirmations, and anything not done.

---

## 2. Hard constraints (non‑negotiable)

### 2.1 Runtime environment (claude.ai artifact sandbox and static hosting)
The same file must run under this content security policy and sandbox:
- **Scripts**: inline, or from `cdnjs.cloudflare.com` only. (Chart.js 4.4.0 from cdnjs is the only external script.)
- **Stylesheets**: inline, or from `fonts.googleapis.com`. **Fonts**: `fonts.gstatic.com`.
- **Images**: `data:` and `blob:` URIs only. **Any remote image is blocked**, so every map image must be embedded.
- **fetch / XHR** to other hosts is blocked in the preview. Live features (weather, Wikipedia fly photos, chat) must fail gracefully there and work on a real host.
- **Blocked in the sandbox**: `alert`, `confirm`, `prompt`, `window.print`, downloads, geolocation, service workers, `window.open`, **and HTML form submission**.
  - **Never use `<form>` submit handlers.** v19 shipped this bug once: sign‑in and sign‑up silently did nothing in the preview because the sandbox blocks form submission *before* the `submit` event fires. Use plain `<button type="button" onclick=…>` plus an Enter‑key handler on inputs (a container with `data-enter="fnName"` that calls the function when Enter is pressed in an input). This applies to sign‑in, sign‑up, catch log "Save session" and Ask FlyGuide "Send".
- **localStorage / sessionStorage may throw** (sandbox, private mode). Keep the v19 storage shim as the very first script: test each storage; if it throws, replace it on `window` with an in‑memory object exposing `getItem`, `setItem`, `removeItem`, `clear`, `key`, `length`. Wrap all storage reads/writes in try/catch.
- Hash routing is allowed only as plain `#name` (e.g. `#recommend`). Use `history.replaceState` inside try/catch.
- Links to other sites: plain `<a href>`; show `mailto:`/`tel:` values as text too.

### 2.2 Content preservation
`FlyGuide_v19.html` is the **source of truth for all content and logic**. Extract and keep, unchanged in wording and values:
- `REGIONS` (4 regions: `dullstroom`, `kzn`, `ec`, `cape`). Each has `name, tag, sub, bestMonths, venues, venueVals, flies, venueInfo, hatch, scoreRules`.
  - Fly counts: Dullstroom 27, KZN 20, Eastern Cape 19, Cape 17. Fly fields: `name, sz, type, why, tip, when`. Types: `dry, emerger, nymph, streamer, wet`.
  - `venueInfo` (4 per region) fields: `name, type, access, best, desc, flies`.
  - `hatch` (12 months) fields: `m, r, flies, note`; ratings `prime, good, tech, wd`.
  - `scoreRules(flyKey, ctx)` scoring functions. **Copy them exactly.** `ctx` = `{season, month, tod, weather, clarity, level, temp, pressure, surface, species, venue}`.
  - Venue dropdown values: dullstroom `stillwater, laverpa, rainbow_valley, dullstroom_dam, river, spekboom`; kzn `bushmans, mooi, mkhomazi, lotheni, stillwater, kamberg, stream`; ec `sterkspruit, bell_kraai, langkloof, bokspruit, rhodes, farm_stream, barkly`; cape `smalblaar, elandspad, holsloot, dutoits, witte, general`.
- `RIGS` (16 rigs: `anchor, dropper, len, depth, tip`) and the rig selection logic.
- `TIPPET_DATA` (hook sizes 8–22 × fly type), `TIPPET_INFO` (2X–7X), the tippet adjustment logic (one size finer for crystal water and always for Cape; one size heavier for murky), and the full 0X–7X reference table.
- `getMoonPhase`, `getTempSeason`, `getTimeOfDay`, `WMO_CODES`, and the Open‑Meteo weather fetch (`https://api.open-meteo.com/v1/forecast?...`) with its auto‑fill mapping.
- `CHAT_SYSTEM_PROMPT`, `FLYGUIDE_API_KEY` placeholder, chat call to `https://api.anthropic.com/v1/messages` (model string as in v19), suggestions, thinking indicator.
- `FLY_WIKI` (49 entries) and `SPECIES_WIKI` (10) with the Wikipedia summary image lookup (`https://en.wikipedia.org/api/rest_v1/page/summary/...`), plus typographic placeholders when it fails.
- The whole Learn content built by `buildKnowledge` in v19, with 7 sections: `species, entomology, water, casting, knots, temp, regs`, including the inline SVG diagrams.
- `LEGAL_CONTENT` (`privacy`, `terms`), `NOTIFICATIONS` (10 items: `type, icon, title, text, time`; types `hatch, tip, alert, reg`).
- Auth/plan constants and logic: `OWNER_EMAIL = 'owner@flyguide.app'` (always full access), `PREMIUM_REGIONS = ['kzn','ec','cape']`, Pro‑only panels `rig, tippet, log, stats, chat`, pricing **R89/month or R749/year (save 30%)**, 7‑day trial, `STRIPE_KEY / STRIPE_MONTHLY_LINK / STRIPE_ANNUAL_LINK` placeholders with the "simulate locally until configured" behaviour, `checkStripeReturn`.
- Catch log logic: `saveEntry`, `renderLog`, top flies, `exportCSV`, `showCompare`, star rating, and stats charts (`renderStats` with Chart.js: fish per session, top flies, sessions by region).
- `REGION_HERO_IMAGES`: the four region photos (embedded WebP in v19). Reuse them exactly.
- Storage keys (keep for backwards compatibility): `fg_user`, `fg_users`, `fg_session` (sessionStorage), `fg_last_email`, `fg_notif_seen`, `fg_region`, `flyguide_log`.

Extract this by parsing the v19 script blocks (e.g. evaluate them in Node with stubbed `document`/`localStorage`, then serialise to `src/data/*.js`), **not** by retyping. `scoreRules` are functions; move them as source text. After extraction, run a check that every region has the same number of flies, venues, hatch rows and venueInfo as above.

---

## 3. Project structure and build

```
flyguide/
  BUILD_FLYGUIDE.md
  FlyGuide_v19.html          (input, read only)
  package.json               (scripts: fetch-map, build, test)
  scripts/
    extract-v19.mjs          (pulls data + logic out of v19 into src/data)
    fetch-map-data.mjs       (imagery + borders → assets/map, cached)
    build.mjs                (inlines everything → dist/FlyGuide_v20.html)
  src/
    index.html               (markup)
    styles.css
    js/storage-shim.js  data/*.js  core/*.js (scoring, weather, auth, log, chat, knowledge)
    js/ui/*.js               (nav, sheets, toast, hero, map, panels)
    icons.svg                (inline sprite)
  assets/map/                (processed WebP images + world JSON + manifest.json)
  tests/*.spec.ts
  dist/
```
- No framework. Vanilla JS, ES2019 output, no bundler requirement beyond a simple concatenating build (esbuild is fine for minifying). Output must have **zero external requests except** Google Fonts, Chart.js on cdnjs, and the live runtime APIs (Open‑Meteo, Wikipedia, Anthropic).
- Inline images as `data:image/webp;base64,…`.
- Size budget: **total HTML ≤ 4 MB**; map imagery **≤ 2.5 MB raw** before base64. Report actual numbers.

---

## 4. The satellite map (the main new work)

### 4.1 Data sources (fetch once, cache, credit)
- **Satellite imagery: EOX Sentinel‑2 cloudless, 2016 edition** (`s2cloudless_3857` WMTS, Web Mercator, GoogleMapsCompatible tile matrix). Example tile URL pattern: `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg`. Verify the exact layer name from the WMTS GetCapabilities document.
  - **Licence check first.** On https://s2maps.eu confirm that the **2016** layer is **CC BY 4.0**, which permits commercial use with attribution. Later editions (2018 onward) are **CC BY‑NC‑SA**, which does **not** suit a paid app, so don't use them. **STOP** and report if the 2016 licence isn't CC BY 4.0 or if EOX's service terms forbid this download.
  - Be polite: about 250 tiles total, max 4 concurrent requests, a User‑Agent naming the project, cache on disk, never re‑download cached tiles.
  - Attribution to show on the map (exact wording per s2maps.eu; expected): *"Sentinel‑2 cloudless – s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)"*.
- **Borders and coastline: Natural Earth via npm `world-atlas` (`countries-10m.json`)** + `topojson-client`. Use South Africa (ISO 710), Lesotho (426), eSwatini (748), Namibia, Botswana, Zimbabwe, Mozambique. Credit "Natural Earth".
- **Optional terrain shading**: AWS Terrain Tiles (Terrarium PNG, `s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`) to compute a hillshade and blend it subtly (multiply, about 15–25%) to give the Drakensberg and Cape mountains more relief. Add only if it visibly improves realism; credit per the AWS Terrain Tiles attribution. Skip if blocked.
- **Fallback if EOX is unreachable**: STOP and ask. Do not silently swap in another source.

### 4.2 Levels of detail (all Web Mercator)
Stitch tiles with `sharp` into these images, colour‑grade, export WebP (quality about 72–80; tune to hit the budget):
| Layer | Zoom | Coverage | Purpose |
|---|---|---|---|
| Country base | z7 | lon 15.5 → 33.5, lat −21.5 → −35.5 (include neighbours and ocean) | Country view |
| Region context ×4 | z9 | about ±1.6° around each region centre | Transition while flying in |
| Region detail ×4 | z11 | bounding box of the region's venues and towns + 0.15° margin | Sharp close‑up |

- **Colour grade** (bake at build): slightly lower brightness (about 0.88) and saturation (about 0.92), gentle contrast lift, so white labels stay readable and the photo reads natural, not neon. Ocean areas outside imagery use a flat colour sampled from the imagery's ocean.
- Write `assets/map/manifest.json` listing each image with its Web Mercator bounds (in normalised world units 0..1), pixel size and bytes.

### 4.3 Map engine
- **Projection**: Web Mercator everywhere (images, borders, pins, labels). Convert lon/lat → normalised mercator `x = (lon+180)/360`, `y = (1 − ln(tan φ + sec φ)/π)/2`, then to a world pixel space (e.g. ×256·2^7). **Do not reuse v19's equirectangular projection**; overlays must line up with the imagery.
- **Layers, bottom to top**:
  1. Stage background (ocean colour).
  2. **World layer**: one absolutely positioned `div` holding the `<img>` layers at their world positions, plus an inline `<svg>` with borders. The camera moves this layer with `transform: translate3d(...) scale(...)` (composited, GPU). Border strokes use `vector-effect: non-scaling-stroke`.
  3. **Marker overlay**: HTML markers positioned per frame with `transform: translate3d(x,y,0)` so they keep a constant screen size.
  4. UI chrome: breadcrumb, zoom controls, scale bar, attribution, hint.
- **LOD switching**: region context/detail images are shown when the camera scale passes their threshold and they intersect the view. Decode before showing (`img.decode()`), then crossfade opacity over 250 ms. Decode a region's images on first hover or tap of that region, and idle‑preload the rest with `requestIdleCallback` (fallback to `setTimeout`).
- **Borders**: South Africa border as a crisp 1.25 px light line (about 70% white) with a faint dark outer halo; Lesotho and eSwatini dashed; other countries thin and subtle; coastline barely visible (the imagery shows it).
- **Camera** `{x, y, s}`: screen = (world − cam)·s + viewport/2. `fitCountry()` frames South Africa with 12 px padding on phones and 40 px on desktop. `fitRegion(k)` frames the region's venues and towns with 64 px (phone) / 96 px (desktop) padding, minimum span so it never over‑zooms. Clamp scale between 0.8× and 60× of the country fit, and clamp the centre to the imagery bounds.
- **Flight**: 760 ms, easing `cubic-bezier(0.77,0,0.175,1)`. Scale interpolates geometrically, and the centre pans in proportion to the change in visible width (`k = (1/s0 − 1/s)/(1/s0 − 1/s1)`) so the target stays steady on screen. Cancelable: any drag or pinch stops the flight and runs its completion callback. Reduced motion: jump instantly.
- **Gestures**: mouse drag pans; touch one‑finger pan only when zoomed in (`touch-action: pan-y` at country view so the page still scrolls, `none` when zoomed); two‑finger pinch zooms about the midpoint; Ctrl/⌘ + wheel zooms about the cursor (plain wheel scrolls the page); double‑click zooms ×1.8; Escape returns to country view. Coalesce pointer moves into one render per animation frame. Use pointer capture. Ignore extra touches mid‑drag.
- **Prevent the clipped stage from scrolling** (v19 bug: focusing a marker scrolled the `overflow:hidden` container sideways and cut off the breadcrumb). Use `overflow: clip` plus a scroll listener that resets `scrollLeft/scrollTop` to 0.
- **Scale bar**: pick the nicest of 5, 10, 20, 25, 50, 100, 200, 250, 500 km that gives at least 56 px. Use the mercator scale at the current latitude.
- **Attribution chip**: bottom right, small, always visible, satellite and Natural Earth credits (and terrain if used).

### 4.4 Map content
- **Country view markers**: four region markers. Each is a 44 px tap target with a copper pin (24 px circle, white map‑pin icon) and a label chip (region short name, bold, plus sub line). Label direction per region so labels never collide on a 390 px phone: Dullstroom **up**, KZN **up**, Eastern Cape **down**, Cape **right**. Add a lock icon after the name when the region is locked for the user; the current region's chip gets a copper border.
- **Context labels (country view only)**: Botswana, Namibia, Mozambique (uppercase, letter‑spaced, muted); Indian Ocean / Atlantic Ocean (hidden under 640 px); cities Johannesburg, Durban, Gqeberha, Bloemfontein, Upington (small dot + name). Lesotho label visible at all zooms. On satellite imagery, all labels need a soft dark text shadow or a translucent dark chip for contrast (WCAG AA against the photo).
- **Region data** (starting coordinates are **estimates from v19, lon/lat**; verify in 4.6):

```js
dullstroom: { short:'Dullstroom', sub:'Mpumalanga Highlands', c:[30.10,-25.42], dir:'up',
  venues:[ {name:'Laverpa Dam', val:'laverpa', p:[30.02,-25.35]},
           {name:'Valley of the Rainbow', val:'rainbow_valley', p:[30.20,-25.50]},
           {name:'Dullstroom Dam', val:'dullstroom_dam', p:[30.11,-25.43]},
           {name:'Spekboom River', val:'spekboom', p:[30.22,-25.25]} ],
  towns:[ {n:'Mashishing', p:[30.45,-25.10]}, {n:'Belfast', p:[30.03,-25.69]} ] },
kzn: { short:'KZN Drakensberg', sub:'KwaZulu-Natal Midlands', c:[29.65,-29.35], dir:'up',
  venues:[ {name:'Bushmans River', val:'bushmans', p:[29.66,-29.15]},
           {name:'Mooi River', val:'mooi', p:[29.72,-29.39]},
           {name:'Mkhomazi River', val:'mkhomazi', p:[29.70,-29.63]},
           {name:'Midlands Stillwaters', val:'stillwater', p:[29.98,-29.37]} ],
  towns:[ {n:'Estcourt', p:[29.87,-29.01]}, {n:'Underberg', p:[29.49,-29.79]}, {n:'Mooi River', p:[29.99,-29.21]} ] },
ec: { short:'Eastern Cape', sub:'Rhodes and Barkly East', c:[27.80,-30.85], dir:'down',
  venues:[ {name:'Sterkspruit River', val:'sterkspruit', p:[27.78,-30.86]},
           {name:'Kraai River System', val:'bell_kraai', p:[27.60,-30.80]},
           {name:'Langkloof River', val:'langkloof', p:[27.52,-31.04]},
           {name:'Bokspruit / Upper streams', val:'bokspruit', p:[28.03,-30.90]} ],
  towns:[ {n:'Rhodes', p:[27.96,-30.80]}, {n:'Barkly East', p:[27.59,-30.97]}, {n:'Lady Grey', p:[27.22,-30.71]} ] },
cape: { short:'Cape Streams', sub:'Western Cape', c:[19.20,-33.70], dir:'right',
  venues:[ {name:'Smalblaar River', val:'smalblaar', p:[19.17,-33.69]},
           {name:'Holsloot River', val:'holsloot', p:[19.30,-33.79]},
           {name:'Elandspad River', val:'elandspad', p:[19.10,-33.74]},
           {name:'Witte River', val:'witte', p:[19.11,-33.59]} ],
  towns:[ {n:'Rawsonville', p:[19.31,-33.69]}, {n:'Wellington', p:[19.01,-33.64]}, {n:'Worcester', p:[19.45,-33.65]} ] }
```
The venue order matches each region's `venueInfo` order (pin number = index + 1).

- **Region view**: country labels and region markers fade out (200 ms, together); region towns fade in; venue pins appear as numbered 36 px light circles (mono numerals) with a dark ring, and the selected pin turns copper. On desktop all venue pins show a name label below them. On phones only the selected pin shows its label (the side list names them).

### 4.5 Side panel (desktop: right column 360 px inside the map card; phone: below the map)
- **Country view**: eyebrow "Choose a region", title "Four trout regions", helper text, then four list buttons (44 px region photo thumbnail, region name, sub line or "Current region", Pro lock tag when locked, arrow). Footer note: *"Pins mark the general area of each water, not access points. Always confirm access and permits before you go."*
- **Region view**: eyebrow (sub), region name, `bestMonths`. A lock banner if locked ("{Region} is part of FlyGuide Pro." + "Unlock" button → plan screen). If a venue is selected, a **detail card above the list**: number and type, name, chips (Access, Best), description, "Top flies", and actions **Fish here** (primary; lock icon when locked) and **Hatch calendar**. Then the numbered venue list. Footer note.
- **Fish here**: if allowed, switch the app region, set the Recommend venue dropdown to that venue's `val`, open Recommend, and toast "Venue set to {name}". If locked, toast "{Region} is part of FlyGuide Pro" and open the plan screen.
- Tapping a region on the map **also switches the app's region** when allowed, but only **after the flight lands** (switching rebuilds several sections; doing it mid‑flight drops frames). Locked regions can still be explored on the map (a teaser), but nothing that uses the region is allowed.
- Breadcrumb (top left): "← South Africa" in country view; in region view "← South Africa / {Region}" (on phones, hide the "South Africa" text in region view and keep the arrow, with `aria-label`). Zoom controls (top right): +, −, recenter. Hint (bottom right, hidden on phones): "Drag to pan. Pinch or hold Ctrl and scroll to zoom." / in region view "Tap a numbered pin for details."

### 4.6 Verify the pins against the imagery
With the detail images in hand, check each venue against the imagery and public sources (web search, OpenStreetMap). Move pins onto the actual dam or river reach that matches the v19 `venueInfo` description. Private waters (e.g. Laverpa, Valley of the Rainbow) may only be locatable approximately; keep them at the best general area. In `REPORT.md`, give a table of final coordinates, source, and confidence (high/medium/low). Keep the "general area, not access points" note.

---

## 5. Information architecture and screens

### 5.1 Shell
- **Floating top bar** (fixed, 12 px from top, centred, max 1120 px wide, 64 px tall, 16 px radius, translucent white 82% with backdrop blur, 1 px border, soft shadow): brand (32 px forest‑green rounded square with fly/hook mark + "FlyGuide", word hidden under 640 px), **region pill** (copper dot, current region short name, caret; tapping goes to Explore and scrolls to the map), desktop nav links (Explore, Recommend, Fly box, Learn, Catch log, More) at ≥ 960 px with `aria-current="page"`, plan chip (desktop: "Owner", "Pro", "Pro trial · N days left", "Trial expired", "Free plan"), alerts bell with unread dot, account avatar (initial; "?" for guests → opens sign‑in).
- **Bottom tab bar** (phones < 960 px): Explore, Recommend, Fly box, Learn, More. 24 px icons, labels, safe‑area padding, current tab icon copper.
- **More sheet** (bottom sheet): Catch log, Hatch calendar, Rig builder, Tippet guide, Stats, Ask FlyGuide; "PRO" tags on Pro tools for non‑Pro users.
- Panels: `explore, recommend, flybox, knowledge, hatch, rig, tippet, log, stats, chat`. Route on `#name`, default `explore`. On switch: scroll to top and rebuild what the panel needs (flybox, log, stats, hatch, knowledge, chat).
- Footer: "FlyGuide · Built on local guide knowledge · Always watch what's on the water", Privacy policy and Terms and conditions links (open the legal modal).
- Skip‑to‑content link; `<main id="main">`.

### 5.2 Explore (home)
1. **Hero** (24 px radius, min height 600 desktop / 560 phone): the four region photos stacked, crossfading to the current region (opacity 500 ms; scale 1.03→1 over 900 ms), dark bottom scrim for text, 5% film grain overlay. Eyebrow chip with the region `tag`. H1: **"Pick the right fly / before you reach the water."** (white→#C9C6BE gradient text). Sub: "Fly recommendations weighted to today's conditions, built on local guide knowledge across South Africa's four great trout regions." Primary button "Get today's recommendation" (→ Recommend). Glass button "Explore the map" (scrolls to map). Proof row (mono numbers): patterns in this region (fly count), featured waters (venueInfo count), prime season (first run of prime months from `hatch`, e.g. "Mar to May").
2. **Map section**: eyebrow "Where are you fishing", H2 "The waters of South Africa", then the satellite map card (section 4). Desktop map height 620 px; phone aspect 4:5, min 420 px; tablet 4:3.
3. **Season at a glance** card: "{Region} trout calendar", `bestMonths`, a 12‑column month strip coloured by rating (prime = forest, good = #6E8F75, technical = #C9B27C, weather dependent = border grey), current month label in copper, legend. **This month** card: "{Month} in {Region}", rating word + flies, note, buttons "Full calendar" and "Fly box".
4. **Featured waters**: "{Region} venues". A grid of venue cards (number badge, name, type, Access/Best chips, description, top flies), with buttons **Fish here** and **Show on map** (scrolls to the map, flies into the region, selects the pin).

### 5.3 Recommend
Desktop: two columns (400 px sticky form | results); phone: stacked, and results scroll into view after "Get recommendation".
- Live weather prompt row ("Use live weather", "Fill temperature, wind and pressure from your location", Load button); skeleton loading state (not a spinner); error box; weather card (location, mono temperature, description, wind, pressure, humidity, rain, Refresh) with an auto‑fill bar ("Ready to fill: …", "Apply to conditions").
- Groups: **Water and location** (Venue, Water clarity, Water level, Temp °C, Season, Month), **Conditions** (Time of day, Weather, Wind), **Pressure and fish activity** (segmented Rising, Stable, Falling, Post storm with `role="radio"` and keyboard support; Surface activity; Target species). Default Month, Season and Time of day from the current date.
- Buttons: "Get recommendation" (primary), "Print card".
- Empty state: "Your top four flies appear here" + helper.
- Results: condition chips (venue, season, weather, clarity, temp), confidence bar (5 segments; Very high ≥ 60, High ≥ 40, Moderate ≥ 25, else Mixed conditions) with moon phase, then **four fly cards** (rank label Primary pick / Second / Third / Fourth choice, name, type badge, image or placeholder, hook size, mono points, score bar fill scaled to `min(100, score×1.4)%`, why, guide tip, when). The first card gets a forest‑green outline. Then "Also worth trying" (next six with score > 10).
- Print card: compact card with top four flies, then `window.print()` in try/catch (blocked in the preview).

### 5.4 Fly box
Region eyebrow, title, segmented filter (All, Dry, Emerger, Nymph, Streamer, Wet), groups "{Type} · {count}" with fly cards (no rank or score).

### 5.5 Learn
Seven tabs as a segmented scroller: Species, Entomology, Reading water, Casting, Knots, Temperature, Regulations (labels as in v19). Accordion cards with a rotating chevron, animated open/close (grid‑rows 0fr→1fr, 200 ms), `role="button"`, `aria-expanded`, Enter/Space support. Species cards: coloured header (flat colour, no gradient), Wikipedia photo or flat placeholder, stats chips. Temperature ranges as full‑bordered cards (no single‑side borders). Regulations cards per region. Keep all v19 SVG diagrams (font Geist, no italics).

### 5.6 Hatch calendar
Note card with `bestMonths`; table Month | Rating pill | Primary flies | Notes; current month row tinted copper with a "Now" tag; source note "Based on local guide knowledge, FOSAF reports and field experience."

### 5.7 Rig builder (Pro)
Season, Surface activity, Water type → "Build my rig". Result card: header "{Region} · {season} · {stillwater|river}", vertical rig diagram (Leader and tippet "5X to 6X, 9 to 12 ft" → Point fly → Dropper length → Dropper fly · depth), tip, moon line. **Use class names that don't collide with `.fly`** (v19 bug: a `.rig-step.fly` step inherited card styles).

### 5.8 Tippet guide (Pro calculator, free table)
Hook size, Water clarity, Fly type → "Calculate tippet". Result: four stat tiles (X rating, Diameter, Strength, Leader) and a note; highlight the matching row in the full reference table.

### 5.9 Catch log (Pro)
Stats tiles (Sessions, Fish, Avg per trip), Your top flies, Log a session (Date, Region, Fish caught, Venue or river, Temp, Weather, Flies that worked, Flies that failed, Session notes, 5‑star rating with label), buttons Save session / Export CSV / Compare sessions, comparison grid (best/worst), session history cards with Delete. **Delete uses an in‑app confirm sheet**, never `confirm()`.

### 5.10 Stats (Pro)
Tiles (Sessions, Total fish, Best region); empty state with "Open catch log"; Chart.js charts styled with Geist and brand colours, hidden when there are no sessions.

### 5.11 Ask FlyGuide (Pro)
Chat shell with welcome message, suggestion chips, input + Send (no form), footer note "Powered by Claude. Answers can be wrong, so always confirm regulations with the relevant authority." Keep the v19 message when no API key is set (update the file name it mentions to "the FlyGuide HTML file").

### 5.12 Overlays
- **Auth screen** (first run when no user): split layout (desktop: Eastern Cape photo left with brand, H2 "Four regions. / One guide in your pocket.", short copy; form right; phone: photo band on top). Tabs Sign in / Create account. Sign in: email, password, "Remember me on this device", Sign in, "Forgot your password?". Create account: Full name, Email, Password (min 6), "Create my account". Divider "or", link "Continue without an account (Dullstroom only)". Inline error box with v19's messages.
- **Plan screen** (modal): Monthly/Annual toggle, saving line, Free card (features with locked items greyed), Pro card ("Most popular · 7 day free trial", price, features list including the interactive map), confirm button, "Cancel anytime · Secure payment via Stripe", "Not now".
- **Account sheet**: avatar, name, email, plan pill, Upgrade (non‑Pro), Sign out (→ confirm sheet), Close.
- **Alerts sheet**: list of `NOTIFICATIONS` with typed icons; opening clears the unread dot and sets `fg_notif_seen`.
- **Legal modal**: title + sections; close by X, backdrop or Escape.
- **Toast**: bottom centre above the tab bar, dark, 400 ms `ease`; strip trailing "!" from messages.

### 5.13 Auth and plan behaviour (include these v19 fixes)
- Sign‑up creates a `trial` user (owner email → `owner`) in `fg_users`, signs in, and shows the **plan screen once** (`planChosen` flag stored on the user and in `fg_users`). Later sign‑ins never show it again.
- "Not now" or a confirmed plan sets `planChosen`. Free → `plan:'free'`. Pro → `simulateStripePayment` (or a redirect when real Stripe links are set).
- **Sign‑out** hides the plan screen and any sheet, shows the auth screen **on the Sign in tab**, clears password fields, and pre‑fills the last email.
- Guests: avatar shows "?" and opens the auth screen on the Sign in tab.
- Paywall: non‑Pro users see Pro banners on rig, tippet, log, stats and chat (content dimmed and non‑interactive; chat hidden); "PRO" tags in More; locked regions show locks on the map; switching to a locked region opens the plan screen. If the current region becomes locked (e.g. trial expired), fall back to Dullstroom.
- Remember the last region in `fg_region`.

---

## 6. Design system

Use these rules for every value. If the skills named in section 11 are available, load them; these rules come from them and win over framework defaults.

### 6.1 Tokens
```css
--font:'Geist',system-ui,-apple-system,'Segoe UI',sans-serif;
--mono:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace;   /* numbers and data only */
--s-25:2px;--s-50:4px;--s-75:8px;--s-100:12px;--s-200:16px;--s-300:24px;--s-400:32px;--s-500:40px;--s-600:48px;--s-700:64px;--s-800:80px;--s-900:96px;
--r-md:6px;--r-lg:8px;--r-xl:12px;--r-2xl:16px;--r-3xl:24px;--r-full:9999px;
--bg:#F5F3EE;--surface:#FFFFFF;--surface-2:#FAF9F6;--surface-3:#EFECE5;--border:#E3DED3;--border-strong:#CFC8B8;
--ink:#161A15;--ink-2:#3B4038;--ink-3:#5E6359;--ink-4:#8A8E83;
--forest:#1F3D29;--forest-2:#2D5539;--forest-tint:#E7EEE6;
--copper:#9C5B24;--copper-2:#844A1A;--copper-tint:#F6EBDD;--copper-glow:#D08A4A;
--river:#2F5263;--river-tint:#E3ECF0;--amber:#7D560E;--amber-tint:#F7EED6;--rust:#8A3B1A;--rust-tint:#F6E4DA;
--map-ink:#E9E6DF;--map-ink-2:#A39F95;   /* map chrome uses dark surfaces #131209 #1F1F1F #272727 #313131 */
--sh-1:0 1px 2px rgb(22 26 21/.05),0 1px 3px rgb(22 26 21/.06);
--sh-2:0 2px 8px rgb(22 26 21/.06),0 8px 24px rgb(22 26 21/.06);
--sh-3:0 12px 40px rgb(22 26 21/.16);
--ring:0 0 0 3px rgb(156 91 36/.35);
--ease-out:cubic-bezier(0.23,1,0.32,1);--ease-in-out:cubic-bezier(0.77,0,0.175,1);--ease-drawer:cubic-bezier(0.32,0.72,0,1);
--nav-h:64px;--tab-h:64px;--content:1120px;
```
Load Geist 400/500/600 and Geist Mono 500/600 from Google Fonts.

### 6.2 Rules
- **One typeface (Geist).** Geist Mono only for numbers and data. **No italics anywhere.** Max weight 600.
- **Type scale (Tailwind steps only)** via named classes: Heading 1–6 (60/60, 48/48, 36/40, 30/36, 24/32, 20/28, semibold), Title 1–5 (20/28 … 12/16, medium), Body 1–6 (16/24 and 14/20 in semibold/medium/regular), Caption 1–5, Button sizes. Eyebrows: 12/16, 600, 0.12em tracking, uppercase. Hero H1 drops to 36/40 under 640 px; page titles to 30/36.
- **Spacing only from the scale above. Radius only Tailwind steps.** Nested radius = outer − gap when the gap is under 32 px and the result is above 2.
- **No background gradients.** Allowed exceptions: the hero/auth heading gradient text, photo scrims, and the skeleton shimmer.
- **No single‑sided card borders.**
- `text-wrap: balance` on headings, `pretty` on paragraphs.
- Buttons: min height 44 px (36 px small), 8×12 px padding, 12 px radius, `scale(0.97)` on press. Primary copper, forest, secondary (white + border), ghost, glass (on photos), dark (on map).
- **Icons: Phosphor (regular weight)**, inlined as an SVG sprite from npm `@phosphor-icons/core`: map-trifold, target, book-open, notebook, squares-four, bell, caret-down, arrow-left, arrow-right, plus, minus, x, lock, map-pin, cloud-sun, moon, waves, gauge, sun, link, ruler, chart-bar, chat-circle, calendar-blank, info, lightning, scroll, fish, printer, crosshair. Brand fly/hook mark stays custom. Icon‑only buttons need `aria-label`.
- Dark map chrome: breadcrumb, zoom controls and chips use `rgb(31 31 31/.96)` with a `#3D3B36` border. **No backdrop‑filter on anything inside the map** (it re‑blurs every frame while panning).

### 6.3 Copy rules (for new or changed UI copy; keep v19 data text as is)
Sentence case for headings and buttons. No hyphens inside sentences (proper names like KwaZulu‑Natal are fine). No exclamation marks in system messages. Calm, specific confirmations ("Session saved", "Switched to Cape Streams", "Venue set to Mooi River"). Errors say what failed and what to do next. Banned filler words: revolutionize, supercharge, cutting edge, effortless, world class, harness the power. Never invent facts, prices, stats or testimonials.

---

## 7. Motion (choreography, timing, performance)

| Element | Role | Start | Duration | Motion | Notes |
|---|---|---|---|---|---|
| Map camera flight | Lead | 0 | 760 ms (home 650) | geometric zoom + proportional pan, ease‑in‑out | rAF; cancel on gesture |
| Country labels / region markers out | Decoration | 0 | 200 ms | fade | together |
| Region detail imagery | Support | when decoded | 250 ms | opacity crossfade | never pops |
| Towns in | Decoration | 60% of flight | 200 ms | fade | together |
| Venue pins in | Support | 60% of flight | 320 ms | fade + 6 px rise + scale 0.9→1, ease‑out | delays 0, 50, 90, 120 ms (shrinking gaps) |
| Region markers back in (home) | Support | 380 ms | 200 ms | fade | |
| Side panel content swap | Feedback | 0 | 180 ms | fade + 4 px rise | |
| Region switch app sections | None | after landing | — | — | rebuild only once landed |
| Panel switch | — | 0 | 150 ms | opacity only | tabs used tens of times a day |
| Recommend fly cards | Support | 0 | 300 ms | fade + 10 px rise | delays 0, 60, 110, 150 ms; first card leads |
| Score bars | Decoration | after insert | 500 ms | `scaleX` from left | transform only |
| Hero photo change | Explanation | 0 | 500 ms opacity, 900 ms scale | crossfade | |
| Sheets | — | 0 | open 500 ms / close 300 ms | translateY, drawer curve | asymmetric |
| Modals | — | 0 | 250 ms | fade + scale 0.96→1, centred | |
| Toast | — | 0 | 400 ms `ease` | translateY + fade | transition, not keyframes |
| Accordions | — | 0 | 200 ms | grid‑rows 0fr→1fr | sanctioned layout exception |
| Buttons/pins press | Feedback | 0 | 160 ms | scale 0.97 (pins 0.94) | |

- Animate only `transform` and `opacity` (plus the accordion and skeleton exceptions). Never `transition: all`. Never `scale(0)`. Never `ease-in` on UI. Hover effects only inside `@media (hover:hover) and (pointer:fine)`. No animation on keyboard‑triggered actions. No `will-change` unless a 1 px shift is observed.
- **Reduced motion**: keep fades, drop movement. The map jumps instantly, cards and pins just fade, sheets and toast fade in place, no score bar animation, no skeleton shimmer, no hero scale.

---

## 8. Accessibility and states
- Contrast AA everywhere, including labels on satellite imagery.
- Visible focus ring (`--ring`) on every interactive element. Keyboard reachable map: region markers and venue pins are `<button>`s with descriptive `aria-label`s; Escape closes sheets/modals and leaves region view.
- Sheets and modals: focus moves in on open and back on close; `role="dialog"`, `aria-modal`.
- Touch targets ≥ 44 px. Alt text on every photo (v19 alts). `aria-live` on toast and the map side panel.
- States: hover, active, focus, loading (skeletons), empty (composed, with an icon and next action), error (inline, specific). No dead links.

## 9. Responsive
Breakpoints: < 640 (phone), 640–959 (tablet: 2‑column grids, map 4:3), ≥ 960 (desktop: top nav links, no tab bar, map card with side column, Recommend two columns), ≥ 1180 (two fly cards per row in results). Check 390 px: no horizontal overflow, buttons keep their text, primary action visible on first screen.

## 10. Meta and shipping
`<html lang="en-ZA">`, title "FlyGuide · South African fly fishing guide", meta description, Open Graph title/description, theme‑color `#1F3D29`, Apple web‑app metas, inline SVG favicon (forest square with hook mark). Keep v19's service worker registration guarded in try/catch.

---

## 11. Skills to load if available
`design`, `ui-ux-pro-max`, `emil-design-skill`, `animate-skill`, `choreograph-skill`, `animation-performance-skill`, `review-animations-skill`, `pick-ui-library-skill`, `photoreal-web-imagery` (its web‑delivery and colour‑grading guidance applies to the satellite images). If unavailable, the rules in sections 6–8 already encode them. Library choice: stay vanilla (no React), keep Chart.js for charts; hand‑build the sheet, toast and accordion following the Vaul/Sonner principles above.

After building, run an animation review against section 7 and an animation performance pass (composite‑only properties, no backdrop‑filter on moving content, rAF‑coalesced pointer rendering, no heavy work during flights). Fix findings before finishing.

---

## 12. Tests and acceptance (Playwright)
Run in Chromium at **390×844** and **1440×900**. Block external network in tests (fonts/CDN may fail; that must not break anything).
1. **No page errors** on load and through every flow.
2. **Sandbox test**: load `dist/FlyGuide_v20.html` via `srcdoc` into `<iframe sandbox="allow-scripts">` (no `allow-forms`, no `allow-same-origin`). In the frame: create an account → plan screen shows once → start trial → Pro is true → sign out (lands on the Sign in tab, plan screen hidden) → sign in again (no plan screen) → wrong password shows "Incorrect password. Please try again." → guest → avatar → sign in with Enter key works. Catch log save and chat send buttons respond.
3. **Map**: country view fits South Africa at both sizes with no clipped region labels; tapping each region flies in; detail imagery becomes visible (opacity 1) and is sharp (check its natural pixel density ≥ 1× screen at the region fit); pins align with imagery (screenshot each region); pin tap opens detail; Fish here sets the venue and opens Recommend; guest tapping a Pro region shows the lock banner and Fish here opens the plan screen; breadcrumb never clipped (focus each marker with Tab and assert `scrollLeft === 0`); Escape returns home; Ctrl+wheel zooms; pinch zoom works (emulated touch).
4. **Recommend** returns 4 cards for every region and venue; print card renders.
5. **Paywall**: guest sees banners and locked content; owner email gets everything.
6. **Catch log**: save → entry appears → delete via confirm sheet → gone. CSV export function doesn't throw.
7. **Learn**: all 7 tabs render, accordions toggle with keyboard.
8. **Reduced motion** emulation: map jumps instantly; no transform animations.
9. **Layout**: no horizontal overflow at 390 px on any panel.
10. **Budget**: report the HTML size and the map imagery size; fail if over section 3 limits.
11. **Screenshots** to `dist/screenshots/`: auth, explore hero, map country, map region ×4, venue selected, recommend results, fly box, learn (accordion open), hatch, rig result, tippet result, catch log, stats empty, chat, more sheet, account sheet, alerts, plan screen, legal modal, at both sizes. Look at them and fix anything that looks off before finishing.

---

## 13. STOP conditions (ask the user before continuing)
- The EOX 2016 layer isn't CC BY 4.0, or EOX's terms forbid this use, or the tiles can't be reached.
- The imagery can't fit the size budget without visible quality loss. Propose options (fewer LOD layers, smaller detail area, lower zoom).
- Any v19 content or logic can't be extracted exactly.

## 14. Known limitations to carry over and list in REPORT.md
- Accounts are stored in each browser (`fg_users` with base64 passwords). This is a demo, not secure auth. v19 code has notes for moving to Supabase; don't build that now unless asked.
- `FLYGUIDE_API_KEY` in client code would expose the key; chat needs a small backend proxy before launch.
- Stripe links are placeholders; payments are simulated until configured.
- In the claude.ai preview, live weather, Wikipedia photos, chat, CSV download and printing are blocked by the sandbox; they work on a normal host. In the preview, accounts last only for the visit.
- Venue pins mark general areas, not access points.

## 15. Final report (end of run)
Summarise in `REPORT.md` and in chat: what changed from v19, the final file and its size, imagery sources and licence confirmations with exact attribution text, the venue coordinate table, test results, screenshots location, and anything skipped or uncertain.
