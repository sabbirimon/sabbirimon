/**
 * The wide pixel display face, drawn as bitmap glyphs.
 *
 * The site has two pixel faces and needs a third idea: Press Start 2P is a
 * real web font that is far too wide to set a heading with, and the narrow
 * face in `pixel-type.js` is drawn condensed so a word is about half its
 * width. A condensed face is right for a button that says "Check answer",
 * but a page title needs the opposite: broad, heavy letterforms that fill
 * the space they sit in.
 *
 * So this is the wide one. Every glyph is an 8×7 bitmap with a doubled
 * vertical stem, which is what makes a letter read as *wide* rather than
 * merely large: the strokes are as thick as the narrow face's, but there
 * are more of them side by side.
 *
 * The face is rendered as inline SVG, so it stays perfectly square at any
 * size and never needs a web font download.
 *
 * The glyphs cover the upper case letters, the digits and the punctuation
 * a heading needs. Lower case is folded to upper case, which is how the
 * rest of the site's pixel chrome already reads.
 */

/** The pixel colours. The wide face drops the drop shadow. */
const FACE = '#f5f5fc';

/** The 8×7 bitmaps. `#` is a filled pixel, `.` is empty. */
const GLYPHS = {
  A: ['..####..', '.##..##.', '.##..##.', '########', '.##..##.', '.##..##.', '.##..##.'],
  B: ['#######.', '.##...##', '.##...##', '#######.', '.##...##', '.##...##', '#######.'],
  C: ['..#####.', '.##...##', '.##......', '.##......', '.##......', '.##...##', '..#####.'],
  D: ['#######.', '.##...##', '.##...##', '.##...##', '.##...##', '.##...##', '#######.'],
  E: ['########', '.##......', '.##......', '#######.', '.##......', '.##......', '########'],
  F: ['########', '.##......', '.##......', '#######.', '.##......', '.##......', '.##......'],
  G: ['..#####.', '.##...##', '.##......', '.##..###', '.##...##', '.##...##', '..#####.'],
  H: ['.##..##.', '.##..##.', '.##..##.', '########', '.##..##.', '.##..##.', '.##..##.'],
  I: ['########', '...##...', '...##...', '...##...', '...##...', '...##...', '########'],
  J: ['...#####', '.....##.', '.....##.', '.....##.', '.....##.', '.##..##.', '..####..'],
  K: ['.##..##.', '.##.##..', '.####...', '###.....', '.####...', '.##.##..', '.##..##.'],
  L: ['.##......', '.##......', '.##......', '.##......', '.##......', '.##......', '########'],
  M: ['##....##', '###..###', '########', '##.##.##', '##....##', '##....##', '##....##'],
  N: ['##...##.', '###..##.', '########', '##.###..', '##..###.', '##...##.', '##...##.'],
  O: ['..####..', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '..####..'],
  P: ['#######.', '.##...##', '.##...##', '#######.', '.##......', '.##......', '.##......'],
  Q: ['..####..', '.##..##.', '.##..##.', '.##..##.', '.##.###.', '.##..##.', '..##.##.'],
  R: ['#######.', '.##...##', '.##...##', '#######.', '.##.##..', '.##..##.', '.##...##'],
  S: ['..#####.', '.##...##', '.##......', '..#####.', '......##', '.##...##', '.#####..'],
  T: ['########', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...'],
  U: ['.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '..####..'],
  V: ['.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '..####..', '...##...'],
  W: ['##....##', '##....##', '##....##', '##.##.##', '########', '###..###', '##....##'],
  X: ['.##..##.', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '.##..##.'],
  Y: ['.##..##.', '.##..##.', '..####..', '...##...', '...##...', '...##...', '...##...'],
  Z: ['########', '.....##.', '....##..', '...##...', '..##....', '.##.....', '########'],
  0: ['..####..', '.##..##.', '.##.###.', '.######.', '.###.##.', '.##..##.', '..####..'],
  1: ['...##...', '..###...', '.####...', '...##...', '...##...', '...##...', '########'],
  2: ['..#####.', '.##...##', '.....##.', '...###..', '..##....', '.##.....', '########'],
  3: ['.#####..', '.##...##', '.....##.', '..####..', '.....##.', '.##...##', '.#####..'],
  4: ['...####.', '..####..', '.##.##..', '.##..##.', '########', '.....##.', '.....##.'],
  5: ['########', '.##......', '#######.', '.....##.', '.....##.', '.##...##', '.#####..'],
  6: ['..####..', '.##......', '.##......', '#######.', '.##...##', '.##...##', '..#####.'],
  7: ['########', '.....##.', '....##..', '...##...', '..##....', '..##....', '..##....'],
  8: ['..#####.', '.##...##', '.##...##', '..#####.', '.##...##', '.##...##', '..#####.'],
  9: ['..#####.', '.##...##', '.##...##', '..######', '......##', '......##', '..####..'],
  '.': ['........', '........', '........', '........', '........', '..####..', '..####..'],
  ',': ['........', '........', '........', '........', '..####..', '..####..', '.###....'],
  ':': ['........', '..####..', '..####..', '........', '..####..', '..####..', '........'],
  '!': ['...##...', '...##...', '...##...', '...##...', '...##...', '........', '...##...'],
  '?': ['..#####.', '.##...##', '.....##.', '...###..', '...##...', '........', '...##...'],
  '-': ['........', '........', '........', '########', '........', '........', '........'],
  '_': ['........', '........', '........', '........', '........', '........', '########'],
  '+': ['........', '...##...', '...##...', '########', '...##...', '...##...', '........'],
  '/': ['......##', '.....##.', '....##..', '...##...', '..##....', '.##.....', '##......'],
  '&': ['..###...', '.##.##..', '.##.##..', '..###...', '.##.##.##', '.##..##.', '..##.##.'],
  '%': ['##...##.', '##..##..', '....##..', '...##...', '..##....', '.##..##.', '.##...##'],
  '(': ['....##..', '...##...', '..##....', '..##....', '..##....', '...##...', '....##..'],
  ')': ['..##....', '...##...', '....##..', '....##..', '....##..', '...##...', '..##....'],
  '[': ['..######', '..##....', '..##....', '..##....', '..##....', '..##....', '..######'],
  ']': ['######..', '....##..', '....##..', '....##..', '....##..', '....##..', '######..'],
  '=': ['........', '........', '########', '........', '########', '........', '........'],
  '*': ['........', '##..##..', '.####...', '########', '.####...', '##..##..', '........'],
  '·': ['........', '........', '........', '...##...', '........', '........', '........'],
  "'": ['...##...', '...##...', '........', '........', '........', '........', '........'],
  '"': ['.##..##.', '.##..##.', '........', '........', '........', '........', '........'],
  '→': ['........', '...##...', '....##..', '########', '....##..', '...##...', '........'],
  '←': ['........', '...##...', '..##....', '########', '..##....', '...##...', '........'],
  '↑': ['...##...', '..####..', '.##..##.', '...##...', '...##...', '...##...', '........'],
  '↓': ['........', '...##...', '...##...', '...##...', '.##..##.', '..####..', '...##...'],
  '★': ['...##...', '...##...', '########', '.######.', '.######.', '##....##', '........'],
  '✔': ['........', '......##', '.....##.', '##..##..', '.####...', '..##....', '........'],
  '✖': ['........', '##....##', '.##..##.', '..####..', '..####..', '.##..##.', '##....##'],
  '▲': ['...##...', '...##...', '..####..', '..####..', '.######.', '########', '........'],
  '›': ['........', '...##...', '....##..', '.....##.', '....##..', '...##...', '........'],
  'ℹ': ['..#####.', '.##...##', '.##.###.', '.##...##', '..#####.', '...##...', '...##...']
};

/** The width of one glyph, in bitmap columns. */
const GLYPH_WIDTH = 8;

/** The height of one glyph, in bitmap rows. */
const GLYPH_HEIGHT = 7;

/** The pixel size of one bitmap pixel, in SVG units. */
const SCALE = 2;

/** The gap between two letters, in SVG units. */
const GAP = 2;

/**
 * The colour names the browser knows.
 *
 * A gradient stop or a shadow may be written as a name rather than a hex,
 * but only a real name counts. A word that is not one of these is a
 * mistake in the stylesheet, and it is refused rather than drawn.
 */
const NAMED_COLOURS = new Set([
  'black', 'blue', 'brown', 'cyan', 'darkblue', 'fuchsia', 'gold', 'gray',
  'green', 'grey', 'lime', 'magenta', 'maroon', 'navy', 'olive', 'orange',
  'pink', 'purple', 'red', 'silver', 'teal', 'violet', 'white', 'yellow',
  'transparent', 'currentcolor'
]);

/**
 * The character that stands in for a letter this face does not draw.
 *
 * Anything unknown becomes a blank so a missing glyph never shows as a
 * stray symbol.
 */
function glyphFor(character) {
  if (GLYPHS[character]) return GLYPHS[character];
  const upper = character.toUpperCase();
  if (GLYPHS[upper]) return GLYPHS[upper];
  return null;
}

/**
 * The rectangles that draw one character.
 *
 * The wide face has no drop shadow. The narrow face needs it to read at
 * button sizes, but a heading is already large enough to be legible on
 * its own, and a shadow on top of a shadowed heading turns to mush.
 */
export function charRects(character) {
  const bitmap = glyphFor(character);
  if (!bitmap) return [];
  const rects = [];
  bitmap.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '#') return;
      rects.push([x * SCALE, y * SCALE, SCALE, SCALE, FACE]);
    });
  });
  return rects;
}

