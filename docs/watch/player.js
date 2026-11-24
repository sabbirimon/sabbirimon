import {parseVideo} from './video.js';
const get = id => document.getElementById(id);
const input=get('video-url'), status=get('status');

function closePlayer() {
  get('screen').querySelector('iframe')?.remove();
  get('cover').hidden=false;
  get('actions').hidden=get('fallback').hidden=true;
  get('external').removeAttribute('href');
}
get('choose').addEventListener('submit', event => {
  event.preventDefault();
  const video=parseVideo(input.value);
  if (!video) {
    status.textContent='Enter a full YouTube or Bilibili video link, or a Bilibili BV or av number.';
    input.setAttribute('aria-invalid','true'); input.focus(); return;
  }
  closePlayer(); input.removeAttribute('aria-invalid');
  const frame=document.createElement('iframe');
  frame.title=video.provider+' video player';
  frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
  frame.allowFullscreen=true; frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.src=video.embed;
  get('cover').hidden=true; get('screen').append(frame);
  get('external').href=video.original; get('external').textContent='Watch on '+video.provider+' ↗';
  get('actions').hidden=get('fallback').hidden=false;
  status.textContent=video.provider+' selected.';
});
get('close').addEventListener('click',()=>{closePlayer();status.textContent='Player closed.';input.focus();});
input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');status.textContent='';});

const room=get('room');
get('wide').onclick=()=>{
  const on=room.classList.toggle('wide');get('wide').setAttribute('aria-pressed',String(on));
};
function fullState(){
  const on=Boolean(document.fullscreenElement)||room.classList.contains('expanded');
  get('full').textContent=on?'Exit full window':'Full window';
  get('full').setAttribute('aria-pressed',String(on));
}
get('full').onclick=async()=>{
  if(document.fullscreenElement) await document.exitFullscreen();
  else if(room.classList.contains('expanded'))room.classList.remove('expanded');
  else {try{await room.requestFullscreen()}catch{room.classList.add('expanded')}}
  fullState();
};
document.addEventListener('fullscreenchange',fullState);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){room.classList.remove('expanded');fullState()}});
const picks=[
  ['HTML in 100 Seconds','Fireship','youtu.be/ok-plXXHlWw'],
  ['But what is a neural network?','3Blue1Brown','youtu.be/Ilg3g-GewQ5'],
  ['Big Buck Bunny','Blender Foundation','youtu.be/aqz-KE-bpKQ'],
  ['External player demo','Bilibili','BV1B7411m7LV']
];
const storage='imon-video-playlist-v1';
let queue=[];
try{const saved=JSON.parse(localStorage.getItem(storage));if(Array.isArray(saved))queue=saved.filter(url=>typeof url==='string'&&parseVideo(url)).slice(0,50)}catch{}
function playButton(title,url,by){
  const button=document.createElement('button');button.type='button';button.dataset.play='';button.textContent=title;
  if(by){const author=document.createElement('small');author.textContent=by;button.append(author)}
  button.onclick=()=>{input.value=url;get('choose').requestSubmit();get('screen').scrollIntoView({block:'nearest'})};return button;
}
for(const [title,by,url] of picks)get('picks').append(playButton(title,url,by));
function save(){try{localStorage.setItem(storage,JSON.stringify(queue))}catch{}}
function showQueue(){
  get('empty').hidden=queue.length>0;get('queue').replaceChildren();
  for(const url of queue){
    const video=parseVideo(url),item=document.createElement('li'),remove=document.createElement('button');
    const id=new URL(video.embed);const label=picks.find(p=>parseVideo(p[2]).original===url)?.[0] || video.provider+' · '+(id.searchParams.get('bvid')||id.searchParams.get('aid')||id.searchParams.get('episodeId')||id.pathname.split('/').pop());
    remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+label);
    remove.onclick=()=>{queue=queue.filter(entry=>entry!==url);save();showQueue();get('enqueue').focus()};
    item.append(playButton(label,url),remove);get('queue').append(item);
  }
}
get('enqueue').onclick=()=>{
  const video=parseVideo(input.value);
  if(!video){status.textContent='Enter a supported video link first.';input.focus();return}
  if(queue.includes(video.original)){status.textContent='Already in your playlist.';return}
  if(queue.length>=50){status.textContent='Remove a video before adding another. The playlist holds 50.';return}
  queue.push(video.original);save();showQueue();status.textContent='Added to your playlist.';
};
showQueue();
