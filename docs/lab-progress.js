/**
 * The progress track for the lab.
 *
 * The progress bar alone says how far through the course you are. The
 * track says more: which chapters are done, which one you are in, how many
 * exercises you have solved and how much XP that was worth.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/**
 * Work out the state of every chapter.
 *
 * Each chapter comes back with the number of exercises it holds, the
 * number that are solved, and whether it is the one in front of you.
 */
export function chapterProgress(chapters, exercises, solved, currentChapter) {
  return chapters.map(name => {
    const inChapter = exercises.filter(exercise => exercise.chapter === name);
    const done = inChapter.filter(exercise => solved.has(exercise.id)).length;
    return {
      name,
      total: inChapter.length,
      done,
      percent: inChapter.length ? Math.round((done / inChapter.length) * 100) : 0,
      complete: inChapter.length > 0 && done === inChapter.length,
      current: name === currentChapter
    };
  });
}

/**
 * A one-line summary of the whole course.
 */
export function progressSummary(chapters, exercises, solved, xp) {
  const total = exercises.length;
  const done = exercises.filter(exercise => solved.has(exercise.id)).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const complete = chapters.filter(name => {
    const inChapter = exercises.filter(exercise => exercise.chapter === name);
    return inChapter.length > 0 && inChapter.every(exercise => solved.has(exercise.id));
  }).length;
  const parts = [`${done} of ${total} solved`, `${percent}%`, `${xp} XP`];
  if (complete) parts.push(`${complete} chapter${complete === 1 ? '' : 's'} complete`);
  return parts.join(' · ');
}

export function initLabProgress(root = document) {
  const track = root.querySelector?.('[data-lab-track]');
  if (!track) return null;

  function render(chapters, exercises, solved, currentChapter, xp) {
    const states = chapterProgress(chapters, exercises, solved, currentChapter);
    track.textContent = '';

    const summary = document.createElement('p');
    summary.className = 'lab-track-summary';
    summary.textContent = progressSummary(chapters, exercises, solved, xp);
    track.append(summary);

    const list = document.createElement('ol');
    list.className = 'lab-track-list';
    for (const state of states) {
      const item = document.createElement('li');
      item.className = 'lab-track-item';
      item.dataset.state = state.complete ? 'complete' : (state.current ? 'current' : (state.done > 0 ? 'started' : 'open'));
      const name = document.createElement('span');
      name.className = 'lab-track-name';
      name.textContent = state.name;
      const count = document.createElement('span');
      count.className = 'lab-track-count';
      count.textContent = `${state.done}/${state.total}`;
      const bar = document.createElement('span');
      bar.className = 'lab-track-bar';
      const fill = document.createElement('span');
      fill.className = 'lab-track-fill';
      fill.style.width = state.percent + '%';
      bar.append(fill);
      item.append(name, count, bar);
      list.append(item);
    }
    track.append(list);
    return states;
  }

  return { render };
}
