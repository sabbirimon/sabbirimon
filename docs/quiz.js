import { playSound } from './audio.js';
export function scoreQuiz(answers, questions) { return answers.reduce((n, answer, i) => n + Number(answer === questions[i]?.answer), 0); }
export function validQuestion(q) { return q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && q.options.every(x => typeof x === 'string') && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4; }
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const get = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
export function initQuiz() {
  const dialog = document.createElement('dialog'); dialog.className = 'quiz-modal'; dialog.id = 'quiz-modal'; dialog.setAttribute('aria-labelledby', 'quiz-title');
  dialog.innerHTML = `<header class="quiz-header"><div><span class="quiz-eyebrow">IMON DAILY CHALLENGE</span><h2 id="quiz-title">Tech Quest</h2></div><button class="quiz-close" aria-label="Close quiz">×</button></header><div class="quiz-main"><div class="quiz-setup"><p class="quiz-intro">A little knowledge. A new high score.<br>Choose your round and put your tech instincts to work.</p><div class="quiz-modes"><button data-count="5"><strong>05</strong><span>MINI ROUND</span></button><button data-count="20"><strong>20</strong><span>EXPLORER</span></button><button data-count="30"><strong>30</strong><span>FULL QUEST</span></button></div><p class="quiz-load" role="status">Loading today's questions…</p><p class="quiz-best"></p></div><div class="quiz-round" hidden><div class="quiz-progress"><span id="quiz-progress-label"></span><span id="quiz-points"></span></div><progress id="quiz-progress" max="30" value="0" aria-label="Quiz progress"></progress><p id="quiz-category"></p><h3 id="quiz-question" tabindex="-1"></h3><div class="quiz-options"></div><p class="quiz-feedback" role="status"></p><button class="pixel-button gold quiz-next" hidden>Next question →</button></div><div class="quiz-result" hidden><span class="quiz-trophy" aria-hidden="true">★</span><h3>Quest complete.</h3><strong class="quiz-final-score"></strong><p class="quiz-summary"></p><button class="pixel-button gold quiz-again">Choose another round</button></div></div><footer class="quiz-footer"><p class="quiz-credit"></p><p>Daily pack refreshes automatically · No time pressure.</p></footer>`;
  document.body.append(dialog);
  const $ = s => dialog.querySelector(s);
  let pack, questions = [], answers = [], index = 0, opener, oldOverflow, epoch = 0, selected = false;
  async function load() {
    const token = ++epoch; $('.quiz-load').textContent = "Loading today's questions…";
    dialog.querySelectorAll('[data-count]').forEach(b => b.disabled = true);
    try {
      const response = await fetch('./data/quiz.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('pack');
      const data = await response.json(); if (data.questions?.filter(validQuestion).length < 30) throw new Error('questions'); pack = data;
    } catch {
      try { const response = await fetch('./data/quiz-bank.json'); const bank = await response.json(); pack = { date: day(), questions: bank.filter(validQuestion), source: { name: 'IMON original question bank', url: 'https://github.com/sabbirimon/sabbirimon' } }; } catch { pack = null; }
    }
    if (token !== epoch || !dialog.open) return;
    if (!pack || pack.questions.length < 30) { $('.quiz-load').textContent = 'Questions are unavailable. Reopen the quiz when online.'; return; }
    $('.quiz-load').textContent = `Daily pack: ${pack.date} · ${pack.questions.length} questions`;
    $('.quiz-credit').replaceChildren(); const credit = document.createElement('a'); credit.textContent = `Questions: ${pack.source.name}`; credit.href = pack.source.url.startsWith('https://') ? pack.source.url : 'https://opentdb.com/'; credit.target = '_blank'; credit.rel = 'noopener noreferrer'; $('.quiz-credit').append(credit);
    if (pack.source.licenseUrl) { const license = document.createElement('a'); license.textContent = ' · CC BY-SA 4.0'; license.href = 'https://creativecommons.org/licenses/by-sa/4.0/'; license.target = '_blank'; license.rel = 'noopener noreferrer'; $('.quiz-credit').append(license); }
    $('.quiz-best').textContent = [5,20,30].map(n => `${n}Q best: ${get(`imon-quiz-best-${n}`, '0')}/${n}`).join(' · ');
    dialog.querySelectorAll('[data-count]').forEach(b => b.disabled = false);
  }
  function setup() { $('.quiz-setup').hidden = false; $('.quiz-round').hidden = true; $('.quiz-result').hidden = true; }
  function start(count) {
    if (!pack) return;
    questions = pack.questions.slice(0, count).map(q => { const correct = q.options[q.answer]; const options = [...q.options]; for (let i=options.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [options[i],options[j]]=[options[j],options[i]]; } return { ...q, options, answer: options.indexOf(correct) }; });
    answers = []; index = 0; $('.quiz-setup').hidden = true; $('.quiz-result').hidden = true; $('.quiz-round').hidden = false; playSound('start'); render();
  }
  function render() {
    selected = false; const q = questions[index];
    $('#quiz-progress-label').textContent = `QUESTION ${index + 1} / ${questions.length}`;
    $('#quiz-points').textContent = `${scoreQuiz(answers, questions)} CORRECT`;
    $('#quiz-progress').max = questions.length; $('#quiz-progress').value = index;
    $('#quiz-category').textContent = `${q.category || 'Technology'} · ${q.difficulty || 'Mixed'}`;
    $('#quiz-question').textContent = q.question; $('.quiz-options').replaceChildren(); $('.quiz-feedback').textContent = ''; $('.quiz-feedback').className = 'quiz-feedback'; $('.quiz-next').hidden = true;
    q.options.forEach((option, i) => { const button = document.createElement('button'); const label = document.createElement('span'); label.textContent = 'ABCD'[i]; const value = document.createElement('span'); value.textContent = option; button.append(label, value); button.addEventListener('click', () => answer(i)); $('.quiz-options').append(button); });
    $('#quiz-question').focus({ preventScroll: true });
  }
  function answer(choice) {
    if (selected) return; selected = true; answers.push(choice); const q = questions[index];
    [...$('.quiz-options').children].forEach((button, i) => { button.disabled = true; if (i === q.answer) button.classList.add('correct'); else if (i === choice) button.classList.add('incorrect'); });
    const correct = choice === q.answer; $('.quiz-feedback').textContent = `${correct ? 'Correct! ' : 'Not quite. '}${q.explanation || `Correct answer: ${q.options[q.answer]}.`}`; $('.quiz-feedback').classList.add(correct ? 'success' : 'retry'); $('#quiz-points').textContent = `${scoreQuiz(answers, questions)} CORRECT`; $('#quiz-progress').value = index + 1; playSound(correct ? 'coin' : 'hit');
    $('.quiz-next').textContent = index === questions.length - 1 ? 'See my score →' : 'Next question →'; $('.quiz-next').hidden = false; $('.quiz-next').focus({ preventScroll: true });
  }
  $('.quiz-next').addEventListener('click', () => { if (++index < questions.length) render(); else { const score = scoreQuiz(answers, questions); const previous = Number(get(`imon-quiz-best-${questions.length}`, '0')); try { localStorage.setItem(`imon-quiz-best-${questions.length}`, String(Math.max(score, previous))); document.dispatchEvent(new CustomEvent('imon:progress', { detail: { key: `imon-quiz-best-${questions.length}`, value: Math.max(score, previous) } })); } catch {} $('.quiz-round').hidden = true; $('.quiz-result').hidden = false; $('.quiz-final-score').textContent = `${score} / ${questions.length}`; $('.quiz-summary').textContent = `${Math.round(score / questions.length * 100)}% correct. ${score >= previous ? 'A personal best!' : `Your best is ${previous}/${questions.length}.`} Every answer is a little more knowledge.`; playSound('win'); $('.quiz-again').focus(); } });
  $('.quiz-again').addEventListener('click', () => { setup(); load(); });
  dialog.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click', () => start(Number(b.dataset.count))));
  $('.quiz-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { ++epoch; document.body.style.overflow = oldOverflow; opener?.focus({ preventScroll: true }); });
  document.addEventListener('click', e => { const trigger = e.target.closest('button[data-game="quiz"]'); if (!trigger) return; opener = trigger; oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; setup(); dialog.showModal(); load(); });
}
