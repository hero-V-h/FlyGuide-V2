// Map geography for the satellite map (lon, lat, WGS84).
// Venue pins mark the general area of each water, not access points.
// Positions were checked against OpenStreetMap river geometry (via Nominatim)
// and the Sentinel-2 imagery; see REPORT.md for sources and confidence.
// Venue order matches each region's venueInfo order (pin number = index + 1).

var REGION_META = {
  dullstroom: { short: 'Dullstroom', sub: 'Mpumalanga Highlands', c: [30.10, -25.42], dir: 'up',
    venues: [
      { name: 'Laverpa Dam', val: 'laverpa', p: [30.050, -25.368] },
      { name: 'Valley of the Rainbow', val: 'rainbow_valley', p: [30.200, -25.500] },
      { name: 'Dullstroom Dam', val: 'dullstroom_dam', p: [30.1085, -25.4040] },
      { name: 'Spekboom River', val: 'spekboom', p: [30.4586, -24.9930] }],
    towns: [{ n: 'Mashishing', p: [30.459, -25.099] }, { n: 'Belfast', p: [30.033, -25.688] }] },
  kzn: { short: 'KZN Drakensberg', sub: 'KwaZulu-Natal Midlands', c: [29.80, -29.30], dir: 'up',
    venues: [
      { name: 'Bushmans River', val: 'bushmans', p: [29.6830, -29.1645] },
      { name: 'Mooi River', val: 'mooi', p: [29.7327, -29.3817] },
      { name: 'Mkhomazi River', val: 'mkhomazi', p: [29.6917, -29.6019] },
      { name: 'Midlands Stillwaters', val: 'stillwater', p: [29.98, -29.37] }],
    towns: [{ n: 'Estcourt', p: [29.869, -29.010] }, { n: 'Underberg', p: [29.494, -29.792] }, { n: 'Mooi River', p: [29.996, -29.206] }] },
  ec: { short: 'Eastern Cape', sub: 'Rhodes and Barkly East', c: [27.80, -30.85], dir: 'down',
    venues: [
      { name: 'Sterkspruit River', val: 'sterkspruit', p: [27.8011, -30.9748] },
      { name: 'Kraai River System', val: 'bell_kraai', p: [27.6555, -30.8508] },
      { name: 'Langkloof River', val: 'langkloof', p: [27.5747, -30.9254] },
      { name: 'Bokspruit / Upper streams', val: 'bokspruit', p: [27.8604, -30.8801] }],
    towns: [{ n: 'Rhodes', p: [27.9645, -30.7952] }, { n: 'Barkly East', p: [27.5957, -30.9683] }, { n: 'Lady Grey', p: [27.2156, -30.7119] }] },
  cape: { short: 'Cape Streams', sub: 'Western Cape', c: [19.20, -33.70], dir: 'right', dirSm: 'up', // up under 640 px, clear of the Eastern Cape label
    venues: [
      { name: 'Smalblaar River', val: 'smalblaar', p: [19.2432, -33.7092] },
      { name: 'Holsloot River', val: 'holsloot', p: [19.3107, -33.8008] },
      { name: 'Elandspad River', val: 'elandspad', p: [19.155, -33.755] },
      { name: 'Witte River', val: 'witte', p: [19.1240, -33.5942] }],
    towns: [{ n: 'Rawsonville', p: [19.315, -33.685] }, { n: 'Wellington', p: [19.011, -33.643] }, { n: 'Worcester', p: [19.446, -33.646] }] }
};
var REGION_ORDER = ['dullstroom', 'kzn', 'ec', 'cape'];
// m: hidden under 640 px, where they would collide with the region labels
var CITIES = [
  { n: 'Johannesburg', p: [28.05, -26.20] }, { n: 'Durban', p: [31.02, -29.86] }, { n: 'Gqeberha', p: [25.60, -33.96], m: 1 },
  { n: 'Bloemfontein', p: [26.21, -29.12], m: 1 }, { n: 'Upington', p: [21.25, -28.45] }];
// a: shows at every zoom; w: water label; m: hidden under 640 px (they collide on a phone)
var MAP_LABELS = [
  { n: 'Lesotho', p: [27.85, -29.62], a: 1 }, { n: 'Botswana', p: [23.6, -23.4] }, { n: 'Namibia', p: [17.6, -25.2] },
  { n: 'Mozambique', p: [33.4, -23.4], m: 1 }, { n: 'Indian Ocean', p: [31.4, -33.4], w: 1 }, { n: 'Atlantic Ocean', p: [16.7, -32.9], w: 1 }];
// Country view framing and imagery extent
var COUNTRY_FIT = { lon0: 16.3, lat0: -22.0, lon1: 33.0, lat1: -35.0 };
var IMAGERY_BOUNDS = { lon0: 15.5, lat0: -18.0, lon1: 33.5, lat1: -38.0 }; // wider than the country fit so a 4:5 phone frame never runs off the imagery
