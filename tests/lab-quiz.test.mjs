import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JS_QUIZ, QUIZ_CHAPTER, QUIZ_TOPICS, validQuizQuestion, shuffleOptions, quizExercises } from '../docs/lab-quiz.js';
import { quizVerdict, letterFor, QUIZ_LETTERS } from '../docs/lab-quiz-ui.js';
import { NOTES, noteKey } from '../docs/lab-notes.js';
import { CHAPTERS } from '../docs/lab-chapters.js';

const docs = new URL('../docs/', import.meta.url).pathname;

/* -- the questions -------------------------------------------------- */

test('every question is valid',()=>{
 for(const question of JS_QUIZ) assert.ok(validQuizQuestion(question),`${question.id} is not valid`);
});

test('there are twenty-five questions',()=>{
 assert.equal(JS_QUIZ.length,25);
});

test('the ids are unique',()=>{
 const ids=JS_QUIZ.map(question=>question.id);
 assert.equal(new Set(ids).size,ids.length);
});

test('the ids run from one to twenty-five',()=>{
 assert.equal(JS_QUIZ[0].id,'js-quiz-01');
 assert.equal(JS_QUIZ[JS_QUIZ.length-1].id,'js-quiz-25');
});

test('every answer index is in range',()=>{
 for(const question of JS_QUIZ) assert.ok(question.answer>=0 && question.answer<=3,`${question.id} points nowhere`);
});

test('no two options in a question read the same',()=>{
 for(const question of JS_QUIZ){
  const seen=new Set(question.options.map(option=>option.trim()));
  assert.equal(seen.size,4,`${question.id} has a repeated option`);
 }
});

test('no question or explanation is empty',()=>{
 for(const question of JS_QUIZ){
  assert.ok(question.question.trim(),`${question.id} has no question`);
  assert.ok(question.explanation.trim(),`${question.id} has no explanation`);
 }
});

test('every question names a topic that is on the list',()=>{
 for(const question of JS_QUIZ) assert.ok(QUIZ_TOPICS.includes(question.topic),`${question.id} has an unknown topic`);
});

test('the eight topics are all covered',()=>{
 const used=new Set(JS_QUIZ.map(question=>question.topic));
 for(const topic of QUIZ_TOPICS) assert.ok(used.has(topic),`${topic} has no questions`);
});

test('a question with no options is rejected',()=>{
 assert.equal(validQuizQuestion({ id:'x', question:'q', options:[], answer:0, explanation:'e' }),false);
});

test('a question with three options is rejected',()=>{
 assert.equal(validQuizQuestion({ id:'x', question:'q', options:['a','b','c'], answer:0, explanation:'e' }),false);
});

test('a question with a repeated option is rejected',()=>{
 assert.equal(validQuizQuestion({ id:'x', question:'q', options:['a','a','b','c'], answer:0, explanation:'e' }),false);
});

test('a question with no answer is rejected',()=>{
 assert.equal(validQuizQuestion({ id:'x', question:'q', options:['a','b','c','d'], explanation:'e' }),false);
});

test('a question with no explanation is rejected',()=>{
 assert.equal(validQuizQuestion({ id:'x', question:'q', options:['a','b','c','d'], answer:0 }),false);
});

test('a question with no id is rejected',()=>{
 assert.equal(validQuizQuestion({ question:'q', options:['a','b','c','d'], answer:0, explanation:'e' }),false);
});

test('something that is not a question is rejected',()=>{
 assert.equal(validQuizQuestion(null),false);
 assert.equal(validQuizQuestion('a question'),false);
});

/* -- shuffling ------------------------------------------------------ */

test('shuffling keeps the same four options',()=>{
 const question=JS_QUIZ[0];
 const shuffled=shuffleOptions(question,()=>0.5);
 assert.deepEqual([...shuffled.options].sort(),[...question.options].sort());
});

test('shuffling keeps the right answer right',()=>{
 const question=JS_QUIZ[0];
 const shuffled=shuffleOptions(question,()=>0.5);
 assert.equal(shuffled.options[shuffled.answer],question.options[question.answer]);
});

test('shuffling with the same random gives the same order',()=>{
 const question=JS_QUIZ[3];
 const first=shuffleOptions(question,()=>0.25);
 const second=shuffleOptions(question,()=>0.25);
 assert.deepEqual(first.options,second.options);
});

test('shuffling never loses the answer',()=>{
 for(const question of JS_QUIZ){
  const shuffled=shuffleOptions(question);
  assert.ok(shuffled.options.includes(question.options[question.answer]),`${question.id} lost its answer`);
 }
});

/* -- the checker ---------------------------------------------------- */

test('the checker says no when nothing was picked',()=>{
 const exercise=quizExercises()[0];
 const result=exercise.check({ chosen:undefined });
 assert.equal(result.ok,false);
 assert.match(result.message,/pick an answer/i);
});

