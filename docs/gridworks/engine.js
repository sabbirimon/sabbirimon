/** Gridworks: deterministic, dependency-free infrastructure simulation.
 * Power is measured in kW, bandwidth in abstract Mbps, cash flow in credits/min.
 * Fictional regions and simplified infrastructure are for play, not engineering.
 */
const building = (name, category, cost, demand, extra = {}) => ({ name, category, layer: 'building', cost, demand, maintenance: 1, unlockLevel: 0, tierMax: 3, color: '#9da7c5', description: '', ...extra });
export const BUILDINGS = {
  line: building('Power line', 'power', 10, 0, { layer: 'power', capacity: 400, maintenance: .08, color: '#efce72', description: 'Carries electricity between neighboring tiles. Can share a tile with data cable and a building. Substations and upgrades increase grid throughput.' }),
  cat6: building('Cat6 cable', 'network', 8, 0, { layer: 'data', capacity: 120, maxHops: 10, maintenance: .05, color: '#88c6a6', description: 'Low-cost local data cable: 120 Mbps and ten consecutive cable tiles before a powered router, switch, or fiber regenerates the signal.' }),
  fiber: building('Fiber-optic cable', 'network', 24, 0, { layer: 'data', capacity: 1200, maintenance: .1, unlockLevel: 4, color: '#8dceec', description: 'High-capacity backbone with no Cat6 distance limit. Shares tiles with power lines.' }),
  solar: building('Solar array', 'power', 230, 0, { output: 120, maintenance: 2, emissions: 0, color: '#b5a1ee', description: 'Clean and inexpensive. Output changes with the simulated daylight cycle; use storage or firm generation overnight.' }),
  wind: building('Wind farm', 'power', 380, 0, { output: 170, maintenance: 4, emissions: 0, unlockLevel: 1, color: '#c6e4e7', description: 'Clean variable generation. Wind follows a deterministic weather cycle and can complement solar.' }),
  hydro: building('Hydro station', 'power', 780, 0, { output: 280, maintenance: 10, emissions: 0, unlockLevel: 3, color: '#72bfe0', description: 'Reliable clean output. Must be built on land beside the river.' }),
  coal: building('Coal station', 'power', 480, 0, { output: 260, maintenance: 23, emissions: 28, color: '#bd9d8e', description: 'Affordable firm power, with high operating costs and emissions. A useful early backup to replace as the city grows.' }),
  gas: building('Gas turbine', 'power', 1150, 0, { output: 520, maintenance: 36, emissions: 14, unlockLevel: 5, color: '#e3b873', description: 'Flexible firm generation with lower emissions than coal, but a continuing fuel bill.' }),
  nuclear: building('Nuclear station', 'power', 4600, 0, { output: 1800, maintenance: 115, emissions: 1, unlockLevel: 11, color: '#c1df95', description: 'Large steady low-carbon output. Expensive to build and maintain; provide enough demand and transmission capacity.' }),
  diesel: building('Reserve generator', 'power', 420, 0, { output: 180, maintenance: 3, activeMaintenance: 40, emissions: 34, unlockLevel: 4, color: '#d6ab72', description: 'Automatic diesel backup starts only when primary generation cannot meet demand. Low standby cost, high running cost.' }),
  substation: building('Substation', 'power', 220, 3, { capacity: 1000, maintenance: 5, unlockLevel: 1, color: '#e7ca79', description: 'Raises the throughput of its connected power grid. Each tier strengthens distribution capacity.' }),
  battery: building('Battery / UPS', 'power', 390, 0, { capacity: 6000, output: 240, maintenance: 4, unlockLevel: 2, color: '#a8d998', description: 'Stores surplus energy and discharges automatically during deficits. Capacity is in kW-seconds; upgrades add reserves.' }),
  datacenter: building('Data center', 'network', 340, 35, { capacity: 100, maintenance: 7, color: '#ad9de8', description: 'Powered backbone source. Upgrade its CPU, GPU, storage, and cooling modules to grow compute and data services.' }),
  router: building('Core router', 'network', 180, 6, { capacity: 350, maintenance: 3, unlockLevel: 4, color: '#93b9e3', description: 'Adds network distribution capacity and regenerates Cat6 reach when powered.' }),
  switch: building('Network switch', 'network', 110, 4, { capacity: 180, maintenance: 2, unlockLevel: 2, color: '#8fc8c8', description: 'Expands backbone distribution and regenerates nearby Cat6 links. A cheaper local alternative to a core router.' }),
  firewall: building('Security firewall', 'network', 310, 8, { maintenance: 5, unlockLevel: 8, color: '#e4a2ad', description: 'Protects its connected data network during deterministic cyber incidents. Higher tiers reduce more disruption.' }),
  tower3g: building('3G cell tower', 'network', 170, 10, { capacity: 45, radius: 4.6, maintenance: 4, color: '#95d8bc', description: 'Economical local coverage. Needs both power and a data path to a powered data center.' }),
  tower4g: building('4G cell tower', 'network', 460, 19, { capacity: 150, radius: 6.1, maintenance: 8, unlockLevel: 6, color: '#98bfea', description: 'Wider coverage and more bandwidth for a growing town. Fiber backhaul prevents bottlenecks.' }),
  tower5g: building('5G cell tower', 'network', 1050, 33, { capacity: 480, radius: 4.8, maintenance: 15, unlockLevel: 12, color: '#c6a5ed', description: 'Dense high-capacity coverage. Strong power and fiber backhaul are essential for its full benefit.' }),
  home: building('Homes', 'city', 115, 14, { population: 10, income: 26, dataDemand: 6, maintenance: 1, color: '#e9b2a3', description: 'Residents pay for delivered electricity and connected mobile service. Upgrades house more people and increase demand.' }),
  business: building('Business district', 'city', 320, 34, { income: 92, dataDemand: 20, maintenance: 5, unlockLevel: 1, color: '#dfc892', description: 'High service income, but substantially more electricity and bandwidth demand than homes.' }),
  gateway: building('Regional gateway', 'network', 720, 20, { capacity: 300, maintenance: 12, unlockLevel: 7, color: '#8fcbd3', description: 'Connects a powered data backbone to completed campaign cities. Each active regional link earns intercity service revenue.' }),
  leo: building('LEO ground station', 'network', 1900, 75, { capacity: 460, radius: 50, maintenance: 32, unlockLevel: 10, color: '#c5b4ef', description: 'Original low-Earth-orbit relay network. Powered data backhaul enables city-wide coverage; tier upgrades purchase a larger virtual constellation.' }),
};

