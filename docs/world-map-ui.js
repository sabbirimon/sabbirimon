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

import {choices} from './site-choices.js';
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

  let countries = [],countryCode='',wantsCountry=false;
  const note=root.querySelector('#map-local-note'),search=root.querySelector('#map-search');
  function findLocal(){
    const flag=Array.from(countryCode,c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('');
    const match=countries.find(country=>country.flag===flag);
    if(match){selectCountry(match.name);note.textContent='Approximate country from your network: '+match.name+'.';wantsCountry=false;}
    else note.textContent=countryCode?'This outline is unavailable. Use the country picker.':'Country estimate unavailable or loading. You can use the country picker.';
  }
  root.addEventListener('imon:country',event=>{countryCode=event.detail||'';if(!countryCode){note.textContent='';return;}if(wantsCountry)findLocal();});
  root.querySelector('#map-locate').onclick=()=>{wantsCountry=true;if(!choices()?.weather){root.dispatchEvent(new Event('imon:open-privacy'));note.textContent='Enable approximate location or pick a country below.';return;}findLocal();};
  root.querySelector('#map-surprise').onclick=()=>{if(countries.length)selectCountry(countries[Math.floor(Math.random()*countries.length)].name);};
  search.oninput=()=>{let matches=0;for(const item of list.children){item.hidden=!item.dataset.country.toLowerCase().includes(search.value.trim().toLowerCase());if(!item.hidden)matches++;}note.textContent=matches+' matching countries';};


  const zoom=root.querySelector('#map-zoom'),worldBox=svg.getAttribute('viewBox');
  let selectedPath=null,zoomed=false;
  function zoomCountry(){
    if(!selectedPath)return;
    zoomed=!zoomed;zoom.textContent=zoomed?'Show full map':'Zoom to country';
    if(!zoomed){svg.setAttribute('viewBox',worldBox);return;}
    const b=selectedPath.getBBox(),w=Math.min(WORLD_VIEWBOX.width,Math.max(3200,b.width*1.55,b.height*2.8)),h=w*WORLD_VIEWBOX.height/WORLD_VIEWBOX.width;
    svg.setAttribute('viewBox',[Math.max(0,Math.min(WORLD_VIEWBOX.width-w,b.x+b.width/2-w/2)),Math.max(WORLD_VIEWBOX.top,Math.min(WORLD_VIEWBOX.top+WORLD_VIEWBOX.height-h,b.y+b.height/2-h/2)),w,h].join(' '));
  }
  zoom.onclick=zoomCountry;
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
    root.dispatchEvent(new CustomEvent('imon:metric',{detail:'map_explore'}));
    for (const path of shapes.querySelectorAll('path')) {
      const active = path.dataset.country === country.name;
      if(active){selectedPath=path;zoom.disabled=false;}
      path.classList.toggle('is-selected', active);
      path.setAttribute('aria-current', active ? 'true' : 'false');
    }
    if(zoomed){zoomed=false;zoomCountry();}
    clearMarker();
    const position = labelPosition(country.name);
    if (position) {
      marker.append(
        element('circle', { class: 'world-map-marker-halo', cx: position.x, cy: position.y, r: 400 }),
        element('circle', { class: 'world-map-marker-dot', cx: position.x, cy: position.y, r: 170 })
      );
    }
    if (status) status.textContent = `${country.flag || '🌐'} ${country.name} — ${countryNote(country.name)}`;
    if (list) {
      list.querySelectorAll('li').forEach(item => {
        const active = item.dataset.country === country.name;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-current', active ? 'true' : 'false');
        // The list scrolls, so bring the chosen country into view.
        if(active&&!item.hidden)list.scrollTop+=item.getBoundingClientRect().top-list.getBoundingClientRect().top-list.clientHeight/2;
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
        root.querySelector('[data-outline-count]').textContent=countries.length;
        if(wantsCountry&&countryCode)findLocal();
        drawGrid();
        renderSelect();
        renderList();
        if (status) {
          status.textContent = `${countries.length} countries, drawn from their real border coordinates. Pick one to look closer.`;
        }
      })
      .catch(() => {
        shapes.replaceChildren();
        if (status) status.textContent = 'The map could not be loaded. Reload the page to try again.';
      });
  }

  return {
    /** Highlights a country by name. */
    select: selectCountry,
    ready: load()
  };
}
