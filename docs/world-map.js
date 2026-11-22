/**
 * The world map, as data.
 *
 * The country outlines live in docs/art/world-countries.json: Natural Earth
 * 110m admin-0 boundaries (public domain), projected to equirectangular
 * coordinates and stored as SVG path data. The site draws the paths directly,
 * so there is no map library, no tile service, and no request to any third
 * party at runtime.
 *
 * Nothing here reads or asks for the visitor's position. The map is a place to
 * look at countries, not a way to find out where someone is.
 */

/**
 * The viewBox the country paths were projected into.
 *
 * The coordinates are scaled by 100 so the rounding in the data file stays
 * exact and the paths never drift. The projection below divides it back out.
 */
export const PATH_SCALE = 100;

/**
 * The vertical band of the projection the land actually occupies.
 *
 * The paths were projected onto the whole globe, but the top and bottom of
 * that projection are empty ocean and ice. The viewBox starts at the top of
 * the land so the border sits tight around the map.
 */
export const PATH_TOP = 17.65 * PATH_SCALE;
export const PATH_BOTTOM = 404.48 * PATH_SCALE;

/**
 * The full height of the projection, pole to pole.
 *
 * Latitude 90 sits at y 0 and latitude -90 at y 500 in the unscaled
 * projection, so the whole globe is 500 units tall.
 */
export const GLOBE_HEIGHT = 500 * PATH_SCALE;

export const WORLD_VIEWBOX = {
  width: 1000 * PATH_SCALE,
  height: PATH_BOTTOM - PATH_TOP,
  top: PATH_TOP
};

/**
 * Where each country's label sits, as a [longitude, latitude] pair, with a
 * short note to show when the country is picked.
 *
 * The keys are the exact names used in the map data file, so a label always
 * lands on the shape it names. The positions are hand-placed rather than
 * computed, because the centroid of a country like Norway, Indonesia or France
 * lands in the sea.
 */
