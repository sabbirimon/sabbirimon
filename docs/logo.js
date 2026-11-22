/**
 * The IMON.world wordmark, drawn as pixel art.
 *
 * The site is a pixel-art world, so the name is drawn rather than typed.
 * The wordmark is inline SVG, so it scales like an image and never
 * reflows, and it is labelled for screen readers.
 *
 * The lettering is a 5×7 bitmap face, the same grid the chrome headings
 * use. Each lit pixel becomes two rectangles: the face and a one-pixel
 * drop shadow, which is what gives the letters their chunky outline.
 */

/** The gold the face of the letters is painted in. */
const FACE = '#facc15';

/** The darker gold the drop shadow is painted in. */
const SHADOW = '#a16207';

/** How many screen pixels each bitmap pixel is drawn at. */
const SCALE = 2;

/** How many screen pixels sit between two letters. */
const GAP = 2;

/**
 * The 5×7 bitmap face.
 *
 * Every row is five characters: `#` is a lit pixel and `.` is empty.
 */
const GLYPHS = {
  // The I carries a bar across the top and the bottom with a single stem
  // between them. A plain hollow box would be indistinguishable from the O
  // at this size, which made the wordmark read as "OMON.WORLD".
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..']
};

/** The name the wordmark spells. */
const WORDMARK = 'IMON.WORLD';

/**
 * The bitmap for one character.
 *
 * Returns null when the character has no glyph, so the caller can leave
 * a gap rather than drawing a wrong shape.
 */
export function glyphFor(character) {
  if (!character) return null;
  if (GLYPHS[character]) return GLYPHS[character];
  const upper = String(character).toUpperCase();
  return GLYPHS[upper] || null;
}

/**
 * The rectangles for one character.
 *
 * Each lit bitmap pixel becomes a face rectangle and a shadow rectangle
 * offset down and right, which is how the letter gets its depth.
 */
export function letterRects(character) {
  const glyph = glyphFor(character);
  if (!glyph) return [];
  const rects = [];
  for (let row = 0; row < glyph.length; row++) {
    const line = glyph[row];
    for (let column = 0; column < line.length; column++) {
      if (line[column] !== '#') continue;
      const x = column * SCALE;
      const y = row * SCALE;
      rects.push({ x, y, w: SCALE, h: SCALE, fill: FACE });
      rects.push({ x: x + 1, y: y + 1, w: SCALE, h: SCALE, fill: SHADOW });
    }
  }
  return rects;
}

/**
 * The rectangles for the whole wordmark.
 *
 * Returns the rectangles and the size of the box they fit in, so the
 * caller can size the SVG without measuring anything.
 */
export function wordmarkRects() {
  const rects = [];
  let offset = 0;
  for (const character of WORDMARK) {
    for (const rect of letterRects(character)) {
      rects.push({ ...rect, x: rect.x + offset });
    }
    offset += 5 * SCALE + GAP;
  }
  const width = Math.max(0, offset - GAP);
  const height = 7 * SCALE;
  return { rects, width, height };
}

/**
 * The wordmark as an inline SVG string.
 *
 * The SVG carries the name as its accessible label, so the drawing
 * replaces the text without hiding it from a screen reader.
 */
export function renderWordmark() {
  const { rects, width, height } = wordmarkRects();
  const body = rects
    .map(rect => `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="${rect.fill}"/>`)
    .join('');
  return `<svg class="imon-wordmark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="IMON.world" focusable="false" shape-rendering="crispEdges">${body}</svg>`;
}

/**
 * Draw the wordmark on every element marked for it.
 *
 * The text is kept on the element as `data-pixel-text`, so the wordmark
 * can be redrawn if the name ever changes.
 */
export function initWordmark(root = document) {
  const nodes = root.querySelectorAll?.('[data-wordmark]') || [];
  for (const node of nodes) {
    const text = node.dataset?.wordmark || node.textContent?.trim() || WORDMARK;
    node.dataset.wordmark = text;
    node.setAttribute('data-wordmark-drawn', 'true');
    node.innerHTML = renderWordmark();
  }
  return nodes.length;
}
