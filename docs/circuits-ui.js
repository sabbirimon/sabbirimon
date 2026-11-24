import {showTopicCheck} from './topic-check.js';
import { scheduleProgressSync } from './auth.js';
import { playSound } from './audio.js';
/**
 * The Circuits & Signals page controller — the bench for the electronics
 * course.
 *
 * It follows the same shape as the other two labs: a lesson on the left,
 * a workbench on the right, a chapter rail, XP and a progress bar. The
 * difference is the workbench. There is a parts bin, a board where parts
 * are placed and wired, a scope that plots the probed node over time,
 * and an answer box for the exercises that ask for a number or a
 * paragraph.
 *
 * Nothing here talks to a network. The course is fetched from a local
 * JSON file, and progress is kept in localStorage under
 * `imon-circuits-v1`.
 *
 * House rules: every DOM access happens inside `initCircuits`, and the
 * pure helpers below are exported so they can be tested under node.
 */

import {
  CIRCUIT_PARTS,
  PART_ORDER,
  loadCircuitsCourse,
  circuitChapters,
  formatValue,
  nodalSolve,
  simulate,
  signalMetrics
} from './circuits.js';
import { CIRCUITS_COURSE, findChapter } from './circuits-chapters.js';
import { renderPixelText } from './pixel-type.js';
import { initLabReward } from './lab-reward.js';
import {
  loadPreferred,
  savePreferred,
  togglePreferred,
  filterPreferred,
  preferredLabel
} from './lab-preferred.js';

/** The localStorage key that holds the learner's progress. */
export const CIRCUITS_PROGRESS_KEY = 'imon-circuits-v1';

/**
 * The key the Circuits lab keeps its stars under.
 *
 * The Circuits lab has its own key, because it shares the exercise id
 * format with the other labs but means something different by it.
 */
export const CIRCUITS_PREFERRED_KEY = 'imon-circuits-preferred-v1';

/** The open-source EDA tools the course points at. */
export const CIRCUITS_TOOLS = [
  {
    name: 'EEcircuit',
    focus: 'Analog and mixed-signal SPICE in the browser',
    tech: 'ngspice compiled to WebAssembly, WebGL waveforms',
    license: 'GPL-3.0',
    url: 'https://github.com/eelab-dev/EEcircuit'
  },
  {
    name: 'OpenCircuits',
    focus: 'Digital logic designer and simulator',
    tech: 'TypeScript, WebGL rendering',
    license: 'MIT',
    url: 'https://github.com/OpenCircuits/OpenCircuits'
  },
  {
    name: 'DigitalJS',
    focus: 'Digital circuit simulator for synthesised netlists',
    tech: 'Yosys JSON, TypeScript',
    license: 'Apache-2.0',
    url: 'https://github.com/tilk/digitaljs'
  },
  {
    name: 'aeCAD',
    focus: 'Parametric PCB and schematic capture',
    tech: 'LiveScript and JavaScript',
    license: 'MIT',
    url: 'https://github.com/aktos-io/aecad'
  },
  {
    name: 'Fluxa',
    focus: 'A lightweight schematic and breadboard workspace',
    tech: 'JavaScript and SVG',
    license: 'MIT',
    url: 'https://github.com/Arvanta/Fluxa'
  },
  {
    name: 'OpenBench',
    focus: 'An electronics workbench: schematic, simulation and firmware',
    tech: 'WebAssembly ngspice, TypeScript',
    license: 'MIT',
    url: 'https://github.com/shuvamk/openbench'
  },
  {
    name: 'EDAV — EDAViewer',
    focus: 'Opens an IC layout for reading',
    tech: 'PixiJS and WebGL',
    license: 'MIT',
    url: 'https://github.com/ahmed-agiza/EDAViewer'
  }
];

/* ------------------------------------------------------------------ *
 * The board layout
 * ------------------------------------------------------------------ */

/**
 * The board's nodes, laid out in a grid.
 *
 * Node 0 is the ground and sits at the bottom left. The rest form a
 * ladder, which is how a circuit is usually drawn.
 */
export const BOARD_NODES = [
  { id: 0, x: 60, y: 340, label: 'GND' },
  { id: 1, x: 60, y: 80, label: 'N1' },
  { id: 2, x: 220, y: 80, label: 'N2' },
  { id: 3, x: 380, y: 80, label: 'N3' },
  { id: 4, x: 540, y: 80, label: 'N4' },
  { id: 5, x: 220, y: 210, label: 'N5' },
  { id: 6, x: 380, y: 210, label: 'N6' },
  { id: 7, x: 540, y: 210, label: 'N7' },
  { id: 8, x: 660, y: 210, label: 'N8' }
];

/**
 * Where each part kind is drawn, and how big it is.
 */
