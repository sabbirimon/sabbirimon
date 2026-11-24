import {chapterPlacement} from './learning-modules.js';

// A formative check for each module. Course exams and saved scores remain separate.
const questions = {
  'Web fundamentals':['A browser shows a page title as plain text. Which element marks it as the main heading?','h1','title','header','An h1 describes the main heading in the visible document.'],
  'HTML & accessible forms':['Two controls share the same label text. What connects each visible label to its intended field?','Matching for and id values','The order of CSS rules','Identical placeholder text','The label’s for value references the unique id on its control.'],
  'CSS & layout':['A flex row must use a second line when space runs out. Which property permits it?','flex-wrap: wrap','align-items: center','flex-grow: 2','Wrapping allows flex items to form extra lines when their combined size exceeds the available space.'],
  'JavaScript':['What does [2, 4].map(n => n + 1) return?','[3, 5]','[2, 4, 1]','7','map creates a new array using the callback result for each original item.'],
  'Web projects':['A form must submit when someone presses Enter in its text field. Which event should you handle?','The form’s submit event','Only the button’s mouseover event','The window’s resize event','The native submit event covers both keyboard and button submission.'],
  'Python & model fundamentals':['Four predictions are 1, 0, 1 and 1. What fraction of them are positive?','0.75','0.25','1.00','Three of four predictions are positive, so the fraction is 3 ÷ 4.'],
  'Data & APIs':['An API returns a next-page token. How can a client retrieve all available rows?','Follow each token until none remains','Retry the first page repeatedly','Assume every page contains the same rows','The next-page token identifies the continuation of a paginated response.'],
  'Model quality & safety':['A classifier raises 20 alerts. Twelve are correct. What is its precision?','60%','40%','80%','Precision is true positives divided by all positive predictions: 12 ÷ 20.'],
  'AI systems':['A client retries a request after a timeout. What helps prevent a duplicate purchase?','An idempotency key','A larger response body','A longer queue','The service can recognize a repeated operation and return its original result.'],
  'Circuit fundamentals':['A resistor connects 6 V across 2 kΩ. What is its current?','3 mA','12 mA','3 A','Current is voltage divided by resistance: 6 ÷ 2000 A = 3 mA.'],
  'Analog electronics':['A low-pass RC filter uses a larger capacitor with the same resistance. What happens to its cutoff frequency?','It falls','It rises','It remains fixed','The cutoff frequency is 1/(2πRC), so increasing C reduces it.'],
  'Digital electronics':['A rising-edge flip-flop has a stable D input of 1. When does its output capture that value?','On the rising clock edge','Whenever the clock is low','Only when D changes to 0','An edge-triggered D flip-flop samples its input on its active clock edge.'],
  'Signal measurement':['Which instrument shows voltage changing over time?','An oscilloscope','A continuity buzzer','A resistance meter','An oscilloscope plots voltage against a time axis.'],
  'Networks & support':['A conventional IPv4 /27 subnet reserves network and broadcast addresses. How many usable host addresses remain?','30','32','26','Five host bits give 32 addresses. Reserving two leaves 30.'],
  'Cloud & service design':['A service runs four instances for three hours. How many instance-hours does it consume?','12','7','4','Multiply the number of running instances by the hours each runs.'],
  'Security operations':['Which permission should a backup reader get to verify an archived file?','Read access to the relevant backup','Administrator access to the whole account','Permission to delete every archive','Least privilege grants the access needed to complete the verification.'],
  'Signals & computing':['Which bit of a binary integer changes when you toggle only its parity between even and odd?','The least significant bit','The most significant bit','The sign bit','The least significant bit has place value one and determines even or odd parity.']
};

export function showTopicCheck(panel, track, chapter, exerciseId) {
  if (!panel) return;
  const module = chapterPlacement(track,chapter).module;
  const item = questions[module];
  panel.replaceChildren();
  panel.hidden = !item;
  if (!item) return;
  const heading = document.createElement('h2');
  heading.textContent = 'Topic check';
  const topic = document.createElement('p');
  topic.className = 'topic-name';
  topic.textContent = module;
  const field = document.createElement('fieldset');
  const question = document.createElement('legend');
  const [prompt, correct, wrongOne, wrongTwo, why] = item;
  question.textContent = prompt;
  field.append(question);
  const feedback = document.createElement('p');
  feedback.setAttribute('role','status');
  // Keep answer positions stable for a lesson and varied across the course.
  const rotation = Array.from(exerciseId || chapter).reduce((sum,char)=>sum+char.charCodeAt(0),0)%3;
  const options = [correct,wrongOne,wrongTwo];
  for (let i=0;i<options.length;i++) {
    const answer=options[(i+rotation)%3];
    const option=document.createElement('button');
    option.type='button';
    option.textContent=answer;
    option.onclick=()=>{
      field.querySelectorAll('button').forEach(button=>button.removeAttribute('data-outcome'));
      const ok=answer===correct;
      option.dataset.outcome=ok?'correct':'retry';
      feedback.textContent=ok?'Correct. '+why:'Try again. Review the explanation or test your idea in the workbench.';
    };
    field.append(option);
  }
  panel.append(heading,topic,field,feedback);
  if (track==='code' && module==='JavaScript') {
    const bank=document.createElement('a');
    bank.href='lab.html?exercise=js-quiz-01';bank.textContent='Open the JavaScript question bank';
    panel.append(bank);
  }
}
