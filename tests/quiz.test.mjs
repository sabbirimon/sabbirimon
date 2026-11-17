import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreQuiz, validQuestion } from '../docs/quiz.js';
import { readFile } from 'node:fs/promises';
test('quiz score counts only correct responses',()=>assert.equal(scoreQuiz([0,2,1],[{answer:0},{answer:1},{answer:1}]),2));
test('all daily and fallback questions support 30-question rounds',async()=>{for(const file of ['quiz.json','quiz-bank.json']){const d=JSON.parse(await readFile(new URL('../docs/data/'+file,import.meta.url)));const q=d.questions||d;assert.ok(q.length>=30);assert.ok(q.every(validQuestion));}});
test('malformed MCQs are rejected',()=>{assert.equal(Boolean(validQuestion({question:'x',options:['a','b'],answer:0})),false);assert.equal(Boolean(validQuestion({question:'x',options:['a','b','c','d'],answer:4})),false);});
