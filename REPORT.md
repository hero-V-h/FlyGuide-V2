# FlyGuide v20: build report

## Summary

FlyGuide v20 is built. `dist/FlyGuide_v20.html` is one self-contained file at **3.21 MB** (limit 4 MB). The main change is a real satellite map of South Africa built into the file. Everything else from v19 is kept: content, logic, fixes and visual system. The code is now a small vanilla JS project with a one-command build.

- **Tests:** 33 Playwright tests pass at 390×844 and 1440×900. The other 5 are skipped on purpose because they apply to one viewport only (mouse wheel, double click and budget on desktop; pinch and the 390 px overflow check on phone).
- **Screenshots:** 45 screens in `dist/screenshots/`, both sizes.

```
npm install
npm run fetch-map   # only needed to rebuild imagery; results are committed in assets/map/
npm run build       # → dist/FlyGuide_v20.html
npm test            # Playwright, both viewports
npm run check-v19   # confirms src/data still matches v19 and lists logic that differs from v19
```

## What changed from v19

| Area | v19 | v20 |
|---|---|---|
| Map | Hand-traced outlines, equirectangular, dark vector style | Sentinel‑2 satellite imagery, Web Mercator, 3 levels of detail, Natural Earth borders |
| Venue pins | Estimates | Checked against OpenStreetMap river geometry (table below); several moved |
| Code | One 800 KB HTML file with two layered scripts (the second overrode 29 functions of the first) | `src/` project: data extracted from v19 by script, one definition per function, build inlines everything |
| Icons | Hand-drawn SVG sprite | Phosphor (regular) sprite from `@phosphor-icons/core`; the fly/hook brand mark stays custom |
| Links | `<a onclick>` without `href` (not keyboard reachable) | `<button class="link">` |
| Escape | Closed sheets | Also closes the legal modal and leaves the map's region view |
| Toast | Replaced a trailing "!" with "." | Strips it ("Session saved") |
| Stats | v18 chart colours; empty state rendered inline | Brand colours (forest, sage, river, copper); empty state laid out as designed |
| Plan screen | Focus stayed behind it | Focus moves into it on open |
| Legal modal | No focus handling | Focus moves to Close, returns on close |

Logic is otherwise unchanged. The extractor (`scripts/extract-v19.mjs`) parses both v19 scripts with acorn and evaluates each data declaration in a Node VM. It serialises the values to `src/data/*.js`: `scoreRules` moves as source text and the hero photos as their exact bytes. It then evaluates the output again and compares it with v19.

`npm run check-v19` confirms the data matches, and checks 62 v19 functions copied into `src/js`: 60 are identical apart from whitespace, and two differ on purpose: `renderStatsBase` (brand colours and the flex empty state) and `showPlanScreen` (focus).

The counts checked are:
- Flies: Dullstroom 27, KZN 20, Eastern Cape 19, Cape 17.
- Every region: 4 `venueInfo` entries and 12 hatch rows.
- Venue dropdown values exactly as in the brief.
- 16 rigs, 49 `FLY_WIKI` entries, 10 `SPECIES_WIKI` entries, 10 notifications.

## Size budget

| Part | Bytes |
|---|---|
| **HTML total** | **3,362,884 (3.21 MB)**, limit 4 MB |
| Map imagery, raw WebP (9 images) | 1,903,678 (1.82 MB), limit 2.5 MB |
| Hero photos, raw WebP (reused from v19) | 312,146 |
| Inline script (includes base64 images) | 3,244,030 |
| CSS | 65,184 |

| Image | Zoom | Pixels | KB |
|---|---|---|---|
| country | z7 | 1640×2079 | 336 |
| dullstroom-context / detail | z9 / z11 | 1166×1292 / 1058×1604 | 191 / 163 |
| kzn-context / detail | z9 / z11 | 1166×1338 / 1169×1810 | 166 / 200 |
| ec-context / detail | z9 / z11 | 1166×1359 / 1528×956 | 211 / 168 |
| cape-context / detail | z9 / z11 | 1167×1402 / 1071×888 | 214 / 209 |

