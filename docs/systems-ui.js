import {showTopicCheck} from './topic-check.js';
import {chapterPlacement,courseModules,levels} from './learning-modules.js';
import {scenarios} from './systems-models.js';
import {scheduleProgressSync} from './auth.js';
import {playSound} from './audio.js';
const $ = selector => document.querySelector(selector);
const select = $('#scenario'), range = $('#setting'), number = $('#setting-number'), answer = $('#prediction'), feedback = $('#feedback');
const moduleSelect = $('#system-module'), levelSelect = $('#system-level');
const placements = new Map(scenarios.map(item=>[item.id,chapterPlacement('systems',item.chapter)]));
for (const name of courseModules('systems',scenarios.map(item=>item.chapter))) moduleSelect.add(new Option(name,name));
for (const level of levels) levelSelect.add(new Option(level,level));

function populateScenarios() {
  const groups = new Map();
  select.replaceChildren();
  const available = new Set();
  for (const item of scenarios) {
    const {module,level} = placements.get(item.id);
    if (moduleSelect.value && module !== moduleSelect.value) continue;
    available.add(level);
    if (levelSelect.value && level !== levelSelect.value) continue;
    if (!groups.has(item.chapter)) {
      const group = document.createElement('optgroup');
      group.label = item.chapter;
      groups.set(item.chapter,group);
      select.append(group);
    }
    groups.get(item.chapter).append(new Option(item.title,item.id));
  }
  for (const option of levelSelect.options) option.disabled = Boolean(option.value && !available.has(option.value));
}

populateScenarios();
let scenario;
function draw(value) {
  number.value = value;
  range.value = value;
  const graph = $('#model');
  graph.replaceChildren();
  const values = scenario.visual(value);
  graph.classList.toggle('wave',typeof values[0] === 'number');
  for (const state of values) {
    const cell = document.createElement('i');
    if (typeof state === 'number') {
      cell.style.height = Math.max(2,Math.abs(state)*47) + '%';
      cell.style.top = (state > 0 ? 50-state*47 : 50) + '%';
    } else cell.className = state;
    graph.append(cell);
  }
  graph.setAttribute('aria-label',scenario.control + ': ' + value + '. ' + scenario.legend + (scenario.id === 'signals-lsb' ? ' Binary ' + Number(value).toString(2).padStart(8,'0') : ''));
  $('#meter').textContent = '';
  feedback.textContent = '';
}
function open(id) {
  scenario = scenarios.find(item=>item.id===id) || scenarios[0];
  if (![...select.options].some(option=>option.value===scenario.id)) {
    moduleSelect.value = '';
    levelSelect.value = '';
    populateScenarios();
  }
  select.value = scenario.id;
  showTopicCheck(document.querySelector('[data-topic-check]'),'systems',scenario.chapter,scenario.id);
  $('h1').textContent = scenario.title;
  const placement = placements.get(scenario.id);
  $('#chapter').textContent = [placement.module,scenario.chapter,placement.level].join(' · ');
  $('#brief').textContent = scenario.brief;
  $('#study').textContent = scenario.study;
  $('#formula').textContent = scenario.formula;
  $('#control').textContent = scenario.control;
  $('#legend').textContent = scenario.legend;
  $('#target').textContent = 'Set the control to ' + scenario.target + ', then predict the result in ' + scenario.unit + '.';
  $('#unit').textContent = scenario.unit;
  for (const input of [range,number]) {input.min=scenario.min;input.max=scenario.max;}
  answer.value='';
  $('#guide').open=false;
  draw(scenario.initial);
}
select.onchange = () => {
  const url = new URL(location.href);
  url.searchParams.set('exercise',select.value);
  history.pushState(null,'',url);
  open(select.value);
};
function narrowScenarios() {
  populateScenarios();
  if ([...select.options].some(option=>option.value===scenario.id)) select.value = scenario.id;
  else if (select.options.length) select.onchange();
}
moduleSelect.onchange = () => { levelSelect.value=''; narrowScenarios(); };
levelSelect.onchange = narrowScenarios;
window.addEventListener('popstate',()=>open(new URLSearchParams(location.search).get('exercise')));
range.oninput = () => draw(Number(range.value));
number.oninput = () => { if(number.value!=='' && number.validity.valid) draw(number.valueAsNumber); };
$('#measure').onclick = () => { $('#meter').textContent = Number(scenario.value(Number(range.value)).toFixed(3)) + ' ' + scenario.unit; };
$('#check').onsubmit = event => {
  event.preventDefault();
  if (!number.validity.valid || number.valueAsNumber !== scenario.target || Number(range.value) !== scenario.target) {
    feedback.textContent = 'First set ' + scenario.control.toLowerCase() + ' to ' + scenario.target + '.';
    return;
  }
  const expected = scenario.value(scenario.target);
  if (Math.abs(answer.valueAsNumber-expected) > .001) {
    feedback.textContent = 'Try again. ' + scenario.formula + '. Use Measure to inspect the model.';
    playSound('retry'); return;
  }
  try {
    const key='imon-systems-v1',saved=JSON.parse(localStorage.getItem(key)||'{}');
    const solved=new Set(Array.isArray(saved?.solved)?saved.solved:[]);
    const first=!solved.has(scenario.id);
    solved.add(scenario.id);
    localStorage.setItem(key,JSON.stringify({solved:[...solved],xp:solved.size*25}));
    feedback.textContent=first ? 'Correct · 25 XP earned.' : 'Correct · previously completed.';
    scheduleProgressSync();
    document.dispatchEvent(new Event('imon:lesson-saved'));
  } catch { feedback.textContent='Correct. Device storage is unavailable for this session.'; }
  playSound('correct');
};
open(new URLSearchParams(location.search).get('exercise'));
