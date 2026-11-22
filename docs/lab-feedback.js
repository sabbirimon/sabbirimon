/**
 * The answer feedback for the lab.
 *
 * When an answer is wrong the learner gets three things, not one:
 *
 *   what    — which rule was broken, in plain words.
 *   where   — which file and which line the problem is on.
 *   how     — the code that fixes it, ready to copy.
 *
 * The checks in `lab.js` answer with a message and a hint. This module
 * turns that into a located, explained failure by reading the learner's
 * own code and finding the line that is missing or wrong.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** The languages a file can belong to, in the order the tabs show them. */
export const FILE_LABELS = { html: 'index.html', css: 'style.css', js: 'script.js' };

/**
 * Strip HTML comments out of a source file.
 *
 * The checker ignores commented-out code, so the feedback has to ignore it
 * too. Otherwise a learner who commented out a placeholder would be told
 * the placeholder is missing.
 */
export function stripComments(source, language) {
  const text = String(source || '');
  if (language === 'html') return text.replace(/<!--[\s\S]*?-->/g, '');
  if (language === 'css') return text.replace(/\/\*[\s\S]*?\*\//g, '');
  if (language === 'js') {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\/])\/\/[^\n]*/g, '$1');
  }
  return text;
}

/**
 * The one-based line numbers of the lines that hold a pattern.
 *
 * Comments are removed first, but the line count is kept, so the numbers
 * still point at the right place in the original file.
 */
export function linesMatching(source, pattern, language) {
  const text = String(source || '');
  const cleaned = stripComments(text, language);
  const original = text.split('\n');
  const kept = cleaned.split('\n');
  const hits = [];
  kept.forEach((line, index) => {
    if (line.length !== original[index]?.length) return;
    if (pattern.test(line)) hits.push({ line: index + 1, text: original[index] });
  });
  return hits;
}

/**
 * The first line that holds a pattern, or null.
 */
export function firstMatch(source, pattern, language) {
  const hits = linesMatching(source, pattern, language);
  return hits.length ? hits[0] : null;
}

/**
 * Work out which file a failure is about.
 *
 * The hint and message both carry the syntax of what is missing, so the
 * language is read out of the text the checker wrote.
 */
export function detectLanguage(text, fallback = 'html') {
  const value = String(text || '').toLowerCase();
  if (value.includes('css') || value.includes('stylesheet') || value.includes('style.css')) return 'css';
  if (value.includes('javascript') || value.includes('script') || value.includes('console.log') || value.includes('const ') || value.includes('let ')) return 'js';
  if (value.includes('html') || value.includes('tag') || value.includes('element') || value.includes('<h1') || value.includes('<p>') || value.includes('<ul')) return 'html';
  return fallback;
}

/**
 * The rules that explain what the checker is looking for.
 *
 * Each rule names the file it belongs to, the pattern that proves it, and
 * the plain-words reason it is being checked. The order matters: the first
 * rule that matches is the one that is reported, because it is the one the
 * learner most likely broke.
 */