These are WebP at quality 80 (the top of the brief's 72 to 80 range), with the baked grade: brightness 0.88, saturation 0.92 and a gentle contrast lift. The outside ocean uses `#0a152a`, sampled from the imagery's open sea.

## Imagery and data licences

**Satellite imagery: EOxCloudless 2016** (WMTS layer `s2cloudless_3857`, GoogleMapsCompatible tile matrix). This was checked before anything was downloaded:
- **WMTS capabilities document:** the layer abstract says it is "released under Creative Commons Attribution 4.0 International License".
- **EOX licence page** (cloudless.eox.at/license-non-commercial; s2maps.eu now redirects to cloudless.eox.at): "For the year 2016, EOxCloudless is licensed under the Creative Commons Attribution 4.0 International License". The 2018 to 2025 layers are CC BY‑NC‑SA and were not used.
- **EOX FAQ** (cloudless.eox.at/documentation/faq): "Yes, the 2016 vintage is published under the CC BY 4.0 license. You may use this data as an embedded basemap in commercial mobile apps, B2B portals, video templates, and websites". The conditions are attribution, no SLA, a fair use policy, and not redistributing the raw tiles as a standalone GIS dataset.

FlyGuide embeds processed, cropped and graded composites inside the app, which fits that use. EOX's FAQ also allows the credit to sit behind a tap in compact mobile layouts.

**Attribution shown on the map** (bottom right, always visible):
- **Desktop:** the full text.
- **Phone:** "EOxCloudless 2016 · Natural Earth", with an info button that expands to the full text.

Full text:

> Imagery: EOxCloudless cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017), CC BY 4.0 · Borders: Natural Earth

The wording is EOX's current required text for the 2016 layer from their licence page. It differs from the brief's expected "Sentinel‑2 cloudless – s2maps.eu …", which predates EOX's rename to EOxCloudless.

**Download etiquette:** 326 tiles in total, at most 4 requests at a time, a project User‑Agent, and an on-disk cache in `.cache/tiles` (git ignored). Cached tiles are never downloaded again. `npm run fetch-map -- --offline` rebuilds from the cache.

**Borders and coastline:** Natural Earth 1:10m (public domain) via npm `world-atlas@2` `countries-10m.json` and `topojson-client`:
- South Africa's land border: a 1.25 px line at 70% white with a dark halo.
- Lesotho and eSwatini: dashed.
- Namibia, Botswana, Zimbabwe and Mozambique: thin.
- Coastline: 12% white, barely visible.

**Terrain shading (AWS Terrain Tiles): not added.** The host was reachable, but the Sentinel‑2 composites already show the Drakensberg escarpment and the Cape fold mountains with strong natural relief at z9 and z11 (see the region screenshots). I judged a hillshade blend not worth a third data source and credit. I did not build or test it.

**Pin research:** OpenStreetMap data (© OpenStreetMap contributors, ODbL) via the Nominatim search API, used only to check positions. No OSM data ships in the app.

## Venue coordinates

Pins mark the general area of each water, not access points. The app says so under the map.

Positions come from OpenStreetMap river and dam geometry, looked up through Nominatim. The Overpass API reset every TLS connection from this environment, so Nominatim was used instead. Web searches resolved the private waters and the reaches described in v19's `venueInfo`. Each pin was then checked visually against the z11 imagery.

| Region | # | Water | v19 (lon, lat) | v20 (lon, lat) | Source | Confidence |
|---|---|---|---|---|---|---|
| Dullstroom | 1 | Laverpa Dam | 30.02, −25.35 | 30.050, −25.368 | Private. Listings put it "7 km from Dullstroom" with no direction; v19's bearing kept, distance set to 7 km | Low |
| | 2 | Valley of the Rainbow | 30.20, −25.50 | 30.200, −25.500 | Private estate on Farm Witpoort, 18 to 25 km by gravel road; v19 estimate kept | Low |
| | 3 | Dullstroom Dam | 30.11, −25.43 | 30.1085, −25.4040 | OSM "Dullstroom Dorps Dam" (way 209731634) | High |
| | 4 | Spekboom River | 30.22, −25.25 | 30.4586, −24.9930 | OSM Spekboomrivier (relation 18505307). Lodges fishing it (Highland Run, Nooitgedacht) are northeast of Lydenburg, not south of it | Medium |
| KZN | 1 | Bushmans River | 29.66, −29.15 | 29.6830, −29.1645 | OSM Bushmans River (way 126061875), nearest point to v19 | Medium |
| | 2 | Mooi River | 29.72, −29.39 | 29.7327, −29.3817 | OSM Mooi River (relation 2778231), Kamberg reach | Medium |
| | 3 | Mkhomazi River | 29.70, −29.63 | 29.6917, −29.6019 | OSM Mkomazi (relation 2778230), upper river | Medium |
| | 4 | Midlands Stillwaters | 29.98, −29.37 | 29.98, −29.37 | A district of private dams (Nottingham Road and Rosetta); v19 kept | Low (area) |
| Eastern Cape | 1 | Sterkspruit River | 27.78, −30.86 | 27.8011, −30.9748 | OSM Sterkspruit (way 167787740), upstream of Moshesh's Ford where the WTA beats (Birkhall, Branksome) run | Medium |
| | 2 | Kraai River System | 27.60, −30.80 | 27.6555, −30.8508 | OSM Kraairivier (way 44354475), below the Bell and Sterkspruit confluence | Medium |
| | 3 | Langkloof River | 27.52, −31.04 | 27.5747, −30.9254 | OSM Langkloof River (way 87324638), north of Barkly East (v19 was off the river) | Medium |
| | 4 | Bokspruit / Upper streams | 28.03, −30.90 | 27.8604, −30.8801 | OSM Bokspruit (way 24333110) (v19 was 16 km east of the river) | Medium |
| Cape | 1 | Smalblaar River | 19.17, −33.69 | 19.2432, −33.7092 | The river beside the N1 below the Huguenot Tunnel. OSM names this reach Molenaarsrivier (way 849740163) and only the part near Rawsonville Smalblaarrivier; the pin sits on the N1 reach anglers call the Smalblaar | Medium |
| | 2 | Holsloot River | 19.30, −33.79 | 19.3107, −33.8008 | OSM Holsloot river (way 30039334), gorge below Stettynskloof Dam | Medium to high |
| | 3 | Elandspad River | 19.10, −33.74 | 19.155, −33.755 | Between OSM "Upper Elandspad" (way 1102627207) and the Molenaars confluence at the tunnel's east portal (v19 was west of the tunnel) | Medium |
| | 4 | Witte River | 19.11, −33.59 | 19.1240, −33.5942 | OSM Witte River (way 30180680), Bainskloof | High |

