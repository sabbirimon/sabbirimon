import {playSound} from './audio.js';

// One key per find lets independent tabs collect different coins without losing either.
const trails=[
  ['world','Valley cartographer','Compass badge',[
    ['atlas','./#map','Look beside the caption on the world atlas.'],
    ['river','./?scene=riverbend-mills','Visit Riverbend Mills and collect a landscape coin.'],
    ['sky','./#pixel-world','In World Studio, change the speed of the wind farm.'],
    ['valley','./#pixel-world','Gather all five gold coins from one landscape.']]],
  ['study','Workbench wanderer','Notebook badge',[
    ['catalog','courses.html#ai','Unfold the first chapter of the AI catalog and search its margins.'],
    ['markup','lab.html','Open the worked example next to your first HTML workbench.'],
    ['models','ai-lab.html','A tiny circuit hides beside the AI chapter notes.'],
    ['signal','circuits.html','Look for a glint inside the worked electronics example.']]],
  ['scholar','Exam keeper','Scholar badge',[
    ['chapter','courses.html#circuits','Check the final chapter in the electronics catalog.'],
    ['quiz-code','lab.html#course-quiz','Earn at least three correct answers on the Code Lab quiz.'],
    ['quiz-ai','ai-lab.html#course-quiz','Earn at least three correct answers on the AI Lab quiz.'],
    ['quiz-circuits','circuits.html#course-quiz','Earn at least three correct answers on the Circuits quiz.']]],
  ['builder','Circuit courier','Relay badge',[
    ['meshlit','meshlit/','Search below the Android builds in the Meshlit workshop.'],
    ['hyperl','hyperl/','Find the coin beside the HyperL verification example.'],
    ['guide','gridworks/','Open the city guide and search its pages.'],
    ['power','gridworks/','Switch the city map to its power overlay.']]],
  ['studio','Wave detective','Wave badge',[
    ['heard','tools/#sounds','Play the harbor beacon in the sound library.'],
    ['address','tools/#url','Inspect a web address that carries a query parameter.'],
    ['glyph','tools/#text','Count a piece of text containing an emoji.'],
    ['contrast','tools/#colour','Search the color workbench for a mint-edged coin.']]],
  ['arcade','Cartridge collector','Arcade badge',[
    ['cabinet','arcade/','A token rests beside the arcade control guide.'],
    ['runner','arcade/?game=runner','Start a run in Signal Runner.'],
    ['breaker','arcade/?game=breaker','Start a round of Prism Breaker.'],
    ['space','arcade/?game=space','Launch Star Patrol.']]]
];
const home=new URL('./',import.meta.url);
const page=document.querySelector('script[data-quest-page]').dataset.questPage;
const hiddenCoins={
  home:[['atlas','.world-map-caption']],
  courses:[['catalog','#ai details:first-of-type'],['chapter','#circuits details:last-of-type']],
  code:[['markup','.lab-example']],
  ai:[['models','.study-chapter']],
  circuits:[['signal','.lab-example']],
  meshlit:[['meshlit','main .links:last-of-type']],
  hyperl:[['hyperl','main pre']],
  gridworks:[['guide','#help-dialog article:last-of-type']],
  tools:[['contrast','#panel-colour']],
  arcade:[['cabinet','#help']]
};
const prefix='imon-mystery-coin-v1-';
const memory=new Set();
const known=new Map(trails.flatMap(trail=>trail[3].map(step=>[step[0],trail])));
const saved=id=>{try{return memory.has(id)||localStorage.getItem(prefix+id)==='1';}catch{return memory.has(id);}};
const journal=document.querySelector('[data-quest-journal]');
const collected=trail=>trail[3].filter(([id])=>saved(id)).length;
function render(){
  for(const button of document.querySelectorAll('[data-find-coin]')){
    const found=saved(button.dataset.findCoin);
    button.disabled=found;button.title=found?'Mystery coin collected':'Collect mystery coin';
    button.setAttribute('aria-label',button.title);
  }
  if(!journal)return;
  let total=0;
  for(const [id,,badge,steps] of trails){
    const card=journal.querySelector('#trail-'+id);
    const count=steps.filter(([key])=>saved(key)).length;total+=count;
    card.querySelector('progress').value=count;
    card.querySelector('output').textContent=count===steps.length?badge+' earned':count+' / '+steps.length+' coins';
    card.dataset.complete=String(count===steps.length);
    const clue=card.querySelector('[data-clue]'),next=steps.find(([key])=>!saved(key));
    if(next){clue.textContent=next[2];clue.href=new URL(next[1],home).href;clue.hidden=false;}else clue.hidden=true;
  }
  journal.querySelector('[data-total]').textContent=total+' of '+known.size+' mystery coins found';
}
const notice=document.createElement('aside');
notice.className='quest-find-notice';notice.hidden=true;
const message=document.createElement('span');message.setAttribute('role','status');
const journalLink=document.createElement('a');journalLink.href=new URL('quests.html',home).href;journalLink.textContent='Quest journal';
const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label','Dismiss coin notification');dismiss.onclick=()=>notice.hidden=true;
notice.append(message,journalLink,dismiss);document.body.append(notice);
let hideTimer;
function award(id){
  const trail=known.get(id);if(!trail||saved(id))return;
  memory.add(id);try{localStorage.setItem(prefix+id,'1');}catch{}
  const count=collected(trail),complete=count===trail[3].length;
  if(complete)document.dispatchEvent(new CustomEvent('imon:metric',{detail:'quest_complete'}));
  playSound(complete?'win':'coin');render();
  message.textContent=complete?trail[2]+' earned!':'Mystery coin · '+trail[1]+' '+count+'/'+trail[3].length;
  journalLink.href=new URL('quests.html#trail-'+trail[0],home).href;
  notice.hidden=false;clearTimeout(hideTimer);hideTimer=setTimeout(()=>notice.hidden=true,6500);
}
for(const [id,selector] of hiddenCoins[page]||[]){
  const host=document.querySelector(selector);if(!host)continue;
  const button=document.createElement('button');button.type='button';button.className='mystery-coin';button.dataset.findCoin=id;button.innerHTML='<span aria-hidden="true"></span>';
  button.onclick=()=>award(id);
  if(host.id==='world-map-status')host.parentElement.querySelector('.world-map-picker').append(button);
  else if(['PRE','P'].includes(host.tagName))host.after(button);else host.append(button);
}
if(page==='gridworks')document.querySelector('[data-overlay=power]')?.addEventListener('click',()=>award('power'));
document.addEventListener('imon:quest-find',event=>award(event.detail));
window.addEventListener('storage',render);window.addEventListener('pageshow',render);
render();
