/**
 * Developer Toolbox — pure helpers plus one DOM wiring entry point.
 *
 * Every exported helper is side-effect free so it can be unit tested under
 * bare Node (see tests/tools.test.mjs). All DOM work lives inside
 * initTools(), which is called once from the page's module script.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

/* ------------------------------------------------------------------ *
 * JSON
 * ------------------------------------------------------------------ */

/** Locate the line/column of the first JSON syntax error in `text`. */
export function findJsonError(text) {
  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    const message = String(error?.message || 'Invalid JSON');
    // V8 reports either "at position N (line L column C)" or a bare "position N".
    const located = /line (\d+) column (\d+)/i.exec(message);
    if (located) {
      return { message: cleanJsonMessage(message), line: Number(located[1]), column: Number(located[2]) };
    }
    const position = /position (\d+)/i.exec(message);
    const offset = position
      ? Math.min(Number(position[1]), text.length)
      : scanJsonError(text);
    if (offset === null) return { message: cleanJsonMessage(message), line: null, column: null };
    const before = text.slice(0, offset);
    const line = before.split('\n').length;
    const column = offset - before.lastIndexOf('\n');
    return { message: cleanJsonMessage(message), line, column };
  }
}

/**
 * Locate the first structurally invalid character in a JSON document.
 * Used when the engine's message omits a position (some V8 messages do).
 * Returns the character offset, or null when nothing obvious stands out.
 */
function scanJsonError(text) {
  const source = typeof text === 'string' ? text : '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  // Tracks the last significant character, so we can tell "value expected" apart
  // from "value just finished" when a closing bracket shows up.
  let last = '';
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') { inString = false; last = '"'; }
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (/\s/.test(char)) continue;
    if (char === '{' || char === '[') { depth += 1; last = char; continue; }
    if (char === '}' || char === ']') {
      // A closer straight after ':' or ',' means a value was expected here.
      if (last === ':' || last === ',') return i;
      depth -= 1;
      if (depth < 0) return i;
      last = char;
      continue;
    }
    if (char === ',') { last = ','; continue; }
    if (char === ':') { last = ':'; continue; }
    // A bare word or stray symbol outside a string is never valid JSON.
    if (depth > 0 && last === ':') {
      const word = source.slice(i).match(/^[A-Za-z]+/)?.[0] || '';
      if (word && !/^(true|false|null)$/.test(word)) return i;
      if (!/["\-+0-9]/.test(char)) return i;
    }
    last = char;
  }
  return depth > 0 ? source.length : null;
}

/** Strip the engine's position suffix so the message reads cleanly. */
function cleanJsonMessage(message) {
  return String(message)
    .replace(/^JSON\.parse:\s*/, '')
    .replace(/\s*in JSON at position \d+.*$/i, '')
    .replace(/\s*\(line \d+ column \d+\)\s*$/i, '')
    .replace(/,?\s*is not valid JSON\s*$/i, '')
    .trim();
}

/** Pretty-print JSON text. `indent` is the number of spaces per level. */
export function formatJson(text, indent = 2) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter some JSON first.' };
  const width = [2, 4].includes(Number(indent)) ? Number(indent) : 2;
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const found = findJsonError(source);
    const where = found?.line ? ` (line ${found.line}, column ${found.column})` : '';
    return { ok: false, output: '', error: `Invalid JSON${where}: ${found?.message || String(error?.message || 'parse error')}` };
  }
  return { ok: true, output: JSON.stringify(parsed, null, width), error: null };
}

/** Minify JSON text to its shortest single-line form. */
export function minifyJson(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter some JSON first.' };
  try {
    return { ok: true, output: JSON.stringify(JSON.parse(source)), error: null };
  } catch (error) {
    const found = findJsonError(source);
    const where = found?.line ? ` (line ${found.line}, column ${found.column})` : '';
    return { ok: false, output: '', error: `Invalid JSON${where}: ${found?.message || String(error?.message || 'parse error')}` };
  }
}

/* ------------------------------------------------------------------ *
 * Base64
 * ------------------------------------------------------------------ */

function bytesToBinary(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return binary;
}

function binaryToBytes(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode a UTF-8 string to standard base64 (with padding). */
export function base64Encode(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source) return { ok: false, output: '', error: 'Enter some text first.' };
  try {
    return { ok: true, output: btoa(bytesToBinary(encoder.encode(source))), error: null };
  } catch {
    return { ok: false, output: '', error: 'Could not encode that text.' };
  }
}

/**
 * Decode base64 to a UTF-8 string. When `unicodeSafe` is false the raw
 * bytes are returned as a latin-1 style string instead of UTF-8 text.
 */
export function base64Decode(text, unicodeSafe = true) {
  const source = typeof text === 'string' ? text.trim() : '';
  if (!source) return { ok: false, output: '', error: 'Enter a base64 string first.' };
  const cleaned = source.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    return { ok: false, output: '', error: 'That is not valid base64 (allowed characters are A–Z, a–z, 0–9, +, / and = padding).' };
  }
  try {
    const binary = atob(cleaned);
    const bytes = binaryToBytes(binary);
    const output = unicodeSafe ? decoder.decode(bytes) : binary;
    return { ok: true, output, error: null };
  } catch {
    return { ok: false, output: '', error: 'Could not decode that base64 string.' };
  }
}

/* ------------------------------------------------------------------ *
 * JWT
 * ------------------------------------------------------------------ */

function decodeBase64Url(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = binaryToBytes(binary);
  return decoder.decode(bytes);
}

/** Decode a JWT header and payload without verifying its signature. */
export function decodeJwt(token) {
  const source = typeof token === 'string' ? token.trim() : '';
  if (!source) return { ok: false, output: null, error: 'Enter a JWT first.' };
  const parts = source.split('.');
  if (parts.length !== 3) {
    return { ok: false, output: null, error: `A JWT has 3 dot-separated parts; this token has ${parts.length}.` };
  }
  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]));
  } catch {
    return { ok: false, output: null, error: 'The JWT header is not valid base64url-encoded JSON.' };
  }
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return { ok: false, output: null, error: 'The JWT payload is not valid base64url-encoded JSON.' };
  }
  const claims = {};
  for (const key of ['exp', 'iat', 'nbf']) {
    const value = payload?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      claims[key] = { seconds: value, iso: new Date(value * 1000).toISOString() };
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const expired = typeof claims.exp?.seconds === 'number' ? claims.exp.seconds < now : null;
  return {
    ok: true,
    error: null,
    output: {
      header,
      payload,
      signature: parts[2],
      signatureVerified: false,
      algorithm: header?.alg || 'unknown',
      claims,
      expired,
      signatureNote: 'Signature NOT verified. This decoder only reads the header and payload.'
    }
  };
}

/* ------------------------------------------------------------------ *
 * Timestamps
 * ------------------------------------------------------------------ */

/** Convert Unix seconds to an ISO 8601 string. */
export function timestampToIso(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return { ok: false, output: '', error: 'Enter a numeric Unix timestamp.' };
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return { ok: false, output: '', error: 'That timestamp is out of range.' };
  return { ok: true, output: date.toISOString(), error: null };
}

/** Convert an ISO 8601 string to Unix seconds. */
export function isoToTimestamp(iso) {
  const source = typeof iso === 'string' ? iso.trim() : '';
  if (!source) return { ok: false, output: '', error: 'Enter an ISO 8601 date first.' };
  const parsed = Date.parse(source);
  if (Number.isNaN(parsed)) return { ok: false, output: '', error: 'That is not a valid ISO 8601 date.' };
  return { ok: true, output: String(Math.floor(parsed / 1000)), error: null };
}

/* ------------------------------------------------------------------ *
 * Regex
 * ------------------------------------------------------------------ */

/** Run a regular expression against multi-line input and list every match. */
export function testRegex(pattern, flags, input) {
  const source = typeof pattern === 'string' ? pattern : '';
  const flagString = typeof flags === 'string' ? flags : '';
  const text = typeof input === 'string' ? input : '';
  if (!source) return { ok: false, matches: [], error: 'Enter a regular expression first.' };
  let expression;
  try {
    expression = new RegExp(source, flagString);
  } catch (error) {
    return { ok: false, matches: [], error: `Invalid pattern: ${String(error?.message || 'could not compile')}` };
  }
  const matches = [];
  const global = flagString.includes('g');
  const limit = 1000;
  let match;
  let guard = 0;
  try {
    while ((match = expression.exec(text)) !== null) {
      guard += 1;
      if (guard > limit) break;
      const groups = [];
      for (let i = 1; i < match.length; i += 1) {
        groups.push({ index: i, value: match[i] === undefined ? null : match[i] });
      }
      matches.push({ index: match.index, match: match[0], groups, named: match.groups ? { ...match.groups } : {} });
      if (!global) break;
      if (match[0] === '') expression.lastIndex += 1;
    }
  } catch (error) {
    return { ok: false, matches: [], error: `Could not run the pattern: ${String(error?.message || 'runtime error')}` };
  }
  return { ok: true, matches, error: null };
}

/* ------------------------------------------------------------------ *
 * UUID
 * ------------------------------------------------------------------ */

/**
 * Generate a version 4 UUID. `random` may supply 16 bytes (Uint8Array) or a
 * float in [0,1); it defaults to crypto.getRandomValues when available.
 */
