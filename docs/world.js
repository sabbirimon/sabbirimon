/** Original pixel worlds: procedural scenes and locally hosted, original illustrated landscapes. */
export const WORLD_ART = {
  'neon-coast': { name: 'Neon Coast', file: 'neon-coast', focus: .72 },
  'waterfall-valley': { name: 'Waterfall Valley', file: 'waterfall-valley', focus: .55 },
  'twilight-lake': { name: 'Twilight Lake', file: 'twilight-lake', focus: .52 },
  'neon-forest': { name: 'Neon Forest', file: 'neon-forest', focus: .52 }
};
const artworkCache = new Map();
function requestArtwork(name, ready) {
  if (!WORLD_ART[name] || typeof Image === 'undefined') return null;
  let record = artworkCache.get(name);
  if (record) { if (!record.loaded) record.listeners.add(ready); return record; }
  const image = new Image(); image.decoding = 'async';
  record = { image, loaded: false, listeners: new Set([ready]), fallback: false }; artworkCache.set(name, record);
  image.onload = () => { record.loaded = true; for (const callback of record.listeners) callback(); record.listeners.clear(); };
  image.onerror = () => { if (!record.fallback) { record.fallback = true; image.src = new URL(`./art/${WORLD_ART[name].file}.png`, import.meta.url).href; } };
  image.src = new URL(`./art/${WORLD_ART[name].file}.webp`, import.meta.url).href;
  return record;
}
const PALETTES = {
  morning: { sky: ['#8ab8e0', '#a5d4e6', '#c6e8df', '#f4edc4'], mountain: ['#6c9a9c', '#79a991', '#90b68a'], cloud: '#e3efeb', cloudLight: '#fff4d9', grass: '#b1d98d', grassLight: '#edf5be', grassShade: '#6ba67c', dirt: '#817166', dirtLight: '#b29b7d', dirtDark: '#57626b', water: '#84cfde', waterLight: '#e7fff5', leaf: '#568f74', leafLight: '#a1cb88', trunk: '#978573', star: '#fff1d4' },
  twilight: { sky: ['#13132c', '#1b1b3a', '#232348', '#30305b'], mountain: ['#33335d', '#41416a', '#50517a'], cloud: '#575477', cloudLight: '#777294', grass: '#84e6b5', grassLight: '#c3f6c9', grassShade: '#38978f', dirt: '#53475f', dirtLight: '#796079', dirtDark: '#302e49', water: '#64bdcf', waterLight: '#b4f8ed', leaf: '#418e85', leafLight: '#70c599', trunk: '#66516a', star: '#c6b9e9' },
  daylight: { sky: ['#157dd0', '#278fce', '#49b5d3', '#9de5df'], mountain: ['#348b91', '#427e69', '#70a977'], cloud: '#9ee9eb', cloudLight: '#e1faf0', grass: '#99cc77', grassLight: '#d9ef9c', grassShade: '#4d9a6c', dirt: '#786356', dirtLight: '#a48867', dirtDark: '#415960', water: '#4cc9da', waterLight: '#e0fff2', leaf: '#2b7965', leafLight: '#7bbc7a', trunk: '#836e61', star: '#e8fff0' },
  sunset: { sky: ['#30213b', '#563146', '#854653', '#ac686a'], mountain: ['#6a4c65', '#815c70', '#946975'], cloud: '#b17b83', cloudLight: '#e0a49d', grass: '#d5c894', grassLight: '#f8e4b8', grassShade: '#84978a', dirt: '#745368', dirtLight: '#a47883', dirtDark: '#46384e', water: '#b39aca', waterLight: '#f3d4e0', leaf: '#748d83', leafLight: '#c4bf90', trunk: '#976e80', star: '#ffe5b7' }
};

