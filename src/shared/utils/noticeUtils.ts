import { Notice } from 'obsidian';
import type { NotificationLevel } from '../../core/settings';

/** Class on the inner notice node; matches gamified-notices.css */
export const GAMIFIED_NOTICE_CLASS = 'gamification-pixel-notice';
export const GAMIFIED_SYSTEM_NOTICE_CLASS = 'gamification-system-notice';

function wrapNoticeMessage(message: string, className: string): DocumentFragment {
	const el = document.createElement('div');
	el.textContent = message;
	el.classList.add(className);
	el.style.whiteSpace = 'pre-wrap';

	const fragment = document.createDocumentFragment();
	fragment.appendChild(el);
	return fragment;
}

/**
 * Wrap plain text in the gamified notice container (pixel theme in CSS).
 */
export function wrapGamifiedNoticeMessage(message: string): DocumentFragment {
	return wrapNoticeMessage(message, GAMIFIED_NOTICE_CLASS);
}

export function wrapSystemNoticeMessage(message: string): DocumentFragment {
	return wrapNoticeMessage(message, GAMIFIED_SYSTEM_NOTICE_CLASS);
}

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

const QUIET_MAX_TIMEOUT = 4000;
const MINIMAL_MAX_TIMEOUT = 2500;
const DEDUPE_MS_QUIET = 3000;
const DEDUPE_MS_MINIMAL = 5000;

let notificationLevel: NotificationLevel = 'normal';
const recentNotices = new Map<string, number>();

export function setNotificationLevel(level: NotificationLevel): void {
	notificationLevel = level;
	if (level === 'normal') {
		recentNotices.clear();
	}
}

export function getNotificationLevel(): NotificationLevel {
	return notificationLevel;
}

function noticeKey(message: string | DocumentFragment): string {
	if (typeof message === 'string') {
		return message.trim().slice(0, 120);
	}
	return 'fragment';
}

function shouldSuppressNotice(message: string | DocumentFragment, priority: NoticePriority): boolean {
	if (priority === 'critical') {
		return false;
	}

	if (notificationLevel === 'minimal' && priority !== 'high') {
		return true;
	}

	const dedupeMs = notificationLevel === 'minimal' ? DEDUPE_MS_MINIMAL : DEDUPE_MS_QUIET;
	if (notificationLevel === 'normal') {
		return false;
	}

	const key = noticeKey(message);
	const now = Date.now();
	const lastShown = recentNotices.get(key);
	if (lastShown !== undefined && now - lastShown < dedupeMs) {
		return true;
	}

	recentNotices.set(key, now);
	return false;
}

function resolveTimeout(requested: number | undefined, isGameNotice: boolean): number | undefined {
	if (notificationLevel === 'quiet') {
		const cap = QUIET_MAX_TIMEOUT;
		if (requested === undefined) {
			return cap;
		}
		return Math.min(requested, cap);
	}

	if (notificationLevel === 'minimal') {
		const cap = MINIMAL_MAX_TIMEOUT;
		if (requested === undefined) {
			return cap;
		}
		return Math.min(requested, cap);
	}

	if (requested !== undefined) {
		return isGameNotice ? Math.max(requested, GAME_NOTICE_MIN_TIMEOUT) : requested;
	}

	return isGameNotice ? GAME_NOTICE_MIN_TIMEOUT : undefined;
}

export type NoticePriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Gamified Obsidian notice — pixel/RPG field styling (gamified-notices.css).
 */
export function pixelNotice(
	message: string | DocumentFragment,
	timeout?: number,
	priority: NoticePriority = 'normal'
): Notice | null {
	if (shouldSuppressNotice(message, priority)) {
		return null;
	}

	const content = typeof message === 'string' ? wrapGamifiedNoticeMessage(message) : message;
	const effectiveTimeout = resolveTimeout(timeout, false);
	return new Notice(content, effectiveTimeout);
}

/** Field / combat notices — pixel RPG shell. */
export function fieldNotice(
	message: string | DocumentFragment,
	timeout?: number,
	priority: NoticePriority = 'normal'
): Notice | null {
	return pixelNotice(message, timeout, priority);
}

/** System / growth notices — icy status screen styling. */
export function systemNotice(
	message: string | DocumentFragment,
	timeout?: number,
	priority: NoticePriority = 'normal'
): Notice | null {
	if (shouldSuppressNotice(message, priority)) {
		return null;
	}

	const content = typeof message === 'string' ? wrapSystemNoticeMessage(message) : message;
	const effectiveTimeout = resolveTimeout(timeout, false);
	return new Notice(content, effectiveTimeout);
}

/**
 * Show a long-lived game notice (minimum 1h timeout unless longer requested).
 * In quiet/minimal modes, timeouts are capped and duplicates are suppressed.
 */
export function showGameNotice(
	message: string | DocumentFragment,
	timeout?: number,
	priority: NoticePriority = 'normal'
): Notice | null {
	if (shouldSuppressNotice(message, priority)) {
		return null;
	}

	const effectiveTimeout = resolveTimeout(timeout, true);
	const content =
		typeof message === 'string' ? wrapGamifiedNoticeMessage(message) : message;

	return new Notice(content, effectiveTimeout);
}
