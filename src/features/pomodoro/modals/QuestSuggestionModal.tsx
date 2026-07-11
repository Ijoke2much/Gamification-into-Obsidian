// Quest Suggestion Modal for Pomodoro Integration
// Provides intelligent quest recommendations based on session type and context

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { App } from 'obsidian';
import { QuestSuggestionService, QuestSuggestionContext } from '../services/questSuggestionService';
import { QuestSuggestion } from '../types/EnhancedTaskLinking';
import styles from './QuestSuggestionModal.module.css';

interface QuestSuggestionModalProps {
  app: App;
  isOpen: boolean;
  onClose: () => void;
  onSelectQuest: (quest: QuestSuggestion) => void;
  sessionType: 'classic' | 'extended' | 'short' | 'custom' | 'deepWork' | 'quickFocus';
  availableTime: number;
}

export const QuestSuggestionModal: React.FC<QuestSuggestionModalProps> = ({
  app,
  isOpen,
  onClose,
  onSelectQuest,
  sessionType,
  availableTime
}) => {
  const [suggestions, setSuggestions] = useState<QuestSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'quick' | 'deep' | 'urgent'>('all');
  const [questService] = useState(() => new QuestSuggestionService(app));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, sessionType, selectedFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const context: QuestSuggestionContext = {
        sessionType,
        availableTime,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        userPreferences: {
          preferredDifficulty: 'medium',
          skillFocus: [],
          projectFocus: []
        },
        recentQuests: [],
        currentStreak: 0
      };

      let newSuggestions: QuestSuggestion[] = [];

      switch (selectedFilter) {
        case 'quick':
          newSuggestions = await questService.getQuickFocusSuggestions();
          break;
        case 'deep':
          newSuggestions = await questService.getDeepWorkSuggestions();
          break;
        case 'urgent':
          // Filter for urgent/high priority quests
          const allSuggestions = await questService.getQuestSuggestions(context);
          newSuggestions = allSuggestions.filter(s => 
            s.quest.priority === 'urgent' || s.quest.priority === 'high'
          );
          break;
        default:
          newSuggestions = await questService.getQuestSuggestions(context);
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error loading quest suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const getSessionTypeInfo = () => {
    const sessionInfo = {
      'classic': { name: 'Classic Pomodoro', icon: '🍅', duration: '25 min' },
      'extended': { name: 'Extended Session', icon: '⏰', duration: '45 min' },
      'short': { name: 'Short Focus', icon: '⚡', duration: '15 min' },
      'custom': { name: 'Custom Session', icon: '⚙️', duration: `${availableTime} min` },
      'deepWork': { name: 'Deep Work', icon: '🧠', duration: '90 min' },
      'quickFocus': { name: 'Quick Focus', icon: '🎯', duration: '10 min' }
    };
    return sessionInfo[sessionType] || sessionInfo['classic'];
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      case 'epic': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  if (!isOpen) return null;

  const sessionInfo = getSessionTypeInfo();

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.sessionInfo}>
              <span className={styles.sessionIcon}>{sessionInfo.icon}</span>
              <div className={styles.sessionDetails}>
                <h2 className={styles.modalTitle}>Quest Suggestions</h2>
                <p className={styles.sessionDescription}>
                  Perfect quests for your {sessionInfo.name} session ({sessionInfo.duration})
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.modalContent}>
          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterTab} ${selectedFilter === 'all' ? styles.active : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              All Quests
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${selectedFilter === 'quick' ? styles.active : ''}`}
              onClick={() => setSelectedFilter('quick')}
            >
              ⚡ Quick Focus
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${selectedFilter === 'deep' ? styles.active : ''}`}
              onClick={() => setSelectedFilter('deep')}
            >
              🧠 Deep Work
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${selectedFilter === 'urgent' ? styles.active : ''}`}
              onClick={() => setSelectedFilter('urgent')}
            >
              🚨 Urgent
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}></div>
              <p>Finding perfect quests for your session...</p>
            </div>
          )}

          {/* Suggestions List */}
          {!loading && suggestions.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <h3>No quests found</h3>
              <p>Try adjusting your filters or create some quests with the #gamified-task tag.</p>
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.quest.id}-${index}`}
                  className={styles.suggestionCard}
                  onClick={() => {
                    onSelectQuest(suggestion);
                    onClose();
                  }}
                >
                  <div className={styles.suggestionHeader}>
                    <div className={styles.questTitle}>{suggestion.quest.title}</div>
                    <div className={styles.relevanceScore}>
                      {Math.round(suggestion.relevanceScore * 100)}% match
                    </div>
                  </div>

                  <div className={styles.suggestionMeta}>
                    <div className={styles.questTags}>
                      <span 
                        className={styles.difficultyTag}
                        style={{ backgroundColor: getDifficultyColor(suggestion.quest.difficulty) }}
                      >
                        {suggestion.quest.difficulty}
                      </span>
                      <span className={styles.priorityTag}>
                        {getPriorityIcon(suggestion.quest.priority)} {suggestion.quest.priority}
                      </span>
                      <span className={styles.timeTag}>
                        ⏱️ {suggestion.quest.estimatedDuration} min
                      </span>
                    </div>
                  </div>

                  <div className={styles.suggestionRewards}>
                    <span className={styles.rewardItem}>
                      ⭐ {suggestion.quest.rewards.baseXP} XP
                    </span>
                    <span className={styles.rewardItem}>
                      ✨ {suggestion.quest.rewards.baseCoins} coins
                    </span>
                    {suggestion.quest.rewards.cp && (
                      <span className={styles.rewardItem}>
                        🪙 {suggestion.quest.rewards.cp} CP
                      </span>
                    )}
                    {suggestion.quest.rewards.materials && suggestion.quest.rewards.materials.length > 0 && (
                      <span className={styles.rewardItem}>
                        💎 {suggestion.quest.rewards.materials.length} materials
                      </span>
                    )}
                  </div>

                  <div className={styles.suggestionReason}>
                    <span className={styles.reasonIcon}>💡</span>
                    <span className={styles.reasonText}>{suggestion.reason}</span>
                  </div>

                  {suggestion.quest.skills && suggestion.quest.skills.length > 0 && (
                    <div className={styles.questSkills}>
                      <span className={styles.skillsLabel}>Skills:</span>
                      {suggestion.quest.skills.slice(0, 3).map((skill, skillIndex) => (
                        <span key={skillIndex} className={styles.skillTag}>
                          {skill}
                        </span>
                      ))}
                      {suggestion.quest.skills.length > 3 && (
                        <span className={styles.moreSkills}>
                          +{suggestion.quest.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {suggestion.quest.dueDate && (
                    <div className={styles.dueDate}>
                      📅 Due: {new Date(suggestion.quest.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <div className={styles.footerHint}>
            Click on any quest to attach it to your session
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuestSuggestionModal;
