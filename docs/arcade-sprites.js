/**
 * Pixel sprites for Pixel Snake.
 *
 * Everything here is data or a pure function over data. There is no DOM,
 * no canvas and no randomness, so the whole art direction can be tested
 * under node and drawn identically on every frame.
 *
 * A sprite is a list of rectangles: [x, y, width, height, colour]. They are
 * drawn in order, so a later rectangle sits on top of an earlier one. The
 * snake is drawn on a 30 × 30 grid, which is one cell of the board.
 */

/* The colours the snake is painted with. */
export const SNAKE_PALETTE = {
  body: '#5fd068',
  bodyDark: '#3aa04a',
  bodyLight: '#8bef92',
  belly: '#c2f7a6',
  head: '#2f8f4e',
  headDark: '#1f6b39',
  headLight: '#4fc463',
  eye: '#f4ffe8',
  pupil: '#10281c',
  tongue: '#fc647f',
  scale: '#4bb35c'
};

/* The fruit. Two tables so a bonus fruit can look different. */
export const SNAKE_FOOD = {
  apple: [
    [6, 10, 18, 18, '#c22f4c'],
    [8, 8, 14, 19, '#fc4d6a'],
    [9, 9, 6, 6, '#ff9db0'],
    [14, 3, 3, 7, '#7a4a2b'],
    [17, 4, 6, 3, '#4fae74']
  ],
  gold: [
    [6, 10, 18, 18, '#c99a06'],
    [8, 8, 14, 19, '#facc15'],
    [9, 9, 6, 6, '#fff7c8'],
    [14, 3, 3, 7, '#7a4a2b'],
    [17, 4, 6, 3, '#4fae74']
  ]
};

/**
 * A body cell.
 *
 * The snake is a tube, so the middle of it is drawn as a rounded block that
 * fills the cell, with a pale stripe along the top, a darker belly along
 * the bottom and a scute down the middle. It reaches the full width of the
 * cell so that neighbouring segments join up into one continuous body
 * instead of a chain of squares.
 */
export const SNAKE_BODY = [
  [0, 0, 30, 30, '#3aa04a'],
  [1, 0, 28, 30, '#5fd068'],
  [3, 1, 24, 4, '#8bef92'],
  [2, 25, 26, 5, '#3aa04a'],
  [13, 8, 4, 14, '#4bb35c']
];

/** The tail tapers to a point. */
export const SNAKE_TAIL = [
  [0, 0, 30, 30, '#3aa04a'],
  [1, 1, 28, 29, '#5fd068'],
  [3, 2, 22, 4, '#8bef92'],
  [2, 25, 26, 5, '#3aa04a'],
  [13, 9, 4, 12, '#4bb35c']
];

/** The last three cells shrink, so the snake ends in a point. */
export const SNAKE_TAIL_TIP = [
  [0, 2, 30, 26, '#3aa04a'],
  [1, 4, 28, 24, '#5fd068'],
  [4, 5, 20, 4, '#8bef92'],
  [3, 24, 24, 4, '#3aa04a'],
  [13, 10, 4, 10, '#4bb35c']
];

export const SNAKE_TIP = [
  [2, 8, 26, 14, '#3aa04a'],
  [3, 10, 24, 12, '#5fd068'],
  [7, 11, 14, 3, '#8bef92'],
  [13, 12, 4, 8, '#4bb35c']
];

/**
 * The head, drawn facing right.
 *
 * The skull is a wide block that is clearly bigger than the body, with a lit
 * crown along the top and a dark jaw along the bottom. The snout pushes out
 * to the right in two steps so it narrows towards the nose. The eyes are
 * small and sit wide apart on the skull, one above the other, each a white
 * square with the pupil centred in it — big eyes side by side read as a
 * face, so they are kept small and pushed to the edges of the skull. The
 * other three directions are rotations of this one, so the head is written
 * once and turned by `rotateSprite`.
 */
const HEAD_RIGHT = [
  // The dark base, which gives the head its outline.
  [0, 5, 19, 20, '#2f8f4e'],
  // The skull.
  [1, 3, 18, 24, '#4fc463'],
  // A lit crown along the top.
  [2, 3, 16, 4, '#5fd068'],
  // A dark jaw along the bottom.
  [2, 23, 16, 4, '#1f6b39'],
  // The snout, narrowing towards the nose in two steps.
  [17, 10, 8, 10, '#4fc463'],
  [23, 12, 6, 6, '#5fd068'],
  [27, 13, 3, 4, '#5fd068'],
  // The eyes, small and set wide apart on the skull.
  [5, 7, 5, 5, '#f4ffe8'],
  [5, 18, 5, 5, '#f4ffe8'],
  [6, 8, 2, 2, '#10281c'],
  [6, 19, 2, 2, '#10281c'],
  // A nostril, so the nose end reads as a nose.
  [22, 14, 2, 2, '#1f6b39']
];

/**
 * Turn a sprite table a quarter turn at a time.
 *
 * The grid is 30 × 30, so a 90° turn maps a rectangle at (x, y) with size
 * (w, h) to (30 - y - h, x) with size (h, w). Turning four times gives the
 * original table back, which is what the test checks.
 */
export function rotateSprite(table, turns = 1) {
  const steps = ((turns % 4) + 4) % 4;
  let out = table.map(rect => [...rect]);
  for (let turn = 0; turn < steps; turn += 1) {
    out = out.map(([x, y, w, h, colour]) => [30 - y - h, x, h, w, colour]);
  }
  return out;
}

