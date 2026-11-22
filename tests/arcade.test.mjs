import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnakeState, placeSnakeFood, queueSnakeDirection, stepSnake, createSurfState, spawnSurfRow, stepSurf, SNAKE_MODES, SNAKE_MODE_CONFIG, snakeStorageKey, snakeStorageKeys, snakeLevelInterval, tickSnakeClock } from '../docs/arcade.js';
import { rotateSprite, scaleSprite, spriteBounds, spriteColors, sceneCells, wallBlocks, BOARD, SNAKE_HEADS, SNAKE_BODY, SNAKE_TAIL, SNAKE_TIP, SNAKE_FOOD, SCENES } from '../docs/arcade-sprites.js';
const random = () => 0.5;

test('food is selected only from empty cells, including the last remaining square', () => {
  const s = createSnakeState(random);
  assert.ok(!s.body.some(p => p.x === s.food.x && p.y === s.food.y));
  s.cols = 2; s.rows = 2; s.body = [{x:0,y:0},{x:1,y:0},{x:0,y:1}];
  assert.deepEqual(placeSnakeFood(s, () => 0), {x:1,y:1});
  s.body.push({x:1,y:1}); assert.equal(placeSnakeFood(s), null);
});
test('reversal and rapid queued input cannot reverse into the neck', () => {
  const s = createSnakeState(random); s.status='running';
  const sx = s.body[0].x, sy = s.body[0].y;
  assert.equal(queueSnakeDirection(s, 'left'), false);
  assert.equal(queueSnakeDirection(s, 'up'), true);
  assert.equal(queueSnakeDirection(s, 'down'), false);
  assert.equal(queueSnakeDirection(s, 'left'), true);
  assert.equal(queueSnakeDirection(s, 'down'), false);
  stepSnake(s,random); assert.deepEqual(s.body[0],{x:sx,y:sy-1});
  stepSnake(s,random); assert.deepEqual(s.body[0],{x:sx-1,y:sy-1});
});
test('growth adds exactly one cell and ten points', () => {
  const s=createSnakeState(random); s.status='running';
  s.food={x:s.body[0].x+1,y:s.body[0].y};
  assert.equal(stepSnake(s,random),'eat'); assert.equal(s.body.length,4); assert.equal(s.score,10);
});
test('a departing tail cell is traversable but the body is not', () => {
  const s=createSnakeState(random); s.status='running'; s.direction='left';
  s.body=[{x:2,y:2},{x:2,y:3},{x:1,y:3},{x:1,y:2}]; s.food={x:0,y:0};
  assert.equal(stepSnake(s,random),'move');
  s.body=[{x:2,y:2},{x:1,y:2},{x:1,y:3},{x:2,y:3}];
  assert.equal(stepSnake(s,random),'crash'); assert.equal(s.status,'over');
});
test('wall collision ends game and paused games do not advance', () => {
  const s=createSnakeState(random); s.status='paused'; const before=structuredClone(s);
  assert.equal(stepSnake(s),'idle'); assert.deepEqual(s,before);
  s.status='running';s.body=[{x:s.cols-1,y:2}];s.direction='right'; assert.equal(stepSnake(s),'crash');
});
test('filling the final board square produces a victory', () => {
  const s={cols:2,rows:2,body:[{x:0,y:0},{x:0,y:1},{x:1,y:1}],direction:'right',queue:[],food:{x:1,y:0},score:0,status:'running'};
  assert.equal(stepSnake(s,random),'win'); assert.equal(s.status,'won'); assert.equal(s.food,null);
});
test('surf rows preserve two safe lanes and only shift the gap one lane', () => {
  const s=createSurfState();
  for(let i=0;i<100;i++) {const before=s.gap;s.entities=[];spawnSurfRow(s,()=>0);assert.ok(Math.abs(s.gap-before)<=1);assert.ok(s.gap>=0&&s.gap<=6);
  for(const e of s.entities.filter(e=>e.type==='reef')) {const lane=Math.floor(e.x/90);assert.notEqual(lane,s.gap);assert.notEqual(lane,s.gap+1);}}
});
test('surf collision costs one life and invulnerability prevents repeated hits', () => {
  const s=createSurfState();s.status='running';s.spawnIn=10;
  s.entities=[{type:'reef',x:s.x,y:s.y,w:45,h:40},{type:'reef',x:s.x,y:s.y,w:45,h:40}];
  assert.ok(stepSurf(s,{},0,'normal',random).includes('hit'));assert.equal(s.lives,2);
  stepSurf(s,{},0.01,'normal',random);assert.equal(s.lives,2);
  s.invulnerable=0; s.lives=1;
  assert.ok(stepSurf(s,{},0,'normal',random).includes('crash')); assert.equal(s.status,'over');
});
test('surf coins score once and player remains inside bounds', () => {
  const s=createSurfState();s.status='running';s.spawnIn=10;s.entities=[{type:'coin',x:s.x,y:s.y,w:19,h:19}];
  assert.ok(stepSurf(s,{},0,'normal',random).includes('coin')); assert.equal(s.score,25);assert.equal(s.coins,1);
  for(let i=0;i<200;i++) stepSurf(s,{left:true,up:true},.05,'normal',random);
  assert.ok(s.x>=22&&s.y>=90);assert.equal(s.coins,1);
});
test('surf movement and distance are frame-rate independent at normal frame rates', () => {
  const a=createSurfState(),b=createSurfState();a.status=b.status='running';a.spawnIn=b.spawnIn=100;
  for(let i=0;i<60;i++)stepSurf(a,{right:true},1/60,'normal',random);
  for(let i=0;i<120;i++)stepSurf(b,{right:true},1/120,'normal',random);
  assert.ok(Math.abs(a.x-b.x)<0.01);assert.ok(Math.abs(a.distance-b.distance)<0.01);
});

