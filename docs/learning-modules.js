// Shared chapter placement for the catalog and four interactive workbenches.
export const levels = ['Foundation', 'Intermediate', 'Advanced'];
const curriculum = {
  code: [
    ['Web fundamentals', ['Markup basics','Styling basics','Logic basics']],
    ['HTML & accessible forms', ['HTML · Elements','HTML · Structure'], ['HTML · Forms','HTML · Semantic HTML'], ['HTML · Form engineering']],
    ['CSS & layout', ['CSS · Selectors','CSS · Properties','CSS · Box Model'], ['CSS · Layout','CSS · Flexbox']],
    ['JavaScript', ['JavaScript · The Basics']],
    ['Web projects', [], ['Challenges · Freeform']],
    ['Quiz & Q&A', [], ['JavaScript · Quiz']]
  ],
  ai: [
    ['Python & model fundamentals', ['Python practice studio'], ['Python for models']],
    ['Data & APIs', ['Working with data'], ['Working with APIs']],
    ['Model quality & safety', [], ['AI safety'], ['Model evaluation studio']],
    ['AI systems', [], ['System design']]
  ],
  circuits: [
    ['Circuit fundamentals', ['Voltage, current and resistance','Kirchhoff’s laws','The voltage divider']],
    ['Analog electronics', ['Diodes and rectification','LEDs and light'], ['Capacitors and the RC circuit','Inductors and the RL circuit','RLC, resonance and filters'], ['Analog measurement bench']],
    ['Digital electronics', ['Digital logic and gates'], ['Combinational design','Sequential logic']],
    ['Signal measurement', [], ['Signals in the real world']]
  ],
  systems: [
    ['Networks & support', ['Networking · CCNA foundations','Device support · A+ foundations']],
    ['Cloud & service design', ['Cloud usage'], ['System design'], ['Capacity engineering']],
    ['Security operations', [], ['Defensive cybersecurity']],
    ['Signals & computing', ['Electronics'], ['Digital signals','Model evaluation']]
  ]
};

export function chapterPlacement(track, chapter) {
  for (const [module, ...bands] of curriculum[track] || []) {
    const index = bands.findIndex(chapters => chapters.includes(chapter));
    if (index >= 0) return {module, level:levels[index]};
  }
  // Newly authored material stays browsable before an editor assigns it a level.
  return {module:'Additional studies', level:'Unclassified'};
}

export function courseModules(track, chapters) {
  const available = new Set(chapters.map(chapter => chapterPlacement(track, chapter).module));
  return [...(curriculum[track] || []).map(([name]) => name), 'Additional studies'].filter(name => available.has(name));
}