export const MODULES = {
  cpu: { name: 'CPU cluster', cost: 180, unlockLevel: 3, tierMax: 3, description: 'More data throughput and compute capacity; adds power and heat.' },
  gpu: { name: 'GPU accelerator', cost: 290, unlockLevel: 5, tierMax: 3, description: 'Boosts paid compute services, with a significant electricity and cooling requirement.' },
  storage: { name: 'Storage array', cost: 150, unlockLevel: 3, tierMax: 3, description: 'Raises usable backbone throughput and compute-service revenue.' },
  cooling: { name: 'Cooling system', cost: 170, unlockLevel: 3, tierMax: 3, description: 'Removes heat that otherwise throttles upgraded CPU/GPU hardware. Cooling itself consumes power.' },
};

export const AUTOMATIONS = {
  maintenance: { name: 'Maintenance drone', cost: 650, unlockLevel: 6, tierMax: 3, description: 'Repairs the most damaged affordable asset automatically, respecting its reserve-budget floor.' },
  operator: { name: 'Grid operator', cost: 1100, unlockLevel: 10, tierMax: 3, description: 'Local rule-based controller: improves generation efficiency and lowers infrastructure upkeep.' },
  planner: { name: 'Network planner', cost: 1500, unlockLevel: 13, tierMax: 3, description: 'Upgrades affordable cable bottlenecks at bounded intervals while retaining the configured cash reserve.' },
};

const mission = (id, name, country, description, targets, credits, extra = {}) => ({ id, name, country, region: country, description, targets, startingCredits: credits, width: 28, height: 20, stability: 12, ...extra });
export const LEVELS = [
  mission('lantern', 'Lantern Village', 'Verdant Republic', 'Bring the first neighborhood online. Build a power source and a 3G tower beside the starter cables.', { residents: 40, service: 95, net: 25 }, 1800),
  mission('circuit', 'Circuit Borough', 'Verdant Republic', 'Grow a small business district and strengthen the local grid.', { residents: 60, businesses: 1, service: 90, net: 90 }, 2600),
  mission('meadow', 'Meadow Junction', 'Verdant Republic', 'Introduce storage and local switches before expanding.', { residents: 80, service: 90, battery: 1, switch: 1, net: 120 }, 3700),
  mission('riverbend', 'Riverbend', 'Verdant Republic', 'Harness the river and modernize data-center hardware.', { residents: 100, service: 90, hydro: 1, modules: 2, net: 150 }, 5400),
  mission('glassharbor', 'Glass Harbor', 'Coast Federation', 'Build a fiber backbone and a core router for a larger town.', { residents: 120, service: 92, fiber: 8, router: 1, net: 190 }, 6500),
  mission('copperbay', 'Copper Bay', 'Coast Federation', 'Balance dependable power and paid compute services.', { residents: 140, businesses: 2, service: 92, gas: 1, compute: 15 }, 7800),
  mission('wavecrest', 'Wavecrest', 'Coast Federation', 'Deploy 4G coverage and your first maintenance drone.', { residents: 160, service: 94, tower4g: 1, automations: 1, net: 260 }, 9000),
  mission('portrelay', 'Port Relay', 'Coast Federation', 'Connect this city to your growing regional network.', { residents: 180, service: 94, gateway: 1, regionalLinks: 1, net: 320 }, 10500),
  mission('cinder', 'Cinder District', 'Highland Union', 'Protect a dense network with an active firewall.', { residents: 200, businesses: 3, service: 94, firewall: 1, net: 380 }, 12000),
  mission('pinegrid', 'Pine Grid', 'Highland Union', 'A cleaner mountain economy needs reserve capacity.', { residents: 220, service: 95, cleanShare: 65, battery: 2, net: 400 }, 14000),
  mission('orbitsreach', 'Orbit’s Reach', 'Highland Union', 'Launch a virtual LEO constellation and reach distant neighborhoods.', { residents: 240, service: 95, leo: 1, satelliteCoverage: 50, automations: 2 }, 17500),
  mission('fusionvale', 'Fusion Vale', 'Highland Union', 'Commission a nuclear plant and keep its power productively loaded.', { residents: 260, businesses: 4, service: 95, nuclear: 1, compute: 45 }, 21000),
  mission('neon', 'Neon Heights', 'Aster Commonwealth', 'Build a high-capacity 5G city with balanced cooling.', { residents: 300, service: 96, tower5g: 1, modules: 6, compute: 65 }, 24000),
  mission('crosspoint', 'Crosspoint', 'Aster Commonwealth', 'Let a network planner manage bottlenecks while you expand.', { residents: 330, service: 96, automations: 3, regionalLinks: 3, net: 750 }, 27000),
  mission('suncrown', 'Suncrown', 'Aster Commonwealth', 'Operate a clean and resilient regional capital.', { residents: 360, businesses: 5, service: 97, cleanShare: 85, battery: 3, net: 900 }, 30000),
  mission('starfall', 'Starfall City', 'Aster Commonwealth', 'A mature satellite-and-fiber network links the whole region.', { residents: 400, service: 97, leoTier: 3, regionalLinks: 5, compute: 100 }, 34000),
  mission('meridian', 'Meridian Metro', 'United Arc Regions', 'Coordinate a dense metropolitan utility network.', { residents: 450, businesses: 7, service: 98, tower5g: 2, cleanShare: 80, net: 1300 }, 39000, { width: 32, height: 24, stability: 18 }),
  mission('worldlink', 'Worldlink Capital', 'United Arc Regions', 'Complete the interconnected campaign with efficient, resilient infrastructure.', { residents: 500, businesses: 8, service: 98, regionalLinks: 8, satelliteCoverage: 85, compute: 140, net: 1500 }, 45000, { width: 32, height: 24, stability: 20 }),
];

