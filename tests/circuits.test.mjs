import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CIRCUIT_PARTS,
  PART_ORDER,
  GATE_TRUTHS,
  LOGIC_GATES,
  ohmLaw,
  seriesResistance,
  parallelResistance,
  solveLinear,
  nodalSolve,
  transientStep,
  simulate,
  rcTimeConstant,
  rlTimeConstant,
  cutoffFrequency,
  dividerOutput,
  signalMetrics,
  evaluateGate,
  truthTableMatches,
  halfAdder,
  fullAdder,
  simulateLogic,
  srLatch,
  dFlipFlop,
  formatValue,
  makeCalcChecker,
  makeDesignChecker,
  makeBuildChecker,
  mentionsIdea,
  toCircuitExercise,
  toCircuitExercises,
  loadCircuitsCourse,
  circuitChapters,
  emptyCircuit,
  addPart
} from '../docs/circuits.js';
import {
  CIRCUITS_COURSE,
  CHAPTERS,
  findChapter,
  orphanChapters
} from '../docs/circuits-chapters.js';

const payload = JSON.parse(await readFile(new URL('../docs/data/circuits-course.json', import.meta.url), 'utf8'));
const exercises = toCircuitExercises(payload);

/* -- the parts catalogue ------------------------------------------ */

test('every part in the catalogue has the fields the lab needs',()=>{
  for (const id of PART_ORDER) {
    const part = CIRCUIT_PARTS[id];
    assert.ok(part, 'missing part ' + id);
    assert.equal(part.id, id);
    assert.ok(part.name);
    assert.ok(part.kind);
    assert.ok(part.pins >= 1);
  }
});

test('the parts catalogue has no duplicate ids',()=>{
  const ids = Object.keys(CIRCUIT_PARTS);
  assert.equal(new Set(ids).size, ids.length);
});

test('a part value reads in the unit a person would use',()=>{
  assert.equal(formatValue('resistor', 4700), '4.7 kΩ');
  assert.equal(formatValue('resistor', 470), '470 Ω');
  assert.equal(formatValue('capacitor', 0.000022), '22 µF');
  assert.equal(formatValue('capacitor', 0.0001), '100 µF');
  assert.equal(formatValue('capacitor', 0.0000001), '100 nF');
  assert.equal(formatValue('inductor', 0.1), '100 mH');
  assert.equal(formatValue('battery', 9), '9 V');
});

/* -- Ohm's law ------------------------------------------------------ */

test('Ohm’s law gives the current and the power',()=>{
  const result = ohmLaw(12, 470);
  assert.ok(Math.abs(result.current - 12 / 470) < 1e-12);
  assert.ok(Math.abs(result.power - 12 * result.current) < 1e-12);
});

test('the three ways of writing the power agree',()=>{
  const result = ohmLaw(5, 1000);
  assert.ok(Math.abs(result.power - result.powerFromCurrent) < 1e-12);
  assert.ok(Math.abs(result.power - result.powerFromResistance) < 1e-12);
});

test('Ohm’s law survives a zero resistance without dividing by zero',()=>{
  const result = ohmLaw(5, 0);
  assert.equal(result.current, 0);
  assert.ok(Number.isFinite(result.power));
});

test('series resistances add',()=>{
  assert.equal(seriesResistance(1000, 2200), 3200);
});

test('parallel resistances combine',()=>{
  assert.ok(Math.abs(parallelResistance(1000, 1000) - 500) < 1e-9);
  assert.ok(Math.abs(parallelResistance(3000, 6000) - 2000) < 1e-9);
});

/* -- the linear solver ---------------------------------------------- */

test('a two by two system solves correctly',()=>{
  const rows = [[2, -1], [-1, 2]];
  const x = solveLinear(rows, [1, 3]);
  assert.ok(Math.abs(x[0] - 5 / 3) < 1e-9);
  assert.ok(Math.abs(x[1] - 7 / 3) < 1e-9);
});