Towns were moved to OSM town centres. Each is within 1 km of v19.

The KZN region marker moved from (29.65, −29.35) to (29.80, −29.30) so it clears the Lesotho label on a phone. It marks the region, not a water.

## Map engine

- **Projection:** Web Mercator throughout. World units are z7 pixels, relative to the country image's corner, so transform values stay small.
- **World layer:** one `div` holding the 9 `<img>` layers and the border `<svg>`. It moves with a single `translate3d(...) scale(...)`. Markers are HTML and placed per frame with `translate3d`.
- **Borders:** `vector-effect: non-scaling-stroke` turned out to ignore the CSS transform on the parent layer, so borders scaled with zoom. Stroke widths and dashes are divided by the camera scale instead (`--k = 1/s`), and written only when the scale changes.
- **Levels of detail:**
  - Context images (z9) show above 1.8× the country fit; detail images (z11) above 4.5×.
  - An image shows only when it also intersects the view.
  - Each image is decoded (`img.decode()`) before a 250 ms crossfade.
  - A region's images decode on hover, focus or tap of that region. The rest preload during idle time.
- **Flight:** 760 ms (home 650), `cubic-bezier(0.77,0,0.175,1)`. Zoom interpolates geometrically, and the pan follows the change in visible width. Any drag or pinch cancels the flight and runs its completion. The app region switches only after landing.
- **No animation for reduced motion or keyboard:** under reduced motion, and for keyboard-triggered changes (Escape, or Enter on a marker), the camera jumps instead of flying.
- **Gestures:**
  - Mouse drag pans.
  - One-finger touch pans only when zoomed in (`touch-action: pan-y` at country view).
  - Two-finger pinch zooms about the midpoint; extra touches are ignored.
  - Ctrl or ⌘ plus wheel zooms; a plain wheel scrolls the page.
  - Double click zooms ×1.8.
  - Pointer moves are coalesced to one render per frame.
- **Clipping:** the stage uses `overflow: clip` plus a scroll reset. Hidden markers become `visibility: hidden` so Tab never reaches them.
- **Labels never clip or collide:**
  - Region chips and country labels are nudged to stay inside the stage and clear of the breadcrumb and zoom controls.
  - Under 640 px, the Cape chip opens upward, and Bloemfontein, Gqeberha, Mozambique and the ocean labels are hidden.
  - In region view, pins closer than 42 px are pushed apart by at most 26 px, labels flip above a pin they would cover, and town labels step aside for pins and map chrome.
- **Performance:** flights measured at a median 16.7 ms per frame in headless Chromium (software rendering), including at 4× CPU throttling, with occasional 33 to 50 ms frames. There is no backdrop-filter anywhere in the map.

## Deviations from the brief, and why

