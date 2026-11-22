// Reference solutions for the Code Lab's own exercises.
//
// The Code Lab ships a hand-written taster course alongside the imported
// curriculum. These are the answers to the taster course. They exist so
// the test suite can prove every exercise is solvable — a checker that
// can never pass is an exercise a learner cannot finish.
//
// The imported curriculum exercises are checked by
// `tests/lab-curriculum.test.mjs`, which builds a solution from each
// entry's own requirements.

export const CODE_LAB_SOLUTIONS = {
  'html-first-tag': {
    html: '<p>I am a paragraph.</p>\n<p>I am another paragraph.</p>'
  },
  'html-heading': {
    html: '<h1>My page</h1>\n<p>A paragraph underneath the heading.</p>'
  },
  'html-list': {
    html: '<ul>\n  <li>Apples</li>\n  <li>Pears</li>\n  <li>Plums</li>\n</ul>'
  },
  'css-colour': {
    css: 'h1 {\n  color: #14adff;\n}'
  },
  'css-box': {
    css: 'p {\n  padding: 12px;\n  background-color: #e0f2fe;\n}'
  },
  'css-selector': {
    css: 'li {\n  font-weight: bold;\n}'
  },
  'js-variable': {
    js: 'const score = 42;\nconsole.log(score);'
  },
  'js-condition': {
    js: 'const n = 42;\nif (n > 10) {\n  console.log("big");\n} else {\n  console.log("small");\n}'
  },
  'js-loop': {
    js: 'for (let i = 0; i < 5; i++) {\n  console.log("tick");\n}'
  },
  'js-function': {
    js: 'function double(n) {\n  return n * 2;\n}\nconsole.log(double(21));'
  }
};
