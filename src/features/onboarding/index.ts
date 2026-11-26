// Onboarding System Exports
export { WelcomeWizard } from './components/WelcomeWizard';

// Types
export interface UserPreferences {
    experience: 'beginner' | 'intermediate' | 'advanced';
    interests: string[];
    goals: string[];
    timeAvailable: 'light' | 'moderate' | 'heavy';
    enableTutorials: boolean;
    mobileOptimized: boolean;
}