// Remaining exports below share this schema with the standalone UI:
// state.cells = [{id,type,x,y,tier,health,energy,invested,modules}].
// One building, one power line and one data cable may occupy the same tile.
// Actions mutate state and return {ok,message}; analyze() is read-only.
const SCALE = [0, 1, 1.8, 3];
const DEMAND_SCALE = [0, 1, 1.7, 2.7];
const POP_SCALE = [0, 1, 2, 3.5];
const MODULE_KEYS = Object.keys(MODULES);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const active = cell => cell.health >= 30;
const coordinate = (x, y) => `${x},${y}`;
const result = (ok, message, extra = {}) => ({ ok, message, ...extra });
function log(state, title, message) { state.events.push({ time: state.elapsed, title, message }); if (state.events.length > 40) state.events.shift(); }
function random(state) { state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; }
function cellAt(state, idOrCell, y) {
  if (typeof idOrCell === 'object' && idOrCell) return state.cells.find(cell => cell.id === idOrCell.id);
  if (Number.isInteger(y)) {
    const choices = state.cells.filter(cell => cell.x === idOrCell && cell.y === y);
    return choices.find(cell => BUILDINGS[cell.type].layer === 'building') || choices.find(cell => BUILDINGS[cell.type].layer === 'data') || choices[0];
  }
  return state.cells.find(cell => cell.id === idOrCell);
}
export function isUnlocked(state, type) { return Boolean(BUILDINGS[type] && (state.sandbox || BUILDINGS[type].unlockLevel <= state.levelIndex)); }
export function getUpgradeCost(state, idOrCell) { const cell = cellAt(state, idOrCell); return cell && cell.tier < 3 ? Math.ceil(BUILDINGS[cell.type].cost * (cell.tier === 1 ? .8 : 1.25)) : 0; }
export function getRepairCost(state, idOrCell) { const cell = cellAt(state, idOrCell); return cell && cell.health < 100 ? Math.max(2, Math.ceil(BUILDINGS[cell.type].cost * .4 * (100 - cell.health) / 100)) : 0; }
export function getSellValue(state, idOrCell) { const cell = cellAt(state, idOrCell); return cell ? Math.floor(cell.invested * .5 * (.5 + cell.health / 200)) : 0; }
export function getModuleUpgradeCost(state, idOrCell, key) { const cell = cellAt(state, idOrCell); return cell?.type === 'datacenter' && MODULES[key] && cell.modules[key] < 3 ? Math.ceil(MODULES[key].cost * cell.modules[key]) : 0; }
export function getAutomationUpgradeCost(state, key) { const item = state.automations[key]; return AUTOMATIONS[key] && item && item.tier < 3 ? Math.ceil(AUTOMATIONS[key].cost * .8 * item.tier) : 0; }

function makeCell(state, x, y, type, invested = 0) {
  return { id: state.nextId++, type, x, y, tier: 1, health: 100, energy: type === 'battery' ? BUILDINGS.battery.capacity * .3 : 0, invested, modules: type === 'datacenter' ? { cpu: 1, gpu: 1, storage: 1, cooling: 1 } : {} };
}
export function createGame(levelIndex = 0, { sandbox = false } = {}) {
  levelIndex = clamp(Number.isInteger(levelIndex) ? levelIndex : 0, 0, LEVELS.length - 1);
  const level = LEVELS[levelIndex], width = sandbox ? 32 : level.width, height = sandbox ? 24 : level.height;
  const state = { version: 1, levelIndex, sandbox: Boolean(sandbox), width, height, terrain: [], cells: [], nextId: 1, credits: sandbox ? 25000 : level.startingCredits, elapsed: 0, seed: (739391 + levelIndex * 7187) >>> 0, missionComplete: false, stability: 0, reputation: 60, servicePrice: 1, regionalCities: sandbox ? LEVELS.length - 1 : levelIndex, automations: {}, incident: null, nextEvent: 180 + levelIndex * 7, events: [], stats: { earned: 0, spent: 0, repairs: 0, energyDelivered: 0, dataDelivered: 0 }, _accumulator: 0 };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) state.terrain.push(x === 3 || (x === 4 && y % 7 < 3) ? 'water' : 'land');
  const cx = Math.floor(width / 2), cy = Math.floor(height / 2);
  for (let x = cx - 4; x <= cx + 4; x++) {
    state.cells.push(makeCell(state, x, cy, 'line'));
    state.cells.push(makeCell(state, x, cy, 'cat6'));
  }
  for (const x of [cx - 3, cx - 1, cx + 1, cx + 3]) state.cells.push(makeCell(state, x, cy - 1, 'home'));
  state.cells.push(makeCell(state, cx - 4, cy + 1, 'datacenter'));
  log(state, 'Welcome to Gridworks', 'Place a coal station or renewables beside the yellow starter power line, then a 3G tower beside the orange Cat6 backbone. Homes earn full service income only when power and coverage both work.');
  return state;
}

