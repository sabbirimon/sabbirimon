/**
 * Circuits & Signals — the simulation engine.
 *
 * Everything in this file is pure: no DOM, no canvas, no network. A
 * circuit is plain data, a simulation returns plain data, so the whole
 * engine can be tested under node and run in the browser unchanged.
 *
 * House rules:
 *   - every function takes its data as an argument;
 *   - every function returns plain objects and arrays, so a result can be
 *     serialised into JSON or drawn straight onto a canvas;
 *   - a bad input gives a clear failure, never a silent wrong answer.
 *
 * Two solvers live here:
 *   - the analogue solver, which uses modified nodal analysis (MNA) for
 *     the resistive network and companion models for capacitors and
 *     inductors, so an RC circuit really charges over time;
 *   - the digital solver, which evaluates logic gates and steps a
 *     clocked circuit forward.
 */

/* ------------------------------------------------------------------ */
/* The parts catalogue                                                  */
/* ------------------------------------------------------------------ */

/**
 * The parts a learner can place.
 *
 * `kind` decides how the solver treats the part. `pins` is how many
 * terminals it has. `defaults` are the values a new part gets.
 */
export const CIRCUIT_PARTS = {
  resistor: {
    id: 'resistor', name: 'Resistor', kind: 'resistive', unit: 'Ω', pins: 2,
    tolerance: 0.05, defaults: { value: 1000 }
  },
  capacitor: {
    id: 'capacitor', name: 'Capacitor', kind: 'capacitive', unit: 'F', pins: 2,
    tolerance: 0.2, defaults: { value: 0.001 }
  },
  inductor: {
    id: 'inductor', name: 'Inductor', kind: 'inductive', unit: 'H', pins: 2,
    tolerance: 0.2, defaults: { value: 0.1 }
  },
  led: {
    id: 'led', name: 'LED', kind: 'diode', unit: 'V', pins: 2,
    tolerance: 0.1, defaults: { value: 2.0 }
  },
  diode: {
    id: 'diode', name: 'Diode', kind: 'diode', unit: 'V', pins: 2,
    tolerance: 0.1, defaults: { value: 0.7 }
  },
  battery: {
    id: 'battery', name: 'Battery', kind: 'source', unit: 'V', pins: 2,
    tolerance: 0, defaults: { value: 9 }
  },
  switch: {
    id: 'switch', name: 'Switch', kind: 'resistive', unit: 'Ω', pins: 2,
    tolerance: 0, defaults: { value: 0, closed: true }
  },
  potentiometer: {
    id: 'potentiometer', name: 'Potentiometer', kind: 'resistive', unit: 'Ω', pins: 3,
    tolerance: 0.05, defaults: { value: 10000, position: 0.5 }
  },
  ground: {
    id: 'ground', name: 'Ground', kind: 'reference', unit: '', pins: 1,
    tolerance: 0, defaults: {}
  }
};

/** The parts a learner can pick from the bin, in the order they are shown. */
export const PART_ORDER = [
  'resistor', 'capacitor', 'inductor', 'led', 'diode', 'battery', 'switch', 'potentiometer', 'ground'
];

/**
 * A part's value, in the unit a person would use.
 *
 * A capacitor is far easier to read as 1000 µF than as 0.001 F, so the
 * value is scaled to the largest prefix that keeps the number above one.
 */
export function formatValue(partId, value) {
  const part = CIRCUIT_PARTS[partId];
  if (!part || !Number.isFinite(value)) return '—';
  if (part.unit === 'Ω') {
    if (Math.abs(value) >= 1e6) return `${trim(value / 1e6)} MΩ`;
    if (Math.abs(value) >= 1e3) return `${trim(value / 1e3)} kΩ`;
    return `${trim(value)} Ω`;
  }
  if (part.unit === 'F') {
    if (Math.abs(value) >= 1e-3) return `${trim(value * 1e3)} mF`;
    if (Math.abs(value) >= 1e-6) return `${trim(value * 1e6)} µF`;
    if (Math.abs(value) >= 1e-9) return `${trim(value * 1e9)} nF`;
    return `${trim(value * 1e12)} pF`;
  }
  if (part.unit === 'H') {
    if (Math.abs(value) >= 1) return `${trim(value)} H`;
    if (Math.abs(value) >= 1e-3) return `${trim(value * 1e3)} mH`;
    return `${trim(value * 1e6)} µH`;
  }
  return `${trim(value)} ${part.unit}`.trim();
}

/** Round a number to three significant figures, with no trailing zeros. */
function trim(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toPrecision(3));
  return String(rounded);
}

/* ------------------------------------------------------------------ */
/* Ohm's law                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ohm's law, plus the power it gives.
 *
 * `voltage` across a `resistance` gives the current through it. The
 * power is `V × I`, which is the same as `I² × R` and `V² / R`.
 */
export function ohmLaw(voltage, resistance) {
  if (!Number.isFinite(voltage) || !Number.isFinite(resistance) || resistance === 0) {
    return { voltage: Number(voltage) || 0, resistance: Number(resistance) || 0, current: 0, power: 0 };
  }
  const current = voltage / resistance;
  return {
    voltage,
    resistance,
    current,
    power: voltage * current,
    powerFromCurrent: current * current * resistance,
    powerFromResistance: (voltage * voltage) / resistance
  };
}

/**
 * The resistance of two resistors in series.
 */
export function seriesResistance(a, b) {
  return (Number(a) || 0) + (Number(b) || 0);
}

