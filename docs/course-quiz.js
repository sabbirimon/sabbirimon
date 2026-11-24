// Each course keeps its own question bank and personal best on this device.
const banks={
  code:[
    ['Which element gives a page its main heading?',['<title>','<h1>','<header>'],1,'The h1 names the main topic in the page content.'],
    ['Which selector styles every element with class notice?',['#notice','notice','.notice'],2,'A dot introduces a CSS class selector.'],
    ['A button updates the page without reloading. Which event should a handler listen for?',['click','load','resize'],0,'A native button emits click when activated by mouse, touch or keyboard.'],
    ['What does [2, 3].map(n => n * 2) return?',['[2, 3, 2, 3]','[4, 6]','10'],1,'map applies the function independently to each element.'],
    ['Which layout wraps items onto another line when space runs out?',['display: block alone','white-space: nowrap','display: flex with flex-wrap: wrap'],2,'A wrapping flex container can place overflow items on the next flex line.']
  ],
  ai:[
    ['What does len("small models".split()) return?',['2','11','12'],0,'split separates the two whitespace-delimited words.'],
    ['Which data should estimate how a trained model performs on unseen examples?',['The training set','A held-out test set','The model weights'],1,'Hold out the test examples from training and model selection.'],
    ['Which SQL clause keeps only rows matching a condition?',['ORDER BY','GROUP BY','WHERE'],2,'WHERE filters individual rows before grouping.'],
    ['A classifier flags 10 messages and 8 are spam. What is its precision?',['20%','80%','100%'],1,'Precision is the number of true positives divided by all predicted positives.'],
    ['Which design avoids recomputing the same result for identical inputs?',['Cache results by input','Make the queue longer','Shuffle the inputs'],0,'A cache reuses a stored result for the same input and model version.']
  ],
  circuits:[
    ['A 6 V source drives a 2 kΩ resistor. What is the current?',['3 A','12 mA','3 mA'],2,'Ohm’s law gives 6 / 2000 amperes, or 3 milliamperes.'],
    ['Which instrument shows voltage changing over time?',['An oscilloscope','An ohmmeter','A continuity buzzer'],0,'An oscilloscope plots the measured voltage against time.'],
    ['Two identical resistors are connected in parallel. What is their combined resistance?',['Twice one resistor','Half of one resistor','The same as one resistor'],1,'The parallel paths double the conductance, halving the resistance.'],
    ['When does a two-input AND gate output 1?',['When either input is 1','When the inputs differ','When both inputs are 1'],2,'An AND gate requires every input to be high.'],
    ['Which component stores energy in an electric field?',['A resistor','A capacitor','An inductor'],1,'A capacitor holds energy in the electric field between its conductors.']
  ]
};
const dialog=document.querySelector('[data-course-quiz]');
if(dialog){
  const course=dialog.dataset.courseQuiz,questions=banks[course];
  const storageKey='imon-course-quiz-'+course;
  const question=dialog.querySelector('legend'),choices=dialog.querySelector('[data-choices]');
  const action=dialog.querySelector('[data-grade]'),feedback=dialog.querySelector('[role=status]');
  const status=dialog.querySelector('[data-score]');
  let index=0,score=0,graded=false;
  function render(){
    choices.replaceChildren();feedback.textContent='';graded=false;
    if(index===questions.length){
      let best=score;
      try{best=Math.max(score,Number(localStorage.getItem(storageKey))||0);localStorage.setItem(storageKey,String(best));}catch{}
      if(!graded)document.dispatchEvent(new CustomEvent('imon:metric',{detail:'quiz_complete'}));
      if(score>=3)document.dispatchEvent(new CustomEvent('imon:quest-find',{detail:'quiz-'+course}));
      question.textContent='Quiz complete';status.textContent='Score '+score+' / '+questions.length+' · Personal best '+best+' / '+questions.length;
      action.textContent='Try again';action.disabled=false;return;
    }
    const [prompt,answers]=questions[index];
    status.textContent='Question '+(index+1)+' of '+questions.length+' · Score '+score;
    question.textContent=prompt;action.textContent='Check answer';action.disabled=true;
    answers.forEach((answer,i)=>{
      const label=document.createElement('label'),radio=document.createElement('input');
      radio.type='radio';radio.name='quiz-answer';radio.value=i;
      radio.onchange=()=>{action.disabled=false;};
      label.append(radio,document.createTextNode(answer));choices.append(label);
    });
  }
  document.querySelector('[data-open-quiz]').onclick=()=>{if(!question.textContent)render();dialog.showModal();};
  dialog.querySelector('[data-close-quiz]').onclick=()=>dialog.close();
  action.onclick=()=>{
    if(index===questions.length){index=0;score=0;render();return;}
    if(graded){index++;render();question.focus();return;}
    const selected=choices.querySelector('input:checked');if(!selected)return;
    const [,answers,correct,why]=questions[index],right=Number(selected.value)===correct;
    if(right)score++;
    feedback.textContent=(right?'Correct. ':'Correct answer: '+answers[correct]+'. ')+why;
    choices.querySelectorAll('input').forEach(input=>{
      input.disabled=true;
      if(Number(input.value)===correct)input.parentElement.dataset.result='correct';
      else if(input.checked)input.parentElement.dataset.result='incorrect';
    });
    graded=true;action.textContent=index+1===questions.length?'View score':'Next question';
  };
  if(location.hash==='#course-quiz'){render();dialog.showModal();}
}
