import test from 'node:test';
import assert from 'node:assert/strict';
import {LUDO_TRACK,LUDO_HOME,LUDO_SAFE,LUDO_FINISH,createLudoGame,ludoTrackIndex,ludoPosition,legalLudoMoves,rollLudo,moveLudo,chooseLudoBotMove} from '../docs/ludo.js';
const game=()=>createLudoGame();
test('board has 52 unique track cells, eight safe squares, and six-cell color home lanes',()=>{
 assert.equal(LUDO_TRACK.length,52);assert.equal(new Set(LUDO_TRACK.map(p=>p.join(','))).size,52);assert.equal(LUDO_SAFE.size,8);
 for(const lane of Object.values(LUDO_HOME))assert.equal(lane.length,6);
 assert.deepEqual(ludoPosition('red',50),[0,7]);assert.deepEqual(ludoPosition('red',51),[1,7]);assert.deepEqual(ludoPosition('green',50),[7,0]);assert.deepEqual(ludoPosition('green',51),[7,1]);
});
test('setup validates distinct players and initializes four tokens each',()=>{
 const s=game();assert.equal(s.players.length,2);assert.deepEqual(s.players[0].tokens,[-1,-1,-1,-1]);assert.equal(s.phase,'roll');
 assert.throws(()=>createLudoGame([{color:'red',kind:'human'}]));assert.throws(()=>createLudoGame([{color:'red',kind:'human'},{color:'red',kind:'bot'}]));
});
test('non-six cannot release tokens and automatically passes a blocked turn',()=>{
 const s=game();const r=rollLudo(s,3);assert.deepEqual(r.legal,[]);assert.equal(s.turn,1);assert.equal(s.phase,'roll');assert.deepEqual(s.players[0].tokens,[-1,-1,-1,-1]);
});
test('a six releases to the correct starting square and grants a bonus roll',()=>{
 const s=game();assert.deepEqual(rollLudo(s,6).legal,[0,1,2,3]);moveLudo(s,0);assert.equal(s.players[0].tokens[0],0);assert.equal(s.turn,0);assert.equal(s.phase,'roll');assert.equal(ludoTrackIndex('red',0),0);assert.equal(ludoTrackIndex('green',0),13);
});
test('third consecutive six forfeits that roll without undoing earlier moves',()=>{
 const s=game();rollLudo(s,6);moveLudo(s,0);rollLudo(s,6);moveLudo(s,0);assert.equal(s.players[0].tokens[0],6);const result=rollLudo(s,6);assert.equal(result.thirdSix,true);assert.equal(s.turn,1);assert.equal(s.players[0].tokens[0],6);assert.equal(s.sixStreak,0);
});
test('exact finish is required; overshoot and finished tokens are excluded',()=>{
 const s=game();s.players[0].tokens=[55,56,50,-1];rollLudo(s,2);assert.deepEqual(legalLudoMoves(s),[2]);moveLudo(s,2);assert.equal(s.players[0].tokens[2],52);assert.equal(s.turn,1);
});
test('finishing grants a bonus roll and a completed token cannot move again',()=>{
 const s=game();s.players[0].tokens=[55,0,-1,-1];rollLudo(s,1);const result=moveLudo(s,0);assert.equal(result.finished,true);assert.equal(s.phase,'roll');assert.equal(s.turn,0);assert.equal(s.players[0].tokens[0],56);rollLudo(s,1);assert.deepEqual(legalLudoMoves(s),[1]);
});
test('landing on an unsafe rival stack captures every token and grants a bonus roll',()=>{
 const s=game();s.players[0].tokens[0]=7;s.players[1].tokens=[49,49,-1,-1];rollLudo(s,3);const r=moveLudo(s,0);assert.equal(r.captures,2);assert.deepEqual(s.players[1].tokens,[-1,-1,-1,-1]);assert.equal(s.turn,0);assert.equal(s.phase,'roll');
});
test('safe starting squares protect rival tokens and allow sharing',()=>{
 const s=game();s.players[0].tokens[0]=10;s.players[1].tokens[0]=0;rollLudo(s,3);const r=moveLudo(s,0);assert.equal(r.captures,0);assert.equal(s.players[1].tokens[0],0);assert.equal(s.turn,1);assert.equal(ludoTrackIndex('red',13),ludoTrackIndex('green',0));
});
test('same-color stacks are legal and never block passing tokens',()=>{
 const s=game();s.players[0].tokens=[2,5,5,8];rollLudo(s,3);moveLudo(s,0);assert.deepEqual(s.players[0].tokens,[5,5,5,8]);
});
test('all four tokens must finish to win and winner ends all further moves',()=>{
 const s=game();s.players[0].tokens=[56,56,56,55];rollLudo(s,1);const r=moveLudo(s,3);assert.equal(r.won,true);assert.equal(s.phase,'won');assert.equal(s.winner,0);assert.deepEqual(legalLudoMoves(s),[]);assert.throws(()=>rollLudo(s,3));
});
test('dice and turn phase reject invalid operations',()=>{
 const s=game();assert.throws(()=>rollLudo(s,7));assert.throws(()=>rollLudo(s,0));assert.throws(()=>moveLudo(s,0));rollLudo(s,6);assert.throws(()=>rollLudo(s,1));assert.throws(()=>moveLudo(s,4));
});
test('a six with no legal move grants another roll, and a non-six resets the streak',()=>{
 const s=game();s.players[0].tokens=[55,56,56,56];rollLudo(s,6);assert.equal(s.turn,0);assert.equal(s.phase,'roll');assert.equal(s.sixStreak,1);rollLudo(s,1);assert.equal(s.sixStreak,0);
});
test('bot always chooses a legal move and prioritizes finishing',()=>{
 const s=game();s.players[0].tokens=[55,10,-1,-1];rollLudo(s,1);assert.equal(chooseLudoBotMove(s),0);
 const c=game();c.players[0].tokens=[7,2,-1,-1];c.players[1].tokens[0]=49;rollLudo(c,3);assert.equal(chooseLudoBotMove(c),0);
});
test('four-player turns rotate through all active seats',()=>{
 const s=createLudoGame(['red','green','yellow','blue'].map(color=>({color,kind:'human'})));for(let i=1;i<=4;i++){rollLudo(s,2);assert.equal(s.turn,i%4);}
});

test('a full seeded four-player match reaches a valid winner without stalling',()=>{
 const s=createLudoGame(['red','green','yellow','blue'].map(color=>({color,kind:'bot'})));
 let seed=123456789, actions=0;
 const die=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return 1+Math.floor(seed/4294967296*6);};
 while(s.phase!=='won'&&actions<10000){if(s.phase==='roll')rollLudo(s,die());else moveLudo(s,chooseLudoBotMove(s));actions++;
  assert.ok(s.players.every(p=>p.tokens.every(v=>Number.isInteger(v)&&v>=-1&&v<=LUDO_FINISH)));
 }
 assert.equal(s.phase,'won');assert.ok(actions<10000);assert.ok(s.players[s.winner].tokens.every(v=>v===LUDO_FINISH));
});
