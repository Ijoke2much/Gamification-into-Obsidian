import React from 'react';
import { SearchResult } from '../types/SearchTypes';
import { Quest } from '../utils/taskParser';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  results: SearchResult[];
  onQuestSelect: (quest: Quest) => void;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  currentEnergy: number;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onQuestSelect,
  onQuestComplete,
  onQuestEdit,
  currentEnergy,
  className
}) => {
  const getEnergyMatchColor = (match: string): string => {
    switch (match) {
      case 'perfect': return '#10b981';
      case 'good': return '#3b82f6';
      case 'challenging': return '#f59e0b';
      case 'insufficient': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getEnergyMatchIcon = (match: string): string => {
    switch (match) {
      case 'perfect': return '🎯';
      case 'good': return '✅';
      case 'challenging': return '⚡';
      case 'insufficient': return '🔋';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority?: string): string => {
    switch (priority?.toLowerCase()) {
      case 'highest': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      case 'lowest': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority?: string): string => {
    switch (priority?.toLowerCase()) {
      case 'highest': return '🔺';
      case 'high': return '⏫';
      case 'medium': return '🔼';
      case 'low': return '🔽';
      case 'lowest': return '⏬';
      default: return '⚪';
    }
  };

  const getDifficultyIcon = (difficulty?: string): string => {
    switch (difficulty?.toLowerCase()) {
      case 'hard': return '🔥';
      case 'medium': return '⚖️';
      case 'easy': return '🌱';
      default: return '⚪';
    }
  };

  const highlightText = (text: string, highlights: SearchResult['highlights'], field: string): React.ReactNode => {
    const fieldHighlights = highlights.filter(h => h.field === field);
    if (fieldHighlights.length === 0) return text;

    let highlightedText = text;
    fieldHighlights.forEach(highlight => {
      const before = highlightedText.substring(0, highlight.startIndex);
      const match = highlightedText.substring(highlight.startIndex, highlight.endIndex);
      const after = highlightedText.substring(highlight.endIndex);
      highlightedText = `${before}<mark>${match}</mark>${after}`;
    });

    return (
      <span 
        dangerouslySetInnerHTML={{ __html: highlightedText }}
        className={styles.highlightedText}
      />
    );
  };

  if (results.length === 0) {
    return (
      <div className={`${styles.emptyState} ${className || ''}`}>
        <div className={styles.emptyIcon}>🔍</div>
        <h3 className={styles.emptyTitle}>No quests found</h3>
        <p className={styles.emptyDescription}>
          Try adjusting your search criteria or filters to find more quests.
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.resultsHeader}>
        <h3 className={styles.resultsTitle}>
          {results.length} quest{results.length !== 1 ? 's' : ''} found
        </h3>
        <div className={styles.resultsStats}>
          <span className={styles.statItem}>
            Perfect Energy: {results.filter(r => r.energyMatch === 'perfect').length}
          </span>
          <span className={styles.statItem}>
            Good Energy: {results.filter(r => r.energyMatch === 'good').length}
          </span>
          <span className={styles.statItem}>
            Challenging: {results.filter(r => r.energyMatch === 'challenging').length}
          </span>
        </div>
      </div>

      <div className={styles.resultsList}>
        {results.map((result, index) => (
          <div
            key={result.quest.id}
            className={styles.resultItem}
            onClick={() => onQuestSelect(result.quest)}
          >
            <div className={styles.resultHeader}>
              <div className={styles.resultTitle}>
                {highlightText(result.quest.title, result.highlights, 'title')}
                {result.quest.completed && <span className={styles.completedBadge}>✅</span>}
              </div>
              <div className={styles.resultActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuestEdit(result.quest);
                  }}
                  className={styles.actionButton}
                  title="Edit quest"
                >
                  ✏️
                </button>
                {!result.quest.completed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuestComplete(result.quest.title);
                    }}
                    className={styles.actionButton}
                    title="Complete quest"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>

            {result.quest.description && (
              <div className={styles.resultDescription}>
                {highlightText(result.quest.description, result.highlights, 'description')}
              </div>
            )}

            <div className={styles.resultMeta}>
              {/* Priority & Difficulty */}
              <div className={styles.metaRow}>
                {result.quest.priority && (
                  <span 
                    className={styles.metaBadge}
                    style={{ backgroundColor: getPriorityColor(result.quest.priority) }}
                  >
                    {getPriorityIcon(result.quest.priority)} {result.quest.priority}
                  </span>
                )}
                {result.quest.difficulty && (
                  <span className={styles.metaBadge}>
                    {getDifficultyIcon(result.quest.difficulty)} {result.quest.difficulty}
                  </span>
                )}
              </div>

              {/* Energy Match */}
              <div className={styles.energyMatch}>
                <span 
                  className={styles.energyBadge}
                  style={{ backgroundColor: getEnergyMatchColor(result.energyMatch) }}
                >
                  {getEnergyMatchIcon(result.energyMatch)} {result.energyMatch}
                </span>
                <span className={styles.energyCost}>
                  ⚡ {result.quest.energyCost || 'N/A'}
                </span>
              </div>

              {/* Rewards */}
              <div className={styles.rewards}>
                {result.quest.xp && (
                  <span className={styles.rewardBadge}>✨ {result.quest.xp} XP</span>
                )}
                {result.quest.cp && (
                  <span className={styles.rewardBadge}>⭐ {result.quest.cp} CP</span>
                )}
                {result.quest.estimatedTime && (
                  <span className={styles.rewardBadge}>⏱️ {result.quest.estimatedTime}</span>
                )}
              </div>

              {/* Skills */}
              {result.quest.skills && result.quest.skills.length > 0 && (
                <div className={styles.skills}>
                  {result.quest.skills.map((skill, idx) => (
                    <span key={idx} className={styles.skillTag}>
                      🛠️ {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Subtasks */}
              {result.quest.subtasks && result.quest.subtasks.length > 0 && (
                <div className={styles.subtasks}>
                  <div className={styles.subtasksHeader}>
                    Subtasks ({result.quest.subtasks.filter(st => st.completed).length}/{result.quest.subtasks.length})
                  </div>
                  <div className={styles.subtasksList}>
                    {result.quest.subtasks.slice(0, 3).map((subtask, idx) => (
                      <div key={idx} className={styles.subtaskItem}>
                        <span className={styles.subtaskCheckbox}>
                          {subtask.completed ? '✅' : '⭕'}
                        </span>
                        <span className={styles.subtaskText}>
                          {highlightText(subtask.text, result.highlights, 'subtasks')}
                        </span>
                      </div>
                    ))}
                    {result.quest.subtasks.length > 3 && (
                      <div className={styles.subtaskMore}>
                        +{result.quest.subtasks.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Match Score */}
              <div className={styles.matchInfo}>
                <span className={styles.matchScore}>
                  Match: {result.matchScore}%
                </span>
                <span className={styles.matchedFields}>
                  {result.matchedFields.join(', ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