export function generateUuidV4(random) {
  const bytes = new Uint8Array(16);
  if (typeof random === 'function') {
    const value = random();
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('random source must return a number');
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor((value + i / 16) * 256) % 256;
  } else if (random && typeof random.length === 'number') {
    bytes.set(random.subarray ? random.subarray(0, 16) : random.slice(0, 16));
  } else if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/* ------------------------------------------------------------------ *
 * Hashing
 * ------------------------------------------------------------------ */

const HASH_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export { HASH_ALGORITHMS };

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash UTF-8 text with the Web Crypto API. Verification only — this is not a
 * password hashing function and must not be used to store passwords.
 */
export async function hashText(text, algorithm = 'SHA-256') {
  const source = typeof text === 'string' ? text : '';
  const name = String(algorithm || '').toUpperCase();
  if (!HASH_ALGORITHMS.includes(name)) {
    return { ok: false, output: '', error: `Unsupported algorithm. Use one of: ${HASH_ALGORITHMS.join(', ')}.` };
  }
  if (!source) return { ok: false, output: '', error: 'Enter some text to hash first.' };
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return { ok: false, output: '', error: 'Web Crypto is not available in this browser.' };
  try {
    const digest = await subtle.digest(name, encoder.encode(source));
    return { ok: true, output: toHex(digest), error: null };
  } catch (error) {
    return { ok: false, output: '', error: `Could not compute the ${name} digest: ${String(error?.message || 'unknown error')}` };
  }
}

/* ------------------------------------------------------------------ *
 * Colours
 * ------------------------------------------------------------------ */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Parse a HEX colour (#rgb, #rrggbb) into { r, g, b }. */
export function hexToRgb(hex) {
  const source = typeof hex === 'string' ? hex.trim() : '';
  if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(source)) {
    return { ok: false, output: null, error: 'Enter a HEX colour like #9eda68 or #fff.' };
  }
  const body = source.replace(/^#/, '');
  const full = body.length === 3 ? body.split('').map((ch) => ch + ch).join('') : body;
  const output = {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16)
  };
  return { ok: true, output, error: null };
}

/** Convert RGB channels to a #rrggbb string. */
export function rgbToHex(r, g, b) {
  const channels = [r, g, b].map((value) => Math.round(clamp(Number(value) || 0, 0, 255)));
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** Convert RGB channels to HSL. */
export function rgbToHsl(r, g, b) {
  const red = clamp(Number(r) || 0, 0, 255) / 255;
  const green = clamp(Number(g) || 0, 0, 255) / 255;
  const blue = clamp(Number(b) || 0, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(lightness * 100) };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === red) hue = ((green - blue) / delta + (green < blue ? 6 : 0)) * 60;
  else if (max === green) hue = ((blue - red) / delta + 2) * 60;
  else hue = ((red - green) / delta + 4) * 60;
  return { h: Math.round(hue) % 360, s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

/** Convert HSL channels to RGB. */
export function hslToRgb(h, s, l) {
  const hue = ((Number(h) || 0) % 360 + 360) % 360 / 360;
  const saturation = clamp(Number(s) || 0, 0, 100) / 100;
  const lightness = clamp(Number(l) || 0, 0, 100) / 100;
  if (saturation === 0) {
    const grey = Math.round(lightness * 255);
    return { r: grey, g: grey, b: grey };
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255)
  };
}

function relativeLuminance(r, g, b) {
  const [red, green, blue] = [r, g, b].map((value) => {
    const scaled = clamp(Number(value) || 0, 0, 255) / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.1 contrast ratio between two HEX colours, plus AA/AAA verdicts. */
export function contrastRatio(a, b) {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  if (!first.ok || !second.ok) return { ok: false, output: null, error: 'Enter two valid HEX colours to compare.' };
  const lumA = relativeLuminance(first.output.r, first.output.g, first.output.b);
  const lumB = relativeLuminance(second.output.r, second.output.g, second.output.b);
  const ratio = (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
  const rounded = Math.round(ratio * 100) / 100;
  return {
    ok: true,
    error: null,
    output: {
      ratio: rounded,
      aa: ratio >= 4.5,
      aaa: ratio >= 7,
      aaLarge: ratio >= 3,
      normalText: ratio >= 4.5 ? 'AA pass' : 'AA fail',
      largeText: ratio >= 3 ? 'AA pass' : 'AA fail',
      enhanced: ratio >= 7 ? 'AAA pass' : 'AAA fail'
    }
  };
}

/* ------------------------------------------------------------------ *
 * Slug
 * ------------------------------------------------------------------ */

/** Turn arbitrary text into a URL-safe slug. */
export function slugify(text) {
  const source = typeof text === 'string' ? text : '';
  return source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/* ------------------------------------------------------------------ *
 * DNS (DoH)
 * ------------------------------------------------------------------ */

/** IANA DNS record type codes, used when a resolver answers with numbers. */
const DNS_TYPE_CODES = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 35: 'NAPTR', 43: 'DS', 48: 'DNSKEY', 52: 'TLSA', 99: 'SPF', 257: 'CAA'
};

/**
 * Parse a Cloudflare DNS-over-HTTPS JSON payload into a flat record list.
 * Pure: no network access, so it can be tested against a fixture.
 * Returns { ok, records, errors, answerCount, ... }.
 */
export function parseDnsJson(payload) {
  const data = typeof payload === 'string' ? safeJsonParse(payload) : payload;
  if (!data || typeof data !== 'object') {
    return { ok: false, records: [], errors: ['The DNS resolver did not return a JSON payload.'], error: 'The DNS resolver did not return a JSON payload.', status: 0 };
  }
  const status = Number.isFinite(data.Status) ? data.Status : null;
  const errors = [];
  if (status !== null && status !== 0) {
    errors.push(dnsStatusText(status));
  }
  const answers = Array.isArray(data.Answer) ? data.Answer : [];
  const records = [];
  answers.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const name = typeof entry.name === 'string' ? entry.name : '';
    const type = typeof entry.type === 'string'
      ? entry.type.trim().toUpperCase()
      : (Number.isFinite(entry.type) ? (DNS_TYPE_CODES[entry.type] || `TYPE${entry.type}`) : '');
    const data = typeof entry.data === 'string' ? entry.data : '';
    const ttl = Number.isFinite(entry.TTL) ? entry.TTL : null;
    if (!type || !data) {
      errors.push('Skipped an answer entry without a type or a value.');
      return;
    }
    records.push({ name, type, data, ttl });
  });
  if (status === 0 && !records.length) {
    errors.push('The resolver answered, but the record set is empty.');
  }
  return {
    ok: status === 0 && records.length > 0,
    records,
    errors,
    error: errors.length ? errors.join(' ') : null,
    status,
    answerCount: records.length,
    question: Array.isArray(data.Question) && data.Question.length ? String(data.Question[0]?.name ?? '') : ''
  };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Human wording for the DNS RCODE values Cloudflare returns. */
function dnsStatusText(status) {
  const table = {
    1: 'Format error — the resolver could not read the question.',
    2: 'Server failure — the resolver reported an internal error.',
    3: 'Name error (NXDOMAIN) — no such domain.',
    4: 'Not implemented — the resolver does not support this query.',
    5: 'Refused — the resolver refused the query.',
    6: 'YXDOMAIN — the name exists but is not allowed for this type.'
  };
  return table[status] || `The resolver returned status ${status}.`;
}

/* ------------------------------------------------------------------ *
 * HTTP headers
 * ------------------------------------------------------------------ */

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];

/**
 * Parse a raw HTTP request or response header block.
 * Pure and fully offline. Detects duplicate and malformed headers.
 */
export function parseHttpHeaders(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) {
    return { ok: false, error: 'Paste some raw headers first.', kind: null, method: null, url: null, version: null, status: null, statusText: null, headers: [], duplicates: [], malformed: [], count: 0 };
  }
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let cursor = 0;
  let method = null;
  let url = null;
  let version = null;
  let status = null;
  let statusText = null;
  let kind = null;

  const first = lines[0]?.trim() ?? '';
  const requestMatch = first.match(/^([A-Za-z]+)\s+(\S+)\s+HTTP\/(\d(?:\.\d)?)$/);
  const responseMatch = first.match(/^HTTP\/(\d(?:\.\d)?)\s+(\d{3})(?:\s+(.*))?$/);
  if (requestMatch && HTTP_METHODS.includes(requestMatch[1].toUpperCase())) {
    kind = 'request';
    method = requestMatch[1].toUpperCase();
    url = requestMatch[2];
    version = `HTTP/${requestMatch[3]}`;
    cursor = 1;
  } else if (responseMatch) {
    kind = 'response';
    version = `HTTP/${responseMatch[1]}`;
    status = Number(responseMatch[2]);
    statusText = (responseMatch[3] || '').trim() || httpStatusText(status);
    cursor = 1;
  } else if (first) {
    return { ok: false, error: 'The first line is not an HTTP request line or status line.', kind: null, method: null, url: null, version: null, status: null, statusText: null, headers: [], duplicates: [], malformed: [], count: 0 };
  }

  const headers = [];
  const duplicates = [];
  const malformed = [];
  const seen = new Map();

  for (let index = cursor; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^\s/.test(line)) {
      malformed.push({ line: index + 1, text: line, reason: 'Continuation line — the previous header was never terminated.' });
      continue;
    }
    const separator = line.indexOf(':');
    if (separator <= 0) {
      malformed.push({ line: index + 1, text: line, reason: 'No ":" between the header name and its value.' });
      continue;
    }
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)) {
      malformed.push({ line: index + 1, text: line, reason: `"${name}" is not a valid header field name.` });
      continue;
    }
    if (!value) {
      malformed.push({ line: index + 1, text: line, reason: `"${name}" has an empty value.` });
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      duplicates.push({ name, count: seen.get(lower) + 1 });
      seen.set(lower, seen.get(lower) + 1);
    } else {
      seen.set(lower, 1);
    }
    headers.push({ name, value, lower });
  }

  if (!headers.length && !malformed.length) {
    return { ok: false, error: 'No header lines were found.', kind: null, method: null, url: null, version: null, status: null, statusText: null, headers: [], duplicates: [], malformed: [], count: 0 };
  }

  return {
    ok: true,
    error: null,
    kind,
    method,
    url,
    version,
    status,
    statusText,
    headers,
    duplicates,
    malformed,
    count: headers.length
  };
}

/** Common HTTP status codes, used when a status line carries no reason phrase. */
function httpStatusText(code) {
  const table = {
    200: 'OK', 201: 'Created', 204: 'No Content', 206: 'Partial Content',
    301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
    408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 413: 'Payload Too Large', 415: 'Unsupported Media Type',
    418: "I'm a Teapot", 422: 'Unprocessable Content', 429: 'Too Many Requests',
    500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout'
  };
  return table[code] || '';
}

/* ------------------------------------------------------------------ *
 * IPv4 / CIDR
 * ------------------------------------------------------------------ */

/** Parse a dotted-quad IPv4 address into its four octets. */
export function parseIpv4(value) {
  const source = typeof value === 'string' ? value.trim() : '';
  if (!source) return { ok: false, octets: null, error: 'Enter an IPv4 address first.' };
  const parts = source.split('.');
  if (parts.length !== 4) {
    return { ok: false, octets: null, error: 'An IPv4 address needs exactly four octets, for example 192.168.1.10.' };
  }
  const octets = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return { ok: false, octets: null, error: `"${part}" is not a valid octet — use digits 0–255.` };
    }
    const number = Number(part);
    if (number > 255) {
      return { ok: false, octets: null, error: `The octet "${part}" is larger than 255.` };
    }
    octets.push(number);
  }
  return { ok: true, octets, error: null };
}

/** Turn four octets into a dotted-quad string. */
export function ipv4ToString(octets) {
  return octets.map((octet) => octet & 255).join('.');
}

/** Turn a dotted-quad string into its unsigned 32-bit integer value. */
export function ipv4ToInt(value) {
  const parsed = parseIpv4(value);
  if (!parsed.ok) return null;
  return ((parsed.octets[0] << 24) >>> 0) + (parsed.octets[1] << 16) + (parsed.octets[2] << 8) + parsed.octets[3];
}

/** Turn an unsigned 32-bit integer into a dotted-quad string. */
export function intToIpv4(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < 0 || number > 4294967295) {
    return { ok: false, output: null, error: 'Enter an integer between 0 and 4294967295.' };
  }
  const octets = [(number >>> 24) & 255, (number >>> 16) & 255, (number >>> 8) & 255, number & 255];
  return { ok: true, output: ipv4ToString(octets), error: null };
}

/**
 * Compute every CIDR fact for an IPv4 address and prefix length.
 * Pure and offline: network, broadcast, hosts, masks and binary forms.
 */
