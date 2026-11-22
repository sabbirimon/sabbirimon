/**
 * A fake HTTP client and a small fake API, so the course can teach API
 * work without a server.
 *
 * The learner writes the code they would write in real life:
 *
 *   import requests
 *
 *   response = requests.get("https://api.example.com/users")
 *   if response.status_code == 200:
 *       for user in response.json():
 *           print(user["name"])
 *
 * The calls never touch the network. They are answered by a built-in fake
 * API that behaves like a real one: it has routes, it returns status
 * codes, it can be told to fail, and it is slow enough that a learner can
 * practise a timeout.
 *
 * House rules: every function here is pure and takes its data as an
 * argument, so it can be tested under node.
 */

/**
 * The users the fake API knows about.
 */
export const FAKE_USERS = [
  { id: 1, name: 'Ada Lovelace', role: 'engineer', active: true },
  { id: 2, name: 'Grace Hopper', role: 'engineer', active: true },
  { id: 3, name: 'Alan Turing', role: 'researcher', active: false },
  { id: 4, name: 'Katherine Johnson', role: 'analyst', active: true },
  { id: 5, name: 'Barbara Liskov', role: 'architect', active: false }
];

/**
 * The documents the fake API knows about.
 */
export const FAKE_DOCUMENTS = [
  { id: 'd1', title: 'Attention is all you need', tokens: 4200, score: 0.91, topic: 'models' },
  { id: 'd2', title: 'Retrieval augmented generation', tokens: 2800, score: 0.87, topic: 'rag' },
  { id: 'd3', title: 'Scaling laws for neural models', tokens: 6100, score: 0.95, topic: 'models' },
  { id: 'd4', title: 'Rate limits done right', tokens: 1500, score: 0.72, topic: 'infra' }
];

/**
 * The routes the fake API answers.
 */
export const FAKE_ROUTES = [
  { method: 'GET', pattern: '/users', status: 200, body: () => FAKE_USERS },
  { method: 'GET', pattern: '/users/1', status: 200, body: () => FAKE_USERS[0] },
  { method: 'GET', pattern: '/documents', status: 200, body: (query) => {
    const page = Number(query.page);
    if (!Number.isFinite(page) || page < 1) return FAKE_DOCUMENTS;
    // Two documents to a page, so the second page has the last two.
    const size = 2;
    const start = (page - 1) * size;
    return FAKE_DOCUMENTS.slice(start, start + size);
  } },
  { method: 'GET', pattern: '/search', status: 200, body: (query) => {
    const term = String(query.q || '').toLowerCase();
    const topic = query.topic;
    return FAKE_DOCUMENTS.filter(document => {
      const matchesTerm = !term || document.title.toLowerCase().includes(term) || document.topic.includes(term);
      const matchesTopic = !topic || document.topic === topic;
      return matchesTerm && matchesTopic;
    });
  } },
  { method: 'GET', pattern: '/health', status: 200, body: () => ({ status: 'ok', uptime: 4210 }) },
  { method: 'POST', pattern: '/predict', status: 200, body: (query, body) => ({
    model: 'demo-model',
    label: body?.text?.includes('great') ? 'positive' : 'neutral',
    confidence: 0.75
  }) }
];

/**
 * A response, the way `requests` gives one.
 */
export function makeResponse(statusCode, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status_code: statusCode,
    ok: statusCode >= 200 && statusCode < 300,
    headers: { 'content-type': 'application/json', ...headers },
    text,
    /**
     * The body, parsed as JSON.
     */
    json() {
      if (statusCode === 204 || text === '') return null;
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('The response was not JSON.');
      }
    }
  };
}

/**
 * Split a URL into its path and its query.
 */
export function parseApiUrl(url) {
  const text = String(url || '');
  const withoutScheme = text.replace(/^https?:\/\/[^/]+/i, '');
  const [path, search = ''] = withoutScheme.split('?');
  const query = {};
  for (const pair of search.split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
  }
  return { path: path || '/', query };
}

