import React, { useState, useEffect } from 'react';
import { useMobileOptimizations } from '../../../shared/hooks/useMobileOptimizations';
import { useTutorial } from '../../tutorial';
import styles from './WelcomeWizard.module.css';

interface WelcomeWizardProps {
  onComplete: (userPreferences: UserPreferences) => void;
  onSkip: () => void;
}

interface UserPreferences {
  experience: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  goals: string[];
  timeAvailable: 'light' | 'moderate' | 'heavy';
  enableTutorials: boolean;
  mobileOptimized: boolean;
}

const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    title: 'New to Gamification',
    description: 'I\'m just starting with productivity gamification',
    icon: '🌱',
    color: '#10b981'
  },
  {
    id: 'intermediate',
    title: 'Some Experience',
    description: 'I\'ve used productivity apps or basic gamification before',
    icon: '🌿',
    color: '#f59e0b'
  },
  {
    id: 'advanced',
    title: 'Experienced User',
    description: 'I\'m familiar with complex productivity and gaming systems',
    icon: '🌳',
    color: '#6366f1'
  }
];

const INTEREST_OPTIONS = [
  { id: 'task-management', label: 'Task Management', icon: '📋' },
  { id: 'habit-building', label: 'Habit Building', icon: '🌱' },
  { id: 'focus-sessions', label: 'Focus Sessions', icon: '🧘' },
  { id: 'achievements', label: 'Achievements', icon: '🏆' },
  { id: 'analytics', label: 'Progress Analytics', icon: '📊' },
  { id: 'boss-battles', label: 'Project Boss Battles', icon: '⚔️' }
];

const GOAL_OPTIONS = [
  { id: 'productivity', label: 'Increase Productivity', icon: '⚡' },
  { id: 'consistency', label: 'Build Consistency', icon: '🎯' },
  { id: 'motivation', label: 'Stay Motivated', icon: '🔥' },
  { id: 'organization', label: 'Get Organized', icon: '📁' },
  { id: 'habits', label: 'Form Good Habits', icon: '✅' },
  { id: 'focus', label: 'Improve Focus', icon: '🧠' }
];

const TIME_COMMITMENT = [
  {
    id: 'light',
    title: 'Light Usage',
    description: '15-30 minutes per day',
    icon: '🕐',
    color: '#10b981'
  },
  {
    id: 'moderate',
    title: 'Moderate Usage',
    description: '1-2 hours per day',
    icon: '🕕',
    color: '#f59e0b'
  },
  {
    id: 'heavy',
    title: 'Heavy Usage',
    description: '2+ hours per day',
    icon: '🕘',
    color: '#ef4444'
  }
];