export function placeBuilding(state, x, y, type) {
  const meta = BUILDINGS[type];
  if (!meta) return result(false, 'Choose a valid building.');
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= state.width || y >= state.height) return result(false, 'Choose a tile inside the city.');
  if (!isUnlocked(state, type)) return result(false, `${meta.name} unlocks in city ${meta.unlockLevel + 1}.`);
  if (state.cells.some(cell => cell.x === x && cell.y === y && BUILDINGS[cell.type].layer === meta.layer)) return result(false, `This tile already has ${meta.layer === 'building' ? 'a building' : `a ${meta.layer} layer`}. Select it to upgrade or sell it.`);
  if (meta.layer === 'building' && state.terrain[y * state.width + x] === 'water') return result(false, 'Buildings need land. Power and data cables can bridge the river.');
  if (type === 'hydro' && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && x + dx < state.width && y + dy >= 0 && y + dy < state.height && state.terrain[(y + dy) * state.width + x + dx] === 'water')) return result(false, 'Hydro stations need a land tile directly beside the river.');
  if (state.credits < meta.cost) return result(false, `Need ${meta.cost} credits to build ${meta.name}.`);
  const cell = makeCell(state, x, y, type, meta.cost);
  state.cells.push(cell); state.credits -= meta.cost; state.stats.spent += meta.cost;
  return result(true, `${meta.name} built.`, { cell, id: cell.id, cost: meta.cost });
}
export function upgradeBuilding(state, idOrX, y) {
  const cell = cellAt(state, idOrX, y);
  if (!cell) return result(false, 'Select an asset to upgrade.');
  if (cell.tier >= 3) return result(false, 'This asset is already at tier 3.');
  if (!state.sandbox && state.levelIndex < cell.tier) return result(false, `Tier ${cell.tier + 1} upgrades unlock in city ${cell.tier + 1}.`);
  const cost = getUpgradeCost(state, cell);
  if (state.credits < cost) return result(false, `Need ${cost} credits for this upgrade.`);
  state.credits -= cost; state.stats.spent += cost; cell.invested += cost; cell.tier++; cell.health = Math.max(cell.health, 75);
  return result(true, `${BUILDINGS[cell.type].name} upgraded to tier ${cell.tier}.`, { cell, cost });
}
export function demolish(state, idOrX, y) {
  const cell = cellAt(state, idOrX, y);
  if (!cell) return result(false, 'Select an asset to sell.');
  const refund = getSellValue(state, cell);
  state.cells.splice(state.cells.indexOf(cell), 1); state.credits += refund;
  return result(true, `${BUILDINGS[cell.type].name} sold for ${refund} credits.`, { refund, id: cell.id });
}
export function repair(state, idOrX, y) {
  const cell = cellAt(state, idOrX, y);
  if (!cell) return result(false, 'Select an asset to repair.');
  if (cell.health === 100) return result(false, 'This asset is already in full condition.');
  const cost = getRepairCost(state, cell);
  if (state.credits < cost) return result(false, `Need ${cost} credits for repairs. Selling an unused asset can release funds.`);
  state.credits -= cost; state.stats.spent += cost; state.stats.repairs++; cell.health = 100;
  return result(true, `${BUILDINGS[cell.type].name} repaired.`, { cell, cost });
}
export function upgradeModule(state, idOrX, key) {
  const cell = cellAt(state, idOrX), module = MODULES[key];
  if (cell?.type !== 'datacenter' || !module) return result(false, 'Choose a data-center hardware module.');
  if (!state.sandbox && state.levelIndex < module.unlockLevel) return result(false, `${module.name} unlocks in city ${module.unlockLevel + 1}.`);
  const cost = getModuleUpgradeCost(state, cell, key);
  if (!cost) return result(false, 'This module is already at tier 3.');
  if (state.credits < cost) return result(false, `Need ${cost} credits for this module.`);
  state.credits -= cost; state.stats.spent += cost; cell.invested += cost; cell.modules[key]++;
  return result(true, `${module.name} upgraded to tier ${cell.modules[key]}. Check cooling and electricity demand.`, { cell, cost });
}
export function buyAutomation(state, key) {
  const meta = AUTOMATIONS[key];
  if (!meta || state.automations[key]) return result(false, 'Choose an automation you do not already own.');
  if (!state.sandbox && state.levelIndex < meta.unlockLevel) return result(false, `${meta.name} unlocks in city ${meta.unlockLevel + 1}.`);
  if (state.credits < meta.cost) return result(false, `Need ${meta.cost} credits for ${meta.name}.`);
  state.credits -= meta.cost; state.stats.spent += meta.cost;
  state.automations[key] = { tier: 1, enabled: true, reserve: 500, timer: 0 };
  return result(true, `${meta.name} purchased. This local rule-based assistant keeps a 500-credit reserve.`, { cost: meta.cost });
}
export function upgradeAutomation(state, key) {
  const cost = getAutomationUpgradeCost(state, key);
  if (!cost) return result(false, 'Buy this assistant first, or it is already tier 3.');
  if (state.credits < cost) return result(false, `Need ${cost} credits to upgrade this assistant.`);
  state.credits -= cost; state.stats.spent += cost; state.automations[key].tier++;
  return result(true, `${AUTOMATIONS[key].name} upgraded to tier ${state.automations[key].tier}.`, { cost });
}
export function configureAutomation(state, key, { enabled, reserve } = {}) {
  const item = state.automations[key];
  if (!item) return result(false, 'Purchase this assistant first.');
  if (enabled !== undefined && typeof enabled !== 'boolean') return result(false, 'Enabled must be true or false.');
  if (reserve !== undefined && (!finite(reserve) || reserve < 0 || reserve > 100000000)) return result(false, 'Choose a valid nonnegative reserve.');
  if (enabled !== undefined) item.enabled = enabled;
  if (reserve !== undefined) item.reserve = Math.round(reserve);
  return result(true, 'Automation settings updated.');
}
export function setServicePrice(state, multiplier) {
  if (!finite(multiplier) || multiplier < .6 || multiplier > 1.5) return result(false, 'Set service pricing between 60% and 150% of the standard rate.');
  state.servicePrice = Math.round(multiplier * 100) / 100;
  return result(true, `Service price set to ${Math.round(state.servicePrice * 100)}%. Higher prices reduce customer adoption.`);
}
export function setRegionalLinks(state, completedCities) {
  if (!Number.isInteger(completedCities) || completedCities < 0 || completedCities >= LEVELS.length) return result(false, 'Choose a valid number of completed regional cities.');
  state.regionalCities = completedCities; return result(true, 'Regional connections updated.');
}

function thermal(cell) {
  const { cpu = 1, gpu = 1, storage = 1, cooling = 1 } = cell.modules;
  const heat = cpu * 18 + gpu * 26 + storage * 10, coolingCapacity = cooling * 75;
  return { heat, coolingCapacity, efficiency: Math.min(1, coolingCapacity / heat) };
}
function demandFor(cell, state) {
  const meta = BUILDINGS[cell.type];
  let need = meta.demand * DEMAND_SCALE[cell.tier];
  if (cell.type === 'datacenter') need += (cell.modules.cpu - 1) * 13 + (cell.modules.gpu - 1) * 26 + (cell.modules.storage - 1) * 8 + (cell.modules.cooling - 1) * 12;
  if (meta.category === 'city' && state.incident?.kind === 'surge' && state.incident.until > state.elapsed) need *= 1.2;
  return active(cell) ? need : 0;
}
function weatherAt(state) {
  const hour = (8 + state.elapsed / 25) % 24;
  const sunlight = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
  const wind = clamp(.55 + .3 * Math.sin(state.elapsed / 71 + state.levelIndex * .71) + .12 * Math.sin(state.elapsed / 29 + 1.2), .18, 1);
  return { hour, sunlight, wind };
}
function generationFor(cell, state, weather) {
  const meta = BUILDINGS[cell.type];
  if (!meta.output || ['battery', 'diesel'].includes(cell.type) || !active(cell)) return 0;
  const variable = cell.type === 'solar' ? weather.sunlight * (state.incident?.kind === 'cloud' && state.incident.until > state.elapsed ? .6 : 1) : cell.type === 'wind' ? weather.wind : cell.type === 'hydro' ? .94 + .06 * Math.sin(state.elapsed / 149) : 1;
  const operator = state.automations.operator;
  return meta.output * SCALE[cell.tier] * cell.health / 100 * variable * (operator?.enabled ? 1 + operator.tier * .025 : 1);
}

function graphFor(state, layer) {
  const nodes = new Map();
  for (const cell of state.cells) {
    const meta = BUILDINGS[cell.type];
    if (!active(cell) || (meta.layer !== 'building' && meta.layer !== layer)) continue;
    const key = coordinate(cell.x, cell.y);
    if (!nodes.has(key)) nodes.set(key, { key, x: cell.x, y: cell.y, cells: [], neighbors: [] });
    nodes.get(key).cells.push(cell);
  }
  for (const node of nodes.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const next = nodes.get(coordinate(node.x + dx, node.y + dy));
    if (next) node.neighbors.push(next);
  }
  const components = [], visited = new Set();
  for (const root of nodes.values()) {
    if (visited.has(root.key)) continue;
    const list = [], queue = [root]; visited.add(root.key);
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i]; list.push(node);
      for (const next of node.neighbors) if (!visited.has(next.key)) { visited.add(next.key); queue.push(next); }
    }
    components.push({ nodes: list, cells: list.flatMap(node => node.cells) });
  }
  return { nodes, components };
}

