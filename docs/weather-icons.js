// The 24-unit grid keeps the silhouettes aligned at both card sizes.
const cloud = 'M3 10h2V7h4V4h6v2h3v3h3v2h2v4H2v-4h1Z';
const pane = 'M3 2h18v20H3ZM5 4v16h14V4Z';
const bolt = 'M13 2h6l-5 8h5L8 23l2-10H6Z';
const ribbons = 'M2 7h12V5h4v2h-2v2H2Zm4 5h16v2H6Zm-4 5h11v2h3v2h-5v-2H2Z';
const flake = 'M3 0h2v2h2v2H5v2H3V4H1V2h2Z';
const bead = 'M2 0h2v3H3v2H0V3h1V1h1Z';
const ray = 'M11 0h2v4h-2ZM0 11h4v2H0Zm20 0h4v2h-4Zm-9 9h2v4h-2ZM3 3h3v3H3Zm15 0h3v3h-3ZM3 18h3v3H3Zm15 0h3v3h-3Z';
const path = (d, extra='') => '<path d="'+d+'" '+extra+'/>';
const at = (d,x,y,scale=1) => path(d,'transform="translate('+x+' '+y+') scale('+scale+')"');

export const WEATHER_CARDS = [
  ['glass-rain','Rain on glass'], ['glass-fog','Fogged glass'], ['earthquake','Earthquake'], ['drizzle','Light rain'],
  ['rain','Medium rain'], ['heavy-rain','Heavy rain'], ['light-snow','Light snow'], ['snow','Medium snow'],
  ['heavy-snow','Heavy snow'], ['hail','Hailstorm'], ['stars','Starlight'], ['storm','Thunderstorm'], ['lightning','Lightning'], ['wind','Wind'],
  ['cloudy','Clouds'], ['fog','Fog'], ['fireflies','Fireflies'], ['clear','Clear']
];

export function weatherIcon(id) {
  let base = '', detail = '', color = '#7edfff', motion = 'fall';
  const rain = ['drizzle','rain','heavy-rain'].indexOf(id);
  const snow = ['light-snow','snow','heavy-snow'].indexOf(id);
  if (rain >= 0 || snow >= 0) {
    base = path(cloud) + path('M5 10h2V8h3v2H7v2H5Z','fill="#ebf9ff"') + path('M2 13h21v2H2Z','fill="#607b99"');
    const count = Math.max(rain,snow)+1;
    const xs = count===1 ? [11] : count===2 ? [6,15] : [2,9,17];
    detail = xs.map((x,i)=>at(snow>=0?flake:bead,x,16+i%2,snow>=0?.8:1)).join('');
    if (snow>=0) color='#e1c9ff';
  } else {
    switch(id) {
      case 'glass-rain': base=path(pane); detail=at(bead,6,6)+at(bead,13,11); break;
      case 'glass-fog': base=path(pane); detail=at(ribbons,5,3,.63); motion='drift'; color='#a6dfcd'; break;
      case 'earthquake': base=path('M2 20V9h4V4h5v16Zm12 0V6h5v4h3v10Z'); detail=path('M0 21h8l2-4 3 4 2-2 2 2h7v2h-8l-1-1-3 2-2-3-1 2H0Z'); color='#ffa583'; motion='shift'; break;
      case 'hail': base=path(cloud); detail=path('M4 16h3v3H4Zm6 3h4v3h-4Zm7-3h4v4h-4Z'); break;
      case 'stars': detail=at(flake,1,10)+at(flake,10,2,1.35)+at(flake,16,16,.7); color='#ffe5ba'; motion='glow'; break;
      case 'storm': base=path(cloud); detail=at(bolt,5,9,.65); color='#ffd984'; motion='glow'; break;
      case 'lightning': base=at(cloud,0,1,.65); detail=path(bolt); color='#ffe589'; motion='glow'; break;
      case 'wind': base=path('M3 19h6v2H3Z'); detail=path(ribbons); motion='drift'; break;
      case 'fog': base=path('M3 8h4V6h8v2h5v2H3Z'); detail=path('M1 12h16v2H1Zm5 4h17v2H6Zm-4 4h13v2H2Z'); motion='drift'; color='#aacbd8'; break;
      case 'cloudy': base=at(cloud,0,0,.8); detail=at(cloud,4,7,.85); motion='drift'; color='#d2e7ff'; break;
      case 'fireflies': base=path('M3 19h2v-4h2v6H2v-2Zm14 2v-5h2v3h4v2Z'); detail=at(flake,3,4)+at(flake,13,9,.8)+at(flake,17,2,.6); color='#d2fa93'; motion='glow'; break;
      default: base=path('M8 6h8v2h2v8h-2v2H8v-2H6V8h2Z'); detail=path(ray); motion='glow'; color='#ffd474';
    }
  }
  return '<svg class="weather-icon" aria-hidden="true" viewBox="0 0 24 24" shape-rendering="crispEdges" style="--sprite-accent:'+color+'"><g class="sprite-base">'+base+'</g><g class="sprite-detail sprite-'+motion+'">'+detail+'</g></svg>';
}
