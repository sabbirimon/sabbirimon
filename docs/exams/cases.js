// Two linked case studies per track. Each answer is a separately graded skill.
const number = (skill, prompt, answer, why) => ({skill,prompt,answer,why});
const choose = (skill, prompt, options, correct, why) => ({skill,prompt,options,correct,why});
export const exams = {
 code:{name:'Web development',lab:'lab.html',cases:[
  {title:'Repair the course menu',brief:'A course menu attaches a listener to every button each time the menu opens. It has four persistent buttons. After three opens, one click runs the action three times.',tasks:[
   number('Trace execution','How many listener registrations exist after the third open?',12,'Four buttons receive one new listener on each of three opens.'),
   choose('Repair','Which changes can independently prevent duplicate callbacks?',['Bind once on initialization','Delegate once on the persistent menu','Call preventDefault in each callback','Replace click with pointerdown'],[0,1],'Both one-time binding and one-time delegation avoid repeated registration.'),
   choose('Verify','Which test catches a recurrence?',['Open three times and check one click causes one action','Count visible buttons after one open','Check only the CSS hover state'],[0],'The defect appears across openings and affects action count.')]},
  {title:'Publish an accessible result',brief:'A practice page displays four 180px columns with three 16px gaps. Its result message changes after submission. Keyboard and phone users must be able to review the result.',tasks:[
   number('Layout','How many CSS pixels does the grid need before padding?',768,'4 × 180 + 3 × 16 = 768.'),
   choose('Accessibility','Select both changes that improve access.',['Announce the result with a status region','Use a native submit button','Indicate correctness by color alone','Remove the focus ring'],[0,1],'Native controls provide keyboard behavior. A status region announces the change.'),
   choose('Verify','On a 360px viewport, which layout preserves readable text?',['Wrap cards into fewer columns','Scale the whole page to half size','Hide overflowing answers'],[0],'Reflow keeps controls and the result readable at the normal text size.')]}]},
 ai:{name:'AI and data',lab:'ai-lab.html',cases:[
  {title:'Evaluate an alert model',brief:'For 100 examples, a classifier reports 12 true positives, 8 false positives, 4 false negatives and 76 true negatives.',tasks:[
   number('Precision','Enter precision as a percentage.',60,'12 of the 20 positive predictions are correct.'),
   number('Recall','Enter recall as a percentage.',75,'12 of the 16 real positives were found.'),
   choose('Model choice','Missed positives are costly. Which action tests an appropriate tradeoff?',['Evaluate a lower threshold on validation data','Tune on the final test set','Remove uncertain labels only from the test set'],[0],'Lowering the threshold can improve recall while increasing false alarms.')]},
  {title:'Prepare a fair evaluation',brief:'A sensor logs 500 readings from 50 machines. You expect to deploy on new machines. Reserve one fifth of the machines for a final holdout.',tasks:[
   number('Sampling','How many machines belong in the holdout?',10,'One fifth of 50 machines is 10 machines.'),
   choose('Leakage','Select both safeguards.',['Split by machine identity','Fit scaling on training data only','Fit scaling on all readings','Put nearby readings from each machine in both sets'],[0,1],'A group split tests unseen machines. Training-only preprocessing avoids leakage.'),
   choose('Evaluation','When should the final holdout be used?',['After selecting the model using training and validation','For choosing every hyperparameter','Before fixing the baseline'],[0],'Evaluate the chosen model once the selection decisions are complete.')]}]},
 circuits:{name:'Circuits and signals',lab:'circuits.html',cases:[
  {title:'Bring up a sensor input',brief:'An ideal 6 V source drives two 1 kΩ resistors in series. The scope measures the midpoint relative to ground. Assume negligible probe loading.',tasks:[
   number('Voltage','What midpoint voltage in volts should the scope show?',3,'Equal resistors split the supply in half.'),
   number('Current','How many milliamps flow through the pair?',3,'6 V divided by 2000 Ω equals 0.003 A.'),
   choose('Diagnosis','Which two changes raise the midpoint voltage?',['Increase the lower resistance','Reduce the upper resistance','Increase the upper resistance','Reduce the supply voltage'],[0,1],'The midpoint is Vin × Rlower / (Rupper + Rlower).')]},
  {title:'Read the scope trace',brief:'One full cycle spans four horizontal divisions at 0.5 ms per division. The trace runs four vertical divisions peak to peak at 0.25 V per division.',tasks:[
   number('Timing','What is the frequency in hertz?',500,'The period is 2 ms, so the frequency is 1 / 0.002.'),
   number('Amplitude','What is the peak-to-peak voltage in volts?',1,'Four divisions times 0.25 V per division equals 1 V.'),
   choose('Sampling','Which sample rate clears the Nyquist limit for an ideal 500 Hz sine?',['800 samples/s','1000 samples/s exactly','5000 samples/s'],[2],'5000 samples/s exceeds twice the signal frequency and gives ten samples per cycle.')]}]},
 systems:{name:'Systems and cloud',lab:'systems.html',cases:[
  {title:'Plan a small network',brief:'A lab has the IPv4 subnet 192.0.2.64/27. Use conventional subnetting with a network and broadcast address.',tasks:[
   number('Capacity','How many usable host addresses are available?',30,'Five host bits give 32 addresses, with two reserved.'),
   choose('Addressing','Select the two assignable addresses.',['192.0.2.65','192.0.2.94','192.0.2.64','192.0.2.95'],[0,1],'The subnet runs from .64 to .95. Its first and last addresses are reserved.'),
   choose('Diagnosis','A client reaches a server by IP but fails by hostname. What should you check first?',['Resolver configuration and DNS records','Increase subnet size','Replace the server power cable'],[0],'Working IP connectivity points first to name resolution.')]},
  {title:'Investigate a cloud usage spike',brief:'Your normal service runs two instances for six hours. During exactly two of those hours, three additional instances run. The practice rate is 0.10 credits per instance-hour.',tasks:[
   number('Usage','How many total instance-hours were consumed?',18,'Baseline usage is 12 instance-hours and the burst adds 6.'),
   number('Cost','How many practice credits does that use?',1.8,'18 × 0.10 equals 1.80 credits.'),
   choose('Operations','Select both checks that help explain the spike.',['Review scaling events for the burst window','Compare per-service usage before and during the burst','Delete the billing history','Assume every request used one instance-hour'],[0,1],'Scaling records and usage trends connect the change in demand to its cost.')]}]}
};
export function grade(task, response) {
  if (!task.options) {
    const value=String(response??'').trim();
    return value!=='' && Number.isFinite(Number(value)) && Math.abs(Number(value)-task.answer)<.000001 ? 1 : 0;
  }
  const selected=new Set(response||[]);
  let credit=0;
  for(const index of selected) credit+=task.correct.includes(index)?1:-1;
  return Math.max(0,credit)/task.correct.length;
}