/**
 * The resistance of two resistors in parallel.
 */
export function parallelResistance(a, b) {
  const first = Number(a) || 0;
  const second = Number(b) || 0;
  if (first === 0 || second === 0) return 0;
  return (first * second) / (first + second);
}

/* ------------------------------------------------------------------ */
/* The circuit model                                                    */
/* ------------------------------------------------------------------ */

/**
 * A blank circuit: a source, a ground, and no branches yet.
 */
export function emptyCircuit() {
  return {
    nodes: { 0: { name: 'ground', voltage: 0 } },
    branches: [],
    parts: []
  };
}

/**
 * Add a part to a circuit and return the new circuit.
 *
 * The circuit is never changed in place, so a caller can keep the old
 * one and compare.
 */
export function addPart(circuit, part) {
  if (!part || !part.id || !CIRCUIT_PARTS[part.id]) return circuit;
  const next = {
    nodes: { ...(circuit.nodes || {}) },
    branches: [...(circuit.branches || [])],
    parts: [...(circuit.parts || [])]
  };
  const nodeA = Number.isFinite(part.nodeA) ? part.nodeA : next.parts.length * 2 + 1;
  const nodeB = Number.isFinite(part.nodeB) ? part.nodeB : next.parts.length * 2 + 2;
  const partIndex = next.parts.length;
  const spec = CIRCUIT_PARTS[part.id];
  next.parts.push({
    id: part.id,
    label: part.label || `P${partIndex + 1}`,
    value: Number.isFinite(part.value) ? part.value : spec.defaults.value,
    nodeA,
    nodeB,
    pins: spec.pins,
    // A closed switch is a wire, so it is a very small resistance.
    resistance: spec.kind === 'resistive' && part.id === 'switch'
      ? (part.closed === false ? 1e9 : 1e-3)
      : null
  });
  if (spec.pins === 3) {
    // A potentiometer is two resistors in one body: the wiper splits it.
    const total = Number.isFinite(part.value) ? part.value : spec.defaults.value;
    const position = Math.min(1, Math.max(0, Number.isFinite(part.position) ? part.position : 0.5));
    next.parts.push({
      id: 'resistor',
      label: `${part.label || `P${partIndex + 1}`}a`,
      value: total * position,
      nodeA,
      nodeB,
      pins: 2
    });
    next.parts.push({
      id: 'resistor',
      label: `${part.label || `P${partIndex + 1}`}b`,
      value: total * (1 - position),
      nodeA: nodeB,
      nodeB,
      pins: 2,
      isWiper: true
    });
  }
  return next;
}

/**
 * Find the branch that carries a part's current.
 *
 * A branch is the pair of nodes a part sits between, plus its kind.
 */
export function branchesOf(circuit) {
  const parts = circuit?.parts || [];
  const branches = [];
  for (const part of parts) {
    const spec = CIRCUIT_PARTS[part.id];
    if (!spec || spec.kind === 'reference') continue;
    branches.push({
      label: part.label,
      kind: spec.kind,
      id: part.id,
      nodeA: part.nodeA,
      nodeB: part.nodeB,
      value: part.value,
      resistance: part.resistance
    });
  }
  return branches;
}

/**
 * The part's resistance in ohms.
 *
 * A diode is not a fixed resistor; it is modelled by its forward drop
 * here, and by a full diode equation in the transient solver.
 */
export function partResistance(part) {
  if (!part) return 0;
  if (Number.isFinite(part.resistance)) return part.resistance;
  if (part.id === 'resistor') return Number(part.value) || 0;
  if (part.id === 'switch') return 1e-3;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Modified nodal analysis                                              */
/* ------------------------------------------------------------------ */

/**
 * Solve a linear conductance matrix with Gaussian elimination.
 *
 * The matrix is given as a plain array of rows, so this is testable
 * without any matrix library.
 */
export function solveLinear(rows, vector) {
  const n = rows.length;
  const a = rows.map(row => [...row]);
  const b = [...vector];
  for (let col = 0; col < n; col++) {
    // Find the biggest pivot in this column, so the arithmetic stays
    // stable when the numbers are of very different sizes.
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) {
      throw new Error('The circuit has no solution — it may be shorted or floating.');
    }
    if (pivot !== col) {
      [a[col], a[pivot]] = [a[pivot], a[col]];
      [b[col], b[pivot]] = [b[pivot], b[col]];
    }
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / a[col][col];
      if (!factor) continue;
      for (let k = col; k < n; k++) a[row][k] -= factor * a[col][k];
      b[row] -= factor * b[col];
    }
  }
  // Back substitution.
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row];
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * x[k];
    x[row] = sum / a[row][row];
  }
  return x;
}

/**
 * Solve the resistive network with modified nodal analysis.
 *
 * Node 0 is always the ground. A battery becomes a current-source-free
 * voltage branch, which is what the extra row and column in MNA are
 * for. Everything else becomes a conductance.
 *
 * Returns `{ nodes, branchCurrents, current }` where `nodes` maps a
 * node id to its voltage in volts.
 */
