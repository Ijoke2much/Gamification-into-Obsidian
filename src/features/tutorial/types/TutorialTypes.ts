export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    target?: string; // CSS selector for element to highlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: TutorialAction;
    validation?: () => boolean; // Check if step is completed
    skippable?: boolean;
    autoNext?: boolean; // Auto-advance after validation
    delay?: number; // Delay before showing step (ms)
    highlightPadding?: number; // Padding around highlighted element
    showSkip?: boolean;
    showBack?: boolean;
    showNext?: boolean;
    customContent?: React.ReactNode;
}

export interface TutorialAction {
    type: 'click' | 'input' | 'navigate' | 'wait' | 'custom';
    target?: string;
    value?: string;
    callback?: () => void;
}

export interface Tutorial {
    id: string;
    title: string;
    description: string;
    category: TutorialCategory;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number; // in minutes
    prerequisites?: string[]; // Other tutorial IDs
    steps: TutorialStep[];
    onComplete?: () => void;
    onSkip?: () => void;
    enabled: boolean;
    badge?: string; // Achievement badge for completion
}

export type TutorialCategory =
    | 'getting-started'
    | 'player-progression'
    | 'quest-management'
    | 'boss-battles'
    | 'habits-pomodoro'
    | 'shop-inventory'
    | 'analytics-achievements'
    | 'advanced-features'
    | 'mobile-specific';

export interface TutorialProgress {
    tutorialId: string;
    currentStep: number;
    completed: boolean;
    skipped: boolean;
    startedAt: Date;
    completedAt?: Date;
    totalTime?: number; // in seconds
}

export interface TutorialState {
    isActive: boolean;
    currentTutorial: Tutorial | null;
    currentStep: number;
    isVisible: boolean;
    highlightedElement: HTMLElement | null;
    overlay: HTMLElement | null;
    progress: Record<string, TutorialProgress>;
    preferences: TutorialPreferences;
}

export interface TutorialPreferences {
    enableTooltips: boolean;
    enableHighlights: boolean;
    autoPlay: boolean;
    reducedAnimations: boolean;
    mobileOptimized: boolean;
    showProgressBar: boolean;
    enableSounds: boolean;
    pauseOnWindowBlur: boolean;
}

export interface TutorialSettings {
    enabled: boolean;
    showWelcomeTutorial: boolean;
    autoStartTutorials: boolean;
    showTutorialBadges: boolean;
    mobileOptimizations: boolean;
    preferences: TutorialPreferences;
}

// Event types for tutorial system
export type TutorialEvent =
    | { type: 'start'; tutorialId: string }
    | { type: 'next' }
    | { type: 'back' }
    | { type: 'skip' }
    | { type: 'complete' }
    | { type: 'restart' }
    | { type: 'pause' }
    | { type: 'resume' }
    | { type: 'close' };

export interface TutorialContextValue {
    state: TutorialState;
    startTutorial: (tutorialId: string) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    completeTutorial: () => void;
    closeTutorial: () => void;
    restartTutorial: () => void;
    pauseTutorial: () => void;
    resumeTutorial: () => void;
    updatePreferences: (preferences: Partial<TutorialPreferences>) => void;
    getTutorialProgress: (tutorialId: string) => TutorialProgress | null;
    isStepCompleted: (tutorialId: string, stepIndex: number) => boolean;
    getAvailableTutorials: () => Tutorial[];
    getRecommendedTutorials: () => Tutorial[];
}