function dataRoutes(component, sources, statuses) {
  const best = new Map(), queue = [], nodes = new Map(component.nodes.map(node => [node.key, node]));
  for (const source of sources) {
    const node = nodes.get(coordinate(source.x, source.y));
    queue.push({ node, copper: 0, capacity: 1000000 });
  }
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i], identity = `${item.node.key}:${item.copper}`;
    if ((best.get(identity) || 0) >= item.capacity) continue;
    best.set(identity, item.capacity);
    for (const next of item.node.neighbors) {
      const cable = next.cells.find(cell => BUILDINGS[cell.type].layer === 'data');
      const repeater = next.cells.some(cell => ['router', 'switch', 'datacenter'].includes(cell.type) && statuses[cell.id].powered);
      const copper = repeater || cable?.type === 'fiber' ? 0 : item.copper + (cable?.type === 'cat6' ? 1 : 0);
      const maxHops = cable?.type === 'cat6' ? BUILDINGS.cat6.maxHops + (cable.tier - 1) * 6 : 22;
      if (copper > maxHops) continue;
      const capacity = cable ? Math.min(item.capacity, BUILDINGS[cable.type].capacity * SCALE[cable.tier] * cable.health / 100) : item.capacity;
      if ((best.get(`${next.key}:${copper}`) || 0) < capacity) queue.push({ node: next, copper, capacity });
    }
  }
  const output = new Map();
  for (const [key, capacity] of best) { const nodeKey = key.slice(0, key.lastIndexOf(':')); output.set(nodeKey, Math.max(output.get(nodeKey) || 0, capacity)); }
  return output;
}