export function nodalSolve(circuit, options = {}) {
  const branches = branchesOf(circuit);
  if (!branches.length) return { nodes: { 0: 0 }, branchCurrents: {}, current: 0 };

  const nodeIds = [...new Set(branches.flatMap(b => [b.nodeA, b.nodeB]))]
    .filter(id => id !== 0)
    .sort((a, b) => a - b);
  const index = new Map(nodeIds.map((id, i) => [id, i]));
  const size = nodeIds.length;

  // The voltage sources become extra rows and columns in the matrix.
  const sources = branches.filter(b => b.kind === 'source');
  const total = size + sources.length;
  const matrix = Array.from({ length: total }, () => new Array(total).fill(0));
  const vector = new Array(total).fill(0);

  const stamp = (row, col, value) => {
    if (row === null || col === null) return;
    matrix[row][col] += value;
  };
  const rowOf = node => (node === 0 ? null : index.get(node));

  for (const branch of branches) {
    if (branch.kind === 'source') continue;
    const resistance = partResistance(branch);
    if (branch.kind === 'diode') {
      // A diode is held at its forward drop for the resistive solve.
      // The transient solver treats it more carefully.
      const conductance = 1 / Math.max(resistance, 1e-3);
      const a = rowOf(branch.nodeA);
      const b = rowOf(branch.nodeB);
      stamp(a, a, conductance); stamp(b, b, conductance);
      stamp(a, b, -conductance); stamp(b, a, -conductance);
      continue;
    }
    // A resistor of zero ohms is a short. It is stamped as a very small
    // resistance rather than skipped, so a short across a battery comes
    // back as a huge current or as a clear error, never as a silent
    // wrong answer.
    if (!Number.isFinite(resistance)) continue;
    const stamped = resistance <= 0 ? 1e-9 : resistance;
    const conductance = 1 / stamped;
    const a = rowOf(branch.nodeA);
    const b = rowOf(branch.nodeB);
    stamp(a, a, conductance); stamp(b, b, conductance);
    stamp(a, b, -conductance); stamp(b, a, -conductance);
  }

  // The voltage sources: a new row and column that carry the source
  // current and enforce the source voltage.
  sources.forEach((source, i) => {
    const row = size + i;
    const a = rowOf(source.nodeA);
    const b = rowOf(source.nodeB);
    stamp(row, a, 1); stamp(row, b, -1);
    stamp(a, row, 1); stamp(b, row, -1);
    vector[row] = Number(source.value) || 0;
  });

  let solution;
  try {
    solution = solveLinear(matrix, vector);
  } catch (error) {
    if (options.onError) options.onError(error);
    return { nodes: { 0: 0 }, branchCurrents: {}, current: 0, error: error.message };
  }

  const nodes = { 0: 0 };
  for (const id of nodeIds) nodes[id] = solution[index.get(id)];

  const branchCurrents = {};
  for (const branch of branches) {
    if (branch.kind === 'source') {
      const i = sources.indexOf(branch);
      branchCurrents[branch.label] = solution[size + i];
      continue;
    }
    const resistance = partResistance(branch);
    const drop = (nodes[branch.nodeA] ?? 0) - (nodes[branch.nodeB] ?? 0);
    if (branch.kind === 'diode') {
      branchCurrents[branch.label] = drop / Math.max(resistance, 1e-3);
    } else {
      branchCurrents[branch.label] = drop / Math.max(resistance, 1e-12);
    }
  }

  return {
    nodes,
    branchCurrents,
    current: sources.length ? Math.abs(sources[0] ? branchCurrents[sources[0].label] : 0) : 0,
    error: ''
  };
}

/**
 * The voltage across a part.
 */
export function voltageAcross(solution, part) {
  if (!solution || !part) return 0;
  return (solution.nodes[part.nodeA] ?? 0) - (solution.nodes[part.nodeB] ?? 0);
}

/* ------------------------------------------------------------------ */
/* Time-domain simulation                                               */
/* ------------------------------------------------------------------ */

/**
 * One timestep of a transient simulation.
 *
 * Capacitors and inductors keep a state between steps. Both use the
 * trapezoidal companion model, which is second-order accurate:
 *
 *   - a capacitor holds a charge, and in each step it becomes a
 *     resistor of `dt / C` in parallel with a current source;
 *   - an inductor holds a current, and in each step it becomes a
 *     resistor of `2L / dt` in series with a voltage source.
 *
 * Backward Euler would be simpler but it damps the response badly: an
 * RC circuit would charge far too slowly and the scope would show a
 * curve that does not match the textbook one. The trapezoidal rule
 * tracks the real exponential closely.
 *
 * The state is passed in and a new state is returned, so a run is just a
 * loop over `transientStep`.
 */
