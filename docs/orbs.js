/**
 * Domain orbs — an animated strip of the four areas of interest.
 *
 * The artwork lives at art/orbs.svg (pure SVG + SMIL, no JavaScript needed).
 * It is inlined so the orb colors follow the site's accent theme and so the
 * strip can be themed as a whole. Screen readers get the same four labels
 * through a visually hidden list, so inlining never duplicates content.
 *
 * Original artwork by the site owner; see art/PROMPTS.md.
 */
const ORB_DOMAINS = [
  { label: 'Cloud', key: 'cloud' },
  { label: 'DevOps', key: 'devops' },
  { label: '5G / RAN', key: 'ran' },
  { label: 'Open source', key: 'oss' }
];

export const ORB_LABELS = ORB_DOMAINS.map(domain => domain.label);

function svgText(markup) {
  // The SVG is authored in this repository, but it is still injected as markup,
  // so strip anything that could close the tag or open a script.
  return markup.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export function initOrbs() {
  const strip = document.querySelector('.skill-strip');
  if (!strip || strip.dataset.orbsReady) return;
  strip.dataset.orbsReady = 'true';

  const list = document.createElement('ul');
  list.className = 'sr-only orb-labels';
  ORB_DOMAINS.forEach(domain => {
    const item = document.createElement('li');
    item.textContent = domain.label;
    list.append(item);
  });

  const art = document.createElement('div');
  art.className = 'orb-art';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = svgText(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 124" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <radialGradient id="orb1" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
          <stop offset="40%" stop-color="#22d3ee" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.10"/>
        </radialGradient>
        <radialGradient id="orb2" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
          <stop offset="40%" stop-color="#a855f7" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#a855f7" stop-opacity="0.10"/>
        </radialGradient>
        <radialGradient id="orb3" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
          <stop offset="40%" stop-color="#ec4899" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.10"/>
        </radialGradient>
        <radialGradient id="orb4" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
          <stop offset="40%" stop-color="#84cc16" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#84cc16" stop-opacity="0.10"/>
        </radialGradient>
      </defs>
      <g font-family="ui-monospace, Menlo, monospace" font-size="11" font-weight="700" text-anchor="middle">
        <g transform="translate(60 55)">
          <circle r="36" fill="url(#orb1)"><animate attributeName="r" values="32;40;32" dur="3s" repeatCount="indefinite"/></circle>
          <circle r="22" fill="#22d3ee" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
          <text y="60" fill="#22d3ee">CLOUD</text>
        </g>
        <g transform="translate(180 55)">
          <circle r="36" fill="url(#orb2)"><animate attributeName="r" values="32;40;32" dur="3s" begin="0.75s" repeatCount="indefinite"/></circle>
          <circle r="22" fill="#a855f7" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
          <text y="60" fill="#a855f7">DEVOPS</text>
        </g>
        <g transform="translate(300 55)">
          <circle r="36" fill="url(#orb3)"><animate attributeName="r" values="32;40;32" dur="3s" begin="1.5s" repeatCount="indefinite"/></circle>
          <circle r="22" fill="#ec4899" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
          <text y="60" fill="#ec4899">5G / RAN</text>
        </g>
        <g transform="translate(420 55)">
          <circle r="36" fill="url(#orb4)"><animate attributeName="r" values="32;40;32" dur="3s" begin="2.25s" repeatCount="indefinite"/></circle>
          <circle r="22" fill="#84cc16" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
          <text y="60" fill="#84cc16">OSS</text>
        </g>
      </g>
    </svg>`);

  const old = strip.querySelectorAll('span');
  old.forEach(node => node.remove());
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Areas of interest');
  strip.append(art, list);
}
