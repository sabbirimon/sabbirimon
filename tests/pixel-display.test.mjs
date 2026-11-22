import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { charRects, textRects, readLines, parseGradient, parseShadow, splitTopLevel, renderPixelDisplay, renderDisplayLines, initPixelDisplay } from '../docs/pixel-display.js';

const docs = new URL('../docs/', import.meta.url).pathname;

/* -- the glyphs ------------------------------------------------------- */

test('every glyph is the same size',()=>{
 const sizes=new Set();
 for(const character of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'){
  const rects=charRects(character);
  assert.ok(rects.length>0,`${character} draws nothing`);
  const maxY=Math.max(...rects.map(rect=>rect[1]+rect[3]));
  sizes.add(maxY);
 }
 assert.equal(sizes.size,1,'the letters do not share one height');
});

test('a letter is drawn from filled pixels only',()=>{
 for(const rect of charRects('A')){
  assert.equal(rect[2],2,'the pixels are not square');
  assert.equal(rect[3],2,'the pixels are not square');
 }
});

test('an unknown character draws nothing at all',()=>{
 assert.deepEqual(charRects('☃'),[]);
 assert.deepEqual(charRects(''),[]);
});

test('lower case is folded to upper case',()=>{
 assert.deepEqual(charRects('a'),charRects('A'));
});

test('textRects lays the letters out side by side',()=>{
 const {rects,width}=textRects('AB');
 assert.ok(rects.length>charRects('A').length+charRects('B').length-1,'the letters overlap');
 assert.ok(width>0);
});

test('textRects measures an empty string as nothing',()=>{
 const {rects,width,height}=textRects('');
 assert.equal(rects.length,0);
 assert.equal(width,0);
 assert.ok(height>0,'the line still has a height');
});

test('the letters fill the drawing exactly',()=>{
 const {rects,height}=textRects('A');
 const bottom=Math.max(...rects.map(rect=>rect[1]+rect[3]));
 assert.equal(bottom,height,'the drawing has padding below the letters');
});

/* -- the stylesheet --------------------------------------------------- */

test('splitTopLevel does not cut a colour in half',()=>{
 assert.deepEqual(splitTopLevel('3px 3px #153d36'),['3px 3px #153d36']);
 assert.deepEqual(splitTopLevel('rgb(21, 61, 54), 0 2px'),['rgb(21, 61, 54)','0 2px']);
 assert.deepEqual(splitTopLevel('none'),['none']);
});

test('parseGradient reads the stops of a heading gradient',()=>{
 const gradient=parseGradient('linear-gradient(115deg, #ff69df 8%, #ff73bd 48%, #ff786e 94%)');
 assert.ok(gradient);
 assert.equal(gradient.stops.length,3);
 assert.equal(gradient.stops[0].color,'#ff69df');
 assert.equal(gradient.stops[0].offset,0.08);
 assert.equal(gradient.stops[2].offset,0.94);
});

test('parseGradient is not fooled by the commas inside a colour',()=>{
 const gradient=parseGradient('linear-gradient(90deg, rgba(255, 105, 223, 0.8) 0%, #ff786e 100%)');
 assert.equal(gradient.stops.length,2);
 assert.equal(gradient.stops[0].color,'rgba(255, 105, 223, 0.8)');
});

test('parseGradient refuses what it cannot draw',()=>{
 assert.equal(parseGradient('none'),null);
 assert.equal(parseGradient(null),null);
 assert.equal(parseGradient('radial-gradient(circle, #fff, #000)'),null);
 assert.equal(parseGradient('linear-gradient(115deg, nonsense)'),null);
});

test('parseShadow reads the offsets and the colour',()=>{
 const shadow=parseShadow('3px 3px #153d36',26);
 assert.ok(shadow);
 assert.equal(shadow.dx,3);
 assert.equal(shadow.dy,3);
 assert.equal(shadow.color,'#153d36');
 assert.equal(shadow.fontSize,26);
});

test('parseShadow reads a shadow written colour first',()=>{
 const shadow=parseShadow('rgb(21, 61, 54) 3px 3px',26);
 assert.ok(shadow,'the commas inside the colour broke the parse');
 assert.equal(shadow.dx,3);
 assert.equal(shadow.dy,3);
 assert.equal(shadow.color,'rgb(21, 61, 54)');
});

test('parseShadow reads a shadow given in ems',()=>{
 const shadow=parseShadow('0.1em 0.1em #000',20);
 assert.equal(shadow.dx,2);
 assert.equal(shadow.dy,2);
});

