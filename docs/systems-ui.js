import {scenarios} from './systems-models.js';
import {scheduleProgressSync} from './auth.js';
import {playSound} from './audio.js';
const $ = selector => document.querySelector(selector);
const select = $('#scenario'), range = $('#setting'), number = $('#setting-number'), answer = $('#prediction'), feedback = $('#feedback');
const groups = new Map();
for (const scenario of scenarios) {
  if (!groups.has(scenario.chapter)) {
    const group = document.createElement('optgroup');
    group.label = scenario.chapter;
    groups.set(scenario.chapter,group);
    select.append(group);
  }
  groups.get(scenario.chapter).append(new Option(scenario.title,scenario.id));
}
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
  select.value = scenario.id;
  $('h1').textContent = scenario.title;
  $('#chapter').textContent = scenario.chapter;
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
