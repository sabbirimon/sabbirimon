/**
 * Pixel-art animations for the login page.
 *
 * Every animation is inline SVG drawn on a whole-number grid with
 * shape-rendering="crispEdges", so the pixels stay chunky and never
 * anti-aliased. The palette is limited to the house colours, declared once
 * here and reused by every sprite.
 *
 * One animation is picked at random on each page load, so the login page
 * never looks the same twice.
 */
const PALETTE = {
  ink: '#030719',
  gold: '#facc15',
  goldLight: '#ffe380',
  accent: '#9eda68',
  mint: '#7dd3fc',
  pink: '#efb4cd',
  lilac: '#c1abf5',
  white: '#f5f5fc',
  muted: '#b1bbd1',
  // Shell and screen colours for the CRT mascot.
  shell: '#e8e2d8',
  shellDark: '#b9b0a2',
  shellLight: '#fbf8f2',
  shellLine: '#4a4438',
  screen: '#7dd3fc',
  screenDeep: '#2b6f9b'
};

// Each sprite is a list of rectangles: [x, y, width, height, colour].
// Rectangles are drawn in order, so later ones sit on top of earlier ones.
const SPRITES = {
  robot: {
    label: 'A friendly robot bobbing in place',
    frames: [
      [
        [12, 14, 24, 4, PALETTE.gold],
        [8, 18, 32, 18, PALETTE.muted],
        [12, 22, 24, 10, PALETTE.ink],
        [16, 25, 6, 4, PALETTE.accent],
        [26, 25, 6, 4, PALETTE.accent],
        [4, 20, 4, 4, PALETTE.gold],
        [40, 20, 4, 4, PALETTE.gold],
        [16, 36, 4, 8, PALETTE.muted],
        [28, 36, 4, 8, PALETTE.muted],
        [12, 44, 12, 4, PALETTE.gold],
        [24, 44, 12, 4, PALETTE.gold]
      ],
      [
        [12, 16, 24, 4, PALETTE.gold],
        [8, 20, 32, 18, PALETTE.muted],
        [12, 24, 24, 10, PALETTE.ink],
        [16, 27, 6, 4, PALETTE.accent],
        [26, 27, 6, 4, PALETTE.accent],
        [4, 22, 4, 4, PALETTE.gold],
        [40, 22, 4, 4, PALETTE.gold],
        [16, 38, 4, 8, PALETTE.muted],
        [28, 38, 4, 8, PALETTE.muted],
        [12, 46, 12, 4, PALETTE.gold],
        [24, 46, 12, 4, PALETTE.gold]
      ]
    ]
  },
  terminal: {
    label: 'A terminal with a blinking cursor',
    frames: [
      [
        [4, 10, 40, 4, PALETTE.muted],
        [4, 14, 40, 28, PALETTE.ink],
        [4, 42, 40, 4, PALETTE.muted],
        [9, 20, 4, 4, PALETTE.accent],
        [15, 20, 4, 4, PALETTE.gold],
        [21, 20, 12, 4, PALETTE.muted],
        [9, 28, 16, 4, PALETTE.muted],
        [9, 34, 4, 4, PALETTE.accent]
      ],
      [
        [4, 10, 40, 4, PALETTE.muted],
        [4, 14, 40, 28, PALETTE.ink],
        [4, 42, 40, 4, PALETTE.muted],
        [9, 20, 4, 4, PALETTE.accent],
        [15, 20, 4, 4, PALETTE.gold],
        [21, 20, 12, 4, PALETTE.muted],
        [9, 28, 16, 4, PALETTE.muted]
      ]
    ]
  },
  gear: {
    label: 'A pixel gear turning slowly',
    frames: [
      [
        [20, 4, 8, 40, PALETTE.gold],
        [4, 20, 40, 8, PALETTE.gold],
        [8, 8, 8, 8, PALETTE.goldLight],
        [32, 8, 8, 8, PALETTE.goldLight],
        [8, 32, 8, 8, PALETTE.goldLight],
        [32, 32, 8, 8, PALETTE.goldLight],
        [18, 18, 12, 12, PALETTE.ink],
        [22, 22, 4, 4, PALETTE.accent]
      ],
      [
        [20, 4, 8, 40, PALETTE.gold],
        [4, 20, 40, 8, PALETTE.gold],
        [12, 4, 8, 8, PALETTE.goldLight],
        [28, 12, 8, 8, PALETTE.goldLight],
        [12, 36, 8, 8, PALETTE.goldLight],
        [28, 28, 8, 8, PALETTE.goldLight],
        [18, 18, 12, 12, PALETTE.ink],
        [22, 22, 4, 4, PALETTE.accent]
      ]
    ]
  },
  bird: {
    label: 'A pixel bird taking a step',
    frames: [
      [
        [10, 16, 20, 8, PALETTE.mint],
        [26, 12, 8, 8, PALETTE.mint],
        [32, 14, 6, 4, PALETTE.gold],
        [28, 16, 2, 2, PALETTE.ink],
        [4, 20, 10, 6, PALETTE.pink],
        [12, 24, 4, 8, PALETTE.gold],
        [20, 24, 4, 8, PALETTE.gold]
      ],
      [
        [10, 16, 20, 8, PALETTE.mint],
        [26, 12, 8, 8, PALETTE.mint],
        [32, 14, 6, 4, PALETTE.gold],
        [28, 16, 2, 2, PALETTE.ink],
        [4, 20, 10, 6, PALETTE.pink],
        [10, 24, 4, 8, PALETTE.gold],
        [20, 24, 4, 8, PALETTE.gold]
      ]
    ]
  },
  cat: {
    label: 'A pixel cat waving hello',
    frames: [
      [
        [14, 14, 20, 20, PALETTE.gold],
        [12, 8, 8, 8, PALETTE.gold],
        [28, 8, 8, 8, PALETTE.gold],
        [18, 22, 4, 4, PALETTE.ink],
        [26, 22, 4, 4, PALETTE.ink],
        [20, 30, 8, 4, PALETTE.pink],
        [8, 22, 6, 10, PALETTE.gold],
        [34, 22, 6, 10, PALETTE.gold],
        [16, 34, 4, 6, PALETTE.gold],
        [28, 34, 4, 6, PALETTE.gold]
      ],
      [
        [14, 14, 20, 20, PALETTE.gold],
        [12, 8, 8, 8, PALETTE.gold],
        [28, 8, 8, 8, PALETTE.gold],
        [18, 22, 4, 4, PALETTE.ink],
        [26, 22, 4, 4, PALETTE.ink],
        [20, 30, 8, 4, PALETTE.pink],
        [8, 22, 6, 10, PALETTE.gold],
        [34, 10, 6, 10, PALETTE.gold],
        [16, 34, 4, 6, PALETTE.gold],
        [28, 34, 4, 6, PALETTE.gold]
      ]
    ]
  },
  // The house mascot: a chunky retro CRT computer with a cyan screen.
  // Frame 0 is at rest; frame 1 has the screen lit and the cursor blinking.
  crt: {
    label: 'A retro CRT computer blinking on its screen',
    frames: [
      [
        // Monitor shell.
        [8, 6, 32, 28, PALETTE.shell],
        [6, 8, 2, 24, PALETTE.shellDark],
        [40, 8, 2, 24, PALETTE.shellDark],
        [8, 6, 32, 2, PALETTE.shellLight],
        // Screen bezel.
        [11, 10, 26, 20, PALETTE.shellLine],
        [13, 12, 22, 16, PALETTE.screenDeep],
        [15, 14, 18, 12, PALETTE.screen],
        // Pixel face on the screen.
        [17, 17, 4, 4, PALETTE.shellLine],
        [27, 17, 4, 4, PALETTE.shellLine],
        [21, 21, 6, 2, PALETTE.shellLine],
        // Stand and base.
        [20, 34, 8, 4, PALETTE.shell],
        [12, 38, 24, 4, PALETTE.shell],
        [10, 42, 28, 4, PALETTE.shellDark],
        // Power LED.
        [37, 33, 2, 2, PALETTE.accent]
      ],
      [
        [8, 6, 32, 28, PALETTE.shell],
        [6, 8, 2, 24, PALETTE.shellDark],
        [40, 8, 2, 24, PALETTE.shellDark],
        [8, 6, 32, 2, PALETTE.shellLight],
        [11, 10, 26, 20, PALETTE.shellLine],
        [13, 12, 22, 16, PALETTE.screenDeep],
        [15, 14, 18, 12, PALETTE.screen],
        // The face changes: eyes widen, mouth opens.
        [16, 16, 6, 6, PALETTE.shellLine],
        [26, 16, 6, 6, PALETTE.shellLine],
        [20, 23, 8, 3, PALETTE.shellLine],
        [20, 34, 8, 4, PALETTE.shell],
        [12, 38, 24, 4, PALETTE.shell],
        [10, 42, 28, 4, PALETTE.shellDark],
        [37, 33, 2, 2, PALETTE.accent]
      ]
    ]
  }
};