export function calculateSubnet(address, prefixLength) {
  const parsed = parseIpv4(address);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const prefix = Number(prefixLength);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return { ok: false, error: 'The prefix length must be a whole number between 0 and 32.' };
  }
  const ip = ipv4ToInt(parsed.octets.join('.'));
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const networkInt = (ip & mask) >>> 0;
  const broadcastInt = (networkInt | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? total : Math.max(0, total - 2);
  const firstHostInt = prefix >= 31 ? networkInt : (networkInt + 1) >>> 0;
  const lastHostInt = prefix >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;
  const netmask = ipv4ToString([(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255]);
  const wildcardText = ipv4ToString([(wildcard >>> 24) & 255, (wildcard >>> 16) & 255, (wildcard >>> 8) & 255, wildcard & 255]);
  const binary = (number) => [24, 16, 8, 0].map((shift) => ((number >>> shift) & 255).toString(2).padStart(8, '0')).join('.');
  return {
    ok: true,
    error: null,
    address: ipv4ToString(parsed.octets),
    prefix,
    cidr: `${ipv4ToString(parsed.octets)}/${prefix}`,
    network: ipv4ToString([(networkInt >>> 24) & 255, (networkInt >>> 16) & 255, (networkInt >>> 8) & 255, networkInt & 255]),
    broadcast: ipv4ToString([(broadcastInt >>> 24) & 255, (broadcastInt >>> 16) & 255, (broadcastInt >>> 8) & 255, broadcastInt & 255]),
    firstHost: ipv4ToString([(firstHostInt >>> 24) & 255, (firstHostInt >>> 16) & 255, (firstHostInt >>> 8) & 255, firstHostInt & 255]),
    lastHost: ipv4ToString([(lastHostInt >>> 24) & 255, (lastHostInt >>> 16) & 255, (lastHostInt >>> 8) & 255, lastHostInt & 255]),
    netmask,
    wildcard: wildcardText,
    total,
    usable,
    binary: {
      address: binary(ip),
      netmask: binary(mask),
      network: binary(networkInt),
      broadcast: binary(broadcastInt)
    }
  };
}

/* ------------------------------------------------------------------ *
 * Ports
 * ------------------------------------------------------------------ */

/** Well-known and registered service ports, with their IANA service names. */
export const KNOWN_PORTS = [
  { port: 20, name: 'ftp-data', description: 'FTP data transfer (legacy active mode).' },
  { port: 21, name: 'ftp', description: 'FTP control — file transfer protocol.' },
  { port: 22, name: 'ssh', description: 'Secure shell — remote command line and SFTP.' },
  { port: 23, name: 'telnet', description: 'Telnet — unencrypted remote terminal.' },
  { port: 25, name: 'smtp', description: 'SMTP — outbound mail transfer.' },
  { port: 53, name: 'domain', description: 'DNS — domain name system (UDP and TCP).' },
  { port: 67, name: 'dhcps', description: 'DHCP server — dynamic host configuration.' },
  { port: 68, name: 'dhcpc', description: 'DHCP client.' },
  { port: 69, name: 'tftp', description: 'TFTP — trivial FTP for network booting.' },
  { port: 80, name: 'http', description: 'HTTP — unencrypted web traffic.' },
  { port: 110, name: 'pop3', description: 'POP3 — mail retrieval.' },
  { port: 143, name: 'imap', description: 'IMAP — mail folder access.' },
  { port: 443, name: 'https', description: 'HTTP over TLS.' },
  { port: 445, name: 'microsoft-ds', description: 'SMB — Windows file sharing.' },
  { port: 587, name: 'submission', description: 'SMTP submission — mail relay for clients.' },
  { port: 993, name: 'imaps', description: 'IMAP over TLS.' },
  { port: 995, name: 'pop3s', description: 'POP3 over TLS.' },
  { port: 1433, name: 'ms-sql-s', description: 'Microsoft SQL Server.' },
  { port: 1521, name: '1521', description: 'Oracle database listener.' },
  { port: 3306, name: 'mysql', description: 'MySQL / MariaDB database.' },
  { port: 3389, name: 'ms-wbt-server', description: 'RDP — Windows remote desktop.' },
  { port: 5432, name: 'postgresql', description: 'PostgreSQL database.' },
  { port: 5672, name: 'amqp', description: 'AMQP — RabbitMQ message broker.' },
  { port: 6379, name: 'redis', description: 'Redis key-value store.' },
  { port: 8000, name: 'http-alt', description: 'HTTP alternative port.' },
  { port: 8080, name: 'http-alt', description: 'HTTP alternative — common for local development servers.' },
  { port: 8443, name: 'https-alt', description: 'HTTPS alternative port.' },
  { port: 9000, name: 'cslistener', description: 'PHP-FPM and various application servers.' },
  { port: 9090, name: 'zeus-admin', description: 'Prometheus and other admin interfaces.' },
  { port: 9200, name: 'wap-wsp', description: 'Elasticsearch — REST API.' },
  { port: 27017, name: 'mongodb', description: 'MongoDB database.' },
  { port: 27018, name: 'mongodb', description: 'MongoDB — legacy sharding port.' }
];

/**
 * Validate a port number and describe the well-known service on it.
 * Pure and offline: nothing is scanned or contacted.
 */
export function describePort(value) {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '' || raw === null || raw === undefined) {
    return { ok: false, error: 'Enter a port number first.', port: null, known: null, range: null };
  }
  const port = Number(raw);
  if (!Number.isInteger(port)) {
    return { ok: false, error: 'A port number must be a whole number.', port: null, known: null, range: null };
  }
  if (port < 0 || port > 65535) {
    return { ok: false, error: 'A port number must be between 0 and 65535.', port: null, known: null, range: null };
  }
  const known = KNOWN_PORTS.find((entry) => entry.port === port) || null;
  return {
    ok: true,
    error: null,
    port,
    known,
    range: port === 0 ? '0 — reserved ("any port")' : port < 1024 ? 'System port (0–1023) — needs elevated privileges to bind.' : port < 49152 ? 'User port (1024–49151) — the default range for applications.' : port < 65536 ? 'Dynamic / private (49152–65535) — usually assigned automatically.' : null
  };
}

/** Look up a port number in the well-known table (alias of describePort). */
export function lookupPort(port) {
  return describePort(port);
}

/* ------------------------------------------------------------------ *
 * User-agent / header builder
 * ------------------------------------------------------------------ */

/** Browser and device profiles used by the request-header builder. */
export const UA_PROFILES = [
  {
    id: 'chrome-windows',
    label: 'Chrome on Windows',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  },
  {
    id: 'chrome-macos',
    label: 'Chrome on macOS',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  },
  {
    id: 'safari-macos',
    label: 'Safari on macOS',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    }
  },
  {
    id: 'firefox-windows',
    label: 'Firefox on Windows',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  },
  {
    id: 'edge-windows',
    label: 'Edge on Windows',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  },
  {
    id: 'safari-ios',
    label: 'Mobile Safari on iOS',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    }
  },
  {
    id: 'chrome-android',
    label: 'Chrome on Android',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Ch-Ua-Platform': '"Android"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  }
];

/**
 * Build a copy-ready header set for a profile id.
 * Pure and offline: it only assembles a static template.
 */
export function buildUserAgentHeaders(profileId) {
  const id = typeof profileId === 'string' ? profileId.trim() : '';
  const profile = UA_PROFILES.find((entry) => entry.id === id) || null;
  if (!profile) {
    return { ok: false, error: 'Pick a browser profile first.', profile: null, headers: [], lines: [] };
  }
  const headers = Object.entries(profile.headers);
  const lines = headers.map(([name, value]) => `${name}: ${value}`);
  return {
    ok: true,
    error: null,
    profile: { id: profile.id, label: profile.label },
    headers,
    lines
  };
}

/* ------------------------------------------------------------------ *
 * YAML
 * ------------------------------------------------------------------ */

/**
 * A deliberately small, hand-written YAML reader.
 *
 * It understands the block subset that shows up in configuration files:
 * nested mappings, block sequences, inline flow collections, quoted and
 * plain scalars, block scalars (| and >) and comments. It is not a complete
 * YAML 1.2 implementation — anchors, aliases, tags, multi-document streams
 * and complex keys are deliberately out of scope.
 *
 * Returns { ok, tree, error, line }. `tree` is either
 * { kind: 'map', entries: [...] }, { kind: 'seq', items: [...] } or
 * { kind: 'scalar', value: '…' }.
 */
function parseYaml(text) {
  const source = typeof text === 'string' ? text : '';
  const lines = source.split(/\r\n|\r|\n/);
  let index = 0;

  const isBlank = (line) => !line.trim();
  const isComment = (line) => /^\s*#/.test(line);

  /** Split "key: value" honouring quoted keys. */
  function splitKey(text) {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === "'" && !inDouble) inSingle = !inSingle;
      else if (char === '"' && !inSingle) inDouble = !inDouble;
      else if (char === ':' && !inSingle && !inDouble) {
        const after = text[i + 1];
        if (after === undefined || after === ' ' || after === '\t') {
          return { key: text.slice(0, i).trim(), rest: text.slice(i + 1).trim() };
        }
      }
    }
    return null;
  }

  /** Strip an inline "# comment" that is not inside quotes. */
  function stripComment(text) {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === "'" && !inDouble) inSingle = !inSingle;
      else if (char === '"' && !inSingle) inDouble = !inDouble;
      else if (char === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(text[i - 1]))) {
        return text.slice(0, i);
      }
    }
    return text;
  }

  function unquote(text) {
    const value = text.trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    }
    if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1).replace(/''/g, "'");
    }
    return value;
  }

  /** Split a flow collection body on top-level commas. */
  function splitFlow(text) {
    const parts = [];
    let depth = 0;
    let quote = '';
    let current = '';
    for (const char of text) {
      if (quote) {
        current += char;
        if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") { quote = char; current += char; continue; }
      if (char === '[' || char === '{') { depth += 1; current += char; continue; }
      if (char === ']' || char === '}') { depth -= 1; current += char; continue; }
      if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
      current += char;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  /** Read a flow collection such as [a, b] or {a: 1}. */
  function readFlow(text) {
    const value = text.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (!inner) return { kind: 'seq', items: [] };
      return { kind: 'seq', items: splitFlow(inner).map((item) => scalarNode(item)) };
    }
    if (value.startsWith('{') && value.endsWith('}')) {
      const inner = value.slice(1, -1).trim();
      const entries = [];
      if (!inner) return { kind: 'map', entries };
      for (const part of splitFlow(inner)) {
        const split = splitKey(part);
        if (!split) return { error: `Cannot read inline map entry "${part}".`, line: index + 1 };
        entries.push({ key: unquote(split.key), value: scalarNode(split.rest) });
      }
      return { kind: 'map', entries };
    }
    return null;
  }

  function scalarNode(raw) {
    const value = stripComment(String(raw ?? '')).trim();
    if (!value) return { kind: 'scalar', value: '' };
    const flow = readFlow(value);
    if (flow && !flow.error) return flow;
    return { kind: 'scalar', value: unquote(value) };
  }

  /** Parse a block scalar (| or >) starting at the current line. */
  function readBlockScalar(header, parentIndent) {
    const folded = header[0] === '>';
    const chomp = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip';
    const body = [];
    let blockIndent = null;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { body.push(''); index += 1; continue; }
      const indent = line.length - line.trimStart().length;
      if (indent <= parentIndent) break;
      if (blockIndent === null) blockIndent = indent;
      body.push(line.slice(blockIndent));
      index += 1;
    }
    while (body.length && body[body.length - 1] === '') body.pop();
    let text;
    if (folded) {
      text = '';
      body.forEach((line, i) => {
        if (i === 0) { text = line; return; }
        if (line === '' || body[i - 1] === '') text += `\n${line}`;
        else text += ` ${line}`;
      });
    } else {
      text = body.join('\n');
    }
    if (chomp !== 'strip' && text) text += '\n';
    return { kind: 'scalar', value: text, block: true };
  }

  function parseBlock(indent) {
    let probe = index;
    while (probe < lines.length && (isBlank(lines[probe]) || isComment(lines[probe]))) probe += 1;
    if (probe >= lines.length) { index = probe; return null; }
    const probeIndent = lines[probe].length - lines[probe].trimStart().length;
    if (probeIndent < indent) { index = probe; return null; }
    if (probeIndent > indent) return { error: 'Unexpected indentation.', line: probe + 1 };
    if (/^\s*-\s/.test(lines[probe])) return parseSequence(indent);
    return parseMapping(indent);
  }

  function parseMapping(indent) {
    const entries = [];
    while (index < lines.length) {
      const line = lines[index];
      if (isBlank(line)) { index += 1; continue; }
      if (isComment(line)) { index += 1; continue; }
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent < indent) break;
      if (lineIndent > indent) return { error: 'Unexpected indentation.', line: index + 1 };
      const body = line.trim();
      if (body === '---' || body === '...') break;
      if (/^-\s/.test(body)) return { error: 'Expected a mapping key but found a list item.', line: index + 1 };
      const split = splitKey(body);
      if (!split) return { error: `Expected "key: value" but found "${body}".`, line: index + 1 };
      const key = unquote(split.key);
      if (!key) return { error: 'A mapping key cannot be empty.', line: index + 1 };
      index += 1;
      const rest = split.rest;
      let value;
      if (rest === '') {
        let peek = index;
        while (peek < lines.length && (isBlank(lines[peek]) || isComment(lines[peek]))) peek += 1;
        if (peek >= lines.length) {
          value = { kind: 'scalar', value: '' };
        } else {
          const peekIndent = lines[peek].length - lines[peek].trimStart().length;
          const peekBody = lines[peek].trim();
          if (peekIndent > indent) {
            const child = parseBlock(peekIndent);
            if (child?.error) return child;
            value = child || { kind: 'scalar', value: '' };
          } else if (peekIndent === indent && /^-(?:\s|$)/.test(peekBody)) {
            const child = parseSequence(indent);
            if (child?.error) return child;
            value = child || { kind: 'scalar', value: '' };
          } else {
            value = { kind: 'scalar', value: '' };
          }
        }
      } else if (rest[0] === '|' || rest[0] === '>') {
        value = readBlockScalar(rest, indent);
      } else {
        const flow = readFlow(rest);
        if (flow?.error) return flow;
        value = flow || scalarNode(rest);
      }
      entries.push({ key, value });
    }
    return { kind: 'map', entries };
  }

  function parseSequence(indent) {
    const items = [];
    while (index < lines.length) {
      const line = lines[index];
      if (isBlank(line)) { index += 1; continue; }
      if (isComment(line)) { index += 1; continue; }
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent < indent) break;
      if (lineIndent > indent) return { error: 'Unexpected indentation inside a list.', line: index + 1 };
      const body = line.trim();
      if (!/^-(?:\s|$)/.test(body)) break;
      const rest = body.slice(1).trim();
      index += 1;
      if (rest === '') {
        let peek = index;
        while (peek < lines.length && (isBlank(lines[peek]) || isComment(lines[peek]))) peek += 1;
        if (peek < lines.length) {
          const peekIndent = lines[peek].length - lines[peek].trimStart().length;
          if (peekIndent > indent) {
            const child = parseBlock(peekIndent);
            if (child?.error) return child;
            items.push(child || { kind: 'scalar', value: '' });
            continue;
          }
        }
        items.push({ kind: 'scalar', value: '' });
        continue;
      }
      const split = splitKey(rest);
      if (split) {
        // "- key: value" opens a nested mapping whose keys sit in the column
        // where the key itself starts, i.e. just after the dash and its space.
        const innerIndent = indent + 2;
        const nested = parseInlineMapping(split, innerIndent);
        if (nested.error) return nested;
        items.push(nested.node);
        continue;
      }
      const flow = readFlow(rest);
      if (flow?.error) return flow;
      items.push(flow || scalarNode(rest));
    }
    return { kind: 'seq', items };
  }

  /** Handle the "- key: value" / "- key:" form that opens a nested mapping. */
  function parseInlineMapping(split, innerIndent) {
    const entries = [];
    const key = unquote(split.key);
    const rest = split.rest;
    let value;
    if (rest === '') {
      let peek = index;
      while (peek < lines.length && (isBlank(lines[peek]) || isComment(lines[peek]))) peek += 1;
      if (peek < lines.length) {
        const peekIndent = lines[peek].length - lines[peek].trimStart().length;
        if (peekIndent > innerIndent) {
          const child = parseBlock(peekIndent);
          if (child?.error) return child;
          value = child || { kind: 'scalar', value: '' };
        } else {
          value = { kind: 'scalar', value: '' };
        }
      } else {
        value = { kind: 'scalar', value: '' };
      }
    } else if (rest[0] === '|' || rest[0] === '>') {
      value = readBlockScalar(rest, innerIndent - 1);
    } else {
      const flow = readFlow(rest);
      if (flow?.error) return flow;
      value = flow || scalarNode(rest);
    }
    entries.push({ key, value });

    // Sibling keys of that inline mapping are indented to the same column.
    while (index < lines.length) {
      const line = lines[index];
      if (isBlank(line)) { index += 1; continue; }
      if (isComment(line)) { index += 1; continue; }
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent !== innerIndent) break;
      const body = line.trim();
      if (/^-(?:\s|$)/.test(body)) break;
      const next = splitKey(body);
      if (!next) break;
      index += 1;
      const nextRest = next.rest;
      let nextValue;
      if (nextRest === '') {
        let peek = index;
        while (peek < lines.length && (isBlank(lines[peek]) || isComment(lines[peek]))) peek += 1;
        if (peek < lines.length) {
          const peekIndent = lines[peek].length - lines[peek].trimStart().length;
          if (peekIndent > innerIndent) {
            const child = parseBlock(peekIndent);
            if (child?.error) return child;
            nextValue = child || { kind: 'scalar', value: '' };
          } else {
            nextValue = { kind: 'scalar', value: '' };
          }
        } else {
          nextValue = { kind: 'scalar', value: '' };
        }
      } else {
        const flow = readFlow(nextRest);
        if (flow?.error) return flow;
        nextValue = flow || scalarNode(nextRest);
      }
      entries.push({ key: unquote(next.key), value: nextValue });
    }
    return { node: { kind: 'map', entries } };
  }

  // Skip leading blank lines, comments and a document marker.
  while (index < lines.length && (isBlank(lines[index]) || isComment(lines[index]) || lines[index].trim() === '---')) {
    index += 1;
  }
  if (index >= lines.length) return { ok: true, tree: { kind: 'map', entries: [] }, line: 1 };

  const root = parseBlock(0);
  if (root?.error) return { ok: false, error: root.error, line: root.line };
  return { ok: true, tree: root || { kind: 'map', entries: [] }, line: 1 };
}