export function analyze(state) {
  const weather = weatherAt(state), buildings = {}, batteryFlows = {};
  const power = { generation: 0, demand: 0, served: 0, deficit: 0, storage: 0, storageCapacity: 0, capacity: 0, backup: 0 };
  const data = { capacity: 0, demand: 0, served: 0, deficit: 0 };
  let cleanGeneration = 0, emissions = 0, maintenance = 0, compute = 0, heat = 0, cooling = 0;
  let population = 0, servedPopulation = 0, servedBusinesses = 0, totalBusinesses = 0, income = 0, satellitePopulation = 0;
  const operator = state.automations.operator, upkeepFactor = operator?.enabled ? 1 - operator.tier * .05 : 1;
  for (const cell of state.cells) {
    const meta = BUILDINGS[cell.type], demand = demandFor(cell, state);
    buildings[cell.id] = { powered: false, powerFraction: 0, connected: false, dataConnected: false, coverage: 0, served: 0, output: 0, demand, load: 0, capacity: (meta.capacity || 0) * SCALE[cell.tier], health: cell.health, status: active(cell) ? 'Disconnected' : 'Needs repair' };
    power.demand += demand;
    maintenance += meta.maintenance * (1 + (cell.tier - 1) * .55) * (active(cell) ? 1 : .25) * upkeepFactor;
    if (cell.type === 'battery') { power.storage += cell.energy; power.storageCapacity += meta.capacity * SCALE[cell.tier]; }
    if (cell.type === 'home') population += meta.population * POP_SCALE[cell.tier];
    if (cell.type === 'business') totalBusinesses++;
  }
  for (const item of Object.values(state.automations)) maintenance += item.enabled ? item.tier * 3 : 0;

  const powerGraph = graphFor(state, 'power');
  for (const component of powerGraph.components) {
    const cells = component.cells, demand = cells.reduce((sum, cell) => sum + buildings[cell.id].demand, 0);
    const lines = cells.filter(cell => cell.type === 'line');
    const substations = cells.filter(cell => cell.type === 'substation');
    const transfer = lines.length ? Math.min(...lines.map(cell => BUILDINGS.line.capacity * SCALE[cell.tier] * cell.health / 100)) + substations.reduce((sum, cell) => sum + BUILDINGS.substation.capacity * SCALE[cell.tier] * cell.health / 100, 0) : 10000000;
    let generation = 0, componentClean = 0;
    for (const cell of cells) {
      const amount = generationFor(cell, state, weather);
      generation += amount; buildings[cell.id].output = amount;
      if ((BUILDINGS[cell.type].emissions || 0) <= 1) componentClean += amount;
      emissions += amount && BUILDINGS[cell.type].output ? (BUILDINGS[cell.type].emissions || 0) * amount / BUILDINGS[cell.type].output : 0;
    }
    let shortage = Math.max(0, demand - generation);
    for (const cell of cells.filter(cell => cell.type === 'diesel')) {
      const amount = Math.min(shortage, BUILDINGS.diesel.output * SCALE[cell.tier] * cell.health / 100);
      generation += amount; shortage -= amount; power.backup += amount; buildings[cell.id].output = amount;
      if (amount) { maintenance += BUILDINGS.diesel.activeMaintenance * amount / BUILDINGS.diesel.output; emissions += BUILDINGS.diesel.emissions * amount / BUILDINGS.diesel.output; }
    }
    const batteries = cells.filter(cell => cell.type === 'battery');
    let discharge = 0;
    for (const cell of batteries) {
      const amount = Math.min(shortage, cell.energy, BUILDINGS.battery.output * SCALE[cell.tier] * cell.health / 100);
      discharge += amount; shortage -= amount; batteryFlows[cell.id] = -amount; buildings[cell.id].output = amount;
    }
    const connected = generation + discharge > .001;
    let deliverable = Math.min(demand, generation + discharge, transfer);
    const delivered = deliverable;
    // Critical infrastructure first, then residential and commercial loads.
    for (const group of [cells.filter(cell => BUILDINGS[cell.type].category !== 'city'), cells.filter(cell => cell.type === 'home'), cells.filter(cell => cell.type === 'business')]) {
      const needed = group.reduce((sum, cell) => sum + buildings[cell.id].demand, 0);
      const fraction = needed ? Math.min(1, deliverable / needed) : connected ? 1 : 0;
      for (const cell of group) {
        const status = buildings[cell.id]; status.connected = connected;
        status.powerFraction = status.demand ? fraction : connected ? 1 : 0;
        status.powered = status.powerFraction >= .95;
        status.load = status.demand * status.powerFraction;
      }
      deliverable = Math.max(0, deliverable - needed * fraction);
    }
    let excess = Math.max(0, generation - demand);
    for (const cell of batteries) {
      if (batteryFlows[cell.id] < 0) continue;
      const charge = Math.min(excess * .9, BUILDINGS.battery.capacity * SCALE[cell.tier] - cell.energy, BUILDINGS.battery.output * SCALE[cell.tier]);
      batteryFlows[cell.id] = Math.max(0, charge); excess = Math.max(0, excess - charge / .9);
    }
    power.generation += generation; power.served += delivered;
    power.capacity += Math.min(transfer, generation + discharge);
    cleanGeneration += componentClean;
  }
  power.deficit = Math.max(0, power.demand - power.served);

  const dataGraph = graphFor(state, 'data'), pools = [], transmitters = [];
  let activeGateways = 0, activeSatellites = 0;
  for (const component of dataGraph.components) {
    const sources = component.cells.filter(cell => cell.type === 'datacenter' && buildings[cell.id].powered);
    if (!sources.length) continue;
    const routes = dataRoutes(component, sources, buildings);
    const connectedDevices = component.cells.filter(cell => buildings[cell.id].powered && routes.has(coordinate(cell.x, cell.y)));
    const routers = connectedDevices.filter(cell => cell.type === 'router' || cell.type === 'switch');
    const distribution = 100 + routers.reduce((sum, cell) => sum + BUILDINGS[cell.type].capacity * SCALE[cell.tier] * cell.health / 100, 0);
    let sourceCapacity = 0, rawCompute = 0;
    for (const cell of sources) {
      const temp = thermal(cell), capacity = BUILDINGS.datacenter.capacity * SCALE[cell.tier] * cell.modules.cpu * (.75 + .25 * cell.modules.storage) * temp.efficiency * cell.health / 100;
      sourceCapacity += capacity;
      rawCompute += 8 * SCALE[cell.tier] * (cell.modules.cpu + 2 * (cell.modules.gpu - 1) + .5 * (cell.modules.storage - 1)) * temp.efficiency;
      heat += temp.heat; cooling += temp.coolingCapacity;
      buildings[cell.id].capacity = capacity; buildings[cell.id].heat = temp.heat; buildings[cell.id].cooling = temp.coolingCapacity; buildings[cell.id].thermalEfficiency = temp.efficiency;
    }
    const firewalls = connectedDevices.filter(cell => cell.type === 'firewall');
    const protection = Math.min(.95, firewalls.reduce((sum, cell) => sum + cell.tier * .32, 0));
    const cyberFactor = state.incident?.kind === 'cyber' && state.incident.until > state.elapsed ? 1 - .5 * (1 - protection) : 1;
    const pool = { capacity: Math.min(sourceCapacity, distribution) * cyberFactor, remaining: 0, compute: rawCompute, used: 0 };
    pool.remaining = pool.capacity; pools.push(pool);
    for (const cell of component.cells) {
      const route = routes.get(coordinate(cell.x, cell.y)) || 0, status = buildings[cell.id], meta = BUILDINGS[cell.type];
      status.dataConnected = route > 0 && (meta.layer !== 'building' || status.powered);
      status.linkSpeed = Number.isFinite(route) ? Math.min(route, pool.capacity) : pool.capacity;
      if (!status.dataConnected) continue;
      if (cell.type === 'gateway') { activeGateways += cell.tier; status.served = 1; }
      if (cell.type === 'leo') activeSatellites += cell.tier;
      if (meta.radius) {
        const capacity = Math.min(meta.capacity * SCALE[cell.tier] * cell.health / 100, route);
        transmitters.push({ cell, pool, capacity, remaining: capacity, radius: meta.radius + (cell.type === 'leo' ? 0 : cell.tier - 1) * .8 });
        status.capacity = capacity; status.radius = meta.radius + (cell.type === 'leo' ? 0 : cell.tier - 1) * .8;
      }
    }
  }

  const clients = state.cells.filter(cell => BUILDINGS[cell.type].category === 'city').sort((a, b) => (a.type === 'home' ? 0 : 1) - (b.type === 'home' ? 0 : 1) || a.id - b.id);
  for (const cell of clients) {
    const meta = BUILDINGS[cell.type], status = buildings[cell.id], need = meta.dataDemand * DEMAND_SCALE[cell.tier];
    data.demand += need;
    const candidates = transmitters.filter(tower => Math.hypot(tower.cell.x - cell.x, tower.cell.y - cell.y) <= tower.radius).sort((a, b) => (a.cell.type === 'leo' ? 1 : 0) - (b.cell.type === 'leo' ? 1 : 0) || a.cell.id - b.cell.id);
    let remaining = status.powerFraction > 0 && active(cell) ? need : 0;
    const eligible = remaining;
    for (const tower of candidates) {
      const amount = Math.min(remaining, tower.remaining, tower.pool.remaining);
      tower.remaining -= amount; tower.pool.remaining -= amount; tower.pool.used += amount; remaining -= amount;
      buildings[tower.cell.id].load += amount;
    }
    const servedData = eligible - remaining;
    data.served += servedData;
    status.coverage = need ? servedData / need : 0;
    status.served = status.coverage * status.powerFraction;
    status.dataLoad = servedData; status.dataDemand = need;
    status.satelliteCovered = status.powered && candidates.some(tower => tower.cell.type === 'leo' && tower.capacity >= need && tower.pool.capacity >= need);
    const pop = cell.type === 'home' ? meta.population * POP_SCALE[cell.tier] : 0;
    servedPopulation += pop * status.served;
    if (status.satelliteCovered) satellitePopulation += pop;
    if (cell.type === 'business') servedBusinesses += status.served;
    income += meta.income * SCALE[cell.tier] * status.served;
  }
  data.capacity = Math.min(pools.reduce((sum, pool) => sum + pool.capacity, 0), transmitters.reduce((sum, tower) => sum + tower.capacity, 0));
  data.deficit = Math.max(0, data.demand - data.served);
  compute = pools.reduce((sum, pool) => sum + pool.compute * Math.min(1, pool.used / 20), 0);
  const service = population + totalBusinesses * 10 ? (servedPopulation + servedBusinesses * 10) / (population + totalBusinesses * 10) * 100 : 0;
  const adoption = (.75 + state.reputation / 400) * Math.max(.5, 1 - Math.max(0, state.servicePrice - 1) * .7);
  income *= state.servicePrice * adoption;
  const regionalLinks = Math.min(state.regionalCities, activeGateways * 2 + activeSatellites * 3);
  const intercityIncome = regionalLinks * 22 * Math.min(1, service / 80);
  const computeIncome = compute * 1.3;
  income += intercityIncome + computeIncome;
  for (const cell of state.cells) {
    const status = buildings[cell.id], meta = BUILDINGS[cell.type];
    if (!active(cell)) status.status = 'Needs repair';
    else if (meta.layer === 'data') status.status = status.dataConnected ? `Data linked · ${Math.round(status.linkSpeed)} Mbps` : 'No data backbone';
    else if (meta.layer === 'power') status.status = status.connected ? 'Grid connected' : 'No power source';
    else if (meta.output && cell.type !== 'battery') status.status = status.output > 0 ? 'Generating' : cell.type === 'diesel' ? 'On standby' : 'Waiting for resource';
    else if (!status.powered) status.status = status.connected ? 'Power shortage' : 'No power connection';
    else if (meta.category === 'city') status.status = status.served >= .95 ? 'Customers served' : status.coverage > 0 ? 'Bandwidth shortage' : 'No mobile coverage';
    else if (meta.category === 'network') status.status = status.dataConnected ? (status.thermalEfficiency < .99 ? 'Heat throttling' : 'Online') : 'No data backbone';
    else status.status = 'Operating';
  }
  return { buildings, power, data, weather, batteryFlows, coverage: data.demand ? data.served / data.demand * 100 : 0, service, population, servedPopulation, businesses: totalBusinesses, servedBusinesses, customers: Math.round((servedPopulation + servedBusinesses * 10) * adoption), income, revenue: income, maintenance, net: income - maintenance, emissions, cleanShare: power.generation ? cleanGeneration / power.generation * 100 : 0, regionalLinks, satelliteCoverage: population ? satellitePopulation / population * 100 : 0, compute, computeIncome, intercityIncome, heat, cooling, reliability: Math.min(power.demand ? power.served / power.demand : 1, data.demand ? data.served / data.demand : 1) * 100 };
}