test('the checker says yes for the right answer',()=>{
 const exercise=quizExercises()[0];
 const result=exercise.check({ chosen:exercise.answer });
 assert.equal(result.ok,true);
});

test('the checker names the right answer when it is wrong',()=>{
 const exercise=quizExercises()[0];
 const wrong=(exercise.answer+1)%4;
 const result=exercise.check({ chosen:wrong });
 assert.equal(result.ok,false);
 assert.ok(result.message.includes(exercise.options[exercise.answer]),'the right answer is not named');
});

test('the checker explains a wrong answer',()=>{
 const exercise=quizExercises()[0];
 const wrong=(exercise.answer+1)%4;
 const result=exercise.check({ chosen:wrong });
 assert.ok(result.hint && result.hint.length>10,'there is no explanation');
});

test('the checker does not throw when it is called with nothing',()=>{
 for(const exercise of quizExercises()) assert.doesNotThrow(()=>exercise.check());
});

/* -- the exercises -------------------------------------------------- */

test('the questions become twenty-five exercises',()=>{
 assert.equal(quizExercises().length,25);
});

test('every exercise is a quiz in the quiz chapter',()=>{
 for(const exercise of quizExercises()){
  assert.equal(exercise.kind,'quiz');
  assert.equal(exercise.language,'js');
  assert.equal(exercise.chapter,QUIZ_CHAPTER);
 }
});

test('every exercise is worth some XP',()=>{
 for(const exercise of quizExercises()) assert.ok(exercise.xp>0,`${exercise.id} is worth nothing`);
});

test('every exercise has three empty buffers',()=>{
 for(const exercise of quizExercises()){
  assert.deepEqual(exercise.starter,{ html:'', css:'', js:'' });
 }
});

test('every exercise names one requirement',()=>{
 for(const exercise of quizExercises()) assert.equal(exercise.requirements.length,1);
});

/* -- the verdict ---------------------------------------------------- */

test('a right answer reads as right',()=>{
 const exercise=quizExercises()[0];
 const verdict=quizVerdict(exercise,exercise.answer);
 assert.equal(verdict.ok,true);
 assert.equal(verdict.tone,'right');
});

test('a wrong answer names the right one',()=>{
 const exercise=quizExercises()[0];
 const wrong=(exercise.answer+1)%4;
 const verdict=quizVerdict(exercise,wrong);
 assert.equal(verdict.ok,false);
 assert.equal(verdict.tone,'wrong');
 assert.ok(verdict.text.includes(exercise.options[exercise.answer]));
});

test('no answer reads as idle',()=>{
 const verdict=quizVerdict(quizExercises()[0],undefined);
 assert.equal(verdict.tone,'idle');
});

test('the four answers are marked A, B, C and D',()=>{
 assert.deepEqual(QUIZ_LETTERS,['A','B','C','D']);
 assert.equal(letterFor(0),'A');
 assert.equal(letterFor(3),'D');
});

test('an option past the fourth has no letter',()=>{
 assert.equal(letterFor(9),'?');
});

/* -- the notes ------------------------------------------------------ */

test('every question has a note of its own',()=>{
 for(const question of JS_QUIZ){
  const key=noteKey(question.requirement);
  assert.ok(NOTES[key],`${question.id} has no note for "${question.requirement}"`);
 }
});

test('every note has a title, a body and an example',()=>{
 for(const question of JS_QUIZ){
  const note=NOTES[noteKey(question.requirement)];
  assert.ok(note.title,`${question.id} has a note with no title`);
  assert.ok(note.body,`${question.id} has a note with no body`);
  assert.ok(note.example,`${question.id} has a note with no example`);
 }
});

/* -- the chapter ---------------------------------------------------- */

test('the quiz chapter has its own material',()=>{
 const chapter=CHAPTERS[QUIZ_CHAPTER];
 assert.ok(chapter,`${QUIZ_CHAPTER} has no chapter`);
 assert.ok(chapter.goal);
 assert.ok(chapter.material.length);
 assert.ok(chapter.exam);
 assert.ok(chapter.outcome);
});

test('the chapter lists the topics the questions cover',()=>{
 const chapter=CHAPTERS[QUIZ_CHAPTER];
 const text=chapter.material.map(part=>part.body+' '+part.code).join(' ');
 for(const topic of QUIZ_TOPICS) assert.ok(text.includes(topic),`${topic} is not in the study material`);
});

test('the chapter points at the w3schools quiz as further reading',()=>{
 const chapter=CHAPTERS[QUIZ_CHAPTER];
 const text=chapter.material.map(part=>part.code).join(' ');
 assert.ok(text.includes('w3schools.com/js/js_quiz.asp'));
});

/* -- the page ------------------------------------------------------- */