export const WelcomeWizard: React.FC<WelcomeWizardProps> = ({ onComplete, onSkip }) => {
  const { isMobile } = useMobileOptimizations();
  const { startTutorial } = useTutorial();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    experience: 'beginner',
    interests: [],
    goals: [],
    timeAvailable: 'moderate',
    enableTutorials: true,
    mobileOptimized: isMobile
  });

  const totalSteps = 5;

  useEffect(() => {
    setPreferences(prev => ({ ...prev, mobileOptimized: isMobile }));
  }, [isMobile]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Start appropriate tutorial based on experience level
    if (preferences.enableTutorials) {
      if (preferences.experience === 'beginner') {
        setTimeout(() => startTutorial('welcome-tour'), 500);
      } else if (preferences.interests.includes('boss-battles')) {
        setTimeout(() => startTutorial('boss-battles'), 500);
      } else if (preferences.interests.includes('habit-building')) {
        setTimeout(() => startTutorial('habits-pomodoro'), 500);
      }
    }
    
    onComplete(preferences);
  };

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.stepContent}>
            <h2>Welcome to Gamified Obsidian! 🎮</h2>
            <p>Transform your productivity into an engaging RPG experience. Let's get you set up in just a few steps.</p>
            
            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>⚔️</span>
                <div>
                  <h4>Epic Boss Battles</h4>
                  <p>Turn large projects into exciting boss encounters</p>
                </div>
              </div>
              
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🌱</span>
                <div>
                  <h4>Growing Habit Trees</h4>
                  <p>Watch beautiful trees grow as you build habits</p>
                </div>
              </div>
              
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🏆</span>
                <div>
                  <h4>Achievement System</h4>
                  <p>Unlock badges and rewards for your progress</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className={styles.stepContent}>
            <h2>What's your experience level?</h2>
            <p>This helps us customize your experience and recommend the right features.</p>
            
            <div className={styles.optionGrid}>
              {EXPERIENCE_LEVELS.map(level => (
                <button
                  key={level.id}
                  className={`${styles.optionCard} ${preferences.experience === level.id ? styles.selected : ''}`}
                  style={preferences.experience === level.id ? { borderColor: level.color } : {}}
                  onClick={() => setPreferences(prev => ({ ...prev, experience: level.id as any }))}
                >
                  <span className={styles.optionIcon}>{level.icon}</span>
                  <h4>{level.title}</h4>
                  <p>{level.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <h2>What interests you most?</h2>
            <p>Select all features that sound appealing to you (you can change this later).</p>
            
            <div className={styles.checkboxGrid}>
              {INTEREST_OPTIONS.map(interest => (
                <label
                  key={interest.id}
                  className={`${styles.checkboxCard} ${preferences.interests.includes(interest.id) ? styles.checked : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.interests.includes(interest.id)}
                    onChange={() => toggleArrayItem(
                      preferences.interests, 
                      interest.id, 
                      (newInterests) => setPreferences(prev => ({ ...prev, interests: newInterests }))
                    )}
                  />
                  <span className={styles.checkboxIcon}>{interest.icon}</span>
                  <span>{interest.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <h2>What are your main goals?</h2>
            <p>Understanding your objectives helps us suggest the best features for you.</p>
            
            <div className={styles.checkboxGrid}>
              {GOAL_OPTIONS.map(goal => (
                <label
                  key={goal.id}
                  className={`${styles.checkboxCard} ${preferences.goals.includes(goal.id) ? styles.checked : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.goals.includes(goal.id)}
                    onChange={() => toggleArrayItem(
                      preferences.goals, 
                      goal.id, 
                      (newGoals) => setPreferences(prev => ({ ...prev, goals: newGoals }))
                    )}
                  />
                  <span className={styles.checkboxIcon}>{goal.icon}</span>
                  <span>{goal.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <h2>Final preferences</h2>
            <p>Choose your time commitment and tutorial settings.</p>
            
            <div className={styles.section}>
              <h3>How much time do you plan to spend?</h3>
              <div className={styles.optionGrid}>
                {TIME_COMMITMENT.map(time => (
                  <button
                    key={time.id}
                    className={`${styles.optionCard} ${styles.compact} ${preferences.timeAvailable === time.id ? styles.selected : ''}`}
                    style={preferences.timeAvailable === time.id ? { borderColor: time.color } : {}}
                    onClick={() => setPreferences(prev => ({ ...prev, timeAvailable: time.id as any }))}
                  >
                    <span className={styles.optionIcon}>{time.icon}</span>
                    <h4>{time.title}</h4>
                    <p>{time.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3>Tutorial Settings</h3>
              <div className={styles.toggleOptions}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={preferences.enableTutorials}
                    onChange={(e) => setPreferences(prev => ({ ...prev, enableTutorials: e.target.checked }))}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span>Enable interactive tutorials</span>
                </label>
                
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={preferences.mobileOptimized}
                    onChange={(e) => setPreferences(prev => ({ ...prev, mobileOptimized: e.target.checked }))}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span>Mobile optimizations</span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = ['Welcome', 'Experience', 'Interests', 'Goals', 'Preferences'];
    return titles[currentStep];
  };

  return (
    <div className={`${styles.wizard} ${isMobile ? styles.mobile : ''}`}>
      <div className={styles.backdrop} onClick={onSkip} />
      
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>{getStepTitle()}</h1>
          <button className={styles.skipButton} onClick={onSkip}>
            Skip Setup
          </button>
        </div>

        {/* Progress */}
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>

        {/* Content */}
        {renderStep()}

        {/* Actions */}
        <div className={styles.actions}>
          <button 
            className={styles.backButton}
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            ← Back
          </button>
          
          <button 
            className={styles.nextButton}
            onClick={handleNext}
          >
            {currentStep === totalSteps - 1 ? 'Get Started! 🎮' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};
