/**
 * The world map, wired into the page.
 *
 * The pure geometry lives in world-map.js so it can be tested without a DOM.
 * This file owns everything that touches the document.
 *
 * There is no location request anywhere in here. The map is browsed by picking
 * a country from the dropdown; nothing asks the browser where the visitor is.
 */
import { WORLD_VIEWBOX, countryNote, findCountry, labelPosition } from './world-map.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function element(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function initWorldMap(root = document) {
  const host = root.querySelector('#world-map');
  if (!host || host.dataset.worldMapReady) return null;
  host.dataset.worldMapReady = 'true';

  const status = root.querySelector('#world-map-status');
  const select = root.querySelector('#world-map-country');
  const list = root.querySelector('#world-map-list');
  const svg = element('svg', {
    // The viewBox starts at the top of the land, not at the top of the
    // projection, so the frame hugs the map instead of leaving a band of empty
    // grid above and below it.
    viewBox: `0 ${WORLD_VIEWBOX.top} ${WORLD_VIEWBOX.width} ${WORLD_VIEWBOX.height}`,
    class: 'world-map-svg',
    role: 'img',
    'aria-label': 'A world map with every country outlined. Choose a country from the list to highlight it.'
  });

  const grid = element('g', { class: 'world-map-grid', 'aria-hidden': 'true' });
  const shapes = element('g', { class: 'world-map-shapes' });
  const marker = element('g', { class: 'world-map-marker', 'aria-hidden': 'true' });
  svg.append(grid, shapes, marker);
  host.append(svg);

  let countries = [];

  function drawGrid() {
    const top = WORLD_VIEWBOX.top;
    const bottom = top + WORLD_VIEWBOX.height;
    for (let x = 0; x <= WORLD_VIEWBOX.width; x += 5000) {
      grid.append(element('line', { x1: x, y1: top, x2: x, y2: bottom }));
    }
    for (let y = top; y <= bottom; y += 5000) {
      grid.append(element('line', { x1: 0, y1: y, x2: WORLD_VIEWBOX.width, y2: y }));
    }
  }

  function clearMarker() {
    marker.replaceChildren();
  }

  function selectCountry(name) {
    const country = findCountry(countries, name);
    if (!country) return;
    for (const path of shapes.querySelectorAll('path')) {
      const active = path.dataset.country === country.name;
      path.classList.toggle('is-selected', active);
      path.setAttribute('aria-current', active ? 'true' : 'false');
    }
    clearMarker();
    const position = labelPosition(country.name);
    if (position) {
      marker.append(
        element('circle', { class: 'world-map-marker-halo', cx: position.x, cy: position.y, r: 14 }),
        element('circle', { class: 'world-map-marker-dot', cx: position.x, cy: position.y, r: 5 })
      );
    }
    if (status) status.textContent = `${country.flag || '🌐'} ${country.name} — ${countryNote(country.name)}`;
    if (list) {
      list.querySelectorAll('li').forEach(item => {
        const active = item.dataset.country === country.name;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-current', active ? 'true' : 'false');
        // The list scrolls, so bring the chosen country into view.
        if (active) item.scrollIntoView({ block: 'nearest' });
      });
    }
    if (select && select.value !== country.name) select.value = country.name;
  }

  function renderList() {
    if (!list) return;
    list.replaceChildren();
    for (const country of countries) {
      const item = document.createElement('li');
      item.dataset.country = country.name;
      item.setAttribute('aria-current', 'false');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'world-map-country-button';
      const flag = document.createElement('span');
      flag.className = 'world-map-flag';
      flag.textContent = country.flag || '🌐';
      flag.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'world-map-country-name';
      name.textContent = country.name;
      button.append(flag, name);
      button.addEventListener('click', () => selectCountry(country.name));
      item.append(button);
      list.append(item);
    }
  }

  function renderSelect() {
    if (!select) return;
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a country…';
    select.append(placeholder);
    for (const country of countries) {
      const option = document.createElement('option');
      option.value = country.name;
      option.textContent = `${country.flag || '🌐'} ${country.name}`;
      select.append(option);
    }
    select.addEventListener('change', () => {
      if (select.value) selectCountry(select.value);
    });
  }

  function load() {
    if (status) status.textContent = 'Drawing the world…';
    return fetch('./art/world-countries.json', { cache: 'force-cache' })
      .then(response => { if (!response.ok) throw new Error('map'); return response.json(); })
      .then(data => {
        countries = Array.isArray(data?.countries) ? data.countries : [];
        if (!countries.length) throw new Error('map');
        for (const country of countries) {
          const path = element('path', { class: 'world-map-shape', d: country.d });
          path.dataset.country = country.name;
          path.setAttribute('aria-current', 'false');
          path.addEventListener('click', () => selectCountry(country.name));
          shapes.append(path);
        }
        drawGrid();
        renderSelect();
        renderList();
        if (status) {
          status.textContent = `${countries.length} countries, drawn from their real border coordinates. Pick one to look closer.`;
        }
      })
      .catch(() => {
        shapes.replaceChildren();
        if (status) status.textContent = 'The map could not be loaded. The country list below still works.';
      });
  }

  return {
    /** Highlights a country by name. */
    select: selectCountry,
    ready: load()
  };
}