const OBJECTIVE_NAMES = { residents: 'Residents housed', businesses: 'Business districts', service: 'Fully delivered service (%)', net: 'Operating profit / minute', modules: 'Hardware module upgrades', compute: 'Compute services online', cleanShare: 'Clean generation (%)', regionalLinks: 'Intercity connections', satelliteCoverage: 'Satellite coverage (%)', leoTier: 'LEO constellation tier', automations: 'Automation assistants' };
function baseObjectives(state, report = analyze(state)) {
  if (state.sandbox) return [];
  const targets = LEVELS[state.levelIndex].targets;
  return Object.entries(targets).map(([key, target]) => {
    let current;
    if (key === 'residents') current = report.population;
    else if (key === 'modules') current = state.cells.filter(cell => cell.type === 'datacenter').reduce((sum, cell) => sum + MODULE_KEYS.reduce((total, name) => total + cell.modules[name] - 1, 0), 0);
    else if (key === 'automations') current = Object.keys(state.automations).length;
    else if (key === 'leoTier') current = Math.max(0, ...state.cells.filter(cell => cell.type === 'leo' && report.buildings[cell.id].dataConnected).map(cell => cell.tier));
    else if (Object.hasOwn(report, key)) current = report[key];
    else current = state.cells.filter(cell => cell.type === key && active(cell) && (BUILDINGS[key]?.layer !== 'building' || report.buildings[cell.id].powered)).length;
    return { id: key, label: OBJECTIVE_NAMES[key] || `${BUILDINGS[key]?.name || key} online`, current, target, complete: current + 1e-6 >= target };
  });
}
export function getObjectives(state) {
  if (state.sandbox) return [];
  return [...baseObjectives(state), { id: 'stability', label: 'Hold all targets (seconds)', current: state.stability, target: LEVELS[state.levelIndex].stability, complete: state.stability >= LEVELS[state.levelIndex].stability }];
}

function automationTick(state, report) {
  for (const [key, item] of Object.entries(state.automations)) {
    if (!item.enabled) continue;
    item.timer++;
    const interval = Math.max(8, Math.round((key === 'planner' ? 45 : 25) / item.tier));
    if (item.timer < interval) continue;
    item.timer = 0;
    if (key === 'maintenance') {
      const candidates = [...state.cells].filter(cell => cell.health < 85).sort((a, b) => a.health - b.health || a.id - b.id);
      const cell = candidates.find(asset => state.credits - getRepairCost(state, asset) >= item.reserve);
      if (cell) { repair(state, cell.id); log(state, 'Maintenance drone', `${BUILDINGS[cell.type].name} repaired automatically. Budget reserve preserved.`); }
    } else if (key === 'planner' && report.data.deficit > 1) {
      const candidates = state.cells.filter(cell => BUILDINGS[cell.type].layer === 'data' && cell.tier < 3).sort((a, b) => a.tier - b.tier || a.id - b.id);
      const cell = candidates.find(asset => state.credits - getUpgradeCost(state, asset) >= item.reserve);
      if (cell) { upgradeBuilding(state, cell.id); log(state, 'Network planner', `${BUILDINGS[cell.type].name} upgraded automatically while data demand exceeded service.`); }
    }
  }
}
function incidentTick(state) {
  if (state.incident && state.elapsed >= state.incident.until) { log(state, 'Conditions restored', 'The temporary disruption has passed. Damaged assets can still be repaired.'); state.incident = null; }
  if (state.levelIndex < 2 || state.elapsed < state.nextEvent) return;
  state.nextEvent = state.elapsed + 180 + Math.floor(random(state) * 90);
  const choice = Math.floor(random(state) * (state.levelIndex >= 8 ? 4 : 3));
  if (choice === 0) {
    const candidates = state.cells.filter(cell => active(cell) && BUILDINGS[cell.type].category !== 'city');
    const affected = Math.min(3, candidates.length);
    for (let i = 0; i < affected; i++) {
      const index = Math.floor(random(state) * candidates.length), cell = candidates.splice(index, 1)[0];
      cell.health = Math.max(15, cell.health - (24 + Math.floor(random(state) * 18)));
    }
    log(state, 'Storm maintenance alert', `${affected} infrastructure assets need inspection. Nothing was demolished; repairs and reserve power restore service.`);
  } else {
    const kind = ['storm', 'cloud', 'surge', 'cyber'][choice];
    state.incident = { kind, until: state.elapsed + 45 };
    log(state, kind === 'cloud' ? 'Cloud bank' : kind === 'surge' ? 'Peak demand' : 'Network security incident', kind === 'cloud' ? 'Solar output is reduced for 45 seconds. Firm generation and batteries can cover the gap.' : kind === 'surge' ? 'City electricity demand rises 20% for 45 seconds. Reserve capacity keeps customers connected.' : 'Backbone throughput is reduced for 45 seconds. Powered firewalls reduce the impact.');
  }
}
export function tick(state, dt = 1) {
  if (!finite(dt) || dt < 0 || dt > 300) return result(false, 'Simulation steps must be between zero and 300 seconds.');
  const before = state.missionComplete, eventCount = state.events.length;
  state._accumulator += dt;
  while (state._accumulator >= 1 - 1e-9) {
    state._accumulator = Math.max(0, state._accumulator - 1);
    const report = analyze(state);
    for (const cell of state.cells) if (cell.type === 'battery') cell.energy = clamp(cell.energy + (report.batteryFlows[cell.id] || 0), 0, BUILDINGS.battery.capacity * SCALE[cell.tier]);
    const change = report.net / 60;
    state.credits = clamp(state.credits + change, 0, 1000000000);
    state.stats.earned += report.income / 60; state.stats.spent += report.maintenance / 60;
    state.stats.energyDelivered += report.power.served; state.stats.dataDelivered += report.data.served;
    state.reputation = clamp(state.reputation + (report.service >= 95 ? .035 : report.service >= 70 ? .01 : -.035) - Math.max(0, state.servicePrice - 1.2) * .02, 0, 100);
    if (!state.sandbox && !state.missionComplete) state.stability = baseObjectives(state, report).every(objective => objective.complete) ? state.stability + 1 : 0;
    state.elapsed++; automationTick(state, report); incidentTick(state);
    if (!state.sandbox && !state.missionComplete && state.stability >= LEVELS[state.levelIndex].stability) {
      state.missionComplete = true;
      const bonus = 500 + state.levelIndex * 100; state.credits = Math.min(1000000000, state.credits + bonus);
      log(state, 'City complete', `${LEVELS[state.levelIndex].name} is connected. ${bonus} credits awarded. The next campaign city is ready.`);
    }
  }
  return result(true, !before && state.missionComplete ? 'Mission complete! The next city is unlocked.' : '', { completed: !before && state.missionComplete, newEvents: state.events.slice(eventCount) });
}

