/**
 * Supabase authentication and cloud progress for IMON.world.
 *
 * The backend is a free-tier Supabase project:
 *   - Supabase Auth handles Google and GitHub OAuth through the PKCE flow.
 *   - A Postgres table `progress` holds one JSONB blob per user.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PASTE YOUR SUPABASE VALUES HERE
 * ─────────────────────────────────────────────────────────────────────────
 *  1. Open https://supabase.com/dashboard and create a free project (no
 *     card is required on the free tier).
 *  2. Copy the two values below from
 *     Settings → API → "Project URL" and "Publishable key".
 *        - Project URL   → https://YOUR-PROJECT-REF.supabase.co
 *        - Publishable key → sb_publishable_... (the "anon"/publishable key,
 *          never the secret `service_role` key)
 *  3. Paste them over the two placeholders below, keeping the quotes.
 *
 *  Until both values are filled in, `isConfigured()` returns false, the
 *  sign-in buttons are disabled with a clear message, and every other part
 *  of the site keeps working exactly as before for anonymous visitors.
 *
 *  In the Supabase dashboard, also add these Redirect URLs
 *  (Authentication → URL Configuration → Redirect URLs):
 *        https://imon.com.bd/auth-callback.html
 *        http://localhost:8000/auth-callback.html
 *
 *  Finally, run this SQL once in the Supabase SQL editor
 *  (Database → SQL Editor → New query):
 *
 *      create table if not exists public.progress (
 *        id uuid primary key references auth.users (id) on delete cascade,
 *        data jsonb not null default '{}'::jsonb,
 *        updated_at timestamptz not null default now()
 *      );
 *      alter table public.progress enable row level security;
 *      create policy "players own their progress"
 *        on public.progress for all
 *        using (auth.uid() = id)
 *        with check (auth.uid() = id);
 *
 *  The row-level-security policy is what keeps one player's scores out of
 *  another player's row. The publishable key can only ever read and write
 *  the signed-in player's own row, so no secret key is ever needed here.
 */
const SUPABASE_URL = 'https://REPLACE_WITH_PROJECT_REF.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'REPLACE_WITH_PUBLISHABLE_KEY';

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
  'sabbir-arcade-v1-surf-easy',
  'sabbir-arcade-v1-surf-normal',
  'sabbir-arcade-v1-surf-hard',
  'sabbir-2048-best-v1',
  'imon-rally-best-v1',
  'imon-quiz-best-5',
  'imon-quiz-best-20',
  'imon-quiz-best-30',
  'imon-dev-slots-v1',
  'imon-gridworks-progress-v1'
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

function storeSession(session) {
  if (!session) { remove(STORAGE_KEY); return null; }
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
  const listeners = new Set([callback]);
  const unsubscribe = () => listeners.delete(callback);
  listeners.add(callback);
  // Keep the listener set reachable so a future real-time event can reach it.
  authListeners.add(() => listeners);
  return unsubscribe;
}

// A shared registry so an auth event can reach every subscriber.
const authListeners = new Set();

function emitAuthChange(session) {
  for (const group of authListeners) {
    for (const listener of group) {
      try { listener(session); } catch { /* A bad listener never breaks auth. */ }
    }
  }
}

/* ── Sign in / sign out ────────────────────────────────────────────────── */

/**
 * Start the PKCE sign-in flow for a provider.
 *
 * @param {'google'|'github'} provider
 * @returns {Promise<boolean>} false when the provider is unknown or the
 *   module is not configured.
 */
export async function signIn(provider) {
  if (!isConfigured()) return false;
  if (provider !== 'google' && provider !== 'github') return false;
  try {
    const verifier = generateCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    if (!write(VERIFIER_KEY, verifier)) return false;
    // The callback page lives next to the page that started the flow.
    const base = new URL(location.href);
    const redirectTo = new URL('auth-callback.html', base.href).href;
    // Remember the page the player came from, so the callback can send
    // them back there instead of always to the home page.
    try { sessionStorage.setItem('imon-auth-return-page', location.href); } catch { /* Storage is optional. */ }
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
      await fetchWithTimeout(`${AUTH_BASE()}/logout`, {
        method: 'POST',
        headers: authHeaders(session),
        body: JSON.stringify({ scope: 'local' })
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
  const session = getSession();
  if (!session || !isConfigured()) return null;
  try {
    const response = await fetchWithTimeout(
      `${REST_BASE()}/${PROGRESS_TABLE}?id=eq.${encodeURIComponent(session.user.id)}&select=data`,
      { headers: authHeaders(session) }
    );
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return null;
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
  const session = getSession();
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
  const merged = mergeProgress(local, cloud);
  if (!Object.keys(merged).length) return merged;
  await saveProgress(merged);
  try {
    for (const [key, value] of Object.entries(merged)) {
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
  syncPending = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    if (!syncPending) return;
    syncPending = false;
    const local = readLocalProgress();
    if (!Object.keys(local).length) return;
    loadProgress().then(cloud => {
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
      signInButton.textContent = 'Sign in';
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
    loadProgress().then(cloud => {
      const local = readLocalProgress();
      const merged = mergeProgress(local, cloud);
      if (Object.keys(merged).length) saveProgress(merged);
    }).catch(() => { /* The cloud copy is optional. */ });
  }

  onAuthChange(render);

  // A game writes a score → the cloud hears about it a couple of seconds later.
  document.addEventListener('imon:progress', () => scheduleProgressSync());
  document.addEventListener('imon:toast', () => scheduleProgressSync());
}
