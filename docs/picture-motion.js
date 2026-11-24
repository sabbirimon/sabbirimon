// The picture selects the OS preference until the visitor chooses a playback mode.
export function enablePictureMotion(control) {
  const picture = document.getElementById(control.getAttribute('aria-controls'));
  const poster = picture.querySelector('source[media]');
  const preference = matchMedia(poster.media);
  let manualPause = null;

  function updateLabel() {
    control.textContent = (manualPause ?? preference.matches) ? 'Play animation' : 'Pause animation';
  }

  control.addEventListener('click', () => {
    manualPause = !(manualPause ?? preference.matches);
    poster.media = manualPause ? 'all' : 'not all';
    updateLabel();
  });
  preference.addEventListener('change', updateLabel);
  updateLabel();
  control.hidden = false;
}
