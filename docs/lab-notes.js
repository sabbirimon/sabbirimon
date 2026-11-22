/**
 * The explanation panel under the code editor.
 *
 * The exercise brief says what to do. This panel says why it matters, so
 * the space under the editor carries something worth reading instead of
 * sitting empty.
 *
 * The notes are written per language, because a selector exercise and a
 * loop exercise teach different things. When the exercise names the
 * elements or properties it is about — the imported course lists them as
 * `requirements` — those are matched against the note library and the
 * matching notes are shown first.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/**
 * The note library.
 *
 * Each entry is keyed by the tag or property it explains. `title` is the
 * headline, `body` is the explanation, and `example` is a short snippet
 * shown in the panel so the idea is concrete.
 */
export const NOTES = {
  /* HTML ------------------------------------------------------------- */
  h1: { title: 'The level-one heading', body: 'A page has one main heading, and it is the <h1>. It tells a reader — and a search engine — what the page is about. Headings nest: an h2 sits under an h1, an h3 under an h2.', example: '<h1>My page</h1>' },
  h2: { title: 'The level-two heading', body: 'An h2 marks a section under the page heading. It is the outline of the document, and screen readers use it to jump between sections.', example: '<h2>Chapter one</h2>' },
  h3: { title: 'The level-three heading', body: 'An h3 is a sub-section. Skipping a level breaks the outline, so an h3 should always sit under an h2.', example: '<h3>A smaller heading</h3>' },
  p: { title: 'The paragraph', body: 'A p holds running text. It is the default element for anything you want the reader to read as prose.', example: '<p>I am a paragraph.</p>' },
  ul: { title: 'The unordered list', body: 'A ul is a bulleted list. Each item in it is a li. A list tells the reader that the items belong together.', example: '<ul>\n  <li>Apples</li>\n</ul>' },
  ol: { title: 'The ordered list', body: 'An ol is a numbered list. The numbers carry meaning, so the order of the items matters.', example: '<ol>\n  <li>First</li>\n</ol>' },
  li: { title: 'The list item', body: 'An li is one entry in a list. It only means anything inside a ul or an ol.', example: '<li>One item</li>' },
  img: { title: 'The image', body: 'An img is a void element: it has no closing tag. It needs two attributes — src for the file and alt for the description.', example: '<img src="hero.png" alt="A pixel hero">' },
  a: { title: 'The link', body: 'An a is a link. Its href says where it goes, and its text says what it is. A link whose text only says "click here" helps nobody.', example: '<a href="https://example.com">Read more</a>' },
  div: { title: 'The generic box', body: 'A div is a plain box with no meaning of its own. It is used to group things for styling, and it is the last resort before a more specific element.', example: '<div class="card">…</div>' },
  span: { title: 'The inline box', body: 'A span wraps a short run of text inside a sentence. It carries no meaning of its own either.', example: '<span class="badge">New</span>' },
  button: { title: 'The button', body: 'A button does something. A link goes somewhere. Choosing the wrong one confuses both the reader and the screen reader.', example: '<button>Save</button>' },
  input: { title: 'The input', body: 'An input takes a value from the reader. It needs a label, or the reader has no idea what to type.', example: '<label for="name">Name</label>\n<input id="name">' },
  label: { title: 'The label', body: 'A label names a form control. Clicking the label focuses the control, and a screen reader reads the name out with it.', example: '<label for="email">Email</label>' },
  form: { title: 'The form', body: 'A form groups related controls and sends them somewhere. A form with no action submits to the page it is on.', example: '<form action="/save" method="post">…</form>' },
  table: { title: 'The table', body: 'A table holds tabular data. It is not a layout tool — a grid of divs is a grid, and a table is rows and columns of values.', example: '<table>\n  <tr><td>A</td></tr>\n</table>' },
  header: { title: 'The header', body: 'A header holds the introductory part of a section or a page. There can be many of them on a page.', example: '<header>…</header>' },
  footer: { title: 'The footer', body: 'A footer holds the closing part of a section or a page — usually credits, links and contact details.', example: '<footer>© 2026</footer>' },
  main: { title: 'The main landmark', body: 'A main holds the content that is unique to the page. There should be one per page, and it is what a screen reader jumps to.', example: '<main>…</main>' },
  section: { title: 'The section', body: 'A section is a thematic grouping of content. It usually carries a heading of its own.', example: '<section>\n  <h2>About</h2>\n</section>' },
  article: { title: 'The article', body: 'An article is a chunk of content that would still make sense if it were syndicated on its own — a post, a comment, a news story.', example: '<article>…</article>' },
  nav: { title: 'The navigation', body: 'A nav holds links to other pages of the same site. There is usually one per page.', example: '<nav>…</nav>' },
  strong: { title: 'The strong emphasis', body: 'A strong marks text of strong importance. It is emphasis for meaning, not just for looks.', example: '<strong>Check answer</strong>' },
  em: { title: 'The emphasis', body: 'An em marks text with stress emphasis. It is a different tag from strong, and readers should tell them apart.', example: '<em>really</em>' },
  code: { title: 'The inline code', body: 'A code marks a run of code inside a sentence. It is drawn in a monospace face so it reads as code.', example: '<code>console.log()</code>' },
  pre: { title: 'The preformatted block', body: 'A pre keeps its whitespace exactly as written, which is what a block of code needs. Pair it with a code inside.', example: '<pre><code>…</code></pre>' },
  br: { title: 'The line break', body: 'A br ends the line. It is a void element and it is a last resort — a new block is usually the better answer.', example: 'One<br>Two' },

  /* CSS -------------------------------------------------------------- */
  color: { title: 'The colour', body: 'color sets the text colour. It is inherited, so setting it on the body colours everything inside it unless a rule overrides it.', example: 'p { color: #14adff; }' },
  'background-color': { title: 'The background colour', body: 'background-color paints behind the element. Without padding the colour is only as big as the text.', example: 'p { background-color: #e0f2fe; }' },
  background: { title: 'The background shorthand', body: 'background sets colour, image, position and repeat in one go. A gradient is one of the values it takes.', example: 'body { background: linear-gradient(#000, #123); }' },
  padding: { title: 'The padding', body: 'padding is the space inside the box, between the content and the border. It belongs to the element itself.', example: 'p { padding: 12px; }' },
  margin: { title: 'The margin', body: 'margin is the space outside the box, between it and its neighbours. Two margins next to each other collapse into the larger one.', example: 'p { margin: 0 0 16px; }' },
  border: { title: 'The border', body: 'border draws a line around the box. It takes a width, a style and a colour, in that order.', example: 'p { border: 2px solid #2a3049; }' },
  'font-size': { title: 'The font size', body: 'font-size sets the size of the text. The default is 16px, and the unit matters: px is fixed, rem follows the root font size.', example: 'p { font-size: 18px; }' },
  'font-weight': { title: 'The font weight', body: 'font-weight sets how heavy the text is. 700 is bold, 400 is normal. A value of 600 is a semibold, which many families do not have.', example: 'li { font-weight: bold; }' },
  'font-family': { title: 'The font family', body: 'font-family names the typeface. Give a fallback list, because the first font may not be installed on the reader’s machine.', example: 'body { font-family: system-ui, sans-serif; }' },
  display: { title: 'The display', body: 'display decides how the box is laid out. block takes a full line, inline flows inside a sentence, flex and grid arrange children.', example: '.row { display: flex; }' },
  flex: { title: 'The flex container', body: 'flex arranges children in a row or a column. flex-direction says which way, gap says how far apart.', example: '.row { display: flex; gap: 16px; }' },
  grid: { title: 'The grid container', body: 'grid arranges children in rows and columns. grid-template-columns says how many columns and how wide they are.', example: '.wrap { display: grid; grid-template-columns: 1fr 1fr; }' },
  position: { title: 'The position', body: 'position decides whether a box stays in the flow or is taken out of it. relative nudges a box without disturbing its neighbours; absolute takes it out.', example: '.badge { position: absolute; top: 0; }' },
  width: { title: 'The width', body: 'width sets how wide the content box is. A percentage width is relative to the parent.', example: '.card { width: 100%; }' },
  height: { title: 'The height', body: 'height sets how tall the content box is. Leave it alone and let the content decide the height.', example: '.panel { min-height: 200px; }' },
  'text-align': { title: 'The text alignment', body: 'text-align lines the text up inside its box. It does not move the box itself.', example: 'h1 { text-align: center; }' },
  'line-height': { title: 'The line height', body: 'line-height sets the distance between lines of text. A unitless number is a multiple of the font size, which is what you usually want.', example: 'p { line-height: 1.6; }' },
  'border-radius': { title: 'The corner radius', body: 'border-radius rounds the corners. Half the height makes a pill; half the width makes a circle.', example: '.chip { border-radius: 999px; }' },
  opacity: { title: 'The opacity', body: 'opacity fades the whole element, including its text. rgba() in the background colour fades only the colour.', example: '.faded { opacity: .5; }' },
  transform: { title: 'The transform', body: 'transform moves, scales or rotates a box without disturbing the layout around it.', example: '.card:hover { transform: translateY(-2px); }' },
  transition: { title: 'The transition', body: 'transition animates a change. Name the property and the duration; the timing function is optional.', example: 'a { transition: color .2s ease; }' },
  'z-index': { title: 'The stacking order', body: 'z-index says which of two overlapping boxes sits on top. It only works on positioned elements.', example: '.overlay { z-index: 10; }' },
  overflow: { title: 'The overflow', body: 'overflow says what happens to content that does not fit. hidden clips it, auto adds a scrollbar.', example: '.pane { overflow: auto; }' },

  /* JavaScript -------------------------------------------------------- */
  variable: { title: 'The variable', body: 'A variable gives a value a name. const says the name will not change; let says it might.', example: 'const score = 42;' },
  function: { title: 'The function', body: 'A function takes inputs, does something, and gives back an answer. return sends the answer back to whoever called it.', example: 'function double(n) { return n * 2; }' },
  loop: { title: 'The loop', body: 'A loop repeats a block of code. A for loop counts; a for…of loop walks through a list.', example: 'for (let i = 0; i < 5; i++) {\n  console.log("tick");\n}' },
  condition: { title: 'The condition', body: 'An if statement picks one of two paths. The else runs when the condition is false.', example: 'if (n > 10) {\n  console.log("big");\n} else {\n  console.log("small");\n}' },
  array: { title: 'The array', body: 'An array is a list of values. The index of the first item is 0, not 1.', example: 'const fruits = ["apple", "pear"];' },
  object: { title: 'The object', body: 'An object holds key–value pairs. Reach a value with a dot: user.name.', example: 'const user = { name: "Imon" };' },
  'console.log': { title: 'The console', body: 'console.log writes a value to the console below the editor. It is how you see what your code actually did.', example: 'console.log(score);' },
  string: { title: 'The string', body: 'A string is text in quotes. Template literals use backticks and can hold a value inside: `Hi ${name}`.', example: 'console.log(`Score: ${score}`);' },
  number: { title: 'The number', body: 'A number is written without quotes. A number in quotes is a string, and the two behave differently in maths.', example: 'const total = 40 + 2;' },
  boolean: { title: 'The boolean', body: 'A boolean is true or false. It is what a comparison gives you, and what an if statement tests.', example: 'const solved = true;' },
  event: { title: 'The event', body: 'An event is something that happened. addEventListener waits for one and runs your code when it fires.', example: 'button.addEventListener("click", () => {\n  console.log("clicked");\n});' },
  dom: { title: 'The document', body: 'The DOM is the page as a tree of objects. querySelector finds the first element that matches a selector.', example: 'const h1 = document.querySelector("h1");' },
  'querySelector': { title: 'The selector', body: 'querySelector takes a CSS selector and returns the first match, or null when there is none.', example: 'document.querySelector("#roses")' },
  'addEventListener': { title: 'The listener', body: 'addEventListener attaches a function to an event. The function runs when the event happens on that element.', example: 'el.addEventListener("click", handler);' },
  'textContent': { title: 'The text', body: 'textContent reads or writes the text inside an element. It never runs any markup you put in it.', example: 'el.textContent = "Hello";' },
  'classList': { title: 'The class list', body: 'classList adds and removes classes without rewriting the whole class attribute.', example: 'el.classList.add("is-open");' },
  'setAttribute': { title: 'The attribute', body: 'setAttribute sets an attribute on an element — a class, an id, a data value.', example: 'el.setAttribute("aria-expanded", "true");' },
  'createElement': { title: 'The new element', body: 'createElement makes a detached element. It only appears on the page once it is appended.', example: 'const li = document.createElement("li");' },
  'appendChild': { title: 'The append', body: 'appendChild puts a node inside another one, at the end.', example: 'list.appendChild(item);' },
  'return': { title: 'The return', body: 'return ends the function and sends a value back. A function without a return gives back undefined.', example: 'return n * 2;' },
  'push': { title: 'The push', body: 'push adds an item to the end of an array and gives back the new length.', example: 'scores.push(10);' },
  'map': { title: 'The map', body: 'map builds a new array by running a function over every item of the old one.', example: 'const doubled = scores.map(n => n * 2);' },
  'filter': { title: 'The filter', body: 'filter keeps the items a test says to keep, and returns them as a new array.', example: 'const best = scores.filter(n => n > 50);' },
  'forEach': { title: 'The forEach', body: 'forEach runs a function once per item. It does not build a new array.', example: 'scores.forEach(n => console.log(n));' },
  template: { title: 'The template literal', body: 'A template literal uses backticks and can drop a value into the text with ${}.', example: 'const line = `You scored ${score} points`;' },

  /* The words the JavaScript quiz asks about ------------------------- */
  script: { title: 'The script element', body: 'A script element holds JavaScript. A code element shows code to the reader without running it, which is a different job entirely.', example: '<script src="app.js"></script>' },
  comment: { title: 'The comment', body: 'A comment is a note the engine ignores. // runs to the end of the line; /* */ runs to the next */.', example: '/* a note for the reader */\n// another one' },
  case: { title: 'Case sensitivity', body: 'JavaScript compares names letter by letter, so total and Total are two different names and only one of them holds your value.', example: 'const total = 10;\nconsole.log(Total); // ReferenceError' },
  const: { title: 'The const binding', body: 'const declares a name that cannot be reassigned. It is the default for anything that will not change.', example: 'const MAX = 10;' },
  typeof: { title: 'The typeof operator', body: 'typeof gives back the name of a type as a string, which is how you check what a value actually is.', example: 'typeof "hello"; // "string"' },
  undefined: { title: 'The undefined value', body: 'A name that was declared but never given a value holds undefined. null is a value you choose on purpose, to say "nothing here" yourself.', example: 'let score;\nconsole.log(score); // undefined' },
  nan: { title: 'The not-a-number value', body: 'NaN comes out of maths that cannot work, such as 0 / 0. It is the only value that is not equal to itself, so compare it with Number.isNaN.', example: 'Number.isNaN(0 / 0); // true' },
  '===': { title: 'The strict equality', body: '=== compares the value and the type together, so 5 === "5" is false. A single = assigns instead of comparing.', example: '5 === "5"; // false' },
  operator: { title: 'The operator', body: 'An operator does something to values. + adds numbers but joins text, and % gives back what is left over after a division.', example: '7 % 3; // 1' },
  'string method': { title: 'The string method', body: 'A method is a function that belongs to a value. String methods give back a new string and leave the original alone.', example: '"hello".toUpperCase(); // "HELLO"' },
  'template literal': { title: 'The template literal', body: 'A template literal uses backticks, and ${name} drops the value of name straight into the text without joining it by hand.', example: 'const line = `Hello ${name}`;' },
  'array method': { title: 'The array method', body: 'Array methods work on a list. Most of them give back a new array and leave the old one untouched.', example: 'scores.map(n => n * 2);' },
  'object property': { title: 'The property', body: 'A property is a key–value pair on an object. Both notations work: user.age and user["age"] do the same thing when the name is a plain word.', example: 'user.age = 30;' },
  json: { title: 'The JSON format', body: 'JSON is text that holds data. It uses curly braces for objects, square brackets for arrays, and double quotes around every name.', example: '{"name": "Imon", "level": 2}' },
  parameter: { title: 'The parameter', body: 'A parameter is a name in the definition for a value the caller passes in. The value that arrives is the argument.', example: 'function double(n) {\n  return n * 2;\n}' },
  'arrow function': { title: 'The arrow function', body: 'An arrow function writes its parameters, then the arrow, then the body. It has no own this, which is why it suits short callbacks.', example: 'const double = n => n * 2;' },
  if: { title: 'The if statement', body: 'An if statement runs its block only when the condition is true. A false condition means the block is skipped and the code carries on.', example: 'if (score > 50) {\n  console.log("passed");\n}' },
  for: { title: 'The for loop', body: 'A for loop takes three things: where to start, when to stop, and what to change each time round.', example: 'for (let i = 0; i < 5; i++) {\n  console.log(i);\n}' },
  break: { title: 'The break', body: 'break leaves the loop altogether. continue is the one that skips to the next item and carries on round the loop.', example: 'for (const n of list) {\n  if (n < 0) break;\n}' }
};

