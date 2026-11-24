import {effectNotes,soundEffect} from '../audio.js';
const shelf=document.querySelector('[data-sound-shelf]');
const feedback=document.querySelector('[data-audio-result]');
let audio;
const labels={coast:'Coastal radio',raindrop:'Glass raindrop',beacon:'Harbor beacon',charge:'Fusion charge',enabled:'Sound on',correct:'Correct answer',retry:'Try again'};
for(const key of Object.keys(effectNotes)){
  const label=labels[key]||key[0].toUpperCase()+key.slice(1);
  const button=document.createElement('button');
  button.type='button';button.className='tool-button';button.textContent='▶ '+label;
  button.addEventListener('click',async()=>{
    try{
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      await audio.resume();soundEffect(audio,key);feedback.textContent='Played '+label+'.';
    }catch{feedback.textContent='Audio playback is unavailable in this browser.';}
  });
  shelf.append(button);
}
document.querySelector('#inspect-url').onclick=()=>{
  const target=document.querySelector('#url-result');
  try{
    const url=new URL(document.querySelector('#url-source').value);
    if(!['http:','https:'].includes(url.protocol))throw Error();
    const parts=['Scheme  '+url.protocol,'Host  '+url.host,'Path  '+url.pathname,'Fragment  '+(url.hash||'—')];
    for(const [key,value] of url.searchParams) parts.push(key+' = '+value);
    target.textContent=parts.join('\n');
  }catch{target.textContent='Enter a full web address starting with https:// or http://.';}
};
const characters=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
const words=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'word'}):null;
document.querySelector('#count-source').oninput=event=>{
  const value=event.target.value;
  const count=characters?[...characters.segment(value)].length:Array.from(value).length;
  const wordCount=words?[...words.segment(value)].filter(item=>item.isWordLike).length:(value.trim().match(/\S+/g)||[]).length;
  const lines=value?value.split(/\r\n?|\n/).length:0;
  const bytes=new TextEncoder().encode(value).length;
  const unit=(amount,name)=>amount+' '+name+(amount===1?'':'s');
  document.querySelector('#count-result').textContent=[unit(count,'character'),unit(wordCount,'word'),unit(lines,'line'),unit(bytes,'UTF-8 byte')].join(' · ');
};
