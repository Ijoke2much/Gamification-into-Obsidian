import React from 'react';
import styles from './QuickFilterCard.module.css';

interface QuickFilterCardProps {
  label: string;
  emoji: string;
  count: number;
  color: string; // rgb string, e.g. '244, 67, 54'
  isActive: boolean;
  onClick: () => void;
  description?: string; // Optional description for the filter
  compact?: boolean; // Compact view mode
  extraBottomPadding?: number; // Additional padding-bottom for cards with many badges
}

export const QuickFilterCard: React.FC<QuickFilterCardProps> = ({ 
  label, 
  emoji, 
  count, 
  color, 
  isActive, 
  onClick, 
  description,
  compact = false,
  extraBottomPadding = 0
}) => {
  // Drag-and-drop has been removed for clarity and simplicity

  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''} ${compact ? styles.compact : ''}`}
      style={{
        borderColor: `rgb(${color})`,
        background: isActive
          ? `linear-gradient(135deg, rgba(${color},0.18) 0%, rgba(30,32,50,0.95) 100%)`
          : `rgba(30,32,50,0.7)`,
        transition: 'all 0.2s ease',
        paddingBottom: `calc(12px + ${extraBottomPadding}px)`
      }}
      onClick={onClick}
      tabIndex={0}
      role="button"
    >
      <div className={styles.labelRow}>
        <span className={styles.emoji}>{emoji}</span>
        <span className={styles.label} style={{ color: `rgb(${color})` }}>{label.toUpperCase()}</span>
      </div>
      {description && (
        <div style={{
          fontSize: 10,
          color: "#888",
          fontStyle: "italic",
          marginBottom: 4,
          textAlign: "center",
          lineHeight: 1.2
        }}>
          {description}
        </div>
      )}
      <div className={styles.count} style={{ color: `rgb(${color})` }}>{count}</div>
    </div>
  );
}; 