/** Render a parsed YAML tree back to text with a consistent style. */
function renderYaml(tree, indent = 0) {
  const pad = ' '.repeat(indent);
  if (!tree) return '';
  if (tree.kind === 'scalar') {
    if (tree.block) {
      const body = String(tree.value).replace(/\n$/, '');
      return body.split('\n').map((line) => (line ? `${pad}  ${line}` : '')).join('\n');
    }
    return `${pad}${formatYamlScalar(tree.value)}`;
  }
  if (tree.kind === 'seq') {
    if (!tree.items.length) return `${pad}[]`;
    return tree.items.map((item) => {
      if (item.kind === 'scalar') return `${pad}- ${formatYamlScalar(item.value)}`;
      const rendered = renderYaml(item, indent + 2);
      return `${pad}-${rendered.slice(indent + 1)}`;
    }).join('\n');
  }
  if (!tree.entries.length) return `${pad}{}`;
  return tree.entries.map((entry) => {
    if (entry.value.kind === 'scalar' && !entry.value.block) {
      return `${pad}${entry.key}: ${formatYamlScalar(entry.value.value)}`;
    }
    if (entry.value.kind === 'scalar' && entry.value.block) {
      const header = entry.value.value.includes('\n') ? '|' : '|-';
      return `${pad}${entry.key}: ${header}\n${renderYaml(entry.value, indent + 2)}`;
    }
    const rendered = renderYaml(entry.value, indent + 2);
    if (!rendered.trim()) return `${pad}${entry.key}: ${entry.value.kind === 'seq' ? '[]' : '{}'}`;
    return `${pad}${entry.key}:\n${rendered}`;
  }).join('\n');
}

