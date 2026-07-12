import React, { useCallback, useEffect, useState } from 'react';
import type { Achievement } from '../../../data/models/AchievementSystem';
import {
	onAchievementUnlocked,
	openAchievementGallery,
} from '../../../shared/utils/achievementGalleryEvents';
import AchievementNotification from './AchievementNotification';

/** Global host: shows unlock toast and offers jump to the trophy gallery. */
export const AchievementUnlockHost: React.FC = () => {
	const [queue, setQueue] = useState<Achievement[]>([]);
	const current = queue[0] ?? null;

	useEffect(() => onAchievementUnlocked((achievement) => {
		setQueue((prev) => [...prev, achievement]);
	}), []);

	const dismiss = useCallback(() => {
		setQueue((prev) => prev.slice(1));
	}, []);

	const viewGallery = useCallback(() => {
		if (current) openAchievementGallery(current.id);
		dismiss();
	}, [current, dismiss]);

	if (!current) return null;

	return (
		<AchievementNotification
			achievement={current}
			isVisible
			onClose={dismiss}
			onViewGallery={viewGallery}
		/>
	);
};