/**
 * The notes shown when an exercise does not name anything specific.
 *
 * They are the ideas every exercise leans on, in the order they are
 * usually needed.
 */
export const GENERAL_NOTES = {
  html: [
    { title: 'HTML gives the page its structure', body: 'HTML is the set of elements that make up the document. A heading is a heading because it is an h1, not because of how it looks. Choosing the right element is most of the job.', example: '<h1>Title</h1>\n<p>Body</p>' },
    { title: 'The browser fixes mistakes', body: 'A missing closing tag does not break the page. The browser reads what it can and carries on, which is why a page can look fine while the markup behind it is wrong.', example: '<p>Unclosed paragraph' }
  ],
  css: [
    { title: 'CSS is a set of rules', body: 'Each rule picks some elements and gives them some properties. The order they are written in matters when two rules pick the same element.', example: 'p { color: red; }\np { color: blue; }' },
    { title: 'The box model', body: 'Every element is a box with content, padding, border and margin around it. Most layout problems come down to which of those four you are changing.', example: '.card {\n  padding: 12px;\n  border: 2px solid #000;\n}' }
  ],
  js: [
    { title: 'JavaScript runs in the browser', body: 'There is no server here. The code you type runs straight away, and console.log is how it talks back to you.', example: 'console.log("hello");' },
    { title: 'The DOM is the page', body: 'Every element on the page is an object you can reach and change. That is how a button ends up doing something.', example: 'document.querySelector("h1").textContent = "Hi";' }
  ]
};

