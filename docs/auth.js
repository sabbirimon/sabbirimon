/**
 * Supabase authentication and cloud progress for IMON.world.
 *
 * The backend is a free-tier Supabase project:
 *   - Supabase Auth handles Google and GitHub OAuth through the PKCE flow.
 *   - A Postgres table `progress` holds one JSONB blob per user.
 *
 * The project URL and publishable key are public browser configuration.
 * Postgres row-level security limits each authenticated user to their own save.
 */
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './site-services.js';

/* ── Supabase REST endpoints ───────────────────────────────────────────── */
const AUTH_BASE = () => `${SUPABASE_URL}/auth/v1`;
const REST_BASE = () => `${SUPABASE_URL}/rest/v1`;
const STORAGE_KEY = 'imon-auth-session-v1';
const VERIFIER_KEY = 'imon-auth-pkce-verifier';
const PROGRESS_TABLE = 'progress';

/* The localStorage keys the games already use. An anonymous player's scores
   are read from here and merged into the cloud row on first sign-in, so a
   returning visitor never loses their high scores. */
export const LOCAL_PROGRESS_KEYS = [
  'sabbir-arcade-v1-snake-easy',
  'sabbir-arcade-v1-snake-normal',
  'sabbir-arcade-v1-snake-hard',
  'sabbir-arcade-v1-snake-walls-easy',
  'sabbir-arcade-v1-snake-walls-normal',
  'sabbir-arcade-v1-snake-walls-hard',
  'sabbir-arcade-v1-snake-night-easy',
  'sabbir-arcade-v1-snake-night-normal',
  'sabbir-arcade-v1-snake-night-hard',
  'sabbir-arcade-v1-snake-timed-easy',
  'sabbir-arcade-v1-snake-timed-normal',
  'sabbir-arcade-v1-snake-timed-hard',
  'sabbir-arcade-v1-surf-easy',
  'sabbir-arcade-v1-surf-normal',
  'sabbir-arcade-v1-surf-hard',
  'sabbir-2048-best-v1',
  'imon-rally-best-v1',
  'imon-quiz-best-5',
  'imon-quiz-best-20',
  'imon-quiz-best-30',
  'imon-dev-slots-v1',
  'imon-gridworks-progress-v1',
  'imon-systems-v1',
  'imon-course-quiz-systems',
  'imon-course-quiz-code',
  'imon-course-quiz-ai',
  'imon-course-quiz-circuits',
  'imon-lab-progress-v1',
  'imon-ai-lab-v1',
  'imon-circuits-v1',
  'imon-lab-preferred-v1',
  'imon-ai-lab-preferred-v1',
  'imon-circuits-preferred-v1'
];

const DEBOUNCE_MS = 2000;
const REQUEST_TIMEOUT_MS = 12000;

/* ── Small helpers ─────────────────────────────────────────────────────── */

