/**
 * The learning material for each lab chapter.
 *
 * The exercise brief says what to do. This module says what the chapter is
 * for, what the syntax looks like, how the exercise will be checked, and
 * what you will be able to do once it is done.
 *
 * The course shape — the chapter names, the topics, the level and the
 * estimated time — comes from the Codédex course pages:
 *   https://www.codedex.io/html  (free, beginner, about 25 hours)
 *   https://www.codedex.io/css   (free, beginner, about 20 hours)
 * The per-chapter material here is written for this site.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** The HTML course as advertised on the Codédex course page. */
export const HTML_COURSE = {
  name: 'The Origins I: HTML',
  level: 'Beginner',
  hours: 'About 25 hours',
  free: true,
  topics: ['HTML fundamentals', 'HTML tags and elements', 'Web page structure', 'Forms and inputs', 'Semantic HTML'],
  outcome: 'Build websites, landing pages, portfolios, blogs and web forms from a blank file.',
  needs: 'No prior coding experience needed.'
};

/** The CSS course as advertised on the Codédex course page. */
export const CSS_COURSE = {
  name: 'The Origins II: CSS',
  level: 'Beginner',
  hours: 'About 20 hours',
  free: true,
  topics: ['CSS selectors and properties', 'Colors and fonts', 'Sizing and spacing', 'Layouts and positioning', 'Responsive design'],
  outcome: 'Style a page from scratch and lay it out so it works on a phone as well as a desktop.',
  needs: 'Some HTML is helpful, but the CSS chapters each explain the tags they use.'
};

/**
 * The chapter learning material.
 *
 * Every chapter carries the same four things:
 *
 *   goal       — what this chapter is for, in one sentence.
 *   material   — the study material: the syntax, written out, with the
 *                code shown next to what it means.
 *   exam       — how the exercise will be checked, so nothing is a
 *                surprise when the answer button says no.
 *   outcome    — what you can do afterwards.
 *
 * The chapter keys are matched against the `chapter` field of an exercise.
 */
