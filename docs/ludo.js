import { playSound } from './audio.js';

// IMON Ludo variant: a shared 52-square track; each color travels 51 of those
// squares, then its six-cell home lane. Progress 56 is the final home square.
export const LUDO_FINISH = 56;
export const LUDO_COLORS = ['red', 'green', 'yellow', 'blue'];
export const LUDO_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };
export const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const LUDO_TRACK = [
  [1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]
];
export const LUDO_HOME = {
  red: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  green: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  blue: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]]
};
const COLOR = { red: '#fb7185', green: '#6ee7a0', yellow: '#facc15', blue: '#78a9ff' };
const COLOR_DARK = { red: '#a92e52', green: '#218352', yellow: '#a16207', blue: '#345daf' };
const title = s => s[0].toUpperCase() + s.slice(1);

export function ludoTrackIndex(color, progress) {
  return progress >= 0 && progress <= 50 ? (LUDO_OFFSETS[color] + progress) % 52 : null;
}
export function ludoPosition(color, progress) {
  if (progress < 0 || progress > LUDO_FINISH) return null;
  return progress <= 50 ? LUDO_TRACK[ludoTrackIndex(color, progress)] : LUDO_HOME[color][progress - 51];
}
export function createLudoGame(seats = [{ color: 'red', kind: 'human' }, { color: 'green', kind: 'bot' }]) {
  if (seats.length < 2 || seats.length > 4 || new Set(seats.map(s => s.color)).size !== seats.length || seats.some(s => !LUDO_COLORS.includes(s.color) || !['human', 'bot'].includes(s.kind))) throw new Error('Choose two to four different valid seats.');
  const players = seats.map(s => ({ color: s.color, kind: s.kind, name: `${title(s.color)} ${s.kind === 'bot' ? 'computer' : 'player'}`, tokens: [-1, -1, -1, -1] }));
  return { players, turn: 0, phase: 'roll', die: null, sixStreak: 0, winner: null, moves: 0, message: `${players[0].name}'s turn. Roll the die.`, history: [] };
}
export function legalLudoMoves(state) {
  if (!state.die || state.phase === 'won') return [];
  return state.players[state.turn].tokens.flatMap((progress, i) => progress === -1 ? (state.die === 6 ? [i] : []) : (progress < LUDO_FINISH && progress + state.die <= LUDO_FINISH ? [i] : []));
}
function remember(state, text) { state.message = text; state.history.unshift(text); state.history.length = Math.min(state.history.length, 6); }
function nextLudoPlayer(state, prefix = '') {
  state.turn = (state.turn + 1) % state.players.length; state.sixStreak = 0; state.phase = 'roll';
  remember(state, `${prefix}${prefix ? ' ' : ''}${state.players[state.turn].name}'s turn. Roll the die.`);
}
export function rollLudo(state, die) {
  if (state.phase !== 'roll') throw new Error('A die can only be rolled at the start of a turn.');
  if (!Number.isInteger(die) || die < 1 || die > 6) throw new Error('The die must be from one to six.');
  const player = state.players[state.turn];
  state.die = die; state.sixStreak = die === 6 ? state.sixStreak + 1 : 0;
  if (state.sixStreak === 3) { nextLudoPlayer(state, `${player.name} rolled a third six and loses this roll.`); return { thirdSix: true, legal: [] }; }
  const legal = legalLudoMoves(state);
  if (!legal.length) {
    if (die === 6) { state.phase = 'roll'; remember(state, `${player.name} rolled 6 with no legal move. Six earns another roll.`); }
    else nextLudoPlayer(state, `${player.name} rolled ${die}. No legal move.`);
  } else { state.phase = 'move'; remember(state, `${player.name} rolled ${die}. Choose a highlighted token.`); }
  return { thirdSix: false, legal };
}
export function moveLudo(state, tokenIndex) {
  if (state.phase !== 'move' || !legalLudoMoves(state).includes(tokenIndex)) throw new Error('That token cannot move with this roll.');
  const player = state.players[state.turn], before = player.tokens[tokenIndex];
  const after = before === -1 ? 0 : before + state.die;
  player.tokens[tokenIndex] = after; state.moves++;
  let captures = 0;
  const square = ludoTrackIndex(player.color, after);
  if (square !== null && !LUDO_SAFE.has(square)) {
    for (const other of state.players) if (other !== player) {
      other.tokens.forEach((progress, i) => { if (ludoTrackIndex(other.color, progress) === square) { other.tokens[i] = -1; captures++; } });
    }
  }
  const finished = after === LUDO_FINISH;
  const action = `${player.name} ${before === -1 ? 'released' : 'moved'} token ${tokenIndex + 1}${finished ? ' home' : ''}${captures ? ` and captured ${captures} ${captures === 1 ? 'token' : 'tokens'}` : ''}.`;
  if (player.tokens.every(p => p === LUDO_FINISH)) {
    state.phase = 'won'; state.winner = state.turn; remember(state, `${player.name} wins! All four tokens are home.`);
  } else if (state.die === 6 || captures || finished) {
    state.phase = 'roll'; remember(state, `${action} Bonus roll!`);
  } else nextLudoPlayer(state, action);
  return { captures, finished, won: state.phase === 'won', released: before === -1 };
}
export function chooseLudoBotMove(state) {
  const legal = legalLudoMoves(state), player = state.players[state.turn];
  let choice = legal[0], best = -Infinity;
  for (const i of legal) {
    const before = player.tokens[i], after = before < 0 ? 0 : before + state.die;
    const square = ludoTrackIndex(player.color, after);
    let score = after === LUDO_FINISH ? 1000 : (before < 0 ? 55 : after * 0.6);
    if (square !== null) {
      if (LUDO_SAFE.has(square)) score += 28;
      else for (const other of state.players) if (other !== player) for (const progress of other.tokens) {
        const otherSquare = ludoTrackIndex(other.color, progress);
        if (otherSquare === square) score += 140;
        if (otherSquare !== null && (square - otherSquare + 52) % 52 >= 1 && (square - otherSquare + 52) % 52 <= 6) score -= 12;
      }
    } else score += 40;
    if (score > best) { best = score; choice = i; }
  }
  return choice;
}

