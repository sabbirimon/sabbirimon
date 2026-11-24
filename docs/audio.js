// One master switch. Audio always starts OFF; activation only follows a user gesture.
let enabled = false, context;
export const isSoundEnabled = () => enabled;
export function setSound(value) {
  enabled = Boolean(value);
  if (enabled) {
    try { context ||= new (window.AudioContext || window.webkitAudioContext)(); context.resume().then(() => { if (enabled) playSound('enabled'); }).catch(() => {}); } catch { enabled = false; }
  } else if (context) context.suspend().catch(() => {});
  document.dispatchEvent(new CustomEvent('imon:sound', { detail: { enabled } }));
  return enabled;
}
export function playSound(kind = 'click') {
  if (!enabled || !context || context.state !== 'running') return;
  soundEffect(context,kind);
}
export const effectNotes = { pulse: [208, 132], enabled: [392, 523], lesson: [392, 494], run: [294, 440], correct: [523, 659, 784], retry: [330, 294], bookmark: [740, 880], portal: [392, 587, 784], clock: [660], click: [440], move: [310], roll: [270, 380, 490], start: [330, 440, 660], coin: [660, 990], eat: [570, 760], merge: [440, 660], hit: [150, 90], crash: [190, 100, 45], win: [440, 550, 660, 880], coast: [196, 247, 294, 370], raindrop: [980, 620], beacon: [392, 392, 587], charge: [185, 277, 415, 622] };
export function soundEffect(context,kind) {
  const notes=effectNotes[kind] || effectNotes.click;
  try {
    for (let i = 0; i < notes.length; i++) {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const at = context.currentTime + i * .065;
      oscillator.type = ['correct','retry','run','lesson','bookmark','enabled','portal','clock','coast','raindrop','beacon','charge'].includes(kind) ? 'sine' : 'square'; oscillator.frequency.setValueAtTime(notes[i], at);
      gain.gain.setValueAtTime(.022, at); gain.gain.exponentialRampToValueAtTime(.001, at + .075);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(at); oscillator.stop(at + .08);
    }
  } catch { /* Audio is a nonessential enhancement. */ }
}

let gameSoundObserver;
/** Add a shared-effects switch to each game, including dialogs created later. */
export function initGameSoundControls() {
  if (gameSoundObserver) return;
  const buttons = new Set();
  function sync() {
    for (const button of buttons) {
      button.textContent = enabled ? 'Sound on' : 'Sound off';
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', `Turn sound ${enabled ? 'off' : 'on'} for all games`);
    }
  }
  function decorate(dialog) {
    if (['world-studio','sound-mixer-dialog'].includes(dialog.id) || dialog.querySelector('.arcade-sound, .game-sound-toggle')) return;
    const header = dialog.querySelector('header'); if (!header) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'game-sound-toggle';
    button.title = 'Shared game sound effects. Ambient audio has its own switch.';
    const close = header.querySelector('button[aria-label^="Close"]');
    if (close) header.insertBefore(button, close); else header.append(button);
    buttons.add(button); sync();
    button.addEventListener('click', () => { setSound(!enabled); if (enabled) playSound('coin'); });
  }
  document.querySelectorAll('dialog').forEach(decorate);
  document.addEventListener('imon:sound', sync);
  gameSoundObserver = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches('dialog')) decorate(node);
      else node.querySelectorAll('dialog').forEach(decorate);
    }
  });
  gameSoundObserver.observe(document.body, { childList: true, subtree: true });
}