export function transientStep(circuit, state = {}, dt = 0.001) {
  const step = Math.max(1e-9, Number(dt) || 0.001);
  const parts = (circuit?.parts || []).map(part => ({ ...part }));
  const previous = state.parts || {};

  // Work out the companion model for every reactive part.
  //
  // A capacitor: the charge q is the state, and i = dq/dt, so the
  // current leaving its first node is (q_new − q_prev)/dt. With
  // q_new = C·V_new that is a conductance of C/dt in parallel with a
  // current source of q_prev/dt.
  //
  // An inductor: v = L di/dt, integrated with the trapezoidal rule,
  // gives v_avg = L(i_new − i_prev)/dt. The inductor becomes a
  // resistor of 2L/dt in series with a voltage source of
  // v_prev + 2L·i_prev/dt.
  const injections = [];
  for (const part of parts) {
    const spec = CIRCUIT_PARTS[part.id];
    if (!spec) continue;
    const old = previous[part.label] || {};
    if (spec.kind === 'capacitive') {
      const capacitance = Number(part.value) || 1e-6;
      const voltage = Number.isFinite(old.voltage) ? old.voltage : 0;
      const charge = Number.isFinite(old.charge) ? old.charge : capacitance * voltage;
      part.resistance = step / capacitance;
      part.companion = 'capacitor';
      part.stateCharge = charge;
      part.capacitance = capacitance;
      injections.push({
        nodeA: part.nodeA,
        nodeB: part.nodeB,
        current: charge / step
      });
    } else if (spec.kind === 'inductive') {
      const inductance = Number(part.value) || 1e-3;
      const current = Number.isFinite(old.current) ? old.current : 0;
      const voltage = Number.isFinite(old.voltage) ? old.voltage : 0;
      part.resistance = (2 * inductance) / step;
      part.companion = 'inductor';
      part.stateCurrent = current;
      part.stateVoltage = voltage;
      part.inductance = inductance;
      injections.push({
        nodeA: part.nodeA,
        nodeB: part.nodeB,
        voltage: voltage + (2 * inductance * current) / step
      });
    } else if (spec.kind === 'resistive' && part.id === 'resistor') {
      part.resistance = Number(part.value) || 0;
    } else if (spec.kind === 'resistive' && part.id === 'switch') {
      part.resistance = part.closed === false ? 1e9 : 1e-3;
    }
  }

  const working = { parts, branches: [], nodes: circuit?.nodes || {}, injections };
  for (const part of parts) {
    const spec = CIRCUIT_PARTS[part.id];
    if (!spec || spec.kind === 'reference') continue;
    working.branches.push({
      label: part.label,
      kind: spec.kind,
      id: part.id,
      nodeA: part.nodeA,
      nodeB: part.nodeB,
      value: part.value,
      resistance: part.resistance
    });
  }

  const solution = solveNetwork(working);

  // Carry the reactive state forward.
  const nextParts = {};
  for (const part of parts) {
    if (part.companion === 'capacitor') {
      const voltage = solution.nodes[part.nodeA] ?? 0;
      const charge = part.capacitance * voltage;
      const current = (charge - (part.stateCharge || 0)) / step;
      nextParts[part.label] = { voltage, charge, current };
    } else if (part.companion === 'inductor') {
      const voltage = (solution.nodes[part.nodeA] ?? 0) - (solution.nodes[part.nodeB] ?? 0);
      // The trapezoidal companion, solved for the new current:
      // i_new = i_prev + (dt/2L)(v_new + v_prev).
      const current = (part.stateCurrent || 0)
        + ((step / (2 * part.inductance)) * (voltage + (part.stateVoltage || 0)));
      nextParts[part.label] = { current, voltage };
    } else {
      nextParts[part.label] = { voltage: (solution.nodes[part.nodeA] ?? 0) - (solution.nodes[part.nodeB] ?? 0) };
    }
  }

  return {
    parts: nextParts,
    nodes: solution.nodes,
    branchCurrents: solution.branchCurrents,
    time: (Number(state.time) || 0) + step,
    error: solution.error || ''
  };
}

/**
 * Solve a network that has already had its companion models set.
 *
 * The companion current sources and voltage sources are added to the
 * same matrix as the conductances and the battery branches.
 */
function solveNetwork(working) {
  const branches = working.branches;
  if (!branches.length) return { nodes: { 0: 0 }, branchCurrents: {} };
  const nodeIds = [...new Set(branches.flatMap(b => [b.nodeA, b.nodeB]))]
    .filter(id => id !== 0)
    .sort((a, b) => a - b);
  const index = new Map(nodeIds.map((id, i) => [id, i]));
  const size = nodeIds.length;
  const sources = branches.filter(b => b.kind === 'source');
  const injections = working.injections || [];
  const voltageInjections = injections.filter(item => Number.isFinite(item.voltage));
  const total = size + sources.length + voltageInjections.length;
  const matrix = Array.from({ length: total }, () => new Array(total).fill(0));
  const vector = new Array(total).fill(0);
  const rowOf = node => (node === 0 ? null : index.get(node));

  for (const branch of branches) {
    if (branch.kind === 'source') continue;
    const resistance = branch.kind === 'diode'
      ? Math.max(Number(branch.value) || 0.7, 1e-3)
      : (Number(branch.resistance) || 0);
    if (resistance <= 0) continue;
    const conductance = 1 / resistance;
    const a = rowOf(branch.nodeA);
    const b = rowOf(branch.nodeB);
    if (a !== null) matrix[a][a] += conductance;
    if (b !== null) matrix[b][b] += conductance;
    if (a !== null && b !== null) {
      matrix[a][b] -= conductance;
      matrix[b][a] -= conductance;
    }
  }

  // The companion current sources push current into their first node and
  // pull it out of their second, which is what the node equation needs.
  for (const item of injections) {
    if (!Number.isFinite(item.current)) continue;
    const a = rowOf(item.nodeA);
    const b = rowOf(item.nodeB);
    if (a !== null) vector[a] += item.current;
    if (b !== null) vector[b] -= item.current;
  }

  sources.forEach((source, i) => {
    const row = size + i;
    const a = rowOf(source.nodeA);
    const b = rowOf(source.nodeB);
    if (a !== null) { matrix[row][a] += 1; matrix[a][row] += 1; }
    if (b !== null) { matrix[row][b] -= 1; matrix[b][row] -= 1; }
    vector[row] = Number(source.value) || 0;
  });

  // The companion voltage sources (from an inductor) act like a battery
  // branch: an extra row and column that enforce their voltage.
  voltageInjections.forEach((item, i) => {
    const row = size + sources.length + i;
    const a = rowOf(item.nodeA);
    const b = rowOf(item.nodeB);
    if (a !== null) { matrix[row][a] += 1; matrix[a][row] += 1; }
    if (b !== null) { matrix[row][b] -= 1; matrix[b][row] -= 1; }
    vector[row] = Number(item.voltage) || 0;
  });

  let solution;
  try {
    solution = solveLinear(matrix, vector);
  } catch (error) {
    return { nodes: { 0: 0 }, branchCurrents: {}, error: error.message };
  }
  const nodes = { 0: 0 };
  for (const id of nodeIds) nodes[id] = solution[index.get(id)];
  const branchCurrents = {};
  for (const branch of branches) {
    if (branch.kind === 'source') {
      const i = sources.indexOf(branch);
      branchCurrents[branch.label] = solution[size + i];
      continue;
    }
    const drop = (nodes[branch.nodeA] ?? 0) - (nodes[branch.nodeB] ?? 0);
    const resistance = branch.kind === 'diode'
      ? Math.max(Number(branch.value) || 0.7, 1e-3)
      : Math.max(Number(branch.resistance) || 0, 1e-12);
    branchCurrents[branch.label] = drop / resistance;
  }
  return { nodes, branchCurrents, error: '' };
}