test('a singular system fails loudly instead of returning NaN',()=>{
  assert.throws(() => solveLinear([[0, 0], [0, 0]], [1, 1]), /no solution/);
});

/* -- nodal analysis -------------------------------------------------- */

test('a divider gives the expected voltage, not just a consistent one',()=>{
  // A 10 V battery, a 1 kΩ and a 1 kΩ resistor. The middle node must
  // be at exactly 5 V, which is the analytic answer.
  const circuit = {
    nodes: { 0: { name: 'ground' } },
    parts: [
      { id: 'battery', label: 'B1', value: 10, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: 1000, nodeA: 1, nodeB: 2 },
      { id: 'resistor', label: 'R2', value: 1000, nodeA: 2, nodeB: 0 }
    ]
  };
  const solution = nodalSolve(circuit);
  assert.ok(Math.abs(solution.nodes[2] - 5) < 1e-6, 'expected 5 V, got ' + solution.nodes[2]);
});

test('an uneven divider gives the analytic ratio',()=>{
  const circuit = {
    nodes: {},
    parts: [
      { id: 'battery', label: 'B1', value: 12, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: 10000, nodeA: 1, nodeB: 2 },
      { id: 'resistor', label: 'R2', value: 15000, nodeA: 2, nodeB: 0 }
    ]
  };
  const solution = nodalSolve(circuit);
  assert.ok(Math.abs(solution.nodes[2] - 7.2) < 1e-6, 'expected 7.2 V, got ' + solution.nodes[2]);
});

test('the current through a series loop matches Ohm’s law',()=>{
  const circuit = {
    nodes: {},
    parts: [
      { id: 'battery', label: 'B1', value: 9, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: 470, nodeA: 1, nodeB: 2 },
      { id: 'resistor', label: 'R2', value: 470, nodeA: 2, nodeB: 0 }
    ]
  };
  const solution = nodalSolve(circuit);
  const current = solution.branchCurrents.R1;
  assert.ok(Math.abs(current - 9 / 940) < 1e-9);
});

test('a shorted circuit gives a huge current, never a NaN',()=>{
  const circuit = {
    nodes: {},
    parts: [
      { id: 'battery', label: 'B1', value: 9, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: 0, nodeA: 1, nodeB: 0 }
    ]
  };
  const solution = nodalSolve(circuit);
  // A short across a battery is a very large current. It may also be
  // reported as unsolvable, but it must never be NaN.
  for (const value of Object.values(solution.nodes)) assert.ok(Number.isFinite(value));
  for (const value of Object.values(solution.branchCurrents)) assert.ok(Number.isFinite(value));
  if (!solution.error) {
    assert.ok(Math.abs(solution.branchCurrents.R1) > 1000, 'expected a very large current');
  }
});

test('an empty circuit solves to ground',()=>{
  const solution = nodalSolve(emptyCircuit());
  assert.deepEqual(solution.nodes, { 0: 0 });
});

/* -- transient simulation ------------------------------------------- */

test('an RC circuit charges to 63.2% after one time constant',()=>{
  const r = 1000;
  const c = 0.001;
  const tau = rcTimeConstant(r, c);
  const circuit = {
    nodes: {},
    parts: [
      { id: 'battery', label: 'B1', value: 10, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: r, nodeA: 1, nodeB: 2 },
      { id: 'capacitor', label: 'C1', value: c, nodeA: 2, nodeB: 0 }
    ]
  };
  const dt = tau / 2000;
  let state = { parts: {}, time: 0 };
  const steps = 2000;
  for (let i = 0; i < steps; i++) state = transientStep(circuit, state, dt);
  assert.ok(Math.abs(state.time - tau) < dt * 2);
  const voltage = state.nodes[2];
  assert.ok(Math.abs(voltage - 6.32) < 0.15, 'expected about 6.32 V, got ' + voltage);
});