export const CHAPTERS = {
  /* -- HTML --------------------------------------------------------- */
  'HTML · Elements': {
    goal: 'Learn the elements a page is built from, and how to write them correctly.',
    material: [
      {
        title: 'An element has an opening tag, content and a closing tag',
        body: 'Most elements wrap something. The opening tag says what it is, the content is what is inside it, and the closing tag says where it ends.',
        code: '<p>Hello</p>\n│    │    └─ closing tag\n│    └──── content\n└───────── opening tag'
      },
      {
        title: 'Self-closing elements have no content',
        body: 'An image or a line break holds nothing, so it has no closing tag. In HTML5 the slash is optional.',
        code: '<img src="cat.png" alt="A cat">\n<br>'
      },
      {
        title: 'Attributes carry extra information',
        body: 'An attribute is a name and a value inside the opening tag. Some elements need them: an image needs a source, a link needs a destination.',
        code: '<a href="https://example.com" title="Example">Example</a>'
      },
      {
        title: 'Nesting follows the order you open them',
        body: 'Elements close in the reverse order they were opened. The inside one closes first.',
        code: '<div>\n  <p>\n    Text\n  </p>   <!-- p closes before div -->\n</div>'
      }
    ],
    exam: 'Your code is read as text and checked for the elements the exercise asks for. Text inside an HTML comment is ignored, so a commented-out placeholder does not count.',
    outcome: 'You can write a page out of elements without looking up a single tag.'
  },

  'HTML · Structure': {
    goal: 'Learn how the parts of a page fit together, from the outermost document to the smallest box.',
    material: [
      {
        title: 'Every page starts the same way',
        body: 'The document type comes first, then the html element. Everything you can see sits inside the body.',
        code: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>The page</title>\n  </head>\n  <body>\n    <h1>The page</h1>\n  </body>\n</html>'
      },
      {
        title: 'Head and body are different jobs',
        body: 'The head holds information about the page: its title, its character set, links to stylesheets. The body holds the content itself.',
        code: '<head>…</head>   <!-- about the page -->\n<body>…</body>   <!-- the page -->'
      },
      {
        title: 'Comments explain, they do not show',
        body: 'A comment is written with angle brackets and an exclamation mark. It is invisible on the page and it is ignored by the checker.',
        code: '<!-- this is a note for the next person -->'
      },
      {
        title: 'The language is declared once',
        body: 'The lang attribute on the html element tells screen readers and search engines which language the page is in.',
        code: '<html lang="en">'
      }
    ],
    exam: 'The checker looks for the structural elements the exercise names — the doctype, the head, the title, the body — and for the nesting order between them.',
    outcome: 'You can lay out a whole document and know which part of it goes where.'
  },

  'HTML · Forms': {
    goal: 'Learn how a page collects information from a person filling it in.',
    material: [
      {
        title: 'A form holds the controls and says where to send them',
        body: 'The action is the address the data goes to and the method is how it travels. Get is for reading, post for sending.',
        code: '<form action="/subscribe" method="post">\n  <input name="email">\n  <button>Subscribe</button>\n</form>'
      },
      {
        title: 'Every input needs a label',
        body: 'A label tells the reader what to type, and clicking it puts the cursor in the field. The for attribute links it to the input by id.',
        code: '<label for="email">Email</label>\n<input id="email" name="email" type="email">'
      },
      {
        title: 'The type decides what is accepted',
        body: 'type="email" and type="number" give the browser a hint, and type="checkbox" gives a box that can be ticked.',
        code: '<input type="email">\n<input type="number">\n<input type="checkbox">'
      },
      {
        title: 'A button inside a form submits it',
        body: 'The type attribute says which kind of button it is: submit sends the form, button does nothing on its own.',
        code: '<button type="submit">Send</button>\n<button type="button">Just a button</button>'
      }
    ],
    exam: 'The checker confirms that the form, the inputs and their labels are all present, and that each label is tied to the control it names.',
    outcome: 'You can build a form that a person can actually fill in and understand.'
  },

  'HTML · Semantic HTML': {
    goal: 'Learn to use the element that says what the content means, not just what it looks like.',
    material: [
      {
        title: 'Meaning is the whole point',
        body: 'A search engine and a screen reader both read the markup, not the picture. The right element is the accessible one.',
        code: '<!-- says nothing -->\n<div class="heading">Title</div>\n\n<!-- says everything -->\n<h1>Title</h1>'
      },
      {
        title: 'Landmarks name the regions of a page',
        body: 'header, nav, main, article, section, aside and footer tell a reader what kind of content they have reached.',
        code: '<header>…</header>\n<nav>…</nav>\n<main>\n  <article>…</article>\n</main>\n<footer>…</footer>'
      },
      {
        title: 'One main per page',
        body: 'A main holds the content unique to that page. There should be exactly one, because it is what a screen reader jumps to.',
        code: '<main>…</main>'
      },
      {
        title: 'Figures and captions travel together',
        body: 'A figure wraps an image with its caption, so the caption stays attached when the page is read aloud.',
        code: '<figure>\n  <img src="chart.png" alt="Sales by quarter">\n  <figcaption>Sales by quarter</figcaption>\n</figure>'
      }
    ],
    exam: 'The checker looks for the landmark elements the exercise names and checks that they are used in a sensible order.',
    outcome: 'You can mark up a page so that it reads correctly with your eyes closed.'
  },

  /* -- CSS ---------------------------------------------------------- */
  'CSS · Selectors': {
    goal: 'Learn how to pick out the exact elements you want to change.',
    material: [
      {
        title: 'A selector picks, a declaration sets',
        body: 'Every rule has two halves: the selector says what to change, and the declarations say what to change it to.',
        code: 'h1 {          /* selector */\n  color: red; /* declaration */\n}'
      },
      {
        title: 'The three basic selectors',
        body: 'A tag name picks every element of that tag, a class picks everything with that class, and an id picks the one element with that id.',
        code: 'p { }        /* by tag */\n.intro { }  /* by class */\n#lead { }    /* by id */'
      },
      {
        title: 'Classes are for reuse, ids are for one',
        body: 'You can give an element several classes, and the same class to many elements. An id has to be unique on the page.',
        code: '<p class="intro lead">Both classes apply.</p>'
      },
      {
        title: 'You can narrow a selector down',
        body: 'A class after a tag means "a p that also has this class". A class after a parent means "this class inside that parent".',
        code: 'p.intro { }   /* a p with the class */\n.card .intro { } /* intro inside card */'
      }
    ],
    exam: 'Your stylesheet is read as text. The checker looks for the selector the exercise asks for and for the property it wants on that selector.',
    outcome: 'You can change exactly the elements you mean and nothing else.'
  },

  'CSS · Properties': {
    goal: 'Learn the properties that decide how a piece of content looks.',
    material: [
      {
        title: 'A property has a value',
        body: 'The property names the thing, the value gives the setting. The value can be a word, a number, a colour or a measurement.',
        code: 'p {\n  color: #14adff;\n  font-size: 18px;\n  font-family: system-ui, sans-serif;\n}'
      },
      {
        title: 'Colours come in several forms',
        body: 'A hex code, a named colour, or rgb with an alpha channel for transparency. The alpha is the fourth number, from 0 to 1.',
        code: 'color: tomato;\ncolor: #14adff;\ncolor: rgba(20, 173, 255, .4);'
      },
      {
        title: 'Sizes need units',
        body: 'A bare number is almost always wrong for a length. Pixels are fixed, percentages follow the parent, and rem follows the root font size.',
        code: 'width: 200px;\nwidth: 60%;\nfont-size: 1.25rem;'
      },
      {
        title: 'The last rule wins',
        body: 'When two rules pick the same element and the same property, the one written later takes effect, unless the other is more specific.',
        code: 'p { color: red; }\np { color: blue; }  /* blue */'
      }
    ],
    exam: 'The checker looks for the property the exercise names, anywhere in the stylesheet, and for the selector it should sit on.',
    outcome: 'You can set the look of a page with the properties, and know why a change did not take.'
  },

  'CSS · Box Model': {
    goal: 'Learn how every element is a box, and how that box takes up space.',
    material: [
      {
        title: 'Four layers, from the inside out',
        body: 'Content is in the middle. Padding is inside the border, border is the line itself, and margin is the space outside it all.',
        code: '┌─ margin ────────────┐\n│ ┌─ border ─────────┐ │\n│ │ ┌─ padding ────┐ │ │\n│ │ │   content    │ │ │\n│ │ └───────────────┘ │ │\n│ └───────────────────┘ │\n└───────────────────────┘'
      },
      {
        title: 'Padding and margin are not the same',
        body: 'Padding is inside the border and takes the background with it. Margin is outside and is always transparent.',
        code: '.card {\n  padding: 12px;   /* inside */\n  margin: 0 0 16px; /* outside */\n}'
      },
      {
        title: 'Margins collapse',
        body: 'Two margins next to each other do not add up. They collapse into the larger of the two.',
        code: '.a { margin-bottom: 20px; }\n.b { margin-top: 10px; }\n/* the gap between them is 20px, not 30px */'
      },
      {
        title: 'The box model can be changed',
        body: 'By default padding and border sit outside the width you set. border-box makes the width include them, which is what you usually want.',
        code: '* { box-sizing: border-box; }'
      }
    ],
    exam: 'The checker looks for the box property the exercise asks for — padding, margin, border — on the selector it names.',
    outcome: 'You can control exactly how much room an element takes and why two boxes are not the size you expected.'
  },

  'CSS · Layout': {
    goal: 'Learn how to arrange blocks of content side by side and on top of each other.',
    material: [
      {
        title: 'Display decides how a box behaves',
        body: 'block takes a whole line and stacks. inline flows inside a sentence. inline-block does both. flex and grid arrange their children.',
        code: '.card { display: block; }\n.label { display: inline; }\n.tile { display: inline-block; }'
      },
      {
        title: 'The normal flow is the default',
        body: 'Without any display changes, block-level elements stack from top to bottom in the order they are written.',
        code: '/* three divs stack automatically */'
      },
      {
        title: 'Centring is a box problem',
        body: 'A block with a fixed width centres with auto margins on both sides.',
        code: '.box {\n  width: 400px;\n  margin: 0 auto;\n}'
      },
      {
        title: 'Position takes a box out of the flow',
        body: 'relative nudges a box without moving anything else. absolute takes it out and positions it against the nearest positioned ancestor.',
        code: '.badge { position: relative; top: -2px; }\n.overlay { position: absolute; inset: 0; }'
      }
    ],
    exam: 'The checker looks for the layout property the exercise names — display, position, width — and for the selector it should sit on.',
    outcome: 'You can place things where you want them and know why they went there.'
  },

  'CSS · Flexbox': {
    goal: 'Learn to lay content out in a row or a column and control the space between them.',
    material: [
      {
        title: 'The parent is the flex container',
        body: 'Setting display: flex on an element makes it the container, and its direct children become the flex items.',
        code: '.row {\n  display: flex;\n  gap: 16px;\n}'
      },
      {
        title: 'Direction decides which way it flows',
        body: 'row goes across, column goes down. row-reverse and column-reverse flip the order.',
        code: '.row { display: flex; flex-direction: row; }\n.stack { display: flex; flex-direction: column; }'
      },
      {
        title: 'The main axis is where the items go',
        body: 'justify-content arranges them along the main axis, and align-items arranges them across it.',
        code: '.row {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}'
      },
      {
        title: 'Grow, shrink and basis share one line',
        body: 'flex: 1 1 0 means every item gets an equal share and can grow and shrink. It is the shorthand for the three separate properties.',
        code: '.item { flex: 1 1 0; }'
      }
    ],
    exam: 'The checker looks for display: flex on the container the exercise names, and for the direction or spacing property it asks for.',
    outcome: 'You can build a row of cards, a sidebar, or a centred column without a single float.'
  },

  /* -- The built-in taster course ------------------------------------- */
  'Markup basics': {
    goal: 'Meet the three languages a web page is built from, and write your first elements.',
    material: [
      {
        title: 'HTML, CSS and JavaScript do three different jobs',
        body: 'HTML says what the content is. CSS says how it looks. JavaScript says what happens when it is touched. A page needs all three.',
        code: '<!-- HTML: what it is -->\n<h1>Hello</h1>\n\n/* CSS: how it looks */\nh1 { color: gold; }\n\n// JavaScript: what it does\nconsole.log("hello");'
      },
      {
        title: 'The preview is the real page',
        body: 'Whatever you write in the editor is turned into a page on the right. It is the same code a browser would run.',
        code: '<h1>Hello</h1>'
      }
    ],
    exam: 'Your code is read as text and checked for the elements or properties the exercise names. Press Run to see the result, then Check answer to have it marked.',
    outcome: 'You can write a small page from scratch and understand every line of it.'
  },

  'Styling basics': {
    goal: 'Learn to decide how a page looks, one CSS rule at a time.',
    material: [
      {
        title: 'A rule is a selector and declarations',
        body: 'The selector picks the elements, the declarations say what to change.',
        code: 'h1 {\n  color: blue;\n}'
      },
      {
        title: 'One rule, many parts',
        body: 'A selector can list several elements at once, so one rule can style them all the same.',
        code: 'h1, h2, p {\n  color: blue;\n}'
      }
    ],
    exam: 'The checker looks for the property the exercise asks for and for the selector it should sit on.',
    outcome: 'You can change the colour, the spacing and the box around any part of a page.'
  },

  'Logic basics': {
    goal: 'Learn to make the page do something, with values, conditions and loops.',
    material: [
      {
        title: 'A variable names a value',
        body: 'const says the name will not change, let says it might. The name lets you use the value again later.',
        code: 'const score = 42;\nconsole.log(score);'
      },
      {
        title: 'An if statement picks a path',
        body: 'When the condition is true the first block runs, otherwise the else does.',
        code: 'if (score > 50) {\n  console.log("big");\n} else {\n  console.log("small");\n}'
      },
      {
        title: 'A loop repeats a block',
        body: 'A for loop counts. The condition says when to stop.',
        code: 'for (let i = 0; i < 5; i++) {\n  console.log("tick");\n}'
      },
      {
        title: 'A function takes an input and gives an answer',
        body: 'return sends the answer back to whoever called the function.',
        code: 'function double(n) {\n  return n * 2;\n}\nconsole.log(double(21));'
      }
    ],
    exam: 'The checker reads your script as text and looks for the constructs the exercise names: the variable, the condition, the loop or the function.',
    outcome: 'You can store values, choose between paths and repeat work, which is most of what a script does.'
  },

  /* -- The freeform challenges --------------------------------------- */
  'Challenges · Freeform': {
    goal: 'Put everything together on a page of your own design.',
    material: [
      {
        title: 'These are freeform',
        body: 'There is no single right answer. The checker looks for the elements and properties the challenge names, and leaves the rest of the design to you.',
        code: '<!-- build the page however you like -->'
      },
      {
        title: 'Look at the preview as you go',
        body: 'The preview updates as you type. Use it to check that what you built is what you meant.',
        code: '<!-- press Run to refresh it -->'
      }
    ],
    exam: 'The checker confirms the required elements and properties are present. Layout, colour and wording are yours to decide.',
    outcome: 'You can build a whole page to a brief, which is what the job actually is.'
  },

  'JavaScript · The Basics': {
    goal: 'Learn the core of JavaScript: values, variables, functions and the way it reaches into the page.',
    material: [
      {
        title: 'Values and variables',
        body: 'A variable gives a value a name. const is the default for a name that will not change.',
        code: 'const name = "Imon";\nlet count = 0;'
      },
      {
        title: 'Functions do work and hand back an answer',
        body: 'Parameters go in, return comes out.',
        code: 'function greet(name) {\n  return `Hello ${name}`;\n}'
      },
      {
        title: 'The DOM is the page as objects',
        body: 'querySelector finds an element by a CSS selector. Its text can be read and written.',
        code: 'const h1 = document.querySelector("h1");\nh1.textContent = "New title";'
      },
      {
        title: 'Events are the page talking back',
        body: 'addEventListener waits for something to happen and runs your code when it does.',
        code: 'button.addEventListener("click", () => {\n  console.log("clicked");\n});'
      },
      {
        title: 'Arrays hold lists, objects hold pairs',
        body: 'An array is indexed from zero. An object is looked up by key.',
        code: 'const fruits = ["apple", "pear"];\nconst user = { name: "Imon", level: 2 };'
      }
    ],
    exam: 'The checker reads your script as text and looks for the constructs the exercise names — the variable, the function, the selector, the event.',
    outcome: 'You can reach into a page and change it in response to what a person does.'
  },

  'JavaScript · Quiz': {
    goal: 'Check what you know about the words JavaScript uses. Twenty-five questions, one topic at a time, and an answer that explains itself when you get it wrong.',
    material: [
      {
        title: 'The topics this chapter covers',
        body: 'The questions follow the order a beginner meets the language: the syntax first, then the data it holds, then the things you can do with it.',
        code: 'Syntax & comments\nVariables & types\nOperators\nStrings\nArrays\nObjects\nFunctions\nConditions & loops'
      },
      {
        title: 'How the questions are marked',
        body: 'You pick one of four answers. A wrong answer shows you the right one and why, and you can try the question again — so a mistake costs you nothing but the time to read it.',
        code: 'const total = 42;\n// typeof total is "number"'
      },
      {
        title: 'Further reading',
        body: 'Use the JavaScript quiz in this workbench to review values, functions and control flow. Each answer includes an explanation.',
        code: 'const doubled = [2, 3].map(n => n * 2);'
      }
    ],
    exam: 'You pick one of four answers. A wrong answer shows you the right one and the reason, and you can try again. You earn XP the first time you get a question right.',
    outcome: 'You know what the words mean, so the code in the rest of the course stops looking like a wall of symbols.'
  }
};

