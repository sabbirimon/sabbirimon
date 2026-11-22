/**
 * The header navigation on small screens.
 *
 * Above 900px the nav is a plain row of links and this module does nothing.
 * Below that the links do not fit, so they move into a panel that slides out
 * of the header when the menu button is pressed.
 *
 * The links are always in the document and always reachable — the button only
 * decides whether they are shown or folded away, so the navigation still
 * works without JavaScript.
 */

/** The width below which the nav folds into the menu. */
export const NAV_MENU_MAX_WIDTH = 900;

/** Whether the nav should be folded into the menu at the given width. */
export function usesMenu(width = window.innerWidth) {
  return width <= NAV_MENU_MAX_WIDTH;
}

export function initSiteNav(root = document) {
  const header = root.querySelector('.site-header');
  const nav = header?.querySelector('nav');
  const toggle = root.querySelector('[data-nav-toggle]');
  if (!header || !nav || !toggle) return null;

  const panelId = 'site-nav-panel';

  if (!nav.id) nav.id = panelId;

  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');

  function setOpen(open) {
    header.classList.toggle('is-nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // A link that has been followed should close the menu behind it.
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });

  // Escape closes it, and so does a click outside the header.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });

  document.addEventListener('click', event => {
    if (!header.contains(event.target)) close();
  });

  // Leaving the narrow range must not leave the header stuck open.
  const wide = window.matchMedia(`(min-width: ${NAV_MENU_MAX_WIDTH + 1}px)`);
  wide.addEventListener('change', event => {
    if (event.matches) close();
  });

  // Start in the right state for the current width.
  if (!usesMenu()) close();

  return { close };
}