test('a charging capacitor settles at the supply voltage',()=>{
  const circuit = {
    nodes: {},
    parts: [
      { id: 'battery', label: 'B1', value: 10, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: 1000, nodeA: 1, nodeB: 2 },
      { id: 'capacitor', label: 'C1', value: 0.001, nodeA: 2, nodeB: 0 }
    ]
  };
  // The time constant is R·C = 1 s, so the run has to cover several of
  // them for the capacitor to reach the supply.
  const tau = rcTimeConstant(1000, 0.001);
  const result = simulate(circuit, { dt: tau / 2000, duration: 5 * tau, probe: 2 });
  const last = result.samples[result.samples.length - 1];
  assert.ok(Math.abs(last.value - 10) < 0.1, 'expected about 10 V, got ' + last.value);
});

test('the simulation tracks the exact exponential, and gets closer with a smaller step',()=>{
  const circuit = {
    nodes: {},
    parts: [
      { id: 'battery', label: 'B1', value: 10, nodeA: 1, nodeB: 0 },
      { id: 'resistor', label: 'R1', value: 1000, nodeA: 1, nodeB: 2 },
      { id: 'capacitor', label: 'C1', value: 0.001, nodeA: 2, nodeB: 0 }
    ]
  };
  const tau = rcTimeConstant(1000, 0.001);
  const exact = 10 * (1 - Math.exp(-1));
  const errors = [];
  for (const steps of [1000, 2000]) {
    const result = simulate(circuit, { dt: tau / steps, duration: tau, probe: 2 });
    const last = result.samples[result.samples.length - 1];
    errors.push(Math.abs(last.value - exact));
  }
  assert.ok(errors[0] < 0.05, 'the coarse step was too far off: ' + errors[0]);
  assert.ok(errors[1] < errors[0], 'a smaller step must be more accurate');
});

test('a discharging capacitor falls to 36.8% after one time constant',()=>{
  const r = 1000;
  const c = 0.001;
  const tau = rcTimeConstant(r, c);
  const circuit = {
    nodes: {},
    parts: [
      { id: 'resistor', label: 'R1', value: r, nodeA: 2, nodeB: 0 },
      { id: 'capacitor', label: 'C1', value: c, nodeA: 2, nodeB: 0 }
    ]
  };
  // Start the capacitor charged, with no source to hold it there.
  const dt = tau / 2000;
  let state = { parts: { C1: { voltage: 10, current: 0 } }, time: 0 };
  for (let i = 0; i < 2000; i++) state = transientStep(circuit, state, dt);
  const voltage = state.nodes[2];
  assert.ok(Math.abs(voltage - 3.68) < 0.2, 'expected about 3.68 V, got ' + voltage);
});

test('the RL time constant is L over R',()=>{
  assert.ok(Math.abs(rlTimeConstant(0.1, 220) - 0.1 / 220) < 1e-12);
});

test('the RC time constant is R times C',()=>{
  assert.ok(Math.abs(rcTimeConstant(10000, 0.000022) - 0.22) < 1e-12);
});

test('the cutoff frequency matches the time constant',()=>{
  assert.ok(Math.abs(cutoffFrequency(1000, 0.001) - 1 / (2 * Math.PI * 1)) < 1e-9);
});

test('a divider formula gives the same answer as the solver',()=>{
  assert.ok(Math.abs(dividerOutput(10, 1000, 1000) - 5) < 1e-12);
});

/* -- signals --------------------------------------------------------- */

test('signal metrics describe a square wave',()=>{
  const samples = [];
  for (let i = 0; i < 200; i++) {
    samples.push({ time: i * 0.001, value: Math.floor(i / 50) % 2 === 0 ? 0 : 5 });
  }
  const metrics = signalMetrics(samples);
  assert.ok(Math.abs(metrics.min) < 1e-9);
  assert.ok(Math.abs(metrics.max - 5) < 1e-9);
  assert.ok(Math.abs(metrics.peakToPeak - 5) < 1e-9);
  assert.ok(Math.abs(metrics.period - 0.1) < 1e-6, 'expected 0.1 s, got ' + metrics.period);
});

