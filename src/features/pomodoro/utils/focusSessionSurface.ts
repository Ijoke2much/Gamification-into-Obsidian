export type FocusSessionSurface = 'idle' | 'arena' | 'kit';

export const FOCUS_SESSION_EVENT = 'gamify-focus-session';

export function emitFocusSessionLive(live: boolean): void {
	window.dispatchEvent(new CustomEvent(FOCUS_SESSION_EVENT, { detail: { live } }));
}
