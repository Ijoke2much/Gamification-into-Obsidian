import React from 'react';
import styles from './QuestViewToggle.module.css';

export type QuestViewMode = 'cards' | 'calendar' | 'timeline';

interface QuestViewToggleProps {
  currentView: QuestViewMode;
  onViewChange: (view: QuestViewMode) => void;
  energyLevel?: number; // For showing energy-specific options
}

export const QuestViewToggle: React.FC<QuestViewToggleProps> = ({
  currentView,
  onViewChange,
  energyLevel = 70
}) => {
  const views = [
    {
      id: 'cards' as QuestViewMode,
      icon: '🎮',
      label: 'Cards',
      description: 'Far Cry style quest cards with ADHD features'
    },
    {
      id: 'calendar' as QuestViewMode,
      icon: '📅',
      label: 'Calendar',
      description: 'Monthly planning view'
    },
    {
      id: 'timeline' as QuestViewMode,
      icon: '⏰',
      label: 'Timeline',
      description: 'Daily time blocking'
    }
  ];

  return (
    <div className={styles.viewToggle}>
      {views.map(view => (
        <button
          key={view.id}
          className={`${styles.viewButton} ${currentView === view.id ? styles.active : ''}`}
          onClick={() => onViewChange(view.id)}
          title={view.description}
        >
          <span className={styles.viewIcon}>{view.icon}</span>
          <span className={styles.viewLabel}>{view.label}</span>
        </button>
      ))}
    </div>
  );
};