/**
 * The rectangles that draw a whole line of text.
 *
 * The width and height come back too, so the caller can size the SVG
 * without measuring anything.
 *
 * The height is the height of the letters themselves, with no padding,
 * so that one em of the drawing is one em of letters. The gap between
 * two lines is added by the caller, which knows how many lines there
 * are.
 */
export function textRects(text) {
  const rects = [];
  const glyphWidth = GLYPH_WIDTH * SCALE;
  let x = 0;
  const characters = [...String(text ?? '')];
  for (const character of characters) {
    for (const [gx, gy, width, height, fill] of charRects(character)) {
      rects.push([x + gx, gy, width, height, fill]);
    }
    x += glyphWidth + GAP;
  }
  const width = characters.length ? x - GAP + SCALE : 0;
  const height = GLYPH_HEIGHT * SCALE;
  return { rects, width, height };
}

/**
 * Split a heading into the lines and coloured runs it is drawn as.
 *
 * A heading is often written with a `<br>` in it, and a heading with a
 * coloured word in it is common too. This walks the markup rather than
 * the text, so a line break stays a line break instead of being flattened
 * into the words beside it, and a coloured word keeps its colour.
 *
 * A `<br>` ends the current line. Any other element changes the colour of
 * the words inside it, and the colour ends when the element does.
 *
 * The colour is asked of the stylesheet rather than guessed at, so a
 * heading that colours one word with any rule at all is drawn with that
 * colour.
 */
