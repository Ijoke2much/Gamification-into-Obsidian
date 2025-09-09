import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTutorialSystem } from '../hooks/useTutorialSystem';
import { TutorialOverlay } from './TutorialOverlay';
import type { TutorialContextValue } from '../types/TutorialTypes';

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
  autoStartWelcome?: boolean;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ 
  children, 
  autoStartWelcome = false 
}) => {
  const tutorialSystem = useTutorialSystem();

  // Auto-start welcome tutorial for new users
  useEffect(() => {
    if (autoStartWelcome) {
      const hasSeenWelcome = tutorialSystem.getTutorialProgress('welcome-tour');
      if (!hasSeenWelcome) {
        // Delay to ensure UI is ready
        setTimeout(() => {
          tutorialSystem.startTutorial('welcome-tour');
        }, 1000);
      }
    }
  }, [autoStartWelcome, tutorialSystem]);

  // Handle tutorial completion events
  useEffect(() => {
    const handleTutorialCompleted = (event: CustomEvent) => {
      const { tutorialId, badge, totalTime } = event.detail;
      
      // You can customize this to show notifications, unlock features, etc.
      console.log(`Tutorial completed: ${tutorialId}`, { badge, totalTime });
      
      // Example: Show a toast notification
      if (badge) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--interactive-accent);
          color: var(--text-on-accent);
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = `Achievement Unlocked: ${badge}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.animation = 'slideOut 0.3s ease-in forwards';
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 3000);
      }
    };

    document.addEventListener('tutorial-completed', handleTutorialCompleted as EventListener);
    
    return () => {
      document.removeEventListener('tutorial-completed', handleTutorialCompleted as EventListener);
    };
  }, []);

  const contextValue: TutorialContextValue = {
    state: tutorialSystem.state,
    startTutorial: tutorialSystem.startTutorial,
    nextStep: tutorialSystem.nextStep,
    prevStep: tutorialSystem.prevStep,
    skipTutorial: tutorialSystem.skipTutorial,
    completeTutorial: tutorialSystem.completeTutorial,
    closeTutorial: tutorialSystem.closeTutorial,
    restartTutorial: tutorialSystem.restartTutorial,
    pauseTutorial: tutorialSystem.pauseTutorial,
    resumeTutorial: tutorialSystem.resumeTutorial,
    updatePreferences: tutorialSystem.updatePreferences,
    getTutorialProgress: tutorialSystem.getTutorialProgress,
    isStepCompleted: tutorialSystem.isStepCompleted,
    getAvailableTutorials: tutorialSystem.getAvailableTutorials,
    getRecommendedTutorials: tutorialSystem.getRecommendedTutorials
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      
      {/* Render tutorial overlay */}
      {tutorialSystem.state.currentTutorial && (
        <TutorialOverlay
          step={tutorialSystem.state.currentTutorial.steps[tutorialSystem.state.currentStep]}
          currentStepIndex={tutorialSystem.state.currentStep}
          totalSteps={tutorialSystem.state.currentTutorial.steps.length}
          onNext={tutorialSystem.nextStep}
          onBack={tutorialSystem.prevStep}
          onSkip={tutorialSystem.skipTutorial}
          onClose={tutorialSystem.closeTutorial}
          isVisible={tutorialSystem.state.isVisible}
          tutorialTitle={tutorialSystem.state.currentTutorial.title}
        />
      )}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): TutorialContextValue => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Hook for tutorial-aware components
export const useTutorialTarget = (tutorialId: string, stepId: string) => {
  const { state } = useTutorial();
  
  const isActive = state.currentTutorial?.id === tutorialId && 
                   state.currentTutorial?.steps[state.currentStep]?.id === stepId;
  
  const isHighlighted = isActive && state.isVisible;
  
  return {
    isActive,
    isHighlighted,
    'data-tutorial-target': `${tutorialId}-${stepId}`
  };
};
