import { useCallback, useEffect, useRef, useState } from 'react';
import {
	normalizeDifficultyTier,
	rollQuestRewardCoins,
	rollQuestRewardCp,
	rollQuestRewardXp,
} from '../utils/questUtils';

interface UseAutoQuestRewardsOptions {
	defaultPriority?: string;
	defaultDifficulty?: string;
	initialXp?: number;
	initialCp?: number;
}

/**
 * Mirrors QuestModal reward rolling: initial random values on open, then re-roll XP when
 * priority changes and CP when difficulty changes. Skips the first sync per active session
 * so the opening roll is preserved (same lastRewardTierRef pattern as QuestModal.tsx).
 */
export function useAutoQuestRewards(
	active: boolean,
	priority: string,
	difficulty: string,
	options: UseAutoQuestRewardsOptions = {}
) {
	const defaultPriority = options.defaultPriority ?? 'Medium';
	const defaultDifficulty = options.defaultDifficulty ?? 'Medium';

	const [xp, setXp] = useState(
		options.initialXp ?? rollQuestRewardXp(defaultPriority)
	);
	const [cp, setCp] = useState(
		options.initialCp ?? rollQuestRewardCp(defaultDifficulty)
	);

	const lastRewardTierRef = useRef<{ priority: string; difficulty: string } | null>(null);

	useEffect(() => {
		if (!active) {
			lastRewardTierRef.current = null;
			return;
		}
		if (lastRewardTierRef.current === null) {
			lastRewardTierRef.current = {
				priority,
				difficulty: normalizeDifficultyTier(difficulty),
			};
			return;
		}
		const prev = lastRewardTierRef.current;
		const normalizedDifficulty = normalizeDifficultyTier(difficulty);
		if (prev.priority === priority && prev.difficulty === normalizedDifficulty) return;
		if (prev.priority !== priority) {
			setXp(rollQuestRewardXp(priority));
		}
		if (prev.difficulty !== normalizedDifficulty) {
			setCp(rollQuestRewardCp(difficulty));
		}
		lastRewardTierRef.current = { priority, difficulty: normalizedDifficulty };
	}, [active, priority, difficulty]);

	const resetRewards = useCallback(
		(nextPriority = defaultPriority, nextDifficulty = defaultDifficulty) => {
			setXp(rollQuestRewardXp(nextPriority));
			setCp(rollQuestRewardCp(nextDifficulty));
			lastRewardTierRef.current = null;
		},
		[defaultPriority, defaultDifficulty]
	);

	const coins = rollQuestRewardCoins(xp);

	return { xp, cp, coins, setXp, setCp, resetRewards };
}
