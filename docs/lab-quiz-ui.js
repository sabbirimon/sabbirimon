/**
 * The quiz panel.
 *
 * A quiz exercise has no editor. The learner is asked one question, picks
 * one of four answers, and is told straight away whether the answer was
 * right. A wrong answer shows the right one and the reason, and can be
 * tried again — so a mistake teaches rather than blocks.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** The letters the four answers are marked with. */
export const QUIZ_LETTERS = ['A', 'B', 'C', 'D'];

/**
 * The text of the retry button.
 *
 * It is a button rather than a link because the wrong pick is never final:
 * the same question stays on screen and the answers come back.
 */
export const QUIZ_RETRY_LABEL = 'Try again';

/**
 * The state of the panel for one question.
 *
 * `chosen` is the index the learner picked, or null. `locked` is true once
 * an answer has been judged, which is what stops the options being clicked
 * twice.
 */
export function quizPanelState() {
  return { exercise: null, chosen: null, locked: false, correct: false };
}

/**
 * The letter for one option.
 *
 * The letters are A, B, C and D, in order. An index outside that range
 * gets a question mark rather than an empty badge.
 */
export function letterFor(index) {
  return QUIZ_LETTERS[index] ?? '?';
}

/**
 * The verdict text for an answer.
 *
 * A right answer says what was right. A wrong answer names the right one
 * and gives the reason, because a knowledge check that only says "no"
 * teaches nothing.
 */
export function quizVerdict(exercise, chosen) {
  const correct = exercise?.options?.[exercise?.answer];
  if (!Number.isInteger(chosen) || chosen < 0) {
    return { ok: false, tone: 'idle', text: 'Pick an answer to see if it is right.' };
  }
  if (chosen === exercise?.answer) {
    return { ok: true, tone: 'right', text: `Right — ${correct} is correct.` };
  }
  return {
    ok: false,
    tone: 'wrong',
    text: `Not quite — the answer is ${correct}. ${exercise?.explanation || ''}`.trim()
  };
}

/**
 * The quiz panel.
 *
 * `render(exercise)` draws the question and its four answers and waits for
 * a pick. `judge()` is called by the lab once the checker has run, so the
 * panel and the lab always agree about what happened. `reset()` puts the
 * question back the way it was, which is what the retry button does.
 */
