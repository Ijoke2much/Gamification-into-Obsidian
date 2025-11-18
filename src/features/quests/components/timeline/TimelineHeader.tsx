import React from 'react';
import styles from '../QuestTimelineView.module.css';

type TimelineViewMode = 'day' | 'week' | 'workweek';

interface TimelineHeaderProps {
  viewMode: TimelineViewMode;
  visibleDate: Date;
  currentWeek: Date;
  dayColumns: Array<{ date: Date; quests: any[]; energyRequired: number }>;
  quests: any[];
  currentEnergy: number;
  isOvercommitted: boolean;
  showEnergyOverview: boolean;
  setShowEnergyOverview: (show: boolean) => void;
  showUnscheduled: boolean;
  setShowUnscheduled: (show: boolean) => void;
  onNavigateWeek: (direction: number) => void;
  onNavigateDay: (direction: number) => void;
  formatWeekRange: (week: Date) => string;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  viewMode,
  visibleDate,
  currentWeek,
  dayColumns,
  quests,
  currentEnergy,
  isOvercommitted,
  showEnergyOverview,
  setShowEnergyOverview,
  showUnscheduled,
  setShowUnscheduled,
  onNavigateWeek,
  onNavigateDay,
  formatWeekRange
}) => {
  return (
    <>
      {/* View Mode Selector - Only show for day view in sidebar, week views are in modal */}
      {viewMode === 'day' && (
        <div className={styles.viewModeSelector} style={{ justifyContent: 'center' }}>
          <button 
            className={`${styles.viewModeBtn} ${styles.active}`}
            style={{ cursor: 'default' }}
          >
            📅 Day
          </button>
        </div>
      )}

      {/* Navigation Header */}
      {viewMode !== 'day' ? (
        <div className={styles.weekNavigation}>
          <button className={styles.navButton} onClick={() => onNavigateWeek(-1)}>← Previous Week</button>
          <h3 className={styles.weekTitle}>{formatWeekRange(currentWeek)}</h3>
          <button className={styles.navButton} onClick={() => onNavigateWeek(1)}>Next Week →</button>
        </div>
      ) : (
        <div className={styles.dayNavigation}>
          <button className={styles.navButton} onClick={() => onNavigateDay(-1)}>← Previous Day</button>
          <h3 className={styles.dayTitle}>
            {visibleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {dayColumns.length > 0 && dayColumns[0].quests.length === 0 && quests.length > 0 && (
              <span style={{ 
                fontSize: '12px', 
                marginLeft: '8px', 
                color: 'var(--text-muted)',
                fontWeight: 'normal'
              }}>
                ({quests.length} total quests, 0 on this date)
              </span>
            )}
          </h3>
          <button className={styles.navButton} onClick={() => onNavigateDay(1)}>Next Day →</button>
        </div>
      )}

      {/* Energy Bar and Controls */}
      <div className={styles.energyHeader}>
        <div className={styles.energyIndicator}>
          <div className={styles.energyBar}>
            <div 
              className={styles.energyFill}
              style={{ width: `${Math.min(currentEnergy, 100)}%` }}
            />
          </div>
          <span className={styles.energyText}>⚡ Energy: {currentEnergy}/100</span>
        </div>

        {viewMode === 'day' && isOvercommitted && (
          <div className={styles.overcommitmentWarning}>
            ⚠️ You're overcommitted for today! Consider reducing your quest load.
          </div>
        )}

        <div className={styles.controls}>
          <button 
            className={`${styles.controlBtn} ${showEnergyOverview ? styles.active : ''}`}
            onClick={() => setShowEnergyOverview(!showEnergyOverview)}
          >
            ⚡ Energy
          </button>
          <button 
            className={`${styles.controlBtn} ${showUnscheduled ? styles.active : ''}`}
            onClick={() => setShowUnscheduled(!showUnscheduled)}
          >
            📋 Unscheduled
          </button>
        </div>
      </div>
    </>
  );
};
