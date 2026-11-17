/** Original CSS pixel character with visible-only pose cycling. */
export function initPlayerCard() {
  const card = document.querySelector('.about-card');
  if (!card || card.dataset.playerReady) return;
  const frame = card.querySelector('.avatar-frame'), avatar = card.querySelector('.pixel-avatar');
  if (!frame || !avatar) return;
  card.dataset.playerReady = 'true'; card.classList.add('player-card-live');
  const backdrop = document.createElement('div'); backdrop.className = 'player-backdrop';
  backdrop.innerHTML = '<i class="player-orb orb-one"></i><i class="player-orb orb-two"></i><i class="player-pixel-hills"></i><i class="player-grid-floor"></i><i class="player-mote m1"></i><i class="player-mote m2"></i><i class="player-mote m3"></i><i class="player-mote m4"></i><i class="player-mote m5"></i><span class="player-code-float">{ }</span><span class="player-star-float">✦</span>';
  frame.prepend(backdrop);
  avatar.insertAdjacentHTML('beforeend', '<span class="player-arm player-arm-left"></span><span class="player-arm player-arm-right"></span><span class="player-laptop"><i></i><b>›_</b></span><span class="player-controller"><i></i><b></b></span>');
  const label = document.createElement('span'); label.className = 'player-pose-label';frame.append(label);
  const controls = document.createElement('div'); controls.className = 'player-pose-controls'; controls.setAttribute('role','group');controls.setAttribute('aria-label','Player character pose');
  controls.innerHTML = '<button type="button" data-player-pose="wave" aria-pressed="true">✦ WAVE</button><button type="button" data-player-pose="code" aria-pressed="false">&lt;/&gt; CODE</button><button type="button" data-player-pose="play" aria-pressed="false">✚ PLAY</button>';
  frame.after(controls);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), poses = ['wave','code','play'];
  let pose = 0, visible = true, enabled = document.body.dataset.motion !== 'off', timer = 0;
  function choose(name) {
    pose = Math.max(0, poses.indexOf(name));card.dataset.pose = poses[pose];
    label.textContent = ['HELLO, WORLD!','BUILDING SOMETHING.','ONE MORE ROUND.'][pose];
    controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.playerPose === poses[pose])));
  }
  function schedule() {
    clearInterval(timer);timer = 0;
    const animate = enabled && !reduced.matches && visible && !document.hidden;
    card.dataset.animate = animate ? 'on' : 'off';
    if (animate) timer = setInterval(() => choose(poses[(pose + 1) % poses.length]), 5200);
  }
  controls.addEventListener('click', event => {const button=event.target.closest('[data-player-pose]');if(button){choose(button.dataset.playerPose);schedule();}});
  document.addEventListener('imon:motion', event => {enabled=Boolean(event.detail?.enabled);schedule();});
  document.addEventListener('visibilitychange', schedule);reduced.addEventListener('change', schedule);
  if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver(entries => {visible=entries[0].isIntersecting;schedule();},{rootMargin:'80px'}).observe(card);
  choose('wave');schedule();
}
