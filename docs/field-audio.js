// Local recordings share the ambience mixer, its volume, and its gesture gate.
export function createFieldPlayer(context, output) {
  const buffers = new Map();
  const voices = new Map();
  const retryAfter = new Map();

  function stop(id) {
    const voice = voices.get(id);
    voices.delete(id);
    if (voice?.source) {
      try { voice.source.stop(); } catch { /* Already finished. */ }
    }
  }
  function stopAll() { for (const id of voices.keys()) stop(id); }

  async function play(id, level, loop = false, delay = 0) {
    if (voices.has(id) || performance.now() < (retryAfter.get(id) || 0)) return;
    const voice = {};
    voices.set(id, voice);
    const when = context.currentTime + delay;
    try {
      if (!buffers.has(id)) {
        const url = new URL('./sounds/' + id + '.mp3', import.meta.url);
        buffers.set(id, fetch(url).then(response => {
          if (!response.ok) throw Error('Recording unavailable');
          return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes)));
      }
      const buffer = await buffers.get(id);
      if (voices.get(id) !== voice) return;
      const source = context.createBufferSource(), gain = context.createGain();
      voice.source = source;
      source.buffer = buffer;
      source.loop = loop;
      source.connect(gain); gain.connect(output);
      gain.gain.value = level;
      source.onended = () => {
        if (voices.get(id) === voice) voices.delete(id);
        source.disconnect(); gain.disconnect();
      };
      source.start(Math.max(context.currentTime, when));
    } catch {
      buffers.delete(id);
      retryAfter.set(id, performance.now() + 30000);
      if (voices.get(id) === voice) voices.delete(id);
    }
  }

  function sync(scene, weather, layers) {
    const camp = scene === 'jungle-camp';
    const nature = !layers || layers.camp;
    const rainy = ['drizzle','rain','heavy-rain','glass-rain','storm'].includes(weather);
    const loops = {
      fire: camp && nature && .94,
      forest: camp && nature && .32,
      crickets: camp && (!layers || layers.crickets) && .32,
      rain: ((rainy && (!layers || layers.weather)) || layers?.rain) && .46
    };
    for (const [id, volume] of Object.entries(loops)) {
      if (volume) void play(id, volume, true);
      else stop(id);
    }
    if (!camp || !nature) stop('owl');
    if (weather !== 'storm' || (layers && !layers.weather && !layers.rain)) stop('thunder');
  }
  return {play, sync, stopAll};
}