export const RULES = [
  { id: 'html-ul', language: 'html', pattern: /<ul[\s>]/i, want: 'an unordered list', label: 'The list element' },
  { id: 'html-ol', language: 'html', pattern: /<ol[\s>]/i, want: 'an ordered list', label: 'The numbered list' },
  { id: 'html-li', language: 'html', pattern: /<li[\s>]/i, want: 'a list item', label: 'The list item' },
  { id: 'html-h1', language: 'html', pattern: /<h1[\s>]/i, want: 'a level-one heading', label: 'The heading' },
  { id: 'html-h2', language: 'html', pattern: /<h2[\s>]/i, want: 'a level-two heading', label: 'The subheading' },
  { id: 'html-p', language: 'html', pattern: /<p[\s>]/i, want: 'a paragraph', label: 'The paragraph' },
  { id: 'html-img', language: 'html', pattern: /<img[\s>]/i, want: 'an image', label: 'The image' },
  { id: 'html-a', language: 'html', pattern: /<a[\s>]/i, want: 'a link', label: 'The link' },
  { id: 'html-form', language: 'html', pattern: /<form[\s>]/i, want: 'a form', label: 'The form' },
  { id: 'html-input', language: 'html', pattern: /<input[\s>]/i, want: 'an input', label: 'The input' },
  { id: 'html-label', language: 'html', pattern: /<label[\s>]/i, want: 'a label', label: 'The label' },
  { id: 'html-button', language: 'html', pattern: /<button[\s>]/i, want: 'a button', label: 'The button' },
  { id: 'html-strong', language: 'html', pattern: /<strong[\s>]/i, want: 'bold text', label: 'The bold text' },
  { id: 'html-em', language: 'html', pattern: /<em[\s>]/i, want: 'emphasised text', label: 'The italics' },
  { id: 'html-code', language: 'html', pattern: /<code[\s>]/i, want: 'inline code', label: 'The inline code' },
  { id: 'html-pre', language: 'html', pattern: /<pre[\s>]/i, want: 'a code block', label: 'The code block' },
  { id: 'html-table', language: 'html', pattern: /<table[\s>]/i, want: 'a table', label: 'The table' },
  { id: 'html-header', language: 'html', pattern: /<header[\s>]/i, want: 'a header', label: 'The header' },
  { id: 'html-footer', language: 'html', pattern: /<footer[\s>]/i, want: 'a footer', label: 'The footer' },
  { id: 'html-nav', language: 'html', pattern: /<nav[\s>]/i, want: 'a navigation block', label: 'The navigation' },
  { id: 'html-main', language: 'html', pattern: /<main[\s>]/i, want: 'the main content', label: 'The main content' },
  { id: 'html-section', language: 'html', pattern: /<section[\s>]/i, want: 'a section', label: 'The section' },
  { id: 'html-article', language: 'html', pattern: /<article[\s>]/i, want: 'an article', label: 'The article' },
  { id: 'html-span', language: 'html', pattern: /<span[\s>]/i, want: 'an inline span', label: 'The span' },
  { id: 'html-div', language: 'html', pattern: /<div[\s>]/i, want: 'a block', label: 'The block' },
  { id: 'html-br', language: 'html', pattern: /<br[\s>]/i, want: 'a line break', label: 'The line break' },
  { id: 'html-meta', language: 'html', pattern: /<meta[\s>]/i, want: 'a meta tag', label: 'The meta tag' },
  { id: 'html-title', language: 'html', pattern: /<title[\s>]/i, want: 'a page title', label: 'The page title' },

  { id: 'css-color', language: 'css', pattern: /color\s*:\s*[^;{}]+/i, want: 'a colour', label: 'The colour' },
  { id: 'css-background', language: 'css', pattern: /background(-color)?\s*:\s*[^;{}]+/i, want: 'a background', label: 'The background' },
  { id: 'css-padding', language: 'css', pattern: /padding\s*:\s*[^;{}]+/i, want: 'padding', label: 'The padding' },
  { id: 'css-margin', language: 'css', pattern: /margin\s*:\s*[^;{}]+/i, want: 'margin', label: 'The margin' },
  { id: 'css-border', language: 'css', pattern: /border\s*:\s*[^;{}]+/i, want: 'a border', label: 'The border' },
  { id: 'css-font-size', language: 'css', pattern: /font-size\s*:\s*[^;{}]+/i, want: 'a font size', label: 'The font size' },
  { id: 'css-font-weight', language: 'css', pattern: /font-weight\s*:\s*[^;{}]+/i, want: 'a font weight', label: 'The font weight' },
  { id: 'css-font-family', language: 'css', pattern: /font-family\s*:\s*[^;{}]+/i, want: 'a font family', label: 'The font family' },
  { id: 'css-display', language: 'css', pattern: /display\s*:\s*[^;{}]+/i, want: 'a display value', label: 'The display' },
  { id: 'css-flex', language: 'css', pattern: /flex(-direction|-wrap)?\s*:\s*[^;{}]+/i, want: 'a flex property', label: 'The flex layout' },
  { id: 'css-grid', language: 'css', pattern: /grid(-template-columns|-gap)?\s*:\s*[^;{}]+/i, want: 'a grid property', label: 'The grid layout' },
  { id: 'css-position', language: 'css', pattern: /position\s*:\s*[^;{}]+/i, want: 'a position', label: 'The position' },
  { id: 'css-width', language: 'css', pattern: /width\s*:\s*[^;{}]+/i, want: 'a width', label: 'The width' },
  { id: 'css-height', language: 'css', pattern: /height\s*:\s*[^;{}]+/i, want: 'a height', label: 'The height' },
  { id: 'css-text-align', language: 'css', pattern: /text-align\s*:\s*[^;{}]+/i, want: 'a text alignment', label: 'The text alignment' },
  { id: 'css-line-height', language: 'css', pattern: /line-height\s*:\s*[^;{}]+/i, want: 'a line height', label: 'The line height' },
  { id: 'css-border-radius', language: 'css', pattern: /border-radius\s*:\s*[^;{}]+/i, want: 'rounded corners', label: 'The border radius' },
  { id: 'css-opacity', language: 'css', pattern: /opacity\s*:\s*[^;{}]+/i, want: 'an opacity', label: 'The opacity' },
  { id: 'css-transform', language: 'css', pattern: /transform\s*:\s*[^;{}]+/i, want: 'a transform', label: 'The transform' },
  { id: 'css-transition', language: 'css', pattern: /transition\s*:\s*[^;{}]+/i, want: 'a transition', label: 'The transition' },
  { id: 'css-z-index', language: 'css', pattern: /z-index\s*:\s*[^;{}]+/i, want: 'a z-index', label: 'The stacking order' },
  { id: 'css-overflow', language: 'css', pattern: /overflow\s*:\s*[^;{}]+/i, want: 'an overflow rule', label: 'The overflow' },

  { id: 'js-const', language: 'js', pattern: /\bconst\b/, want: 'a constant', label: 'The declaration' },
  { id: 'js-let', language: 'js', pattern: /\blet\b/, want: 'a variable', label: 'The declaration' },
  { id: 'js-var', language: 'js', pattern: /\bvar\b/, want: 'a variable', label: 'The declaration' },
  { id: 'js-function', language: 'js', pattern: /\bfunction\b|(?:const|let|var)\s+\w+\s*=\s*(?:\([^)]*\)|\w+)\s*=>/, want: 'a function', label: 'The function' },
  { id: 'js-return', language: 'js', pattern: /\breturn\b/, want: 'a return statement', label: 'The return' },
  { id: 'js-if', language: 'js', pattern: /\bif\s*\(/, want: 'an if statement', label: 'The condition' },
  { id: 'js-else', language: 'js', pattern: /\belse\b/, want: 'an else branch', label: 'The else branch' },
  { id: 'js-for', language: 'js', pattern: /\bfor\s*\(/, want: 'a for loop', label: 'The loop' },
  { id: 'js-while', language: 'js', pattern: /\bwhile\s*\(/, want: 'a while loop', label: 'The loop' },
  { id: 'js-console', language: 'js', pattern: /\bconsole\.log\b/, want: 'a console.log call', label: 'The log' },
  { id: 'js-addEventListener', language: 'js', pattern: /\baddEventListener\b/, want: 'an event listener', label: 'The event listener' },
  { id: 'js-querySelector', language: 'js', pattern: /\bquerySelector\b/, want: 'a querySelector call', label: 'The selector' },
  { id: 'js-textContent', language: 'js', pattern: /\.textContent\b/, want: 'a textContent write', label: 'The text' },
  { id: 'js-classList', language: 'js', pattern: /\.classList\b/, want: 'a classList change', label: 'The class' },
  { id: 'js-setAttribute', language: 'js', pattern: /\.setAttribute\b/, want: 'a setAttribute call', label: 'The attribute' },
  { id: 'js-createElement', language: 'js', pattern: /\bcreateElement\b/, want: 'a createElement call', label: 'The new element' },
  { id: 'js-appendChild', language: 'js', pattern: /\bappendChild\b|\.append\(/, want: 'an appendChild call', label: 'The insert' },
  { id: 'js-push', language: 'js', pattern: /\.push\b/, want: 'a push', label: 'The push' },
  { id: 'js-map', language: 'js', pattern: /\.map\b/, want: 'a map', label: 'The map' },
  { id: 'js-filter', language: 'js', pattern: /\.filter\b/, want: 'a filter', label: 'The filter' },
  { id: 'js-forEach', language: 'js', pattern: /\.forEach\b/, want: 'a forEach', label: 'The forEach' },
  { id: 'js-arrow', language: 'js', pattern: /=>/, want: 'an arrow function', label: 'The arrow function' },
  { id: 'js-template', language: 'js', pattern: /`[^`]*\$\{/, want: 'a template literal', label: 'The template literal' }
];

/**
 * The code sample that shows the fix.
 *
 * The hint the checker wrote is already the fix, so it is used as the
 * example. A hint that has no code in it is still useful, so it is shown
 * as prose.
 */
export function fixExample(result) {
  const hint = String(result?.hint || '').trim();
  const message = String(result?.message || '').trim();
  if (hint) {
    // The hint often ends with a full stop after the code, so the code is
    // pulled out and the sentence around it is kept as the explanation.
    const code = hint.match(/`([^`]+)`/);
    if (code) return { code: code[1], prose: hint.replace(/`[^`]+`/g, '').replace(/\s+/g, ' ').trim() };
    return { code: '', prose: hint };
  }
  return { code: '', prose: message };
}

/**
 * Find the first rule the learner's code breaks.
 *
 * A rule is broken when the checker asked for something and the file does
 * not have it. The rules are tried in order, so the most specific one
 * wins.
 */
export function findMissingRule(buffers, result) {
  const wanted = String(result?.message || '').toLowerCase();
  const language = detectLanguage(`${wanted} ${result?.hint || ''}`, 'html');
  const rules = RULES.filter(rule => rule.language === language);
  for (const rule of rules) {
    // The rule only applies when the checker's own wording mentions the
    // thing the rule is about, or the thing is simply absent from a file
    // the exercise is about.
    const source = buffers?.[language] || '';
    const present = rule.pattern.test(stripComments(source, language));
    if (!present) return { rule, language };
  }
  return null;
}

/**
 * Describe where the problem is.
 *
 * The file and the line number come from the learner's own code, so the
 * feedback points at the exact line rather than at the exercise in general.
 */
export function locateProblem(buffers, result) {
  const language = detectLanguage(`${result?.message || ''} ${result?.hint || ''}`, 'html');
  const source = buffers?.[language] || '';
  const lines = source.split('\n');
  // The first line that is not empty and not only a comment is the place
  // the learner is working, which is where a missing piece should go.
  const meaningful = lines.findIndex((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (language === 'html' && trimmed.startsWith('<!--')) return false;
    if (language === 'css' && trimmed.startsWith('/*')) return false;
    if (language === 'js' && trimmed.startsWith('//')) return false;
    return index > 0 || trimmed.length > 0;
  });
  const line = meaningful >= 0 ? meaningful + 1 : 1;
  return {
    language,
    file: FILE_LABELS[language] || 'index.html',
    line,
    total: lines.length,
    text: lines[line - 1] ?? '',
    excerpt: lines.slice(Math.max(0, line - 2), line + 1).join('\n')
  };
}

/**
 * Build the full feedback for a failed answer.
 *
 * Returns a plain object so it can be tested without a browser.
 */
export function buildFeedback(buffers, result) {
  const where = locateProblem(buffers, result);
  const fix = fixExample(result);
  const missing = findMissingRule(buffers, result);
  const problems = [];
  problems.push({
    title: result?.message || 'The answer did not match what the exercise asked for.',
    detail: missing
      ? `The exercise looks for ${missing.rule.want}. It is not in ${FILE_LABELS[where.language]}.`
      : `The check runs on ${FILE_LABELS[where.language]}, which is where the answer has to change.`
  });
  if (result?.hint) {
    problems.push({
      title: 'What the checker is looking for',
      detail: result.hint
    });
  }
  return {
    ok: false,
    where,
    problems,
    fix,
    headline: result?.message || 'Not quite yet.'
  };
}

/**
 * Fill the feedback panel.
 *
 * Every DOM access happens here, so the helpers above stay pure.
 */
export function initLabFeedback(root = document) {
  const panel = root.querySelector?.('[data-lab-feedback]');
  const list = root.querySelector?.('[data-lab-feedback-list]');
  const codeBox = root.querySelector?.('[data-lab-feedback-code]');
  const whereBox = root.querySelector?.('[data-lab-feedback-where]');
  if (!panel) return null;

  function hide() {
    panel.hidden = true;
  }

  function show(feedback) {
    if (!feedback) return hide();
    panel.hidden = false;

    if (whereBox) {
      whereBox.textContent = `${feedback.where.file} · line ${feedback.where.line}`;
    }

    if (list) {
      list.textContent = '';
      for (const problem of feedback.problems) {
        const item = document.createElement('li');
        item.className = 'lab-feedback-item';
        const title = document.createElement('p');
        title.className = 'lab-feedback-item-title';
        title.textContent = problem.title;
        const detail = document.createElement('p');
        detail.className = 'lab-feedback-item-body';
        detail.textContent = problem.detail;
        item.append(title, detail);
        list.append(item);
      }
    }

    if (codeBox) {
      const code = codeBox.querySelector('code');
      if (code) code.textContent = feedback.fix.code || feedback.fix.prose || '—';
    }

    panel.scrollIntoView({ block: 'nearest' });
  }

  return { show, hide };
}