export function readLines(element) {
  const lines = [];
  let runs = [];
  let current = '';
  const pushRun = () => {
    if (!current.trim()) { current = ''; return; }
    runs.push({ text: current, color: runColor });
    current = '';
  };
  const pushLine = () => {
    pushRun();
    lines.push(runs);
    runs = [];
  };
  const styleOf = node => {
    if (!node?.ownerDocument?.defaultView?.getComputedStyle) return null;
    return node.ownerDocument.defaultView.getComputedStyle(node);
  };
  const colourOf = (node, fallback) => {
    const computed = styleOf(node)?.color;
    return computed && computed !== 'rgb(0, 0, 0)' ? computed : fallback;
  };
  let runColor = null;
  const walk = (node, color) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        // A run of text takes the colour of the element around it. The
        // colour is only remembered if it differs from the line's, so a
        // heading that is one colour stays one run.
        const wanted = color || null;
        if (wanted && runColor && wanted !== runColor) pushRun();
        if (wanted) runColor = wanted;
        current += child.textContent;
        continue;
      }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'br') {
        pushLine();
        runColor = null;
        continue;
      }
      // A coloured word is drawn in that colour, and the colour runs
      // until the element closes.
      const own = colourOf(child, color);
      walk(child, own);
    }
  };
  const headingStyle = styleOf(element);
  // A heading filled with a gradient keeps the gradient. The stops are
  // read from the stylesheet and drawn as an SVG gradient of the same
  // colours, so the drawing looks like the text it replaced.
  const gradient = headingStyle ? parseGradient(headingStyle.backgroundImage) : null;
  walk(element, gradient ? null : colourOf(element, null));
  pushLine();
  if (gradient) {
    // Every run in a gradient heading is filled by the gradient rather
    // than by its own colour.
    for (const line of lines) for (const run of line) { run.color = null; run.gradient = true; }
  }
  // A trailing break leaves an empty line, which is not worth drawing.
  while (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
  const kept = lines.filter(line => line.length);
  // The gradient travels with the lines so the renderer can draw it.
  kept.gradient = gradient;
  // So does the shadow. The offsets are in pixels, and the drawing
  // scales with the font size, so the font size travels with them.
  const fontSize = parseFloat(headingStyle?.fontSize) || 16;
  kept.shadow = parseShadow(headingStyle?.textShadow, fontSize);
  kept.fontSize = fontSize;
  return kept;
}