function boardSvg() {
  let content = '<rect width="600" height="600" rx="5" fill="#17223b"/>';
  const square = (x, y, fill, stroke = '#21304c') => `<rect x="${x * 40}" y="${y * 40}" width="40" height="40" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  for (const [x,y] of LUDO_TRACK) content += square(x,y,'#e8edf9');
  for (const color of LUDO_COLORS) {
    const [qx,qy] = { red:[0,0],green:[9,0],yellow:[9,9],blue:[0,9] }[color];
    content += `<rect x="${qx*40}" y="${qy*40}" width="240" height="240" fill="${COLOR[color]}" stroke="#10172a" stroke-width="4"/><rect x="${qx*40+36}" y="${qy*40+36}" width="168" height="168" rx="8" fill="#f4f5fa" stroke="${COLOR_DARK[color]}" stroke-width="3"/>`;
    for (const [hx,hy] of [[1.8,1.8],[4.2,1.8],[1.8,4.2],[4.2,4.2]]) content += `<circle cx="${(qx+hx)*40}" cy="${(qy+hy)*40}" r="19" fill="${COLOR[color]}" opacity=".22" stroke="${COLOR_DARK[color]}" stroke-width="2"/>`;
    for (const [x,y] of LUDO_HOME[color].slice(0,5)) content += square(x,y,COLOR[color]);
    const [sx,sy] = LUDO_TRACK[LUDO_OFFSETS[color]];
    content += square(sx,sy,COLOR[color]);
  }
  content += '<path d="M240 240L300 300L240 360Z" fill="#fb7185"/><path d="M240 240L360 240L300 300Z" fill="#6ee7a0"/><path d="M360 240L360 360L300 300Z" fill="#facc15"/><path d="M240 360L300 300L360 360Z" fill="#78a9ff"/>';
  for (const i of LUDO_SAFE) {
    const [x,y] = LUDO_TRACK[i], cx=x*40+20,cy=y*40+20;
    content += `<path d="M${cx},${cy-12}l3.5,8h9l-7,5 2.5,8-8,-5-8,5 2.5,-8-7,-5h9z" fill="#465372" opacity=".8"/>`;
  }
  // Direction arrows on the four approach squares.
  content += '<path d="M8 254h21v-6l10 12-10 12v-6H8z" fill="#a92e52"/><path d="M334 8v21h-6l12 10 12-10h-6V8z" fill="#218352"/><path d="M592 334h-21v-6l-10 12 10 12v-6h21z" fill="#a16207"/><path d="M254 592v-21h-6l12-10 12 10h-6v21z" fill="#345daf"/>';
  return `<svg viewBox="0 0 600 600" role="img" aria-label="Ludo board: red top left, green top right, yellow bottom right, blue bottom left. Stars mark safe squares." xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}
