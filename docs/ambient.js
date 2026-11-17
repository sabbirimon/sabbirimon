/**
 * IMON's procedural ambience. No recordings, downloads, or autoplay bypasses.
 * Preference starts OFF; AudioContext creation/resume happens only in unlock(),
 * after ambience is enabled by the visitor and a gesture allows audio. This is separate
 * from the game sound-effects switch in audio.js, which starts OFF.
 */
export function initAmbient() {
  let enabled = false, unlocked = false, destroyed = false, volume = .35;
  let scene = 'islands', weather = 'clear', context = null, master = null;
  let wind = null, surf = null, rain = null, rainBody = null, water = null, hum = null;
  let timer = null, musicTimer = null, suspendTimer = null, nextChirp = 0, lastThunder = -Infinity, musicStep = 0;
  const sources = new Set();
  const notify = () => document.dispatchEvent(new CustomEvent('imon:ambient', { detail: { enabled, unlocked, volume, scene, weather } }));
  const outputLevel = () => volume * .34;

  function sceneFamily() {
    if (/cyberpunk|dystopia/.test(scene)) return 'cyberpunk';
    if (/cave|cavern|underground/.test(scene)) return 'cave';
    if (/space|cosmos|galaxy|orbital/.test(scene)) return 'space';
    if (/beach|ocean|coast|sea/.test(scene)) return 'beach';
    if (/desert|dune|sand/.test(scene)) return 'desert';
    if (/mountain|alpine|peak/.test(scene)) return 'mountains';
    if (/city|urban|cyber|metro|skyline/.test(scene)) return 'city';
    return 'forest'; // Floating islands, forests, gardens, and other nature scenes.
  }
  function active() { return !destroyed && enabled && unlocked && context?.state === 'running' && !document.hidden; }
  function target(param, value, seconds = 1.5) {
    if (!context) return;
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, seconds);
  }
  function noiseLayer(buffer, type, frequency, q = .5) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; source.loop = true;
    filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
    gain.gain.value = 0; source.connect(filter); filter.connect(gain); gain.connect(master);
    source.start(0, Math.random() * buffer.duration); sources.add(source);
    return { source, filter, gain };
  }
  function buildGraph() {
    master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    // Independent stereo textures keep the sound spacious without recordings.
    const buffer = context.createBuffer(2, context.sampleRate * 6, context.sampleRate);
    const softBuffer = context.createBuffer(2, context.sampleRate * 6, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel), soft = softBuffer.getChannelData(channel);
      let previous = 0;
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.random() * 2 - 1;
        previous = previous * .97 + samples[i] * .03;
        soft[i] = previous * 3;
      }
    }
    wind = noiseLayer(softBuffer, 'bandpass', 650, .45);
    surf = noiseLayer(buffer, 'lowpass', 950, .5);
    rain = noiseLayer(buffer, 'highpass', 1400, .3);
    rainBody = noiseLayer(buffer, 'lowpass', 1700, .45);
    water = noiseLayer(buffer, 'bandpass', 850, .4);
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 90; gain.gain.value = 0;
    oscillator.connect(gain); gain.connect(master); oscillator.start(); sources.add(oscillator);
    hum = { source: oscillator, gain };
    nextChirp = context.currentTime + 3;
    timer = setInterval(update, 1000);
    musicTimer = setInterval(musicTick, 280);
  }

  function tone(frequency, duration, level, type = 'triangle', cutoff = 1700) {
    if (!active()) return;
    const t = context.currentTime, oscillator = context.createOscillator(), filter = context.createBiquadFilter(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = .5;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + Math.min(.08, duration * .2)); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(filter); filter.connect(gain); gain.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
    oscillator.start(t); oscillator.stop(t + duration + .03);
  }
  function musicTick() {
    if (!active() || sceneFamily() !== 'cyberpunk') return;
    // Original procedural minor-key sequence, composed in code for this site.
    const roots = [65.406, 51.913, 43.654, 48.999];
    const root = roots[Math.floor(musicStep / 16) % roots.length];
    const melody = [0, 7, 12, 3, 10, 7, 15, 12];
    tone(root * 2 * 2 ** (melody[musicStep % melody.length] / 12), .34, .055, 'triangle', 1400);
    if (musicStep % 4 === 0) tone(root, .92, .10, 'sine', 350);
    if (musicStep % 16 === 0) {
      tone(root * 2, 4.2, .022, 'sine', 800);
      tone(root * 2 * 2 ** (3 / 12), 4.2, .012, 'sine', 800);
      tone(root * 3, 4.2, .012, 'sine', 800);
    }
    musicStep++;
  }

  function chirp(kind = 'bird') {
    if (!active()) return;
    const t = context.currentTime;
    if (kind === 'drip') { tone(650 + Math.random() * 350, .35, .04, 'sine', 1800); return; }
    if (kind === 'cricket') {
      for (let i = 0; i < 3; i++) {
        const oscillator = context.createOscillator(), gain = context.createGain(), start = t + i * .15;
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(3100 + Math.random() * 400, start);
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.014, start + .012); gain.gain.linearRampToValueAtTime(0, start + .065);
        oscillator.connect(gain); gain.connect(master); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); }; oscillator.start(start); oscillator.stop(start + .08);
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const oscillator = context.createOscillator(), gain = context.createGain(), start = t + i * .23;
        const pitch = 1600 + Math.random() * 450;
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(pitch, start); oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.55, start + .08); oscillator.frequency.exponentialRampToValueAtTime(pitch * .9, start + .19);
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.025, start + .04); gain.gain.exponentialRampToValueAtTime(.0001, start + .2);
        oscillator.connect(gain); gain.connect(master); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); }; oscillator.start(start); oscillator.stop(start + .22);
      }
    }
  }

  function update() {
    if (!active()) return;
    const t = context.currentTime, family = sceneFamily();
    let windLevel = .045, windFrequency = 650, surfLevel = 0, rainLevel = 0, humLevel = 0, humFrequency = 90;
    if (family === 'beach') { windLevel = .035; surfLevel = .19 + Math.sin(t * .24) * .09; }
    else if (family === 'desert') { windLevel = .12 + Math.sin(t * .12) * .045; windFrequency = 550; }
    else if (family === 'mountains') { windLevel = .065 + Math.sin(t * .15) * .02; windFrequency = 1100; }
    else if (family === 'cyberpunk') { windLevel = .035; windFrequency = 250; humLevel = .008; humFrequency = 65.406; }
    else if (family === 'cave') { windLevel = .025; windFrequency = 300; humLevel = .008; humFrequency = 72; }
    else if (family === 'space') { windLevel = .012; windFrequency = 180; humLevel = .012; humFrequency = 55; }
    else if (family === 'city') { windLevel = .07 + Math.sin(t * .09) * .025; windFrequency = 220; humLevel = .012; }
    else windLevel = .04 + Math.sin(t * .1) * .015;
    if (weather === 'drizzle') { rainLevel = .045; windLevel += .01; }
    else if (weather === 'rain') { rainLevel = .11; windLevel += .025; }
    else if (weather === 'heavy-rain') { rainLevel = .14; windLevel += .055; }
    else if (weather === 'storm') { rainLevel = .15; windLevel += .075; }
    else if (weather === 'cloudy') { windLevel += .018; humLevel += .002; }
    else if (weather === 'snow') { windLevel += .025; windFrequency = 900; }
    else if (weather === 'blizzard') { windLevel += .16; windFrequency = 800; rainLevel = .018; }
    else if (weather === 'fog') { windLevel *= .65; humLevel += .004; }
    else if (weather === 'sandstorm') { windLevel += .13; windFrequency = 1050; rainLevel = .025; }
    else if (weather === 'wind' || weather === 'leaves') { windLevel += weather === 'wind' ? .13 : .055; }
    else if (weather === 'hail') { rainLevel = .14; windLevel += .045; }
    else if (weather === 'cyclone') { windLevel += .23; rainLevel = .11; windFrequency = 600; }
    else if (weather === 'flood') { surfLevel = .25 + Math.sin(t * .2) * .06; windLevel += .04; }
    else if (weather === 'earthquake') { humLevel += .02; humFrequency = 45; }
    const showerSwell = .92 + Math.sin(t * .19) * .055 + Math.sin(t * .43) * .025;
    let waterLevel = /waterfall|river|cascade/.test(scene) ? .16 : /lake|lagoon|oasis/.test(scene) ? .065 : 0;
    if (weather === 'flood') waterLevel = .2;
    target(wind.gain.gain, windLevel * (1 + Math.sin(t * .27) * .08));
    target(wind.filter.frequency, windFrequency * (1 + Math.sin(t * .11) * .12), 2);
    target(surf.gain.gain, surfLevel, 2);
    target(water.gain.gain, waterLevel * (.9 + Math.sin(t * .31) * .1), 2);
    target(water.filter.frequency, 850 + Math.sin(t * .17) * 120, 2);
    target(rain.gain.gain, rainLevel * showerSwell);
    target(rainBody.gain.gain, rainLevel * .65 * showerSwell);
    target(hum.gain.gain, humLevel); target(hum.source.frequency, humFrequency, 2);
    if (t >= nextChirp) {
      nextChirp = t + 8 + Math.random() * 11;
      const hour = new Date().getHours(), night = hour < 5 || hour >= 18;
      if (!['storm', 'blizzard', 'sandstorm'].includes(weather)) {
        if (family === 'cave') chirp('drip');
        else if (family === 'forest') chirp(night ? 'cricket' : 'bird');
        else if (!night && ['mountains', 'beach'].includes(family) && Math.random() > .45) chirp('bird');
      }
    }
  }

  async function unlock() {
    if (destroyed || !enabled || document.hidden) return false;
    // Only explicit input can create the audio context. Visibility events never do.
    if (!unlocked && navigator.userActivation?.isActive === false) return false;
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        context = new AudioContext(); buildGraph();
      }
      if (document.hidden || !enabled) { await context.suspend(); return false; }
      await context.resume();
      if (!enabled || document.hidden || destroyed) { await context.suspend(); return false; }
      unlocked = context.state === 'running';
      if (unlocked) { target(master.gain, outputLevel(), .6); update(); }
      notify(); return unlocked;
    } catch { return false; }
  }

  function setEnabled(value) {
    enabled = Boolean(value); clearTimeout(suspendTimer);
    if (!context) { if (enabled && navigator.userActivation?.isActive) void unlock(); notify(); return enabled; }
    if (!enabled) {
      target(master.gain, 0, .04);
      suspendTimer = setTimeout(() => { if (!enabled) context?.suspend().catch(() => {}); }, 220);
    } else if (!document.hidden && (unlocked || navigator.userActivation?.isActive)) {
      void unlock();
    }
    notify(); return enabled;
  }

  function setVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return volume;
    volume = Math.min(1, Math.max(0, number));
    if (master) target(master.gain, enabled && !document.hidden ? outputLevel() : 0, .15);
    notify(); return volume;
  }

  function thunder() {
    if (!active() || context.currentTime - lastThunder < 5) return;
    const t = context.currentTime; lastThunder = t;
    // A gradual, rolling synthetic rumble with a longer distant tail.
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = wind.source.buffer; filter.type = 'lowpass'; filter.frequency.setValueAtTime(280, t); filter.frequency.exponentialRampToValueAtTime(95, t + 5); filter.Q.value = .5;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.38, t + .65); gain.gain.linearRampToValueAtTime(.2, t + 1.3); gain.gain.linearRampToValueAtTime(.28, t + 1.9); gain.gain.exponentialRampToValueAtTime(.0001, t + 5.3);
    source.connect(filter); filter.connect(gain); gain.connect(master); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); }; source.start(t); source.stop(t + 5.4);
  }
  function visibilityChanged() {
    if (!context || destroyed) return;
    clearTimeout(suspendTimer);
    if (document.hidden) context.suspend().catch(() => {});
    else if (enabled && unlocked) context.resume().then(() => {
      if (!enabled || document.hidden || destroyed) { context?.suspend().catch(() => {}); return; }
      target(master.gain, outputLevel(), .6); update();
    }).catch(() => {});
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  return {
    unlock, setEnabled, setVolume, thunder,
    isEnabled: () => enabled,
    getVolume: () => volume,
    setScene(name) { scene = String(name || 'islands').toLowerCase(); musicStep = 0; update(); },
    setWeather(name) { weather = ['drizzle', 'rain', 'heavy-rain', 'storm', 'cloudy', 'snow', 'blizzard', 'fog', 'sandstorm', 'wind', 'hail', 'cyclone', 'flood', 'earthquake', 'aurora', 'meteors', 'fireflies', 'leaves'].includes(name) ? name : 'clear'; update(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; clearInterval(timer); clearInterval(musicTimer); clearTimeout(suspendTimer);
      document.removeEventListener('visibilitychange', visibilityChanged);
      for (const source of sources) { try { source.stop(); } catch { /* Already stopped. */ } }
      sources.clear(); context?.close().catch(() => {}); context = null;
    }
  };
}