/**
 * Read a CSS linear gradient into the stops an SVG gradient needs.
 *
 * Only a linear gradient is understood, because that is the only kind
 * that can be drawn across the letters. A radial one falls back to a
 * flat colour, which still reads as the heading.
 */
export function parseGradient(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/linear-gradient\((.*)\)/s);
  if (!match) return null;
  const parts = splitTopLevel(match[1]);
  // The first part is the angle or a side, which is not a colour.
  const angle = parts.shift();
  if (!angle) return null;
  const stops = [];
  for (const part of parts) {
    // A colour is a hex, a colour function or a name the browser knows.
    // A word that is not a colour is refused rather than drawn, so a
    // broken gradient falls back to a flat colour instead of painting
    // the letters in nothing at all.
    const stop = part.match(/^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-z]+)\s*(-?[\d.]+)?%?$/i);
    if (!stop) return null;
    if (/^[a-z]+$/i.test(stop[1]) && !NAMED_COLOURS.has(stop[1].toLowerCase())) return null;
    const offset = stop[2] === undefined ? null : Number(stop[2]);
    stops.push({ color: stop[1], offset: offset === null ? null : offset / 100 });
  }
  if (!stops.length) return null;
  // The angle is given in degrees, clockwise from the top. An SVG
  // gradient runs the other way, so it is turned by half a circle.
  const degrees = /(-?[\d.]+)deg/.test(angle) ? Number(RegExp.$1) : 180;
  const radians = (degrees + 180) * Math.PI / 180;
  const x1 = (1 - Math.cos(radians)) / 2;
  const y1 = (1 - Math.sin(radians)) / 2;
  const x2 = 1 - x1;
  const y2 = 1 - y1;
  return { stops, x1, y1, x2, y2 };
}

/**
 * Render one line of text as inline SVG.
 *
 * The SVG carries a title so screen readers read the words rather than an
 * empty graphic, and the drawing uses crisp edges so the pixels stay
 * square.
 */
