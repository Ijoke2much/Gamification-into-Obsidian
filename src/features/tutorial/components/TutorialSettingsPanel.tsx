import React, { useState } from 'react';
import { useTutorialSystem } from '../hooks/useTutorialSystem';
import { TUTORIAL_DEFINITIONS } from '../data/tutorialDefinitions';
import type { Tutorial, TutorialCategory } from '../types/TutorialTypes';
import { useMobileOptimizations } from '../../../shared/hooks/useMobileOptimizations';
import styles from './TutorialSettingsPanel.module.css';

interface TutorialSettingsPanelProps {
  onClose?: () => void;
}

export const TutorialSettingsPanel: React.FC<TutorialSettingsPanelProps> = ({ onClose }) => {
  const { 
    state, 
    startTutorial, 
    updatePreferences, 
    getTutorialProgress,
    getAvailableTutorials,
    getRecommendedTutorials
  } = useTutorialSystem();
  
  const { isMobile } = useMobileOptimizations();
  const [selectedCategory, setSelectedCategory] = useState<TutorialCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories: { id: TutorialCategory | 'all'; name: string; icon: string; color: string }[] = [
    { id: 'all', name: 'All Tutorials', icon: '📚', color: '#6366f1' },
    { id: 'getting-started', name: 'Getting Started', icon: '🎮', color: '#10b981' },
    { id: 'quest-management', name: 'Quest Management', icon: '📋', color: '#f59e0b' },
    { id: 'boss-battles', name: 'Boss Battles', icon: '⚔️', color: '#ef4444' },
    { id: 'habits-pomodoro', name: 'Habits & Focus', icon: '🌱', color: '#8b5cf6' },
    { id: 'shop-inventory', name: 'Shop & Inventory', icon: '🛒', color: '#06b6d4' },
    { id: 'analytics-achievements', name: 'Analytics', icon: '📊', color: '#ec4899' },
    { id: 'mobile-specific', name: 'Mobile Features', icon: '📱', color: '#84cc16' },
    { id: 'advanced-features', name: 'Advanced', icon: '🔧', color: '#64748b' }
  ];

  const availableTutorials = getAvailableTutorials();
  const recommendedTutorials = getRecommendedTutorials();

  const filteredTutorials = availableTutorials.filter(tutorial => {
    const categoryMatch = selectedCategory === 'all' || tutorial.category === selectedCategory;
    const searchMatch = searchTerm === '' || 
      tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return categoryMatch && searchMatch;
  });

  const handleStartTutorial = (tutorialId: string) => {
    startTutorial(tutorialId);
    onClose && onClose();
  };

  const getTutorialStatusIcon = (tutorial: Tutorial) => {
    const progress = getTutorialProgress(tutorial.id);
    if (progress?.completed) return '✅';
    if (progress?.skipped) return '⏭️';
    if (progress && !progress.completed) return '🔄';
    return '🆕';
  };

  const getTutorialStatus = (tutorial: Tutorial) => {
    const progress = getTutorialProgress(tutorial.id);
    if (progress?.completed) return 'Completed';
    if (progress?.skipped) return 'Skipped';
    if (progress && !progress.completed) return `Step ${progress.currentStep + 1}/${tutorial.steps.length}`;
    return 'Not Started';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className={`${styles.panel} ${isMobile ? styles.mobile : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>🎓 Interactive Tutorials</h2>
          <p>Learn to master your gamified productivity experience</p>
        </div>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close tutorials">
            ✕
          </button>
        )}
      </div>

      {/* Preferences */}
      <div className={styles.preferences}>
        <h3>Tutorial Preferences</h3>
        <div className={styles.preferenceGrid}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={state.preferences.enableHighlights}
              onChange={(e) => updatePreferences({ enableHighlights: e.target.checked })}
            />
            <span>Enable Element Highlights</span>
          </label>
          
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={state.preferences.enableTooltips}
              onChange={(e) => updatePreferences({ enableTooltips: e.target.checked })}
            />
            <span>Show Tooltips</span>
          </label>
          
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={state.preferences.showProgressBar}
              onChange={(e) => updatePreferences({ showProgressBar: e.target.checked })}
            />
            <span>Show Progress Bar</span>
          </label>
          
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={state.preferences.reducedAnimations}
              onChange={(e) => updatePreferences({ reducedAnimations: e.target.checked })}
            />
            <span>Reduced Animations</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={state.preferences.mobileOptimized}
              onChange={(e) => updatePreferences({ mobileOptimized: e.target.checked })}
            />
            <span>Mobile Optimizations</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={state.preferences.pauseOnWindowBlur}
              onChange={(e) => updatePreferences({ pauseOnWindowBlur: e.target.checked })}
            />
            <span>Pause When Window Loses Focus</span>
          </label>
        </div>
      </div>

      {/* Recommended Tutorials */}
      {recommendedTutorials.length > 0 && (
        <div className={styles.section}>
          <h3>🌟 Recommended for You</h3>
          <div className={styles.recommendedGrid}>
            {recommendedTutorials.map(tutorial => (
              <div key={tutorial.id} className={styles.recommendedCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.statusIcon}>{getTutorialStatusIcon(tutorial)}</span>
                  <span className={styles.badge}>{tutorial.badge}</span>
                </div>
                <h4>{tutorial.title}</h4>
                <p>{tutorial.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.difficulty} style={{ color: getDifficultyColor(tutorial.difficulty) }}>
                    {tutorial.difficulty}
                  </span>
                  <span className={styles.time}>{tutorial.estimatedTime}m</span>
                  <button 
                    className={styles.startButton}
                    onClick={() => handleStartTutorial(tutorial.id)}
                  >
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className={styles.controls}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search tutorials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.categoryTabs}>
          {categories.map(category => (
            <button
              key={category.id}
              className={`${styles.categoryTab} ${selectedCategory === category.id ? styles.active : ''}`}
              style={selectedCategory === category.id ? { backgroundColor: category.color + '20', borderColor: category.color } : {}}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className={styles.categoryIcon}>{category.icon}</span>
              {!isMobile && <span>{category.name}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tutorial List */}
      <div className={styles.tutorialList}>
        {filteredTutorials.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <h4>No tutorials found</h4>
            <p>Try adjusting your search or category filter.</p>
          </div>
        ) : (
          filteredTutorials.map(tutorial => {
            const progress = getTutorialProgress(tutorial.id);
            const isCompleted = progress?.completed;
            const isSkipped = progress?.skipped;
            const isInProgress = progress && !progress.completed && !progress.skipped;

            return (
              <div 
                key={tutorial.id} 
                className={`${styles.tutorialCard} ${isCompleted ? styles.completed : ''} ${isSkipped ? styles.skipped : ''}`}
              >
                <div className={styles.tutorialInfo}>
                  <div className={styles.tutorialHeader}>
                    <div className={styles.tutorialTitle}>
                      <span className={styles.statusIcon}>{getTutorialStatusIcon(tutorial)}</span>
                      <h4>{tutorial.title}</h4>
                      {tutorial.badge && (
                        <span className={styles.badge}>{tutorial.badge}</span>
                      )}
                    </div>
                    <div className={styles.tutorialMeta}>
                      <span 
                        className={styles.difficulty}
                        style={{ color: getDifficultyColor(tutorial.difficulty) }}
                      >
                        {tutorial.difficulty}
                      </span>
                      <span className={styles.time}>{tutorial.estimatedTime}m</span>
                      <span className={styles.steps}>{tutorial.steps.length} steps</span>
                    </div>
                  </div>
                  
                  <p className={styles.tutorialDescription}>{tutorial.description}</p>
                  
                  <div className={styles.tutorialStatus}>
                    <span>Status: {getTutorialStatus(tutorial)}</span>
                    {isInProgress && (
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${((progress.currentStep + 1) / tutorial.steps.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
                    <div className={styles.prerequisites}>
                      <span>Prerequisites: </span>
                      {tutorial.prerequisites.map(prereqId => {
                        const prereq = TUTORIAL_DEFINITIONS.find(t => t.id === prereqId);
                        const prereqProgress = getTutorialProgress(prereqId);
                        return prereq ? (
                          <span 
                            key={prereqId} 
                            className={`${styles.prerequisite} ${prereqProgress?.completed ? styles.met : ''}`}
                          >
                            {prereq.title}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className={styles.tutorialActions}>
                  <button 
                    className={`${styles.actionButton} ${styles.startButton}`}
                    onClick={() => handleStartTutorial(tutorial.id)}
                    disabled={!tutorial.enabled}
                  >
                    {isInProgress ? 'Continue' : isCompleted ? 'Restart' : 'Start'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