test('parseShadow refuses what it cannot draw',()=>{
 assert.equal(parseShadow('none',16),null);
 assert.equal(parseShadow(null,16),null);
 assert.equal(parseShadow('3px 3px',16),null,'a shadow with no colour is not drawn');
});

/* -- the drawing ------------------------------------------------------ */

test('a single line is drawn one em tall',()=>{
 const svg=renderDisplayLines([[{text:'HELLO',color:'#fff'}]]);
 assert.match(svg,/viewBox="0 0 \d+ 14"/,'the drawing is one line of letters tall');
 assert.match(svg,/style="width: [\d.]+em; height: auto"/);
});

test('two lines are drawn two ems tall plus the gap',()=>{
 const one=renderDisplayLines([[{text:'HELLO',color:'#fff'}]]);
 const two=renderDisplayLines([[{text:'HELLO',color:'#fff'}],[{text:'WORLD',color:'#fff'}]]);
 const heightOf=svg=>Number(svg.match(/viewBox="0 0 \d+ (\d+)"/)[1]);
 assert.equal(heightOf(two),heightOf(one)*2+4,'the two lines are not stacked with a gap');
});

test('the drawing carries an accessible name',()=>{
 const svg=renderDisplayLines([[{text:'HELLO WORLD',color:'#fff'}]]);
 assert.match(svg,/aria-label="HELLO WORLD"/);
 assert.match(svg,/role="img"/);
});

test('a label is escaped so it cannot break the markup',()=>{
 const svg=renderDisplayLines([[{text:'A & B',color:'#fff'}]]);
 assert.match(svg,/aria-label="A &amp; B"/);
 assert.ok(!svg.includes('aria-label="A & B"'));
});

test('a coloured word keeps its own colour',()=>{
 const svg=renderDisplayLines([[{text:'ONE ',color:'rgb(1, 2, 3)'},{text:'TWO',color:'rgb(4, 5, 6)'}]]);
 assert.ok(svg.includes('fill="rgb(1, 2, 3)"'));
 assert.ok(svg.includes('fill="rgb(4, 5, 6)"'));
});

test('a gradient heading is filled by the gradient',()=>{
 const gradient=parseGradient('linear-gradient(115deg, #ff69df 8%, #ff786e 94%)');
 const svg=renderDisplayLines([[{text:'HELLO',color:null}]],gradient);
 assert.match(svg,/fill="url\(#display-gradient\)"/);
 assert.match(svg,/<linearGradient[^>]*id="display-gradient"/);
 assert.ok(svg.includes('stop-color="#ff69df"'));
});

test('a shadowed heading is drawn with the shadow',()=>{
 const shadow=parseShadow('3px 3px #153d36',26);
 const svg=renderDisplayLines([[{text:'HELLO',color:'#aafa87'}]],null,shadow);
 assert.match(svg,/filter="url\(#display-shadow\)"/);
 assert.match(svg,/<feDropShadow[^>]*flood-color="#153d36"/);
});

test('a heading with no shadow is not given one',()=>{
 const svg=renderDisplayLines([[{text:'HELLO',color:'#aafa87'}]]);
 assert.ok(!svg.includes('display-shadow'));
 assert.ok(!svg.includes('feDropShadow'));
});

test('renderPixelDisplay draws one line with a fixed size',()=>{
 const svg=renderPixelDisplay('HI');
 assert.match(svg,/viewBox="0 0 \d+ 14"/);
 assert.match(svg,/width="\d+" height="\d+"/);
});

test('an empty drawing is nothing at all',()=>{
 assert.equal(renderDisplayLines([]),'');
});

/* -- the markup ------------------------------------------------------- */

/**
 * A very small DOM stand-in.
 *
 * The site has no npm dependencies, so the tests cannot reach for a real
 * DOM library. This builds just enough of one for the headings to be read:
 * an element with child nodes, a dataset, and the stylesheet lookup the
 * module uses to ask for the colour of a word.
 */
function makeElement(tag='div',text=''){
 const element={
  tagName:tag.toUpperCase(),
  nodeType:1,
  children:[],
  childNodes:[],
  dataset:{},
  style:{},
  attributes:{},
  textContent:text,
  innerHTML:'',
  parentNode:null,
  setAttribute(name,value){ this.attributes[name]=value; },
  getAttribute(name){ return name in this.attributes ? this.attributes[name] : null; },
  append(...nodes){
   for(const node of nodes){ node.parentNode=this; this.children.push(node); this.childNodes.push(node); }
  },
  querySelectorAll(){ return []; }
 };
 // An element given text holds it as a text child, the way the browser
 // holds it.
 if(text) element.append(textNode(text));
 return element;
}