export const COUNTRIES = {
  Afghanistan: { at: [66, 34], note: 'Land of the Silk Road.' },
  Albania: { at: [20, 41], note: 'On the Adriatic.' },
  Algeria: { at: [2.5, 28], note: 'The largest country in Africa.' },
  Angola: { at: [17.5, -12], note: 'On the Atlantic, in south-central Africa.' },
  Argentina: { at: [-64.5, -35.5], note: 'The southern cone, and Patagonia.' },
  Armenia: { at: [45, 40.1], note: 'One of the oldest Christian countries.' },
  Australia: { at: [134, -25], note: 'The only country that is also a continent.' },
  Austria: { at: [14.1, 47.6], note: 'Music and mountains.' },
  Azerbaijan: { at: [47.5, 40.4], note: 'Where Europe meets Asia.' },
  Bangladesh: { at: [90.4, 23.7], note: 'The delta where the rivers meet the sea.' },
  Belarus: { at: [28, 53], note: 'Between Poland and Russia.' },
  Belgium: { at: [4.6, 50.6], note: 'Small, dense, and famous for chocolate.' },
  Belize: { at: [-88.9, 17.2], note: 'The only English-speaking country in Central America.' },
  Benin: { at: [2.5, 9.5], note: 'A narrow strip on the Gulf of Guinea.' },
  Bhutan: { at: [90.4, 27.5], note: 'Small, high, and measured in happiness.' },
  Bolivia: { at: [-63.5, -16.5], note: 'Two capital cities.' },
  'Bosnia and Herz.': { at: [17.8, 44], note: 'Where the Balkans meet the Adriatic.' },
  Botswana: { at: [24, -22.3], note: 'The Okavango Delta.' },
  Brazil: { at: [-52, -10], note: 'The largest country in South America.' },
  Brunei: { at: [114.7, 4.5], note: 'A small oil state on Borneo.' },
  Bulgaria: { at: [25, 43], note: 'On the Black Sea.' },
  'Burkina Faso': { at: [-1.6, 12.3], note: 'Landlocked between Mali and Ghana.' },
  Burundi: { at: [29.9, -3.4], note: 'Between Rwanda and Tanzania.' },
  Cambodia: { at: [104.9, 12.6], note: 'Home of the temples at Angkor.' },
  Cameroon: { at: [12.5, 5.5], note: 'On the Gulf of Guinea.' },
  Canada: { at: [-106, 57], note: 'The second largest country by area.' },
  'Central African Rep.': { at: [21, 6.6], note: 'The heart of the continent.' },
  Chad: { at: [18.5, 15.5], note: 'The Lake Chad basin.' },
  Chile: { at: [-71, -35], note: 'A long thin country down the Pacific.' },
  China: { at: [104.2, 35], note: 'The largest country on the map.' },
  Colombia: { at: [-73, 4.5], note: 'Caribbean, Andes, and two oceans.' },
  Congo: { at: [12.5, -4], note: 'On the Congo River, west of the rainforest.' },
  'North Korea': { at: [127, 40], note: 'A closed country on the peninsula.' },
  'Dem. Rep. Congo': { at: [23, -3], note: 'The Congo Basin rainforest.' },
  Djibouti: { at: [43, 11.8], note: 'At the mouth of the Red Sea.' },
  Denmark: { at: [9.5, 56], note: 'A kingdom of islands.' },
  'Dominican Rep.': { at: [-70.2, 18.8], note: 'Shares an island with Haiti.' },
  Ecuador: { at: [-78.2, -1.5], note: 'The equator runs through it.' },
  Egypt: { at: [30, 26.8], note: 'The Nile runs through it.' },
  'Eq. Guinea': { at: [10.5, 1.5], note: 'A small country on the Gulf of Guinea.' },
  Eritrea: { at: [39, 15.5], note: 'On the Red Sea, in the Horn of Africa.' },
  Estonia: { at: [25.5, 58.7], note: 'The northernmost of the Baltic states.' },
  eSwatini: { at: [31.5, -26.5], note: 'A small kingdom between South Africa and Mozambique.' },
  Ethiopia: { at: [39, 8.5], note: 'The source of the Blue Nile.' },
  'Falkland Is.': { at: [-59, -51.8], note: 'Islands off the Atlantic coast of Argentina.' },
  Fiji: { at: [178, -18], note: 'An archipelago in the South Pacific.' },
  Finland: { at: [26, 63], note: 'Land of a thousand lakes.' },
  France: { at: [2.5, 46.5], note: 'The hexagon.' },
  'Fr. S. Antarctic Lands': { at: [69, -49.5], note: 'French lands claimed in the far south.' },
  Gambia: { at: [-15.5, 13.4], note: 'A narrow country inside Senegal.' },
  Georgia: { at: [43.5, 42.3], note: 'Where the Black Sea meets the Caucasus.' },
  Germany: { at: [10.5, 51], note: 'Where the World Wide Web started.' },
  Ghana: { at: [-1.2, 7.9], note: 'A young and growing nation on the Gulf of Guinea.' },
  Greece: { at: [22.5, 39], note: 'The birthplace of the Olympic games.' },
  Greenland: { at: [-42, 74], note: 'The largest island on the map.' },
  Guatemala: { at: [-90.4, 15.7], note: 'Mayan ruins and volcanoes.' },
  Guinea: { at: [-11.5, 10.5], note: 'On the western bulge of Africa.' },
  'Guinea-Bissau': { at: [-15.5, 12], note: 'A small country on the Atlantic.' },
  Guyana: { at: [-58.9, 5.4], note: 'The only country where the equator runs through it.' },
  Haiti: { at: [-72.3, 19], note: 'The first free Black republic.' },
  Honduras: { at: [-86.5, 14.8], note: 'On the Central American isthmus.' },
  Hungary: { at: [19.5, 47.2], note: 'On the Danube.' },
  Iceland: { at: [-19, 64.9], note: 'Mid-Atlantic, volcanic and bright.' },
  India: { at: [78.9, 22], note: 'Where the code lab and the AI lab were written.' },
  Indonesia: { at: [117.4, -3.5], note: 'Seventeen thousand islands.' },
  Iran: { at: [53, 32.5], note: 'A country of poets and deserts.' },
  Iraq: { at: [43.5, 33], note: 'Between the Tigris and the Euphrates.' },
  Ireland: { at: [-8, 53.2], note: 'An island to the west of Britain.' },
  Israel: { at: [35, 31.5], note: 'A small country on the Mediterranean.' },
  Italy: { at: [12.5, 42.5], note: 'A boot in the Mediterranean.' },
  'Côte d\'Ivoire': { at: [-5.5, 7.5], note: 'Cocoa and music on the Gulf of Guinea.' },
  Jamaica: { at: [-77.3, 18.1], note: 'Reggae and the world’s fastest sprinters.' },
  Japan: { at: [138.3, 36.6], note: 'An archipelago of four islands.' },
  Jordan: { at: [36, 31], note: 'Petra, carved into the rock.' },
  Kazakhstan: { at: [67, 48.2], note: 'The largest landlocked country.' },
  Kenya: { at: [38, 0.2], note: 'The Great Rift Valley and the savanna.' },
  Kuwait: { at: [47.5, 29.3], note: 'A small country on the Gulf.' },
  Kyrgyzstan: { at: [74.5, 42.5], note: 'Landlocked, in the Tian Shan.' },
  Laos: { at: [102.5, 18.2], note: 'Landlocked between Thailand and Vietnam.' },
  Latvia: { at: [24.5, 56.9], note: 'One of the three Baltic states.' },
  Lebanon: { at: [35.8, 34], note: 'Cedar trees and a long coastline.' },
  Lesotho: { at: [28, -29.6], note: 'The only country entirely above 1000 m.' },
  Liberia: { at: [-9.4, 6.4], note: 'On the West African coast.' },
  Libya: { at: [17, 26.5], note: 'A coast on the Mediterranean and a Sahara inside.' },
  Lithuania: { at: [24, 55.3], note: 'The last of the Baltic states.' },
  Luxembourg: { at: [6.1, 49.8], note: 'The smallest country in the European Union.' },
  Madagascar: { at: [46.5, -19.5], note: 'An island off the east coast of Africa.' },
  Malawi: { at: [33.8, -13.3], note: 'Lake Malawi, the world’s ninth deepest lake.' },
  Malaysia: { at: [101.9, 4.2], note: 'A peninsula and a part of Borneo.' },
  Mali: { at: [-3.5, 17.5], note: 'A large country in the Sahel.' },
  Mauritania: { at: [-10.5, 20.5], note: 'On the western edge of the Sahara.' },
  Mexico: { at: [-102, 23.5], note: 'From the desert north to the tropics south.' },
  Moldova: { at: [28.5, 47], note: 'Between Romania and Ukraine.' },
  Mongolia: { at: [103, 46.6], note: 'The least densely populated country.' },
  Montenegro: { at: [19.3, 42.7], note: 'On the Adriatic coast.' },
  Morocco: { at: [-6, 31.8], note: 'Where the Sahara meets the Atlantic.' },
  Mozambique: { at: [35.5, -18], note: 'The Indian Ocean coast of south-east Africa.' },
  Myanmar: { at: [96, 21.9], note: 'Burma, on the Bay of Bengal.' },
  'N. Cyprus': { at: [33.4, 35.3], note: 'The northern part of the island of Cyprus.' },
  Namibia: { at: [17.5, -22.5], note: 'The oldest desert in the world.' },
  Nepal: { at: [84, 28.4], note: 'The Himalaya, south of the Tibetan plateau.' },
  Netherlands: { at: [5.5, 52.3], note: 'Low country, high engineering.' },
  'New Caledonia': { at: [165.5, -21.5], note: 'A French island in the Pacific.' },
  'New Zealand': { at: [172.5, -41.5], note: 'Two islands in the South Pacific.' },
  Nicaragua: { at: [-85, 13], note: 'Lakes and volcanoes on the isthmus.' },
  Niger: { at: [9, 17.5], note: 'On the southern edge of the Sahara.' },
  Nigeria: { at: [8, 9.5], note: 'The most populous country in Africa.' },
  'North Korea': { at: [127, 40], note: 'A closed country on the peninsula.' },
  'Dem. Rep. Congo': { at: [23, -3], note: 'The Congo Basin rainforest.' },
  Norway: { at: [9, 62], note: 'A long coast up the north.' },
  Oman: { at: [56, 21], note: 'On the Arabian Sea.' },
  Pakistan: { at: [69.3, 30.4], note: 'Neighbour to the west, across the border.' },
  Panama: { at: [-80.5, 8.5], note: 'The canal joins two oceans.' },
  'Papua New Guinea': { at: [144, -6], note: 'The eastern half of the island of New Guinea.' },
  Paraguay: { at: [-57.5, -23], note: 'Landlocked, with the Gran Chaco.' },
  Peru: { at: [-75.5, -9.5], note: 'Machu Picchu and the Andes.' },
  Philippines: { at: [122, 12], note: 'More than seven thousand islands.' },
  Poland: { at: [19.5, 52], note: 'Central Europe, between two seas.' },
  Portugal: { at: [-8.2, 39.6], note: 'The western edge of Europe.' },
  Qatar: { at: [51.2, 25.3], note: 'A peninsula in the Gulf.' },
  Romania: { at: [25, 46], note: 'Carpathians and a Black Sea coast.' },
  Russia: { at: [95, 62], note: 'The largest country by area.' },
  Rwanda: { at: [29.9, -1.9], note: 'The thousand hills.' },
  'Saudi Arabia': { at: [45, 24], note: 'The largest country without a river.' },
  Senegal: { at: [-14.5, 14.5], note: 'On the western bulge of Africa.' },
  Serbia: { at: [20.9, 44], note: 'Landlocked in the Balkans.' },
  'Sierra Leone': { at: [-11.8, 8.5], note: 'On the West African coast.' },
  Slovakia: { at: [19.5, 48.7], note: 'Carpathians and castles.' },
  Slovenia: { at: [14.8, 46.1], note: 'Alps, and a short Adriatic coast.' },
  'Solomon Is.': { at: [160, -9], note: 'An archipelago east of Papua New Guinea.' },
  Somalia: { at: [46, 5.5], note: 'The Horn of Africa.' },
  'South Africa': { at: [25, -29], note: 'Eleven official languages.' },
  'South Korea': { at: [127.8, 36.4], note: 'The fastest broadband in the world.' },
  'S. Sudan': { at: [30, 7], note: 'The newest country in the world.' },
  Spain: { at: [-3.7, 40.2], note: 'Most of the Iberian peninsula.' },
  'Sri Lanka': { at: [80.7, 7.8], note: 'An island off the southern tip of India.' },
  Sudan: { at: [30, 15], note: 'The Nile runs north through it.' },
  Suriname: { at: [-56, 4.1], note: 'On the coast of South America.' },
  Sweden: { at: [16, 61], note: 'The land of a thousand lakes.' },
  Switzerland: { at: [8.2, 46.8], note: 'Alps in the middle of Europe.' },
  Syria: { at: [38.5, 35], note: 'On the eastern Mediterranean.' },
  Taiwan: { at: [120.9, 23.7], note: 'An island off the coast of China.' },
  Tajikistan: { at: [71, 39], note: 'Landlocked, in the Pamirs.' },
  Tanzania: { at: [35, -6.5], note: 'Mount Kilimanjaro.' },
  Thailand: { at: [100.9, 15.5], note: 'The Land of Smiles.' },
  'Timor-Leste': { at: [125.5, -8.8], note: 'An island in the eastern archipelago.' },
  Togo: { at: [1, 8.2], note: 'A narrow country on the Gulf of Guinea.' },
  'Puerto Rico': { at: [-66.5, 18.2], note: 'A Caribbean island that is also a territory.' },
  'Trinidad and Tobago': { at: [-61, 11], note: 'Two islands off Venezuela.' },
  Tunisia: { at: [9.5, 34], note: 'On the Mediterranean, south of Sicily.' },
  Turkey: { at: [35, 39], note: 'Straddling two continents.' },
  Turkmenistan: { at: [59, 39], note: 'A country of desert and gas.' },
  Uganda: { at: [32.5, 1.3], note: 'The source of the Nile.' },
  Ukraine: { at: [31.5, 48.5], note: 'The largest country entirely in Europe.' },
  'United Arab Emirates': { at: [54, 24], note: 'Seven emirates on the Gulf.' },
  'United Kingdom': { at: [-2.5, 54], note: 'An island of four nations.' },
  'United States of America': { at: [-99, 39], note: 'Where open-source maintainers learn.' },
  Uruguay: { at: [-56, -32.5], note: 'A small country on the Río de la Plata.' },
  Uzbekistan: { at: [64, 41.4], note: 'The double-landlocked country.' },
  Vanuatu: { at: [167, -16], note: 'A chain of islands in the South Pacific.' },
  Venezuela: { at: [-66.5, 7.5], note: 'The northern edge of South America.' },
  Vietnam: { at: [107, 15.8], note: 'A country shaped like an S.' },
  'W. Sahara': { at: [-13, 24.5], note: 'A disputed territory on the Atlantic.' },
  Bahamas: { at: [-77.5, 25], note: 'An island chain in the Atlantic.' },
  'Costa Rica': { at: [-84, 9.8], note: 'A country with no army.' },
  Croatia: { at: [16.5, 45.2], note: 'A thousand islands on the Adriatic.' },
  Cuba: { at: [-79.5, 21.5], note: 'The largest Caribbean island.' },
  Cyprus: { at: [33.4, 35.1], note: 'An island split between two peoples.' },
  Czechia: { at: [15.5, 49.8], note: 'Castles and the Charles Bridge.' },
  'El Salvador': { at: [-88.9, 13.8], note: 'The smallest country in mainland America.' },
  Gabon: { at: [11.5, -0.5], note: 'On the Atlantic, in the Congo Basin.' },
  Kosovo: { at: [21, 42.6], note: 'Landlocked in the Balkans.' },
  'North Macedonia': { at: [21.5, 41.5], note: 'Under the old name of Macedonia.' },
  Palestine: { at: [35.2, 31.9], note: 'Between the Jordan and the Mediterranean.' },
  Somaliland: { at: [46, 8.5], note: 'A self-declared state in the Horn of Africa.' },
  Yemen: { at: [47, 15.5], note: 'On the southern Red Sea.' },
  Zambia: { at: [27.8, -13.5], note: 'Landlocked in south-central Africa.' },
  Zimbabwe: { at: [30, -19], note: 'Landlocked, with Victoria Falls.' }
};