export const PART_SHAPES = {
  resistor: { w: 70, h: 26, label: 'R' },
  capacitor: { w: 50, h: 26, label: 'C' },
  inductor: { w: 70, h: 26, label: 'L' },
  led: { w: 46, h: 26, label: 'LED' },
  diode: { w: 46, h: 26, label: 'D' },
  battery: { w: 46, h: 30, label: 'B' },
  switch: { w: 54, h: 26, label: 'SW' },
  potentiometer: { w: 60, h: 34, label: 'POT' },
  ground: { w: 40, h: 20, label: 'GND' }
};

/**
 * The starting circuit for an exercise.
 *
 * An exercise that names a netlist starts from that netlist. Every other
 * exercise starts from a simple series loop, so there is always
 * something to look at on the scope.
 */
export function startingCircuit(exercise) {
  const netlist = exercise?.netlist?.parts;
  const parts = [];
  if (Array.isArray(netlist) && netlist.length) {
    const starter = exercise.kind === 'build' ? netlist.filter(part => part.id === 'battery') : netlist;
    starter.forEach((part, index) => {
      parts.push({
        id: part.id,
        label: part.id.slice(0, 1).toUpperCase() + (index + 1),
        value: Number.isFinite(part.value) ? part.value : CIRCUIT_PARTS[part.id]?.defaults.value,
        nodeA: part.nodeA,
        nodeB: part.nodeB,
        pins: CIRCUIT_PARTS[part.id]?.pins || 2
      });
    });
    return { parts };
  }
  parts.push({ id: 'battery', label: 'B1', value: 9, nodeA: 1, nodeB: 0, pins: 2 });
  parts.push({ id: 'resistor', label: 'R1', value: 1000, nodeA: 1, nodeB: 2, pins: 2 });
  parts.push({ id: 'resistor', label: 'R2', value: 1000, nodeA: 2, nodeB: 0, pins: 2 });
  return { parts };
}

/**
 * Give a new part a label that is not already in use.
 */
export function nextLabel(parts, kind) {
  const prefix = (CIRCUIT_PARTS[kind]?.label || 'P').slice(0, 1).toUpperCase();
  const used = new Set((parts || []).map(part => part.label));
  let index = 1;
  while (used.has(prefix + index)) index += 1;
  return prefix + index;
}

/**
 * The parts the learner has on the board.
 */
export function circuitParts(circuit) {
  return Array.isArray(circuit?.parts) ? circuit.parts : [];
}

/**
 * A readable summary of what is on the board.
 *
 * The readout tells the learner what the simulator found, so the page
 * answers "what does my circuit do" without them doing the arithmetic.
 */
export function describeSolution(circuit, solution) {
  if (!solution || solution.error) return solution?.error || 'The circuit could not be solved.';
  const lines = [];
  for (const part of circuitParts(circuit)) {
    const spec = CIRCUIT_PARTS[part.id];
    if (!spec || spec.kind === 'reference') continue;
    const voltage = (solution.nodes[part.nodeA] ?? 0) - (solution.nodes[part.nodeB] ?? 0);
    const current = solution.branchCurrents?.[part.label] ?? 0;
    lines.push({
      label: part.label,
      name: spec.name,
      value: formatValue(part.id, part.value),
      voltage,
      current,
      text: `${part.label} ${spec.name} ${formatValue(part.id, part.value)} — ${voltage.toFixed(3)} V, ${formatCurrent(current)}`
    });
  }
  return lines;
}

/**
 * A current in the unit a person would use.
 */
export function formatCurrent(amps) {
  const value = Math.abs(Number(amps) || 0);
  if (value >= 1) return `${value.toFixed(3)} A`;
  if (value >= 0.001) return `${(value * 1000).toFixed(3)} mA`;
  if (value >= 1e-6) return `${(value * 1e6).toFixed(3)} µA`;
  return `${(value * 1e9).toFixed(3)} nA`;
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

/**
 * Read the saved progress.
 *
 * A corrupt or missing value gives an empty progress rather than
 * throwing, because a broken localStorage entry must never take the
 * page down.
 */
export function readCircuitsProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(CIRCUITS_PROGRESS_KEY);
    if (!raw) return { solved: [], xp: 0 };
    const parsed = JSON.parse(raw);
    const solved = Array.isArray(parsed?.solved) ? parsed.solved.filter(id => typeof id === 'string') : [];
    return { solved, xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0 };
  } catch {
    return { solved: [], xp: 0 };
  }
}

/**
 * Write the progress back.
 */