export function initWorld(canvas, { onCollect = () => {} } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    let count = 0;
    return {
      setTheme() {}, setScene() {}, setMotion() {}, setRotorSpeed() {}, resetObjects() {}, nudgeExplorer() {},
      collectNext() { if(count >= 5) return false; onCollect(++count); return true; },
      resetCoins() { count = 0; onCollect(count); }
    };
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let theme = 'daylight', scene = 'islands', transition = null, sceneTransition = null, motion = !reduced.matches, visible = true;
  let width = 480, height = 240, renderScale = 1, portrait = false, clock = 0, last = 0, frame = 0, collected = 0;
  let rotorSpeed=1, rotorTime=0;
  let pointer = { x: 0, y: 0 }, particles = [], coins = [];
  let explorerOffset={x:0,y:0},explorerBounds=null,explorerDrag=null,suppressClick=false;
  const stars = Array.from({ length: 61 }, (_, i) => ({
    x: ((i * 137.5 + 13) % 480) / 480,
    y: ((i * 53.7 + 17) % 170) / 240,
    size: i % 9 === 0 ? 2 : 1,
    phase: i * 2.23
  }));
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  function drawStar(x,y,size,color) {
    const radius=size===2?1.4:.65;
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
    if(size===2) {
      const halo=ctx.createRadialGradient(x,y,0,x,y,3.2);
      halo.addColorStop(0,color);halo.addColorStop(1,'rgba(209,229,255,0)');
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fill();
    }
  }
  const phaseLight = name => ({ morning: .9, daylight: 1, sunset: .45, twilight: 0 })[name];
  const mixColor = (a, b, ratio) => {
    const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);
    return '#'+[16,8,0].map(shift=>Math.round(((aa>>shift)&255)*(1-ratio)+((bb>>shift)&255)*ratio).toString(16).padStart(2,'0')).join('');
  };
  function transitionProgress() { return transition ? Math.min(1, Math.max(0, (clock-transition.start)/2)) : 1; }
  function paletteNow() {
    if(!transition) return PALETTES[theme];
    const progress=transitionProgress(), blend=progress*progress*(3-2*progress), target=PALETTES[theme];
    return Object.fromEntries(Object.entries(target).map(([key,value])=>[key, Array.isArray(value)
      ? value.map((color,index)=>mixColor(transition.from[key][index],color,blend))
      : mixColor(transition.from[key],value,blend)]));
  }
  function lightNow() {
    if(!transition) return phaseLight(theme);
    const progress=transitionProgress(),blend=progress*progress*(3-2*progress);
    return transition.light*(1-blend)+phaseLight(theme)*blend;
  }
  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
    ctx.closePath(); ctx.fill();
  }
  function cloud(x, y, scale, palette, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    const s = scale;
    rect(x + 6*s, y + 9*s, 52*s, 8*s, palette.cloud);
    rect(x, y + 13*s, 66*s, 6*s, palette.cloud);
    rect(x + 14*s, y + 4*s, 16*s, 10*s, palette.cloud);
    rect(x + 20*s, y, 9*s, 8*s, palette.cloud);
    rect(x + 30*s, y + 7*s, 17*s, 9*s, palette.cloud);
    rect(x + 3*s, y + 16*s, 58*s, 3*s, palette.cloudLight);
    ctx.restore();
  }
  function mountainLayer(y, amplitude, color, seed) {
    const points = [[0, height], [0, y]];
    for (let x = 0; x < width + 16; x += 8) {
      const v = Math.sin(x * .028 + seed) * .48 + Math.sin(x * .066 + seed * 3) * .28 + Math.sin(x * .014 + seed) * .22;
      const top = y - Math.round((v + .5) * amplitude / 4) * 4;
      points.push([x, top], [x + 8, top]);
    }
    points.push([width, height]); polygon(points, color);
  }
  function windLean(x){
    if(!motion)return 0;
    const type=document.body.dataset.weather;
    const force={wind:.12,storm:.18,'heavy-rain':.08,cyclone:.25,blizzard:.14,drizzle:.025,rain:.05}[type]||.012;
    const power=Number(document.body.dataset.weatherPower)||1;
    return force*power*(.55+Math.sin(clock*1.7+x*.03)*.35+Math.sin(clock*.8)*.1);
  }
  function turbine(x,y,scale=1){
    const angle=rotorTime/(.75+scale*.35)+scale;
    bladeWind(x,y-45*scale,17*scale,scale);
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    polygon([[-3,0],[3,0],[1,-44],[-1,-44]],'#b9cad6');rect(-2,-43,1,40,'#f1f3ec');
    ctx.translate(0,-45);
    for(let i=0;i<3;i++){ctx.save();ctx.rotate(angle+i*Math.PI*2/3);polygon([[-1,0],[2,-4],[1,-23],[-2,-19]],'#e3f5f2');ctx.restore();}
    rect(-3,-3,6,6,'#789cb2');rect(-1,-1,2,2,'#b2f5df');ctx.restore();
  }
  // Three wisps leave the turning rotor. Their phase and length follow its speed.
  function bladeWind(x,y,size,offset) {
    if(!motion || rotorSpeed<=0) return;
    ctx.save();
    for(let i=0;i<3;i++){
      const phase=(rotorTime*.37+offset+i/3)%1;
      const tail=x+size*(.65+phase*2.4);
      const lineY=y+size*(i-1)*.39;
      ctx.globalAlpha=Math.sin(phase*Math.PI)*Math.min(.54,.23+rotorSpeed*.1);
      ctx.strokeStyle='#e2fff6';ctx.lineWidth=Math.max(.6,size*.035);
      ctx.beginPath();ctx.moveTo(tail,lineY);
      ctx.quadraticCurveTo(tail+size*.5,lineY-size*.19,tail+size*(.7+rotorSpeed*.18),lineY);
      ctx.stroke();
    }
    ctx.restore();
  }
  function riverbend(p) {
    const t=motion?clock:0, bank=height*.53;
    const soil='#886d52',beam='#553c37',wood='#bf8757',stone='#bac0a3';
    mountainLayer(bank-28,32,p.mountain[0],4);
    mountainLayer(bank-9,19,p.mountain[1],2);
    // Platforms in the same polygon as the turbine footings anchor each tower.
    const ridge=[[0,bank+8],[width*.53,bank-8],[width*.60,bank-20],[width*.65,bank-20],
      [width*.72,bank-12],[width*.78,bank-12],[width*.85,bank-28],[width*.91,bank-28],[width,bank-7],
      [width,height],[0,height]];
    polygon(ridge,p.grassShade);
    turbine(width*.624,bank-20,.48);
    turbine(width*.755,bank-12,.83);
    turbine(width*.88,bank-28,portrait?1.02:1.32);
    const caveX=width*.47, mouthY=bank+11;
    polygon([[caveX-39,mouthY+2],[caveX-34,mouthY-16],[caveX-20,mouthY-30],[caveX+8,mouthY-35],
      [caveX+32,mouthY-23],[caveX+44,mouthY+4]],'#738477');
    polygon([[caveX-27,mouthY+3],[caveX-21,mouthY-13],[caveX-9,mouthY-22],[caveX+9,mouthY-22],
      [caveX+21,mouthY-13],[caveX+28,mouthY+3]],'#233f43');
    rect(caveX-15,mouthY-25,20,3,stone);
    const riverX=u=>caveX+width*(.16*Math.sin(u*5.4)-u*.08);
    const riverWidth=u=>7+u*width*.21;
    const depth=height-mouthY;
    for(let i=0;i<36;i++){
      const a=i/36,b=(i+1)/36;
      const xa=riverX(a),xb=riverX(b),ya=mouthY+a*depth,yb=mouthY+b*depth;
      const wa=riverWidth(a),wb=riverWidth(b);
      polygon([[xa-wa-2,ya],[xa+wa+2,ya],[xb+wb+2,yb+1],[xb-wb-2,yb+1]],soil);
      polygon([[xa-wa,ya],[xa+wa,ya],[xb+wb,yb+1],[xb-wb,yb+1]],i<5?'#348c9c':'#47aabd');
    }
    for(let i=0;i<30;i++){
      const u=(i*.137+t*.07)%1;
      const x=riverX(u)+Math.sin(i*9)*riverWidth(u)*.73;
      rect(x,mouthY+u*depth,2+u*6,1,i%3?'#80d9d9':'#c1f6e0');
    }
    // The wheel dips into the water beside the masonry mill.
    const u=.34, wx=riverX(u)+riverWidth(u)-3,wy=mouthY+u*depth-7;
    rect(wx+5,wy-25,36,28,stone);
    polygon([[wx+1,wy-24],[wx+21,wy-41],[wx+46,wy-24]],beam);
    rect(wx+14,wy-17,7,9,'#314c56');rect(wx+29,wy-12,7,15,wood);
    ctx.save();ctx.translate(wx,wy);ctx.rotate(-t*.68);
    ctx.strokeStyle=beam;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){
      ctx.rotate(Math.PI/4);rect(-1,-14,2,14,wood);rect(-4,-15,8,3,'#e4b278');
    }
    ctx.restore();rect(wx-2,wy-2,4,4,beam);
    // A separate timber windmill overlooks the outer bank.
    const hx=width*.84,hy=mouthY+depth*.53;
    polygon([[hx-17,hy],[hx-10,hy-38],[hx+9,hy-38],[hx+17,hy]],'#ead2a1');
    polygon([[hx-14,hy-37],[hx,hy-52],[hx+15,hy-37]],'#a35343');
    rect(hx-5,hy-13,10,13,beam);rect(hx-10,hy-23,5,6,'#39586b');
    ctx.save();ctx.translate(hx,hy-34);ctx.rotate(rotorTime*.72+.35);
    for(let i=0;i<4;i++){
      ctx.rotate(Math.PI/2);
      rect(-1,-28,2,28,beam);rect(1,-27,7,18,'#f4dfac');
      for(let rib=0;rib<3;rib++)rect(1,-25+rib*6,7,1,wood);
    }
    ctx.restore();rect(hx-2,hy-36,4,4,beam);
    bladeWind(hx,hy-34,20,.4);
    for(let i=0;i<4;i++)conifer(width*(.03+i*.058),bank+4+(i%2)*8,.65+i*.11,p,false);
    robot(wx+42,wy+3);
  }
  function tree(x, y, size, p) {
    ctx.save();ctx.translate(x,y);ctx.transform(1,0,-windLean(x),1,0,0);ctx.translate(-x,-y);
    const s = size;
    rect(x - 2*s, y - 30*s, 5*s, 31*s, p.trunk);
    rect(x + 2*s, y - 17*s, 6*s, 3*s, p.trunk);
    rect(x - 12*s, y - 42*s, 26*s, 14*s, p.leaf);
    rect(x - 17*s, y - 35*s, 35*s, 15*s, p.leaf);
    rect(x - 10*s, y - 47*s, 18*s, 8*s, p.leaf);
    rect(x - 13*s, y - 40*s, 13*s, 9*s, p.leafLight);
    rect(x - 16*s, y - 32*s, 8*s, 7*s, p.leafLight);
    rect(x + 7*s, y - 26*s, 8*s, 4*s, p.grassShade);
    rect(x - 2*s, y - 41*s, 5*s, 3*s, p.grassLight);
    rect(x + 9*s, y - 36*s, 3*s, 3*s, '#e9a9c5');
    rect(x - 9*s, y - 29*s, 3*s, 3*s, '#e9a9c5');
    ctx.restore();
  }
  function bush(x, y, p, small = false) {
    rect(x, y - 5, small ? 10 : 18, 5, p.leaf);
    rect(x + 3, y - 9, small ? 5 : 10, 5, p.leafLight);
    rect(x + 3, y - 3, 2, 2, p.grassLight);
  }
  function flower(x, y, hue) {
    rect(x, y - 6, 1, 7, '#69a998');
    rect(x - 2, y - 4, 2, 1, '#8bd5a6');
    rect(x - 1, y - 9, 3, 5, hue);
    rect(x - 2, y - 8, 5, 3, hue);
    rect(x, y - 7, 1, 1, '#ffe6a0');
  }
  function island(x, y, w, depth, p, waterfall = false) {
    // Every contour uses only horizontal/vertical edges for a genuinely pixel-drawn silhouette.
    const l = x - w/2, r = x + w/2;
    polygon([[l+7,y],[r-9,y],[r-9,y+4],[r,y+4],[r,y+13],[r-7,y+13],[r-7,y+22],[r-18,y+22],[r-18,y+31],[r-28,y+31],[r-28,y+depth-8],[x+12,y+depth-8],[x+12,y+depth],[x-10,y+depth],[x-10,y+depth-6],[l+28,y+depth-6],[l+28,y+27],[l+17,y+27],[l+17,y+19],[l+7,y+19],[l+7,y+12],[l,y+12],[l,y+4],[l+7,y+4]],p.dirtDark);
    polygon([[l+4,y+6],[r-4,y+6],[r-4,y+15],[r-15,y+15],[r-15,y+23],[x+17,y+23],[x+17,y+35],[x-10,y+35],[x-10,y+29],[l+25,y+29],[l+25,y+21],[l+12,y+21],[l+12,y+14],[l+4,y+14]],p.dirt);
    rect(l+10,y+7,w-26,5,p.dirtLight);
    rect(l+22,y+15,15,3,p.dirtLight); rect(x+5,y+19,15,3,p.dirtLight);
    rect(x-19,y+28,7,5,p.dirtLight); rect(x+18,y+30,4,8,p.dirt);
    rect(l+29,y+31,3,9,p.grassShade); rect(r-23,y+18,3,13,p.grassShade);
    rect(l+4,y-2,w-10,8,p.grassShade);
    rect(l+9,y-5,w-20,7,p.grass);
    rect(l+16,y-7,w-36,3,p.grassLight);
    for (let i=0;i<w-24;i+=13) {
      rect(l+12+i,y-8-(i%3),2,3,p.grass);
      if (i%2===0) rect(l+14+i,y+2,3,4,p.grass);
    }
    if(waterfall) {
      const wx=x+w*.24;
      rect(wx-3,y-6,15,4,p.waterLight);
      rect(wx,y-3,9,height-y+3,p.water);
      rect(wx+1,y,2,height-y,p.waterLight);
      const flow = Math.floor(clock*15)%18;
      for(let dy=flow;dy<height-y;dy+=18) {
        rect(wx+5,y+dy,2,8,p.waterLight);
        rect(wx-2,y+dy+6,2,3,p.water);
      }
      ctx.globalAlpha = .16;
      rect(wx-3,y+16,15,height-y-16,p.waterLight);
      ctx.globalAlpha = 1;
    }
  }
  function crystal(x, y, color = '#ae9eff') {
    polygon([[x,y-15],[x+4,y-19],[x+8,y-13],[x+8,y-3],[x+4,y],[x,y-3]],color);
    rect(x+1,y-13,2,8,'#e3ddff');
    polygon([[x-5,y-6],[x-2,y-10],[x+1,y-6],[x+1,y-1],[x-5,y-1]],'#8074c4');
  }
  function robot(x, y) {
    x+=explorerOffset.x;y+=explorerOffset.y;
    const transform=ctx.getTransform();
    const sx=transform.a/renderScale,sy=transform.d/renderScale;
    const minTop=Math.max(height*.56,height-(portrait?195:138));
    let left=sx*(x-1)+transform.e/renderScale,top=sy*(y-30)+transform.f/renderScale;
    const boxW=21*sx,boxH=32*sy;
    const safeLeft=Math.max(4,Math.min(width-boxW-4,left));
    const safeTop=Math.max(minTop,Math.min(height-boxH-8,top));
    const correctionX=(safeLeft-left)/sx,correctionY=(safeTop-top)/sy;
    explorerOffset.x+=correctionX;explorerOffset.y+=correctionY;
    x+=correctionX;y+=correctionY;
    explorerBounds={left:safeLeft,top:safeTop,width:boxW,height:boxH,sx,sy};
    const hop = motion ? Math.round(Math.sin(clock*2.1)*1.5) : 0;
    y += hop;
    // Little explorer, original silhouette: antenna, square visor, backpack, boots.
    rect(x+7,y-28,1,5,'#c5b5ea'); rect(x+6,y-30,3,3,'#ffe29b');
    rect(x+1,y-24,14,12,'#686786'); rect(x+3,y-26,10,2,'#dfd9ef');
    rect(x+2,y-24,12,9,'#dad8ed'); rect(x+4,y-22,8,5,'#2e3c5b');
    rect(x+5,y-21,2,2,'#90f3d1'); rect(x+9,y-21,2,2,'#90f3d1');
    rect(x+3,y-12,10,9,'#9b8ecc'); rect(x+4,y-12,8,4,'#bdb2df');
    rect(x+6,y-10,4,2,'#e9b867'); rect(x-1,y-12,3,7,'#d3cce3');
    rect(x+14,y-12,3,7,'#d3cce3'); rect(x+2,y-3,5,3,'#5e557f'); rect(x+10,y-3,5,3,'#5e557f');
    rect(x+16,y-16,3,9,'#746b9a');
  }
  function terminal(x,y,p) {
    rect(x,y-24,24,18,'#353953'); rect(x+2,y-23,21,15,'#958db5');
    rect(x+4,y-21,17,11,'#242e45'); rect(x+6,y-18,3,2,'#8de2b6');
    rect(x+9,y-16,2,2,'#8de2b6'); rect(x+6,y-14,3,2,'#8de2b6');
    if(!motion||Math.floor(clock*1.5)%2===0) rect(x+13,y-13,5,1,'#e2c08c');
    rect(x+10,y-6,5,3,'#59546f'); rect(x+5,y-3,16,2,'#8982a4');
    rect(x-4,y,31,3,p.dirtLight); rect(x-2,y+3,2,6,p.dirtLight); rect(x+23,y+3,2,6,p.dirtLight);
  }
  function coin(c,p) {
    if(c.collected) return;
    const y=c.y+(motion?Math.sin(clock*2+c.phase)*3:0);
    c.drawY=y;
    const w=motion?Math.max(2,Math.round(5*Math.abs(Math.cos(clock*1.2+c.phase)))):5;
    rect(c.x-w,y-5,w*2,10,'#996a3a');
    rect(c.x-w+1,y-7,Math.max(1,w*2-2),14,'#e5ad57');
    rect(c.x-w+1,y-5,Math.max(1,w*2-3),10,'#ffe6a3');
    rect(c.x,y-3,1,6,'#d59c48');
    if(motion&&Math.sin(clock*2+c.phase)>.94) {
      rect(c.x+8,y-10,1,5,p.star); rect(c.x+6,y-8,5,1,p.star);
    }
  }
  function conifer(x,y,scale,p,snow=false) {
    rect(x-2*scale,y-9*scale,4*scale,10*scale,p.trunk);
    for(let row=0;row<4;row++) {
      const span=(5+row*4)*scale,top=y-(37-row*8)*scale;
      rect(x-span/2,top,span,9*scale,p.leaf);
      if(snow)rect(x-span/2,top,span,2*scale,p.cloudLight);
      else rect(x-span/2,top,span/2,3*scale,p.leafLight);
    }
  }
  function palm(x,y,p,lean=1) {
    lean+=windLean(x)*7;
    for(let i=0;i<8;i++) {
      rect(x+i*lean,y-i*6,5,7,p.trunk);
      rect(x+i*lean,y-i*6,2,2,p.dirtLight);
    }
    const topX=x+7*lean,topY=y-44;
    for(const sign of [-1,1])for(let i=0;i<5;i++) {
      rect(topX+sign*i*5,topY+Math.floor(i*i/4),7,4,p.leaf);
      rect(topX+sign*i*4,topY-7+i*2,6,3,p.leafLight);
    }
    rect(topX,topY,4,4,p.dirtDark);rect(topX+4,topY+2,4,4,p.dirtLight);
  }
  function cactus(x,y,size,p) {
    rect(x,y-30*size,7*size,30*size,p.leaf);
    rect(x+2*size,y-33*size,3*size,4*size,p.leaf);
    rect(x+2*size,y-28*size,2*size,26*size,p.leafLight);
    rect(x-8*size,y-18*size,9*size,5*size,p.leaf);
    rect(x-9*size,y-26*size,4*size,12*size,p.leaf);
    rect(x+7*size,y-12*size,9*size,5*size,p.leaf);
    rect(x+13*size,y-22*size,4*size,14*size,p.leaf);
    rect(x+1*size,y-35*size,5*size,3*size,'#e7a7b6');
  }
  function drawBiome(name,p,cy,px,py) {
    const light=lightNow(),tint=color=>mixColor(p.sky[1],color,.35+.65*light);
    ctx.save();ctx.translate(Math.round(px),Math.round(py));
    if(name==='forest') {
      mountainLayer(cy-9,40,p.mountain[0],2);
      for(let i=0;i<17;i++)conifer(i*width/16,cy+1, .55+(i%3)*.13, {...p,leaf:p.mountain[1],leafLight:p.mountain[2]});
      mountainLayer(cy+13,19,p.grassShade,5);
      rect(0,cy+22,width,height-cy,p.grassShade);
      // A small stream winds through the meadow.
      for(let x=0;x<width;x+=5) {
        const y=cy+38+Math.round(Math.sin(x*.026)*8);
        rect(x,y,6,11,p.water);rect(x,y,6,2,p.waterLight);
      }
      [ [width*.06,cy+18,1.35],[width*.18,cy+12,1],[width*.87,cy+15,1.3],[width*.97,cy+23,1.6] ].forEach(args=>tree(...args,p));
      for(let i=0;i<18;i++)flower((i*47+13)%width,cy+14+(i*7)%20,i%2?'#e9b0cf':'#e8d894');
      rect(width*.5-34,cy+12,72,5,p.dirtLight);rect(width*.5-30,cy+17,64,9,p.dirt);
      terminal(width*.5+11,cy+10,p);robot(width*.5-18,cy+11);
      bush(width*.35,cy+23,p);bush(width*.67,cy+29,p);
    } else if(name==='beach') {
      const seaY=cy-45;
      rect(0,seaY,width,height-seaY,tint('#258ba7'));
      rect(0,seaY,width,4,p.waterLight);
      for(let row=0;row<8;row++)for(let col=0;col<10;col++) {
        const drift=motion?Math.round(Math.sin(clock*.7+row)*4):0;
        rect((col*57+row*19+drift)%width,seaY+12+row*9,12+(col%3)*5,2,row%2?p.waterLight:p.water);
      }
      const sand=tint('#ebd49a'),sandShade=tint('#c5aa75');
      polygon([[0,cy+22],[width*.18,cy+22],[width*.18,cy+15],[width*.43,cy+15],[width*.43,cy+20],[width*.67,cy+20],[width*.67,cy+13],[width,cy+13],[width,height],[0,height]],sand);
      rect(0,cy+24,width*.18,3,p.waterLight);rect(width*.18,cy+15,width*.25,3,p.waterLight);rect(width*.67,cy+13,width*.33,3,p.waterLight);
      palm(width*.08,cy+34,p,1);palm(width*.89,cy+29,p,-1);
      rect(width*.5-18,cy+32,40,3,sandShade);
      // A striped parasol and an original little board beside the explorer.
      rect(width*.74,cy-11,2,42,p.trunk);
      polygon([[width*.74-20,cy-10],[width*.74-20,cy-15],[width*.74-12,cy-15],[width*.74-12,cy-21],[width*.74+12,cy-21],[width*.74+12,cy-15],[width*.74+21,cy-15],[width*.74+21,cy-10]],tint('#ea9baa'));
      rect(width*.74-4,cy-21,8,11,tint('#fae3a7'));
      rect(width*.56,cy+9,9,31,'#efbc6e');rect(width*.56+3,cy+9,2,31,'#ec8e82');
      robot(width*.48,cy+30);
      for(let i=0;i<14;i++)rect((i*59+7)%width,cy+44+(i*11)%30,2,1,sandShade);
    } else if(name==='desert') {
      const sand=tint('#e6bd78'),shade=tint('#c58f61'),dark=tint('#a87558');
      mountainLayer(cy-4,26,shade,1.3);mountainLayer(cy+20,22,sand,3.7);
      for(let i=0;i<4;i++) {
        const y=cy+28+i*14;
        for(let x=0;x<width;x+=8)rect(x,y+Math.round(Math.sin(x*.018+i)*5),8,1,shade);
      }
      cactus(width*.11,cy+26,1.4,p);cactus(width*.85,cy+16,1.1,p);cactus(width*.94,cy+43,.65,p);
      // A weathered stone arch and scattered rocks add depth.
      rect(width*.25,cy-21,10,38,dark);rect(width*.25+29,cy-21,10,38,dark);rect(width*.25+6,cy-27,28,10,shade);
      rect(width*.25+4,cy-20,3,16,sand);rect(width*.25+32,cy-19,3,21,sand);
      [width*.05,width*.32,width*.67,width*.8].forEach((x,i)=>{rect(x,cy+41+i*3,13,6,shade);rect(x+3,cy+38+i*3,7,4,sand);});
      rect(width*.5-31,cy+27,70,4,shade);terminal(width*.5+10,cy+22,p);robot(width*.5-16,cy+25);
    } else if(name==='mountains') {
      mountainLayer(cy+5,42,p.mountain[0],3);
      const snow=tint('#e9f0ef'),snowShade=tint('#b9d4df');
      function peak(x,y,w,h) {
        const points=[[x-w/2,y]];
        for(let i=0;i<8;i++)points.push([x-w/2+i*w/16,y-i*h/8],[x-w/2+(i+1)*w/16,y-i*h/8]);
        points.push([x,y-h]);
        for(let i=0;i<8;i++)points.push([x+(i+1)*w/16,y-h+i*h/8],[x+(i+1)*w/16,y-h+(i+1)*h/8]);
        points.push([x+w/2,y]);polygon(points,p.mountain[2]);
        polygon([[x-w*.19,y-h*.62],[x-w*.12,y-h*.62],[x-w*.12,y-h*.78],[x-w*.05,y-h*.78],[x-w*.05,y-h],[x+w*.06,y-h],[x+w*.06,y-h*.78],[x+w*.12,y-h*.78],[x+w*.12,y-h*.62],[x+w*.2,y-h*.62],[x+w*.1,y-h*.52],[x,y-h*.65],[x-w*.08,y-h*.55]],snow);
      }
      peak(width*.14,cy+18,125,101);peak(width*.86,cy+13,145,121);
      mountainLayer(cy+28,17,snowShade,2);mountainLayer(cy+40,14,snow,5);
      conifer(width*.08,cy+38,1.2,p,true);conifer(width*.28,cy+30,.8,p,true);conifer(width*.9,cy+43,1.35,p,true);
      rect(width*.5-32,cy+29,70,6,p.dirtLight);robot(width*.5-12,cy+26);
      rect(width*.6,cy-1,2,30,p.trunk);rect(width*.6+2,cy-1,17,10,'#e7a0b5');
      for(let i=0;i<8;i++)rect(width*.35+i*9,cy+49+(i%2)*4,3,2,snowShade);
    } else if(name==='city') {
      const waterY=cy+8;
      rect(0,waterY,width,height-waterY,tint('#24465e'));
      const buildingColors=[p.mountain[0],p.dirtDark,p.mountain[1]];
      for(let i=0;i<14;i++) {
        const x=i*width/14,w=width/14-3,edge=Math.abs(i-6.5)/6.5;
        const baseHeight=30+Math.round(edge*55)+(i*13)%23;
        const quake=motion&&document.body.dataset.weather==='earthquake';
        const phase=clock%12-i*.09;
        const damage=quake?(phase<1?0:phase<4?Math.min(1,(phase-1)/1.8):phase<7?1:Math.max(0,1-(phase-7)/3)):0;
        const h=Math.max(8,baseHeight*(1-damage*.72));
        rect(x,waterY-h,w,h,buildingColors[i%3]);rect(x+3,waterY-h-4,w-6,5,buildingColors[i%3]);
        if(i%4===0)rect(x+w/2,waterY-h-14,2,12,p.dirtLight);
        for(let wy=waterY-h+8;wy<waterY-5;wy+=9)for(let wx=x+5;wx<x+w-4;wx+=7) {
          if((Math.round(wx)+wy+i)%4!==0)rect(wx,wy,3,4,light<.55?'#f6d99c':p.cloud);
        }
        for(let row=0;row<4;row++) {
          const sway=motion?Math.round(Math.sin(clock+row+i)*2):0;
          ctx.globalAlpha=.35-row*.06;rect(x+4+sway,waterY+8+row*8,w-8,2,p.waterLight);
        }ctx.globalAlpha=1;
        if(damage>0){
          for(let j=0;j<5;j++){const fall=(clock*1.6+j*.22+i*.1)%1;rect(x+j*w/5,waterY-baseHeight*(1-fall)*damage,2+j%2,2,j%2?'#81939d':'#c1b8a3');}
          ctx.globalAlpha=damage*.38;rect(x-3,waterY-6,w+6,7,'#b7b3a2');ctx.globalAlpha=1;
        }
      }
      rect(0,waterY,width,3,p.waterLight);
      const pierLeft=width*.5-(portrait?61:78),pierWidth=portrait?122:156;
      rect(pierLeft,cy+25,pierWidth,height-cy,p.dirtDark);
      for(let y=cy+25;y<height;y+=7) {rect(pierLeft,y,pierWidth,5,p.dirtLight);rect(pierLeft+4,y,2,2,p.dirtDark);rect(pierLeft+pierWidth-6,y,2,2,p.dirtDark);}
      [pierLeft+6,pierLeft+pierWidth-8].forEach(x=>{rect(x,cy-8,2,33,p.dirtDark);rect(x-3,cy-13,8,7,'#f9dea1');rect(x-4,cy-15,10,2,p.dirtDark);});
      terminal(width*.5+11,cy+22,p);robot(width*.5-17,cy+24);
    } else if(name==='sakura') {
      const blossom={...p,leaf:tint('#cd80a2'),leafLight:tint('#f5bfd2'),grassLight:tint('#ffe2df'),trunk:tint('#886975')};
      mountainLayer(cy-8,26,tint('#80998e'),4);
      mountainLayer(cy+17,18,tint('#a5bd98'),1);
      rect(0,cy+25,width,height-cy,tint('#97b18d'));
      const streamY=cy+28;
      rect(0,streamY,width,25,p.water);
      for(let i=0;i<16;i++) {
        const drift=motion?Math.round(Math.sin(clock*.6+i)*3):0;
        rect((i*39+drift)%width,streamY+5+(i%3)*7,14,2,p.waterLight);
      }
      tree(width*.09,cy+22,1.45,blossom);tree(width*.22,cy+12,1.05,blossom);
      tree(width*.84,cy+22,1.5,blossom);tree(width*.97,cy+31,1.15,blossom);
      // A little stepped footbridge crosses the stream.
      const bx=width*.5-46;
      rect(bx,cy+33,92,6,tint('#9d7267'));
      rect(bx+8,cy+28,76,5,tint('#be9180'));
      rect(bx+16,cy+24,60,4,tint('#d5aa91'));
      for(let i=0;i<7;i++)rect(bx+6+i*13,cy+11+(i===0||i===6?7:0),2,22,tint('#7e6064'));
      rect(bx+7,cy+12,78,3,tint('#b1877c'));
      robot(width*.5-7,cy+22);
      for(let i=0;i<25;i++) {
        const drift=motion?clock*5:0;
        const y=cy-60+(i*17+drift)%103,x=(i*43+Math.sin(i+clock*.4)*6)%width;
        rect(x,y,3,2,i%2?blossom.leafLight:blossom.grassLight);
      }
    } else if(name==='cave') {
      const caveDark=mixColor(p.sky[0],'#121126',.87),caveRock=mixColor(p.mountain[0],'#342e51',.75);
      rect(-3,-3,width+6,height+6,caveDark);
      // Dark framing rocks preserve a clean central field behind the hero text.
      rect(0,0,width,12,caveRock);
      for(let i=0;i<9;i++) {
        const x=i*width/8,edge=Math.abs(x-width*.5)/(width*.5),drop=8+Math.round(edge*45);
        rect(x-8,10,16,drop,caveRock);rect(x-4,10+drop,8,10,caveRock);
      }
      for(let side=0;side<2;side++)for(let i=0;i<7;i++) {
        const rockW=18+(i*11)%19;
        rect(side?width-rockW:0,cy-105+i*25,rockW,34,caveRock);
        rect(side?width-rockW+4:4,cy-100+i*25,rockW-8,3,mixColor(caveRock,p.dirtLight,.3));
      }
      mountainLayer(cy+13,12,caveRock,4);
      rect(0,cy+31,width,height-cy,mixColor(caveRock,'#191b36',.6));
      const poolX=width*.24,poolW=width*.53;
      rect(poolX+9,cy+32,poolW-18,31,'#204956');rect(poolX,cy+38,poolW,17,'#286e79');
      rect(poolX+8,cy+38,poolW-16,2,'#83d5cf');
      for(let i=0;i<9;i++) {
        const shimmer=motion?Math.round(Math.sin(clock*1.2+i)*3):0;
        ctx.globalAlpha=.4+.2*Math.sin(i+(motion?clock:0));rect(poolX+10+i*(poolW-20)/9+shimmer,cy+44+(i%2)*7,8,2,'#a4f3d8');
      }ctx.globalAlpha=1;
      for(const [x,y,s,color] of [[width*.13,cy+23,2.2,'#a99be9'],[width*.83,cy+25,2.5,'#88d9d3'],[width*.22,cy+31,1.2,'#cbb5ed'],[width*.95,cy+44,1.4,'#cbb5ed']]) {
        ctx.save();ctx.translate(x,y);ctx.scale(s,s);crystal(0,0,color);ctx.restore();
      }
      rect(width*.5-24,cy+24,50,8,p.dirtDark);rect(width*.5-17,cy+19,36,6,caveRock);
      robot(width*.5-8,cy+18);
      rect(width*.62,cy+17,4,5,'#facc15');rect(width*.62-1,cy+15,6,2,'#b48acb');
    } else if(name==='space') {
      const vacuum=mixColor(p.sky[0],'#080d24',.91),moonRock=mixColor(p.mountain[1],'#868ba5',.6);
      rect(-3,-3,width+6,height+6,vacuum);
      stars.forEach((s,i)=> {
        const sparkle=motion?.55+.3*Math.sin(clock*.8+s.phase):.7;
        ctx.globalAlpha=sparkle;drawStar(s.x*width,s.y*height,i%13===0?2:1,p.star);
      });ctx.globalAlpha=1;
      const planetX=width*.83,planetY=Math.max(50,cy-94),planetColor=mixColor(p.water,'#a5b7e0',.55);
      for(let row=-8;row<=8;row++) {
        const half=Math.round(Math.sqrt(64-row*row))*3;
        rect(planetX-half,planetY+row*3,half*2,3,row%4<2?planetColor:mixColor(planetColor,'#8794c8',.45));
      }
      rect(planetX-39,planetY+8,79,3,'#cfb4d3');rect(planetX-28,planetY+11,63,2,'#857ba7');
      mountainLayer(cy+8,29,mixColor(moonRock,'#363d63',.5),2);
      mountainLayer(cy+27,15,moonRock,4);
      rect(0,cy+39,width,height-cy,moonRock);
      for(let i=0;i<9;i++) {
        const x=(i*61+17)%width,y=cy+43+(i*13)%38;
        rect(x,y,17,5,mixColor(moonRock,'#252d4e',.45));rect(x+3,y+5,11,2,mixColor(moonRock,'#d6d8e8',.35));
      }
      // Lunar outpost and solar array, with an original tiny rover.
      const outpostX=width*.11;
      rect(outpostX,cy-3,45,28,'#c1c6d8');rect(outpostX+5,cy-10,35,8,'#e2e4ed');rect(outpostX+11,cy-14,23,5,'#c1c6d8');
      rect(outpostX+9,cy+6,10,19,'#384661');rect(outpostX+26,cy+2,12,8,'#6db0c1');rect(outpostX+29,cy+3,3,5,'#b9e8ec');
      const solarX=width*.79;
      rect(solarX,cy+10,3,20,p.dirtLight);rect(solarX-17,cy-4,37,16,'#4e619b');
      for(let i=0;i<4;i++)rect(solarX-15+i*9,cy-2,6,12,'#8c9ecc');
      const roverX=width*.59;
      rect(roverX,cy+18,29,10,'#c5c9d7');rect(roverX+9,cy+12,15,7,'#e5e7ee');
      rect(roverX+2,cy+27,7,6,'#303953');rect(roverX+20,cy+27,7,6,'#303953');
      rect(roverX+11,cy+1,2,12,'#b8bbd0');rect(roverX+8,cy-1,8,3,'#d6d3ea');
      robot(width*.46,cy+27);
    } else if(name==='riverbend-mills') {
      riverbend(p);
    } else if(name==='energy-ridge') {
      mountainLayer(cy-13, 32, p.mountain[0], 4);
      mountainLayer(cy+5, 23, p.mountain[1], 6);
      rect(0,cy+26,width,height-cy,p.grassShade);
      const time = motion ? clock : 0;
      const mid = width * .62;
      rect(mid-34,cy+9,68,28,'#233649');
      rect(mid-40,cy+32,80,6,'#47647c');
      for (let i=0;i<3;i++) {
        ctx.beginPath();
        ctx.ellipse(mid,cy+7,28-i*6,11+i*2,Math.sin(time*.45+i)*.35,0,Math.PI*2);
        ctx.strokeStyle=['#befcf4','#52cffa','#c5a5ff'][i];
        ctx.lineWidth=2;
        ctx.stroke();
      }
      rect(mid-4,cy+4,8,6,'#f1ffff');
      for (let row=0;row<2;row++) for (let i=0;i<4;i++) {
        const x=width*.17+i*21-row*5, y=cy+22+row*16;
        rect(x+8,y+4,3,8,'#293849');
        polygon([[x,y],[x+17,y],[x+14,y+7],[x-3,y+7]],'#245486');
        rect(x+3,y+2,11,1,'#78bde0');
        rect(x+5+Math.floor((time*2+i)%6),y+1,1,5,'#a5e2f4');
      }
      for(let x=width*.32; x<mid-37; x+=8) rect(x,cy+44,5,2,'#477883');
      const span=Math.max(1,mid-37-width*.32);
      rect(width*.32+(time*18)%span,cy+43,5,3,'#90f9d3');
      robot(mid+33,cy+35);
    } else if(name==='cyberpunk') {
      const cyan='#6deafa',pink='#e877d7',ink='#09101f';
      const night=mixColor(p.sky[0],'#080d1d',.92);
      rect(-3,-3,width+6,height+6,night);
      rect(0,cy-23,width,height-cy+23,'#11182c');
      // The megacity is tallest at the sides, leaving the hero title readable.
      for(let i=0;i<13;i++) {
        const x=i*width/12,w=width/12-4,edge=Math.abs(i-6)/6;
        const h=33+Math.round(edge*65)+(i*19)%29;
        const neon=i%2?cyan:pink;
        rect(x,cy-h,w,h,ink);rect(x,cy-h,1,h,neon);
        rect(x+1,cy-h,w-2,2,mixColor(neon,ink,.45));
        rect(x+w-2,cy-h+6,1,h-6,'#263353');
        rect(x+3,cy-h-4,w-7,4,'#17223a');
        if(i%3===0){rect(x+w/2,cy-h-18,1,15,'#49536a');rect(x+w/2-1,cy-h-19,3,2,pink);}
        for(let wy=cy-h+8;wy<cy-7;wy+=9)for(let wx=x+5;wx<x+w-3;wx+=7) {
          if((i+Math.round(wx+wy))%5)rect(wx,wy,3,3,(i+Math.round(wy))%3?mixColor(neon,ink,.5):neon);
        }
        ctx.globalAlpha=.27;
        rect(x+3,cy+5,w-6,3,neon);rect(x+7,cy+14,w-12,2,neon);
        ctx.globalAlpha=1;
      }
      function sign(text,x,y,color) {
        const glyphs={A:['010','101','111','101','101'],I:['111','010','010','010','111'],'0':['111','101','101','101','111'],'1':['010','110','010','010','111']};
        rect(x-4,y-4,text.length*8+5,18,'#13172f');
        rect(x-5,y-5,text.length*8+7,1,color);rect(x-5,y+14,text.length*8+7,1,color);
        for(let n=0;n<text.length;n++)glyphs[text[n]].forEach((row,ry)=>[...row].forEach((cell,rx)=>{if(cell==='1')rect(x+n*8+rx*2,y+ry*2,2,2,color);}));
      }
      sign('AI',width*.13,cy-51,cyan);sign('01',width*.82,cy-63,pink);
      // Suspended data lines and nodes, with a slow travelling signal.
      for(let side=0;side<2;side++) {
        const x=side?width*.66:0,span=width*.34,y=cy-34-side*11;
        rect(x,y,span*.4,1,'#45516b');rect(x+span*.4,y+1,span*.35,1,'#45516b');rect(x+span*.75,y,span*.25,1,'#45516b');
        const at=motion?(clock*6+side*21)%span:span*.5;
        rect(x+at,y-1,3,3,side?pink:cyan);
      }
      // Reflective street and neon rails, drawn entirely on the pixel grid.
      rect(0,cy+20,width,height-cy,ink);
      polygon([[width*.4,cy+17],[width*.61,cy+17],[width*.78,height],[width*.22,height]],'#151b30');
      for(let row=0;row<8;row++) {
        const y=cy+24+row*9,spread=13+row*6;
        rect(width*.5-spread,y,5,2,cyan);rect(width*.5+spread,y,5,2,pink);
        if(row%2===0)rect(width*.5,y,2,4,'#5c627c');
      }
      // Elevated metro cars cross the lit viaduct at different depths.
      const transitY = cy-16;
      rect(0,transitY+3,width,3,'#453553');
      for(let i=0;i<3;i++) {
        const x=((motion?clock*18:width*.7)+i*18)%(width+70)-50;
        rect(x,transitY-4,16,6,'#685187');
        rect(x+2,transitY-3,10,2,cyan);
        rect(x+14,transitY-2,2,2,'#ffd7a5');
      }
      const holoX=width*.69;
      rect(holoX,cy+8,26,3,'#3c3559');rect(holoX+7,cy-13,12,20,'#153849');
      ctx.globalAlpha=.65;rect(holoX+1,cy-22,25,18,cyan);ctx.globalAlpha=1;
      rect(holoX+4,cy-19,19,12,'#153849');rect(holoX+7,cy-16,8,2,cyan);rect(holoX+7,cy-11,13,1,cyan);
      robot(width*.47,cy+23);
      for(let i=0;i<11;i++) {
        const x=(i*57+19)%width,y=cy+27+(i*13)%40;
        ctx.globalAlpha=.3;rect(x,y,12,2,i%2?pink:cyan);
      }ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  function drawArtwork(record, p, light) {
    const image = record.image, iw = image.naturalWidth, ih = image.naturalHeight;
    const fit = Math.max(width/iw, height/ih), sw = width/fit, sh = height/fit;
    const focus = WORLD_ART[scene].focus;
    const sx = Math.max(0,Math.min(iw-sw,iw*focus-sw*.5));
    const sy = Math.max(0,Math.min(ih-sh,ih*.56-sh*.5));
    ctx.drawImage(image,sx,sy,sw,sh,0,0,width,height);
    // Tint follows the existing smooth phase transition, retaining the painted colors.
    ctx.globalAlpha = scene === 'neon-forest' ? .07 + (1-light)*.1 : .035 + (1-light)*.23;
    rect(0,0,width,height,p.sky[0]);ctx.globalAlpha=1;
    const t = motion ? clock : 0;
    if (scene === 'neon-coast') {
      for (let i=0;i<10;i++) {
        const x=width*(.06+i*.056), y=height*(.64+(i%3)*.025);
        ctx.globalAlpha=.2+.13*Math.sin(t+i);
        rect(x+Math.sin(t*.5+i)*2,y,5+i%4,1,'#ffd6b3');
      }
      ctx.globalAlpha=1;
      robot(width*.71,height*.89);
      return;
    }
    // Thin atmospheric clouds sit behind the UI; detail remains visible through them.
    cloud(width*.08+Math.sin(t*.08)*9,height*.16,.8,p,.11);
    cloud(width*.71-Math.sin(t*.07)*8,height*.26,.65,p,.09);
    for(let i=0;i<15;i++) {
      const x=width*(.12+((i*37)%76)/100),y=height*(.66+(i%5)*.047);
      const shimmer=.18+(Math.sin(t*1.2+i*2.1)+1)*.13;
      ctx.globalAlpha=shimmer;rect(x+Math.sin(t*.6+i)*3,y,3+i%4,1,scene==='neon-forest'?'#c5c0ff':'#d2ffef');
    }ctx.globalAlpha=1;
    for(let i=0;i<4;i++) {
      const x=(width*.13+i*width*.22+t*(2+i*.4))%(width+15)-5,y=height*(.32+(i%3)*.05),flap=motion&&Math.sin(t*3+i)>0?1:-1;
      ctx.globalAlpha=.65;rect(x,y,2,1,'#e3f0d8');rect(x-2,y+flap,2,1,'#e3f0d8');rect(x+2,y+flap,2,1,'#e3f0d8');
    }ctx.globalAlpha=1;
    if(light<.65 || scene==='neon-forest')for(let i=0;i<23;i++) {
      const x=((i*43+13)%width)+Math.sin(t*.35+i)*3,y=height*(.52+((i*17)%41)/100)+Math.cos(t*.45+i)*3;
      ctx.globalAlpha=.3+(Math.sin(t+i*1.7)+1)*.28;rect(x,y,1,1,i%3?'#e7ed99':'#b8eaff');
    }ctx.globalAlpha=1;
    // Foreground vegetation is a separate animated layer over the illustrated art.
    const foliage={...p,trunk:'#283d48',leaf:scene==='neon-forest'?'#742b83':'#205848',leafLight:scene==='neon-forest'?'#ca4bba':'#51ad78',grassLight:'#8de6bb',grassShade:'#132f3d'};
    tree(width*.025,height+8,portrait?1.05:1.2,foliage);
    tree(width*.97,height+10,portrait?.85:1.5,foliage);
    const explorerY=height-(portrait?108:38),explorerX=width*(portrait?.54:.74);
    // A small original stepping stone grounds the draggable explorer in every painting.
    rect(explorerX-7,explorerY+1,35,4,'#132c3780');
    robot(explorerX,explorerY);
  }
  function draw() {
    const p=paletteNow(),light=lightNow();
    ctx.setTransform(renderScale,0,0,renderScale,0,0);
    const px=motion?pointer.x*2:0,py=motion?pointer.y:0;
    const art = WORLD_ART[scene] ? artworkCache.get(scene) : null;
    if(transition&&transitionProgress()>=1)transition=null;
    ctx.imageSmoothingEnabled=false;
    if(art?.loaded) drawArtwork(art,p,light);
    else {
    for(let band=0;band<24;band++) {
      const position=band/23*3,index=Math.min(2,Math.floor(position)),ratio=position-index;
      const a=parseInt(p.sky[index].slice(1),16),b=parseInt(p.sky[index+1].slice(1),16);
      const channels=[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-ratio)+((b>>shift)&255)*ratio));
      rect(0,band*height/24,width,height/24+1,`rgb(${channels.join(',')})`);
    }
    // Slight vignette composed of broad translucent pixel bands, keeping title area calm.
    ctx.globalAlpha=.14-.12*light;
    rect(0,0,width,height*.4,'#080c1e'); ctx.globalAlpha=1;
    stars.forEach(s=>{
      const a=(1-light)*(.48+(motion?.27*Math.sin(clock*.8+s.phase):.18));
      ctx.globalAlpha=a;
      const x=s.x*width,y=s.y*Math.min(height,400);
      drawStar(x,y,s.size,p.star);
    }); ctx.globalAlpha=1;
    const drift=motion?Math.sin(clock*.12)*8:0;
    const cloudOpacity=.3+.52*light;
    cloud(23+drift+px*.3,height*.3,1,p,cloudOpacity);
    cloud(width-90-drift*.7+px*.3,height*.22,.8,p,cloudOpacity);
    cloud(width*.16-drift,height-121,.7,p,cloudOpacity*.8);
    cloud(width*.64+drift,height-142,.65,p,cloudOpacity*.7);
    // Celestial body at the edge, never behind the main title.
    const moonX=width*.86, moonY=Math.min(height*.3,76);
    ctx.globalAlpha=.75;
    const orbColor=mixColor('#c8bedf','#f4dbab',light);
    rect(moonX-8,moonY-10,16,20,orbColor);rect(moonX-10,moonY-7,20,14,orbColor);
    ctx.globalAlpha=1-light;rect(moonX-2,moonY-10,10,15,p.sky[1]);rect(moonX+1,moonY-6,10,15,p.sky[1]);
    ctx.globalAlpha=1;
    const cy=scene==='energy-ridge' ? Math.round(height*.6) : height-(portrait?86:46);
    if(scene==='islands') {
    mountainLayer(height-53,53,p.mountain[0],1);
    mountainLayer(height-35,39,p.mountain[1],3);
    mountainLayer(height-14,27,p.mountain[2],5);
    // Background pixel lights and distant conifers.
    for(let i=0;i<18;i++) {
      const x=(i*73+8)%width, y=height-17-((i*19)%27);
      rect(x,y,2,2,i%3===0?'#d4b6cc':p.grassShade);
      if(i%3===1) {rect(x+9,y-14,2,18,p.mountain[0]);rect(x+5,y-10,10,3,p.mountain[0]);rect(x+3,y-5,14,3,p.mountain[0]);}
    }
    const leftLift=portrait?63:41,rightLift=portrait?80:54;
    const bob=motion?Math.sin(clock*.7)*2:0;
    ctx.save(); ctx.translate(Math.round(px),Math.round(py));
    island(width*.13,cy-leftLift+bob,91,47,p);
    tree(width*.105,cy-leftLift-7+bob,.72,p);
    bush(width*.17,cy-leftLift-7+bob,p,true);
    flower(width*.185,cy-leftLift-6+bob,'#eab7dc');
    island(width*.87,cy-rightLift-bob,82,40,p);
    crystal(width*.88,cy-rightLift-7-bob);
    crystal(width*.91,cy-rightLift-7-bob,'#d6b3f3');
    bush(width*.81,cy-rightLift-7-bob,p,true);
    // The main island sits beneath the title and commands.
    ctx.save();
    if(portrait) {ctx.translate(width*.5*.18,0);ctx.scale(.82,1);}
    island(width*.5,cy,208,65,p,true);
    tree(width*.5-78,cy-7,.83,p);
    bush(width*.5-55,cy-7,p); bush(width*.5+66,cy-7,p);
    flower(width*.5-29,cy-7,'#f2b7d9'); flower(width*.5+83,cy-7,'#eac288');
    // Flag, stepping stones, monitor and our little traveller.
    rect(width*.5+69,cy-47,2,40,'#b1a1cb');
    const flap=motion?Math.floor(Math.sin(clock*3)*1.5):0;
    polygon([[width*.5+71,cy-47],[width*.5+89,cy-47+flap],[width*.5+89,cy-36+flap],[width*.5+71,cy-36]],'#b4a0e3');
    rect(width*.5+77,cy-44,5,5,'#ece2ff');
    [0,1,2].forEach(i=>rect(width*.5-21+i*13,cy-7,8,2,p.dirtLight));
    terminal(width*.5+17,cy-10,p);
    robot(width*.5-13,cy-8);
    ctx.restore();
    ctx.restore();
    } else drawBiome(WORLD_ART[scene]?'forest':scene,p,cy,px,py);
    }
    if (['mountains','islands','waterfall-valley','energy-ridge','forest'].includes(scene)) {
      const ridgeX=width*.87, ridgeY=height*(scene==='energy-ridge'?.53:.75);
      polygon([[width*.7,height],[width*.74,ridgeY+18],[ridgeX-12,ridgeY],[ridgeX+12,ridgeY],[width*.95,ridgeY+17],[width,height*.79],[width,height]],p.mountain[1]);
      rect(ridgeX-11,ridgeY,22,2,p.grassLight);
      turbine(ridgeX,ridgeY,portrait?1.05:1.48);
      turbine(width*.95,ridgeY+17,portrait?.68:.92);
    }
    // Coins track the translated scenery so visual targets and hit areas agree.
    coins.forEach(c=>coin({...c,x:c.x+Math.round(px),y:c.y+Math.round(py)},p));
    particles.forEach(pt=>{
      const age=clock-pt.born;
      if(age<.7) {
        ctx.globalAlpha=1-age/.7;
        rect(pt.x+pt.vx*age,pt.y+pt.vy*age+45*age*age,2,2,pt.color);
      }
    }); ctx.globalAlpha=1;
    // Ground mist is stepped and light; it ties the floating foreground to the next section.
    ctx.globalAlpha=.22; rect(0,height-4,width,4,p.sky[3]); ctx.globalAlpha=1;
    if(sceneTransition) {
      const progress=Math.min(1,(clock-sceneTransition.start)/.7);
      if(progress>=1)sceneTransition=null;
      else {
        ctx.globalAlpha=1-progress*progress*(3-2*progress);
        ctx.drawImage(sceneTransition.image,0,0,width,height);
        ctx.globalAlpha=1;
      }
    }
  }
  function tick(now) {
    frame=0;
    if(!visible||document.hidden) { last=0; return; }
    if(last){
      const dt=Math.min((now-last)/1000,.05);
      const windy=['wind','storm','cyclone','heavy-rain','blizzard'].includes(document.body.dataset.weather);
      clock+=dt;
      rotorTime+=dt*rotorSpeed*(windy?2.2:1.05)*(Number(document.body.dataset.weatherPower)||1);
    }
    last=now;
    particles=particles.filter(pt=>clock-pt.born<.7);
    draw();
    if(motion) frame=requestAnimationFrame(tick);
  }
  function schedule() {
    if(!frame&&visible&&!document.hidden&&motion) frame=requestAnimationFrame(tick);
    if(!motion) draw();
  }
  function resize() {
    const box=canvas.getBoundingClientRect();
    if(!box.width||!box.height) return;
    sceneTransition=null;
    explorerDrag=null;
    portrait=box.width<650&&box.height/box.width>.9;
    width=portrait?300:480;
    height=Math.max(190,Math.round(width*box.height/box.width));
    renderScale=WORLD_ART[scene]?2:1;
    canvas.width=width*renderScale; canvas.height=height*renderScale;
    const collectedIds=new Set(coins.filter(c=>c.collected).map(c=>c.id));
    coins=[
      {id:0,x:width*.21,y:height-(portrait?173:126),phase:0},
      {id:1,x:width*.72,y:height-(portrait?186:130),phase:1.7},
      {id:2,x:width*.48,y:height-(portrait?137:98),phase:3},
      {id:3,x:width*.08,y:height-(portrait?140:162),phase:4.3},
      {id:4,x:width*.92,y:height-(portrait?145:163),phase:5.8}
    ].map(c=>({...c,collected:collectedIds.has(c.id)}));
    draw(); schedule();
  }
  function canvasPoint(event) {
    const box=canvas.getBoundingClientRect();
    return {x:(event.clientX-box.left)*width/box.width,y:(event.clientY-box.top)*height/box.height};
  }
  function hitsExplorer(point) {
    return explorerBounds&&point.x>=explorerBounds.left-3&&point.x<=explorerBounds.left+explorerBounds.width+3&&point.y>=explorerBounds.top-3&&point.y<=explorerBounds.top+explorerBounds.height+3;
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||!hitsExplorer(canvasPoint(event)))return;
    event.preventDefault();sceneTransition=null;
    explorerDrag={id:event.pointerId,start:canvasPoint(event),offset:{...explorerOffset},bounds:{...explorerBounds}};
    canvas.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';
  });
  canvas.addEventListener('pointermove',event=>{
    const box=canvas.getBoundingClientRect();
    const point=canvasPoint(event);
    if(explorerDrag&&event.pointerId===explorerDrag.id) {
      event.preventDefault();
      const start=explorerDrag.bounds,minTop=Math.max(height*.56,height-(portrait?195:138));
      const dx=Math.max(4-start.left,Math.min(width-start.width-4-start.left,point.x-explorerDrag.start.x));
      const dy=Math.max(minTop-start.top,Math.min(height-start.height-8-start.top,point.y-explorerDrag.start.y));
      explorerOffset={x:explorerDrag.offset.x+dx/start.sx,y:explorerDrag.offset.y+dy/start.sy};
      draw();return;
    }
    pointer={x:(event.clientX-box.left)/box.width-.5,y:(event.clientY-box.top)/box.height-.5};
    const {x,y}=point;
    const hovered=coins.some(c=>!c.collected&&Math.hypot(x-c.x,y-c.y)<15);
    canvas.style.cursor=hitsExplorer(point)?'grab':hovered?'pointer':'';
  },{passive:false});
  function finishDrag(event) {
    if(!explorerDrag||event.pointerId!==explorerDrag.id)return;
    suppressClick=event.type==='pointerup';explorerDrag=null;canvas.style.cursor='grab';
    if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',finishDrag);
  canvas.addEventListener('lostpointercapture',()=>{explorerDrag=null;});
  // Suppress native touch scrolling only when a gesture begins on the explorer.
  canvas.addEventListener('touchstart',event=>{if(explorerDrag)event.preventDefault();},{passive:false});
  canvas.addEventListener('touchmove',event=>{if(explorerDrag)event.preventDefault();},{passive:false});
  canvas.addEventListener('pointerleave',()=>{if(!explorerDrag){pointer={x:0,y:0};canvas.style.cursor='';}});
  canvas.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const box=canvas.getBoundingClientRect();
    const x=(event.clientX-box.left)*width/box.width, y=(event.clientY-box.top)*height/box.height;
    const c=coins.find(c=>!c.collected&&Math.hypot(x-c.x,y-c.y)<16);
    collectCoin(c);
  });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(!visible&&frame){cancelAnimationFrame(frame);frame=0;last=0;}
    else schedule();
  },{rootMargin:'50px'}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;last=0;}
    else schedule();
  });
  reduced.addEventListener('change',event=>setMotion(!event.matches));
  function setMotion(enabled) {
    motion=Boolean(enabled); last=0;
    if(!motion){transition=null;sceneTransition=null;}
    if(!motion&&frame){cancelAnimationFrame(frame);frame=0;}
    draw();schedule();
  }
  function collectCoin(c) {
    if(!c||c.collected||collected>=5) return false;
    sceneTransition=null;
    c.collected=true;
    if(motion) for(let i=0;i<12;i++) particles.push({x:c.x,y:c.y,vx:Math.cos(i*Math.PI/6)*35,vy:Math.sin(i*Math.PI/6)*30-16,born:clock,color:i%2?'#ffe2a1':'#bda6f4'});
    onCollect(++collected);draw();schedule();
    return true;
  }
  resize();
  return {
    setTheme(name) {
      if(!PALETTES[name]||name===theme)return;
      const from=paletteNow(),light=lightNow();
      theme=name;
      transition=motion?{from,light,start:clock}:null;
      draw();schedule();
    },
    setScene(name) {
      if(!['islands','forest','beach','desert','mountains','city','sakura','cave','space','cyberpunk','energy-ridge','riverbend-mills',...Object.keys(WORLD_ART)].includes(name)||name===scene)return;
      // One low-resolution snapshot provides a cheap scene dissolve; no second live renderer.
      if(motion) {
        try {
          const snapshot=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):document.createElement('canvas');
          snapshot.width=width;snapshot.height=height;
          snapshot.getContext('2d').drawImage(canvas,0,0,width,height);
          sceneTransition={image:snapshot,start:clock};
        } catch { sceneTransition=null; }
      } else sceneTransition=null;
      scene=name;
      const dissolve=sceneTransition;
      if(renderScale !== (WORLD_ART[scene]?2:1)) { resize(); sceneTransition=dissolve; }
      if(WORLD_ART[scene])requestArtwork(scene,()=>{draw();schedule();});
      draw();schedule();
    },
    setMotion,
    setRotorSpeed(value){ if(Number.isFinite(value)) rotorSpeed=Math.max(0,Math.min(3,value)); },
    resetObjects() { explorerOffset={x:0,y:0};explorerDrag=null;sceneTransition=null;draw(); },
    nudgeExplorer(dx=0,dy=0) {
      if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
      explorerOffset.x=Math.max(-width,Math.min(width,explorerOffset.x+dx));
      explorerOffset.y=Math.max(-height,Math.min(height,explorerOffset.y+dy));
      sceneTransition=null;draw();
    },
    collectNext() { return collectCoin(coins.find(c=>!c.collected)); },
    resetCoins() {
      collected=0; particles=[];sceneTransition=null;
      coins.forEach(c=>{c.collected=false;});
      onCollect(0);draw();schedule();
    }
  };
}
