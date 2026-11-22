import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const docs = new URL('../docs/', import.meta.url).pathname;

/** Every stylesheet the site ships. */
function stylesheets() {
  return readdirSync(docs)
    .filter(name => name.endsWith('.css'))
    .map(name => join(docs, name));
}

test('every stylesheet has balanced braces',()=>{
 for(const file of stylesheets()){
  const css = readFileSync(file,'utf8');
  let depth = 0;
  for(const ch of css){
   if(ch==='{')depth+=1;
   else if(ch==='}')depth-=1;
   assert.ok(depth>=0,`${file} closes a brace that was never opened`);
  }
  assert.equal(depth,0,`${file} leaves ${depth} brace(s) unclosed`);
 }
});

test('every stylesheet has no empty rule body',()=>{
 for(const file of stylesheets()){
  const css = readFileSync(file,'utf8');
  const empties = css.match(/\{\s*\}/g);
  if(empties)assert.fail(`${file} has ${empties.length} empty rule(s)`);
 }
});

test('every stylesheet has balanced parentheses',()=>{
 for(const file of stylesheets()){
  const css = readFileSync(file,'utf8');
  let depth = 0;
  for(const ch of css){
   if(ch==='(')depth+=1;
   else if(ch===')')depth-=1;
   assert.ok(depth>=0,`${file} closes a paren that was never opened`);
  }
  assert.equal(depth,0,`${file} leaves ${depth} paren(s) unclosed`);
 }
});

test('the lab stylesheets are in the order the page loads them',()=>{
 const html = readFileSync(join(docs,'lab.html'),'utf8');
 const head = html.slice(0, html.indexOf('</head>'));
 const order = [...head.matchAll(/href="([^"]+\.css)"/g)].map(match => match[1]);
 assert.ok(order.includes('lab.css'),'lab.css is missing');
 assert.ok(order.includes('lab-layout.css'),'lab-layout.css is missing');
 assert.ok(order.indexOf('lab.css') < order.indexOf('lab-layout.css'),'lab-layout.css must load after lab.css');
 assert.ok(order.indexOf('style.css') < order.indexOf('lab.css'),'style.css must load before lab.css');
});