export function writeCircuitsProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(CIRCUITS_PROGRESS_KEY, JSON.stringify({
      solved: [...(progress?.solved || [])],
      xp: Number(progress?.xp) || 0
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Draw one element as pixel art with the words it holds right now.
 */
export function drawCircuitsPixelText(element) {
  if (!element) return false;
  const drawn = element.querySelector?.('.pixel-text');
  const label = drawn?.getAttribute?.('aria-label') || '';
  const text = String(element.textContent || '').trim() || label || element.dataset.pixelText || '';
  if (!text) return false;
  element.dataset.pixelText = text;
  element.setAttribute('data-pixel-text-drawn', 'true');
  element.innerHTML = renderPixelText(text);
  return true;
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

/**
 * Set the Circuits lab going.
 *
 * Returns a small object with the methods the page needs: loading the
 * course, opening an exercise, and finding one by id.
 */
export function initCircuits(root) {
  if (!root) return null;

  const rail = root.querySelector?.('[data-circuits-rail]');
  const title = root.querySelector?.('[data-circuits-title]');
  const kind = root.querySelector?.('[data-circuits-kind]');
  const brief = root.querySelector?.('[data-circuits-brief]');
  const learn = root.querySelector?.('[data-circuits-learn]');
  const status = root.querySelector?.('[data-circuits-status]');
  const credit = root.querySelector?.('[data-circuits-credit]');
  const empty = root.querySelector?.('[data-circuits-empty]');
  const xpBadge = root.querySelector?.('[data-circuits-xp]');
  const chapter = root.querySelector?.('[data-circuits-chapter]');
  const counter = root.querySelector?.('[data-circuits-counter]');
  const progressBar = root.querySelector?.('[data-circuits-progress]');
  const prevButton = root.querySelector?.('[data-circuits-prev]');
  const nextButton = root.querySelector?.('[data-circuits-next]');
  const doneButton = root.querySelector?.('[data-circuits-done]');
  const runButton = root.querySelector?.('[data-circuits-run]');
  const checkButton = root.querySelector?.('[data-circuits-check]');
  const resetButton = root.querySelector?.('[data-circuits-reset]');
  const answerBox = root.querySelector?.('[data-circuits-answer-box]');
  const answerHint = root.querySelector?.('[data-circuits-answer-hint]');
  const picker = root.querySelector('[data-component-picker]');
  const nodeABox = root.querySelector('[data-node-a]');
  const nodeBBox = root.querySelector('[data-node-b]');
  for (const box of [nodeABox,nodeBBox]) {
    if (box) for (const node of BOARD_NODES) box.add(new Option(node.label, String(node.id)));
  }
  const partsBox = root.querySelector?.('[data-circuits-parts]');
  const probeBox = root.querySelector?.('[data-circuits-probe]');
  const canvas = root.querySelector?.('[data-circuits-canvas]');
  const scopeCanvas = root.querySelector?.('[data-circuits-scope-canvas]');
  const readout = root.querySelector?.('[data-circuits-readout]');
  const metrics = root.querySelector?.('[data-circuits-metrics]');
  const toolList = root.querySelector?.('[data-circuits-tool-list]');
  const editBox = root.querySelector?.('[data-circuits-edit]');
  const selectedText = root.querySelector?.('[data-circuits-selected]');
  const valueInput = root.querySelector?.('[data-circuits-value]');
  const applyButton = root.querySelector?.('[data-circuits-apply]');
  const removeButton = root.querySelector?.('[data-circuits-remove]');
  const preferredOnly = root.querySelector?.('[data-circuits-preferred-only]');
  const preferredCount = root.querySelector?.('[data-circuits-preferred-count]');
  const tabButtons = root.querySelectorAll?.('[data-circuits-tab]') || [];

  const state = {
    exercises: [],
    exercise: null,
    solved: new Set(),
    xp: 0,
    circuit: { parts: [] },
    selected: null,
    probe: 2,
    samples: [],
    scopeError: ''
  };

  let preferred = loadPreferred(globalThis.localStorage, CIRCUITS_PREFERRED_KEY);
  const showingPreferred = () => preferredOnly?.getAttribute('aria-pressed') === 'true';

  const reward = initLabReward(root);

  /* -- the tabs ---------------------------------------------------- */

  const panes = {
    board: root.querySelector?.('[data-circuits-bench]'),
    scope: root.querySelector?.('[data-circuits-scope]'),
    answer: root.querySelector?.('[data-circuits-answer]'),
    tools: root.querySelector?.('[data-circuits-tools]')
  };

  function showTab(name) {
    for (const [key, pane] of Object.entries(panes)) {
      if (pane) pane.hidden = key !== name;
    }
    for (const button of tabButtons) {
      const on = button.dataset.circuitsTab === name;
      button.setAttribute('aria-selected', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
    }
    if (name === 'scope') drawScope();
  }

  for (const button of tabButtons) {
    button.addEventListener('click', () => showTab(button.dataset.circuitsTab));
  }

  /* -- the rail ---------------------------------------------------- */

  function renderRail() {
    if (!rail) return;
    rail.textContent = '';
    const groups = circuitChapters(state.exercises);
    for (const group of groups) {
      const shown = showingPreferred()
        ? filterPreferred(group.exercises, preferred)
        : group.exercises;
      if (!shown.length) continue;
      const item = document.createElement('li');
      item.className = 'lab-rail-group';
      const heading = document.createElement('p');
      heading.className = 'lab-rail-chapter';
      heading.textContent = group.chapter;
      item.append(heading);
      const list = document.createElement('ol');
      list.className = 'lab-rail-items';
      for (const exercise of shown) {
        const row = document.createElement('li');
        row.className = 'lab-rail-item';
        const link = document.createElement('a');
        link.href = './circuits.html?exercise=' + encodeURIComponent(exercise.id);
        link.dataset.circuitsRailItem = exercise.id;
        link.className = 'lab-rail-link';
        const mark = document.createElement('span');
        mark.className = 'lab-rail-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '•';
        const label = document.createElement('span');
        label.className = 'lab-rail-label';
        label.textContent = exercise.title;
        link.append(mark, label);
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'lab-rail-star';
        star.dataset.circuitsStar = exercise.id;
        const starred = preferred.has(exercise.id);
        star.setAttribute('aria-pressed', starred ? 'true' : 'false');
        star.setAttribute('aria-label', preferredLabel(starred, exercise.title));
        star.title = starred ? 'Preferred' : 'Add to preferred';
        star.textContent = starred ? '★' : '☆';
        row.append(link, star);
        list.append(row);
      }
      item.append(list);
      rail.append(item);
    }
    if (preferredCount) {
      const count = preferred.size;
      preferredCount.textContent = count === 1 ? '1 starred' : `${count} starred`;
      preferredCount.hidden = count === 0 && !showingPreferred();
    }
  }

  function updateRail() {
    if (!rail) return;
    for (const link of rail.querySelectorAll('[data-circuits-rail-item]')) {
      const id = link.dataset.circuitsRailItem;
      link.dataset.state = state.solved.has(id) ? 'solved' : 'open';
      const mark = link.querySelector('.lab-rail-mark');
      if (mark) mark.textContent = state.solved.has(id) ? '✔' : '•';
      const label = link.querySelector('.lab-rail-label');
      if (label) label.setAttribute('aria-current', id === state.exercise?.id ? 'true' : 'false');
    }
  }

  function toggleStar(id) {
    preferred = togglePreferred(preferred, id);
    savePreferred(preferred, globalThis.localStorage, CIRCUITS_PREFERRED_KEY);
    renderRail();
    updateRail();
    if (status) {
      status.textContent = preferred.has(id) ? 'Added to preferred.' : 'Removed from preferred.';
    }
  }

  /* -- the parts bin ------------------------------------------------ */

  function renderParts() {
    if (!partsBox) return;
    partsBox.textContent = '';
    for (const id of PART_ORDER) {
      const part = CIRCUIT_PARTS[id];
      if (!part) continue;
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'circuits-part';
      button.dataset.circuitsPart = id;
      const name = document.createElement('span');
      name.className = 'circuits-part-name';
      name.textContent = part.name;
      const value = document.createElement('span');
      value.className = 'circuits-part-value';
      value.textContent = formatValue(id, part.defaults.value);
      button.append(name, value);
      row.append(button);
      partsBox.append(row);
    }
  }

  /* -- the board --------------------------------------------------- */

  /**
   * Where a node is drawn on the canvas.
   */
  function nodePosition(id) {
    const node = BOARD_NODES.find(item => item.id === id);
    if (node) return { x: node.x, y: node.y };
    // A node the learner has made up falls on the ladder.
    const index = BOARD_NODES.findIndex(item => item.id === id);
    const row = index < 0 ? 0 : index;
    return { x: 80 + (row % 5) * 160, y: 80 + Math.floor(row / 5) * 130 };
  }

  /**
   * The board, drawn onto the canvas.
   *
   * Everything is drawn from the circuit data, so the picture can never
   * disagree with what the solver sees.
   */
  function drawBoard() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, width, height);

    // The rails, drawn as a faint grid so the board reads as a board.
    ctx.strokeStyle = 'rgba(148,163,184,0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    // The wires first, so the parts sit on top of them.
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 3;
    for (const part of circuitParts(state.circuit)) {
      const from = nodePosition(part.nodeA);
      const to = nodePosition(part.nodeB);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    // The parts.
    for (const part of circuitParts(state.circuit)) {
      drawPart(ctx, part);
    }

    // The nodes last, so a probe dot is always visible.
    const used = new Set();
    for (const part of circuitParts(state.circuit)) {
      used.add(part.nodeA);
      used.add(part.nodeB);
    }
    for (const node of BOARD_NODES) {
      if (!used.has(node.id)) continue;
      const { x, y } = nodePosition(node.id);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = node.id === state.probe ? '#fbbf24' : '#e2e8f0';
      ctx.fill();
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(node.id === 0 ? 'GND' : 'N' + node.id, x, y + 22);
    }
  }

  /**
   * Draw one part between its two nodes.
   */
  function drawPart(ctx, part) {
    const spec = CIRCUIT_PARTS[part.id];
    const shape = PART_SHAPES[part.id] || PART_SHAPES.resistor;
    const from = nodePosition(part.nodeA);
    const to = nodePosition(part.nodeB);
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2;
    const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
    const w = horizontal ? shape.w : shape.h;
    const h = horizontal ? shape.h : shape.w;

    ctx.fillStyle = state.selected === part.label ? '#fde68a' : '#1e293b';
    ctx.strokeStyle = state.selected === part.label ? '#fbbf24' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(part.label, cx, cy);

    ctx.font = '9px ui-monospace, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(formatValue(part.id, part.value), cx, cy + (horizontal ? h / 2 + 10 : -h / 2 - 8));
  }

  /* -- the scope ---------------------------------------------------- */

  function drawScope() {
    if (!scopeCanvas) return;
    const ctx = scopeCanvas.getContext('2d');
    if (!ctx) return;
    const width = scopeCanvas.width;
    const height = scopeCanvas.height;

    ctx.fillStyle = '#041018';
    ctx.fillRect(0, 0, width, height);

    // The graticule.
    ctx.strokeStyle = 'rgba(34,211,238,0.16)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 10) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 8) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    const samples = state.samples || [];
    if (!samples.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press Run to see the trace.', width / 2, height / 2);
      return;
    }

    const values = samples.map(sample => sample.value);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    const span = max - min || 1;
    const t0 = samples[0].time;
    const t1 = samples[samples.length - 1].time || 1;
    const timeSpan = t1 - t0 || 1;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = ((sample.time - t0) / timeSpan) * width;
      const y = height - ((sample.value - min) / span) * (height - 20) - 10;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // The axis labels.
    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(max.toFixed(2) + ' V', 6, 14);
    ctx.fillText(min.toFixed(2) + ' V', 6, height - 6);
    ctx.textAlign = 'right';
    ctx.fillText(t1.toFixed(4) + ' s', width - 6, height - 6);
  }

  /**
   * The numbers the scope shows under the trace.
   */
  function renderMetrics() {
    if (!metrics) return;
    metrics.textContent = '';
    const stats = signalMetrics(state.samples || []);
    const rows = [
      ['Max', stats.max.toFixed(3) + ' V'],
      ['Min', stats.min.toFixed(3) + ' V'],
      ['Peak to peak', stats.peakToPeak.toFixed(3) + ' V'],
      ['Mean', stats.mean.toFixed(3) + ' V'],
      ['RMS', stats.rms.toFixed(3) + ' V']
    ];
    if (stats.period > 0) {
      rows.push(['Period', (stats.period * 1000).toFixed(3) + ' ms']);
      rows.push(['Frequency', stats.frequency.toFixed(2) + ' Hz']);
    }
    for (const [name, value] of rows) {
      const term = document.createElement('dt');
      term.textContent = name;
      const detail = document.createElement('dd');
      detail.textContent = value;
      metrics.append(term, detail);
    }
  }

  /* -- the probe ---------------------------------------------------- */

  function renderProbe() {
    const placed=circuitParts(state.circuit);
    if (picker) {
      picker.replaceChildren(new Option('Choose a component',''));
      for(const part of placed) picker.add(new Option(part.label,part.label));
      picker.value=state.selected || '';
    }
    if(editBox && !state.selected) editBox.hidden=true;
    if (!probeBox) return;
    probeBox.textContent = '';
    const used = new Set([0]);
    for (const part of circuitParts(state.circuit)) {
      used.add(part.nodeA);
      used.add(part.nodeB);
    }
    if(!used.has(state.probe)) state.probe=[...used].find(id=>id!==0) ?? 0;
    for (const id of [...used].sort((a, b) => a - b)) {
      const option = document.createElement('option');
      option.value = String(id);
      option.textContent = id === 0 ? 'Ground' : 'Node ' + id;
      option.selected = id === state.probe;
      probeBox.append(option);
    }
  }

  /* -- running ------------------------------------------------------ */

  /**
   * Solve the circuit and draw the trace.
   */
  function run() {
    const circuit = state.circuit;
    const parts = circuitParts(circuit);
    if (!parts.length) {
      if (status) status.textContent = 'There is nothing on the bench yet. Place a part from the bin.';
      return;
    }
    // The time step is chosen from the circuit itself, so a fast circuit
    // still gets a sensible number of steps.
    const resistance = parts.filter(p => p.id === 'resistor').reduce((sum,p) => sum + p.value,0) || 1000;
    const times = parts.flatMap(p => p.id === 'capacitor' ? [resistance*p.value] : p.id === 'inductor' ? [p.value/resistance] : []);
    const duration = times.length ? Math.max(1e-9, Math.max(...times)*5) : 0.05;
    const result = simulate(circuit, {dt:duration/600, duration, probe:state.probe});
    state.samples = result.samples;
    state.scopeError = result.error;

    const steady = nodalSolve(circuit);
    const lines = describeSolution(circuit, steady);
    if (readout) {
      readout.textContent = lines.map(line => line.text).join('   ·   ') || 'Nothing to report.';
    }
    renderMetrics();
    drawBoard();
    drawScope();
    showTab('scope');
    if (status) {
      status.textContent = result.error
        ? 'The simulator could not solve that circuit: ' + result.error
        : 'Ran the circuit. The scope is showing the probed node.';
    }
  }

  /* -- checking ----------------------------------------------------- */

  function check() {
    const exercise = state.exercise;
    if (!exercise) return;
    const answer = answerBox?.value || '';
    const result = exercise.check({
      answer,
      circuit: state.circuit
    });
    playSound(result.ok ? 'correct' : 'retry');
    if (result.ok) {
      const first = !state.solved.has(exercise.id);
      if (first) {
        state.solved.add(exercise.id);
        state.xp += exercise.xp;
        writeCircuitsProgress({ solved: [...state.solved], xp: state.xp });
        scheduleProgressSync();
        document.dispatchEvent(new Event('imon:lesson-saved'));
        updateXp(state.xp);
        updateRail();
        updateCounter();
        reward?.show?.(exercise, exercise.xp, state.xp);
      }
      if (status) {
        status.textContent = result.message;
        status.dataset.state = 'ok';
      }
      // A right answer clears the panel: a stale "you were off by" note
      // left under a solved exercise reads as a fresh failure.
      const doneFeedback = root.querySelector?.('[data-circuits-feedback]');
      if (doneFeedback) doneFeedback.hidden = true;
      if (doneButton) doneButton.hidden = false;
      return;
    }
    if (status) {
      status.textContent = result.message;
      status.dataset.state = 'bad';
    }
    const feedback = root.querySelector?.('[data-circuits-feedback]');
    const feedbackList = root.querySelector?.('[data-circuits-feedback-list]');
    const feedbackCode = root.querySelector?.('[data-circuits-feedback-code]');
    if (feedback) feedback.hidden = false;
    if (feedbackList) {
      feedbackList.textContent = '';
      const item = document.createElement('li');
      item.textContent = result.hint || '';
      feedbackList.append(item);
    }
    if (feedbackCode) {
      const code = feedbackCode.querySelector?.('code') || feedbackCode;
      code.textContent = exercise.kind === 'build'
        ? 'Place the parts, then wire each one between the right nodes.'
        : 'Check the brief, work the numbers, then type your answer in the Answer panel.';
    }
  }

  /* -- the lesson --------------------------------------------------- */

  /**
   * The study material for the open exercise.
   */
  function renderLearn(exercise) {
    if (!learn) return;
    learn.textContent = '';
    const material = findChapter(exercise?.chapter);
    if (!material) return;
    const wrap = document.createElement('div');
    wrap.className = 'lab-learn-card';

    const goal = document.createElement('p');
    goal.className = 'lab-learn-goal';
    goal.innerHTML = '<strong>Goal</strong> — ' + escapeHtml(material.goal);
    wrap.append(goal);

    for (const piece of material.material) {
      const block = document.createElement('section');
      block.className = 'lab-learn-piece';
      const heading = document.createElement('h3');
      heading.className = 'lab-learn-title';
      heading.textContent = piece.title;
      block.append(heading);
      for (const line of String(piece.body).split('\n\n')) {
        const paragraph = document.createElement('p');
        paragraph.textContent = line;
        block.append(paragraph);
      }
      if (piece.code) {
        const pre = document.createElement('pre');
        pre.className = 'lab-learn-code';
        const code = document.createElement('code');
        code.textContent = piece.code;
        pre.append(code);
        block.append(pre);
      }
      wrap.append(block);
    }

    const exam = document.createElement('section');
    exam.className = 'lab-learn-piece';
    const examTitle = document.createElement('h3');
    examTitle.className = 'lab-learn-title';
    examTitle.textContent = 'How it is checked';
    exam.append(examTitle);
    const examBody = document.createElement('p');
    examBody.textContent = material.exam;
    exam.append(examBody);
    wrap.append(exam);

    const outcome = document.createElement('section');
    outcome.className = 'lab-learn-piece';
    const outcomeTitle = document.createElement('h3');
    outcomeTitle.className = 'lab-learn-title';
    outcomeTitle.textContent = 'After this exercise';
    outcome.append(outcomeTitle);
    const outcomeBody = document.createElement('p');
    outcomeBody.textContent = material.outcome;
    outcome.append(outcomeBody);
    wrap.append(outcome);

    learn.append(wrap);
  }

  /**
   * Put the text of a string into the page without treating it as HTML.
   */
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  /* -- the course --------------------------------------------------- */

  function updateXp(value) {
    if (xpBadge) xpBadge.textContent = `${value} XP`;
  }

  function updateCounter() {
    const list = state.exercises;
    const index = list.findIndex(exercise => exercise.id === state.exercise?.id);
    const position = index < 0 ? 0 : index + 1;
    if (counter) {
      counter.textContent = `Exercise ${position} / ${list.length}`;

    }
    if (progressBar) {
      progressBar.max = list.length;
      progressBar.value = state.solved.size;
      progressBar.setAttribute('aria-valuetext', `${state.solved.size} of ${list.length} exercises solved`);
    }
    if (chapter && state.exercise) {
      chapter.textContent = state.exercise.chapter;

    }
    if (prevButton) prevButton.hidden = !neighbour(list, state.exercise?.id, 'prev');
    if (nextButton) nextButton.hidden = !neighbour(list, state.exercise?.id, 'next');
    if (doneButton) doneButton.hidden = !state.solved.has(state.exercise?.id);
  }

  /**
   * The exercise before or after this one.
   */
  function neighbour(list, id, direction) {
    const index = list.findIndex(exercise => exercise.id === id);
    if (index < 0) return null;
    const next = direction === 'prev' ? index - 1 : index + 1;
    return list[next] || null;
  }

  /**
   * Open an exercise.
   */
  function loadExercise(id) {
    const exercise = state.exercises.find(item => item.id === id);
    if (!exercise) return false;
    state.exercise = exercise;
    showTopicCheck(root.querySelector('[data-topic-check]'),'circuits',exercise.chapter,exercise.id);
    const reference = root.querySelector('.lab-example');
    if (reference) {
      reference.open = false;
      const criteria = exercise.kind === 'design';
      const values = criteria ? exercise.ideas : exercise.expected;
      const sample = exercise.netlist?.parts?.map(part => {
        const value = Number.isFinite(part.value) ? ' · ' + formatValue(part.id,part.value) : '';
        return part.id + ' · node ' + part.nodeA + ' to node ' + part.nodeB + value;
      }).join('\n');
      reference.hidden = !(values?.length || sample);
      reference.querySelector('summary').textContent = criteria ? 'Review design criteria' : 'Show reference answer';
      reference.querySelector('code').textContent = sample || (values || []).map(value => criteria ? value : value + ' ' + (exercise.unit || '')).join(' · ');
    }

    state.circuit = startingCircuit(exercise);
    state.selected = null;
    state.probe = 2;
    state.samples = [];

    if (title) {
      title.textContent = exercise.title;

    }
    if (kind) {
      kind.textContent = exercise.kind === 'build' ? 'Build it' : exercise.kind === 'design' ? 'Explain it' : 'Work it out';

    }
    if (brief) brief.textContent = exercise.brief;
    if (answerHint) {
      answerHint.textContent = exercise.kind === 'build'
        ? 'This exercise is checked against the circuit you build, so fill in the Answer panel only if you also need to explain something.'
        : exercise.kind === 'design'
          ? 'Explain it in your own words. The check looks for the ideas the exercise asks about.'
          : 'Type your number in the Answer panel. A short answer is fine.';
    }
    if (answerBox) answerBox.value = '';
    if (status) status.textContent = '';
    const feedback = root.querySelector?.('[data-circuits-feedback]');
    if (feedback) feedback.hidden = true;

    renderLearn(exercise);
    renderProbe();
    renderParts();
    drawBoard();
    drawScope();
    renderMetrics();
    updateCounter();
    updateRail();
    showTab(exercise.kind === 'build' ? 'board' : 'board');
    return true;
  }

  /**
   * Find an exercise by its id.
   */
  function find(id) {
    return state.exercises.find(exercise => exercise.id === id)?.id || null;
  }

  /**
   * Load the course and open the first exercise.
   */
  async function importCourse() {
    const course = await loadCircuitsCourse();
    state.exercises = course.exercises;
    if (credit) {
      credit.textContent = course.source ? `Exercises: ${course.source}` : '';
    }
    if (empty) empty.hidden = state.exercises.length > 0;
    renderRail();
    const saved = readCircuitsProgress();
    state.solved = new Set(saved.solved);
    state.xp = saved.xp;
    updateXp(state.xp);
    const first = state.exercises[0];
    if (first) loadExercise(first.id);
    updateCounter();
    return state.exercises;
  }

  /* -- the events --------------------------------------------------- */

  partsBox?.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-circuits-part]');
    if (!button) return;
    const id = button.dataset.circuitsPart;
    const spec = CIRCUIT_PARTS[id];
    if (!spec) return;
    // A new part is placed on the first free pair of nodes.
    const used = new Set();
    for (const part of circuitParts(state.circuit)) {
      used.add(part.nodeA);
      used.add(part.nodeB);
    }
    const free = BOARD_NODES.map(node => node.id).filter(nodeId => !used.has(nodeId));
    const nodeA = free[0] ?? 1;
    const nodeB = free[1] ?? 2;
    const part = {
      id,
      label: nextLabel(circuitParts(state.circuit), id),
      value: spec.defaults.value,
      nodeA,
      nodeB,
      pins: spec.pins
    };
    state.circuit.parts.push(part);
    state.selected = part.label;
    showEdit(part);
    renderProbe();
    drawBoard();
    if (status) status.textContent = `${part.label} placed between node ${nodeA} and node ${nodeB}.`;
  });

  // Clicking a part on the board selects it, so its value can be changed.
  canvas?.addEventListener('click', event => {
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) * (canvas.width / box.width);
    const y = (event.clientY - box.top) * (canvas.height / box.height);
    for (const part of circuitParts(state.circuit)) {
      const from = nodePosition(part.nodeA);
      const to = nodePosition(part.nodeB);
      const cx = (from.x + to.x) / 2;
      const cy = (from.y + to.y) / 2;
      const shape = PART_SHAPES[part.id] || PART_SHAPES.resistor;
      const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
      const w = horizontal ? shape.w : shape.h;
      const h = horizontal ? shape.h : shape.w;
      if (Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2) {
        state.selected = part.label;
        showEdit(part);
        drawBoard();
        return;
      }
    }
    state.selected = null;
    if (editBox) editBox.hidden = true;
    drawBoard();
  });

  function showEdit(part) {
    if (!editBox || !selectedText) return;
    editBox.hidden = false;
    if(picker) picker.value=part.label;
    if(nodeABox) nodeABox.value=String(part.nodeA);
    if(nodeBBox) nodeBBox.value=String(part.nodeB);
    const spec = CIRCUIT_PARTS[part.id];
    selectedText.textContent = `${part.label} — ${spec ? spec.name : part.id}`;
    if (valueInput) valueInput.value = String(part.value ?? '');
  }

  picker?.addEventListener('change', () => {
    const part=circuitParts(state.circuit).find(item=>item.label===picker.value);
    state.selected=part?.label || null;
    if(part) showEdit(part);
    else editBox.hidden=true;
    drawBoard();
  });

  applyButton?.addEventListener('click', () => {
    const part = circuitParts(state.circuit).find(item => item.label === state.selected);
    if (!part) return;
    const value = Number(valueInput?.value);
    if(!valueInput?.value || !Number.isFinite(value) || value<0 || nodeABox?.value===nodeBBox?.value) {
      if(status) status.textContent='Choose two different nodes and enter a nonnegative value.';
      return;
    }
    if (nodeABox && nodeBBox) {
      part.nodeA=Number(nodeABox.value);
      part.nodeB=Number(nodeBBox.value);
      part.value = value;
      if (status) status.textContent = `${part.label} connects nodes ${part.nodeA} and ${part.nodeB} at ${formatValue(part.id,value)}.`;
      renderProbe();
    }
    drawBoard();
  });

  removeButton?.addEventListener('click', () => {
    if (!state.selected) return;
    state.circuit.parts = circuitParts(state.circuit).filter(part => part.label !== state.selected);
    state.selected = null;
    if (editBox) editBox.hidden = true;
    renderProbe();
    drawBoard();
  });

  probeBox?.addEventListener('change', () => {
    state.probe = Number(probeBox.value) || 0;
    drawBoard();
    if (state.samples.length) run();
  });

  runButton?.addEventListener('click', run);
  checkButton?.addEventListener('click', check);
  resetButton?.addEventListener('click', () => {
    if (!state.exercise) return;
    state.circuit = startingCircuit(state.exercise);
    state.selected = null;
    state.samples = [];
    if (answerBox) answerBox.value = '';
    if (editBox) editBox.hidden = true;
    renderProbe();
    drawBoard();
    drawScope();
    renderMetrics();
    if (status) status.textContent = 'The bench is back to the starting circuit.';
  });

  const goTo = id => {
    if (!id) return;
    if (loadExercise(id)) {
      history.replaceState(null, '', '?exercise=' + encodeURIComponent(id));
    }
  };

  prevButton?.addEventListener('click', () => goTo(neighbour(state.exercises, state.exercise?.id, 'prev')?.id));
  nextButton?.addEventListener('click', () => goTo(neighbour(state.exercises, state.exercise?.id, 'next')?.id));
  doneButton?.addEventListener('click', () => goTo(neighbour(state.exercises, state.exercise?.id, 'next')?.id));

  rail?.addEventListener('click', event => {
    const star = event.target?.closest?.('[data-circuits-star]');
    if (star) {
      event.preventDefault();
      toggleStar(star.dataset.circuitsStar);
      return;
    }
    const link = event.target?.closest?.('[data-circuits-rail-item]');
    if (!link) return;
    const id = link.dataset.circuitsRailItem;
    if (find(id) && id !== state.exercise?.id) {
      event.preventDefault();
      goTo(id);
      root.querySelector?.('.lab-brief')?.scrollIntoView({ block: 'start' });
    }
  });

  preferredOnly?.addEventListener('click', () => {
    const on = preferredOnly.getAttribute('aria-pressed') === 'true';
    preferredOnly.setAttribute('aria-pressed', on ? 'false' : 'true');
    renderRail();
    updateRail();
  });

  /* -- the further tools -------------------------------------------- */

  if (toolList) {
    for (const tool of CIRCUITS_TOOLS) {
      const item = document.createElement('li');
      item.className = 'circuits-tool';
      const name = document.createElement('p');
      name.className = 'circuits-tool-name';
      name.textContent = tool.name;
      const focus = document.createElement('p');
      focus.className = 'circuits-tool-focus';
      focus.textContent = tool.focus;
      const tech = document.createElement('p');
      tech.className = 'circuits-tool-tech';
      tech.textContent = `${tool.tech} · ${tool.license}`;
      const link = document.createElement('a');
      link.className = 'circuits-tool-link';
      link.href = tool.url;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      link.textContent = 'Open the project →';
      item.append(name, focus, tech, link);
      toolList.append(item);
    }
  }

  return { importCourse, loadExercise, find, state };
}