test('signal metrics of nothing are all zero',()=>{
  const metrics = signalMetrics([]);
  assert.equal(metrics.min, 0);
  assert.equal(metrics.max, 0);
  assert.equal(metrics.rms, 0);
});

/* -- digital logic --------------------------------------------------- */

test('every gate matches its own truth table',()=>{
  for (const gate of Object.keys(GATE_TRUTHS)) {
    assert.ok(truthTableMatches(gate), gate + ' disagrees with its truth table');
  }
});

test('the gates give the answers the tables say',()=>{
  assert.equal(evaluateGate('AND', [1, 1]), 1);
  assert.equal(evaluateGate('AND', [1, 0]), 0);
  assert.equal(evaluateGate('OR', [0, 1]), 1);
  assert.equal(evaluateGate('NOT', [0]), 1);
  assert.equal(evaluateGate('NAND', [1, 1]), 0);
  assert.equal(evaluateGate('NOR', [0, 0]), 1);
  assert.equal(evaluateGate('XOR', [1, 0]), 1);
  assert.equal(evaluateGate('XOR', [1, 1]), 0);
  assert.equal(evaluateGate('XNOR', [1, 1]), 1);
  assert.equal(evaluateGate('BUFFER', [1]), 1);
});

test('a three input AND needs every input high',()=>{
  assert.equal(evaluateGate('AND', [1, 1, 1]), 1);
  assert.equal(evaluateGate('AND', [1, 0, 1]), 0);
});

test('an unknown gate reads as zero rather than throwing',()=>{
  assert.equal(evaluateGate('NONSENSE', [1, 1]), 0);
});

test('a half adder is right for all four inputs',()=>{
  assert.deepEqual(halfAdder(0, 0), { sum: 0, carry: 0 });
  assert.deepEqual(halfAdder(0, 1), { sum: 1, carry: 0 });
  assert.deepEqual(halfAdder(1, 0), { sum: 1, carry: 0 });
  assert.deepEqual(halfAdder(1, 1), { sum: 0, carry: 1 });
});

test('a full adder is right for all eight inputs',()=>{
  const expected = [
    [0, 0, 0, 0, 0], [0, 0, 1, 1, 0], [0, 1, 0, 1, 0], [0, 1, 1, 0, 1],
    [1, 0, 0, 1, 0], [1, 0, 1, 0, 1], [1, 1, 0, 0, 1], [1, 1, 1, 1, 1]
  ];
  for (const [a, b, cin, sum, carry] of expected) {
    const result = fullAdder(a, b, cin);
    assert.equal(result.sum, sum, 'sum wrong for ' + [a, b, cin].join(','));
    assert.equal(result.carry, carry, 'carry wrong for ' + [a, b, cin].join(','));
  }
});

test('a combinational circuit can be stepped through every input',()=>{
  const gates = [
    { gate: 'XOR', inputs: ['A', 'B'], output: 'S' },
    { gate: 'AND', inputs: ['A', 'B'], output: 'C' }
  ];
  const rows = simulateLogic(gates, ['A', 'B'], 2);
  assert.equal(rows.length, 4);
  assert.equal(rows.find(row => row.bits === 3).wires.S, 0);
  assert.equal(rows.find(row => row.bits === 3).wires.C, 1);
  assert.equal(rows.find(row => row.bits === 1).wires.S, 1);
});

test('an SR latch holds its state and can be set and reset',()=>{
  const set = srLatch(1, 0);
  assert.equal(set.q, 1);
  const held = srLatch(0, 0, set);
  assert.equal(held.q, 1);
  const reset = srLatch(0, 1);
  assert.equal(reset.q, 0);
});