/** Quote a scalar only when a plain style would be ambiguous. */
function formatYamlScalar(value) {
  const text = String(value ?? '');
  if (text === '') return "''";
  if (/^\s|\s$/.test(text)) return JSON.stringify(text);
  if (/[:#\-?](\s|$)/.test(text)) return JSON.stringify(text);
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(text)) return JSON.stringify(text);
  // Plain integers and floats stay unquoted — YAML reads them as numbers.
  if (/^[-+]?(\d[\d_]*(\.\d*)?([eE][-+]?\d+)?)$/.test(text)) return text;
  if (/[,\[\]{}&*!|>%@`"']/.test(text)) return JSON.stringify(text);
  if (/[\n\t]/.test(text)) return JSON.stringify(text);
  return text;
}

/**
 * Format (or minify) YAML.
 *
 * The parser is deliberately conservative. When the document cannot be read
 * with confidence the caller can fall back to reindentYaml() and report that
 * in the panel, rather than silently rewriting the file.
 */
export function formatYaml(text, options = {}) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter some YAML first.', mode: 'none', line: null };
  const parsed = parseYaml(source);
  if (!parsed.ok) {
    const line = parsed.line || 1;
    return {
      ok: false,
      output: '',
      error: `Malformed YAML at line ${line}: ${parsed.error}`,
      mode: 'none',
      line
    };
  }
  const output = options.minify === true ? minifyYamlTree(parsed.tree) : renderYaml(parsed.tree, 0);
  return {
    ok: true,
    output: output.endsWith('\n') ? output : `${output}\n`,
    error: null,
    mode: 'parsed',
    line: null
  };
}

/** Collapse a parsed YAML tree onto as few lines as possible. */
function minifyYamlTree(tree) {
  if (!tree) return '';
  if (tree.kind === 'scalar') return formatYamlScalar(tree.value);
  if (tree.kind === 'seq') {
    if (!tree.items.length) return '[]';
    return `[${tree.items.map(minifyYamlTree).join(', ')}]`;
  }
  if (!tree.entries.length) return '{}';
  return `{${tree.entries.map((entry) => `${entry.key}: ${minifyYamlTree(entry.value)}`).join(', ')}}`;
}

/**
 * A conservative line-based YAML re-indenter, used as a fallback when the
 * document uses YAML features the small parser does not model.
 */
export function reindentYaml(text, indent = 2) {
  const source = typeof text === 'string' ? text : '';
  const out = [];
  const stack = [];
  source.split(/\r\n|\r|\n/).forEach((line) => {
    if (!line.trim()) { out.push(''); return; }
    const match = /^(\s*)(.*)$/.exec(line);
    const current = match[1].length;
    const body = match[2];
    while (stack.length && current < stack[stack.length - 1]) stack.pop();
    const level = stack.length;
    out.push(`${' '.repeat(level * indent)}${body.trim()}`);
    if (/[-:]\s*$/.test(body) || /^-\s/.test(body)) stack.push(current + 1);
  });
  return out.join('\n');
}

/* ------------------------------------------------------------------ *
 * Terraform / HCL
 * ------------------------------------------------------------------ */

/** Locate the first unbalanced brace or bracket in an HCL document. */
export function findHclError(text) {
  const source = typeof text === 'string' ? text : '';
  const stack = [];
  let line = 1;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '\n') {
      line += 1;
      inLineComment = false;
      continue;
    }
    if (inLineComment) continue;
    if (inBlockComment) {
      if (char === '*' && next === '/') { inBlockComment = false; i += 1; }
      continue;
    }
    if (inString) {
      if (char === '\\') { i += 1; continue; }
      if (char === inString) inString = null;
      continue;
    }
    if (char === '#') { inLineComment = true; continue; }
    if (char === '/' && next === '/') { inLineComment = true; i += 1; continue; }
    if (char === '/' && next === '*') { inBlockComment = true; i += 1; continue; }
    if (char === '"') { inString = '"'; continue; }
    if (char === '{' || char === '[') { stack.push({ char, line }); continue; }
    if (char === '}' || char === ']') {
      const open = stack.pop();
      if (!open) return { message: `Unexpected closing "${char}".`, line };
      if ((char === '}' && open.char !== '{') || (char === ']' && open.char !== '[')) {
        return { message: `Mismatched "${char}" — expected "${open.char === '{' ? '}' : ']'}".`, line };
      }
    }
  }
  if (stack.length) {
    const open = stack[stack.length - 1];
    return { message: `Unclosed "${open.char}".`, line: open.line };
  }
  return null;
}

/**
 * Format an HCL/Terraform document: two-space indentation and aligned "="
 * signs inside consecutive attribute blocks.
 */
export function formatTerraform(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter some Terraform or HCL first.', line: null };
  const problem = findHclError(source);
  if (problem) {
    return {
      ok: false,
      output: '',
      error: `Unbalanced braces or brackets at line ${problem.line}: ${problem.message}`,
      line: problem.line
    };
  }

  const rawLines = source.split(/\r\n|\r|\n/);
  const rendered = [];
  let depth = 0;
  rawLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { rendered.push({ text: '', depth: 0 }); return; }
    const opens = countHclBrackets(trimmed);
    const closes = countHclBrackets(trimmed, true);
    // Count how many closing brackets the line opens with, so the line can be
    // dedented by exactly that much before it is printed.
    let lead = 0;
    let rest = trimmed;
    while (rest.startsWith('}') || rest.startsWith(']')) { lead += 1; rest = rest.slice(1).trimStart(); }
    rendered.push({ text: trimmed, depth, lead });
    depth = Math.max(0, depth + opens - closes);
  });

  // Group consecutive attribute lines ("name = value") so their "=" signs can
  // be aligned into one column.
  let index = 0;
  while (index < rendered.length) {
    if (!rendered[index].text || !isHclAttribute(rendered[index].text)) { index += 1; continue; }
    const group = [];
    const groupDepth = rendered[index].depth;
    while (index < rendered.length && rendered[index].text && isHclAttribute(rendered[index].text) && rendered[index].depth === groupDepth) {
      group.push(rendered[index]);
      index += 1;
    }
    if (group.length < 2) continue;
    const equals = group.map((line) => line.text.indexOf('='));
    const target = Math.max(...equals);
    group.forEach((line, at) => {
      const position = equals[at];
      line.text = `${line.text.slice(0, position)}${' '.repeat(target - position + 1)}=${line.text.slice(position + 1)}`;
    });
  }

  const out = [];
  for (const line of rendered) {
    if (!line.text) { out.push(''); continue; }
    // A line that starts with closing brackets sits one level shallower.
    const level = Math.max(0, line.depth - line.lead);
    out.push(`${'  '.repeat(level)}${line.text}`);
  }

  let output = out.join('\n');
  if (!output.endsWith('\n')) output += '\n';
  return { ok: true, output, error: null, line: null };
}

/** Count opening (or closing) braces/brackets outside strings and comments. */
function countHclBrackets(line, closing = false) {
  let count = 0;
  let inString = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inString) {
      if (char === '\\') { i += 1; continue; }
      if (char === inString) inString = null;
      continue;
    }
    if (char === '#') break;
    if (char === '"') { inString = '"'; continue; }
    if (closing) { if (char === '}' || char === ']') count += 1; }
    else if (char === '{' || char === '[') count += 1;
  }
  return count;
}

/** True when a line looks like "name = value" (a Terraform attribute). */
function isHclAttribute(text) {
  if (/^(resource|variable|output|provider|module|data|locals|terraform)\b/.test(text)) return false;
  const position = text.indexOf('=');
  if (position <= 0) return false;
  if (text[position - 1] === '=' || text[position + 1] === '=') return false;
  return /^[A-Za-z_][\w.\-["\]]*\s*=/.test(text);
}

/* ------------------------------------------------------------------ *
 * SQL
 * ------------------------------------------------------------------ */

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'group', 'by', 'order', 'having', 'limit', 'offset',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table',
  'alter', 'drop', 'index', 'view', 'join', 'inner', 'left', 'right', 'full',
  'outer', 'cross', 'on', 'as', 'and', 'or', 'not', 'in', 'is', 'null', 'like',
  'between', 'exists', 'case', 'when', 'then', 'else', 'end', 'union', 'all',
  'distinct', 'asc', 'desc', 'primary', 'key', 'foreign', 'references', 'default',
  'unique', 'check', 'constraint', 'with', 'returning', 'using', 'cascade'
]);

const SQL_CLAUSE_KEYWORDS = new Set([
  'select', 'from', 'where', 'group', 'order', 'having', 'limit', 'offset',
  'union', 'join', 'inner', 'left', 'right', 'full', 'outer', 'cross', 'on',
  'values', 'set', 'returning'
]);

/** Find the first unbalanced parenthesis in a SQL statement. */
export function findSqlError(text) {
  const source = typeof text === 'string' ? text : '';
  let depth = 0;
  let line = 1;
  let inString = null;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '\n') { line += 1; continue; }
    if (inString) {
      if (char === inString) {
        if (source[i + 1] === inString) { i += 1; continue; }
        inString = null;
      }
      continue;
    }
    if (char === "'" || char === '"') { inString = char; continue; }
    if (char === '-' && source[i + 1] === '-') {
      while (i < source.length && source[i] !== '\n') i += 1;
      line += 1;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth < 0) return { message: 'Unexpected closing parenthesis.', line };
    }
  }
  if (depth > 0) return { message: 'Unclosed parenthesis.', line };
  return null;
}

/**
 * Format a SQL statement: uppercase keywords, collapse runs of whitespace and
 * put the major clauses on their own lines.
 */
export function formatSql(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter a SQL statement first.', line: null };
  const problem = findSqlError(source);
  if (problem) {
    return {
      ok: false,
      output: '',
      error: `Unbalanced parentheses at line ${problem.line}: ${problem.message}`,
      line: problem.line
    };
  }

  // Split into tokens, keeping string literals intact.
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) { i += 1; continue; }
    if (char === "'" || char === '"') {
      let literal = char;
      i += 1;
      while (i < source.length) {
        literal += source[i];
        if (source[i] === char) {
          if (source[i + 1] === char) { literal += source[i + 1]; i += 2; continue; }
          i += 1;
          break;
        }
        i += 1;
      }
      tokens.push({ type: 'string', value: literal });
      continue;
    }
    if (char === '-' && source[i + 1] === '-') {
      let comment = '';
      while (i < source.length && source[i] !== '\n') { comment += source[i]; i += 1; }
      tokens.push({ type: 'comment', value: comment.trim() });
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      let comment = '';
      while (i < source.length) {
        comment += source[i];
        if (source[i] === '*' && source[i + 1] === '/') { comment += source[i + 1]; i += 2; break; }
        i += 1;
      }
      tokens.push({ type: 'comment', value: comment.trim() });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let word = '';
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i])) { word += source[i]; i += 1; }
      tokens.push({ type: 'word', value: word });
      continue;
    }
    if (/[0-9]/.test(char)) {
      let number = '';
      while (i < source.length && /[0-9.]/.test(source[i])) { number += source[i]; i += 1; }
      tokens.push({ type: 'number', value: number });
      continue;
    }
    tokens.push({ type: 'punct', value: char });
    i += 1;
  }

  const upper = tokens.map((token) => {
    if (token.type !== 'word') return token;
    const lowered = token.value.toLowerCase();
    if (SQL_KEYWORDS.has(lowered)) return { ...token, value: token.value.toUpperCase(), keyword: true };
    return token;
  });

  const lines = [];
  let current = '';
  const push = () => { if (current.trim()) lines.push(current.trim()); current = ''; };

  for (let t = 0; t < upper.length; t += 1) {
    const token = upper[t];
    if (token.type === 'comment') {
      push();
      lines.push(token.value);
      continue;
    }
    const next = upper[t + 1];
    const isClause = token.keyword === true && SQL_CLAUSE_KEYWORDS.has(token.value.toLowerCase());
    const isGroupBy = token.keyword === true && token.value.toUpperCase() === 'GROUP'
      && next?.keyword === true && next.value.toUpperCase() === 'BY';
    const isOrderBy = token.keyword === true && token.value.toUpperCase() === 'ORDER'
      && next?.keyword === true && next.value.toUpperCase() === 'BY';
    if ((isClause && current.trim()) || isGroupBy || isOrderBy) push();
    if (!current) {
      current = token.value;
    } else {
      const previous = current[current.length - 1];
      // No space before a closing bracket, a comma or a dot. A "(" hugs the
      // name in front of it so function calls read as count(*), but a keyword
      // such as WHERE or IN still keeps its space before the bracket.
      const previousIsKeyword = /\b(?:WHERE|IN|VALUES|INTO|ON|AND|OR|NOT|BETWEEN|HAVING|SELECT|FROM|SET|EXISTS|ANY|ALL|SOME|LIKE)\s*$/i.test(current);
      const noSpaceBefore = /^[,.)\];]/.test(token.value)
        || (token.value === '(' && /[A-Za-z0-9_$]/.test(previous) && !previousIsKeyword);
      const noSpaceAfter = /^[(\[]/.test(previous);
      const needsSpace = !noSpaceBefore && !noSpaceAfter;
      current += `${needsSpace ? ' ' : ''}${token.value}`;
    }
  }
  push();

  let output = lines.join('\n');
  if (!output.endsWith('\n')) output += '\n';
  return { ok: true, output, error: null, line: null };
}

/* ------------------------------------------------------------------ *
 * XML
 * ------------------------------------------------------------------ */

/**
 * Pretty-print XML with a hand-written, string based indenter.
 *
 * The DOM path in the page uses DOMParser for validation; this pure
 * function is what the tests exercise, so it must work in bare Node.
 */
export function formatXml(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter some XML first.', line: null };
  const stripped = source.replace(/^﻿/, '').trim();
  if (!stripped.startsWith('<')) {
    return { ok: false, output: '', error: 'Malformed XML at line 1: the document must start with "<".', line: 1 };
  }

  const tokens = [];
  let i = 0;
  let line = 1;
  const push = (type, value) => tokens.push({ type, value, line });
  while (i < source.length) {
    if (source[i] === '<') {
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i);
        if (end === -1) return { ok: false, output: '', error: `Malformed XML at line ${line}: unterminated comment.`, line };
        const value = source.slice(i, end + 3);
        push('comment', value);
        line += (value.match(/\n/g) || []).length;
        i = end + 3;
        continue;
      }
      if (source.startsWith('<![CDATA[', i)) {
        const end = source.indexOf(']]>', i);
        if (end === -1) return { ok: false, output: '', error: `Malformed XML at line ${line}: unterminated CDATA section.`, line };
        push('cdata', source.slice(i, end + 3));
        i = end + 3;
        continue;
      }
      if (source.startsWith('<?', i)) {
        const end = source.indexOf('?>', i);
        if (end === -1) return { ok: false, output: '', error: `Malformed XML at line ${line}: unterminated processing instruction.`, line };
        push('pi', source.slice(i, end + 2));
        i = end + 2;
        continue;
      }
      if (source.startsWith('<!', i)) {
        const end = source.indexOf('>', i);
        if (end === -1) return { ok: false, output: '', error: `Malformed XML at line ${line}: unterminated declaration.`, line };
        push('decl', source.slice(i, end + 1));
        i = end + 1;
        continue;
      }
      const end = source.indexOf('>', i);
      if (end === -1) return { ok: false, output: '', error: `Malformed XML at line ${line}: unterminated tag.`, line };
      push('tag', source.slice(i, end + 1));
      i = end + 1;
      continue;
    }
    const next = source.indexOf('<', i);
    const chunk = source.slice(i, next === -1 ? source.length : next);
    if (chunk.trim()) push('text', chunk.trim());
    i = next === -1 ? source.length : next;
  }

  // Validate tag nesting.
  const stack = [];
  for (const token of tokens) {
    if (token.type !== 'tag') continue;
    const raw = token.value;
    if (raw.startsWith('</')) {
      const name = raw.slice(2, -1).trim();
      const open = stack.pop();
      if (!open) {
        return { ok: false, output: '', error: `Malformed XML at line ${token.line}: closing tag </${name}> has no opening tag.`, line: token.line };
      }
      if (open.name !== name) {
        return { ok: false, output: '', error: `Malformed XML at line ${token.line}: </${name}> does not match <${open.name}> opened on line ${open.line}.`, line: token.line };
      }
    } else if (raw.endsWith('/>')) {
      continue;
    } else {
      const name = /^<\s*([^\s/>]+)/.exec(raw)?.[1] || '';
      stack.push({ name, line: token.line });
    }
  }
  if (stack.length) {
    const open = stack[stack.length - 1];
    return { ok: false, output: '', error: `Malformed XML at line ${open.line}: <${open.name}> is never closed.`, line: open.line };
  }

  const out = [];
  let level = 0;
  let pending = '';
  for (const token of tokens) {
    if (token.type === 'text') { pending += token.value; continue; }
    if (pending) {
      out.push(`${'  '.repeat(level)}${pending}`);
      pending = '';
    }
    if (token.type !== 'tag') {
      out.push(`${'  '.repeat(level)}${token.value.trim()}`);
      continue;
    }
    const raw = token.value;
    if (raw.startsWith('</')) {
      level = Math.max(0, level - 1);
      out.push(`${'  '.repeat(level)}${raw}`);
      continue;
    }
    out.push(`${'  '.repeat(level)}${raw}`);
    if (!raw.endsWith('/>')) level += 1;
  }
  if (pending) out.push(`${'  '.repeat(level)}${pending}`);

  let output = out.join('\n');
  if (!output.endsWith('\n')) output += '\n';
  return { ok: true, output, error: null, line: null };
}

/* ------------------------------------------------------------------ *
 * Syntax highlighting
 * ------------------------------------------------------------------ */

/** Escape every character that could break out of HTML text or an attribute. */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build highlighted markup from a list of { type, value } tokens.
 *
 * The raw text is HTML-escaped before any token is wrapped, so no user text
 * can ever reach the DOM unescaped.
 */
function renderTokens(tokens) {
  return tokens.map((token) => {
    const safe = escapeHtml(token.value);
    if (!safe) return '';
    if (!token.type || token.type === 'plain') return safe;
    return `<span class="tok-${token.type}">${safe}</span>`;
  }).join('');
}

/**
 * Tokenise source text into highlighted markup.
 *
 * `rules` is an array of { type, test } where `test` is a regular expression
 * whose match decides the token type. The first matching rule wins.
 */
function tokenize(source, rules) {
  const text = typeof source === 'string' ? source : '';
  const tokens = [];
  let plain = '';
  let i = 0;
  while (i < text.length) {
    let matched = null;
    for (const rule of rules) {
      // The sticky flag anchors the match at the real position in the original
      // string, so a lookbehind can still see the preceding character. Slicing
      // the text instead would hide that context and split words such as
      // "imon" into "im" + the boolean "on".
      rule.test.lastIndex = i;
      const match = rule.test.exec(text);
      if (match && match[0]) { matched = { rule, value: match[0] }; break; }
    }
    if (!matched) {
      plain += text[i];
      i += 1;
      continue;
    }
    if (plain) { tokens.push({ type: 'plain', value: plain }); plain = ''; }
    tokens.push({ type: matched.rule.type, value: matched.value });
    i += matched.value.length;
  }
  if (plain) tokens.push({ type: 'plain', value: plain });
  return tokens;
}

/** Shared JSON punctuation rule. */
const PUNCT_RULE = { type: 'punct', test: /[{}[\],:]+/y };

/** Highlight JSON text. Always HTML-escapes the input first. */
export function highlightJson(text) {
  const source = typeof text === 'string' ? text : '';
  const rules = [
    { type: 'comment', test: /\/\/[^\n]*/y },
    { type: 'comment', test: /\/\*[\s\S]*?\*\//y },
    { type: 'str', test: /"(?:[^"\\]|\\.)*"/y },
    { type: 'bool', test: /(?<![\w.])(?:true|false)(?![\w])/y },
    { type: 'null', test: /(?<![\w.])(?:null)(?![\w])/y },
    { type: 'num', test: /-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/y },
    PUNCT_RULE
  ];
  const tokens = tokenize(source, rules);
  // A string that is immediately followed by a colon is an object key.
  tokens.forEach((token, at) => {
    if (token.type !== 'str') return;
    const next = tokens[at + 1];
    if (next?.type === 'punct' && next.value.startsWith(':')) token.type = 'key';
  });
  return renderTokens(tokens);
}

/** Highlight YAML text. Always HTML-escapes the input first. */
export function highlightYaml(text) {
  const source = typeof text === 'string' ? text : '';
  const rules = [
    { type: 'str', test: /"(?:[^"\\]|\\.)*"/y },
    { type: 'str', test: /'(?:[^']|'')*'/y },
    { type: 'bool', test: /(?<![\w.-])(?:true|false|yes|no|on|off)(?![\w-])/y },
    { type: 'null', test: /(?<![\w.-])(?:null|~)(?![\w-])/y },
    { type: 'num', test: /-?\d+(?:\.\d+)?(?=\s|$)/y },
    { type: 'key', test: /[^\s#][^:]*:(?=\s|$)/y },
    { type: 'punct', test: /[-?:,\[\]{}]/y }
  ];
  const lines = source.split('\n');
  const out = [];
  lines.forEach((line, index) => {
    if (index) out.push('\n');
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) {
      out.push(`<span class="tok-comment">${escapeHtml(line)}</span>`);
      return;
    }
    const commentAt = trimmed.indexOf(' #');
    const body = commentAt === -1 ? trimmed : trimmed.slice(0, commentAt);
    const comment = commentAt === -1 ? '' : trimmed.slice(commentAt);
    out.push(renderTokens(tokenize(body, rules)));
    if (comment) out.push(`<span class="tok-comment">${escapeHtml(comment)}</span>`);
  });
  return out.join('');
}

/** Highlight Terraform/HCL text. Always HTML-escapes the input first. */
export function highlightTf(text) {
  const source = typeof text === 'string' ? text : '';
  const rules = [
    { type: 'comment', test: /#[^\n]*/y },
    { type: 'comment', test: /\/\/[^\n]*/y },
    { type: 'comment', test: /\/\*[\s\S]*?\*\//y },
    { type: 'str', test: /"(?:[^"\\]|\\.)*"/y },
    { type: 'bool', test: /(?<![\w.])(?:true|false)(?![\w])/y },
    { type: 'null', test: /(?<![\w.])(?:null)(?![\w])/y },
    { type: 'num', test: /-?\d+(?:\.\d+)?/y },
    { type: 'keyword', test: /(?<![\w.])(?:resource|variable|output|provider|module|data|locals|terraform|for|in|if|else|endfor|endif)(?![\w])/y },
    { type: 'key', test: /[A-Za-z_][\w.\-]*(?=\s*=)/y },
    { type: 'punct', test: /[{}[\](),=]/y }
  ];
  return renderTokens(tokenize(source, rules));
}

/** Highlight SQL text. Always HTML-escapes the input first. */
export function highlightSql(text) {
  const source = typeof text === 'string' ? text : '';
  const rules = [
    { type: 'comment', test: /--[^\n]*/y },
    { type: 'comment', test: /\/\*[\s\S]*?\*\//y },
    { type: 'str', test: /'(?:[^']|'')*'/y },
    { type: 'bool', test: /(?<![\w.])(?:true|false)(?![\w])/y },
    { type: 'null', test: /(?<![\w.])(?:null)(?![\w])/y },
    { type: 'num', test: /(?<![\w.])\d+(?:\.\d+)?(?![\w])/y },
    { type: 'keyword', test: /(?<![\w.])(?:select|from|where|group|by|order|having|limit|offset|insert|into|values|update|set|delete|create|table|alter|drop|index|view|join|inner|left|right|full|outer|cross|on|as|and|or|not|in|is|null|like|between|exists|case|when|then|else|end|union|all|distinct|asc|desc|primary|key|foreign|references|default|unique|check|constraint|with|returning|using)(?![\w])/iy },
    { type: 'punct', test: /[(),;.*=<>+\-/%]/y }
  ];
  return renderTokens(tokenize(source, rules));
}

/** Highlight XML text. Always HTML-escapes the input first. */
export function highlightXml(text) {
  const source = typeof text === 'string' ? text : '';
  const rules = [
    { type: 'comment', test: /<!--[\s\S]*?-->/y },
    { type: 'str', test: /<!\[CDATA\[[\s\S]*?\]\]>/y },
    { type: 'keyword', test: /<\?[\s\S]*?\?>/y },
    { type: 'keyword', test: /<![\s\S]*?>/y },
    { type: 'str', test: /"(?:[^"\\]|\\.)*"/y },
    { type: 'str', test: /'(?:[^'\\]|\\.)*'/y },
    { type: 'key', test: /<\/?[A-Za-z_][\w.:-]*/y },
    { type: 'punct', test: /\/?>/y }
  ];
  return renderTokens(tokenize(source, rules));
}

/* ------------------------------------------------------------------ *
 * Diagnostics
 * ------------------------------------------------------------------ */

/**
 * Render a diagnostic line for the highlighted output pane.
 *
 * Errors are red and warnings are blue, so a problem in the output reads at a
 * glance without hunting for the separate error strip below the pane.
 *
 * The message is escaped before it is wrapped, so a diagnostic can never
 * inject markup into the page.
 */
export function renderDiagnostic(level, message, line) {
  const kind = level === 'warn' ? 'warn' : 'error';
  const where = Number.isFinite(line) ? ` (line ${line})` : '';
  return `<span class="diag diag-${kind}"><span class="diag-icon">${kind === 'warn' ? '!' : '×'}</span> ${escapeHtml(`${message}${where}`)}</span>`;
}

/**
 * Parse a diagnostic message into its message and line number.
 *
 * Only a line marker at the very END of the message is treated as the line
 * reference, because a message such as "Invalid JSON (line 1, column 15)"
 * carries its position in the middle and must keep it.
 */
export function splitDiagnostic(message) {
  const text = String(message ?? '');
  const match = text.match(/\s*\b(?:at\s+)?line\s+(\d+)\s*$/i);
  if (!match) return { message: text, line: null };
  return { message: text.slice(0, match.index).trim(), line: Number(match[1]) };
}

/* ------------------------------------------------------------------ *
 * DOM wiring
 * ------------------------------------------------------------------ */

/** Copy text to the clipboard, falling back for non-secure contexts. */
async function copyText(text) {
  const value = String(text ?? '');
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

function wireCopyButtons(root) {
  root.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = root.querySelector(`#${CSS.escape(button.dataset.copyTarget)}`);
      const source = target?.dataset?.copySource ? root.querySelector(`#${CSS.escape(target.dataset.copySource)}`) : target;
      const copied = await copyText(source?.value ?? source?.textContent ?? '');
      const original = button.dataset.originalLabel || button.textContent;
      button.dataset.originalLabel = original;
      button.textContent = copied ? 'Copied ✓' : 'Copy failed';
      button.classList.toggle('is-copied', copied);
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-copied');
      }, 1600);
    });
  });
}