test('the page has the quiz panel',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(html.includes('data-lab-quiz '),'the panel is not marked');
 assert.ok(html.includes('data-lab-quiz-options'),'the options are not marked');
 assert.ok(html.includes('data-lab-quiz-verdict'),'the verdict is not marked');
 assert.ok(html.includes('data-lab-quiz-retry'),'the retry button is not marked');
});

test('the panel starts hidden',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(/data-lab-quiz hidden/.test(html),'the panel is not hidden by default');
});

test('the options are a radio group',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(html.includes('role="radiogroup"'),'the options are not a radio group');
});

test('the verdict is announced when it changes',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(html.includes('role="status"'),'the verdict is not a status');
 assert.ok(html.includes('aria-live="polite"'),'the verdict is not announced politely');
});

test('the lab imports the quiz modules',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes("from './lab-quiz.js'"),'the question bank is not imported');
 assert.ok(lab.includes("from './lab-quiz-ui.js'"),'the panel is not imported');
});

test('the lab registers the quiz exercises',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes('quizExercises()'),'the questions are not registered');
});

test('the lab hands the chosen answer to the checker',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes('chosen: quiz?.chosen?.()'),'the chosen answer is not passed');
});

test('the lab hides the code pane for a quiz',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes("editorPane.hidden = true"),'the code pane is not hidden');
});

test('the lab skips the code panel for a quiz',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 const branch=lab.slice(lab.indexOf('if (!isQuiz()) {'));
 assert.ok(branch.includes('buildFeedback'),'the code panel is not skipped for a quiz');
});

test('a wrong quiz answer is not final',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes('quiz?.judge?.(result)'),'the panel is not told the verdict');
});

test('the stylesheet styles the quiz panel',()=>{
 const css=readFileSync(join(docs,'lab.css'),'utf8');
 for(const rule of ['.lab-quiz','.lab-quiz-question','.lab-quiz-options','.lab-quiz-option','.lab-quiz-option-correct','.lab-quiz-option-wrong','.lab-quiz-verdict','.lab-quiz-retry']){
  assert.ok(css.includes(rule),`${rule} is missing from the stylesheet`);
 }
});

test('the service worker caches the quiz modules',()=>{
 const sw=readFileSync(join(docs,'sw.js'),'utf8');
 assert.ok(sw.includes("'lab-quiz.js'"),'the question bank is not cached');
 assert.ok(sw.includes("'lab-quiz-ui.js'"),'the panel is not cached');
});

/* -- the copy that changes with the exercise kind ------------------ */

test('the page has a set of instructions for a quiz',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(html.includes('data-lab-steps-quiz'),'the quiz instructions are missing');
 assert.ok(html.includes('data-lab-steps-code'),'the code instructions are missing');
});

test('the page has a set of help notes for a quiz',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(html.includes('data-lab-help-quiz'),'the quiz help is missing');
 assert.ok(html.includes('data-lab-help-code'),'the code help is missing');
});

test('the quiz instructions are hidden by default',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(/data-lab-steps-quiz hidden/.test(html),'the quiz instructions are not hidden');
 assert.ok(/data-lab-help-quiz hidden/.test(html),'the quiz help is not hidden');
});

test('the lab swaps the instructions and the help for a quiz',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes('stepsQuiz.hidden = true'),'the quiz instructions are never hidden again');
 assert.ok(lab.includes('helpQuiz.hidden = true'),'the quiz help is never hidden again');
});

test('the lab hides the reset button for a quiz',()=>{
 const lab=readFileSync(join(docs,'lab.js'),'utf8');
 assert.ok(lab.includes('resetButton.hidden = true'),'the reset button is not hidden');
});

test('the quiz panel shows the position in the course',()=>{
 const ui=readFileSync(join(docs,'lab-quiz-ui.js'),'utf8');
 assert.ok(ui.includes('Question ${position}'),'the position is not shown');
});

test('the answers can be walked with the arrow keys',()=>{
 const ui=readFileSync(join(docs,'lab-quiz-ui.js'),'utf8');
 assert.ok(ui.includes("'ArrowDown'"),'the arrow keys are not handled');
 assert.ok(ui.includes("'ArrowUp'"),'the arrow keys are not handled');
});

test('the focus moves to the verdict when an answer is judged',()=>{
 const ui=readFileSync(join(docs,'lab-quiz-ui.js'),'utf8');
 assert.ok(ui.includes('verdictBox?.focus?.()'),'the verdict is not focused');
});

test('the verdict can take the focus',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(/data-lab-quiz-verdict[^>]*tabindex="-1"/.test(html),'the verdict cannot take the focus');
});

test('the question heading can take the focus',()=>{
 const html=readFileSync(join(docs,'lab.html'),'utf8');
 assert.ok(/data-lab-quiz-question[^>]*tabindex="-1"/.test(html),'the question cannot take the focus');
});