test('a D flip-flop only takes its data on the rising edge',()=>{
  const first = dFlipFlop(1, 1, { q: 0, clock: 0 });
  assert.equal(first.q, 1);
  assert.equal(first.rising, true);
  const held = dFlipFlop(0, 1, { q: 1, clock: 1 });
  assert.equal(held.q, 1, 'the value must be held while the clock stays high');
  assert.equal(held.rising, false);
});

/* -- the course file -------------------------------------------------- */

test('the course file has exercises',()=>{
  assert.ok(exercises.length >= 30, 'expected a full course, got ' + exercises.length);
});

test('every exercise has an id, a title, a chapter and a brief',()=>{
  for (const exercise of exercises) {
    assert.ok(exercise.id);
    assert.ok(exercise.title);
    assert.ok(exercise.chapter);
    assert.ok(exercise.brief);
    assert.ok(exercise.xp > 0);
    assert.equal(typeof exercise.check, 'function');
  }
});

test('the exercise ids are unique',()=>{
  const ids = exercises.map(exercise => exercise.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a bad entry is skipped rather than breaking the course',()=>{
  const list = toCircuitExercises({ exercises: [null, {}, { id: '' }, { id: 'x' }, { id: 'y', title: 'Y' }] });
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'y');
});

test('a calc exercise accepts the value it expects',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-ohms-current');
  const result = exercise.check({ answer: '25.53' });
  assert.equal(result.ok, true);
});

test('a calc exercise says how far off a wrong answer was',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-ohms-current');
  const result = exercise.check({ answer: '12' });
  assert.equal(result.ok, false);
  assert.ok(/off by/.test(result.hint));
});

test('a calc exercise rejects an empty or non numeric answer',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-ohms-current');
  assert.equal(exercise.check({ answer: '' }).ok, false);
  assert.equal(exercise.check({ answer: 'lots' }).ok, false);
});

test('a design exercise wants every idea it asks for',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-divider-loading');
  const short = exercise.check({ answer: 'It sags because of loading.' });
  assert.equal(short.ok, false);
  const good = exercise.check({
    answer: 'The output sags because the load draws current out of the divider and that changes the impedance of the lower leg. The divider was designed assuming nothing was attached. A buffer would fix it, because a buffer takes almost no current from the divider and passes the voltage on unchanged.'
  });
  assert.equal(good.ok, true, good.message);
});

test('a design exercise asks for a minimum length',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-divider-loading');
  const result = exercise.check({ answer: 'Too short.' });
  assert.equal(result.ok, false);
  assert.ok(/words/.test(result.hint));
});

test('a build exercise accepts the topology it expects',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-build-divider');
  const circuit = {
    parts: [
      { id: 'battery', nodeA: 1, nodeB: 0 },
      { id: 'resistor', nodeA: 1, nodeB: 2 },
      { id: 'resistor', nodeA: 2, nodeB: 0 }
    ]
  };
  const result = exercise.check({ circuit });
  assert.equal(result.ok, true);
});

test('a build exercise names the part that is missing',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-build-divider');
  const circuit = {
    parts: [
      { id: 'battery', nodeA: 1, nodeB: 0 },
      { id: 'resistor', nodeA: 1, nodeB: 2 }
    ]
  };
  const result = exercise.check({ circuit });
  assert.equal(result.ok, false);
  assert.ok(/missing/i.test(result.message));
});

test('bench exercises measure component values and leave the learner circuit intact', () => {
  for (const exercise of exercises.filter(item => item.chapter === 'Analog measurement bench')) {
    const circuit = structuredClone(exercise.netlist);
    assert.equal(exercise.check({circuit}).ok, true, exercise.id);
    assert.deepEqual(circuit, exercise.netlist);
    circuit.parts.at(-1).value *= 2;
    assert.equal(exercise.check({circuit}).ok, false, exercise.id);
  }
});