/** Read a value from localStorage, swallowing private-mode failures. */
function read(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

/** Write a value to localStorage, swallowing private-mode failures. */
function write(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function remove(key) {
  try { localStorage.removeItem(key); } catch { /* Storage is optional. */ }
}

/** Fetch with a timeout, so a hanging network never freezes the page. */
async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ── PKCE helpers (pure, exported, testable) ───────────────────────────── */

/**
 * Encode bytes as URL-safe base64 with no `=` padding.
 *
 * @param {Uint8Array|ArrayBuffer|number[]} bytes
 * @returns {string}
 */
export function base64UrlEncode(bytes) {
  const view = bytes instanceof Uint8Array
    ? bytes
    : bytes instanceof ArrayBuffer
      ? new Uint8Array(bytes)
      : Uint8Array.from(bytes ?? []);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(view).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a PKCE code verifier: 64 URL-safe characters.
 *
 * @returns {string}
 */
export function generateCodeVerifier() {
  const bytes = new Uint8Array(48);
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) cryptoObject.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return base64UrlEncode(bytes);
}

/** Derive the S256 code challenge from a verifier. */
async function createCodeChallenge(verifier) {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.subtle) return verifier;
  const digest = await cryptoObject.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/* ── Configuration ─────────────────────────────────────────────────────── */

/**
 * Whether real Supabase credentials are present.
 *
 * @returns {boolean}
 */
export function isConfigured() {
  const url = typeof SUPABASE_URL === 'string' ? SUPABASE_URL.trim() : '';
  const key = typeof SUPABASE_PUBLISHABLE_KEY === 'string' ? SUPABASE_PUBLISHABLE_KEY.trim() : '';
  if (!url || !key) return false;
  if (url.includes('REPLACE_WITH') || key.includes('REPLACE_WITH')) return false;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return false;
  if (key.length < 20) return false;
  return true;
}

/** The reason sign-in is unavailable, or null when it is available. */
export function configurationMessage() {
  if (isConfigured()) return null;
  return 'Sign-in is not configured yet.';
}

/* ── Session handling ──────────────────────────────────────────────────── */

/**
 * The current session, or null when nobody is signed in.
 *
 * @returns {object|null}
 */
export function getSession() {
  const raw = read(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session || typeof session !== 'object') return null;
    if (!session.access_token || !session.user) return null;
    return session;
  } catch {
    return null;
  }
}

// Keep each account's offline progress separate on a shared device.
function switchLocalPlayer(nextId) {
  const ownerKey='imon-local-player';
  const previous=read(ownerKey);
  if (previous===nextId) return;
  const slot=id=>'imon-player-save:'+id;
  if (previous) {
    const saved=write(slot(previous),JSON.stringify(readLocalProgress()));
    if (!saved) return;
  }
  if (previous || (nextId && read(slot(nextId)))) {
    let incoming={};
    try { incoming=JSON.parse(read(slot(nextId),'{}'))||{}; } catch {}
    for (const key of LOCAL_PROGRESS_KEYS) {
      if (Object.hasOwn(incoming,key)) write(key,JSON.stringify(incoming[key]));
      else remove(key);
    }
  }
  if (nextId) write(ownerKey,nextId); else remove(ownerKey);
}

function storeSession(session) {
  switchLocalPlayer(session?.user?.id||null);
  if (!session) { remove(STORAGE_KEY); return null; }
  if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now()/1000) + session.expires_in;
  write(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/** The signed-in user's display name, email, or null. */
export function getDisplayName(session = getSession()) {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return meta.full_name || meta.name || meta.preferred_username || user.email || 'Player';
}

function authHeaders(session = getSession()) {
  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    // PostgREST only returns the rows when the client asks for JSON.
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

/**
 * Subscribe to session changes.
 *
 * Supabase's own auth client is not used here — the token events are
 * simulated from the stored session, so the callback fires on sign-in and
 * sign-out. Returns an unsubscribe function.
 *
 * @param {(session: object|null) => void} callback
 * @returns {() => void}
 */
export function onAuthChange(callback) {
  if (typeof callback !== 'function') return () => {};
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

const authListeners = new Set();
function emitAuthChange(session) {
  for (const listener of authListeners) {
    try { listener(session); } catch { /* One subscriber cannot block the others. */ }
  }
}

// Re-read inside the lock because another tab can rotate the refresh token.
export async function currentSession() {
  const fresh = session => session && session.expires_at > Date.now()/1000 + 45;
  const previous = getSession();
  if (!previous || fresh(previous)) return previous;
  const renew = async () => {
    const session = getSession();
    if (!session || fresh(session)) return session;
    try {
      const response = await fetchWithTimeout(AUTH_BASE()+'/token?grant_type=refresh_token', {
        method:'POST', headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:session.refresh_token})
      });
      if (getSession()?.refresh_token !== session.refresh_token) return getSession();
      if (!response.ok) {
        if ([400,401].includes(response.status)) { storeSession(null); emitAuthChange(null); }
        return null;
      }
      return storeSession(await response.json());
    } catch { return null; }
  };
  return globalThis.navigator?.locks ? navigator.locks.request('imon-session-refresh',renew) : renew();
}

export async function authOptions() {
  const response = await fetchWithTimeout(AUTH_BASE()+'/settings',{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});
  if (!response.ok) throw new Error('Account settings could not be loaded. Try again shortly.');
  return response.json();
}

export async function emailAuth(mode, email, password) {
  const endpoints={login:'/token?grant_type=password',signup:'/signup',recover:'/recover',update:'/user'};
  if (!Object.hasOwn(endpoints,mode)) throw new Error('Unknown account action.');
  const url=new URL(AUTH_BASE()+endpoints[mode]);
  const headers={apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
  let body={email,password};
  if (mode==='signup' || mode==='recover') {
    const verifier=generateCodeVerifier();
    if (!write(VERIFIER_KEY,verifier)) throw new Error('Allow browser storage to confirm your email on this device.');
    body.code_challenge=await createCodeChallenge(verifier);
    body.code_challenge_method='s256';
    if (mode==='recover') delete body.password;
    write('imon-email-flow',mode);
    url.searchParams.set('redirect_to',new URL('auth-callback.html',location.href).href);
  }
  if (mode==='update') {
    const session=await currentSession();
    if (!session) throw new Error('Open your recovery link in this browser and try again.');
    headers.Authorization='Bearer '+session.access_token;
    body={password};
  }
  const response=await fetchWithTimeout(url,{method:mode==='update'?'PUT':'POST',headers,body:JSON.stringify(body)});
  const result=await response.json();
  if (!response.ok) throw new Error(result.msg || result.message || result.error_description || 'The request failed. Try again.');
  if (result.access_token && result.user) {
    storeSession(result); emitAuthChange(result);
  }
  return result;
}

export function consumeEmailFlow() {
  const mode=read('imon-email-flow'); remove('imon-email-flow'); return mode;
}

/* ── Sign in / sign out ────────────────────────────────────────────────── */

/**
 * Start the PKCE sign-in flow for a provider.
 *
 * @param {'google'|'github'} provider
 * @returns {Promise<boolean>} false when the provider is unknown or the
 *   module is not configured.
 */
export function loginReturnTarget() {
  const page = new URLSearchParams(location.search).get('return') || '';
  return /^(admin\/(content\/|metrics\/|settings\/|users\/|library\/|data\/|backups\/)?|progress\.html|leaderboard\.html)$/.test(page) ? page : './';
}

export async function signIn(provider) {
  if (!isConfigured()) return false;
  if (provider !== 'google' && provider !== 'github') return false;
  try {
    remove('imon-email-flow');
    const verifier = generateCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    if (!write(VERIFIER_KEY, verifier)) return false;
    // The callback page lives next to the page that started the flow.
    const base = new URL(location.href);
    const redirectTo = new URL('auth-callback.html', base.href).href;
    // Remember the page the player came from, so the callback can send
    // them back there instead of always to the home page.
    try { sessionStorage.setItem('imon-auth-return-page', new URL(loginReturnTarget(),location.href).href); } catch { /* Storage is optional. */ }
    const url = new URL(`${AUTH_BASE()}/authorize`);
    url.searchParams.set('provider', provider);
    url.searchParams.set('redirect_to', redirectTo);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    location.assign(url.href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exchange a PKCE authorization code for a session.
 *
 * Used by auth-callback.html. Returns the session, or null.
 *
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function exchangeCodeForSession(code) {
  if (!isConfigured() || !code) return null;
  const verifier = read(VERIFIER_KEY);
  if (!verifier) return null;
  try {
    const response = await fetchWithTimeout(`${AUTH_BASE()}/token?grant_type=pkce`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier })
    });
    if (!response.ok) return null;
    const session = await response.json();
    if (!session?.access_token) return null;
    remove(VERIFIER_KEY);
    return storeSession(session);
  } catch {
    return null;
  }
}

/**
 * Sign the current user out and clear the stored session.
 *
 * @returns {Promise<boolean>}
 */
export async function signOut() {
  const session = getSession();
  if (session?.refresh_token && isConfigured()) {
    try {
      await fetchWithTimeout(`${AUTH_BASE()}/logout?scope=local`, {
        method: 'POST',
        headers: authHeaders(session)
      });
    } catch { /* The local session is cleared either way. */ }
  }
  storeSession(null);
  emitAuthChange(null);
  return true;
}

/* ── Progress ──────────────────────────────────────────────────────────── */

/**
 * Merge a local progress blob with a cloud progress blob.
 *
 * For every key the higher number wins, so a cloud best is never replaced
 * by a smaller local value. Keys that exist in only one side are kept, so
 * nothing is ever lost. Nested objects — the slots and gridworks save
 * shapes — are merged leaf by leaf with the same rule.
 *
 * @param {object} local
 * @param {object} cloud
 * @returns {object}
 */
export function mergeProgress(local, cloud) {
  const result = {};
  const left = local && typeof local === 'object' && !Array.isArray(local) ? local : {};
  const right = cloud && typeof cloud === 'object' && !Array.isArray(cloud) ? cloud : {};
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    result[key] = mergeValue(left[key], right[key]);
    if (['imon-lab-progress-v1','imon-ai-lab-v1','imon-circuits-v1','imon-systems-v1'].includes(key)
        && Array.isArray(left[key]?.solved) && Array.isArray(right[key]?.solved)) {
      result[key].solved = [...new Set([...left[key].solved, ...right[key].solved])];
    }
  }
  return result;
}

/**
 * Merge one value from each side.
 *
 * Numbers keep the larger one. Plain objects merge leaf by leaf. Arrays
 * and everything else keep the longer / cloud copy.
 */
function mergeValue(local, cloud) {
  if (local === undefined) return cloud;
  if (cloud === undefined) return local;
  const localNumber = typeof local === 'number' && Number.isFinite(local) ? local : null;
  const cloudNumber = typeof cloud === 'number' && Number.isFinite(cloud) ? cloud : null;
  if (localNumber !== null && cloudNumber !== null) return Math.max(localNumber, cloudNumber);
  const localObject = local && typeof local === 'object' && !Array.isArray(local);
  const cloudObject = cloud && typeof cloud === 'object' && !Array.isArray(cloud);
  if (localObject && cloudObject) {
    const merged = {};
    for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
      merged[key] = mergeValue(local[key], cloud[key]);
    }
    return merged;
  }
  if (localObject) return local;
  if (cloudObject) return cloud;
  if (Array.isArray(local) && Array.isArray(cloud)) return cloud.length >= local.length ? cloud : local;
  return cloud;
}

/**
 * Read the game's own localStorage scores into a progress blob.
 *
 * @returns {object}
 */
export function readLocalProgress() {
  const blob = {};
  for (const key of LOCAL_PROGRESS_KEYS) {
    const raw = read(key);
    if (raw === null || raw === undefined) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') blob[key] = parsed;
      else {
        const number = Number(parsed);
        if (Number.isFinite(number)) blob[key] = number;
      }
    } catch {
      const number = Number(raw);
      if (Number.isFinite(number)) blob[key] = number;
    }
  }
  return blob;
}

