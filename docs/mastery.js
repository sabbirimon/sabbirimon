import {readLocalProgress} from './auth.js';
import {playSound} from './audio.js';

export const trackKeys = {code:'imon-lab-progress-v1',ai:'imon-ai-lab-v1',circuits:'imon-circuits-v1',systems:'imon-systems-v1'};

export function mastery(course, saved) {
  const solved = new Set(Array.isArray(saved?.solved) ? saved.solved : []);
  const done = course.exercises.filter(e => solved.has(e.id)).length;
  const chapters = new Map();
  for (const exercise of course.exercises) {
    const chapter = chapters.get(exercise.chapter) || {total:0, completed:0};
    chapter.total++;
    if (solved.has(exercise.id)) chapter.completed++;
    chapters.set(exercise.chapter,chapter);
  }
  const next = course.exercises.find(e => !solved.has(e.id));
  const badges = [...chapters].filter(([,chapter]) => chapter.total === chapter.completed).map(([name]) => name);
  const milestones = [...new Set([1,3,6,12,24,48,96,course.exercises.length].filter(n=>n<=course.exercises.length))].sort((a,b)=>a-b);
  return {done,level:milestones.filter(n=>done>=n).length,goal:milestones.find(n=>n>done),next,badges};
}

export async function initMastery(root) {
  const panel = root.querySelector('[data-mastery]');
  if (!panel) return;
  const response = await fetch('data/course-index.json');
  if (!response.ok) return;
  const course = (await response.json()).courses.find(c => c.id === panel.dataset.mastery);
  if (!course) return;
  let previous;
  const title = panel.querySelector('strong'), note = panel.querySelector('p'), next = panel.querySelector('a');
  function render() {
    const state = mastery(course,readLocalProgress()[trackKeys[course.id]]);
    title.textContent = 'Level ' + state.level + ' · ' + state.done + ' solved';
    const badge = state.badges.length ? ' Chapter badges: ' + state.badges.join(' · ') + '.' : '';
    note.textContent = (state.goal ? (state.goal-state.done) + ' more to reach level ' + (state.level+1) + '.' : 'Every exercise complete.') + badge;
    if (state.next) {
      const url = new URL(state.next.url);
      next.href = url.pathname.slice(1) + url.search;
      next.textContent = 'Practice next · ' + state.next.title;
    } else { next.href = '#course-quiz'; next.textContent = 'Review the course quiz'; next.onclick = () => root.querySelector('[data-open-quiz]')?.click(); }
    if (previous && state.level > previous.level) {
      playSound('win');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) panel.animate?.([{outline:'3px solid #ffda85'},{outline:'3px solid transparent'}],{duration:850});
    }
    previous = state;
    panel.hidden = false;
  }
  render();
  document.addEventListener('imon:lesson-saved',render);
  window.addEventListener('storage',render);
}
if(typeof document !== 'undefined') initMastery(document).catch(()=>{});