/** The names of every pixel animation, in a stable order. */
export const PIXEL_ANIMATIONS = Object.keys(SPRITES);

/** The pixel rectangles that make up one frame of one animation. */
export function pixelFrame(name, frame = 0) {
  const sprite = SPRITES[name];
  if (!sprite) return [];
  const frames = sprite.frames;
  const index = ((Math.floor(frame) % frames.length) + frames.length) % frames.length;
  return frames[index];
}

/** The screen-reader label that describes an animation. */
export function pixelAnimationLabel(name) {
  return SPRITES[name]?.label ?? '';
}

function frameMarkup(name, frame) {
  return pixelFrame(name, frame)
    .map(([x, y, width, height, fill]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`)
    .join('');
}

/**
 * Build the inline SVG for one animation.
 *
 * The SVG is drawn on a 48×48 grid with crisp edges so the pixels stay
 * square. The frames are stacked and revealed one at a time with CSS, so
 * the animation needs no JavaScript once the markup exists.
 */
export function renderPixelArt(name) {
  const sprite = SPRITES[name] ?? SPRITES.robot;
  const frames = sprite.frames
    .map((_, index) => `<g class="pixel-art-frame pixel-art-frame-${index}">${frameMarkup(name, index)}</g>`)
    .join('');
  return `<svg class="pixel-art-svg" viewBox="0 0 48 48" width="120" height="120" role="img" aria-label="${sprite.label}" focusable="false" shape-rendering="crispEdges">${frames}</svg>`;
}

/**
 * Pick one animation at random and render it into the page.
 *
 * The chosen name is written to `data-pixel-art` on the root element, and
 * the container gets `data-pixel-art-animation` so CSS can target the
 * matching animation. Returns the chosen name, or null when there is
 * nowhere to render into.
 *
 * Pass `preferred` to force one animation — the login page pins the CRT
 * mascot so the greeting always matches the speech bubble beside it.
 */
export function initPixelArt(root = document, preferred = null) {
  const container = root?.querySelector?.('[data-pixel-art]');
  if (!container) return null;
  const names = PIXEL_ANIMATIONS;
  if (!names.length) return null;
  const name = preferred && names.includes(preferred)
    ? preferred
    : names[Math.floor(Math.random() * names.length)];
  container.setAttribute('data-pixel-art-animation', name);
  container.setAttribute('aria-label', pixelAnimationLabel(name));
  container.innerHTML = renderPixelArt(name);
  return name;
}
