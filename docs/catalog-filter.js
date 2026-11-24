const field=document.querySelector('#find-lesson'),count=document.querySelector('#find-count');
const chapters=[...document.querySelectorAll('.catalog-list details')];
const expanded=new Set();
let searching=false;
field.form.addEventListener('submit',e=>e.preventDefault());
field.addEventListener('input',()=>{
  const term=field.value.trim().toLocaleLowerCase();
  if(term&&!searching){expanded.clear();for(const d of chapters)if(d.open)expanded.add(d)}
  searching=Boolean(term);
  let found=0;
  for(const chapter of chapters){
    const general=[chapter.querySelector('summary').textContent,chapter.closest('section').querySelector('h2').textContent].join(' ').toLocaleLowerCase().includes(term);
    let hits=0;
    for(const lesson of chapter.querySelectorAll('li')){
      lesson.hidden=!general&&!lesson.textContent.toLocaleLowerCase().includes(term);
      if(!lesson.hidden)hits++;
    }
    found+=hits;chapter.hidden=!hits;chapter.open=term?Boolean(hits):expanded.has(chapter);
  }
  count.textContent=term?found+' matching lessons':'';
});