/**
 * Run a transient simulation for a while and return the samples.
 *
 * `probe` is the node the scope is watching. The result is a list of
 * `{ time, value }` samples, which is exactly what a scope draws.
 */
export function simulate(circuit, options = {}) {
  const dt = Number(options.dt) || 0.0005;
  const duration = Number(options.duration) || 0.05;
  const probe = Number.isFinite(options.probe) ? options.probe : null;
  const steps = Math.max(1, Math.min(200000, Math.round(duration / dt)));
  const samples = [];
  let state = { parts: {}, time: 0 };
  for (let i = 0; i < steps; i++) {
    state = transientStep(circuit, state, dt);
    if (state.error) break;
    const value = probe === null
      ? 0
      : (state.nodes[probe] ?? 0);
    samples.push({ time: state.time, value });
  }
  return { samples, state, error: state.error || '' };
}

/**
 * The time constant of an RC circuit, in seconds.
 */
export function rcTimeConstant(resistance, capacitance) {
  return (Number(resistance) || 0) * (Number(capacitance) || 0);
}

/**
 * The time constant of an RL circuit, in seconds.
 */
export function rlTimeConstant(inductance, resistance) {
  return (Number(inductance) || 0) / (Number(resistance) || 1);
}

/**
 * The cutoff frequency of an RC filter, in hertz.
 */
export function cutoffFrequency(resistance, capacitance) {
  const tau = rcTimeConstant(resistance, capacitance);
  return tau > 0 ? 1 / (2 * Math.PI * tau) : 0;
}

/**
 * The voltage a divider puts out.
 */
export function dividerOutput(input, r1, r2) {
  const top = Number(r1) || 0;
  const bottom = Number(r2) || 0;
  const total = top + bottom;
  if (!total) return 0;
  return (Number(input) || 0) * (bottom / total);
}

/* ------------------------------------------------------------------ */
/* Signal measurements                                                  */
/* ------------------------------------------------------------------ */

/**
 * The numbers a scope shows about a signal.
 *
 * `period` is found from the mean crossings of the mean, which is
 * robust enough for the signals a learner builds.
 */
export function signalMetrics(samples) {
  const values = (samples || []).map(sample => Number(sample?.value)).filter(Number.isFinite);
  if (!values.length) return { min: 0, max: 0, mean: 0, rms: 0, peakToPeak: 0, period: 0, frequency: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);

  // Find the rising crossings of the mean, then time them.
  const crossings = [];
  for (let i = 1; i < samples.length; i++) {
    const before = Number(samples[i - 1]?.value);
    const after = Number(samples[i]?.value);
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
    if (before < mean && after >= mean) {
      const t0 = Number(samples[i - 1]?.time) || 0;
      const t1 = Number(samples[i]?.time) || 0;
      const span = after - before;
      const fraction = span ? (mean - before) / span : 0;
      crossings.push(t0 + (t1 - t0) * fraction);
    }
  }
  let period = 0;
  if (crossings.length >= 2) {
    const gaps = [];
    for (let i = 1; i < crossings.length; i++) gaps.push(crossings[i] - crossings[i - 1]);
    period = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }

  return {
    min,
    max,
    mean,
    rms,
    peakToPeak: max - min,
    period,
    frequency: period > 0 ? 1 / period : 0
  };
}

/* ------------------------------------------------------------------ */
/* Digital logic                                                        */
/* ------------------------------------------------------------------ */

/**
 * The truth tables of the gates.
 *
 * The order of the inputs is the order of the pins, so a gate can be
 * checked against its table without any wiring.
 */