/** The note shown for a country that has no hand-written one. */
export const DEFAULT_NOTE = 'On the map, drawn from its real border coordinates.';

/**
 * Projects a longitude and latitude into the map's viewBox.
 *
 * The country outlines were projected without a latitude correction, so this
 * must match that exactly or the label drifts off its country.
 */
export function project(lon, lat) {
  return {
    x: Math.round(((lon + 180) / 360) * WORLD_VIEWBOX.width),
    y: Math.round(((90 - lat) / 180) * GLOBE_HEIGHT) - PATH_TOP
  };
}

/** The label position for a country, in viewBox coordinates. */
export function labelPosition(name) {
  const entry = COUNTRIES[name];
  if (!entry) return null;
  return project(entry.at[0], entry.at[1]);
}

/** The note for a country, or the generic one. */
export function countryNote(name) {
  const entry = COUNTRIES[name];
  return entry?.note || DEFAULT_NOTE;
}

/**
 * Strips the parts of a country name that make matching awkward: capital
 * letters, accents, apostrophes, and any bracketed qualifier.
 */
export function normaliseName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim();
}

/**
 * Finds a country by name, ignoring case and the differences between the
 * spellings the map uses and the ones people type.
 */
export function findCountry(countries, query) {
  if (!query) return null;
  const wanted = normaliseName(query);
  return countries.find(country => normaliseName(country.name) === wanted) || null;
}

/** The country names, sorted the way a dropdown should list them. */
export function sortedCountryNames(countries) {
  return countries.map(country => country.name).sort((a, b) => a.localeCompare(b));
}