/* -- the snake modes ------------------------------------------------- */

test('there are four snake modes and every one has a rule set',()=>{
  assert.deepEqual(SNAKE_MODES,['classic','walls','night','timed']);
  for(const mode of SNAKE_MODES){
    const config=SNAKE_MODE_CONFIG[mode];
    assert.ok(config,`${mode} has no configuration`);
    assert.ok(config.label);
    assert.ok(config.note);
    assert.ok(config.points>0);
  }
});

test('night mode is worth more than classic',()=>{
  assert.equal(SNAKE_MODE_CONFIG.classic.points,10);
  assert.equal(SNAKE_MODE_CONFIG.night.points,20);
});

test('night mode scores twenty points for a fruit',()=>{
  const s=createSnakeState(random,'night'); s.status='running';
  s.food={x:s.body[0].x+1,y:s.body[0].y};
  assert.equal(stepSnake(s,random),'eat'); assert.equal(s.score,20);
});

test('walls mode wraps around instead of crashing',()=>{
  const s=createSnakeState(random,'walls'); s.status='running';
  s.body=[{x:0,y:8},{x:1,y:8}]; s.direction='left'; s.food={x:22,y:22};
  assert.equal(stepSnake(s,random),'move');
  assert.deepEqual(s.body[0],{x:s.cols-1,y:8});
  assert.equal(s.status,'running');
});

test('walls mode wraps on the top and bottom edges too',()=>{
  const s=createSnakeState(random,'walls'); s.status='running';
  s.body=[{x:8,y:0},{x:8,y:1}]; s.direction='up'; s.food={x:22,y:22};
  assert.equal(stepSnake(s,random),'move');
  assert.deepEqual(s.body[0],{x:8,y:s.rows-1});
});

test('classic still dies at the wall',()=>{
  const s=createSnakeState(random,'classic'); s.status='running';
  s.body=[{x:0,y:8},{x:1,y:8}]; s.direction='left';
  assert.equal(stepSnake(s,random),'crash'); assert.equal(s.status,'over');
});