export function serialize(state) { return JSON.stringify(state); }
export function restoreGame(input) {
  const state = typeof input === 'string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input));
  const require = (condition, message) => { if (!condition) throw new Error(`Invalid Gridworks save: ${message}`); };
  require(state && state.version === 1, 'unsupported version.');
  require(Number.isInteger(state.levelIndex) && state.levelIndex >= 0 && state.levelIndex < LEVELS.length, 'unknown campaign city.');
  require(typeof state.sandbox === 'boolean' && Number.isInteger(state.width) && state.width >= 24 && state.width <= 32 && Number.isInteger(state.height) && state.height >= 18 && state.height <= 24, 'invalid city dimensions.');
  require(Array.isArray(state.terrain) && state.terrain.length === state.width * state.height && state.terrain.every(tile => tile === 'land' || tile === 'water'), 'invalid terrain.');
  for (const key of ['credits', 'elapsed', 'stability', 'reputation', 'servicePrice', 'nextEvent', '_accumulator']) require(finite(state[key]) && state[key] >= 0, `invalid ${key}.`);
  require(state.credits <= 1000000000 && state.elapsed <= 1000000000 && state.reputation <= 100 && state.servicePrice >= .6 && state.servicePrice <= 1.5 && state._accumulator < 1, 'numeric value outside its limit.');
  require(Number.isInteger(state.seed) && state.seed >= 0 && state.seed <= 4294967295 && Number.isSafeInteger(state.nextId) && state.nextId > 0, 'invalid simulation seed or identifier.');
  require(Number.isInteger(state.regionalCities) && state.regionalCities >= 0 && state.regionalCities < LEVELS.length && typeof state.missionComplete === 'boolean', 'invalid campaign state.');
  require(Array.isArray(state.cells) && state.cells.length <= state.width * state.height * 3, 'invalid asset list.');
  const ids = new Set(), layers = new Set();
  for (const cell of state.cells) {
    require(cell && Object.hasOwn(BUILDINGS, cell.type), 'unknown building.');
    require(Number.isSafeInteger(cell.id) && cell.id > 0 && cell.id < state.nextId && !ids.has(cell.id), 'duplicate or invalid asset ID.'); ids.add(cell.id);
    require(Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.x < state.width && cell.y >= 0 && cell.y < state.height, 'asset outside the city.');
    const key = `${cell.x},${cell.y},${BUILDINGS[cell.type].layer}`;
    require(!layers.has(key), 'two assets occupy the same layer.'); layers.add(key);
    require(Number.isInteger(cell.tier) && cell.tier >= 1 && cell.tier <= 3 && finite(cell.health) && cell.health >= 0 && cell.health <= 100, 'invalid asset tier or condition.');
    require(finite(cell.energy) && cell.energy >= 0 && cell.energy <= (cell.type === 'battery' ? BUILDINGS.battery.capacity * SCALE[cell.tier] : 0), 'invalid stored energy.');
    require(finite(cell.invested) && cell.invested >= 0 && cell.invested <= 1000000000, 'invalid investment.');
    require(cell.modules && typeof cell.modules === 'object' && !Array.isArray(cell.modules), 'invalid hardware modules.');
    if (cell.type === 'datacenter') require(MODULE_KEYS.every(key => Number.isInteger(cell.modules[key]) && cell.modules[key] >= 1 && cell.modules[key] <= 3) && Object.keys(cell.modules).every(key => MODULE_KEYS.includes(key)), 'invalid hardware tier.');
    else require(Object.keys(cell.modules).length === 0, 'modules belong only to data centers.');
  }
  require(state.automations && typeof state.automations === 'object' && !Array.isArray(state.automations), 'invalid automation settings.');
  for (const [key, item] of Object.entries(state.automations)) require(Object.hasOwn(AUTOMATIONS, key) && item && Number.isInteger(item.tier) && item.tier >= 1 && item.tier <= 3 && typeof item.enabled === 'boolean' && finite(item.reserve) && item.reserve >= 0 && item.reserve <= 100000000 && finite(item.timer) && item.timer >= 0 && item.timer <= 1000, 'invalid automation settings.');
  require(state.stats && ['earned', 'spent', 'repairs', 'energyDelivered', 'dataDelivered'].every(key => finite(state.stats[key]) && state.stats[key] >= 0), 'invalid statistics.');
  require(state.incident === null || (state.incident && ['cloud', 'surge', 'cyber'].includes(state.incident.kind) && finite(state.incident.until) && state.incident.until >= 0), 'invalid incident.');
  require(Array.isArray(state.events) && state.events.length <= 40 && state.events.every(event => event && finite(event.time) && event.time >= 0 && typeof event.title === 'string' && event.title.length <= 200 && typeof event.message === 'string' && event.message.length <= 1000), 'invalid event history.');
  return state;
}