/**
 * Fetch the signed-in user's progress row.
 *
 * @returns {Promise<object|null>}
 */
export async function loadProgress() {
  const session = await currentSession();
  if (!session || !isConfigured()) return null;
  try {
    const response = await fetchWithTimeout(
      `${REST_BASE()}/${PROGRESS_TABLE}?id=eq.${encodeURIComponent(session.user.id)}&select=data`,
      { headers: authHeaders(session) }
    );
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows)) return null;
    if (!rows.length) return {};
    const data = rows[0]?.data;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/**
 * Upsert the signed-in user's progress row.
 *
 * @param {object} data
 * @returns {Promise<boolean>}
 */
export async function saveProgress(data) {
  const session = await currentSession();
  if (!session || !isConfigured()) return false;
  if (!data || typeof data !== 'object') return false;
  try {
    const response = await fetchWithTimeout(`${REST_BASE()}/${PROGRESS_TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: { ...authHeaders(session), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ id: session.user.id, data, updated_at: new Date().toISOString() })
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Merge the anonymous player's local scores into the cloud row.
 *
 * Runs once, the first time a player signs in, so an existing device keeps
 * its high scores. The merged blob is written back to localStorage too, so
 * the games immediately show the best of both.
 *
 * @returns {Promise<object|null>} the merged blob, or null when it failed.
 */
export async function syncLocalProgress() {
  const session = getSession();
  if (!session || !isConfigured()) return null;
  const local = readLocalProgress();
  const cloud = await loadProgress();
  if (!cloud || getSession()?.user.id!==session.user.id) return null;
  const merged = mergeProgress(mergeProgress(local, readLocalProgress()), cloud);
  if (!Object.keys(merged).length) return merged;
  if (!await saveProgress(merged)) return null;
  if (getSession()?.user.id!==session.user.id) return null;
  try {
    for (const [key, value] of Object.entries(mergeProgress(merged, readLocalProgress()))) {
      if (!LOCAL_PROGRESS_KEYS.includes(key)) continue;
      if (typeof value === 'number') write(key, String(value));
      else if (value && typeof value === 'object') write(key, JSON.stringify(value));
    }
  } catch { /* Storage is optional. */ }
  return merged;
}

/* ── Debounced background sync ─────────────────────────────────────────── */

let syncTimer = null;
let syncPending = false;

/**
 * Queue a background push of the local scores to the cloud.
 *
 * A game calls this after it writes a score. The push is debounced, so a
 * burst of writes produces a single request. A network failure is ignored
 * completely — the game never waits for the cloud.
 */
export function scheduleProgressSync() {
  if (!isConfigured() || !getSession()) return;
  const owner=getSession().user.id;
  syncPending = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    if (!syncPending || getSession()?.user.id!==owner) return;
    syncPending = false;
    const local = readLocalProgress();
    if (!Object.keys(local).length) return;
    loadProgress().then(cloud => {
      if (!cloud || getSession()?.user.id!==owner) return;
      const merged = mergeProgress(local, cloud);
      return saveProgress(merged);
    }).catch(() => { /* The cloud is optional; the local score is already saved. */ });
  }, DEBOUNCE_MS);
}

/* ── DOM wiring ────────────────────────────────────────────────────────── */

/**
 * Wire the sign-in UI.
 *
 * Every DOM lookup happens inside this function, so the module stays
 * importable by `node --test`.
 *
 * @param {Document|Element} root
 */
export function initAuth(root = document) {
  if (!root || typeof root.querySelector !== 'function') return;
  const scope = root;
  const signInButton = scope.querySelector('[data-auth-signin]');
  const signOutButton = scope.querySelector('[data-auth-signout]');
  const nameLabel = scope.querySelector('[data-auth-name]');
  const status = scope.querySelector('[data-auth-status]');
  const providerButtons = scope.querySelectorAll('[data-auth-provider]');
  const ready = isConfigured();

  if (!ready) {
    const accountBar=signInButton?.closest?.('.auth-bar');
    if(accountBar) accountBar.hidden=true;
    const message = configurationMessage() || 'Sign-in is not configured yet.';
    if (status) { status.textContent = message; status.hidden = false; }
    providerButtons.forEach(button => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.title = message;
    });
    if (signInButton) {
      signInButton.disabled = true;
      signInButton.title = message;
      // The label lives in a span so the header can hide it on a phone
      // without losing the button's shape. Writing to the button itself
      // would throw that span away.
      const label = signInButton.querySelector('.auth-button-label');
      if (label) label.textContent = 'Sign in';
      else signInButton.textContent = 'Sign in';
    }
    if (signOutButton) signOutButton.hidden = true;
  }

  providerButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (!isConfigured()) return;
      const provider = button.dataset.authProvider;
      button.disabled = true;
      await signIn(provider);
      button.disabled = false;
    });
  });

  const render = session => {
    const signedIn = Boolean(session?.user);
    if (signInButton) {
      signInButton.hidden = signedIn;
      signInButton.disabled = false;
    }
    if (signOutButton) {
      signOutButton.hidden = !signedIn;
      signOutButton.disabled = false;
    }
    if (nameLabel) {
      nameLabel.textContent = signedIn ? getDisplayName(session) : '';
      nameLabel.hidden = !signedIn;
    }
  };

  if (signOutButton) {
    signOutButton.addEventListener('click', async () => {
      signOutButton.disabled = true;
      await signOut();
      render(null);
      signOutButton.disabled = false;
    });
  }

  const session = getSession();
  render(session);
  if (session) {
    // Pull the cloud copy down, then push any newer local score up.
    syncLocalProgress().catch(() => { /* Keep playing offline with local progress. */ });
  }

  onAuthChange(render);

  // A game writes a score → the cloud hears about it a couple of seconds later.
  document.addEventListener('imon:progress', () => scheduleProgressSync());
  document.addEventListener('imon:toast', () => scheduleProgressSync());
}