test('a build exercise says when the circuit is empty',()=>{
  const exercise = exercises.find(item => item.id === 'circuit-build-divider');
  const result = exercise.check({ circuit: { parts: [] } });
  assert.equal(result.ok, false);
  assert.ok(/no circuit/i.test(result.message));
});

test('the idea spellings cover the ways a learner writes them',()=>{
  assert.equal(mentionsIdea('the time constant is tau', 'time-constant'), true);
  assert.equal(mentionsIdea('a noise margin', 'logic-level'), true);
  assert.equal(mentionsIdea('nothing relevant here', 'time-constant'), false);
});

/* -- the chapters ------------------------------------------------------ */

test('every chapter has a goal, material, an exam and an outcome',()=>{
  for (const chapter of CIRCUITS_COURSE.chapters) {
    assert.ok(chapter.id, 'a chapter has no id');
    assert.ok(chapter.title);
    assert.ok(chapter.goal, chapter.title + ' has no goal');
    assert.ok(Array.isArray(chapter.material) && chapter.material.length, chapter.title + ' has no material');
    assert.ok(chapter.exam, chapter.title + ' has no exam');
    assert.ok(chapter.outcome, chapter.title + ' has no outcome');
  }
});

test('every piece of material has a title and a body',()=>{
  for (const chapter of CIRCUITS_COURSE.chapters) {
    for (const piece of chapter.material) {
      assert.ok(piece.title, chapter.title + ' has a piece with no title');
      assert.ok(piece.body, chapter.title + ' / ' + piece.title + ' has no body');
    }
  }
});

test('the course includes the measurement bench after the twelve foundation chapters',()=>{
  assert.equal(CIRCUITS_COURSE.chapters.length, 13);
  assert.equal(CIRCUITS_COURSE.chapters.at(-1).id, 'analog-measurement-bench');
});

test('every exercise points at a chapter that exists',()=>{
  for (const exercise of exercises) {
    assert.ok(CHAPTERS[exercise.chapter], exercise.id + ' points at no chapter: ' + exercise.chapter);
  }
});

test('every chapter has at least one exercise',()=>{
  const orphans = orphanChapters(exercises);
  assert.deepEqual(orphans, [], 'chapters with no exercise: ' + orphans.join(', '));
});

test('a chapter can be looked up by its title',()=>{
  assert.ok(findChapter('Voltage, current and resistance'));
  assert.equal(findChapter('Nothing at all'), null);
});

test('the chapters group the exercises in course order',()=>{
  const groups = circuitChapters(exercises);
  assert.ok(groups.length >= 12);
  assert.equal(groups[0].chapter, 'Voltage, current and resistance');
  const total = groups.reduce((sum, group) => sum + group.exercises.length, 0);
  assert.equal(total, exercises.length);
});

/* -- the loader -------------------------------------------------------- */

test('the course loads from a file-like fetch',async()=>{
  const fake = async()=>({ ok: true, json: async()=>payload });
  const course = await loadCircuitsCourse(fake, './data/circuits-course.json');
  assert.equal(course.exercises.length, exercises.length);
  assert.ok(course.source);
});

test('a failed load gives an empty course rather than throwing',async()=>{
  const broken = async()=>{ throw new Error('offline'); };
  const course = await loadCircuitsCourse(broken, './data/circuits-course.json');
  assert.deepEqual(course.exercises, []);
});

test('the divider check detects duplicate branches, reversed supplies and incorrect resistances',()=>{
  const divider=exercises.find(e=>e.id==='circuit-build-divider');
  const battery={id:'battery',nodeA:1,nodeB:0,value:9};
  const upper={id:'resistor',nodeA:1,nodeB:2,value:1000};
  const lower={id:'resistor',nodeA:2,nodeB:0,value:1000};
  for(const parts of [[battery,upper,lower,upper],[{...battery,nodeA:0,nodeB:1},upper,lower],[battery,upper,{...lower,value:470}]]){
    assert.equal(divider.check({circuit:{parts}}).ok,false);
  }
});
