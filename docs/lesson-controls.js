import { isSoundEnabled, playSound, setSound } from './audio.js';

export function initLessonControls(root) {
  const dialog = root.querySelector('.lesson-dialog');
  const search = dialog.querySelector('[data-course-search]');
  const list = dialog.querySelector('.lab-rail-list');
  const summary = dialog.querySelector('[data-search-summary]');
  const sound = root.querySelector('[data-lab-sound]');

  function filterLessons() {
    const terms = search.value.toLowerCase().trim().split(/\s+/);
    let count = 0;
    for (const group of list.children) {
      const chapter = group.querySelector('.lab-rail-chapter').textContent;
      let matches = 0;
      for (const row of group.querySelectorAll('.lab-rail-item')) {
        const title = row.querySelector('.lab-rail-label').textContent;
        const text = (chapter + ' ' + title).toLowerCase();
        row.hidden = !terms.every(term => text.includes(term));
        if (!row.hidden) matches++;
      }
      group.hidden = !matches;
      count += matches;
    }
    summary.textContent = count ? count + (count === 1 ? ' lesson' : ' lessons') : 'No matching lessons. Clear the search or turn off Preferred.';
  }
  root.querySelector('[data-lessons]').addEventListener('click', () => {
    dialog.showModal();
    search.focus();
    filterLessons();
  });
  search.addEventListener('input', filterLessons);
  new MutationObserver(filterLessons).observe(list, { childList: true });
  dialog.addEventListener('click', event => {
    if (event.target.closest('.lab-rail-link')) {
      dialog.close();
      playSound('lesson');
    }
  });
  sound.addEventListener('click', () => {
    const on = setSound(!isSoundEnabled());
    sound.textContent = on ? 'Sound on' : 'Sound off';
    sound.setAttribute('aria-pressed', String(on));
  });
  root.addEventListener('click', event => {
    if (event.target.closest('.lab-run')) playSound('run');
    if (event.target.closest('.lab-rail-star')) playSound('bookmark');
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || !event.target.matches('textarea')) return;
    const action = root.querySelector(event.shiftKey ? '.lab-check' : '.lab-run');
    if (action && !action.hidden && !action.disabled) {
      event.preventDefault();
      action.click();
    }
  });
}
