/**
 * A compact pixel display face, drawn as bitmap glyphs.
 *
 * Press Start 2P is the only pixel font on the site, and it is far too wide
 * to use for a heading — "Your first tag" runs off the screen at 21px.
 * Codédex solves this with two pixel faces: a wide display face and a
 * narrow button face. This module supplies the narrow one.
 *
 * Every glyph is a 5×7 bitmap, but the letters are drawn condensed so a
 * word is roughly half the width of Press Start 2P. The glyphs are
 * rendered as inline SVG, which means they stay perfectly square at any
 * size and never need a web font download.
 *
 * The glyphs cover the upper case letters, the digits and the punctuation
 * the chrome needs. Lower case is folded to upper case, which is how the
 * rest of the site's pixel chrome already reads.
 */

/** The pixel colours. */
const FACE = '#f5f5fc';
const FACE_SHADOW = 'rgba(3, 7, 25, .85)';

/** The 5×7 bitmaps. `#` is a filled pixel, `.` is empty. */
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  2: ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '[': ['..###', '..#..', '..#..', '..#..', '..#..', '..#..', '..###'],
  ']': ['###..', '..#..', '..#..', '..#..', '..#..', '..#..', '###..'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '→': ['.....', '..#..', '...#.', '#####', '...#.', '..#..', '.....'],
  '←': ['.....', '..#..', '.#...', '#####', '.#...', '..#..', '.....'],
  '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '.....'],
  '↓': ['.....', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
  '★': ['..#..', '..#..', '#####', '.###.', '.###.', '#...#', '.....'],
  '✔': ['.....', '....#', '...#.', '#..#.', '.##..', '.....', '.....'],
  '✖': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
  '▲': ['..#..', '..#..', '.###.', '.###.', '#####', '.....', '.....'],
  '›': ['.....', '..#..', '.#...', '#....', '.#...', '..#..', '.....'],
  'ℹ': ['.###.', '#...#', '#.##.', '#...#', '.###.', '..#..', '.....']
};

/** The pixel size of one bitmap pixel, in SVG units. */
const SCALE = 2;

/** The gap between two letters, in SVG units. */
const GAP = 2;

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
 * Each pixel is drawn twice: once in the face colour and once offset down
 * and right in the shadow colour. The hard offset edge is what gives the
 * face its carved look.
 */
export function charRects(character) {
  const bitmap = glyphFor(character);
  if (!bitmap) return [];
  const rects = [];
  bitmap.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== '#') return;
      rects.push([x * SCALE, y * SCALE, SCALE, SCALE, FACE]);
      rects.push([x * SCALE + SCALE, y * SCALE + SCALE, SCALE, SCALE, FACE_SHADOW]);
    });
  });
  return rects;
}

/**
 * The rectangles that draw a whole line of text.
 *
 * The width and height come back too, so the caller can size the SVG
 * without measuring anything.
 */
export function textRects(text) {
  const rects = [];
  const glyphWidth = 5 * SCALE;
  let x = 0;
  const characters = [...String(text ?? '')];
  for (const character of characters) {
    for (const [gx, gy, width, height, fill] of charRects(character)) {
      rects.push([x + gx, gy, width, height, fill]);
    }
    x += glyphWidth + GAP;
  }
  const width = characters.length ? x - GAP + SCALE : 0;
  const height = 7 * SCALE + SCALE;
  return { rects, width, height };
}

/**
 * Render a line of text as inline SVG.
 *
 * The SVG carries a title so screen readers read the words rather than an
 * empty graphic, and the drawing uses crisp edges so the pixels stay
 * square.
 */
export function renderPixelText(text) {
  const { rects, width, height } = textRects(text);
  const body = rects
    .map(([x, y, w, h, fill]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`)
    .join('');
  const label = String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<svg class="pixel-text" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}" focusable="false" shape-rendering="crispEdges">${body}</svg>`;
}

/**
 * Draw the text inside every element marked as pixel text.
 *
 * The element's own text is kept as the accessible name and as the
 * fallback for anyone without JavaScript, so nothing is ever lost.
 */
export function initPixelText(root = document) {
  const targets = [...(root?.querySelectorAll?.('[data-pixel-text]') || [])];
  for (const target of targets) {
    const text = target.dataset.pixelText || target.textContent.trim();
    if (!text) continue;
    target.dataset.pixelText = text;
    target.setAttribute('data-pixel-text-drawn', 'true');
    target.innerHTML = renderPixelText(text);
  }
  return targets.length;
}
