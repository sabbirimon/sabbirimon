import {currentSession, getSession, readLocalProgress, syncLocalProgress} from './auth.js';
import {siteRequest} from './site-services.js';

import {trackKeys, mastery} from './mastery.js';
const find = selector => document.querySelector(selector);
const status = find('[data-status]');
function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(label, url) {
  const anchor = element('a', label);
  const target = new URL(url, document.baseURI);
  anchor.href = target.origin === 'https://imon.com.bd'
    ? new URL(target.pathname.slice(1) + target.search + target.hash, document.baseURI) : target;
  return anchor;
}
function renderResults(courses) {
  const saved = readLocalProgress();
  const cards = find('[data-courses]');
  cards.replaceChildren();
  let completed = 0, total = 0;
  for (const course of courses) {
    const ids = saved[trackKeys[course.id]]?.solved;
    const solved = new Set(Array.isArray(ids) ? ids : []);
    const finished = course.exercises.filter(exercise => solved.has(exercise.id));
    const next = course.exercises.find(exercise => !solved.has(exercise.id));
    completed += finished.length;
    total += course.exercises.length;
    const card = element('section');
    const heading = element('h2', course.title);
    const count = finished.length + ' of ' + course.exercises.length + ' exercises';
    const bar = element('progress');
    bar.max = course.exercises.length;
    bar.value = finished.length;
    bar.setAttribute('aria-label', course.title + ' · ' + count);
    const best = saved['imon-course-quiz-' + course.id];
    const quiz = Number.isInteger(best) ? 'Quiz best ' + best + ' / 5' : 'Quiz not taken yet';
    const details = element('details');
    details.append(element('summary', 'Completed exercises (' + finished.length + ')'));
    const list = element('ul');
    for (const exercise of finished) {
      const item = element('li');
      item.append(link(exercise.title, exercise.url));
      list.append(item);
    }
    details.append(finished.length ? list : element('p', 'Check a correct answer in the workbench to record your first result.'));
    const level = mastery(course,saved[trackKeys[course.id]]);
    card.append(heading, element('p', 'Level ' + level.level + ' · ' + level.badges.length + ' chapter badges'), element('p', count), bar, element('p', quiz), details,
      link(next ? 'Continue · ' + next.title : 'Review course quiz', next?.url || course.quizUrl));
    cards.append(card);
  }
  find('[data-total]').textContent = completed + ' / ' + total + ' exercises completed';
}
async function progress() {
  const response = await fetch('data/course-index.json');
  if (!response.ok) throw Error('The course catalog is unavailable. Reload to try again.');
  const {courses} = await response.json();
  const draw = () => renderResults(courses);
  draw();
  window.addEventListener('storage', draw);
  if (getSession()) {
    status.textContent = 'Checking your private cloud save…';
    const saved = await syncLocalProgress();
    draw();
    status.textContent = saved ? 'Your device and private account save are synced.' : 'Showing device results. Cloud sync is unavailable. Reload to retry.';
  } else {
    status.replaceChildren(document.createTextNode('Saved on this device. '), link('Sign in to sync progress', 'login.html?return=progress.html'));
  }
}
async function rpc(name, body, session) {
  const headers = {'Content-Type': 'application/json'};
  if (session) headers.Authorization = 'Bearer ' + session.access_token;
  const response = await siteRequest('rpc/' + name, {method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('The leaderboard service is unavailable. Reload to try again.');
  return response.json();
}
async function showScores() {
  const rows = await rpc('learning_scores', {});
  const body = find('tbody');
  body.replaceChildren();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const key of ['place','alias','lessons','quiz','points']) tr.insertCell().textContent = row[key];
  }
  find('table').hidden = !rows.length;
  find('[data-empty]').hidden = Boolean(rows.length);
}
async function leaderboard() {
  await showScores();
  const session = await currentSession();
  if (!session) {
    status.replaceChildren(link('Sign in to join the board', 'login.html?return=leaderboard.html'));
    return;
  }
  const toggle = find('[data-membership]');
  let alias = await rpc('learning_membership', {}, session);
  function membership() {
    toggle.textContent = alias ? 'Leave leaderboard' : 'Join with a generated alias';
    toggle.hidden = false;
    status.textContent = alias ? 'You appear as ' + alias + '.' : 'Your results are private. Joining makes your practice totals public.';
  }
  membership();
  toggle.onclick = async () => {
    toggle.disabled = true;
    try {
      const fresh = await currentSession();
      if (fresh?.user.id !== session.user.id) throw Error('Your account changed. Reload this page.');
      if (!alias && !await syncLocalProgress()) throw Error('Your progress could not sync. Try again.');
      alias = await rpc('learning_membership', {enroll: !alias}, fresh);
      membership();
      await showScores();
    } catch (error) { status.textContent = error.message; }
    finally { toggle.disabled = false; }
  };
}
(find('[data-courses]') ? progress() : leaderboard()).catch(error => { status.textContent = error.message; });