1. **Country imagery is taller** (lat −18 to −38 instead of −21.5 to −35.5). The phone map is 4:5, so at country fit it shows more north and south than the brief's box. Without the extra rows, Botswana and Zimbabwe would show as flat colour. Cost: about 80 KB.
2. **Region labels:** the brief's directions are kept on tablet and desktop (Dullstroom up, KZN up, Eastern Cape down, Cape right). Under 640 px Cape opens upward, because at 390 px "right" overlapped the Eastern Cape chip.
3. **Context labels hidden under 640 px:** Bloemfontein, Gqeberha and Mozambique, because they collided with region chips. The ocean labels were already hidden on phones in v19.
4. **Region framing on phones** uses padding of top 84, right 72, bottom 64 and left 56 instead of a flat 64, so pins never sit under the breadcrumb, zoom controls or credits. Desktop uses 96 as specified.
5. **Attribution wording** follows EOX's current licence page (see above).
6. **Terrain shading** not added (see above).
7. **Screenshots** load Google Fonts and Chart.js, so they show Geist. Every other test blocks all external network.

## Tests (Playwright, Chromium 390×844 and 1440×900, external network blocked)

`npx playwright test` reports **33 passed and 5 skipped**. The skips are tests that only apply to one viewport.

1. **No page errors:** an auto fixture fails any test with a page error or console error.
2. **Sandbox:** the built file loads through `srcdoc` into `<iframe sandbox="allow-scripts">`, and the storage shim is confirmed active. The flow:
   - Create an account. The plan screen shows once; start the trial, and `isProUser()` is true.
   - Catch log save and chat send (button and Enter) respond.
   - Sign out lands on the Sign in tab: plan screen hidden, password cleared, email prefilled.
   - A wrong password shows "Incorrect password. Please try again."
   - Signing in again shows no plan screen.
   - As a guest, the avatar opens sign in, and the Enter key signs in.
3. **Map:**
   - The country fit shows all of South Africa, with no clipped or overlapping region labels.
   - Each region flies in. The detail image reaches opacity 1 at ≥1 image pixel per CSS pixel, and the app region switches after landing.
   - Pin, detail card, Fish here, then Recommend with the venue set and the toast "Venue set to Mooi River".
   - A guest on Cape sees the lock banner, and Fish here opens the plan screen.
   - Tabbing through markers never scrolls the stage or clips the breadcrumb.
   - Escape returns home.
   - Ctrl+wheel zooms and a plain wheel doesn't. Double click zooms ×1.8. A CDP touch pinch zooms on phone.
4. **Recommend:** four cards for every venue of every region (26 venues), and the print card renders.
5. **Paywall:** a guest sees banners, locked content and PRO tags, and a locked region opens the plan screen. The owner gets everything.
6. **Catch log:** save, then compare, then delete through the confirm sheet. CSV export doesn't throw.
7. **Learn, hatch, rig, tippet:**
   - All 7 Learn tabs render, and accordions toggle with Enter and Space.
   - The hatch calendar has 12 months and one "now" row.
   - The rig result has 4 steps and no `.fly` class collision.
   - The tippet result is "6X tippet for a size 18 dry" in crystal water.
8. **Reduced motion:** the map jumps with no running flight, and no transform animations run.
9. **Layout:** no horizontal overflow at 390 px on any of the 10 panels.
10. **Budget:** the HTML and imagery limits hold. The only external sources are Google Fonts, cdnjs and the credit link, and there is no `<form>`.
11. **Screenshots:** every screen in the brief at both sizes. 45 files in `dist/screenshots/`; each was looked at, and the issues found were fixed.

## Known limitations (carried over)

- Accounts are stored in each browser (`fg_users`, base64 passwords). This is a demo, not secure auth; v19's notes on moving to Supabase are kept in the code.
- `FLYGUIDE_API_KEY` in client code would expose the key. Chat needs a small backend proxy before launch.
- Stripe links are placeholders, so payments are simulated until they're configured.
- In the claude.ai preview, live weather, Wikipedia photos, chat, CSV download and printing are blocked by the sandbox. They work on a normal host. In the preview, accounts last only for the visit.
- Venue pins mark general areas, not access points. Laverpa, Valley of the Rainbow and the Midlands stillwaters are private or general areas with low positional confidence.
- The service worker registration is kept from v19 and guarded. Browsers reject service workers from `blob:` URLs, so it is a no-op, as it was in v19.

## Environment notes

This cloud session's default network blocked the imagery hosts. A personal environment, **FlyGuide-V2**, was created with these hosts allowed: `tiles.maps.eox.at`, `s2maps.eu`, `cloudless.eox.at`, `eox.at`, `cdnjs.cloudflare.com`, Google Fonts, `s3.amazonaws.com`, `nominatim.openstreetmap.org` and `overpass-api.de`. Overpass still failed at the TLS handshake.

Raw tiles are not committed. The processed images in `assets/map/` are, so builds work offline.