/**
 * Shrink a sprite table from the 30 × 30 grid it is drawn on to the size of
 * a board cell.
 *
 * The art is authored at 30 pixels so it stays crisp on a high density
 * screen, but the cells are smaller than that. The table is scaled rather
 * than redrawn, so one piece of art serves every cell size.
 */
export function scaleSprite(table, size) {
  const factor = size / 30;
  return table.map(([x, y, w, h, colour]) => [
    Math.round(x * factor), Math.round(y * factor),
    Math.max(1, Math.round(w * factor)), Math.max(1, Math.round(h * factor)),
    colour
  ]);
}

/**
 * The head for each direction.
 *
 * Right is the base drawing. Down is one turn of it, left is two and up is
 * three, so all four look like the same creature.
 */
export const SNAKE_HEADS = {
  right: rotateSprite(HEAD_RIGHT, 0),
  down: rotateSprite(HEAD_RIGHT, 1),
  left: rotateSprite(HEAD_RIGHT, 2),
  up: rotateSprite(HEAD_RIGHT, 3)
};

/** The tongue is only drawn when the snake is reaching for the fruit. */
export const SNAKE_TONGUE = [
  [28, 12, 2, 2, '#fc647f'],
  [28, 16, 2, 2, '#fc647f']
];

/**
 * The ground of the board, per mode.
 *
 * Every mode has its own palette, so Night really is a different place
 * rather than the same board with a filter over it.
 */
export const SCENES = {
  classic: {
    ground: '#24405a',
    groundAlt: '#2b4a67',
    path: '#356078',
    wall: '#42648c',
    wallTop: '#7ea3cc',
    wallEdge: '#1b3049',
    grass: '#2c5a48',
    grassLight: '#468a67',
    pebble: '#355c78',
    flower: '#5fa6c4',
    dim: 0
  },
  walls: {
    ground: '#20406b',
    groundAlt: '#27497a',
    path: '#325c94',
    wall: '#42689b',
    wallTop: '#8fb4e0',
    wallEdge: '#1a3459',
    grass: '#26536b',
    grassLight: '#3f829f',
    pebble: '#32527f',
    flower: '#6bb0cd',
    dim: 0
  },
  night: {
    ground: '#141f36',
    groundAlt: '#1a2743',
    path: '#223253',
    wall: '#33456b',
    wallTop: '#55699a',
    wallEdge: '#141d31',
    grass: '#1c3a36',
    grassLight: '#2e5f52',
    pebble: '#243450',
    flower: '#4b6392',
    dim: 0.72
  },
  timed: {
    ground: '#3d2e1e',
    groundAlt: '#473724',
    path: '#56422a',
    wall: '#6b5233',
    wallTop: '#ab8354',
    wallEdge: '#2c2015',
    grass: '#43562c',
    grassLight: '#657f42',
    pebble: '#4b3925',
    flower: '#c98c45',
    dim: 0
  }
};

/**
 * The board geometry.
 *
 * The playfield is smaller than the canvas, so the stone wall can be drawn
 * in the margin around it. That matters: the snake has to die exactly where
 * the wall looks like it is, or the player thinks the wall is harmless.
 *
 * The cells are smaller than the 30 × 30 grid the sprites are authored on,
 * so the snake gets a wide arena to run in without the art having to be
 * redrawn. A cramped board is a game that ends in two seconds.
 */
export const BOARD = {
  cols: 34,
  rows: 22,
  cell: 24,
  margin: 24,
  width: 34 * 24,
  height: 22 * 24
};

/**
 * The scattered decoration on the ground.
 *
 * A tiny deterministic generator rather than `Math.random`, so the same
 * board looks the same on every frame and never shimmers. It is seeded from
 * the mode name, so each mode gets its own scatter.
 */
export function sceneCells(scene, cols, rows, seed = 'classic') {
  const cells = [];
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  const next = () => {
    // A small linear congruential step. It only has to look random.
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const roll = next();
      if (roll > 0.982) cells.push({ x, y, kind: 'flower' });
      else if (roll > 0.93) cells.push({ x, y, kind: 'pebble' });
    }
  }
  return cells;
}

/**
 * The bounding box of a sprite table.
 *
 * Used by the test to prove no sprite draws outside its own cell.
 */
export function spriteBounds(table) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y, w, h] of table) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Every colour a sprite table uses.
 *
 * The test uses it to prove the four heads are the same creature drawn in
 * four directions, rather than four different animals.
 */
export function spriteColors(table) {
  return new Set(table.map(rect => rect[4]));
}

/**
 * The stone wall around the board.
 *
 * The wall sits in the margin outside the playfield, so the edge the snake
 * dies on is the edge the player can see. Each block is a lit top edge and
 * a dark body, which gives the wall depth without any shading.
 */
export function wallBlocks(board = BOARD) {
  const { cols, rows, cell, margin, width, height } = board;
  const blocks = [];
  // The top and bottom courses, running the whole width of the playfield.
  for (let x = 0; x < cols; x += 1) {
    const px = margin + x * cell;
    blocks.push([px, margin - cell, cell, cell, 'top']);
    blocks.push([px, margin + height, cell, cell, 'bottom']);
  }
  // The left and right courses, running the whole height of the playfield.
  for (let y = 0; y < rows; y += 1) {
    const py = margin + y * cell;
    blocks.push([margin - cell, py, cell, cell, 'side']);
    blocks.push([margin + width, py, cell, cell, 'side']);
  }
  return blocks;
}
