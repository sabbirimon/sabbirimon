import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VALUE_COLOURS, VALUE_MARKS, valueKind, formatValue, formatJson, formatLine, initTerminalPanel } from '../docs/lab-output.js';

const docs = new URL('../docs/', import.meta.url).pathname;

/* -- what a value is ------------------------------------------------- */

test('the hint decides what a value is',()=>{
 assert.equal(valueKind('hello','text'),'text');
 assert.equal(valueKind('42','number'),'number');
 assert.equal(valueKind('true','boolean'),'boolean');
 assert.equal(valueKind('undefined','empty'),'empty');
});

test('a value with no hint is plain',()=>{
 assert.equal(valueKind('hello'),'plain');
 assert.equal(valueKind('hello','nonsense'),'plain');
});

test('undefined and null read as empty',()=>{
 assert.equal(valueKind('undefined'),'empty');
 assert.equal(valueKind('null'),'empty');
});

/* -- how a value is drawn --------------------------------------------- */

test('a string is drawn in the colour of text',()=>{
 const runs=formatValue('hello','text');
 assert.equal(runs.length,1);
 assert.equal(runs[0].colour,VALUE_COLOURS.text);
 assert.equal(runs[0].text,`${VALUE_MARKS.text}hello${VALUE_MARKS.text}`);
});

test('a number is drawn in the colour of a number',()=>{
 const runs=formatValue('42','number');
 assert.equal(runs[0].colour,VALUE_COLOURS.number);
 assert.equal(runs[0].text,'42');
});

test('a boolean is drawn in the colour of a boolean',()=>{
 assert.equal(formatValue('true','boolean')[0].colour,VALUE_COLOURS.boolean);
});

test('nothing at all is drawn in the colour of nothing',()=>{
 assert.equal(formatValue('undefined','empty')[0].colour,VALUE_COLOURS.empty);
});

