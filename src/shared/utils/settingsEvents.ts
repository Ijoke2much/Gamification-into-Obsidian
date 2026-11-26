type SettingsUpdatedListener = () => void;

const listeners = new Set<SettingsUpdatedListener>();

export function onSettingsUpdated(listener: SettingsUpdatedListener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function emitSettingsUpdated(): void {
	listeners.forEach((listener) => {
		try {
			listener();
		} catch (error) {
			console.error('[Gamification] settings listener failed:', error);
		}
	});
}
