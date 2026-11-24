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
