import { Notice } from 'obsidian';
import type { NotificationLevel } from '../../core/settings';
import { recordNotice, type NoticeLogKind, type NoticePriority } from './noticeLog';

export type { NoticePriority };

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

/** Obsidian: timeout 0 means the notice stays until the user clicks it. */
export const NOTICE_PERSIST_TIMEOUT = 0;

/** @deprecated Normal notices persist until click. Kept for existing imports. */
export const GAME_NOTICE_MIN_TIMEOUT = NOTICE_PERSIST_TIMEOUT;

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

function messageToText(message: string | DocumentFragment): string {
	if (typeof message === 'string') {
		return message;
	}
	return message.textContent ?? '';
}

function shouldSuppressNotice(message: string | DocumentFragment, priority: NoticePriority): boolean {
	if (priority === 'critical') {
		return false;
	}

	if (notificationLevel === 'minimal' && priority !== 'high') {
		return true;
	}

	if (notificationLevel === 'quiet' && priority === 'low') {
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

function resolveTimeout(requested: number | undefined): number | undefined {
	if (notificationLevel === 'quiet') {
		const value = requested === undefined || requested === 0 ? QUIET_MAX_TIMEOUT : requested;
		return Math.min(value, QUIET_MAX_TIMEOUT);
	}

	if (notificationLevel === 'minimal') {
		const value = requested === undefined || requested === 0 ? MINIMAL_MAX_TIMEOUT : requested;
		return Math.min(value, MINIMAL_MAX_TIMEOUT);
	}

	return NOTICE_PERSIST_TIMEOUT;
}

function showNotice(
	message: string | DocumentFragment,
	timeout: number | undefined,
	priority: NoticePriority,
	kind: NoticeLogKind,
	wrap: (text: string) => DocumentFragment
): Notice | null {
	recordNotice(messageToText(message), kind, priority);
	if (shouldSuppressNotice(message, priority)) {
		return null;
	}

	const content = typeof message === 'string' ? wrap(message) : message;
	return new Notice(content, resolveTimeout(timeout));
}

/**
 * Gamified Obsidian notice — pixel/RPG field styling (gamified-notices.css).
 * In Normal notification level, stays until clicked.
 */
export function pixelNotice(
	message: string | DocumentFragment,
	timeout?: number,
	priority: NoticePriority = 'normal'
): Notice | null {
	return showNotice(message, timeout, priority, 'field', wrapGamifiedNoticeMessage);
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
	return showNotice(message, timeout, priority, 'system', wrapSystemNoticeMessage);
}

/**
 * Game notice. In Normal mode, stays until clicked.
 * In quiet/minimal modes, timeouts are capped and duplicates are suppressed.
 */
export function showGameNotice(
	message: string | DocumentFragment,
	timeout?: number,
	priority: NoticePriority = 'normal'
): Notice | null {
	return showNotice(message, timeout, priority, 'game', wrapGamifiedNoticeMessage);
}