test('every colour is a hex colour',()=>{
 for(const colour of Object.values(VALUE_COLOURS)) assert.match(colour,/^#[0-9a-f]{6}$/i);
});

/* -- how a JSON value is drawn ---------------------------------------- */

test('a JSON key is drawn as a name',()=>{
 const runs=formatJson('{"score": 42}');
 const key=runs.find(run=>run.text.includes('score'));
 assert.equal(key.colour,VALUE_COLOURS.text);
});

test('a JSON number is drawn as a number',()=>{
 const runs=formatJson('{"score": 42}');
 const number=runs.find(run=>run.text==='42');
 assert.equal(number.colour,VALUE_COLOURS.number);
});

test('a JSON boolean is drawn as a boolean',()=>{
 const runs=formatJson('{"ok": true}');
 const value=runs.find(run=>run.text==='true');
 assert.equal(value.colour,VALUE_COLOURS.boolean);
});

test('JSON null is drawn as nothing',()=>{
 const runs=formatJson('{"who": null}');
 const value=runs.find(run=>run.text==='null');
 assert.equal(value.colour,VALUE_COLOURS.empty);
});

test('a JSON string is drawn as text',()=>{
 const runs=formatJson('{"name": "imon"}');
 const value=runs.find(run=>run.text.includes('imon'));
 assert.equal(value.colour,VALUE_COLOURS.text);
});

test('the JSON runs put the text back together',()=>{
 const text='{"score": 42, "ok": true}';
 assert.equal(formatJson(text).map(run=>run.text).join(''),text);
});

test('text that is not JSON is left alone',()=>{
 const runs=formatJson('hello');
 assert.equal(runs.length,1);
 assert.equal(runs[0].colour,VALUE_COLOURS.plain);
});

/* -- how a line is drawn ---------------------------------------------- */

test('a log line is marked with an arrow',()=>{
 const line=formatLine({ level:'log', args:['hi'], hints:['text'] });
 assert.equal(line.prefix,'›');
});

test('an error line is marked with a cross',()=>{
 assert.equal(formatLine({ level:'error', args:['bad'], hints:['text'] }).prefix,'✖');
});

test('a warning line is marked with a triangle',()=>{
 assert.equal(formatLine({ level:'warn', args:['hmm'], hints:['text'] }).prefix,'▲');
});

test('an info line is marked with an i',()=>{
 assert.equal(formatLine({ level:'info', args:['fyi'], hints:['text'] }).prefix,'ℹ');
});

test('a line with no level is a log line',()=>{
 assert.equal(formatLine({ args:['hi'], hints:['text'] }).level,'log');
});

test('a line with no args is still a line',()=>{
 const line=formatLine({});
 assert.equal(line.runs.length,0);
 assert.equal(line.text,'');
});

test('an object argument is coloured part by part',()=>{
 const line=formatLine({ level:'log', args:['{"score": 42}'], hints:['plain'] });
 assert.ok(line.runs.length>1,'the object was not taken apart');
 assert.ok(line.runs.some(run=>run.colour===VALUE_COLOURS.number),'the number inside is not coloured');
});

test('the text of a line is the values joined',()=>{
 const line=formatLine({ level:'log', args:['a','b'], hints:['text','text'] });
 assert.equal(line.text,'a b');
});

/* -- the panel -------------------------------------------------------- */

test('a page with no terminal is not an error',()=>{
 assert.equal(initTerminalPanel({ querySelector:()=>null }),null);
 assert.equal(initTerminalPanel(null),null);
});

/**
 * A very small DOM stand-in for the terminal.
 *
 * The terminal panel is the only part of the DOM the module touches, so
 * the stand-in is just the two nodes it asks for.
 */
function makeTerminal(){
 const overlay={ hidden:false };
 const list={ children:[], firstElementChild:null, scrollTop:0, scrollHeight:0 };
 const terminal={
  dataset:{},
  querySelector(selector){ return selector==='[data-lab-terminal-empty]' ? overlay : list; }
 };
 return { terminal, overlay, list };
}

test('the empty state is shown until something is printed',()=>{
 const { terminal, overlay } = makeTerminal();
 const panel=initTerminalPanel({ querySelector:()=>terminal });
 assert.equal(panel.empty,true);
 assert.equal(overlay.hidden,false);
});

test('the empty state is hidden once something is printed',()=>{
 const { terminal, overlay } = makeTerminal();
 const panel=initTerminalPanel({ querySelector:()=>terminal });
 panel.showEmpty(false);
 assert.equal(panel.empty,false);
 assert.equal(overlay.hidden,true);
});

test('the empty state comes back when the console is cleared',()=>{
 const { terminal, overlay } = makeTerminal();
 const panel=initTerminalPanel({ querySelector:()=>terminal });
 panel.showEmpty(false);
 panel.showEmpty(true);
 assert.equal(overlay.hidden,false);
});

test('the verdict is written onto the terminal',()=>{
 const { terminal } = makeTerminal();
 const panel=initTerminalPanel({ querySelector:()=>terminal });
 panel.setState('failed');
 assert.equal(terminal.dataset.labTerminalState,'failed');
 panel.setState('ok');
 assert.equal(terminal.dataset.labTerminalState,'ok');
});

/* -- the page --------------------------------------------------------- */

test('the terminal carries the attributes the module looks for',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(html.includes('data-lab-terminal'),'the terminal is not marked');
 assert.ok(html.includes('data-lab-terminal-empty'),'the empty state is not marked');
});

test('the lab imports the output module',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes("from './lab-output.js'"),'the module is not imported');
 assert.ok(lab.includes('initTerminalPanel(root)'),'the panel is not started');
});

test('the sandbox sends the kind of every value it logs',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes("kind: 'number'"),'numbers are not marked');
 assert.ok(lab.includes("kind: 'boolean'"),'booleans are not marked');
 assert.ok(lab.includes("kind: 'text'"),'strings are not marked');
});

test('the failed check rims the terminal in red',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes("setState?.(result.ok ? 'ok' : 'failed')"),'the verdict is not written');
});

test('clearing the terminal leaves the empty state showing',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 const handler=lab.slice(lab.indexOf("clearButton?.addEventListener"));
 assert.ok(handler.includes('clearConsole()'),'the console is not cleared');
 // A line saying "cleared" would hide the empty state again straight
 // away, so the button must not print one.
 assert.ok(!handler.includes("print('info'"),'the clear button prints a line');
});

test('the stylesheet rims a failed terminal',()=>{
 const css=readFileSync(join(docs,'lab.css'),'utf8');
 assert.ok(css.includes("[data-lab-terminal-state='failed']"),'the failed rim is missing');
});
