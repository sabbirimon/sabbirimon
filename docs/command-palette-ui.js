/**
 * The command palette, wired into the page.
 *
 * The index and the fuzzy matcher live in command-palette.js so they can be
 * tested without a DOM. This file owns everything that touches the document.
 *
 * The palette is a modal dialog built on <dialog>. It traps focus natively,
 * marks the rest of the page inert through the top layer, restores focus to
 * whatever was focused before it opened, and keeps the pointer out of the way
 * of the rest of the page while it is open.
 */
import {
  SEARCH_INDEX, clampSelection, gameKey, isExternalTarget, isGameTarget,
  isSectionTarget, moveSelection, search, targetLabel
} from './command-palette.js';

const MODAL_ID = 'command-palette-modal';
const LIST_ID = 'command-palette-list';
const INPUT_ID = 'command-palette-input';
const STATUS_ID = 'command-palette-status';
const TITLE_ID = 'command-palette-title';

/** True when the visitor is typing into a field, so Ctrl+K must not steal it. */
function isTypingTarget(target) {
  if (!target || !target.tagName) return false;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target.getAttribute('type') || 'text').toLowerCase();
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image'].includes(type);
  }
  return target.isContentEditable === true;
}

/** True when another modal dialog currently owns the screen. */
function anotherDialogIsOpen(dialog) {
  const dialogs = document.querySelectorAll('dialog[open]');
  for (const open of dialogs) if (open !== dialog) return true;
  return false;
}

/** Builds the dialog markup once and returns the pieces the code needs. */
function buildDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = MODAL_ID;
  dialog.className = 'command-palette';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', TITLE_ID);
  dialog.innerHTML = `<div class="command-palette-shell">
<div class="command-palette-header">
<div class="command-palette-mark" aria-hidden="true">⌘</div>
<div class="command-palette-heading">
<h2 id="${TITLE_ID}">Command palette</h2>
<p>Jump to any part of IMON.world</p>
</div>
<button type="button" class="command-palette-close" data-command-palette-close aria-label="Close command palette">×</button>
</div>
<div class="command-palette-field">
<label class="sr-only" for="${INPUT_ID}">Search the site</label>
<input id="${INPUT_ID}" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="${LIST_ID}" aria-autocomplete="list" aria-describedby="${STATUS_ID}" placeholder="Type to search — projects, games, pages…">
</div>
<p id="${STATUS_ID}" class="command-palette-status" role="status" aria-live="polite"></p>
<ul id="${LIST_ID}" class="command-palette-list" role="listbox" aria-label="Search results"></ul>
<div class="command-palette-footer">
<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
<span><kbd>↵</kbd> open</span>
<span><kbd>esc</kbd> close</span>
</div>
</div>`;
  document.body.append(dialog);
  return {
    dialog,
    input: dialog.querySelector(`#${INPUT_ID}`),
    list: dialog.querySelector(`#${LIST_ID}`),
    status: dialog.querySelector(`#${STATUS_ID}`),
    close: dialog.querySelector('[data-command-palette-close]')
  };
}

export function initCommandPalette(root = document) {
  if (!root || root.querySelector(`#${MODAL_ID}`)) return null;

  const parts = buildDialog();
  const { dialog, input, list, status, close } = parts;

  let results = [];
  let selected = 0;
  let opener = null;

  function announce(message) { status.textContent = message; }

  function render() {
    list.textContent = '';
    if (!results.length) {
      const empty = document.createElement('li');
      empty.className = 'command-palette-empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = 'No matches. Try "snake", "lab" or "github".';
      list.append(empty);
      return;
    }
    results.forEach((entry, index) => {
      const item = document.createElement('li');
      item.id = `command-palette-option-${index}`;
      item.className = 'command-palette-option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === selected));
      item.dataset.index = String(index);
      const title = document.createElement('span');
      title.className = 'command-palette-option-title';
      title.textContent = entry.title;
      const subtitle = document.createElement('span');
      subtitle.className = 'command-palette-option-subtitle';
      subtitle.textContent = entry.subtitle;
      const kind = document.createElement('span');
      kind.className = 'command-palette-option-kind';
      kind.textContent = entry.kind === 'game' ? 'PLAY' : entry.kind === 'link' ? 'LINK' : 'GO';
      kind.setAttribute('aria-hidden', 'true');
      item.append(title, subtitle, kind);
      item.addEventListener('click', () => { selected = index; activate(); });
      item.addEventListener('mousemove', () => { if (selected !== index) { selected = index; syncSelection(); } });
      list.append(item);
    });
  }

  function syncSelection() {
    const options = list.querySelectorAll('.command-palette-option');
    options.forEach((option, index) => {
      const active = index === selected;
      option.setAttribute('aria-selected', String(active));
      option.classList.toggle('is-active', active);
    });
    const active = options[selected];
    if (active) {
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function run(query) {
    results = search(query, SEARCH_INDEX);
    selected = clampSelection(0, results.length);
    render();
    syncSelection();
    const count = results.length;
    if (!query.trim()) announce(`${SEARCH_INDEX.length} destinations ready. Type to filter.`);
    else if (count === 0) announce('No results found.');
    else announce(`${count} result${count === 1 ? '' : 's'} found.`);
  }

  /** Opens a destination: a game, a section, a local page, or an external link. */
  function activate() {
    const entry = results[selected];
    if (!entry) return;
    const target = entry.target;
    closePalette();
    if (isGameTarget(target)) {
      const key = gameKey(target);
      const button = document.querySelector(`button[data-game="${key}"]`);
      if (button) button.click();
      else window.location.hash = '#arcade';
      return;
    }
    if (isExternalTarget(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    if (isSectionTarget(target)) {
      const anchor = document.querySelector(target);
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.location.hash = target;
      return;
    }
    window.location.href = target;
  }

  function openPalette() {
    if (dialog.open) return;
    if (anotherDialogIsOpen(dialog)) return;
    opener = document.activeElement;
    dialog.showModal();
    input.value = '';
    results = [];
    selected = 0;
    render();
    announce(`${SEARCH_INDEX.length} destinations ready. Type to filter.`);
    input.focus({ preventScroll: true });
  }

  function closePalette() {
    if (!dialog.open) return;
    dialog.close();
  }

  dialog.addEventListener('close', () => {
    const restore = opener && document.contains(opener) ? opener : null;
    opener = null;
    if (restore && typeof restore.focus === 'function') restore.focus({ preventScroll: true });
  });

  dialog.addEventListener('cancel', event => { event.preventDefault(); closePalette(); });
  close.addEventListener('click', () => closePalette());
  dialog.addEventListener('click', event => { if (event.target === dialog) closePalette(); });

  input.addEventListener('input', () => run(input.value));

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      selected = moveSelection(selected, event.key === 'ArrowDown' ? 1 : -1, results.length);
      syncSelection();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!results.length) return;
      selected = event.key === 'Home' ? 0 : results.length - 1;
      syncSelection();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      activate();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });

  // The shortcut is global, but never while the visitor is typing and never
  // while another modal owns the screen.
  document.addEventListener('keydown', event => {
    if (event.key !== 'k' && event.key !== 'K') return;
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.altKey || event.shiftKey) return;
    if (dialog.open) return;
    if (isTypingTarget(event.target)) return;
    if (anotherDialogIsOpen(dialog)) return;
    event.preventDefault();
    openPalette();
  });

  // The launcher button, so the palette is reachable on a phone.
  const launcher = root.querySelector('[data-command-palette-open]');
  if (launcher) {
    launcher.addEventListener('click', event => { event.preventDefault(); openPalette(); });
  }

  return { open: openPalette, close: closePalette };
}
