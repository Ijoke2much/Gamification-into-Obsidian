import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QuestTimelineView } from './QuestTimelineView';
import type { Quest } from '../utils/taskParser';
import type GamificationObsidianPlugin from '../../../core/main';
import styles from './TimelineModal.module.css';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
  plugin: GamificationObsidianPlugin;
  currentEnergy: number;
  onQuestSelect: (quest: Quest) => void;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  onQuestMove: (questId: string, newDateIso: string) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  initialViewMode: 'workweek' | 'week';
}

export const TimelineModal: React.FC<TimelineModalProps> = ({
  isOpen,
  onClose,
  quests,
  plugin,
  currentEnergy,
  onQuestSelect,
  onQuestComplete,
  onQuestEdit,
  onQuestMove,
  onStartHyperfocus,
  initialViewMode
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render modal using portal to attach to document.body
  // This ensures it appears outside the sidebar DOM hierarchy
  const modalContent = (
    <div className={`${styles.modalOverlay} ${styles.pixelTimelineOverlay}`} data-pixel-modal="quest-timeline" onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.pixelTimelinePanel}`} data-pixel-shell="quest-timeline" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {initialViewMode === 'workweek' ? '📊 Work Week View' : '📆 Full Week View'}
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            title="Close (Esc)"
            type="button"
          >
            ✕
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <QuestTimelineView
            quests={quests}
            plugin={plugin}
            currentEnergy={currentEnergy}
            onQuestSelect={onQuestSelect}
            onQuestComplete={onQuestComplete}
            onQuestEdit={onQuestEdit}
            onQuestMove={onQuestMove}
            onStartHyperfocus={onStartHyperfocus}
            date={new Date()}
            initialViewMode={initialViewMode}
          />
        </div>
      </div>
    </div>
  );

  // Use React Portal to render outside the sidebar
  return createPortal(modalContent, document.body);
};

export default TimelineModal;

