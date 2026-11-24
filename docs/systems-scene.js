const control = document.getElementById('tower-motion');
const poster = document.querySelector('#tower-panorama source');
const preference = matchMedia(poster.media);
let manualPause = null;

function updateLabel() {
  const paused = manualPause ?? preference.matches;
  control.textContent = paused ? 'Play animation' : 'Pause animation';
}

control.addEventListener('click', () => {
  manualPause = !(manualPause ?? preference.matches);
  poster.media = manualPause ? 'all' : 'not all';
  updateLabel();
});

preference.addEventListener('change', updateLabel);
updateLabel();
control.hidden = false;