function textNode(text){
 return { nodeType:3, textContent:text, childNodes:[], dataset:{} };
}

/**
 * Install a document whose stylesheet answers for the nodes it is given.
 *
 * Every node is given a style key, and the stylesheet is asked for by
 * that key. A node with no key gets the plain default style.
 */
function withStyles(styles={}){
 const previous=globalThis.document;
 globalThis.document={
  createElement:()=>makeElement(),
  querySelectorAll:()=>[]
 };
 const view={
  getComputedStyle(node){
   return styles[node.dataset?.styleKey]||{color:'rgb(0, 0, 0)',fontSize:'26px',textShadow:'none',backgroundImage:'none'};
  }
 };
 for(const node of styles.__nodes||[]){
  node.ownerDocument={ defaultView:view };
  if(node.childNodes) for(const child of node.childNodes) child.ownerDocument={ defaultView:view };
 }
 return ()=>{ globalThis.document=previous; };
}

test('a heading is read as the lines it is written as',()=>{
 const heading=makeElement('h2');
 const first=makeElement('span','HELLO');
 const second=makeElement('span','WORLD');
 heading.append(first);
 heading.append(textNode(' '));
 heading.append(second);
 const styleKey='heading';
 heading.dataset.styleKey=styleKey;
 const restore=withStyles({ [styleKey]:{color:'rgb(10, 20, 30)',fontSize:'26px',textShadow:'none',backgroundImage:'none'}, __nodes:[heading,first,second] });
 try{
  const lines=readLines(heading);
  assert.equal(lines.length,1,'one line, one break-free heading');
  assert.equal(lines[0].length,1,'one run when every word has the same colour');
  assert.equal(lines[0][0].text,'HELLO WORLD');
 } finally { restore(); }
});

test('a break in a heading is a break in the drawing',()=>{
 const heading=makeElement('h2');
 heading.append(textNode("LET'S CODE"));
 const br=makeElement('br');
 heading.append(br);
 heading.append(textNode('TOGETHER'));
 const styleKey='heading';
 heading.dataset.styleKey=styleKey;
 const restore=withStyles({ [styleKey]:{color:'rgb(10, 20, 30)',fontSize:'26px',textShadow:'none',backgroundImage:'none'}, __nodes:[heading] });
 try{
  const lines=readLines(heading);
  assert.equal(lines.length,2);
  assert.equal(lines[0][0].text,"LET'S CODE");
  assert.equal(lines[1][0].text,'TOGETHER');
 } finally { restore(); }
});

test('the text of a heading is kept for anyone without the drawing',()=>{
 const heading=makeElement('h2');
 heading.append(textNode('HELLO'));
 heading.dataset.styleKey='heading';
 const restore=withStyles({ __nodes:[heading] });
 try{
  const controller=initPixelDisplay({ querySelectorAll:()=>[heading] });
  assert.equal(controller,1);
  assert.equal(heading.dataset.pixelDisplay,'HELLO');
  assert.equal(heading.getAttribute('data-pixel-display-drawn'),'true');
 } finally { restore(); }
});

test('a heading with nothing in it is left alone',()=>{
 const heading=makeElement('h2');
 const restore=withStyles({ __nodes:[heading] });
 try{
  initPixelDisplay({ querySelectorAll:()=>[heading] });
  assert.equal(heading.dataset.pixelDisplay,undefined);
 } finally { restore(); }
});

test('a page with no headings is not an error',()=>{
 assert.equal(initPixelDisplay({ querySelectorAll:()=>[] }),0);
 assert.equal(initPixelDisplay(null),0);
});

/* -- the page --------------------------------------------------------- */

test('the page loads the display face stylesheet',()=>{
 const html=readFileSync(join(docs,'index.html'),'utf8');
 assert.ok(html.includes('href="pixel-display.css"'),'pixel-display.css is not linked');
});

test('the page draws its headings',()=>{
 const html=readFileSync(join(docs,'index.html'),'utf8');
 const marked=(html.match(/data-pixel-display(?![-\w])/g)||[]).length;
 assert.ok(marked>=6,`only ${marked} headings are marked`);
});

test('the app starts the display face',()=>{
 const app=readFileSync(join(docs,'app.js'),'utf8');
 assert.ok(app.includes("from './pixel-display.js'"),'the module is not imported');
 assert.ok(app.includes('initPixelDisplay(document)'),'the module is not started');
});