export function renderPixelDisplay(text) {
  const { rects, width, height } = textRects(text);
  const body = rects
    .map(([x, y, w, h, fill]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`)
    .join('');
  const label = String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<svg class="pixel-display" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}" focusable="false" shape-rendering="crispEdges">${body}</svg>`;
}

/**
 * Render a heading as one SVG holding every line.
 *
 * The lines are stacked, and the widest one decides the width, so the
 * drawing has the same shape as the heading it replaces. Within a line,
 * the runs sit side by side, so a coloured word keeps its place in the
 * sentence.
 *
 * The SVG carries a viewBox but no width or height, so the drawing takes
 * its size from the stylesheet. That is what lets one face serve a 26px
 * section heading and a 46px page title without a second set of glyphs:
 * the pixels scale with the element's own font size.
 */
export function renderDisplayLines(lines, gradient = null, shadow = null) {
  if (!lines.length) return '';
  // Each line is measured by laying its runs out end to end.
  const measured = lines.map(runs => {
    let x = 0;
    const parts = runs.map(run => {
      const drawn = textRects(run.text);
      const part = { ...run, ...drawn, x };
      x += drawn.width + GAP;
      return part;
    });
    return { parts, width: x > 0 ? x - GAP : 0 };
  });
  const width = Math.max(...measured.map(line => line.width));
  // The letters fill the drawing exactly, and the space between two
  // lines is a gap outside the letters. That way one em of the drawing
  // is one em of letters, and the drawing can be sized by the
  // stylesheet without the letters ending up smaller than the font
  // size says they are.
  const glyphHeight = GLYPH_HEIGHT * SCALE;
  const lineGap = SCALE * 2;
  const height = measured.length * glyphHeight + (measured.length - 1) * lineGap;
  // The drawing is sized against the font size, so one line of letters is
  // one em tall. The width is written in ems too, so the whole drawing
  // has the same size the text it replaced would have had.
  //
  // The height is written as `auto`, not as a length. An SVG with a
  // viewBox keeps its proportions, so a width in ems and an automatic
  // height give the right height at any width. That matters on a narrow
  // screen: the stylesheet's `max-width` then shrinks the drawing to
  // fit and the letters get shorter with it, rather than being cut off
  // at the edge.
  const lineGapEm = lineGap / glyphHeight;
  const renderedHeightEm = measured.length + (measured.length - 1) * lineGapEm;
  const renderedWidthEm = (width / height) * renderedHeightEm;
  const renderedHeight = 'auto';
  const renderedWidth = `${renderedWidthEm.toFixed(3)}em`;
  const fill = gradient ? 'url(#display-gradient)' : null;
  const body = measured
    .map((line, index) => {
      const top = index * (glyphHeight + lineGap);
      return line.parts
        .map(part => part.rects
          .map(([x, y, w, h]) => `<rect x="${x + part.x}" y="${y + top}" width="${w}" height="${h}" fill="${fill || part.color || FACE}"/>`)
          .join(''))
        .join('');
    })
    .join('');
  // A gradient heading gets the gradient drawn across the whole
  // drawing, so the colour runs through the letters the same way it ran
  // through the text.
  const gradientDefs = gradient ? `<linearGradient id="display-gradient" gradientUnits="userSpaceOnUse" x1="${(gradient.x1 * width).toFixed(2)}" y1="${(gradient.y1 * height).toFixed(2)}" x2="${(gradient.x2 * width).toFixed(2)}" y2="${(gradient.y2 * height).toFixed(2)}">${gradient.stops.map((stop, index) => `<stop offset="${stop.offset === null ? (index / Math.max(1, gradient.stops.length - 1)).toFixed(3) : stop.offset.toFixed(3)}" stop-color="${stop.color}"/>`).join('')}</linearGradient>` : '';
  // The shadow is drawn as a filter. Its offsets were measured in
  // pixels on the page, but the drawing scales with the font size, so
  // they are turned into the drawing's own units: a pixel on the page
  // is this many units in the drawing. The drawing is one em tall, so
  // the ratio of the drawing's units to a pixel is the ratio of the
  // drawing's height to the font size.
  const unit = shadow ? height / (shadow.fontSize || 16) : 1;
  const shadowDefs = shadow ? `<filter id="display-shadow" x="-25%" y="-25%" width="160%" height="160%"><feDropShadow dx="${(shadow.dx * unit).toFixed(2)}" dy="${(shadow.dy * unit).toFixed(2)}" stdDeviation="${(shadow.blur * unit / 2).toFixed(2)}" flood-color="${shadow.color}"/></filter>` : '';
  const defs = gradientDefs || shadowDefs ? `<defs>${gradientDefs}${shadowDefs}</defs>` : '';
  const label = lines
    .map(runs => runs.map(run => run.text).join('').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const filter = shadow ? ' filter="url(#display-shadow)"' : '';
  return `<svg class="pixel-display" viewBox="0 0 ${width} ${height}" style="width: ${renderedWidth}; height: ${renderedHeight}" role="img" aria-label="${label}" focusable="false" shape-rendering="crispEdges"${filter}>${defs}${body}</svg>`;
}

/**
 * Split a CSS value on the commas that separate its parts.
 *
 * A colour function such as `rgb(21, 61, 54)` has commas of its own,
 * so a plain split would cut a colour in half. Only the commas at the
 * top level are separators.
 */
export function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of String(value ?? '')) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current.trim());
  return parts;
}

