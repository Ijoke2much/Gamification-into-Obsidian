import React, { useState, useMemo } from 'react';
import { Quest } from '../../../features/quests/utils/taskParser';
import styles from './QuestProgressTracker.module.css';

interface QuestProgressTrackerProps {
  quests: Quest[];
  onQuestSelect?: (quest: Quest) => void;
}

interface QuestStats {
  totalQuests: number;
  completedQuests: number;
  activeQuests: number;
  overdueQuests: number;
  totalXP: number;
  earnedXP: number;
  completionRate: number;
  averageXP: number;
  questsByDifficulty: Record<string, number>;
  questsByPriority: Record<string, number>;
  recentCompletions: Quest[];
}

export const QuestProgressTracker: React.FC<QuestProgressTrackerProps> = ({
  quests,
  onQuestSelect
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [view, setView] = useState<'overview' | 'detailed' | 'timeline'>('overview');

  const questStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter quests based on timeframe
    const filteredQuests = quests.filter(quest => {
      if (selectedTimeframe === 'all') return true;
      
      const questDate = quest.createdDate ? new Date(quest.createdDate) : new Date(0);
      if (selectedTimeframe === 'week') return questDate >= oneWeekAgo;
      if (selectedTimeframe === 'month') return questDate >= oneMonthAgo;
      return true;
    });

    const completed = filteredQuests.filter(q => q.completed);
    const active = filteredQuests.filter(q => !q.completed);
    const overdue = active.filter(q => {
      if (!q.due) return false;
      return new Date(q.due) < now;
    });

    const totalXP = filteredQuests.reduce((sum, q) => sum + (q.xp || 0), 0);
    const earnedXP = completed.reduce((sum, q) => sum + (q.xp || 0), 0);

    const questsByDifficulty: Record<string, number> = {};
    const questsByPriority: Record<string, number> = {};

    filteredQuests.forEach(quest => {
      const difficulty = quest.difficulty || 'unknown';
      const priority = quest.priority || 'medium';
      
      questsByDifficulty[difficulty] = (questsByDifficulty[difficulty] || 0) + 1;
      questsByPriority[priority] = (questsByPriority[priority] || 0) + 1;
    });

    // Get recent completions (last 7 days)
    const recentCompletions = completed
      .filter(q => {
        const completedDate = q.completedAt || (q.lastModified ? new Date(q.lastModified) : null);
        if (!completedDate) return false;
        return completedDate >= oneWeekAgo;
      })
      .sort((a, b) => {
        const dateA = a.completedAt || new Date(a.lastModified || 0);
        const dateB = b.completedAt || new Date(b.lastModified || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    const stats: QuestStats = {
      totalQuests: filteredQuests.length,
      completedQuests: completed.length,
      activeQuests: active.length,
      overdueQuests: overdue.length,
      totalXP,
      earnedXP,
      completionRate: filteredQuests.length > 0 ? (completed.length / filteredQuests.length) * 100 : 0,
      averageXP: completed.length > 0 ? earnedXP / completed.length : 0,
      questsByDifficulty,
      questsByPriority,
      recentCompletions
    };

    return stats;
  }, [quests, selectedTimeframe]);

  const renderOverviewStats = () => (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{questStats.totalQuests}</div>
        <div className={styles.statLabel}>Total Quests</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{questStats.completedQuests}</div>
        <div className={styles.statLabel}>Completed</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{questStats.activeQuests}</div>
        <div className={styles.statLabel}>Active</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{questStats.overdueQuests}</div>
        <div className={styles.statLabel}>Overdue</div>
        {questStats.overdueQuests > 0 && (
          <div className={styles.warningIndicator}>!</div>
        )}
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{Math.round(questStats.completionRate)}%</div>
        <div className={styles.statLabel}>Completion Rate</div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statValue}>{questStats.earnedXP}</div>
        <div className={styles.statLabel}>XP Earned</div>
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const progressPercentage = questStats.completionRate;
    return (
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>Quest Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.progressDetails}>
          {questStats.completedQuests} of {questStats.totalQuests} quests completed
        </div>
      </div>
    );
  };

  const renderRecentCompletions = () => (
    <div className={styles.recentSection}>
      <h3>Recent Completions</h3>
      {questStats.recentCompletions.length === 0 ? (
        <div className={styles.emptyState}>No recent completions</div>
      ) : (
        <div className={styles.completionsList}>
          {questStats.recentCompletions.map((quest) => (
            <div 
              key={quest.id} 
              className={styles.completionItem}
              onClick={() => onQuestSelect?.(quest)}
            >
              <div className={styles.completionTitle}>{quest.title}</div>
              <div className={styles.completionMeta}>
                <span className={styles.xpBadge}>+{quest.xp} XP</span>
                {quest.difficulty && (
                  <span className={styles.difficultyBadge}>{quest.difficulty}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetailedBreakdown = () => (
    <div className={styles.breakdownSection}>
      <div className={styles.breakdownGrid}>
        <div className={styles.breakdownCard}>
          <h4>By Difficulty</h4>
          <div className={styles.breakdownList}>
            {Object.entries(questStats.questsByDifficulty).map(([difficulty, count]) => (
              <div key={difficulty} className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>{difficulty}</span>
                <span className={styles.breakdownValue}>{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.breakdownCard}>
          <h4>By Priority</h4>
          <div className={styles.breakdownList}>
            {Object.entries(questStats.questsByPriority).map(([priority, count]) => (
              <div key={priority} className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>{priority}</span>
                <span className={styles.breakdownValue}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.questProgressTracker}>
      <div className={styles.header}>
        <h2>Quest Progress</h2>
        <div className={styles.controls}>
          <div className={styles.timeframeSelector}>
            {(['week', 'month', 'all'] as const).map((timeframe) => (
              <button
                key={timeframe}
                className={`${styles.timeframeButton} ${
                  selectedTimeframe === timeframe ? styles.active : ''
                }`}
                onClick={() => setSelectedTimeframe(timeframe)}
              >
                {timeframe === 'week' ? 'Last Week' : 
                 timeframe === 'month' ? 'Last Month' : 'All Time'}
              </button>
            ))}
          </div>
          
          <div className={styles.viewSelector}>
            {(['overview', 'detailed', 'timeline'] as const).map((viewType) => (
              <button
                key={viewType}
                className={`${styles.viewButton} ${
                  view === viewType ? styles.active : ''
                }`}
                onClick={() => setView(viewType)}
              >
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {view === 'overview' && (
          <>
            {renderOverviewStats()}
            {renderProgressBar()}
            {renderRecentCompletions()}
          </>
        )}
        
        {view === 'detailed' && (
          <>
            {renderOverviewStats()}
            {renderDetailedBreakdown()}
          </>
        )}
        
        {view === 'timeline' && (
          <div className={styles.timelineView}>
            <div className={styles.comingSoon}>
              📊 Timeline view coming soon!
              <div className={styles.comingSoonDesc}>
                Track your quest completion patterns over time
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
