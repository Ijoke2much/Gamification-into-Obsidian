import type { Achievement } from '../../data/models/AchievementSystem';

export const ACHIEVEMENT_UNLOCKED_EVENT = 'gamification-achievement-unlocked';
export const ACHIEVEMENT_GALLERY_OPEN_EVENT = 'gamification-achievement-gallery-open';

export interface AchievementUnlockedDetail {
	achievement: Achievement;
}

export interface AchievementGalleryOpenDetail {
	achievementId?: string;
}

export function emitAchievementUnlocked(achievement: Achievement): void {
	window.dispatchEvent(
		new CustomEvent<AchievementUnlockedDetail>(ACHIEVEMENT_UNLOCKED_EVENT, {
			detail: { achievement },
		})
	);
}

export function openAchievementGallery(achievementId?: string): void {
	window.dispatchEvent(
		new CustomEvent<AchievementGalleryOpenDetail>(ACHIEVEMENT_GALLERY_OPEN_EVENT, {
			detail: { achievementId },
		})
	);
}

export function onAchievementUnlocked(
	handler: (achievement: Achievement) => void
): () => void {
	const listener = (event: Event) => {
		const detail = (event as CustomEvent<AchievementUnlockedDetail>).detail;
		if (detail?.achievement) handler(detail.achievement);
	};
	window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, listener);
	return () => window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, listener);
}

export function onAchievementGalleryOpen(
	handler: (achievementId?: string) => void
): () => void {
	const listener = (event: Event) => {
		const detail = (event as CustomEvent<AchievementGalleryOpenDetail>).detail;
		handler(detail?.achievementId);
	};
	window.addEventListener(ACHIEVEMENT_GALLERY_OPEN_EVENT, listener);
	return () => window.removeEventListener(ACHIEVEMENT_GALLERY_OPEN_EVENT, listener);
}
