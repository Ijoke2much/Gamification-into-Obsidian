import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    Tutorial,
    TutorialState,
    TutorialProgress,
    TutorialPreferences,
    TutorialEvent
} from '../types/TutorialTypes';
import { TUTORIAL_DEFINITIONS } from '../data/tutorialDefinitions';

const STORAGE_KEY = 'gamified-tutorial-system';

const DEFAULT_PREFERENCES: TutorialPreferences = {
    enableTooltips: true,
    enableHighlights: true,
    autoPlay: false,
    reducedAnimations: false,
    mobileOptimized: true,
    showProgressBar: true,
    enableSounds: false,
    pauseOnWindowBlur: true
};

const DEFAULT_STATE: TutorialState = {
    isActive: false,
    currentTutorial: null,
    currentStep: 0,
    isVisible: false,
    highlightedElement: null,
    overlay: null,
    progress: {},
    preferences: DEFAULT_PREFERENCES
};

export const useTutorialSystem = () => {
    const [state, setState] = useState<TutorialState>(DEFAULT_STATE);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const startTimeRef = useRef<Date | undefined>(undefined);

    // Load tutorial state from localStorage
    useEffect(() => {
        const loadStoredState = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsedState = JSON.parse(stored);
                    setState(prev => ({
                        ...prev,
                        progress: parsedState.progress || {},
                        preferences: { ...DEFAULT_PREFERENCES, ...parsedState.preferences }
                    }));
                }
            } catch (error) {
                console.warn('[Tutorial] Failed to load stored state:', error);
            }
        };

        loadStoredState();
    }, []);

    // Save tutorial state to localStorage
    const saveState = useCallback((newState: Partial<TutorialState>) => {
        try {
            const toSave = {
                progress: newState.progress || state.progress,
                preferences: newState.preferences || state.preferences
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (error) {
            console.warn('[Tutorial] Failed to save state:', error);
        }
    }, [state.progress, state.preferences]);

    // Start a tutorial
    const startTutorial = useCallback((tutorialId: string) => {
        const tutorial = TUTORIAL_DEFINITIONS.find(t => t.id === tutorialId);
        if (!tutorial) {
            console.warn(`[Tutorial] Tutorial not found: ${tutorialId}`);
            return;
        }

        // Check prerequisites
        if (tutorial.prerequisites) {
            const unmetPrereqs = tutorial.prerequisites.filter(prereqId => {
                const progress = state.progress[prereqId];
                return !progress || !progress.completed;
            });

            if (unmetPrereqs.length > 0) {
                console.warn(`[Tutorial] Prerequisites not met for ${tutorialId}:`, unmetPrereqs);
                return;
            }
        }

        startTimeRef.current = new Date();

        const newProgress: TutorialProgress = {
            tutorialId,
            currentStep: 0,
            completed: false,
            skipped: false,
            startedAt: startTimeRef.current
        };

        setState(prev => ({
            ...prev,
            isActive: true,
            currentTutorial: tutorial,
            currentStep: 0,
            isVisible: true,
            progress: {
                ...prev.progress,
                [tutorialId]: newProgress
            }
        }));

        // Execute step delay if specified
        const firstStep = tutorial.steps[0];
        if (firstStep?.delay) {
            setState(prev => ({ ...prev, isVisible: false }));
            timeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, isVisible: true }));
            }, firstStep.delay);
        }

        tutorial.onComplete && tutorial.onComplete();
    }, [state.progress]);

    // Navigate to next step
    const nextStep = useCallback(() => {
        if (!state.currentTutorial || state.currentStep >= state.currentTutorial.steps.length - 1) {
            completeTutorial();
            return;
        }

        const nextStepIndex = state.currentStep + 1;
        const nextStepData = state.currentTutorial.steps[nextStepIndex];

        setState(prev => ({
            ...prev,
            currentStep: nextStepIndex,
            progress: {
                ...prev.progress,
                [prev.currentTutorial!.id]: {
                    ...prev.progress[prev.currentTutorial!.id],
                    currentStep: nextStepIndex
                }
            }
        }));

        // Execute step action if specified
        if (nextStepData?.action) {
            executeStepAction(nextStepData.action);
        }

        // Handle step delay
        if (nextStepData?.delay) {
            setState(prev => ({ ...prev, isVisible: false }));
            timeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, isVisible: true }));
            }, nextStepData.delay);
        }

        saveState({ progress: state.progress });
    }, [state.currentTutorial, state.currentStep, state.progress, saveState]);

    // Navigate to previous step
    const prevStep = useCallback(() => {
        if (!state.currentTutorial || state.currentStep <= 0) return;

        const prevStepIndex = state.currentStep - 1;

        setState(prev => ({
            ...prev,
            currentStep: prevStepIndex,
            progress: {
                ...prev.progress,
                [prev.currentTutorial!.id]: {
                    ...prev.progress[prev.currentTutorial!.id],
                    currentStep: prevStepIndex
                }
            }
        }));

        saveState({ progress: state.progress });
    }, [state.currentTutorial, state.currentStep, state.progress, saveState]);

    // Skip current tutorial
    const skipTutorial = useCallback(() => {
        if (!state.currentTutorial) return;

        const endTime = new Date();
        const totalTime = startTimeRef.current
            ? Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)
            : 0;

        const updatedProgress = {
            ...state.progress,
            [state.currentTutorial.id]: {
                ...state.progress[state.currentTutorial.id],
                skipped: true,
                completedAt: endTime,
                totalTime
            }
        };

        setState(prev => ({
            ...prev,
            isActive: false,
            currentTutorial: null,
            currentStep: 0,
            isVisible: false,
            highlightedElement: null,
            progress: updatedProgress
        }));

        state.currentTutorial.onSkip && state.currentTutorial.onSkip();
        saveState({ progress: updatedProgress });
    }, [state.currentTutorial, state.progress, saveState]);

    // Complete current tutorial
    const completeTutorial = useCallback(() => {
        if (!state.currentTutorial) return;

        const endTime = new Date();
        const totalTime = startTimeRef.current
            ? Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)
            : 0;

        const updatedProgress = {
            ...state.progress,
            [state.currentTutorial.id]: {
                ...state.progress[state.currentTutorial.id],
                completed: true,
                completedAt: endTime,
                totalTime
            }
        };

        setState(prev => ({
            ...prev,
            isActive: false,
            currentTutorial: null,
            currentStep: 0,
            isVisible: false,
            highlightedElement: null,
            progress: updatedProgress
        }));

        state.currentTutorial.onComplete && state.currentTutorial.onComplete();
        saveState({ progress: updatedProgress });

        // Show completion notification
        const completionEvent = new CustomEvent('tutorial-completed', {
            detail: {
                tutorialId: state.currentTutorial.id,
                badge: state.currentTutorial.badge,
                totalTime
            }
        });
        document.dispatchEvent(completionEvent);
    }, [state.currentTutorial, state.progress, saveState]);

    // Close tutorial without completion
    const closeTutorial = useCallback(() => {
        setState(prev => ({
            ...prev,
            isActive: false,
            currentTutorial: null,
            currentStep: 0,
            isVisible: false,
            highlightedElement: null
        }));

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    // Restart current tutorial
    const restartTutorial = useCallback(() => {
        if (!state.currentTutorial) return;

        closeTutorial();
        setTimeout(() => {
            startTutorial(state.currentTutorial!.id);
        }, 100);
    }, [state.currentTutorial, closeTutorial, startTutorial]);

    // Pause tutorial
    const pauseTutorial = useCallback(() => {
        setState(prev => ({ ...prev, isVisible: false }));
    }, []);

    // Resume tutorial
    const resumeTutorial = useCallback(() => {
        setState(prev => ({ ...prev, isVisible: true }));
    }, []);

    // Update preferences
    const updatePreferences = useCallback((newPreferences: Partial<TutorialPreferences>) => {
        const updatedPreferences = { ...state.preferences, ...newPreferences };
        setState(prev => ({ ...prev, preferences: updatedPreferences }));
        saveState({ preferences: updatedPreferences });
    }, [state.preferences, saveState]);

    // Execute step action
    const executeStepAction = useCallback((action: any) => {
        switch (action.type) {
            case 'click':
                if (action.target) {
                    const element = document.querySelector(action.target) as HTMLElement;
                    if (element) {
                        element.click();
                    }
                }
                break;
            case 'navigate':
                if (action.value) {
                    // Handle navigation if routing system is available
                    window.history.pushState({}, '', action.value);
                }
                break;
            case 'custom':
                if (action.callback) {
                    action.callback();
                }
                break;
        }
    }, []);

    // Get tutorial progress
    const getTutorialProgress = useCallback((tutorialId: string): TutorialProgress | null => {
        return state.progress[tutorialId] || null;
    }, [state.progress]);

    // Check if step is completed
    const isStepCompleted = useCallback((tutorialId: string, stepIndex: number): boolean => {
        const progress = state.progress[tutorialId];
        return progress ? progress.currentStep > stepIndex : false;
    }, [state.progress]);

    // Get available tutorials
    const getAvailableTutorials = useCallback((): Tutorial[] => {
        return TUTORIAL_DEFINITIONS.filter(tutorial => {
            if (!tutorial.enabled) return false;

            // Check prerequisites
            if (tutorial.prerequisites) {
                return tutorial.prerequisites.every(prereqId => {
                    const progress = state.progress[prereqId];
                    return progress && progress.completed;
                });
            }

            return true;
        });
    }, [state.progress]);

    // Get recommended tutorials
    const getRecommendedTutorials = useCallback((): Tutorial[] => {
        const available = getAvailableTutorials();
        const incomplete = available.filter(tutorial => {
            const progress = state.progress[tutorial.id];
            return !progress || (!progress.completed && !progress.skipped);
        });

        // Prioritize beginner tutorials
        return incomplete.sort((a, b) => {
            const aDifficulty = a.difficulty === 'beginner' ? 0 : a.difficulty === 'intermediate' ? 1 : 2;
            const bDifficulty = b.difficulty === 'beginner' ? 0 : b.difficulty === 'intermediate' ? 1 : 2;
            return aDifficulty - bDifficulty;
        }).slice(0, 3);
    }, [getAvailableTutorials, state.progress]);

    // Handle window blur/focus for pause functionality
    useEffect(() => {
        if (!state.preferences.pauseOnWindowBlur) return;

        const handleBlur = () => {
            if (state.isActive && state.isVisible) {
                pauseTutorial();
            }
        };

        const handleFocus = () => {
            if (state.isActive && !state.isVisible) {
                resumeTutorial();
            }
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [state.isActive, state.isVisible, state.preferences.pauseOnWindowBlur, pauseTutorial, resumeTutorial]);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        state,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        closeTutorial,
        restartTutorial,
        pauseTutorial,
        resumeTutorial,
        updatePreferences,
        getTutorialProgress,
        isStepCompleted,
        getAvailableTutorials,
        getRecommendedTutorials
    };
};
