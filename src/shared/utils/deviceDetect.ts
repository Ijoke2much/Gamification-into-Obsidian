import { Platform } from 'obsidian';

/**
 * Real mobile / tablet / Obsidian-mobile client detection (not viewport width).
 * Safe to call outside React (ceremony / reward pipelines / PlayerData).
 *
 * Important: modern iPadOS often reports as Macintosh in the UA. Detect that via
 * touch points + MacIntel platform, plus Obsidian body classes / Platform.isMobile.
 */
export function isLikelyMobileDevice(): boolean {
	try {
		if (Platform?.isMobile) return true;
	} catch {
		// Platform may be unavailable in rare non-Obsidian contexts
	}

	if (typeof document !== 'undefined') {
		const body = document.body;
		if (
			body?.classList.contains('is-mobile') ||
			body?.classList.contains('is-phone') ||
			body?.classList.contains('is-tablet') ||
			body?.classList.contains('is-ios') ||
			body?.classList.contains('is-android')
		) {
			return true;
		}
	}

	if (typeof navigator === 'undefined') return false;

	const userAgent = navigator.userAgent.toLowerCase();
	const isMobileUa =
		/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

	// iPadOS 13+ desktop UA: "Macintosh" + multi-touch
	const isIpadDesktopUa =
		navigator.platform === 'MacIntel' &&
		typeof navigator.maxTouchPoints === 'number' &&
		navigator.maxTouchPoints > 1;

	const w = window as Window & {
		Capacitor?: unknown;
		electron?: unknown;
	};
	const isCapacitorMobile = Boolean(w.Capacitor) && !w.electron;

	return isMobileUa || isIpadDesktopUa || isCapacitorMobile;
}

/** Tablet-like: Obsidian tablet class, or iPad desktop UA. */
export function isLikelyTabletDevice(): boolean {
	if (typeof document !== 'undefined' && document.body?.classList.contains('is-tablet')) {
		return true;
	}
	if (typeof navigator === 'undefined') return false;
	return (
		navigator.platform === 'MacIntel' &&
		typeof navigator.maxTouchPoints === 'number' &&
		navigator.maxTouchPoints > 1
	);
}
