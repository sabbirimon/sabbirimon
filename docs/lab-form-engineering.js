// The editor markup stays in a detached, inert template. Native constraint
// validation runs on the resulting controls, including their actual form owner.
const configurations = [
  {
    id:'html-telemetry-step', title:'Validate a quarter-step measurement', name:'gain', type:'number',
    brief:'Write a labeled, required numeric input named gain inside a form. Accept settings from −1.5 to 2 inclusive in increments of 0.25. Try zero, a negative boundary, and a value between steps in the preview.',
    hint:'Use a number input with required, min, max and step. A linked label can wrap the input or use its id.',
    cases:[['',false],['-1.75',false],['-1.5',true],['-1.25',true],['0',true],['0.1',false],['1.75',true],['2',true],['2.25',false]]
  },
  {
    id:'html-batch-id', title:'Constrain an instrument batch ID', name:'batch', type:'text',
    brief:'A batch ID consists of two uppercase ASCII letters, a hyphen and exactly three digits, including leading zeros. Give your form a labeled, required text input named batch. Verify that extra characters and lowercase letters are rejected.',
    hint:'A native pattern covers the entire value. Write a character class for uppercase letters, a literal hyphen, and three digits. Mark the input required separately.',
    cases:[['',false],['AB-007',true],['ZZ-000',true],['aa-004',false],['AB-12',false],['AB-1234',false],['0B-004',false],['AB 004',false]]
  },
  {
    id:'html-remote-date', title:'Connect a remote scheduling control', name:'slot', type:'date', external:true,
    brief:'Create a form with id booking. Outside it, add a labeled, required date input named slot. Associate it with booking and allow dates from 2028-02-28 through 2028-03-02 inclusive. The submitted form must include February 29.',
    hint:'Use form="booking" on the external input, an id or wrapping label, and ISO dates in min and max.',
    cases:[['',false],['2028-02-27',false],['2028-02-28',true],['2028-02-29',true],['2028-03-02',true],['2028-03-03',false]]
  }
];

export const formEngineering = configurations.map(task => ({
  id:task.id, title:task.title, chapter:'HTML · Form engineering', requiresBrowser:true, language:'html', xp:40, brief:task.brief,
  requirements:['input','label','form'],
  starter:{html:task.external ? '<form id="booking"></form>\n<!-- Place the scheduling control here. -->' : '<form>\n  <!-- Add your labeled control. -->\n</form>',css:'',js:''},
  check({html = ''} = {}) {
    const fail = message => ({ok:false, message, hint:task.hint});
    if (!html.trim() || typeof document === 'undefined') return fail('Add the form and its control, then check in the browser.');
    const template = document.createElement('template');
    template.innerHTML = html;
    const root = document.implementation.createHTMLDocument('');
    root.body.append(template.content);
    const form = root.querySelector(task.external ? 'form#booking' : 'form');
    const input = form?.elements.namedItem(task.name);
    if (input?.tagName !== 'INPUT' || input.type !== task.type || !input.willValidate || input.readOnly) {
      return fail('The form needs an editable ' + task.type + ' input named ' + task.name + '.');
    }
    if (!input.labels?.length || ![...input.labels].some(label => label.textContent.trim())) return fail('Give the control a connected, nonempty label.');
    if (task.external && form.contains(input)) return fail('Move the date control outside the form and preserve the association.');
    for (const [value, valid] of task.cases) {
      input.value = value;
      if (input.checkValidity() !== valid) return fail('The browser should ' + (valid ? 'accept ' : 'reject ') + (value || 'an empty field') + '.');
      if (valid && new FormData(form).get(task.name) !== value) return fail('The submitted form must include the accepted value.');
    }
    return {ok:true, message:'Passed all ' + task.cases.length + ' browser validation cases, including the boundaries.'};
  }
}));