test('the classic mode keeps the old storage key',()=>{
  assert.equal(snakeStorageKey('classic','normal'),'sabbir-arcade-v1-snake-normal');
  assert.equal(snakeStorageKey('classic','easy'),'sabbir-arcade-v1-snake-easy');
  assert.equal(snakeStorageKey('classic','hard'),'sabbir-arcade-v1-snake-hard');
});

test('every other mode gets a key of its own',()=>{
  assert.equal(snakeStorageKey('walls','normal'),'sabbir-arcade-v1-snake-walls-normal');
  assert.equal(snakeStorageKey('night','hard'),'sabbir-arcade-v1-snake-night-hard');
  assert.equal(snakeStorageKey('timed','easy'),'sabbir-arcade-v1-snake-timed-easy');
});

test('there is a key for every mode and every speed',()=>{
  const keys=snakeStorageKeys();
  assert.equal(keys.length,12);
  assert.equal(new Set(keys).size,12);
});

test('the timed mode counts the clock down and ends the run at zero',()=>{
  const s=createSnakeState(random,'timed'); s.status='running';
  assert.equal(s.timeLeft,60);
  assert.equal(tickSnakeClock(s,10),null);
  assert.equal(s.timeLeft,50);
  assert.equal(tickSnakeClock(s,60),'timeout');
  assert.equal(s.status,'over');
  assert.equal(s.score,50);
});

test('the clock does nothing outside the timed mode',()=>{
  const s=createSnakeState(random,'classic'); s.status='running';
  assert.equal(tickSnakeClock(s,30),null);
  assert.equal(s.timeLeft,0);
  assert.equal(s.status,'running');
});

test('the clock stops when the game is not running',()=>{
  const s=createSnakeState(random,'timed'); s.status='paused';
  assert.equal(tickSnakeClock(s,30),null);
  assert.equal(s.timeLeft,60);
});

test('a faster level ticks sooner and the score speeds it up further',()=>{
  assert.ok(snakeLevelInterval('hard')<snakeLevelInterval('normal'));
  assert.ok(snakeLevelInterval('normal')<snakeLevelInterval('easy'));
  assert.ok(snakeLevelInterval('normal',5000)<snakeLevelInterval('normal',0));
  assert.ok(snakeLevelInterval('hard',999999)>=0.055);
});

/* -- the sprites ------------------------------------------------------ */

test('a quarter turn and back gives the same sprite',()=>{
  const table=[[4,4,10,6,'#fff']];
  assert.deepEqual(rotateSprite(rotateSprite(table,1),3),table);
});

test('a turn moves the sprite inside the cell',()=>{
  const turned=rotateSprite([[4,4,10,6,'#fff']],1);
  assert.deepEqual(turned,[[20,4,6,10,'#fff']]);
});

test('every head direction has a table and they use the same colours',()=>{
  const directions=Object.keys(SNAKE_HEADS);
  assert.deepEqual(directions.sort(),['down','left','right','up']);
  const reference=[...spriteColors(SNAKE_HEADS.right)].sort();
  for(const direction of directions) assert.deepEqual([...spriteColors(SNAKE_HEADS[direction])].sort(),reference);
});

test('no sprite draws outside its own cell',()=>{
  for(const table of [SNAKE_HEADS.right,SNAKE_HEADS.up,SNAKE_HEADS.down,SNAKE_HEADS.left,SNAKE_BODY,SNAKE_TAIL,SNAKE_TIP,SNAKE_FOOD.apple,SNAKE_FOOD.gold]){
    const bounds=spriteBounds(table);
    assert.ok(bounds.minX>=0&&bounds.minY>=0,`a sprite starts at ${bounds.minX},${bounds.minY}`);
    assert.ok(bounds.maxX<=30&&bounds.maxY<=30,`a sprite ends at ${bounds.maxX},${bounds.maxY}`);
  }
});

