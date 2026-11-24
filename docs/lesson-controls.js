import {chapterPlacement, courseModules, levels} from './learning-modules.js';
import { isSoundEnabled, playSound, setSound } from './audio.js';

export function initLessonControls(root) {
  const dialog = root.querySelector('.lesson-dialog');
  const search = dialog.querySelector('[data-course-search]');
  const list = dialog.querySelector('.lab-rail-list');
  const summary = dialog.querySelector('[data-search-summary]');
  const sound = root.querySelector('[data-lab-sound]');

  const track = root.querySelector('[data-course-quiz]').dataset.courseQuiz;
  const filters = document.createElement('div');
  filters.className = 'lesson-filters';
  function addSelect(title, all) {
    const label = document.createElement('label');
    label.append(title);
    const select = document.createElement('select');
    select.setAttribute('aria-label',title);
    select.add(new Option(all, ''));
    label.append(select);
    filters.append(label);
    select.addEventListener('change', filterLessons);
    return select;
  }
  const moduleSelect = addSelect('Module', 'All practice modules');
  const levelSelect = addSelect('Level', 'All levels');
  for (const name of levels) levelSelect.add(new Option(name,name));
  search.closest('label').before(filters);
  const previous = new Map();
  let searching = false;

  function arrangeChapters() {
    const chapters = [];
    for (const group of list.children) {
      const title = group.querySelector('.lab-rail-chapter');
      const chapter = title.textContent;
      chapters.push(chapter);
      if (group.querySelector('details')) continue;
      const {module,level} = chapterPlacement(track,chapter);
      const rows = group.querySelector('.lab-rail-items');
      const details = document.createElement('details');
      details.className = 'lesson-chapter';
      const heading = document.createElement('summary');
      const meta = document.createElement('small');
      meta.textContent = module + ' · ' + level;
      const progress = document.createElement('small');
      progress.className = 'chapter-progress';
      group.dataset.module = module;
      group.dataset.level = level;
      details.open = previous.get(chapter) ?? Boolean(group.querySelector('[aria-current="true"]'));
      const name = document.createElement('span');
      name.className = title.className;
      name.textContent = chapter;
      title.remove();
      heading.append(name,meta,progress);
      details.append(heading,rows);
      group.append(details);
      details.addEventListener('toggle', () => {
        if (!search.value.trim()) previous.set(chapter,details.open);
      });
    }
    const selected = moduleSelect.value;
    moduleSelect.length = 1;
    for (const name of courseModules(track,chapters)) moduleSelect.add(new Option(name,name));
    moduleSelect.value = selected;
    if (moduleSelect.selectedIndex < 0) moduleSelect.selectedIndex = 0;
    filterLessons();
  }

  function filterLessons() {
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const wasSearching = searching;
    searching = terms.length > 0;
    let count = 0;
    for (const group of list.children) {
      const details = group.querySelector('details');
      if (!details) continue;
      const chapter = group.querySelector('.lab-rail-chapter').textContent;
      const module = group.dataset.module;
      const level = group.dataset.level;
      const allowed = (moduleSelect.value ? module === moduleSelect.value : module !== 'Quiz & Q&A' || searching) && (!levelSelect.value || level === levelSelect.value);
      const rows = group.querySelectorAll('.lab-rail-item');
      const solved = group.querySelectorAll('a[data-state="solved"]').length;
      group.querySelector('.chapter-progress').textContent = solved + '/' + rows.length + ' completed';
      let matches = 0;
      for (const row of rows) {
        const title = row.querySelector('.lab-rail-label').textContent;
        const text = [module,level,chapter,title].join(' ').toLowerCase();
        row.hidden = !allowed || !terms.every(term => text.includes(term));
        if (!row.hidden) matches++;
      }
      group.hidden = !matches;
      if (searching) {
        if (!wasSearching) previous.set(chapter,details.open);
        details.open = matches > 0;
      } else if (wasSearching) details.open = Boolean(previous.get(chapter));
      count += matches;
    }
    summary.textContent = count ? count + (count === 1 ? ' lesson' : ' lessons') : 'No matches. Change the filters, clear the search or turn off Preferred.';
  }
  root.querySelector('[data-lessons]').addEventListener('click', () => {
    dialog.showModal();
    const current = list.querySelector('[aria-current="true"]')?.closest('details');
    if (current?.parentElement.dataset.module === 'Quiz & Q&A' && !moduleSelect.value) moduleSelect.value = 'Quiz & Q&A';
    filterLessons();
    if (current && !current.parentElement.hidden) current.open = true;
    search.focus({preventScroll:true});
  });
  search.addEventListener('input', filterLessons);
  arrangeChapters();
  new MutationObserver(arrangeChapters).observe(list, { childList: true });
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
