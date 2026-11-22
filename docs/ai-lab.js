/**
 * The AI, machine learning and system design lab.
 *
 * The Code Lab teaches HTML, CSS and JavaScript in the browser. This course
 * teaches the other side of the trade: Python for the models that sit behind
 * an API, and the design decisions that keep a system honest once it is in
 * production.
 *
 * Two kinds of exercise live here:
 *
 *   - **Python exercises** run in a browser sandbox. There is no Python
 *     interpreter in a web page, so the course ships a small interpreter for
 *     the subset of Python the exercises need. It is deliberately small: it
 *     understands the handful of statements the course teaches, and nothing
 *     else.
 *   - **Design exercises** are answered in prose. There is no way to check
 *     "did you think about the failure modes" with a regex, so the lab looks
 *     for the ideas the exercise is about and tells the reader which one is
 *     missing.
 *
 * Everything runs locally. Nothing is sent to a server, so the course works
 * on GitHub Pages and works offline once the page has been visited.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

import { createRequestsModule } from './ai-api.js';
import { createSqliteModule } from './ai-sql.js';

/** Where the AI course lives. */
export const AI_COURSE_URL = './data/ai-course.json';

/** The key used to remember which AI exercises have been solved. */
export const AI_COURSE_KEY = 'imon-ai-lab-v1';

/**
 * The Python subset the interpreter understands.
 *
 * Every keyword the interpreter knows is listed here, and the interpreter
 * refuses anything it does not recognise rather than guessing. That keeps a
 * typo from silently becoming a no-op.
 */
export const PYTHON_KEYWORDS = [
  'def', 'return', 'if', 'elif', 'else', 'for', 'in', 'while',
  'import', 'from', 'as', 'class', 'pass', 'break', 'continue',
  'and', 'or', 'not', 'None', 'True', 'False', 'lambda', 'with', 'try', 'except'
];

/**
 * The built-in names the interpreter provides.
 *
 * These stand in for the parts of Python the standard library would supply
 * for the exercises in the course: the `math` functions, the `print` output,
 * and a small `re` helper.
 */
export const PYTHON_BUILTINS = [
  'print', 'len', 'range', 'abs', 'min', 'max', 'sum', 'round', 'sorted',
  'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'enumerate',
  'zip', 'reversed', 'any', 'all', 'isinstance', 'type', 'map', 'filter',
  'sqrt', 'log', 'log2', 'exp', 'pow', 'mean', 'median', 'std'
];

/**
 * Split a line of Python into its tokens.
 *
 * The tokenizer is small but it does the two things that matter: it keeps
 * string literals intact, and it drops comments. Without that a `#` inside a
 * string would cut the line in half.
 */
export function tokenizePython(source) {
  const tokens = [];
  const text = String(source || '');
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '#') {
      // A comment runs to the end of the line.
      while (index < text.length && text[index] !== '\n') index++;
      continue;
    }
    if (char === '"' || char === "'") {
      // A string literal, with either quote style.
      const quote = char;
      let value = '';
      index++;
      while (index < text.length && text[index] !== quote) {
        if (text[index] === '\\' && index + 1 < text.length) {
          const escape = text[index + 1];
          value += escape === 'n' ? '\n' : escape === 't' ? '\t' : escape;
          index += 2;
          continue;
        }
        value += text[index++];
      }
      index++;
      tokens.push({ type: 'string', value });
      continue;
    }
    if (/\s/.test(char)) { index++; continue; }
    if (/[0-9]/.test(char)) {
      let number = '';
      while (index < text.length && /[0-9.]/.test(text[index])) number += text[index++];
      tokens.push({ type: 'number', value: Number(number) });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let name = '';
      while (index < text.length && /[A-Za-z0-9_]/.test(text[index])) name += text[index++];
      tokens.push({ type: 'name', value: name });
      continue;
    }
    // Punctuation and operators.
    const two = text.slice(index, index + 2);
    if (['==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '//', '**'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      index += 2;
      continue;
    }
    tokens.push({ type: 'op', value: char });
    index++;
  }
  return tokens;
}

/**
 * Parse the token stream into a list of statements.
 *
 * The parser handles one statement per line, which is enough for a teaching
 * course and keeps every exercise readable. A line that opens a block is
 * marked as such so the interpreter can find its body.
 */
export function parsePython(source) {
  const lines = String(source || '').split('\n');
  const statements = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const tokens = tokenizePython(line);
    if (!tokens.length) continue;
    const indent = raw.length - raw.trimStart().length;
    const head = tokens[0];
    const opensBlock = ['def', 'if', 'elif', 'else', 'for', 'while', 'class', 'try', 'except', 'with'].includes(head.value);
    statements.push({ indent, opensBlock, tokens, source: line });
  }
  return statements;
}

/**
 * The index of the colon that ends a statement header.
 *
 * The colon has to sit at the top level: the one in `d["a:b"]` belongs to
 * the string, not to the statement. Returns -1 when the line has no such
 * colon, which the caller treats as a malformed line.
 */
function headerColon(tokens, from = 0) {
  let depth = 0;
  for (let i = from; i < tokens.length; i++) {
    const value = tokens[i].value;
    if (value === '(' || value === '[' || value === '{') depth++;
    else if (value === ')' || value === ']' || value === '}') depth--;
    else if (value === ':' && depth === 0) return i;
  }
  return -1;
}

/**
 * The parameters of a `def`, with their default values.
 *
 * Each parameter comes back as `{ name, default }`, where `default` is
 * null when the parameter has no default. A default is only used when the
 * caller leaves the argument out, and a keyword argument overrides it.
 *
 * The name is read off the front of the parameter and the default is
 * everything after the `=`, so a default can be any expression: a number,
 * a string, a list or even a call.
 *
 * The tokens are the ones between the brackets. The brackets themselves
 * are dropped first, because a default may itself contain brackets and
 * the depth has to start at zero for the commas to be found.
 */
function parseParameters(tokens) {
  let inner = tokens;
  // Drop the brackets around the parameter list, if they are there.
  if (inner.length && inner[0].value === '(' && inner[inner.length - 1].value === ')') {
    inner = inner.slice(1, -1);
  }

  const parameters = [];
  let depth = 0;
  let current = null;
  let afterEquals = false;

  for (const token of inner) {
    const value = token.value;
    if (value === '(' || value === '[' || value === '{') depth++;
    else if (value === ')' || value === ']' || value === '}') depth--;

    if (depth === 0 && value === ',') {
      if (current) parameters.push(current);
      current = null;
      afterEquals = false;
      continue;
    }
    // A `*` marks the parameters that take extra arguments. The teaching
    // code does not use them, so they are skipped.
    if (depth === 0 && value === '*') continue;

    if (!current) {
      if (token.type !== 'name') continue;
      current = { name: token.value, default: null };
      afterEquals = false;
      continue;
    }

    if (depth === 0 && value === '=' && !afterEquals) {
      // The default starts after the `=`. The tokens are kept so the
      // default is evaluated in the caller's scope at call time.
      afterEquals = true;
      current.default = [];
      continue;
    }

    // Everything after the `=` is the default expression.
    if (afterEquals) current.default.push(token);
  }

  if (current) parameters.push(current);
  return parameters;
}

