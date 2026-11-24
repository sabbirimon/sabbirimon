import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const worker=readFileSync(new URL('../docs/sw.js',import.meta.url),'utf8');
const scope='https://imon.test/nested/';

function offlineVisit(path) {
  const handlers={}, cached=new Map();
  const cache={
    addAll: async files=>{for(const url of files)cached.set(url,new Response(url))},
    match: async request=>cached.get(typeof request==='string'?request:request.url)
  };
  runInNewContext(worker,{
    self:{location:new URL(scope),registration:{scope},addEventListener:(name,fn)=>{handlers[name]=fn},skipWaiting:()=>{}},
    URL, Response, caches:{open:async()=>cache}, fetch:async()=>{throw new Error('offline')}
  });
  return new Promise((resolve,reject)=>{
    handlers.install({waitUntil:promise=>promise.then(()=>{
      handlers.fetch({request:{url:new URL(path,scope).href,method:'GET',mode:'navigate'},respondWith:resolve});
    },reject)});
  });
}

test('offline first visits resolve directory indexes and deeplinks in the deployment scope',async()=>{
  for(const route of ['exams/?track=ai','arcade/puzzles/','guide/','watch/']){
    const response=await offlineVisit(route);
    assert.equal(response.status,200);
    assert.equal(await response.text(),new URL(route.split('?')[0]+'index.html',scope).href);
  }
});
test('unavailable offline routes report the missing page',async()=>{
  const response=await offlineVisit('missing/');
  assert.equal(response.status,503);
});