/**
 * Normalise a requirement into a lookup key.
 *
 * The imported course writes requirements as tag names or property names,
 * sometimes with a dot, a colon or angle brackets. `h1`, `.card`, `<p>` and
 * `background-color` all have to end up as the same shape as the note
 * library.
 */
export function noteKey(requirement) {
  if (!requirement) return '';
  return String(requirement)
    .trim()
    .toLowerCase()
    .replace(/^<|>$/g, '')
    .replace(/^[.#]/, '');
}

/**
 * Find the notes that match a list of requirements.
 *
 * The notes come back in the order the requirements were given, and a
 * requirement with no note is skipped. When nothing matches, the general
 * notes for the language are returned instead, so the panel is never
 * empty.
 */
export function notesFor(exercise, general = GENERAL_NOTES) {
  const requirements = Array.isArray(exercise?.requirements) ? exercise.requirements : [];
  const matched = [];
  const seen = new Set();
  for (const requirement of requirements) {
    const key = noteKey(requirement);
    if (!key || seen.has(key)) continue;
    const note = NOTES[key];
    if (!note) continue;
    seen.add(key);
    matched.push({ key, ...note });
  }
  if (matched.length) return matched;
  const language = exercise?.language || 'html';
  return (general[language] || general.html).map((note, index) => ({ key: `general-${index}`, ...note }));
}

/**
 * The one-line summary shown above the notes.
 *
 * The chapter name usually carries the language already — "CSS · Flexbox"
 * is the CSS course — so the language is only named on its own when the
 * chapter does not say it.
 */
export function notesSummary(exercise) {
  const language = exercise?.language || 'html';
  const names = { html: 'HTML', css: 'CSS', js: 'JavaScript' };
  const name = names[language] || language;
  const chapter = String(exercise?.chapter || '').trim();
  if (!chapter) return name;
  // The chapter already names the language, so the language is left out.
  if (chapter.toLowerCase().includes(name.toLowerCase())) return chapter;
  return `${name} · ${chapter}`;
}

/**
 * Fill the explanation panel for an exercise.
 *
 * The panel is given the notes for the exercise and the summary line. The
 * DOM work is here rather than in the module so the module stays pure.
 *
 * Each note card carries a "Look it up" button. The button asks the
 * documentation service about that one tag or property, so a learner who
 * meets something unfamiliar does not have to leave the page. The service
 * is called by the caller, which is passed in as `onLookup`.
 */
export function initLabNotes(root = document, onLookup = null) {
  const panel = root.querySelector?.('[data-lab-notes]');
  const summary = root.querySelector?.('[data-lab-notes-sub]');
  if (!panel) return null;

  function render(exercise) {
    const notes = notesFor(exercise);
    if (summary) summary.textContent = notesSummary(exercise);
    panel.textContent = '';
    for (const note of notes) {
      const card = document.createElement('article');
      card.className = 'lab-note';
      const heading = document.createElement('h3');
      heading.className = 'lab-note-title';
      heading.textContent = note.title;
      const body = document.createElement('p');
      body.className = 'lab-note-body';
      body.textContent = note.body;
      card.append(heading, body);
      if (note.example) {
        const pre = document.createElement('pre');
        pre.className = 'lab-note-example';
        const code = document.createElement('code');
        code.textContent = note.example;
        pre.append(code);
        card.append(pre);
      }
      // The general notes are about the language as a whole, so there is
      // nothing specific to look up.
      if (onLookup && !note.key.startsWith('general-')) {
        const look = document.createElement('button');
        look.type = 'button';
        look.className = 'lab-note-lookup';
        look.dataset.labNoteLookup = note.key;
        look.textContent = 'Search for it';
        look.setAttribute('aria-label', `Search for questions about ${note.key}`);
        card.append(look);
      }
      panel.append(card);
    }
    return notes.length;
  }

  return { render };
}