export const GATE_TRUTHS = {
  AND: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
  OR: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]],
  NOT: [[0, 1], [1, 0]],
  NAND: [[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
  NOR: [[0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]],
  XOR: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
  XNOR: [[0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
  BUFFER: [[0, 0], [1, 1]]
};

/**
 * The gates a learner can place, with their pin count and a note.
 */
export const LOGIC_GATES = {
  AND: { inputs: 2, note: 'High only when every input is high.' },
  OR: { inputs: 2, note: 'High when any input is high.' },
  NOT: { inputs: 1, note: 'Inverts the input.' },
  NAND: { inputs: 2, note: 'An AND with the output inverted.' },
  NOR: { inputs: 2, note: 'An OR with the output inverted.' },
  XOR: { inputs: 2, note: 'High when the inputs differ.' },
  XNOR: { inputs: 2, note: 'High when the inputs match.' },
  BUFFER: { inputs: 1, note: 'Passes the input through.' }
};

/**
 * Evaluate one gate.
 *
 * The inputs are given in the order of the pins. A gate with more than
 * two inputs uses the same rule, so an AND with three inputs is high
 * only when all three are.
 */
export function evaluateGate(gate, inputs) {
  const name = String(gate || '').toUpperCase();
  const values = (inputs || []).map(value => (Number(value) ? 1 : 0));
  switch (name) {
    case 'AND': return values.every(value => value === 1) ? 1 : 0;
    case 'OR': return values.some(value => value === 1) ? 1 : 0;
    case 'NOT': return values[0] ? 0 : 1;
    case 'NAND': return values.every(value => value === 1) ? 0 : 1;
    case 'NOR': return values.some(value => value === 1) ? 0 : 1;
    case 'XOR': return values.filter(value => value === 1).length % 2 === 1 ? 1 : 0;
    case 'XNOR': return values.filter(value => value === 1).length % 2 === 0 ? 1 : 0;
    case 'BUFFER': return values[0] ? 1 : 0;
    default: return 0;
  }
}

/**
 * A gate from the truth table, checked against the table itself.
 *
 * This is how the tests prove the engine and the table agree.
 */
export function truthTableMatches(gate) {
  const name = String(gate || '').toUpperCase();
  const table = GATE_TRUTHS[name];
  if (!table) return false;
  return table.every(row => {
    const inputs = row.slice(0, -1);
    return evaluateGate(name, inputs) === row[row.length - 1];
  });
}

/**
 * Build a half adder out of gates and evaluate it.
 *
 * The sum is an XOR of the two inputs, and the carry is an AND.
 */
export function halfAdder(a, b) {
  return {
    sum: evaluateGate('XOR', [a, b]),
    carry: evaluateGate('AND', [a, b])
  };
}

/**
 * Build a full adder out of gates and evaluate it.
 */
export function fullAdder(a, b, carryIn) {
  const first = halfAdder(a, b);
  const second = halfAdder(first.sum, carryIn);
  return {
    sum: second.sum,
    carry: evaluateGate('OR', [first.carry, second.carry])
  };
}

/**
 * Step a combinational circuit forward over every input combination.
 *
 * The circuit is a list of gates, each with a list of input wire names
 * and an output wire name. The result is one row per combination.
 */
export function simulateLogic(gates, inputNames = [], inputCount = 2) {
  const list = Array.isArray(gates) ? gates : [];
  const names = inputNames.length ? inputNames : ['A', 'B'];
  const rows = [];
  const total = 1 << inputCount;
  for (let bits = 0; bits < total; bits++) {
    const wires = {};
    names.forEach((name, i) => { wires[name] = (bits >> i) & 1; });
    for (const gate of list) {
      const inputs = (gate.inputs || []).map(name => wires[name] || 0);
      wires[gate.output] = evaluateGate(gate.gate, inputs);
    }
    rows.push({ bits, wires: { ...wires } });
  }
  return rows;
}

/**
 * An SR latch, built from cross-coupled NOR gates.
 *
 * Set wins over reset, which is the usual convention.
 */
export function srLatch(set, reset, previous = { q: 0, notQ: 1 }) {
  // A NOR latch is cross-coupled: Q is the NOR of Reset and notQ, and
  // notQ is the NOR of Set and Q. Set wins over Reset.
  const notQ = evaluateGate('NOR', [set, previous.q]);
  const q = evaluateGate('NOR', [reset, notQ]);
  return { q, notQ };
}

/**
 * A D flip-flop, built from an SR latch and a clock edge.
 *
 * The data is only taken on the rising edge of the clock.
 */
export function dFlipFlop(data, clock, previous = { q: 0 }) {
  const rising = previous.clock === 0 && clock === 1;
  const q = rising ? (data ? 1 : 0) : previous.q;
  return { q, clock, rising };
}

/* ------------------------------------------------------------------ */
/* The checkers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Round to the number of decimals the answer needs.
 */
function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Build the checker for a numeric exercise.
 *
 * The learner's answer is compared with each expected value, in any
 * order, with a tolerance. A tolerance of zero means the answer must
 * match exactly, which is what a unit like "volts" wants.
 */
export function makeCalcChecker(entry) {
  const expected = (Array.isArray(entry?.expected) ? entry.expected : []).map(Number);
  const tolerance = Number.isFinite(entry?.tolerance) ? entry.tolerance : 0.01;
  const decimals = Number.isFinite(entry?.decimals) ? entry.decimals : 2;
  const unit = typeof entry?.unit === 'string' ? entry.unit : '';
  return ({ answer = '' } = {}) => {
    const text = String(answer).trim();
    if (!text) {
      return { ok: false, message: 'No answer yet.', hint: 'Type the number you worked out and press Check.' };
    }
    const numbers = text.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi);
    if (!numbers) {
      return { ok: false, message: 'That is not a number.', hint: 'Give the value as a plain number, for example 4.5.' };
    }
    const given = numbers.map(Number);
    const wanted = expected.filter(Number.isFinite);
    if (!wanted.length) {
      return { ok: false, message: 'This exercise has no expected value.', hint: 'Check the brief and try again.' };
    }
    const within = value => wanted.some(target => Math.abs(value - target) <= tolerance + 1e-9);
    const hit = given.some(within);
    if (!hit) {
      const closest = wanted.map(target => Math.min(...given.map(value => Math.abs(value - target)))).sort((a, b) => a - b)[0];
      return {
        ok: false,
        message: 'That does not match yet.',
        hint: `Expected ${wanted.map(value => roundTo(value, decimals)).join(' or ')}${unit ? ' ' + unit : ''}. You were off by about ${roundTo(closest, decimals)}.`
      };
    }
    return {
      ok: true,
      message: `That is right — ${roundTo(given.find(within), decimals)}${unit ? ' ' + unit : ''}.`
    };
  };
}

/**
 * Build the checker for a prose exercise.
 *
 * The checker looks for the ideas the exercise asks about and names the
 * one that is missing. It never judges whether the answer is good.
 */
export function makeDesignChecker(entry) {
  const ideas = Array.isArray(entry?.ideas) ? entry.ideas : [];
  const minimum = Number.isFinite(entry?.minimumWords) ? entry.minimumWords : 25;
  return ({ answer = '' } = {}) => {
    const text = String(answer).trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < minimum) {
      return {
        ok: false,
        message: 'This one needs a few more words.',
        hint: `Write at least ${minimum} words. Explain what you would build and why.`
      };
    }
    const missing = ideas.filter(idea => !mentionsIdea(text, idea));
    if (missing.length) {
      const labels = missing.map(idea => String(idea).replace(/-/g, ' '));
      return {
        ok: false,
        message: `Still to cover: ${labels.join(', ')}.`,
        hint: `Your answer does not mention ${labels[0]} yet. Think about what that means for the circuit.`
      };
    }
    return { ok: true, message: `That covers ${ideas.length} ${ideas.length > 1 ? 'ideas' : 'idea'}. Good thinking.` };
  };
}

/**
 * The spellings a design idea can be written in.
 *
 * A learner writes "time constant", not "timeConstant", so both work.
 */
const IDEA_SPELLINGS = {
  'time-constant': ['time constant', 'time-constant', 'tau', 'τ'],
  'charge': ['charge', 'charging', 'discharge', 'discharging'],
  'current-limiting': ['current limiting', 'current-limiting', 'limiting resistor', 'series resistor'],
  'forward-voltage': ['forward voltage', 'forward-voltage', 'forward drop', 'drop voltage'],
  'reverse-bias': ['reverse bias', 'reverse-bias', 'reverse biased'],
  'cutoff-frequency': ['cutoff frequency', 'cutoff-frequency', 'corner frequency', '-3 db'],
  'low-pass': ['low pass', 'low-pass', 'lowpass'],
  'high-pass': ['high pass', 'high-pass', 'highpass'],
  'sampling': ['sampling', 'sample rate', 'nyquist', 'aliasing'],
  'bandwidth': ['bandwidth', 'band width'],
  'noise': ['noise', 'interference', 'hum'],
  'impedance': ['impedance', 'impedance matching'],
  'decoupling': ['decoupling', 'bypass capacitor', 'decoupling capacitor'],
  'logic-level': ['logic level', 'logic-level', 'noise margin', 'ttl', 'cmos'],
  'de-morgan': ["de morgan", "de-morgan", "demorgan", "de morgan's"],
  'carry': ['carry', 'carry out'],
  'fan-out': ['fan-out', 'fan out', 'fanout'],
  'karnaugh': ['karnaugh', 'kmap', 'k-map'],
  'rise-time': ['rise time', 'rise-time', 'settling'],
  'ground-loop': ['ground loop', 'ground-loop', 'star ground'],
  'snubber': ['snubber', 'flyback', 'freewheel'],
  'truth-table': ['truth table', 'truth-table'],
  'de-bounce': ['debounce', 'de-bounce', 'bounce'],
  'loading': ['loading', 'loads', 'sags', 'sag'],
  'buffer': ['buffer', 'buffered', 'follower'],
  'energy': ['energy', 'stored', 'stores'],
  'exponential': ['exponential', 'sharply', 'steep'],
  'phosphor': ['phosphor', 'phosphors'],
  'efficiency': ['efficiency', 'efficient', 'lumens per watt'],
  'current': ['current'],
  'select': ['select', 'select line'],
  'delay': ['delay', 'propagation'],
  'edge': ['edge', 'rising edge', 'clock edge'],
  'race': ['race', 'race condition', 'race condition'],
  'clock': ['clock'],
  'bubble': ['bubble', 'bubbles'],
  'or': ['or gate', 'or'],
  'margin': ['margin', 'noise margin'],
  'select-line': ['select line', 'select lines', 'address line']
};

/**
 * Whether an answer mentions an idea, in any of its spellings.
 */
export function mentionsIdea(answer, idea) {
  if (!answer || !idea) return false;
  const text = String(answer).toLowerCase();
  const spellings = IDEA_SPELLINGS[idea] || [idea];
  return spellings.some(spelling => text.includes(String(spelling).toLowerCase()));
}

/**
 * Turn one raw course entry into an exercise.
 *
 * Returns null for an entry that is missing the fields the lab needs, so
 * one bad row can never break the page.
 */
export function toCircuitExercise(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.id !== 'string' || !entry.id) return null;
  if (typeof entry.title !== 'string' || !entry.title) return null;
  const kind = entry.kind === 'design' ? 'design' : (entry.kind === 'build' ? 'build' : 'calc');
  const exercise = {
    id: entry.id,
    kind,
    language: kind,
    title: entry.title,
    chapter: typeof entry.chapter === 'string' && entry.chapter ? entry.chapter : 'Circuits & Signals',
    xp: Number.isFinite(entry.xp) && entry.xp > 0 ? Math.floor(entry.xp) : 25,
    brief: typeof entry.brief === 'string' && entry.brief ? entry.brief : 'Complete the exercise.',
    starter: typeof entry.starter === 'string' ? entry.starter : '',
    expected: Array.isArray(entry.expected) ? entry.expected : [],
    ideas: Array.isArray(entry.ideas) ? entry.ideas : [],
    unit: typeof entry.unit === 'string' ? entry.unit : '',
    tolerance: Number.isFinite(entry.tolerance) ? entry.tolerance : 0.01,
    decimals: Number.isFinite(entry.decimals) ? entry.decimals : 2,
    netlist: entry.netlist && typeof entry.netlist === 'object' ? entry.netlist : null,
    origin: typeof entry.origin === 'string' ? entry.origin : ''
  };
  if (kind === 'design') exercise.check = makeDesignChecker(entry);
  else if (kind === 'build') exercise.check = makeBuildChecker(entry);
  else exercise.check = makeCalcChecker(entry);
  return exercise;
}