/**
 * The material for a chapter.
 *
 * The lookup is by exact chapter name, then by a case-insensitive match, so
 * a chapter that arrives with slightly different spacing still finds its
 * notes. When nothing matches, the general material is returned.
 */
export function chapterMaterial(chapterName) {
  if (!chapterName) return null;
  if (CHAPTERS[chapterName]) return CHAPTERS[chapterName];
  const wanted = String(chapterName).trim().toLowerCase();
  const key = Object.keys(CHAPTERS).find(name => name.trim().toLowerCase() === wanted);
  return key ? CHAPTERS[key] : null;
}

/**
 * The material for the course a chapter belongs to.
 *
 * A chapter in the HTML course gets the HTML course card, and so on.
 */
export function courseFor(chapterName) {
  const name = String(chapterName || '').toLowerCase();
  if (name.includes('css')) return CSS_COURSE;
  if (name.includes('html')) return HTML_COURSE;
  if (name.includes('javascript') || name.includes('js')) return HTML_COURSE;
  return null;
}

/**
 * Fill the learning panel for a chapter.
 *
 * The panel shows the goal, the study material, the exam instructions and
 * the outcome. Every DOM access happens here, so the helpers above stay
 * pure.
 */
export function initLabLearn(root = document) {
  const panel = root.querySelector?.('[data-lab-learn]');
  if (!panel) return null;

  function render(chapterName) {
    const material = chapterMaterial(chapterName);
    const course = courseFor(chapterName);
    panel.textContent = '';
    if (!material) return 0;

    const sections = [];

    if (course) {
      sections.push({
        kind: 'course',
        title: 'The course',
        body: `${course.name} · ${course.level} · ${course.hours}. ${course.needs}`,
        topics: course.topics,
        outcome: course.outcome
      });
    }

    sections.push({ kind: 'goal', title: 'The goal', body: material.goal });
    sections.push({ kind: 'material', title: 'Study material', body: '', material: material.material });
    sections.push({ kind: 'exam', title: 'How this is checked', body: material.exam });
    sections.push({ kind: 'outcome', title: 'What you can do after', body: material.outcome });

    for (const section of sections) {
      const block = document.createElement('section');
      block.className = `lab-learn-block lab-learn-${section.kind}`;

      const heading = document.createElement('h3');
      heading.className = 'lab-learn-block-title';
      heading.textContent = section.title;
      block.append(heading);

      if (section.body) {
        const body = document.createElement('p');
        body.className = 'lab-learn-block-body';
        body.textContent = section.body;
        block.append(body);
      }

      if (section.topics) {
        const list = document.createElement('ul');
        list.className = 'lab-learn-topics';
        for (const topic of section.topics) {
          const item = document.createElement('li');
          item.textContent = topic;
          list.append(item);
        }
        block.append(list);
      }

      if (section.outcome) {
        const outcome = document.createElement('p');
        outcome.className = 'lab-learn-block-outcome';
        outcome.textContent = section.outcome;
        block.append(outcome);
      }

      if (section.material) {
        const list = document.createElement('div');
        list.className = 'lab-learn-material';
        for (const entry of section.material) {
          const card = document.createElement('article');
          card.className = 'lab-learn-card';
          const title = document.createElement('h4');
          title.className = 'lab-learn-card-title';
          title.textContent = entry.title;
          const body = document.createElement('p');
          body.className = 'lab-learn-card-body';
          body.textContent = entry.body;
          card.append(title, body);
          if (entry.code) {
            const pre = document.createElement('pre');
            pre.className = 'lab-learn-code';
            const code = document.createElement('code');
            code.textContent = entry.code;
            pre.append(code);
            card.append(pre);
          }
          list.append(card);
        }
        block.append(list);
      }

      panel.append(block);
    }

    return sections.length;
  }

  return { render };
}
