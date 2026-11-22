import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COUNTRIES, DEFAULT_NOTE, GLOBE_HEIGHT, PATH_BOTTOM, PATH_TOP, WORLD_VIEWBOX,
  countryNote, findCountry, labelPosition, normaliseName, project, sortedCountryNames
} from '../docs/world-map.js';

const world = JSON.parse(readFileSync(new URL('../docs/art/world-countries.json', import.meta.url), 'utf8'));

test('the map carries a large set of countries', () => {
  assert.ok(world.countries.length >= 150, `only ${world.countries.length} countries`);
  assert.equal(world.width, WORLD_VIEWBOX.width);
  assert.equal(world.height, WORLD_VIEWBOX.height);
});

test('every country has a name and a closed path', () => {
  for (const country of world.countries) {
    assert.ok(country.name, 'a country with no name');
    assert.ok(country.d.startsWith('M'), `${country.name} does not start with a move`);
    assert.ok(country.d.endsWith('Z'), `${country.name} is not closed`);
  }
});

test('country names are unique', () => {
  const names = world.countries.map(country => country.name);
  assert.equal(new Set(names).size, names.length, 'duplicate country names');
});

test('the projection puts the prime meridian in the middle and the poles at the edges', () => {
  const middle = project(0, 0);
  assert.equal(middle.x, WORLD_VIEWBOX.width / 2);
  // The equator sits at the centre of the globe, which is the centre of the
  // cropped band plus the offset of the band from the top of the globe.
  assert.equal(middle.y, GLOBE_HEIGHT / 2 - WORLD_VIEWBOX.top);
  const north = project(0, 90);
  const south = project(0, -90);
  assert.ok(north.y < middle.y, 'north is above south');
  assert.ok(south.y > middle.y);
  const west = project(-180, 0);
  const east = project(180, 0);
  assert.ok(west.x < east.x, 'west is left of east');
});

test('the viewBox starts at the top of the land so the frame hugs the map', () => {
  // The band is the land only: the top of the viewBox is where the northernmost
  // land sits and the bottom is where the southernmost land ends.
  assert.equal(WORLD_VIEWBOX.top, PATH_TOP);
  assert.equal(WORLD_VIEWBOX.height, PATH_BOTTOM - PATH_TOP);
  assert.ok(WORLD_VIEWBOX.top > 0, 'the band must not start at the top of the globe');
});

test('every label lands inside the viewBox', () => {
  for (const [name, entry] of Object.entries(COUNTRIES)) {
    const position = labelPosition(name);
    assert.ok(position, `${name} has no label position`);
    assert.ok(position.x >= 0 && position.x <= WORLD_VIEWBOX.width, `${name} label x ${position.x} outside`);
    assert.ok(position.y >= 0 && position.y <= WORLD_VIEWBOX.height, `${name} label y ${position.y} outside`);
  }
});

test('the labels cover the countries on the map', () => {
  const named = new Set(Object.keys(COUNTRIES));
  const missing = world.countries.filter(country => !named.has(country.name)).map(country => country.name);
  // A handful of tiny territories are left unnamed on purpose; anything more
  // than that means the label table has drifted from the data.
  assert.ok(missing.length < 25, `${missing.length} countries have no label: ${missing.slice(0, 12).join(', ')}`);
});

test('a country can be found by name whatever the case', () => {
  assert.equal(findCountry(world.countries, 'Japan')?.name, 'Japan');
  assert.equal(findCountry(world.countries, 'japan')?.name, 'Japan');
  assert.equal(findCountry(world.countries, 'JAPAN')?.name, 'Japan');
  assert.equal(findCountry(world.countries, '  Brazil  ')?.name, 'Brazil');
});

test('an unknown country is not found', () => {
  assert.equal(findCountry(world.countries, 'Atlantis'), null);
  assert.equal(findCountry(world.countries, ''), null);
  assert.equal(findCountry(world.countries, null), null);
});

test('apostrophes and brackets do not stop a match', () => {
  assert.equal(normaliseName("Côte d'Ivoire"), 'cote divoire');
  assert.equal(normaliseName('Guinea-Bissau'), 'guinea-bissau');
  assert.equal(normaliseName('Bolivia (Plurinational State of)'), 'bolivia');
});

test('a country note is either a real sentence or the generic one', () => {
  for (const name of Object.keys(COUNTRIES)) {
    const note = countryNote(name);
    assert.ok(note && note.length > 5, `${name} has no note`);
    assert.ok(note.endsWith('.'), `${name} note has no full stop`);
  }
  assert.equal(countryNote('Nowhere'), DEFAULT_NOTE);
});

test('the country names sort alphabetically for the dropdown', () => {
  const names = sortedCountryNames(world.countries);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted);
  assert.ok(names.includes('Bangladesh'));
  assert.ok(names.includes('Japan'));
});

test('the map has no location tracking in it', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const file of ['world-map.js', 'world-map-ui.js']) {
    const source = await readFile(new URL(`../docs/${file}`, import.meta.url), 'utf8');
    assert.ok(!source.includes('geolocation'), `${file} asks for the visitor's location`);
    assert.ok(!source.includes('getCurrentPosition'), `${file} asks for the visitor's location`);
  }
});