/**
 * Read a CSS text-shadow into the offsets an SVG shadow needs.
 *
 * A text shadow on a heading is part of how it looks, and the drawing
 * replaces the text, so the shadow has to be drawn too. Only the first
 * shadow is used, because a heading rarely has more and an SVG filter
 * chain would complicate the drawing for no gain.
 *
 * A browser writes the shadow with the colour first, so the parts are
 * taken out by what they are rather than by where they sit.
 */
export function parseShadow(value, fontSize) {
  if (!value || typeof value !== 'string' || value === 'none') return null;
  // Only the first shadow is used. The value is split on the commas
  // that are not inside brackets, because a colour function has commas
  // of its own.
  const first = splitTopLevel(value)[0]?.trim() ?? '';
  if (!first) return null;
  // The colour may be a hex, a named colour or a function with spaces
  // in it, so the forms are tried in turn rather than split on spaces.
  // The named-colour form is tried last, because a bare word could
  // also be the unit of an offset that has already been read.
  const forms = [
    /#[0-9a-f]{3,8}/i,
    /rgba?\([^)]*\)/i,
    /hsla?\([^)]*\)/i,
    new RegExp(`\\b(${[...NAMED_COLOURS].join('|')})\\b`, 'i')
  ];
  let colour = null;
  let rest = first;
  for (const form of forms) {
    const found = first.match(form);
    if (!found) continue;
    colour = found[0];
    // The offsets may sit before the colour or after it, so both sides
    // are searched for numbers.
    rest = (first.slice(0, found.index) + ' ' + first.slice(found.index + found[0].length)).trim();
    break;
  }
  if (!colour) return null;
  const numbers = rest.match(/-?[\d.]+(px|em|rem)?/g) || [];
  if (numbers.length < 2) return null;
  const toNumber = part => {
    const amount = parseFloat(part);
    // An offset given in ems is a fraction of the font size.
    if (/em|rem/.test(part)) return amount * (fontSize || 16);
    return amount;
  };
  const dx = toNumber(numbers[0]);
  const dy = toNumber(numbers[1]);
  const blur = numbers.length > 2 ? toNumber(numbers[2]) : 0;
  return { dx, dy, blur, color: colour, fontSize: fontSize || 16 };
}

/**
 * Draw the text inside every element marked as display text.
 *
 * The element's own text is kept as the accessible name and as the
 * fallback for anyone without JavaScript, so nothing is ever lost.
 */
export function initPixelDisplay(root = document) {
  const targets = [...(root?.querySelectorAll?.('[data-pixel-display]') || [])];
  for (const target of targets) {
    // A heading written with a break is read from its markup, so each
    // line keeps its own colour and its own position.
    const lines = readLines(target);
    if (!lines.length) continue;
    const text = lines.map(runs => runs.map(run => run.text).join('')).join(' ').trim();
    if (!text) continue;
    target.dataset.pixelDisplay = text;
    target.setAttribute('data-pixel-display-drawn', 'true');
    const shadow = lines.shadow || null;
    target.innerHTML = renderDisplayLines(lines, lines.gradient || null, shadow);
  }
  return targets.length;
}