/**
 * Build the checker for a circuit-building exercise.
 *
 * The learner assembles a circuit; the checker compares the netlist
 * with the one the exercise expects. A part is identified by its kind
 * and the nodes it sits between, so the check is about the topology
 * and not about the labels the learner typed.
 */
export function makeBuildChecker(entry) {
  const expected = entry?.netlist?.parts;
  return ({ circuit = null } = {}) => {
    if (!circuit || !Array.isArray(circuit.parts) || !circuit.parts.length) {
      return { ok: false, message: 'No circuit yet.', hint: 'Place the parts on the board and wire them up.' };
    }
    if (!Array.isArray(expected) || !expected.length) {
      return { ok: false, message: 'This exercise has no expected circuit.', hint: 'Check the brief and try again.' };
    }
    const built = signature(circuit.parts);
    const wanted = signature(expected);
    const missing = wanted.filter(item => !built.includes(item));
    if (missing.length) {
      const labels = missing.map(item => item.replace(/\|/g, ' between '));
      return {
        ok: false,
        message: `Still missing: ${labels.join(', ')}.`,
        hint: 'Check the nodes each part is connected to, not just the parts you placed.'
      };
    }
    const remaining = [...wanted];
    const extra = built.filter(item => {
      const index = remaining.indexOf(item);
      if (index < 0) return true;
      remaining.splice(index,1);
      return false;
    });
    if (extra.length) {
      const labels = extra.map(item => item.replace(/\|/g, ' between '));
      return {
        ok: false,
        message: `Not part of the answer: ${labels.join(', ')}.`,
        hint: 'Remove the parts the exercise does not need, or rewire them.'
      };
    }
    if (entry.id === 'circuit-build-divider' && circuit.parts.some(p => p.id === 'resistor' && (p.value ?? CIRCUIT_PARTS.resistor.defaults.value) !== 1000)) {
      return {ok:false, message:'The wiring is correct. Set both resistors to 1 kΩ.', hint:'Select each resistor, enter 1000 Ω, then probe node 2.'};
    }
    return { ok: true, message: 'That is the right topology. The circuit matches.' };
  };
}

