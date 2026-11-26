import { useCallback, useEffect, useState } from 'react';
import {
	abandonJourneyRun,
	dismissCompletedJourneyRun,
	dismissFailedJourneyRun,
	JOURNEY_UPDATED_EVENT,
	loadJourneyState,
	startJourneyRun,
	type JourneyPersistedState,
} from '../utils/journeyRunService';

export function useJourneyRun() {
	const [state, setState] = useState<JourneyPersistedState>(() => loadJourneyState());

	const refresh = useCallback(() => {
		setState(loadJourneyState());
	}, []);

	useEffect(() => {
		const onUpdate = () => refresh();
		window.addEventListener(JOURNEY_UPDATED_EVENT, onUpdate);
		return () => window.removeEventListener(JOURNEY_UPDATED_EVENT, onUpdate);
	}, [refresh]);

	const startRun = useCallback((foeId: string) => {
		const result = startJourneyRun(foeId);
		if (result.ok) refresh();
		return result;
	}, [refresh]);

	const leaveRun = useCallback(() => {
		abandonJourneyRun();
		refresh();
	}, [refresh]);

	const dismissVictory = useCallback((foeCount?: number) => {
		const result = dismissCompletedJourneyRun(foeCount);
		refresh();
		return result;
	}, [refresh]);

	const dismissFailed = useCallback(() => {
		dismissFailedJourneyRun();
		refresh();
	}, [refresh]);

	return {
		state,
		activeRun: state.activeRun,
		clearedFoeIds: state.clearedFoeIds,
		board: state.board,
		startRun,
		leaveRun,
		dismissVictory,
		dismissFailed,
		refresh,
	};
}
