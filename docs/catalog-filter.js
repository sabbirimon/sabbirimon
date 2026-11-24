const field = document.querySelector('#find-lesson');
const count = document.querySelector('#find-count');
const courses = [...document.querySelectorAll('.catalog-list > section')];
const expanded = new Set();
let searching = false;

function filter() {
  const terms = field.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length && !searching) {
    expanded.clear();
    for (const chapter of document.querySelectorAll('.catalog-list details[open]')) expanded.add(chapter);
  }
  const wasSearching = searching;
  searching = terms.length > 0;
  let total = 0;
  for (const course of courses) {
    const description = course.querySelector('.catalog-copy > p').textContent;
    const subject = course.querySelector('h2').textContent + ' ' + description;
    let courseHits = 0;
    for (const chapter of course.querySelectorAll('details')) {
      const topic = subject + ' ' + chapter.querySelector('summary').textContent;
      let hits = 0;
      for (const lesson of chapter.querySelectorAll('li')) {
        const text = [topic, lesson.textContent, lesson.dataset.brief].join(' ').toLowerCase();
        lesson.hidden = !terms.every(term => text.includes(term));
        if (!lesson.hidden) hits++;
      }
      chapter.hidden = !hits;
      if (searching) chapter.open = hits > 0;
      else if (wasSearching) chapter.open = expanded.has(chapter);
      courseHits += hits;
    }
    course.hidden = !courseHits;
    total += courseHits;
  }
  count.textContent = searching ? total + (total === 1 ? ' matching lesson' : ' matching lessons') : '';
}

field.form.addEventListener('submit', event => event.preventDefault());
field.addEventListener('input', filter);
document.querySelector('nav[aria-label="Courses"]').addEventListener('click', event => {
  if (searching && event.target.closest('a[href^="#"]')) {
    field.value = '';
    filter();
  }
});
