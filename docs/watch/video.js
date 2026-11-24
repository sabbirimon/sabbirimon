const youtubeHosts = new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com']);
const bilibiliHosts = new Set(['bilibili.com','www.bilibili.com','m.bilibili.com','player.bilibili.com']);
const bv = /^BV[A-Za-z0-9]{10}$/;
const av = /^av([1-9]\d{0,18})$/i;
const episode = /^ep([1-9]\d{0,18})$/;
const positive = /^[1-9]\d{0,18}$/;

function seconds(value) {
  if (!value) return 0;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value);
  const n = /^\d+$/.test(value) ? Number(value) : match ? Number(match[1]||0)*3600 + Number(match[2]||0)*60 + Number(match[3]||0) : 0;
  return Number.isSafeInteger(n) && n <= 2147483647 ? n : 0;
}

export function parseVideo(input) {
  const text = input.trim();
  if (!text || text.length > 3000) return null;
  let url;
  try {
    const bareBili = bv.test(text) || av.test(text);
    url = new URL(bareBili ? 'https://www.bilibili.com/video/'+text : /^https?:\/\//i.test(text) ? text : 'https://'+text);
  } catch { return null; }
  if (url.username || url.password || url.port) return null;
  const host = url.hostname, parts = url.pathname.split('/').filter(Boolean), params = url.searchParams;
  const start = seconds(params.get('t') || params.get('start') || new URLSearchParams(url.hash.slice(1)).get('t'));
  if (youtubeHosts.has(host) || host === 'youtu.be') {
    let id;
    if (host === 'youtu.be' && parts.length===1) id=parts[0];
    else if (url.pathname==='/watch') id=params.get('v');
    else if (parts.length===2 && ['shorts','live','embed'].includes(parts[0])) id=parts[1];
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return null;
    const embed = new URL('https://www.youtube-nocookie.com/embed/'+id);
    const original = new URL('https://www.youtube.com/watch');
    original.searchParams.set('v',id); embed.searchParams.set('playsinline','1');
    if (start) { embed.searchParams.set('start',String(start)); original.searchParams.set('t',start+'s'); }
    return {provider:'YouTube',embed:embed.href,original:original.href};
  }
  if (!bilibiliHosts.has(host)) return null;
  let id;
  if (parts.length===2 && parts[0]==='video') id=parts[1];
  if (parts.length===3 && parts[0]==='bangumi' && parts[1]==='play') id=parts[2];
  if (host==='player.bilibili.com' && url.pathname==='/player.html') {
    id=params.get('bvid') || (params.has('aid') ? 'av'+params.get('aid') : 'ep'+params.get('episodeId'));
  }
  if (!id) return null;
  const aid = av.exec(id), ep = episode.exec(id);
  if (!bv.test(id) && !aid && !ep) return null;
  const embed = new URL('https://player.bilibili.com/player.html');
  const original = new URL('https://www.bilibili.com/'+(ep?'bangumi/play/':'video/')+id);
  embed.searchParams.set(ep?'episodeId':aid?'aid':'bvid',ep?.[1] || aid?.[1] || id);
  embed.searchParams.set('autoplay','0');
  const part=params.get('p');
  if (!ep && positive.test(part || '')) { embed.searchParams.set('p',part); original.searchParams.set('p',part); }
  if (start) { embed.searchParams.set('t',String(start)); original.searchParams.set('t',String(start)); }
  return {provider:'Bilibili',embed:embed.href,original:original.href};
}