test('the head reaches further than the tail tip, so the snake tapers',()=>{
  const head=spriteBounds(SNAKE_HEADS.right), tip=spriteBounds(SNAKE_TIP);
  // The head pushes out past the body, and the tail end narrows to a point.
  assert.ok(head.maxX>tip.maxX,'the head does not reach past the tail');
  assert.ok(tip.maxX-tip.minX<30,'the tail tip is not narrower than a cell');
});

test('the body fills the cell so the segments join up',()=>{
  const bounds=spriteBounds(SNAKE_BODY);
  assert.equal(bounds.minX,0);
  assert.equal(bounds.maxX,30);
});

test('every mode has a scene of its own',()=>{
  for(const mode of SNAKE_MODES) assert.ok(SCENES[mode],`${mode} has no scene`);
  assert.notEqual(SCENES.classic.ground,SCENES.night.ground);
  assert.notEqual(SCENES.classic.ground,SCENES.walls.ground);
});

test('the scattered decoration is the same every time',()=>{
  const first=sceneCells(SCENES.classic,24,16,'classic');
  const second=sceneCells(SCENES.classic,24,16,'classic');
  assert.deepEqual(first,second);
  assert.ok(first.length>0);
  for(const cell of first) assert.ok(cell.x>=0&&cell.x<24&&cell.y>=0&&cell.y<16);
});

test('the board leaves room for the wall outside the playfield',()=>{
  const s=createSnakeState(random);
  assert.equal(s.cols,BOARD.cols);
  assert.equal(s.rows,BOARD.rows);
  // The playfield has to fit inside the canvas with a margin for the wall.
  assert.ok(BOARD.margin*2+BOARD.width<=1024);
  assert.ok(BOARD.margin*2+BOARD.height<=768);
});

test('the board is wide enough that the snake has room to run',()=>{
  // A cramped board kills the snake in under two seconds, which feels like
  // the wall is broken rather than the player being out of space.
  assert.ok(BOARD.cols>=24,`the board is only ${BOARD.cols} columns wide`);
  assert.ok(BOARD.rows>=14,`the board is only ${BOARD.rows} rows tall`);
});

test('the snake starts in the middle of the board',()=>{
  const s=createSnakeState(random);
  const head=s.body[0];
  assert.ok(head.x>BOARD.cols/4&&head.x<BOARD.cols*3/4);
  assert.ok(head.y>BOARD.rows/4&&head.y<BOARD.rows*3/4);
});

test('a sprite scaled to the cell still fits inside the cell',()=>{
  const scaled=scaleSprite(SNAKE_HEADS.right,BOARD.cell);
  const bounds=spriteBounds(scaled);
  assert.ok(bounds.minX>=0&&bounds.minY>=0);
  assert.ok(bounds.maxX<=BOARD.cell&&bounds.maxY<=BOARD.cell);
});

test('scaling a sprite to the cell keeps its shape',()=>{
  const scaled=scaleSprite(SNAKE_HEADS.right,BOARD.cell);
  assert.equal(scaled.length,SNAKE_HEADS.right.length);
  for(const rect of scaled) assert.ok(rect[2]>=1&&rect[3]>=1,'a rectangle shrank away');
});

test('the wall is drawn outside the playfield, not over it',()=>{
  const blocks=wallBlocks(BOARD);
  assert.ok(blocks.length>0);
  for(const [x,y,w,h] of blocks){
    const overlapsX=x<BOARD.margin+BOARD.width&&x+w>BOARD.margin;
    const overlapsY=y<BOARD.margin+BOARD.height&&y+h>BOARD.margin;
    assert.ok(!(overlapsX&&overlapsY),`a wall block at ${x},${y} sits on the playfield`);
  }
});

test('the snake dies exactly where the wall is drawn',()=>{
  const s=createSnakeState(random,'classic'); s.status='running';
  s.body=[{x:BOARD.cols-1,y:4},{x:BOARD.cols-2,y:4}]; s.direction='right';
  assert.equal(stepSnake(s),'crash');
  assert.equal(s.status,'over');
});