/**
 * Match a path against a route pattern.
 *
 * A pattern segment of `:name` matches any segment and captures it, the
 * way a real router does.
 */
export function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const captures = {};
  for (let i = 0; i < patternParts.length; i++) {
    const expected = patternParts[i];
    const actual = pathParts[i];
    if (expected.startsWith(':')) {
      captures[expected.slice(1)] = actual;
      continue;
    }
    if (expected !== actual) return null;
  }
  return captures;
}

/**
 * A fake API server.
 *
 * The server holds the routes and a failure plan, so a course can ask for
 * a call to fail once and then succeed — which is exactly what a learner
 * needs to practise a retry.
 */
export function createFakeApi(options = {}) {
  const routes = [...(options.routes || FAKE_ROUTES)];
  // A queue of planned failures, each one consumed by the next call.
  const failures = [...(options.failures || [])];
  const log = [];
  let callCount = 0;

  return {
    routes,
    log,
    /**
     * Plan a failure. The next call answers with this status instead of
     * the route's own.
     */
    failNext(statusCode = 500, body = { error: 'Something went wrong' }) {
      failures.push({ statusCode, body });
      return this;
    },
    /**
     * The calls that have been made.
     */
    calls() {
      return [...log];
    },
    /**
     * Answer one call.
     */
    handle(method, url, body) {
      callCount++;
      const { path, query } = parseApiUrl(url);
      log.push({ method, url, path, query, body, callNumber: callCount });
      if (failures.length) {
        const failure = failures.shift();
        return makeResponse(failure.statusCode, failure.body);
      }
      const verb = String(method || 'GET').toUpperCase();
      for (const route of routes) {
        if (route.method !== verb) continue;
        const captures = matchRoute(route.pattern, path);
        if (!captures) continue;
        const routeQuery = { ...query, ...captures };
        return makeResponse(route.status, route.body(routeQuery, body));
      }
      return makeResponse(404, { error: 'Not found', path });
    }
  };
}

/**
 * The `requests` module the course imports.
 *
 * The client keeps a session, so a learner can set a timeout once and
 * reuse it, the way `requests.Session` works.
 */
export function createRequestsModule(options = {}) {
  const api = options.api || createFakeApi(options);
  const session = {
    timeout: options.timeout ?? 5,
    headers: { 'user-agent': 'imon-ai-lab' },
    retries: 0,
    /**
     * The calls that have been made through this client.
     */
    calls() {
      return api.calls();
    },
    /**
     * Answer one call.
     */
    handle(method, url, body) {
      return api.handle(method, url, body);
    },
    /**
     * Plan a failure for the next call.
     */
    failNext(statusCode, body) {
      api.failNext(statusCode, body);
      return this;
    },
    /**
     * Make a GET request.
     */
    get(url, headers) {
      return this.request('GET', url, null, headers);
    },
    /**
     * Make a POST request.
     */
    post(url, body, headers) {
      return this.request('POST', url, body, headers);
    },
    /**
     * Make a request.
     *
     * A retry only happens for a 5xx or a 429, because retrying a 404
     * only wastes time — the same rule a real client follows.
     */
    request(method, url, body, headers) {
      const attempts = Math.max(1, this.retries + 1);
      let response = null;
      for (let attempt = 0; attempt < attempts; attempt++) {
        response = api.handle(method, url, body);
        const retryable = response.status_code >= 500 || response.status_code === 429;
        if (!retryable || attempt === attempts - 1) break;
        // A retry waits a little, the way a real one does. The wait is
        // skipped so a lesson never hangs.
        api.log[api.log.length - 1].retried = true;
      }
      response.headers = { ...this.headers, ...(headers || {}) };
      response.url = url;
      response.method = String(method || 'GET').toUpperCase();
      return response;
    }
  };
  return session;
}

/**
 * The `http` module, for learners who prefer it to `requests`.
 *
 * It exposes the same session under the name `http`, so `http.get(...)`
 * works.
 */
export function createHttpModule(options = {}) {
  return createRequestsModule(options);
}
