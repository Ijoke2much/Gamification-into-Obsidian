import { Notice } from 'obsidian';

/**
 * Centralized helper for all game/plugin notices.
 *
 * Goal: make notices effectively "click to dismiss" by giving them a
 * very long duration so they don't disappear before the user can read them.
 *
 * Obsidian's Notice API doesn't support true infinite persistence, so we use
 * a large timeout (1 hour) and rely on the user clicking to dismiss.
 */
export const GAME_NOTICE_MIN_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms

/**
 * Show a long-lived game notice.
 *
 * - Keeps the same signature as `new Notice(message, timeout?)` so it can
 *   replace direct Notice usage easily.
 * - Ensures a minimum timeout of `GAME_NOTICE_MIN_TIMEOUT` even if callers
 *   request a shorter duration.
 */
export function showGameNotice(
  message: string | DocumentFragment,
  timeout?: number
): Notice {
  const effectiveTimeout =
    timeout !== undefined
      ? Math.max(timeout, GAME_NOTICE_MIN_TIMEOUT)
      : GAME_NOTICE_MIN_TIMEOUT;

  let content: string | DocumentFragment = message;

  // Wrap plain string messages in a fragment we control so CSS can always target it
  if (typeof message === 'string') {
    const el = document.createElement('div');
    el.textContent = message;
    el.classList.add('gamification-mc-notice');

    const fragment = document.createDocumentFragment();
    fragment.appendChild(el);
    content = fragment;
  }

  return new Notice(content, effectiveTimeout);
}