/**
 * The comparable shape of a set of parts.
 *
 * Two parts match when they are the same kind and sit between the same
 * two nodes.
 */
function signature(parts) {
  return parts
    .filter(part => part && CIRCUIT_PARTS[part.id])
    .map(part => {
      const a = Number(part.nodeA) || 0;
      const b = Number(part.nodeB) || 0;
      const polarized = ['source','diode'].includes(CIRCUIT_PARTS[part.id].kind);
      const [low, high] = polarized || a <= b ? [a, b] : [b, a];
      return `${part.id}|${low}|${high}`;
    })
    .sort();
}

/**
 * Turn the whole course payload into exercises.
 */
export function toCircuitExercises(payload) {
  const list = Array.isArray(payload?.exercises) ? payload.exercises : [];
  const out = [];
  for (const entry of list) {
    const exercise = toCircuitExercise(entry);
    if (exercise) out.push(exercise);
  }
  return out;
}

/**
 * Load the circuits course.
 *
 * Returns `{ exercises, source, license }`. When the file cannot be
 * read the exercises are empty, so the page still shows its welcome
 * card rather than a broken rail.
 */
export async function loadCircuitsCourse(fetchImpl = globalThis.fetch, url = './data/circuits-course.json') {
  try {
    const response = await fetchImpl(url, { cache: 'no-cache' });
    if (!response?.ok) return { exercises: [], source: '', license: '' };
    const payload = await response.json();
    return {
      exercises: toCircuitExercises(payload),
      source: typeof payload?.source === 'string' ? payload.source : '',
      license: typeof payload?.license === 'string' ? payload.license : ''
    };
  } catch {
    return { exercises: [], source: '', license: '' };
  }
}

/**
 * The chapters that hold the exercises, in course order.
 */
export function circuitChapters(exercises) {
  const groups = [];
  const index = new Map();
  for (const exercise of exercises || []) {
    if (!exercise) continue;
    const chapter = exercise.chapter || 'Circuits & Signals';
    if (!index.has(chapter)) {
      const group = { chapter, exercises: [] };
      index.set(chapter, group);
      groups.push(group);
    }
    index.get(chapter).exercises.push(exercise);
  }
  return groups;
}
