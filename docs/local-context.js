/**
 * Visitor-local scene context. Clock/phase never wait for a network response and
 * always use the visitor's browser time zone, not an IP/VPN-derived time zone.
 *
 * Sources (verified against their primary API documentation):
 * https://ipapi.co/api/#location-of-clients-ip — browser/client-IP JSON endpoint.
 * https://freeipapi.com/api — browser/client-IP JSON endpoint (fallback).
 * https://open-meteo.com/en/docs — current weather_code/is_day, daily sunrise and
 * sunset, timezone=auto, and the WMO weather-code mapping.
 * https://open-meteo.com/en/licence — weather-data attribution/license.
 *
 * The browser contacts the IP provider and Open-Meteo directly; those services
 * receive the normal network IP. Only rounded coordinates are sent to Open-Meteo.
 * This site has no tracking server. The 30-minute local cache contains
 * city/weather only: no IP address, coordinates, postal code, or device
 * geolocation is persisted. IP lookup may be unavailable because of CORS,
 * blocking, or provider limits.
 */
const CACHE_KEY = 'imon-local-weather-v1';
const CACHE_TTL = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;
const WEATHER_TYPES = new Set(['clear','cloudy','fog','drizzle','rain','heavy-rain','light-snow','snow','heavy-snow','storm']);
const WMO_LABELS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
  85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
  96: 'Thunderstorm with hail', 97: 'Heavy thunderstorm', 99: 'Thunderstorm with hail'
};

// IP geolocation providers, tried in order until one answers. Each entry maps
// its own response shape onto {latitude, longitude, city}. ipapi.co is first
// but it now answers API requests with a Cloudflare challenge page (HTTP 403
// without CORS headers), so freeipapi.com carries the lookup when it fails.
const IP_PROVIDERS = [
  { url: 'https://ipapi.co/json/', pick: data => ({ latitude: data.latitude, longitude: data.longitude, city: data.city || data.region }) },
  { url: 'https://freeipapi.com/api/json', pick: data => ({ latitude: data.latitude, longitude: data.longitude, city: data.cityName || data.regionName }) }
];
export const IP_PROVIDER_URLS = IP_PROVIDERS.map(provider => provider.url);
export const pickIpPlace = (index, data) => IP_PROVIDERS[index].pick(data);

export function phaseForHour(hour) {
  if (!Number.isFinite(hour)) return 'twilight';
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'daylight';
  if (h >= 16 && h < 18) return 'sunset';
  return 'twilight';
}

export function weatherForCode(code) {
  if ([96,99].includes(code)) return 'hail';
  if ([95, 97].includes(code)) return 'storm';
  if ([71,77].includes(code)) return 'light-snow';
  if ([73,85].includes(code)) return 'snow';
  if ([75,86].includes(code)) return 'heavy-snow';
  if ([51,53,56,61,80].includes(code)) return 'drizzle';
  if ([55,57,63,66,81].includes(code)) return 'rain';
  if ([65,67,82].includes(code)) return 'heavy-rain';
  if ([2,3].includes(code)) return 'cloudy';
  if ([45,48].includes(code)) return 'fog';
  return 'clear';
}

export function weatherDescription(code) { return WMO_LABELS[code] || 'Weather unavailable'; }

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    const age = Date.now() - cached?.savedAt;
    if (!cached || !Number.isFinite(age) || age < 0 || age >= CACHE_TTL || typeof cached.city !== 'string' || !WEATHER_TYPES.has(cached.weather) || !Number.isInteger(cached.code) || !WMO_LABELS[cached.code]) return null;
    return { ...cached, weather:weatherForCode(cached.code) };
  } catch { return null; }
}
function writeCache(value) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch { /* Storage is optional. */ } }
function roundedCoordinates(latitude, longitude) {
  if (latitude === null || longitude === null || latitude === '' || longitude === '') throw new Error('Location unavailable');
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Location unavailable');
  return { latitude: Math.round(lat * 10) / 10, longitude: Math.round(lon * 10) / 10 };
}