/**
 * The indent of the first line of each top-level statement.
 *
 * The interpreter uses this to find the body of a `def` or an `if`.
 */
export function blockBody(statements, index) {
  const base = statements[index].indent;
  const body = [];
  for (let i = index + 1; i < statements.length; i++) {
    if (statements[i].indent <= base) break;
    body.push(statements[i]);
  }
  return body;
}

/**
 * Split a token list on the commas that sit at the top level.
 *
 * A comma inside brackets belongs to a list or a call, so the scan keeps
 * track of how deep it is. This is what lets `print(f(1, 2), 3)` reach the
 * function with two arguments and the print with two.
 */
export function splitArguments(tokens) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tokens.length; i++) {
    const value = tokens[i].value;
    if (value === '(' || value === '[' || value === '{') depth++;
    else if (value === ')' || value === ']' || value === '}') depth--;
    else if (value === ',' && depth === 0) {
      parts.push(tokens.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(tokens.slice(start));
  return parts.filter(part => part.length);
}

/**
 * Is this argument a keyword argument — `name=value`?
 *
 * A `=` only counts as a keyword when it is the second token of the
 * argument and the first one is a name, because `==` is a different token
 * and `x == 1` is a comparison, not a keyword.
 */
function isKeywordArgument(part) {
  return part.length >= 2 && part[0].type === 'name' && part[1].value === '=';
}

/**
 * Split a call's arguments into positional parts and keyword parts.
 *
 * A keyword argument is written `name=value`. The value is left as tokens
 * so it can be evaluated where the call happens, with the caller's scope.
 */
function splitCallArguments(parts) {
  const positional = [];
  const keywords = [];
  for (const part of parts) {
    if (isKeywordArgument(part)) {
      keywords.push({ name: part[0].value, tokens: part.slice(2) });
      continue;
    }
    positional.push(part);
  }
  return { positional, keywords };
}

/**
 * The index of the token that closes the bracket opened before `from`.
 *
 * Returns -1 when the brackets never close, which the caller treats as a
 * malformed line rather than a crash.
 */
function matchingBracket(tokens, from) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  let depth = 0;
  for (let i = from; i < tokens.length; i++) {
    const value = tokens[i].value;
    if (pairs[value]) depth++;
    else if (value === ')' || value === ']' || value === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Evaluate the Python subset and collect the printed lines.
 *
 * Returns `{ output, error }`. An error is a message the learner can act
 * on, never a stack trace: the interpreter is a teaching tool, so it says
 * what went wrong in plain words.
 */
export function runPython(source, options = {}) {
  const output = [];
  const maxSteps = options.maxSteps || 20000;
  // A phone is far slower than a laptop, so a step count alone would stop a
  // legitimate program on a small device. The clock is the real limit; the
  // step count is a second guard that catches a runaway loop on a fast
  // machine before the user waits for the clock to run out.
  const maxMillis = options.maxMillis || 2000;
  const now = options.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const started = now();
  let steps = 0;
  const runtime = {
    output,
    maxSteps,
    steps: () => {
      steps++;
      if (steps % 256 === 0 && now() - started > maxMillis) throw new Error('This program runs for too long. Check the loop.');
      return steps;
    }
  };
  const scope = { globals: Object.create(null), runtime };
  const builtins = createBuiltins(output, options.math, createModuleScope());

  try {
    const statements = parsePython(source);
    executeBlock(statements, scope, builtins, runtime);
  } catch (error) {
    // A `return` outside a function has no value to hand back, so it is
    // reported as a plain message rather than crashing the page.
    return { output, error: error?.message || 'This program stopped unexpectedly.' };
  }
  return { output, error: null };
}

/**
 * The `math` module the course imports.
 *
 * The names are the ones an AI course actually reaches for: the logarithm
 * and the exponent for a softmax, and the square root for a norm.
 */
export const MATH_MODULE = {
  exp: value => Math.exp(value),
  log: value => Math.log(value),
  log2: value => Math.log2(value),
  sqrt: value => Math.sqrt(value),
  pow: (a, b) => Math.pow(a, b),
  fabs: value => Math.abs(value),
  floor: value => Math.floor(value),
  ceil: value => Math.ceil(value),
  pi: Math.PI,
  e: Math.E
};

/**
 * The standard-library-ish names the interpreter provides.
 */
function createBuiltins(output, math, modules) {
  const values = {
    len: value => (value == null ? 0 : value.length),
    abs: value => Math.abs(value),
    min: (...args) => (args.length === 1 ? Math.min(...args[0]) : Math.min(...args)),
    max: (...args) => (args.length === 1 ? Math.max(...args[0]) : Math.max(...args)),
    sum: value => {
      // A string is iterable, but Python refuses to add up its
      // characters, so the check has to happen before the loop.
      if (typeof value === 'string') {
        throw new Error("sum() does not take a string. Use len() to count it.");
      }
      if (Array.isArray(value)) return value.reduce((a, b) => a + b, 0);
      // `sum` also takes any iterable, and a generator is the usual way
      // to write one in Python.
      if (value && typeof value[Symbol.iterator] === 'function') {
        let total = 0;
        for (const item of value) total += item;
        return total;
      }
      return 0;
    },
    round: (value, digits = 0) => {
      const factor = Math.pow(10, digits);
      return Math.round(value * factor) / factor;
    },
    sorted: (value, ...rest) => {
      // `sorted(x, reverse=True)` is the usual way to get the biggest
      // values first, so the keyword is honoured.
      const named = rest[rest.length - 1];
      const reverse = named && typeof named === 'object' && 'reverse' in named
        ? Boolean(named.reverse)
        : false;
      const sorted = [...value].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      return reverse ? sorted.reverse() : sorted;
    },
    int: value => Math.trunc(Number(value)),
    float: value => Number(value),
    str: value => (value == null ? 'None' : String(value)),
    bool: value => Boolean(value),
    list: value => [...(value || [])],
    range: (...args) => {
      const [start, stop, step] = args.length === 1 ? [0, args[0], 1] : args.length === 2 ? [args[0], args[1], 1] : args;
      const out = [];
      for (let i = start; step > 0 ? i < stop : i > stop; i += step) out.push(i);
      return out;
    },
    enumerate: value => [...(value || [])].map((item, index) => [index, item]),
    zip: (...lists) => lists[0].map((_, index) => lists.map(list => list[index])),
    reversed: value => [...(value || [])].reverse(),
    any: value => (value || []).some(Boolean),
    all: value => (value || []).every(Boolean),
    type: value => Array.isArray(value) ? 'list' : typeof value,
    map: (fn, list) => (list || []).map(fn),
    filter: (fn, list) => (list || []).filter(fn),
    sqrt: value => Math.sqrt(value),
    log: value => Math.log(value),
    log2: value => Math.log2(value),
    exp: value => Math.exp(value),
    pow: (a, b) => Math.pow(a, b),
    mean: value => (value || []).reduce((a, b) => a + b, 0) / ((value || []).length || 1),
    median: value => {
      const sorted = [...(value || [])].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },
    std: value => {
      const list = value || [];
      const mean = list.reduce((a, b) => a + b, 0) / (list.length || 1);
      return Math.sqrt(list.reduce((a, b) => a + (b - mean) ** 2, 0) / (list.length || 1));
    }
  };
  if (math) Object.assign(values, math);
  values.print = (...args) => { output.push(args.map(value => formatValue(value)).join(' ')); };
  // The learning modules ride along with the builtins, so the `import`
  // statement can bind them into the program's scope.
  if (modules) {
    values.requests = modules.requests;
    values.sqlite3 = modules.sqlite3;
  }
  return values;
}

/**
 * The learning modules a program can import.
 *
 * `requests` is a fake HTTP client and `sqlite3` is an in-memory database.
 * Both are bound per run, so two programs never share their state.
 */
function createModuleScope() {
  return {
    requests: createRequestsModule(),
    sqlite3: createSqliteModule()
  };
}

/**
 * A number that came out of a division.
 *
 * Python keeps whole numbers and floating point numbers apart, so `4 / 2`
 * prints `2.0` and not `2`. JavaScript has one number type, so the
 * division is marked and the marker is read back when the value is
 * printed.
 */
function asFloat(value) {
  return { __float: true, value: Number(value) };
}

/**
 * Is a value one of the marked floats?
 */
function isFloat(value) {
  return Boolean(value && typeof value === 'object' && value.__float);
}

/**
 * The plain number behind a value, marked float or not.
 */
function numberOf(value) {
  return isFloat(value) ? value.value : value;
}

/**
 * Turn a value into the text `print` would show.
 *
 * Strings are shown bare at the top level, the way `print` shows them, but
 * quoted inside a list or a dictionary, the way Python repr does.
 */
export function formatValue(value, quoted = false) {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'string') return quoted ? `'${value}'` : value;
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (isFloat(value)) {
    const number = value.value;
    return Number.isInteger(number) ? `${number}.0` : String(number);
  }
  if (Array.isArray(value)) return `[${value.map(item => formatValue(item, true)).join(', ')}]`;
  if (typeof value === 'object') return `{${Object.entries(value).map(([k, v]) => `'${k}': ${formatValue(v, true)}`).join(', ')}}`;
  return String(value);
}

/**
 * Run a list of statements in a scope.
 */
function executeBlock(statements, scope, builtins, runtime) {
  let index = 0;
  while (index < statements.length) {
    if (runtime.steps() > runtime.maxSteps) throw new Error('This program runs for too long. Check the loop.');
    index = executeStatement(statements, index, scope, builtins, runtime);
  }
}

/**
 * The index of the statement after a block header's body.
 *
 * A `def` or an `if` owns the lines that follow it until the indentation
 * comes back to the header's level. The interpreter has to step over that
 * whole run when it walks a block, otherwise the body would run twice:
 * once when the header is handled and again as if it were a statement of
 * its own.
 */
function afterBody(statements, index) {
  const base = statements[index].indent;
  let next = index + 1;
  while (next < statements.length && statements[next].indent > base) next++;
  return next;
}

/**
 * The index of the statement after a whole `if` / `elif` / `else` chain.
 *
 * A branch that runs has to step over the branches that follow it, or the
 * `else` would run as well and undo the answer the `if` gave.
 */
function afterChain(statements, index) {
  let next = afterBody(statements, index);
  while (next < statements.length && statements[next].indent === statements[index].indent
    && ['elif', 'else'].includes(statements[next].tokens[0].value)) {
    next = afterBody(statements, next);
  }
  return next;
}

/**
 * Run one statement and return the index of the next one.
 */
function executeStatement(statements, index, scope, builtins, runtime) {
  const statement = statements[index];
  const tokens = statement.tokens;
  const head = tokens[0];

  if (head.value === 'def') {
    const name = tokens[1].value;
    const colon = headerColon(tokens, 2);
    const parameters = parseParameters(tokens.slice(2, colon < 0 ? tokens.length : colon));
    scope.globals[name] = { __function: true, parameters, body: blockBody(statements, index) };
    return afterBody(statements, index);
  }

  if (head.value === 'if' || head.value === 'elif') {
    const colon = headerColon(tokens, 1);
    const condition = evaluateExpression(tokens.slice(1, colon < 0 ? tokens.length : colon), scope, builtins);
    const body = blockBody(statements, index);
    if (truthy(condition)) {
      executeBlock(body, scope, builtins, runtime);
      // The branch ran, so the rest of the chain is skipped. Without this
      // the `else` would run as well and overwrite the answer.
      return afterChain(statements, index);
    }
    // The branch did not run, so the walk continues at the `elif` or the
    // `else` that follows, if there is one.
    let next = afterBody(statements, index);
    while (next < statements.length && statements[next].indent < statement.indent) next++;
    if (next < statements.length && ['elif', 'else'].includes(statements[next].tokens[0].value)) {
      return executeStatement(statements, next, scope, builtins, runtime);
    }
    return next;
  }

  if (head.value === 'else') {
    executeBlock(blockBody(statements, index), scope, builtins, runtime);
    return afterChain(statements, index);
  }

  if (head.value === 'for') {
    const inIndex = tokens.findIndex(t => t.value === 'in');
    const name = tokens[1].value;
    const colon = headerColon(tokens, inIndex + 1);
    const iterable = evaluateExpression(tokens.slice(inIndex + 1, colon < 0 ? tokens.length : colon), scope, builtins);
    const body = blockBody(statements, index);
    for (const item of iterable || []) {
      if (runtime.steps() > runtime.maxSteps) throw new Error('This program runs for too long. Check the loop.');
      scope.globals[name] = item;
      executeBlock(body, scope, builtins, runtime);
    }
    return afterBody(statements, index);
  }

  if (head.value === 'while') {
    const colon = headerColon(tokens, 1);
    const header = tokens.slice(1, colon < 0 ? tokens.length : colon);
    let condition = evaluateExpression(header, scope, builtins);
    const body = blockBody(statements, index);
    while (truthy(condition)) {
      // The guard sits inside the loop, not only around the block, because
      // a condition that never changes would otherwise run for ever.
      if (runtime.steps() > runtime.maxSteps) throw new Error('This program runs for too long. Check the loop.');
      executeBlock(body, scope, builtins, runtime);
      condition = evaluateExpression(header, scope, builtins);
    }
    return afterBody(statements, index);
  }

  if (head.value === 'return') {
    const end = headerColon(tokens, 1);
    const expression = tokens.slice(1, end < 0 ? tokens.length : end);
    throw { __return: expression.length ? evaluateExpression(expression, scope, builtins) : null };
  }

  if (head.value === 'import') {
    // The modules the course imports are bound as plain objects, so that
    // `math.exp(x)` and `requests.get(url)` read the way they do in Python.
    const names = tokens.slice(1).filter(t => t.type === 'name').map(t => t.value);
    for (const name of names) {
      if (name === 'math') scope.globals.math = { ...MATH_MODULE };
      else if (name === 'requests') scope.globals.requests = builtins.requests;
      else if (name === 'http') scope.globals.http = builtins.requests;
      else if (name === 'sqlite3') scope.globals.sqlite3 = builtins.sqlite3;
      else scope.globals[name] = {};
    }
    return index + 1;
  }

  if (head.value === 'from' || head.value === 'pass' || head.value === 'break' || head.value === 'continue') {
    return index + 1;
  }

  // A plain assignment or a call.
  if (tokens.length >= 3 && tokens[1].value === '=') {
    assignTo(scope, [tokens[0]], evaluateExpression(tokens.slice(2), scope, builtins));
    return index + 1;
  }

  // An assignment into a list or a dictionary, such as `counts["a"] = 1`.
  // A compound form such as `counts["a"] += 1` is handled here too, so an
  // indexed target is not left out of the augmented operators.
  if (tokens.length >= 5 && tokens[1].value === '[') {
    const close = matchingBracket(tokens, 1);
    const operator = close > 0 ? tokens[close + 1]?.value : '';
    if (close > 0 && (operator === '=' || ['+=', '-=', '*=', '/='].includes(operator))) {
      const target = tokens.slice(0, close + 1);
      if (operator === '=') {
        const value = evaluateExpression(tokens.slice(close + 2), scope, builtins);
        assignTo(scope, target, value);
        return index + 1;
      }
      const current = readTarget(scope, target);
      const value = evaluateExpression(tokens.slice(close + 2), scope, builtins);
      assignTo(scope, target, applyCompound(operator[0], current, value));
      return index + 1;
    }
  }

  // A compound assignment, such as `n += 1`.
  if (tokens.length >= 3 && ['+=', '-=', '*=', '/='].includes(tokens[1].value)) {
    const target = [tokens[0]];
    const current = readTarget(scope, target);
    const value = evaluateExpression(tokens.slice(2), scope, builtins);
    assignTo(scope, target, applyCompound(tokens[1].value[0], current, value));
    return index + 1;
  }

  if (head.value === 'print') {
    const close = matchingBracket(tokens, 1);
    const inner = close < 0 ? tokens.slice(2) : tokens.slice(2, close);
    const args = splitArguments(inner).map(part => evaluateExpression(part, scope, builtins));
    builtins.print(...args);
    return index + 1;
  }

  // A call on its own line, such as `do_the_thing()` or `out.append(x)`.
  // The whole line is evaluated for its effect, so the value is dropped.
  if (head.type === 'name' && tokens.length > 1) {
    evaluateExpression(tokens, scope, builtins);
    return index + 1;
  }

  return index + 1;
}

/**
 * Read the value an assignment target points at.
 *
 * A target is either a plain name, given as one token, or a name with an
 * index, given as the name, the brackets and the key.
 */
function readTarget(scope, target) {
  if (target.length === 1) return scope.globals[target[0].value] ?? null;
  const container = scope.globals[target[0].value];
  const key = evaluateExpression(target.slice(2, target.length - 1), scope, null);
  return readIndex(container, key);
}

/**
 * The key of an indexed target, such as the `"a"` in `counts["a"]`.
 */

/**
 * Store a value in an assignment target.
 *
 * A plain name goes into the scope; an indexed name goes into the list or
 * the dictionary it names.
 */
function assignTo(scope, target, value) {
  if (target.length === 1) {
    scope.globals[target[0].value] = value;
    return;
  }
  const container = scope.globals[target[0].value];
  const key = evaluateExpression(target.slice(2, target.length - 1), scope, null);
  if (Array.isArray(container)) {
    const index = Number(key);
    if (index < 0 || index >= container.length) throw new Error('That index is outside the list.');
    container[index] = value;
    return;
  }
  if (container && typeof container === 'object') {
    container[String(key)] = value;
    return;
  }
  throw new Error('That value cannot be assigned to.');
}

/**
 * Is a value true in the Python sense?
 */
export function truthy(value) {
  if (value === null || value === undefined || value === false) return false;
  if (value === 0 || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Evaluate an expression made of tokens.
 *
 * The supported grammar is deliberately small: names, numbers, strings,
 * lists, parentheses, arithmetic, comparisons and boolean operators.
 */
export function evaluateExpression(tokens, scope, builtins) {
  const parser = { tokens: [...tokens], position: 0 };
  const value = parseOr(parser, scope, builtins);
  return value;
}

/**
 * The runtime a call runs under.
 *
 * The runtime is kept on the scope rather than passed down through every
 * parser function, because the parser chain is already three arguments
 * deep and a fourth would only make it harder to read.
 */
function runtimeFor(scope, builtins) {
  return scope.runtime || builtins.__runtime || { maxSteps: 20000, maxMillis: Infinity, steps: () => 0 };
}

function peek(parser) { return parser.tokens[parser.position]; }

function parseOr(parser, scope, builtins) {
  let left = parseAnd(parser, scope, builtins);
  while (peek(parser) && peek(parser).value === 'or') {
    parser.position++;
    const right = parseAnd(parser, scope, builtins);
    left = truthy(left) ? left : right;
  }
  return left;
}

function parseAnd(parser, scope, builtins) {
  let left = parseComparison(parser, scope, builtins);
  while (peek(parser) && peek(parser).value === 'and') {
    parser.position++;
    const right = parseComparison(parser, scope, builtins);
    left = truthy(left) ? right : left;
  }
  return left;
}

function parseComparison(parser, scope, builtins) {
  let left = parseAdditive(parser, scope, builtins);
  while (peek(parser) && ['==', '!=', '<', '>', '<=', '>=', 'in'].includes(peek(parser).value)) {
    const operator = peek(parser).value;
    parser.position++;
    const right = parseAdditive(parser, scope, builtins);
    left = operator === 'in' ? contains(right, left) : compare(left, operator, right);
  }
  return left;
}

/**
 * Is the left value inside the right one?
 *
 * Python's `in` works on a list, a string and a dictionary, and the
 * dictionary case looks at the keys.
 */
function contains(container, item) {
  if (Array.isArray(container)) return container.some(entry => entry === item);
  if (typeof container === 'string') return container.includes(String(item));
  if (container && typeof container === 'object') return String(item) in container;
  return false;
}

function compare(left, operator, right) {
  left = numberOf(left);
  right = numberOf(right);
  switch (operator) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '<': return left < right;
    case '>': return left > right;
    case '<=': return left <= right;
    case '>=': return left >= right;
    default: return false;
  }
}

function parseAdditive(parser, scope, builtins) {
  let left = parseMultiplicative(parser, scope, builtins);
  while (peek(parser) && ['+', '-'].includes(peek(parser).value)) {
    const operator = peek(parser).value;
    parser.position++;
    const right = parseMultiplicative(parser, scope, builtins);
    left = operator === '+' ? add(left, right) : numberOf(left) - numberOf(right);
  }
  return left;
}

function parseMultiplicative(parser, scope, builtins) {
  let left = parseUnary(parser, scope, builtins);
  while (peek(parser) && ['*', '/', '%', '//'].includes(peek(parser).value)) {
    const operator = peek(parser).value;
    parser.position++;
    const right = parseUnary(parser, scope, builtins);
    if (operator === '*') left = numberOf(left) * numberOf(right);
    else if (operator === '%') {
      // The remainder. Python's sign follows the divisor, and a zero
      // divisor is an error rather than a silent NaN.
      if (right === 0) throw new Error('Modulo by zero.');
      left = numberOf(left) % numberOf(right);
    } else if (operator === '//') {
      // Floor division: it rounds down, so -7 // 2 is -4, not -3.
      if (right === 0) throw new Error('Division by zero.');
      left = Math.floor(numberOf(left) / numberOf(right));
    } else {
      if (right === 0) throw new Error('Division by zero.');
      // Python's division always gives a float, even when the numbers
      // divide evenly, so `sum / len` prints `5.0` and not `5`.
      left = asFloat(left / right);
    }
  }
  return left;
}

function parseUnary(parser, scope, builtins) {
  if (peek(parser) && peek(parser).value === 'not') {
    parser.position++;
    return !truthy(parseUnary(parser, scope, builtins));
  }
  if (peek(parser) && peek(parser).value === '-') {
    parser.position++;
    return -parseUnary(parser, scope, builtins);
  }
  return parsePower(parser, scope, builtins);
}

/**
 * The power operator, `**`.
 *
 * It sits below the unary minus, the way Python has it: `-2 ** 2` is
 * `-4`, because the minus applies to the whole power.
 */
function parsePower(parser, scope, builtins) {
  const left = parsePrimary(parser, scope, builtins);
  if (peek(parser) && peek(parser).value === '**') {
    parser.position++;
    const right = parseUnary(parser, scope, builtins);
    return numberOf(left) ** numberOf(right);
  }
  return left;
}

function parsePrimary(parser, scope, builtins) {
  const token = peek(parser);
  if (!token) return null;
  if (token.value === 'lambda') {
    return parseLambda(parser, scope, builtins);
  }
  if (token.value === '(') {
    parser.position++;
    const parts = [];
    while (peek(parser) && peek(parser).value !== ')') {
      if (peek(parser).value === ',') { parser.position++; continue; }
      parts.push(parseOr(parser, scope, builtins));
    }
    if (peek(parser) && peek(parser).value === ')') parser.position++;
    // `(1)` is just the value in brackets. `(1, 2)` is a pair, and the
    // teaching code wants to index a pair, so it is kept as a list.
    return parts.length === 1 ? parts[0] : parts;
  }
  if (token.value === '[') {
    parser.position++;
    // A list can either be a plain list of values, or a comprehension:
    // `[value for item in items]`. The `for` after the first value is what
    // tells them apart, so the value is parsed and, if a `for` turns up
    // next, the tokens it was written from are handed to the
    // comprehension reader and the value is parsed again for each item.
    const valueStart = parser.position;
    const first = [];
    let sawFor = false;
    while (peek(parser) && peek(parser).value !== ']') {
      if (peek(parser).value === ',') { parser.position++; continue; }
      if (peek(parser).value === 'for' || peek(parser).value === 'if') { sawFor = true; break; }
      first.push(parseOr(parser, scope, builtins));
    }
    if (sawFor) {
      const valueTokens = parser.tokens.slice(valueStart, parser.position);
      return parseComprehension(valueTokens, parser, scope, builtins);
    }
    if (peek(parser) && peek(parser).value === ']') parser.position++;
    return first;
  }
  if (token.value === '{') {
    parser.position++;
    const entries = {};
    while (peek(parser) && peek(parser).value !== '}') {
      if (peek(parser).value === ',') { parser.position++; continue; }
      const key = parseOr(parser, scope, builtins);
      if (peek(parser) && peek(parser).value === ':') parser.position++;
      entries[String(key)] = parseOr(parser, scope, builtins);
    }
    if (peek(parser) && peek(parser).value === '}') parser.position++;
    return entries;
  }
  parser.position++;
  if (token.type === 'number') return token.value;
  if (token.type === 'string') return token.value;
  if (token.value === 'True') return true;
  if (token.value === 'False') return false;
  if (token.value === 'None') return null;
  if (token.type === 'name') {
    // A call is a name followed by an argument list.
    if (peek(parser) && peek(parser).value === '(') {
      const parts = readArguments(parser, parser.position);
      // A lone argument that starts with a `for` is a generator expression:
      // `sum(x * x for x in xs)`. It is the only argument, so it can be
      // recognised by looking for the `for` in it.
      if (parts.length === 1 && parts[0].some(part => part.value === 'for')) {
        const inner = { tokens: parts[0], position: 0 };
        const valueStart = 0;
        const valueTokens = [];
        while (inner.position < inner.tokens.length && inner.tokens[inner.position].value !== 'for') {
          valueTokens.push(inner.tokens[inner.position]);
          inner.position++;
        }
        const generated = parseGeneratorExpression(valueTokens, inner, scope, builtins);
        return callFunction(token.value, [generated], scope, builtins, runtimeFor(scope, builtins));
      }
      const { positional, keywords } = splitCallArguments(parts);
      const args = positional.map(part => evaluateExpression(part, scope, builtins));
      const named = {};
      for (const keyword of keywords) named[keyword.name] = evaluateExpression(keyword.tokens, scope, builtins);
      // The result of the call can still be indexed or sliced, the way
      // `sorted(values, reverse=True)[:2]` is.
      const result = callFunction(token.value, args, scope, builtins, runtimeFor(scope, builtins), named);
      return applyAccess(result, parser, scope, builtins);
    }
    const value = scope.globals[token.value];
    return applyAccess(value, parser, scope, builtins);
  }
  return null;
}

/**
 * Read a comprehension: the value, then one or more loops, then an
 * optional filter.
 *
 * `[value for item in items if condition]`
 * `[a + b for a in first for b in second]`
 *
 * The loop variables are bound in a child scope, so they do not leak out.
 * The value and the condition are re-evaluated for each item, which is
 * what makes the expression see the current value of the loop variable.
 */
function parseComprehension(valueTokens, parser, scope, builtins, closer = ']') {
  // The `for` is already the next token.
  const loops = [];
  let conditionTokens = null;
  while (peek(parser) && peek(parser).value === 'for') {
    parser.position++;
    const name = peek(parser)?.value;
    parser.position++;
    // Skip the `in`.
    if (peek(parser) && peek(parser).value === 'in') parser.position++;
    const sourceTokens = [];
    // The source can be a list of its own, so the brackets are counted:
    // the closer only ends the source when it closes the same level.
    let depth = 0;
    while (peek(parser)) {
      const value = peek(parser).value;
      if (value === '(' || value === '[' || value === '{') depth++;
      else if (value === ')' || value === ']' || value === '}') {
        if (depth === 0 && (value === closer || value === 'for' || value === 'if')) break;
        depth--;
      } else if (depth === 0 && (value === 'for' || value === 'if')) break;
      sourceTokens.push(peek(parser));
      parser.position++;
    }
    loops.push({ name, sourceTokens });
    // A filter can only follow the last loop.
    if (peek(parser) && peek(parser).value === 'if') {
      parser.position++;
      conditionTokens = [];
      while (peek(parser) && peek(parser).value !== closer) {
        conditionTokens.push(peek(parser));
        parser.position++;
      }
      break;
    }
  }
  if (peek(parser) && peek(parser).value === closer) parser.position++;

  const out = [];
  // Each loop is a nested walk, so the innermost one is the last.
  const walk = (index, bindings) => {
    if (index >= loops.length) {
      if (conditionTokens && !truthy(evaluateExpression(conditionTokens, bindings, builtins))) return;
      out.push(evaluateExpression(valueTokens, bindings, builtins));
      return;
    }
    const loop = loops[index];
    const iterable = evaluateExpression(loop.sourceTokens, bindings, builtins);
    for (const item of iterable || []) {
      const inner = {
        globals: { ...bindings.globals },
        parent: bindings.parent,
        runtime: bindings.runtime
      };
      inner.globals[loop.name] = item;
      walk(index + 1, inner);
    }
  };
  walk(0, { globals: scope.globals, parent: scope.parent, runtime: scope.runtime });
  return out;
}

/**
 * Read a generator expression: `value for item in items`.
 *
 * A generator expression is a comprehension without the brackets. The
 * course only needs it where a list would do — `sum(x * x for x in xs)` —
 * so it is evaluated eagerly and handed back as a list.
 */
function parseGeneratorExpression(valueTokens, parser, scope, builtins) {
  const list = parseComprehension(valueTokens, parser, scope, builtins, ')');
  return list;
}

/**
 * Read a lambda: its parameters, then the one expression it returns.
 *
 * The lambda is stored the same way a `def` is, so calling it goes down
 * the same path.
 */
function parseLambda(parser, scope, builtins) {
  parser.position++;
  const parameterTokens = [];
  while (peek(parser) && peek(parser).value !== ':') {
    parameterTokens.push(peek(parser));
    parser.position++;
  }
  // A lambda takes the same parameter shape as a `def`, so a default
  // works in one and not the other.
  const parameters = parseParameters(parameterTokens);
  if (peek(parser) && peek(parser).value === ':') parser.position++;
  const start = parser.position;
  // The body runs to the end of the expression, which is where the
  // enclosing bracket or the end of the line closes it.
  let depth = 0;
  while (peek(parser)) {
    const value = peek(parser).value;
    if (value === '(' || value === '[' || value === '{') depth++;
    else if (value === ')' || value === ']' || value === '}') {
      if (depth === 0) break;
      depth--;
    }
    parser.position++;
  }
  const body = [{ indent: 0, opensBlock: false, tokens: parser.tokens.slice(start, parser.position), source: 'lambda body' }];
  return { __function: true, parameters, body, expression: true };
}

/**
 * Read the argument list of a call, leaving the parser after the bracket.
 *
 * The opening bracket has to be given, because the parser has already
 * moved past it by the time the call is noticed.
 */
function readArguments(parser, openIndex) {
  const close = matchingBracket(parser.tokens, openIndex);
  const inner = close < 0 ? parser.tokens.slice(openIndex + 1) : parser.tokens.slice(openIndex + 1, close);
  parser.position = close < 0 ? parser.tokens.length : close + 1;
  return splitArguments(inner);
}

/**
 * Apply the indexing, slicing and method calls that follow a value.
 *
 * This is what turns `words`, `words[0]`, `words[1:3]`, `words.split(" ")`
 * and `out.append(x)` into working code. The loop keeps going while the
 * next token is one of those, so `a[0][1]` and `a.b().c()` both work.
 */
function applyAccess(value, parser, scope, builtins) {
  let current = value;
  while (peek(parser)) {
    const next = peek(parser).value;
    if (next === '[') {
      parser.position++;
      const close = matchingBracket(parser.tokens, parser.position - 1);
      const inner = close < 0 ? parser.tokens.slice(parser.position) : parser.tokens.slice(parser.position, close);
      parser.position = close < 0 ? parser.tokens.length : close + 1;
      current = indexValue(current, inner, scope, builtins);
      continue;
    }
    if (next === '.') {
      parser.position++;
      const name = peek(parser);
      if (!name || name.type !== 'name') break;
      parser.position++;
      // A method call is a dot followed by a name and an argument list.
      if (peek(parser) && peek(parser).value === '(') {
        const args = readArguments(parser, parser.position).map(part => evaluateExpression(part, scope, builtins));
        current = callMethod(current, name.value, args, scope, builtins);
        continue;
      }
      current = readAttribute(current, name.value);
      continue;
    }
    break;
  }
  return current;
}

/**
 * Index or slice a value.
 *
 * A single number indexes and a pair of numbers with a colon between them
 * slices, the way Python writes it.
 */
function indexValue(value, inner, scope, builtins) {
  const colon = inner.findIndex(t => t.value === ':');
  if (colon < 0) {
    const key = evaluateExpression(inner, scope, builtins);
    return readIndex(value, key);
  }
  const start = colon === 0 ? null : evaluateExpression(inner.slice(0, colon), scope, builtins);
  const end = colon >= inner.length - 1 ? null : evaluateExpression(inner.slice(colon + 1), scope, builtins);
  return sliceValue(value, start, end);
}

/**
 * Read one item out of a list or a dictionary.
 */
function readIndex(value, key) {
  if (value === null || value === undefined) throw new Error('Cannot read an item from nothing.');
  if (Array.isArray(value)) {
    const index = Number(key);
    if (!Number.isInteger(index)) throw new Error('A list can only be indexed with a whole number.');
    const position = index < 0 ? value.length + index : index;
    if (position < 0 || position >= value.length) throw new Error('That index is outside the list.');
    return value[position];
  }
  if (typeof value === 'object') {
    const name = String(key);
    if (!(name in value)) throw new Error(`There is no key "${name}" in the dictionary.`);
    return value[name];
  }
  if (typeof value === 'string') {
    const index = Number(key);
    if (!Number.isInteger(index)) throw new Error('A string can only be indexed with a whole number.');
    const position = index < 0 ? value.length + index : index;
    if (position < 0 || position >= value.length) throw new Error('That index is outside the string.');
    return value[position];
  }
  throw new Error('That value cannot be indexed.');
}

/**
 * Take a slice out of a list or a string.
 */
function sliceValue(value, start, end) {
  const list = Array.isArray(value) || typeof value === 'string' ? value : null;
  if (!list) throw new Error('Only a list or a string can be sliced.');
  const from = start === null ? 0 : Number(start);
  const to = end === null ? list.length : Number(end);
  return list.slice(from, to);
}

/**
 * Read an attribute off a value.
 *
 * The course only needs the length of a list or a string, so that is what
 * this answers.
 */
function readAttribute(value, name) {
  if (name === 'length' || name === '__len__') {
    if (value === null || value === undefined) throw new Error('That value has no length.');
    return value.length ?? 0;
  }
  // A plain object, such as the `math` module, hands back its own fields.
  if (value && typeof value === 'object' && !Array.isArray(value) && name in value) return value[name];
  throw new Error(`There is no "${name}" on that value.`);
}

/**
 * Call a method on a value.
 *
 * The methods are the handful the course uses: the list methods that
 * build a result, and the string methods that split a sentence up.
 */
function callMethod(value, name, args, scope, builtins) {
  if (Array.isArray(value)) {
    if (name === 'append') { value.push(args[0] ?? null); return value; }
    if (name === 'extend') { for (const item of args[0] || []) value.push(item); return value; }
    if (name === 'pop') { return value.pop(); }
    if (name === 'index') { return value.indexOf(args[0]); }
    if (name === 'count') { return value.filter(item => item === args[0]).length; }
    if (name === 'reverse') { value.reverse(); return value; }
    if (name === 'sort') { value.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0)); return value; }
    if (name === 'copy') { return [...value]; }
    throw new Error(`A list has no "${name}" method.`);
  }
  if (typeof value === 'string') {
    if (name === 'split') {
      const separator = args[0] ?? ' ';
      if (separator === '') return value.split('');
      return value.split(String(separator));
    }
    if (name === 'join') {
      const parts = Array.isArray(args[0]) ? args[0] : [];
      return parts.map(part => String(part)).join(String(value));
    }
    if (name === 'lower') return value.toLowerCase();
    if (name === 'upper') return value.toUpperCase();
    if (name === 'strip') return value.trim();
    if (name === 'startswith') return value.startsWith(String(args[0]));
    if (name === 'endswith') return value.endsWith(String(args[0]));
    if (name === 'replace') return value.split(String(args[0])).join(String(args[1]));
    if (name === 'find') return value.indexOf(String(args[0]));
    throw new Error(`A string has no "${name}" method.`);
  }
  if (value && typeof value === 'object') {
    // A learning module, such as `requests` or a database handle, has its
    // own dispatch because its methods need the module as `this`.
    if (value.__sqlite || value.__sqlResult) return callModuleMethod(value, name, args);
    // A plain object, such as the `math` module, holds plain functions.
    // The object is passed as `this`, so a module method such as
    // `requests.get(url)` can reach its own state.
    if (typeof value[name] === 'function') return value[name].apply(value, args);
    if (name === 'keys') { return Object.keys(value); }
    if (name === 'values') { return Object.values(value); }
    if (name === 'items') { return Object.entries(value); }
    if (name === 'get') { return value[String(args[0])] ?? args[1] ?? null; }
  }
  throw new Error(`That value has no "${name}" method.`);
}

/**
 * Call a method that belongs to a learning module.
 *
 * The modules — `requests` and `sqlite3` — are objects whose methods need
 * the module itself as `this`, and the SQLite handle needs its own
 * dispatch because it returns cursors rather than plain values.
 */
function callModuleMethod(value, name, args) {
  // A SQLite handle: `handle.execute(...)`, `handle.query(...)`.
  if (value?.__sqlite) {
    if (name === 'execute') return value.execute(args[0]);
    if (name === 'executescript') return value.executescript(args[0]);
    if (name === 'query') return value.query(args[0]);
    if (name === 'tables') return value.tables();
    if (name === 'close') return value.close();
    throw new Error(`That database handle has no "${name}" method.`);
  }
  // A cursor: `cursor.fetchall()`, `cursor.fetchone()`.
  if (value?.__sqlResult) {
    if (name === 'fetchall') return value.fetchall();
    if (name === 'fetchone') return value.fetchone();
    throw new Error(`That result has no "${name}" method.`);
  }
  throw new Error(`That value has no "${name}" method.`);
}

/**
 * Call a name, either a builtin or a function the learner defined.
 */
function callFunction(name, args, scope, builtins, runtime, named = {}) {
  const target = scope.globals[name];
  if (target && target.__function) {
    // The call gets its own scope, with the outer names copied in, so a
    // function can read the variables around it without writing to them.
    const inner = { globals: Object.create(null), runtime: runtimeFor(scope, builtins) };
    for (const [key, value] of Object.entries(scope.globals)) inner.globals[key] = value;
    const parameterNames = target.parameters.map(parameter => parameter.name);
    target.parameters.forEach((parameter, index) => {
      // A default is only used when the caller left the argument out. A
      // positional argument wins, then a keyword argument, then the
      // default, and finally null when there is no default at all.
      if (index < args.length) {
        inner.globals[parameter.name] = args[index];
        return;
      }
      if (Object.prototype.hasOwnProperty.call(named, parameter.name)) {
        inner.globals[parameter.name] = named[parameter.name];
        return;
      }
      inner.globals[parameter.name] = parameter.default
        ? evaluateExpression(parameter.default, inner, builtins)
        : null;
    });
    // A keyword argument that names a parameter overrides the positional
    // value, the way Python does.
    for (const [key, value] of Object.entries(named)) {
      if (parameterNames.includes(key)) inner.globals[key] = value;
    }
    try {
      // A lambda holds one expression rather than a block of statements,
      // so it is evaluated instead of run.
      if (target.expression) return evaluateExpression(target.body[0].tokens, inner, builtins);
      executeBlock(target.body, inner, builtins, runtime);
    } catch (error) {
      // The `return` statement throws its value to unwind the call. The
      // check has to look for the marker rather than the value, because
      // returning nothing is a legitimate answer.
      if (error && typeof error === 'object' && '__return' in error) return error.__return;
      throw error;
    }
    return null;
  }
  if (typeof builtins[name] === 'function') {
    // The keyword arguments are only handed over when there are any, so
    // a builtin that reads its own argument count is not confused by an
    // extra empty object.
    if (Object.keys(named).length) return builtins[name](...args, named);
    return builtins[name](...args);
  }
  throw new Error(`'${name}' is not defined yet.`);
}

/**
 * Add two values the way Python does, so a string plus a string joins them.
 */
function add(left, right) {
  if (typeof left === 'string' || typeof right === 'string') return `${left}${right}`;
  if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
  const sum = numberOf(left) + numberOf(right);
  // Adding to a float keeps it a float, the way Python does.
  return isFloat(left) || isFloat(right) ? asFloat(sum) : sum;
}

/**
 * Apply one of the compound operators to a value.
 *
 * `+=` adds, `-=` subtracts, `*=` multiplies and `/=` divides. Division by
 * zero is refused, the way Python refuses it.
 */
function applyCompound(operator, current, value) {
  if (operator === '/') {
    if (value === 0) throw new Error('Division by zero.');
    return asFloat(current / value);
  }
  if (operator === '+') return add(current, value);
  if (operator === '-') return numberOf(current) - numberOf(value);
  return numberOf(current) * numberOf(value);
}

/* ------------------------------------------------------------------ *
 * The design checkers
 * ------------------------------------------------------------------ */

/**
 * The words a design answer has to mention for an idea to count.
 *
 * Each idea carries several spellings, because a good answer might say
 * "retry with backoff" or "exponential backoff".
 */
export const DESIGN_IDEAS = {
  'rate-limit': ['rate limit', 'rate-limit', 'ratelimit', 'throttle', 'quota'],
  'retry': ['retry', 'retries', 'backoff', 'retry with backoff'],
  'timeout': ['timeout', 'time out', 'deadline'],
  'circuit-breaker': ['circuit breaker', 'circuit-breaker', 'breaker', 'fail fast'],
  'cache': ['cache', 'caching', 'cached', 'memoiz'],
  'idempotent': ['idempot', 'idempotency'],
  'pagination': ['pagination', 'paginate', 'cursor', 'limit and offset', 'offset'],
  'index': ['index', 'indexes', 'indices'],
  'sharding': ['shard', 'sharding', 'partition'],
  'replication': ['replica', 'replication', 'replicated'],
  'consistency': ['consistency', 'consistent', 'eventual', 'strong consist'],
  'availability': ['availability', 'available', 'uptime', 'failover'],
  'partition-tolerance': ['partition', 'network split', 'cap theorem', 'cap'],
  'monitoring': ['monitor', 'observab', 'metric', 'alert', 'logging', 'log '],
  'authentication': ['auth', 'authentication', 'authorize', 'permission', 'rbac'],
  'encryption': ['encrypt', 'encryption', 'tls', 'https', 'at rest'],
  'backpressure': ['backpressure', 'back pressure', 'rate limit', 'throttle'],
  'load-balancing': ['load balanc', 'loadbalanc', 'round robin', 'least connect'],
  'migration': ['migration', 'migrate', 'backfill', 'expand and contract'],
  'versioning': ['version', 'versioning', 'api version'],
  'queue': ['queue', 'buffer', 'async', 'background job', 'worker'],
  'testing': ['test', 'testing', 'unit test', 'integration test'],
  'deployment': ['deploy', 'deployment', 'rollout', 'canary', 'blue-green'],
  'cost': ['cost', 'budget', 'spend', 'expensive'],
  'scaling': ['scal', 'autoscal', 'horizontal', 'vertical'],
  'model-drift': ['drift', 'model drift', 'retrain', 'monitor the model'],
  'hallucination': ['hallucinat', 'grounding', 'citation', 'verify the output'],
  'evaluation': ['evaluat', 'eval', 'benchmark', 'test set', 'accuracy'],
  'prompt-injection': ['injection', 'prompt injection', 'sanitize', 'untrusted'],
  'privacy': ['privacy', 'pii', 'personal data', 'gdpr', 'redact'],
  'latency': ['latency', 'p50', 'p95', 'p99', 'slow', 'response time'],
  'token-cost': ['token', 'tokens', 'prompt length', 'context window']
};

/**
 * Does the answer mention the idea?
 *
 * The check is a plain text search, so it looks at the whole answer and not
 * at one paragraph. That means a learner who writes the idea anywhere in
 * the design passes, which is the intent: the lab checks that the idea was
 * considered, not that it was considered first.
 */
export function mentionsIdea(answer, idea) {
  if (!answer || !idea) return false;
  const text = String(answer).toLowerCase();
  const spellings = DESIGN_IDEAS[idea] || [idea];
  return spellings.some(spelling => text.includes(String(spelling).toLowerCase()));
}

/**
 * Build the checker for a design exercise.
 *
 * The checker looks for the ideas the exercise asks about and names the one
 * that is missing. It never tries to judge whether the design is good —
 * that part is the learner's job.
 */
export function makeDesignChecker(entry) {
  const ideas = Array.isArray(entry?.ideas) ? entry.ideas : [];
  const minimum = Number.isFinite(entry?.minimumWords) ? entry.minimumWords : 25;
  return ({ js = '', html = '', css = '' } = {}) => {
    const answer = `${js}\n${html}\n${css}`;
    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    if (words < minimum) {
      return {
        ok: false,
        message: 'This one is a design answer, so it needs a few more words.',
        hint: `Write at least ${minimum} words. Explain what you would build and why.`
      };
    }
    const missing = ideas.filter(idea => !mentionsIdea(answer, idea));
    if (missing.length) {
      const labels = missing.map(idea => idea.replace(/-/g, ' '));
      return {
        ok: false,
        message: `Still to cover: ${labels.join(', ')}.`,
        hint: `Your design does not mention ${labels[0]} yet. Think about how the system behaves when things go wrong.`
      };
    }
    return { ok: true, message: `That design covers ${ideas.length} ${ideas.length > 1 ? 'ideas' : 'idea'}. Good thinking.` };
  };
}

/**
 * Build the checker for a Python exercise.
 *
 * The checker runs the learner's code and compares the printed lines with
 * the lines the exercise expects. It never inspects the code itself: the
 * point of the exercise is the behaviour, not the spelling.
 */
export function makePythonChecker(entry) {
  const expected = Array.isArray(entry?.expected) ? entry.expected : [];
  return ({ js = '', html = '', css = '' } = {}) => {
    const source = js || html;
    if (!source.trim()) {
      return { ok: false, message: 'The Python editor is empty.', hint: 'Write some code and run it to see what happens.' };
    }
    const result = runPython(source);
    if (result.error) {
      return { ok: false, message: `Your code stopped: ${result.error}`, hint: 'Read the message and fix the line it points at.' };
    }
    const wanted = expected.join('\n');
    const got = result.output.join('\n');
    if (got.trim() !== wanted.trim()) {
      return {
        ok: false,
        message: 'That is not the output the exercise expects yet.',
        hint: wanted ? `Your program should print: ${wanted.split('\n')[0]}` : 'Compare the output with the brief.'
      };
    }
    return { ok: true, message: 'That is right — the output matches.' };
  };
}

/**
 * Turn one raw course entry into a lab exercise.
 *
 * Returns null for an entry that is missing the fields the lab needs, so
 * one bad row can never break the page.
 */
export function toAiExercise(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.id !== 'string' || !entry.id) return null;
  if (typeof entry.title !== 'string' || !entry.title) return null;
  const kind = entry.kind === 'design' ? 'design' : 'python';
  const starter = entry.starter && typeof entry.starter === 'object' ? entry.starter : {};
  return {
    id: entry.id,
    language: kind === 'python' ? 'python' : 'design',
    kind,
    title: entry.title,
    chapter: typeof entry.chapter === 'string' && entry.chapter ? entry.chapter : 'AI Lab',
    xp: Number.isFinite(entry.xp) && entry.xp > 0 ? Math.floor(entry.xp) : 30,
    brief: typeof entry.brief === 'string' && entry.brief ? entry.brief : 'Complete the exercise.',
    starter: {
      python: typeof starter.python === 'string' ? starter.python : '',
      design: typeof starter.design === 'string' ? starter.design : ''
    },
    check: kind === 'design' ? makeDesignChecker(entry) : makePythonChecker(entry),
    // The expected output is kept on the exercise, so the brief can show
    // the learner what they are aiming for.
    expected: Array.isArray(entry.expected) ? entry.expected.filter(line => typeof line === 'string') : [],
    origin: typeof entry.origin === 'string' ? entry.origin : '',
    source: typeof entry.source === 'string' ? entry.source : ''
  };
}

/**
 * Turn the whole course payload into exercises.
 */
export function toAiExercises(payload) {
  const list = Array.isArray(payload?.exercises) ? payload.exercises : [];
  const out = [];
  for (const entry of list) {
    const exercise = toAiExercise(entry);
    if (exercise) out.push(exercise);
  }
  return out;
}

/**
 * Load the AI course.
 *
 * Returns `{ exercises, source, license }`. When the file cannot be read
 * the exercises are empty, so the page still shows its own welcome card
 * rather than a broken rail.
 */
export async function loadAiCourse(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(AI_COURSE_URL, { cache: 'no-cache' });
    if (!response?.ok) return { exercises: [], source: '', license: '' };
    const payload = await response.json();
    return {
      exercises: toAiExercises(payload),
      source: typeof payload?.source === 'string' ? payload.source : '',
      license: typeof payload?.license === 'string' ? payload.license : ''
    };
  } catch {
    return { exercises: [], source: '', license: '' };
  }
}