function dieSvg(value) {
  const dots = { 1:[[30,30]], 2:[[17,17],[43,43]], 3:[[17,17],[30,30],[43,43]], 4:[[17,17],[43,17],[17,43],[43,43]], 5:[[17,17],[43,17],[30,30],[17,43],[43,43]], 6:[[17,16],[43,16],[17,30],[43,30],[17,44],[43,44]] }[value || 1];
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="2" y="2" width="56" height="56" rx="9" fill="#ffefaf" stroke="#a16207" stroke-width="3"/>${dots.map(([x,y])=>`<rect x="${x-4}" y="${y-4}" width="8" height="8" rx="1" fill="#302640"/>`).join('')}</svg>`;
}

export function initLudo() {
  if (document.getElementById('ludo-modal')) return;
  const dialog = document.createElement('dialog'); dialog.id='ludo-modal'; dialog.className='ludo-modal'; dialog.setAttribute('aria-labelledby','ludo-dialog-title');
  dialog.innerHTML = `<div class="ludo-shell"><header class="ludo-header"><div><span class="ludo-eyebrow">IMON ARCADE · TABLETOP QUEST</span><h2 id="ludo-dialog-title">Pixel Ludo</h2></div><button type="button" class="ludo-close" aria-label="Close Ludo">×</button></header>
  <section class="ludo-setup"><div class="ludo-setup-intro"><span aria-hidden="true">⚄</span><h3>Four tokens.<br>One colorful adventure.</h3><p>Bring a friend, challenge a computer, or gather a local party. First to bring all four tokens home wins.</p></div><div class="ludo-seat-pickers">${LUDO_COLORS.map((color,i)=>`<label style="--seat:${COLOR[color]}"><span class="ludo-seat-dot"></span><span>${title(color)}</span><select data-seat="${color}" aria-label="${title(color)} player"><option value="off"${i>1?' selected':''}>Not playing</option><option value="human"${i===0?' selected':''}>Human</option><option value="bot"${i===1?' selected':''}>Computer</option></select></label>`).join('')}</div><p class="ludo-setup-error" role="alert"></p><button type="button" class="ludo-primary ludo-begin">START MATCH <span aria-hidden="true">▶</span></button><p class="ludo-local-note">2–4 players · One device · No account needed</p></section>
  <section class="ludo-match" hidden><div class="ludo-player-strip"></div><div class="ludo-layout"><div><div class="ludo-board">${boardSvg()}<div class="ludo-token-layer"></div></div><div class="ludo-move-options" role="group" aria-label="Choose a token"></div></div><aside class="ludo-sidebar"><p class="ludo-turn-label"></p><button type="button" class="ludo-roll"><span class="ludo-die-art">${dieSvg(1)}</span><strong>ROLL DIE</strong></button><p class="ludo-roll-result">Your adventure begins here.</p><p class="ludo-status" aria-live="polite" aria-atomic="true"></p><div class="ludo-winner" hidden><span aria-hidden="true">★</span><strong>QUEST COMPLETE</strong></div><div class="ludo-match-actions"><button type="button" class="ludo-secondary ludo-restart">Restart match</button><button type="button" class="ludo-secondary ludo-change">Change players</button></div><details class="ludo-rules"><summary>How to play & rules</summary><ul><li>Roll a 6 to release a token from its yard. Releasing uses the whole roll.</li><li>Follow the track, then enter your color's home lane. You need the exact roll to finish.</li><li>Landing on a rival on an unstarred track square sends every rival token there back to its yard.</li><li>All colored starting squares and starred squares are safe. Tokens may share them.</li><li>A 6, capture, or finished token gives one bonus roll. Three consecutive 6s forfeit the third roll; earlier moves stay.</li><li>Stacks never block movement. Same-color tokens may share squares. There is no capture requirement for entering home.</li><li>The shared board has 52 track squares. Each token travels 51 track squares and its six-cell home lane. Bring all four tokens home to win.</li></ul><p>This is IMON's local Ludo variant. Human players share this device; computer moves happen automatically.</p></details></aside></div></section></div>`;
  document.body.append(dialog);
  const $=selector=>dialog.querySelector(selector);
  let state=null, seats=null, opener=null, busy=false, botTimer=null, rollTimer=null, oldOverflow='', version=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function stopTimers() { clearTimeout(botTimer);clearTimeout(rollTimer);botTimer=null;rollTimer=null;busy=false;version++;$('.ludo-roll').classList.remove('is-rolling'); }
  function playerCanAct() { return state && state.phase!=='won' && state.players[state.turn].kind==='human' && !busy; }
  function coordsFor(player,i) {
    const progress=player.tokens[i];
    if(progress>=0){const [x,y]=ludoPosition(player.color,progress);return{x:x+.5,y:y+.5};}
    const [qx,qy]={red:[0,0],green:[9,0],yellow:[9,9],blue:[0,9]}[player.color];
    return{x:qx+[1.8,4.2,1.8,4.2][i],y:qy+[1.8,1.8,4.2,4.2][i]};
  }
  function renderTokens() {
    const layer=$('.ludo-token-layer');layer.replaceChildren();
    const tokens=state.players.flatMap((p,pi)=>p.tokens.map((progress,i)=>({p,pi,i,progress,...coordsFor(p,i)})));
    const groups=new Map();for(const token of tokens){const key=`${token.x}:${token.y}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(token);}
    const legal=state.phase==='move'?legalLudoMoves(state):[];
    for(const group of groups.values()) group.forEach((token,gi)=>{
      const {p,pi,i,progress}=token, cols=Math.ceil(Math.sqrt(group.length)), rows=Math.ceil(group.length/cols),size=group.length===1?4.5:Math.min(3.5,6/cols);
      const x=token.x+(gi%cols-(cols-1)/2)*size/100*15, y=token.y+(Math.floor(gi/cols)-(rows-1)/2)*size/100*15;
      const button=document.createElement('button');button.type='button';button.className='ludo-token';button.textContent=String(i+1);button.dataset.token=String(i);button.dataset.player=String(pi);
      button.style.cssText=`left:${x/15*100}%;top:${y/15*100}%;width:${size}%;height:${size}%;--token:${COLOR[p.color]};--token-dark:${COLOR_DARK[p.color]}`;
      const place=progress===-1?'in yard':progress===LUDO_FINISH?'finished':progress>50?'in home lane':`track step ${progress+1}`;
      button.setAttribute('aria-label',`${title(p.color)} token ${i+1}, ${place}`);button.title=button.getAttribute('aria-label');
      const enabled=playerCanAct()&&state.phase==='move'&&pi===state.turn&&legal.includes(i);button.disabled=!enabled;
      if(enabled)button.classList.add('is-legal');if(progress===LUDO_FINISH)button.classList.add('is-home');layer.append(button);
    });
  }
  function render() {
    if(!state)return;
    const player=state.players[state.turn],human=player.kind==='human',legal=state.phase==='move'?legalLudoMoves(state):[];
    $('.ludo-player-strip').innerHTML=state.players.map((p,i)=>`<div class="ludo-player${i===state.turn?' is-current':''}" style="--seat:${COLOR[p.color]}"><span class="ludo-seat-dot"></span><div><strong>${title(p.color)}</strong><small>${p.kind==='bot'?'Computer':'Human'} · ${p.tokens.filter(v=>v===LUDO_FINISH).length}/4 home</small></div>${i===state.turn?'<span class="ludo-turn-mark" aria-label="Current player">◀</span>':''}</div>`).join('');
    $('.ludo-turn-label').textContent=state.phase==='won'?`${title(state.players[state.winner].color)} wins!`:`${title(player.color)}'s turn`;
    $('.ludo-turn-label').style.color=COLOR[player.color];
    $('.ludo-die-art').innerHTML=dieSvg(state.die);
    $('.ludo-roll strong').textContent=busy?'ROLLING…':state.phase==='won'?'MATCH OVER':!human?'COMPUTER':state.phase==='move'?'CHOOSE TOKEN':'ROLL DIE';
    $('.ludo-roll').disabled=!playerCanAct()||state.phase!=='roll';
    $('.ludo-roll').setAttribute('aria-label',`${state.die?`Last roll ${state.die}. `:''}${human?'Roll die':'Computer is playing'}`);
    $('.ludo-roll-result').textContent=state.die?`Last roll: ${state.die}${state.sixStreak?` · ${state.sixStreak} consecutive six${state.sixStreak>1?'es':''}`:''}`:'Roll a six to leave the yard.';
    $('.ludo-status').textContent=busy?`${player.name} is rolling…`:state.message;
    $('.ludo-winner').hidden=state.phase!=='won';
    const options=$('.ludo-move-options');options.replaceChildren();
    player.tokens.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='ludo-token-option';b.dataset.token=String(i);b.dataset.player=String(state.turn);b.style.setProperty('--seat',COLOR[player.color]);b.disabled=!playerCanAct()||state.phase!=='move'||!legal.includes(i);b.innerHTML=`<strong>TOKEN ${i+1}</strong><span>${p===-1?'In yard':p===LUDO_FINISH?'Home ✓':p>50?'Home lane':`Step ${p+1}`}</span>`;options.append(b);});
    renderTokens();
  }
  function focusHumanAction() {
    if (!dialog.open || !state) return;
    if (state.phase === 'won') {
      $('.ludo-status').setAttribute('tabindex', '-1');
      $('.ludo-status').focus({ preventScroll: true });
    } else if (state.players[state.turn].kind === 'human' && !busy) {
      const target = state.phase === 'move' ? $('.ludo-token-option:not(:disabled)') : $('.ludo-roll');
      target?.focus({ preventScroll: true });
    }
  }
  function scheduleBot() {
    clearTimeout(botTimer);botTimer=null;
    if(!dialog.open||document.hidden||busy||!state||state.phase==='won'||state.players[state.turn].kind!=='bot')return;
    const v=version;botTimer=setTimeout(()=>{if(v!==version||!dialog.open)return;if(state.phase==='roll')performRoll();else performMove(chooseLudoBotMove(state));},650);
  }
  function performRoll() {
    if(!state||state.phase!=='roll'||busy)return;
    busy=true;render();$('.ludo-roll').classList.add('is-rolling');playSound('roll');const v=version;
    rollTimer=setTimeout(()=>{if(v!==version||!dialog.open)return;busy=false;$('.ludo-roll').classList.remove('is-rolling');rollLudo(state,Math.floor(Math.random()*6)+1);render();focusHumanAction();scheduleBot();},reduced.matches?50:430);
  }
  function performMove(i) {
    if(!state||state.phase!=='move'||busy)return;
    const result=moveLudo(state,i);playSound(result.won?'win':result.captures?'hit':result.finished?'coin':'move');render();focusHumanAction();scheduleBot();
  }
  function begin(newSeats) {
    stopTimers();seats=newSeats;state=createLudoGame(seats);$('.ludo-setup').hidden=true;$('.ludo-match').hidden=false;render();playSound('start');scheduleBot();$('.ludo-roll').focus({preventScroll:true});
  }
  function showSetup() {stopTimers();state=null;$('.ludo-setup').hidden=false;$('.ludo-match').hidden=true;$('.ludo-setup-error').textContent='';}
  document.addEventListener('click',event=>{const trigger=event.target.closest('button[data-game="ludo"]');if(!trigger)return;event.preventDefault();opener=trigger;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';showSetup();dialog.showModal();$('.ludo-begin').focus({preventScroll:true});});
  $('.ludo-begin').addEventListener('click',()=>{const selected=[...dialog.querySelectorAll('[data-seat]')].map(el=>({color:el.dataset.seat,kind:el.value})).filter(s=>s.kind!=='off');if(selected.length<2||selected.length>4){$('.ludo-setup-error').textContent='Choose at least two players to start.';return;}if(!selected.some(s=>s.kind==='human')){$('.ludo-setup-error').textContent='Choose at least one human player.';return;}begin(selected);});
  $('.ludo-roll').addEventListener('click',()=>{if(playerCanAct()&&state.phase==='roll')performRoll();});
  $('.ludo-match').addEventListener('click',event=>{const b=event.target.closest('[data-token]');if(!b||b.disabled||!playerCanAct()||Number(b.dataset.player)!==state.turn)return;performMove(Number(b.dataset.token));});
  $('.ludo-restart').addEventListener('click',()=>begin(seats));
  $('.ludo-change').addEventListener('click',()=>{showSetup();$('.ludo-begin').focus({preventScroll:true});});
  $('.ludo-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{stopTimers();document.body.style.overflow=oldOverflow;opener?.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(!dialog.open)return;if(document.hidden){stopTimers();render();}else scheduleBot();});
}