/**
 * Returns quickly; network refresh runs in the background.
 * onPhase(phase): morning | daylight | sunset | twilight, initially synchronous.
 * onClock({time, zone}): browser-local HH:mm:ss and IANA zone, once per second.
 * onWeather(type, metadata): clear | rain | snow | storm. Metadata.status is
 * live | cached | unavailable; use it to avoid claiming a fallback is live data.
 * onLocation({city, source, status, weatherStatus}): source is ip | geolocation |
 * cache | browser; status is loading | ready | unavailable.
 * Returned refresh({force:true}) retries; stop() clears timers and requests.
 * locatePrecisely() is optional and must be called directly from a user click.
 */
export async function initLocalContext({ onPhase, onWeather, onLocation, onClock } = {}) {
  let stopped = false, lastPhase = null, inFlight = null, requestId = 0;
  let cacheExpiryTimer = null, geolocationTimer = null, lastCity = '', lastSource = 'browser';
  let cancelGeolocation = null;
  const controllers = new Set();
  const emit = (callback, ...args) => { if (!stopped && typeof callback === 'function') { try { callback(...args); } catch { /* One UI callback cannot stop the clock. */ } } };

  function tick() {
    if (stopped) return;
    const now = new Date(), phase = phaseForHour(now.getHours());
    let time, zone;
    try {
      time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
    } catch { time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); zone = 'Local time'; }
    if (phase !== lastPhase) { lastPhase = phase; emit(onPhase, phase); }
    emit(onClock, { time, zone });
  }

  async function fetchJson(url) {
    const controller = new AbortController(); controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      if (!response.ok) throw new Error('Provider unavailable');
      const data = await response.json();
      if (data.error) throw new Error('Provider unavailable');
      return data;
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  function metadata(data, status) {
    return { status, code: data.code, description: weatherDescription(data.code), updatedAt: data.savedAt, isDay: data.isDay, sunrise: data.sunrise, sunset: data.sunset, timezone: data.timezone, attribution: 'Open-Meteo' };
  }

  async function locateByIp() {
    let lastError;
    for (const provider of IP_PROVIDERS) {
      let data;
      try {
        data = await fetchJson(provider.url);
      } catch (error) {
        lastError = error;
        continue;
      }
      const place = provider.pick(data);
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
        lastError = new Error('Provider unavailable');
        continue;
      }
      const city = typeof place.city === 'string' && place.city.trim() ? place.city.trim() : 'Approximate area';
      return { latitude: place.latitude, longitude: place.longitude, city };
    }
    throw lastError || new Error('Provider unavailable');
  }
  function applyWeather(data, status, source) {
    lastCity = data.city; lastSource = source;
    emit(onLocation, { city: data.city, source, status: 'ready', weatherStatus: status });
    emit(onWeather, data.weather, metadata(data, status));
    clearTimeout(cacheExpiryTimer);
    cacheExpiryTimer = setTimeout(() => { if (!stopped && !document.hidden) void refresh(); }, Math.max(1, CACHE_TTL - (Date.now() - data.savedAt) + 10));
  }
  function unavailable(city = '', source = 'browser') {
    emit(onLocation, { city, source, status: city ? 'ready' : 'unavailable', weatherStatus: 'unavailable' });
    emit(onWeather, 'clear', { status: 'unavailable', code: null, description: 'Weather unavailable', updatedAt: null });
  }
  async function loadWeather(coords, city, source, id) {
    const params = new URLSearchParams({ latitude: String(coords.latitude), longitude: String(coords.longitude), current: 'weather_code,is_day', daily: 'sunrise,sunset', timezone: 'auto', forecast_days: '1' });
    const result = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (stopped || id !== requestId) return { status: 'cancelled' };
    const code = result.current?.weather_code;
    if (!Number.isInteger(code) || !WMO_LABELS[code]) throw new Error('Weather unavailable');
    const data = { savedAt: Date.now(), city: city.slice(0, 80), weather: weatherForCode(code), code, isDay: result.current?.is_day === 1, sunrise: result.daily?.sunrise?.[0] || null, sunset: result.daily?.sunset?.[0] || null, timezone: typeof result.timezone === 'string' ? result.timezone : null };
    writeCache(data); applyWeather(data, 'live', source);
    return { status: 'ready', city: data.city, weather: data.weather };
  }

  function refresh({ force = false } = {}) {
    if (stopped) return Promise.resolve({ status: 'stopped' });
    if (inFlight) return inFlight;
    const cached = force ? null : readCache();
    if (cached) { applyWeather(cached, 'cached', 'cache'); return Promise.resolve({ status: 'cached', city: cached.city, weather: cached.weather }); }
    const id = ++requestId;
    emit(onLocation, { city: lastCity, source: lastSource, status: 'loading', weatherStatus: 'loading' });
    const task = (async () => {
      let city = '', source = 'browser';
      try {
        const place = await locateByIp();
        if (stopped || id !== requestId) return { status: 'cancelled' };
        const coords = roundedCoordinates(place.latitude, place.longitude);
        city = place.city;
        source = 'ip'; lastCity = city; lastSource = source;
        emit(onLocation, { city, source, status: 'ready', weatherStatus: 'loading' });
        return await loadWeather(coords, city, source, id);
      } catch {
        if (!stopped && id === requestId) unavailable(city, source);
        return { status: stopped || id !== requestId ? 'cancelled' : 'unavailable' };
      }
    })();
    inFlight = task;
    task.finally(() => { if (inFlight === task) inFlight = null; });
    return task;
  }

  async function locatePrecisely() {
    if (stopped) return { status: 'stopped' };
    if (!navigator.geolocation || navigator.userActivation?.isActive === false) return { status: 'unavailable', reason: 'location-needs-user-click' };
    controllers.forEach(controller => controller.abort());
    cancelGeolocation?.();
    const id = ++requestId; inFlight = null;
    emit(onLocation, { city: '', source: 'geolocation', status: 'loading', weatherStatus: 'loading' });
    try {
      const position = await new Promise((resolve, reject) => {
        let finished = false;
        const finish = (fn, value) => { if (finished) return; finished = true; clearTimeout(geolocationTimer); cancelGeolocation = null; fn(value); };
        cancelGeolocation = () => finish(reject, new Error('Cancelled'));
        geolocationTimer = setTimeout(() => finish(reject, new Error('Location timed out')), REQUEST_TIMEOUT);
        navigator.geolocation.getCurrentPosition(p => finish(resolve, p), e => finish(reject, e), { enableHighAccuracy: false, timeout: REQUEST_TIMEOUT, maximumAge: 10 * 60 * 1000 });
      });
      if (stopped || id !== requestId) return { status: 'cancelled' };
      const coords = roundedCoordinates(position.coords.latitude, position.coords.longitude);
      return await loadWeather(coords, 'Nearby area', 'geolocation', id);
    } catch {
      if (!stopped && id === requestId) unavailable('', 'geolocation');
      return { status: stopped || id !== requestId ? 'cancelled' : 'unavailable' };
    }
  }

  function onVisibility() { if (!document.hidden && !stopped) { tick(); void refresh(); } }
  tick(); // Synchronous first paint: a visitor opening at night immediately gets night.
  emit(onWeather, 'clear', { status: 'unavailable', code: null, description: 'Weather loading', updatedAt: null });
  const clockTimer = setInterval(tick, 1000);
  const weatherTimer = setInterval(() => { if (!document.hidden) void refresh(); }, CACHE_TTL);
  document.addEventListener('visibilitychange', onVisibility);
  void refresh();
  return { refresh, locatePrecisely, stop() {
    if (stopped) return;
    stopped = true; requestId++;
    clearInterval(clockTimer); clearInterval(weatherTimer); clearTimeout(cacheExpiryTimer); clearTimeout(geolocationTimer);
    controllers.forEach(controller => controller.abort()); controllers.clear(); cancelGeolocation?.();
    document.removeEventListener('visibilitychange', onVisibility);
  } };
}