export function initTools(root = document) {
  const scope = root.querySelector('[data-tools]');
  if (!scope || scope.dataset.toolsReady) return;
  scope.dataset.toolsReady = 'true';

  const $ = (selector) => scope.querySelector(selector);
  const $$ = (selector) => [...scope.querySelectorAll(selector)];

  /* A strip is red for a failure and blue for a warning. The level is decided
     by the caller, so a tool that merely flagged something is never painted
     as if it had broken. */
  const setError = (id, message, level = 'error') => {
    const node = scope.querySelector(`#${CSS.escape(id)}`);
    if (!node) return;
    node.textContent = message || '';
    node.hidden = !message;
    node.classList.toggle('tool-warn', Boolean(message) && level === 'warn');
    node.classList.toggle('tool-error', !message || level !== 'warn');
  };
  const setOutput = (id, text) => {
    const node = scope.querySelector(`#${CSS.escape(id)}`);
    if (node) node.textContent = text ?? '';
  };

  /* --- Tabs ---------------------------------------------------- */
  const tablist = $('.tool-tabs');
  const tabs = tablist ? $$('[role="tab"]', tablist) : [];
  const panels = $$('[role="tabpanel"]');

  function selectTab(tab, focus = false) {
    tabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.setAttribute('aria-selected', active ? 'true' : 'false');
      candidate.tabIndex = active ? 0 : -1;
      candidate.classList.toggle('is-active', active);
    });
    panels.forEach((panel) => {
      const active = panel.id === tab?.getAttribute('aria-controls');
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    if (focus) tab?.focus();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);
      let next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (event.key === 'Home') next = tabs[0];
      else if (event.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  wireCopyButtons(scope);

  /* --- JSON ---------------------------------------------------- */
  const jsonInput = $('#json-input');
  const jsonIndent = $('#json-indent');

  // The JSON tool shares the code-tool helper so it gets the same plain and
  // highlighted views and the same red error diagnostics as the other
  // formatters.
  const jsonTool = wireCodeTool({
    inputId: 'json-input',
    outputId: 'json-output',
    codeId: 'json-highlight',
    plainButtonId: 'json-view-plain',
    highlightedButtonId: 'json-view-highlighted',
    errorId: 'json-error',
    highlight: highlightJson,
    format: (text) => formatJson(text, Number(jsonIndent.value))
  });

  $('#json-format')?.addEventListener('click', () => jsonTool?.run());
  $('#json-minify')?.addEventListener('click', () => {
    if (!jsonTool) return;
    const result = minifyJson(jsonInput.value);
    if (!result.ok) {
      const { message, line } = splitDiagnostic(result.error);
      setError('json-error', result.error);
      jsonTool.setDiagnostic?.({ level: 'error', message, line });
      return;
    }
    setError('json-error', null);
    jsonTool.setResult?.(result.output);
  });
  jsonIndent?.addEventListener('change', () => jsonTool?.run());

  /* --- Base64 -------------------------------------------------- */
  const b64Input = $('#b64-input');
  const b64Mode = $('#b64-mode');
  const b64Output = $('#b64-output');
  const b64Error = $('#b64-error');

  function runBase64() {
    const mode = b64Mode.value;
    const result = mode === 'encode'
      ? base64Encode(b64Input.value)
      : base64Decode(b64Input.value, true);
    b64Output.value = result.ok ? result.output : '';
    setError('b64-error', result.error);
  }
  $('#b64-run').addEventListener('click', runBase64);
  b64Mode.addEventListener('change', runBase64);

  /* --- JWT ----------------------------------------------------- */
  const jwtInput = $('#jwt-input');
  const jwtOutput = $('#jwt-output');
  const jwtError = $('#jwt-error');
  const jwtClaims = $('#jwt-claims');

  $('#jwt-decode').addEventListener('click', () => {
    const result = decodeJwt(jwtInput.value);
    setError('jwt-error', result.error);
    if (!result.ok) {
      jwtOutput.textContent = '';
      jwtClaims.innerHTML = '';
      return;
    }
    const { header, payload, signature, claims, expired, algorithm } = result.output;
    jwtOutput.textContent = `HEADER\n${JSON.stringify(header, null, 2)}\n\nPAYLOAD\n${JSON.stringify(payload, null, 2)}\n\nSIGNATURE (not verified)\n${signature || '(empty)'}`;
    const rows = [
      ['Algorithm', algorithm],
      ['Signature', 'NOT verified — this tool never checks it'],
      ['Expires', claims.exp ? `${claims.exp.iso}${expired ? ' (expired)' : ''}` : '—'],
      ['Issued at', claims.iat ? claims.iat.iso : '—'],
      ['Not before', claims.nbf ? claims.nbf.iso : '—']
    ];
    jwtClaims.innerHTML = '';
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'claim-row';
      const key = document.createElement('span');
      key.className = 'claim-key';
      key.textContent = label;
      const val = document.createElement('span');
      val.className = 'claim-value';
      val.textContent = value;
      row.append(key, val);
      jwtClaims.append(row);
    });
  });

  /* --- Timestamps ---------------------------------------------- */
  const tsInput = $('#ts-input');
  const tsOutput = $('#ts-output');
  const tsError = $('#ts-error');
  const tsZone = $('#ts-zone');
  const tsDirection = $('#ts-direction');

  function runTimestamp() {
    const raw = tsInput.value.trim();
    if (!raw) {
      tsOutput.value = '';
      setError('ts-error', 'Enter a value first.');
      return;
    }
    const zone = tsZone.value;
    let result;
    if (tsDirection.value === 'toIso') {
      const seconds = Number(raw);
      result = Number.isFinite(seconds) ? timestampToIso(seconds) : { ok: false, output: '', error: 'Enter a numeric Unix timestamp (seconds).' };
    } else {
      result = isoToTimestamp(raw);
    }
    setError('ts-error', result.error);
    if (!result.ok) {
      tsOutput.value = '';
      return;
    }
    const date = tsDirection.value === 'toIso' ? new Date(Number(raw) * 1000) : new Date(raw);
    const utc = date.toISOString();
    const local = zone === 'utc' ? utc : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
    tsOutput.value = `${tsDirection.value === 'toIso' ? 'ISO 8601 (UTC)' : 'Unix seconds'}: ${result.output}\n${zone === 'utc' ? 'UTC' : 'Local'}: ${local}`;
  }
  $('#ts-run').addEventListener('click', runTimestamp);
  $('#ts-now').addEventListener('click', () => {
    const now = Math.floor(Date.now() / 1000);
    tsDirection.value = 'toIso';
    tsInput.value = String(now);
    runTimestamp();
  });
  tsZone.addEventListener('change', runTimestamp);
  tsDirection.addEventListener('change', runTimestamp);

  /* --- Regex --------------------------------------------------- */
  const regexPattern = $('#regex-pattern');
  const regexFlags = $('#regex-flags');
  const regexInput = $('#regex-input');
  const regexOutput = $('#regex-output');
  const regexError = $('#regex-error');

  $('#regex-run').addEventListener('click', () => {
    const result = testRegex(regexPattern.value, regexFlags.value, regexInput.value);
    setError('regex-error', result.error);
    if (!result.ok) {
      regexOutput.textContent = '';
      return;
    }
    if (!result.matches.length) {
      regexOutput.textContent = 'No matches.';
      return;
    }
    const lines = result.matches.map((match, index) => {
      const groups = match.groups.map((group) => `  group ${group.index}: ${group.value === null ? '(no match)' : group.value}`).join('\n');
      return `#${index + 1} at index ${match.index}: ${match.match}${groups ? `\n${groups}` : ''}`;
    });
    regexOutput.textContent = `${result.matches.length} match${result.matches.length === 1 ? '' : 'es'}\n\n${lines.join('\n\n')}`;
  });

  /* --- UUID ---------------------------------------------------- */
  const uuidCount = $('#uuid-count');
  const uuidOutput = $('#uuid-output');
  const uuidError = $('#uuid-error');
  const uuidList = $('#uuid-list');

  $('#uuid-generate').addEventListener('click', () => {
    const count = Math.min(20, Math.max(1, Number(uuidCount.value) || 1));
    const uuids = [];
    for (let i = 0; i < count; i += 1) uuids.push(generateUuidV4());
    uuidOutput.value = uuids.join('\n');
    setError('uuid-error', null);
    uuidList.innerHTML = '';
    uuids.forEach((uuid) => {
      const row = document.createElement('div');
      row.className = 'uuid-row';
      const code = document.createElement('code');
      code.textContent = uuid;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-chip';
      button.textContent = 'Copy';
      button.addEventListener('click', async () => {
        const copied = await copyText(uuid);
        button.textContent = copied ? 'Copied ✓' : 'Copy failed';
        setTimeout(() => { button.textContent = 'Copy'; }, 1600);
      });
      row.append(code, button);
      uuidList.append(row);
    });
  });

  /* --- Hash ---------------------------------------------------- */
  const hashInput = $('#hash-input');
  const hashAlgorithm = $('#hash-algorithm');
  const hashOutput = $('#hash-output');
  const hashError = $('#hash-error');

  $('#hash-run').addEventListener('click', async () => {
    hashOutput.value = '';
    setError('hash-error', 'Hashing…');
    const result = await hashText(hashInput.value, hashAlgorithm.value);
    setError('hash-error', result.error);
    hashOutput.value = result.ok ? result.output : '';
  });

  /* --- Colour -------------------------------------------------- */
  const colourA = $('#colour-a');
  const colourB = $('#colour-b');
  const colourOutput = $('#colour-output');
  const colourError = $('#colour-error');
  const colourBadge = $('#colour-badge');

  function runColour() {
    const first = hexToRgb(colourA.value);
    const second = hexToRgb(colourB.value);
    if (!first.ok) {
      colourOutput.textContent = '';
      colourBadge.textContent = '';
      colourBadge.hidden = true;
      setError('colour-error', first.error);
      return;
    }
    if (!second.ok) {
      colourOutput.textContent = '';
      colourBadge.textContent = '';
      colourBadge.hidden = true;
      setError('colour-error', second.error);
      return;
    }
    const hsl = rgbToHsl(first.output.r, first.output.g, first.output.b);
    const contrast = contrastRatio(colourA.value, colourB.value);
    colourOutput.textContent = [
      `Colour A  ${rgbToHex(first.output.r, first.output.g, first.output.b)}`,
      `RGB       rgb(${first.output.r}, ${first.output.g}, ${first.output.b})`,
      `HSL       hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      '',
      `Colour B  ${rgbToHex(second.output.r, second.output.g, second.output.b)}`,
      `RGB       rgb(${second.output.r}, ${second.output.g}, ${second.output.b})`,
      '',
      `Contrast  ${contrast.output.ratio}:1  ·  ${contrast.output.normalText}  ·  ${contrast.output.enhanced}`
    ].join('\n');
    const aa = contrast.output.aa;
    const aaa = contrast.output.aaa;
    colourBadge.textContent = aaa ? 'AAA pass' : aa ? 'AA pass' : 'AA fail';
    colourBadge.hidden = false;
    colourBadge.className = `contrast-badge ${aaa ? 'pass-aaa' : aa ? 'pass-aa' : 'fail'}`;
    setError('colour-error', null);
  }
  $('#colour-run').addEventListener('click', runColour);
  colourA.addEventListener('change', runColour);
  colourB.addEventListener('change', runColour);

  /* --- Slug (bonus) -------------------------------------------- */
  const slugInput = $('#slug-input');
  const slugOutput = $('#slug-output');
  const slugError = $('#slug-error');
  $('#slug-run').addEventListener('click', () => {
    const source = slugInput.value.trim();
    if (!source) {
      slugOutput.value = '';
      setError('slug-error', 'Enter some text first.');
      return;
    }
    const slug = slugify(source);
    slugOutput.value = slug;
    setError('slug-error', slug ? null : 'That text has no slug-safe characters.');
  });

  /* --- DNS ------------------------------------------------------ */
  const dnsName = $('#dns-name');
  const dnsType = $('#dns-type');
  const dnsResults = $('#dns-results');
  const dnsError = $('#dns-error');
  const dnsStatus = $('#dns-status');

  function renderDnsRows(rows) {
    dnsResults.innerHTML = '';
    rows.forEach((row) => {
      const line = document.createElement('div');
      line.className = 'kv-row';
      const key = document.createElement('span');
      key.className = 'kv-key';
      key.textContent = row[0];
      const val = document.createElement('span');
      val.className = 'kv-value';
      val.textContent = row[1];
      line.append(key, val);
      dnsResults.append(line);
    });
  }

  async function runDns() {
    const name = dnsName.value.trim();
    if (!name) {
      renderDnsRows([]);
      setError('dns-error', 'Enter a domain name to look up.');
      setOutput('dns-status', '');
      return;
    }
    setError('dns-error', 'Querying…');
    setOutput('dns-status', `Resolving ${name} (${dnsType.value}) via Cloudflare DNS-over-HTTPS…`);
    renderDnsRows([]);
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(dnsType.value)}`;
    let payload = null;
    try {
      const response = await fetch(url, { headers: { Accept: 'application/dns-json' } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      }
      payload = await response.json();
    } catch (error) {
      // Never fabricate a result: report what actually happened.
      setError('dns-error', `The DNS lookup failed — no records were returned. Likely causes: the browser blocked the request (CORS), the network is offline, or a proxy/ad blocker intercepted the call. Browser detail: ${String(error?.message || error)}`);
      setOutput('dns-status', '');
      renderDnsRows([]);
      return;
    }
    const parsed = parseDnsJson(payload);
    if (!parsed.ok) {
      const reason = parsed.errors.length ? parsed.errors.join(' ') : 'The resolver returned no usable answers.';
      setError('dns-error', `${reason} The query reached Cloudflare, but the answer contained no records.`);
      setOutput('dns-status', '');
      renderDnsRows([]);
      return;
    }
    setError('dns-error', null);
    setOutput('dns-status', `Resolved ${parsed.answerCount} record${parsed.answerCount === 1 ? '' : 's'} for ${name} (${dnsType.value}).`);
    renderDnsRows(parsed.records.map((record) => [record.type, record.data]));
  }
  $('#dns-lookup').addEventListener('click', runDns);
  dnsType.addEventListener('change', () => {
    if (dnsName.value.trim()) runDns();
  });

  /* --- HTTP headers -------------------------------------------- */
  const headerInput = $('#header-input');
  const headerTable = $('#header-table');
  const headerError = $('#header-error');
  const headerSummary = $('#header-summary');

  function renderHeaderTable(result) {
    headerTable.innerHTML = '';
    const rows = [];
    if (result.kind === 'request') {
      rows.push(['Request line', `${result.method} ${result.url} ${result.version}`]);
    } else if (result.kind === 'response') {
      rows.push(['Status line', `${result.version} ${result.status}${result.statusText ? ` ${result.statusText}` : ''}`]);
    }
    result.headers.forEach((header) => rows.push([header.name, header.value]));
    if (!rows.length) return;
    const table = document.createElement('table');
    table.className = 'tool-grid-table';
    const body = document.createElement('tbody');
    rows.forEach(([name, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = name;
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(th, td);
      body.append(tr);
    });
    table.append(body);
    headerTable.append(table);
  }

  function runHeaders() {
    const result = parseHttpHeaders(headerInput.value);
    setError('header-error', result.error);
    renderHeaderTable(result);
    if (!result.ok) {
      setOutput('header-summary', '');
      return;
    }
    const notes = [];
    notes.push(`${result.count} header${result.count === 1 ? '' : 's'} parsed from a ${result.kind}.`);
    if (result.duplicates.length) {
      notes.push(`Duplicate header${result.duplicates.length === 1 ? '' : 's'}: ${result.duplicates.map((entry) => `${entry.name} (${entry.count}×)`).join(', ')}.`);
    }
    if (result.malformed.length) {
      notes.push(`${result.malformed.length} malformed line${result.malformed.length === 1 ? '' : 's'}: ${result.malformed.map((entry) => `line ${entry.line} — ${entry.reason}`).join(' ')}`);
    }
    setOutput('header-summary', notes.join('\n'));
  }
  $('#header-parse').addEventListener('click', runHeaders);

  /* --- IP / CIDR ----------------------------------------------- */
  const ipAddress = $('#ip-input');
  const ipPrefix = $('#ip-prefix');
  const ipTable = $('#ip-table');
  const ipError = $('#ip-error');

  function renderIpTable(rows) {
    ipTable.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'tool-grid-table';
    const body = document.createElement('tbody');
    rows.forEach(([name, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = name;
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(th, td);
      body.append(tr);
    });
    table.append(body);
    ipTable.append(table);
  }

  function runIp() {
    const result = calculateSubnet(ipAddress.value, ipPrefix.value);
    setError('ip-error', result.error);
    if (!result.ok) {
      ipTable.innerHTML = '';
      ipDecimal.value = '';
      return;
    }
    renderIpTable([
      ['Address', result.address],
      ['CIDR', result.cidr],
      ['Network address', result.network],
      ['Broadcast address', result.broadcast],
      ['First usable host', result.firstHost],
      ['Last usable host', result.lastHost],
      ['Total addresses', String(result.total)],
      ['Usable hosts', String(result.usable)],
      ['Netmask', result.netmask],
      ['Wildcard mask', result.wildcard],
      ['Binary (address)', result.binary.address],
      ['Binary (netmask)', result.binary.netmask],
      ['Binary (network)', result.binary.network],
      ['Binary (broadcast)', result.binary.broadcast]
    ]);
    ipDecimal.value = String(ipv4ToInt(result.address));
  }
  $('#ip-run').addEventListener('click', runIp);
  ipPrefix.addEventListener('change', runIp);

  /* --- IP decimal ---------------------------------------------- */
  const ipDecInput = $('#ip-decimal-input');
  const ipDecOutput = $('#ip-decimal-output');
  const ipDecError = $('#ip-decimal-error');

  function runIpDecimal() {
    const source = ipDecInput.value.trim();
    if (!source) {
      ipDecOutput.value = '';
      setError('ip-decimal-error', 'Enter a decimal integer first.');
      return;
    }
    const asInt = intToIpv4(source);
    if (!asInt.ok) {
      ipDecOutput.value = '';
      setError('ip-decimal-error', asInt.error);
      return;
    }
    const back = ipv4ToInt(asInt.output);
    setError('ip-decimal-error', null);
    ipDecOutput.value = `${asInt.output}  →  ${back}`;
  }
  $('#ip-decimal-run').addEventListener('click', runIpDecimal);

  /* --- Port checker -------------------------------------------- */
  const portInput = $('#port-input');
  const portTable = $('#port-table');
  const portError = $('#port-error');
  const portSummary = $('#port-summary');

  function runPort() {
    const result = describePort(portInput.value);
    setError('port-error', result.error);
    if (!result.ok) {
      portTable.innerHTML = '';
      setOutput('port-summary', '');
      return;
    }
    const rows = [['Port', String(result.port)]];
    if (result.known) {
      rows.push(['IANA service name', result.known.name]);
      rows.push(['Description', result.known.description]);
    } else {
      rows.push(['IANA service name', 'No common service registered for this port.']);
    }
    if (result.range) rows.push(['Port range', result.range]);
    const table = document.createElement('table');
    table.className = 'tool-grid-table';
    const body = document.createElement('tbody');
    rows.forEach(([name, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = name;
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(th, td);
      body.append(tr);
    });
    table.append(body);
    portTable.innerHTML = '';
    portTable.append(table);
    setOutput('port-summary', result.known
      ? `Port ${result.port} is the registered service "${result.known.name}".`
      : `Port ${result.port} has no well-known service in this table.`);
  }
  $('#port-run').addEventListener('click', runPort);

  /* --- User-agent builder --------------------------------------- */
  const uaProfile = $('#ua-profile');
  const uaTable = $('#ua-table');
  const uaError = $('#ua-error');
  const uaOutput = $('#ua-output');

  function runUa() {
    const result = buildUserAgentHeaders(uaProfile.value);
    setError('ua-error', result.error);
    if (!result.ok) {
      uaTable.innerHTML = '';
      uaOutput.value = '';
      return;
    }
    const table = document.createElement('table');
    table.className = 'tool-grid-table';
    const body = document.createElement('tbody');
    result.headers.forEach(([name, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = name;
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(th, td);
      body.append(tr);
    });
    table.append(body);
    uaTable.innerHTML = '';
    uaTable.append(table);
    uaOutput.value = result.lines.join('\n');
  }
  $('#ua-build').addEventListener('click', runUa);
  uaProfile.addEventListener('change', runUa);
  $('#ua-copy-all').addEventListener('click', async () => {
    const result = buildUserAgentHeaders(uaProfile.value);
    if (!result.ok) {
      setError('ua-error', result.error);
      return;
    }
    const copied = await copyText(result.lines.join('\n'));
    const button = $('#ua-copy-all');
    const original = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = original;
    button.textContent = copied ? 'Copied ✓' : 'Copy failed';
    button.classList.toggle('is-copied', copied);
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove('is-copied');
    }, 1600);
  });

  /* --- Code panes (YAML / Terraform / SQL / XML) ------------------ */
  /*
   * Each of these tools shows its result twice: as plain text in a textarea
   * and as highlighted markup in a <pre class="tool-code">. The segmented
   * control in the field header switches between the two, and the copy chip
   * always copies the plain text.
   */
  function wireCodeTool(options) {
    const input = $(`#${CSS.escape(options.inputId)}`);
    const output = $(`#${CSS.escape(options.outputId)}`);
    const code = $(`#${CSS.escape(options.codeId)}`);
    const errorId = options.errorId;
    if (!input || !output || !code) return null;

    const plainButton = $(`#${CSS.escape(options.plainButtonId)}`);
    const highlightedButton = $(`#${CSS.escape(options.highlightedButtonId)}`);
    let view = 'plain';
    let lastOutput = '';
    // A failed run leaves a diagnostic behind instead of an empty pane, so the
    // output area itself shows what went wrong.
    let lastDiagnostic = null;

    function paint() {
      const highlighted = view === 'highlighted';
      output.hidden = highlighted;
      code.hidden = !highlighted;
      if (highlighted) {
        const body = lastDiagnostic
          ? renderDiagnostic(lastDiagnostic.level, lastDiagnostic.message, lastDiagnostic.line)
          : options.highlight(lastOutput);
        code.innerHTML = body;
      } else {
        output.value = lastDiagnostic ? lastDiagnostic.message : lastOutput;
      }
      if (plainButton) plainButton.setAttribute('aria-pressed', highlighted ? 'false' : 'true');
      if (highlightedButton) highlightedButton.setAttribute('aria-pressed', highlighted ? 'true' : 'false');
    }

    function setView(next) {
      view = next === 'highlighted' ? 'highlighted' : 'plain';
      paint();
    }

    plainButton?.addEventListener('click', () => setView('plain'));
    highlightedButton?.addEventListener('click', () => setView('highlighted'));

    function run() {
      const result = options.format(input.value);
      if (!result.ok) {
        const { message, line } = splitDiagnostic(result.error);
        lastOutput = '';
        lastDiagnostic = { level: 'error', message, line };
        output.value = '';
        setError(errorId, result.error);
        paint();
        return;
      }
      lastOutput = result.output;
      // A formatter may succeed but still report a warning — the YAML tool
      // does this when it falls back to the line-based re-indenter.
      lastDiagnostic = result.error
        ? (() => {
          const { message, line } = splitDiagnostic(result.error);
          return { level: 'warn', message, line };
        })()
        : null;
      setError(errorId, result.error || null, 'warn');
      paint();
    }

    // A caller can push a result or a diagnostic in without going through
    // run(), which is how the Minify button reuses the same pane.
    function setResult(text) {
      lastOutput = String(text ?? '');
      lastDiagnostic = null;
      paint();
    }
    function setDiagnostic(diagnostic) {
      if (!diagnostic) {
        lastDiagnostic = null;
        paint();
        return;
      }
      lastDiagnostic = {
        level: diagnostic.level === 'warn' ? 'warn' : 'error',
        message: String(diagnostic.message ?? ''),
        line: Number.isFinite(diagnostic.line) ? diagnostic.line : null
      };
      paint();
    }

    return {
      run,
      setView,
      setResult,
      setDiagnostic,
      get output() { return lastOutput; }
    };
  }

  /* --- YAML ----------------------------------------------------- */
  const yamlTool = wireCodeTool({
    inputId: 'yaml-input',
    outputId: 'yaml-output',
    codeId: 'yaml-highlight',
    plainButtonId: 'yaml-view-plain',
    highlightedButtonId: 'yaml-view-highlighted',
    errorId: 'yaml-error',
    highlight: highlightYaml,
    format: (text) => {
      const result = formatYaml(text);
      if (result.ok) return result;
      // The subset parser could not read the document. Fall back to the
      // conservative line-based re-indenter and say so honestly.
      const fallback = reindentYaml(text);
      if (!fallback.trim()) return result;
      return {
        ok: true,
        output: fallback.endsWith('\n') ? fallback : `${fallback}\n`,
        error: `${result.error} The document was re-indented line by line instead, so the structure was left untouched.`
      };
    }
  });
  $('#yaml-format')?.addEventListener('click', () => yamlTool?.run());
  $('#yaml-minify')?.addEventListener('click', () => {
    const input = $('#yaml-input');
    if (!input) return;
    const result = formatYaml(input.value, { minify: true });
    if (!result.ok) {
      setError('yaml-error', result.error);
      $('#yaml-output').value = '';
      $('#yaml-highlight').innerHTML = '';
      return;
    }
    setError('yaml-error', null);
    const code = $('#yaml-highlight');
    const output = $('#yaml-output');
    if (code && output && code.hidden === false) {
      code.innerHTML = highlightYaml(result.output);
    } else if (output) {
      output.value = result.output;
    }
  });

  /* --- Terraform ------------------------------------------------ */
  const tfTool = wireCodeTool({
    inputId: 'tf-input',
    outputId: 'tf-output',
    codeId: 'tf-highlight',
    plainButtonId: 'tf-view-plain',
    highlightedButtonId: 'tf-view-highlighted',
    errorId: 'tf-error',
    highlight: highlightTf,
    format: formatTerraform
  });
  $('#tf-format')?.addEventListener('click', () => tfTool?.run());

  /* --- SQL ------------------------------------------------------ */
  const sqlTool = wireCodeTool({
    inputId: 'sql-input',
    outputId: 'sql-output',
    codeId: 'sql-highlight',
    plainButtonId: 'sql-view-plain',
    highlightedButtonId: 'sql-view-highlighted',
    errorId: 'sql-error',
    highlight: highlightSql,
    format: formatSql
  });
  $('#sql-format')?.addEventListener('click', () => sqlTool?.run());

  /* --- XML ------------------------------------------------------ */
  const xmlTool = wireCodeTool({
    inputId: 'xml-input',
    outputId: 'xml-output',
    codeId: 'xml-highlight',
    plainButtonId: 'xml-view-plain',
    highlightedButtonId: 'xml-view-highlighted',
    errorId: 'xml-error',
    highlight: highlightXml,
    format: (text) => {
      const result = formatXml(text);
      if (!result.ok) return result;
      // In the browser DOMParser gives a second, independent check that the
      // document is well formed. It is skipped when the API is unavailable.
      if (typeof DOMParser === 'function') {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const failure = doc?.querySelector('parsererror');
        if (failure) {
          const line = /line (\d+)/i.exec(failure.textContent || '');
          return {
            ok: false,
            output: '',
            error: `Malformed XML at line ${line ? line[1] : 1}: the browser's XML parser rejected this document.`
          };
        }
      }
      return result;
    }
  });
  $('#xml-format')?.addEventListener('click', () => xmlTool?.run());
  $('#xml-minify')?.addEventListener('click', () => {
    const input = $('#xml-input');
    if (!input) return;
    const result = minifyXml(input.value);
    if (!result.ok) {
      setError('xml-error', result.error);
      $('#xml-output').value = '';
      $('#xml-highlight').innerHTML = '';
      return;
    }
    const collapsed = result.output;
    setError('xml-error', null);
    const code = $('#xml-highlight');
    const output = $('#xml-output');
    if (code && output && code.hidden === false) {
      code.innerHTML = highlightXml(collapsed);
    } else if (output) {
      output.value = collapsed;
    }
  });
}

/**
 * Minify XML by walking its tags, so whitespace that belongs to a text node
 * is kept and whitespace that only existed for indentation is dropped.
 */
export function minifyXml(text) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { ok: false, output: '', error: 'Enter some XML first.', line: null };
  const parsed = formatXml(source);
  if (!parsed.ok) return parsed;

  let out = '';
  let i = 0;
  const input = source;
  while (i < input.length) {
    if (input[i] === '<') {
      const end = input.indexOf('>', i);
      if (end === -1) { out += input.slice(i); break; }
      out += input.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    const next = input.indexOf('<', i);
    const chunk = input.slice(i, next === -1 ? input.length : next);
    // Text between two tags keeps a single leading and trailing space, which
    // is how XML readers see it.
    const trimmed = chunk.trim();
    if (trimmed) {
      const lead = /^\s/.test(chunk) ? ' ' : '';
      const tail = /\s$/.test(chunk) ? ' ' : '';
      out += `${lead}${trimmed.replace(/\s+/g, ' ')}${tail}`;
    }
    i = next === -1 ? input.length : next;
  }
  return { ok: true, output: out.trim(), error: null, line: null };
}
