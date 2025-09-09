import React from 'react';
import styles from './QuickFilterCard.module.css';

interface QuickFilterCardProps {
  label: string;
  emoji: string;
  count: number;
  color: string; // rgb string, e.g. '244, 67, 54'
  isActive: boolean;
  onClick: () => void;
  onQuestDrop?: (questId: string, filterType: string) => void;
  filterType?: string; // e.g., "today", "tomorrow", "overdue", etc.
  description?: string; // Optional description for the filter
  compact?: boolean; // Compact view mode
}

export const QuickFilterCard: React.FC<QuickFilterCardProps> = ({ 
  label, 
  emoji, 
  count, 
  color, 
  isActive, 
  onClick, 
  onQuestDrop,
  filterType,
  description,
  compact = false
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    // Only handle our quest drags
    if (e.dataTransfer.types.includes("application/x-quest-drag")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    // Only handle our quest drags
    if (e.dataTransfer.types.includes("application/x-quest-drag")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      
      const questId = e.dataTransfer.getData("application/x-quest-drag") || e.dataTransfer.getData("text/plain");
      if (questId && onQuestDrop && filterType) {
        onQuestDrop(questId, filterType);
      }
    }
  };

  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''} ${isDragOver ? styles.dragOver : ''} ${compact ? styles.compact : ''}`}
      data-drop-zone="quick-filter"
      data-filter-type={filterType}
      style={{
        borderColor: isDragOver ? `rgb(${color})` : `rgb(${color})`,
        background: isActive
          ? `linear-gradient(135deg, rgba(${color},0.18) 0%, rgba(30,32,50,0.95) 100%)`
          : isDragOver
          ? `linear-gradient(135deg, rgba(${color},0.25) 0%, rgba(30,32,50,0.8) 100%)`
          : `rgba(30,32,50,0.7)`,
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.2s ease'
      }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
      {isDragOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: `rgb(${color})`,
          fontSize: 12,
          fontWeight: 600,
          pointerEvents: 'none'
        }}>
          DROP HERE
        </div>
      )}
    </div>
  );
}; 