export function initLabQuiz(root = document) {
  const panel = root?.querySelector?.('[data-lab-quiz]');
  if (!panel) return null;
  const questionBox = root.querySelector('[data-lab-quiz-question]');
  const optionsBox = root.querySelector('[data-lab-quiz-options]');
  const verdictBox = root.querySelector('[data-lab-quiz-verdict]');
  const retryButton = root.querySelector('[data-lab-quiz-retry]');
  const progressBox = root.querySelector('[data-lab-quiz-progress]');

  const state = quizPanelState();

  /**
   * The choice the learner made.
   *
   * It is read back by the lab when the answer is checked, so the two
   * halves of the panel never drift apart.
   */
  function chosen() {
    return state.chosen;
  }

  function setVerdict(verdict) {
    if (!verdictBox) return;
    verdictBox.textContent = verdict?.text || '';
    verdictBox.dataset.tone = verdict?.tone || 'idle';
  }

  /**
   * Draw the four answers.
   *
   * Each one is a button marked as a radio, so the group is read out as
   * four choices and the arrow keys work the way they do anywhere else.
   */
  function drawOptions(exercise) {
    if (!optionsBox) return;
    optionsBox.textContent = '';
    const options = exercise?.options || [];
    for (let index = 0; index < options.length; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lab-quiz-option';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.dataset.labQuizOption = String(index);
      const letter = document.createElement('span');
      letter.className = 'lab-quiz-letter';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = letterFor(index);
      const text = document.createElement('span');
      text.className = 'lab-quiz-option-text';
      text.textContent = options[index];
      button.append(letter, text);
      optionsBox.append(button);
    }
  }

  /**
   * Mark the options after an answer has been judged.
   *
   * The wrong pick is shown in red and the right one in green, so the
   * learner sees both without having to read the verdict.
   */
  function markOptions(exercise) {
    if (!optionsBox) return;
    const buttons = [...optionsBox.querySelectorAll('[data-lab-quiz-option]')];
    for (const button of buttons) {
      const index = Number(button.dataset.labQuizOption);
      button.classList.remove('lab-quiz-option-correct', 'lab-quiz-option-wrong');
      button.setAttribute('aria-checked', index === state.chosen ? 'true' : 'false');
      if (index === exercise?.answer) button.classList.add('lab-quiz-option-correct');
      else if (index === state.chosen) button.classList.add('lab-quiz-option-wrong');
    }
  }

  /**
   * Draw a question and wait for a pick.
   *
   * The position is where the question sits in the whole course, and the
   * total is how many questions there are. Both are optional, so the panel
   * can be used on its own.
   */
  function render(exercise, position, total) {
    state.exercise = exercise || null;
    state.chosen = null;
    state.locked = false;
    state.correct = false;
    panel.hidden = false;
    panel.dataset.labQuizState = 'open';
    if (questionBox) questionBox.textContent = exercise?.question || '';
    if (progressBox) {
      progressBox.textContent = position ? `Question ${position}${total ? ` of ${total}` : ''}` : '';
      progressBox.hidden = !position;
    }
    setVerdict({ tone: 'idle', text: 'Pick an answer to see if it is right.' });
    drawOptions(exercise);
    if (retryButton) retryButton.hidden = true;
    // The question heading takes the focus, so the learner is told which
    // question arrived without having to hunt for it.
    questionBox?.focus?.();
    return state;
  }

  /**
   * Judge the chosen answer and show the result.
   *
   * The lab calls this after its own checker has run, so the panel shows
   * the same verdict the terminal prints.
   */
  function judge(result) {
    const exercise = state.exercise;
    state.locked = true;
    state.correct = result?.ok === true;
    markOptions(exercise);
    const verdict = quizVerdict(exercise, state.chosen);
    setVerdict(result?.message ? { ...verdict, text: result.message } : verdict);
    panel.dataset.labQuizState = state.correct ? 'right' : 'wrong';
    // A wrong answer is not final. The retry button puts the question
    // back the way it was.
    if (retryButton) retryButton.hidden = state.correct;
    // The focus moves to the verdict, so a screen reader reads out what
    // happened without the learner having to hunt for it. The verdict is
    // a live region, so it is announced when it changes.
    verdictBox?.focus?.();
    return verdict;
  }

  /**
   * Put the question back the way it was, so it can be tried again.
   */
  function reset() {
    state.chosen = null;
    state.locked = false;
    state.correct = false;
    panel.dataset.labQuizState = 'open';
    if (optionsBox) {
      for (const button of optionsBox.querySelectorAll('[data-lab-quiz-option]')) {
        button.classList.remove('lab-quiz-option-correct', 'lab-quiz-option-wrong');
        button.setAttribute('aria-checked', 'false');
      }
    }
    setVerdict({ tone: 'idle', text: 'Pick an answer to see if it is right.' });
    if (retryButton) retryButton.hidden = true;
    return state;
  }

  /**
   * Hide the panel, for the code exercises that replace it.
   */
  function hide() {
    panel.hidden = true;
    panel.removeAttribute('data-lab-quiz-state');
    state.exercise = null;
    state.chosen = null;
    state.locked = false;
    state.correct = false;
    return state;
  }

  /* -- events ----------------------------------------------------- */

  const onOptionClick = event => {
    const button = event.target?.closest?.('[data-lab-quiz-option]');
    if (!button || state.locked) return;
    const index = Number(button.dataset.labQuizOption);
    if (!Number.isInteger(index)) return;
    state.chosen = index;
    // The option is marked as picked straight away, and the lab is asked to
    // check it through the callback it was given.
    for (const other of optionsBox?.querySelectorAll?.('[data-lab-quiz-option]') || []) {
      other.setAttribute('aria-checked', other === button ? 'true' : 'false');
    }
    state.onPick?.(index);
  };

  const onRetry = () => {
    reset();
    state.onRetry?.();
  };

  /**
   * Move between the answers with the arrow keys.
   *
   * A radio group is meant to behave like one, so the arrow keys walk
   * through the answers. The walk stops at the ends rather than wrapping,
   * which is what a radio group does elsewhere too.
   */
  const onOptionKey = event => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
    if (!keys.includes(event.key)) return;
    const button = event.target?.closest?.('[data-lab-quiz-option]');
    if (!button || state.locked) return;
    event.preventDefault();
    const buttons = [...(optionsBox?.querySelectorAll?.('[data-lab-quiz-option]') || [])];
    const index = buttons.indexOf(button);
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const next = buttons[index + step];
    if (!next) return;
    next.focus();
  };

  optionsBox?.addEventListener?.('click', onOptionClick);
  optionsBox?.addEventListener?.('keydown', onOptionKey);
  retryButton?.addEventListener?.('click', onRetry);

  return {
    state,
    render,
    judge,
    reset,
    hide,
    chosen,
    /** The lab sets this so a pick is checked the moment it is made. */
    onPick(callback) {
      state.onPick = callback;
      return state;
    },
    onRetry(callback) {
      state.onRetry = callback;
      return state;
    },
    destroy() {
      optionsBox?.removeEventListener?.('click', onOptionClick);
      optionsBox?.removeEventListener?.('keydown', onOptionKey);
      retryButton?.removeEventListener?.('click', onRetry);
    }
  };
}
