import React, { useState } from 'react';
import { QuestCalendarView } from './QuestCalendarView';
import { QuestTimelineView } from './QuestTimelineView';
import { QuestDetailModal } from '../modals/QuestDetailModal';
import type { Quest } from '../utils/taskParser';
import type GamificationObsidianPlugin from '../../../core/main';
import { createPortal } from 'react-dom';
import styles from './TimelineModal.module.css';

interface UnifiedQuestViewProps {
  quests: Quest[];
  plugin: GamificationObsidianPlugin;
  currentEnergy: number;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  onQuestMove: (questId: string, newDateIso: string) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  onStartPomodoro?: (quest: Quest) => void;
  onToggleFavorite?: (questTitle: string) => void;
  onDeleteQuest?: (questTitle: string) => void;
  onUncompleteQuest?: (questTitle: string) => void;
  onToggleSubtask?: (questId: string, subtaskIndex: number) => void;
  onAddQuestForDate?: (date: Date) => void;
}

export const UnifiedQuestView: React.FC<UnifiedQuestViewProps> = ({
  quests,
  plugin,
  currentEnergy,
  onQuestComplete,
  onQuestEdit,
  onQuestMove,
  onStartHyperfocus,
  onStartPomodoro,
  onToggleFavorite,
  onDeleteQuest,
  onUncompleteQuest,
  onToggleSubtask,
  onAddQuestForDate,
}) => {
  // State management
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [weekModalMode, setWeekModalMode] = useState<'workweek' | 'week'>('workweek');

  // Keep selected quest updated when quests reload - NEVER clear it while modal is open
  React.useEffect(() => {
    if (selectedQuestId && detailModalOpen) {
      if (quests.length > 0) {
        const updatedQuest = quests.find(q => (q.id || q.title) === selectedQuestId);
        if (updatedQuest) {
          // Update with fresh quest data from reload
          setSelectedQuest(updatedQuest);
        }
        // CRITICAL: If quest not found, keep existing selectedQuest
        // Never set selectedQuest to null while modal is open
      }
      // If quests array is empty (during reload), keep existing selectedQuest
    }
    // If modal closes, we'll clear selectedQuest in handleCloseDetail
  }, [quests, selectedQuestId, detailModalOpen]);

  // Filter quests for selected date
  const getQuestsForDate = (date: Date): Quest[] => {
    const dateStr = date.toISOString().split('T')[0];
    return quests.filter(quest => {
      if (quest.due) {
        const questDateStr = quest.due.includes('T') 
          ? quest.due.split('T')[0] 
          : quest.due;
        return questDateStr === dateStr;
      }
      // Also include quests marked as "today" if the date is today
      if (quest.today) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate.getTime() === today.getTime();
      }
      return false;
    });
  };

  // Handle day click in calendar - shows timeline inline
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle quest click - opens detail modal
  const handleQuestClick = (quest: Quest) => {
    const questId = quest.id || quest.title;
    setSelectedQuest(quest);
    setSelectedQuestId(questId);
    setDetailModalOpen(true);
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedQuest(null);
    setSelectedQuestId(null);
  };

  // Close week modal
  const handleCloseWeekModal = () => {
    setWeekModalOpen(false);
  };

  // Handle Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailModalOpen) {
          handleCloseDetail();
        } else if (weekModalOpen) {
          handleCloseWeekModal();
        }
      }
    };

    if (detailModalOpen || weekModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [detailModalOpen, weekModalOpen]);

  const timelineQuests = selectedDate ? getQuestsForDate(selectedDate) : [];

  return (
    <>
      {/* Week View Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '16px',
        padding: '12px',
        background: 'var(--background-secondary)',
        borderRadius: '10px',
        border: '1px solid var(--background-modifier-border)'
      }}>
        <button
          onClick={() => {
            setWeekModalMode('workweek');
            setWeekModalOpen(true);
          }}
          style={{
            flex: 1,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          }}
        >
          📊 Work Week View
        </button>
        <button
          onClick={() => {
            setWeekModalMode('week');
            setWeekModalOpen(true);
          }}
          style={{
            flex: 1,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          }}
        >
          📆 Full Week View
        </button>
      </div>

      {/* Main Calendar View */}
      <QuestCalendarView
        quests={quests}
        plugin={plugin}
        currentEnergy={currentEnergy}
        onQuestSelect={handleQuestClick}
        onQuestComplete={onQuestComplete}
        onQuestEdit={onQuestEdit}
        onDateSelect={handleDateClick}
        onQuestMove={onQuestMove}
        onStartHyperfocus={onStartHyperfocus}
        hideSelectedDateDetails={true}
        onAddQuestForDate={onAddQuestForDate}
      />

      {/* Inline Timeline View - Shows when a date is selected */}
      {selectedDate && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          border: '2px solid var(--background-modifier-border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--background-modifier-border)'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 700,
              color: 'var(--text-normal)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📅 {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <button
              onClick={() => setSelectedDate(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--background-modifier-border)',
                background: 'var(--background-primary)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--background-modifier-error)';
                e.currentTarget.style.color = 'var(--text-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--background-primary)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Close timeline view"
            >
              ✕ Close
            </button>
          </div>
          
          <QuestTimelineView
            quests={timelineQuests}
            plugin={plugin}
            currentEnergy={currentEnergy}
            onQuestSelect={handleQuestClick}
            onQuestComplete={onQuestComplete}
            onQuestEdit={onQuestEdit}
            onQuestMove={onQuestMove}
            onStartHyperfocus={onStartHyperfocus}
            date={selectedDate}
            initialViewMode="day"
          />
        </div>
      )}

      {/* Week View Modal - Full screen */}
      {weekModalOpen && (
        <>
          {createPortal(
            <div className={`${styles.modalOverlay} ${styles.pixelTimelineOverlay}`} data-pixel-modal="quest-week" onClick={handleCloseWeekModal}>
              <div className={`${styles.modalContent} ${styles.pixelTimelinePanel}`} data-pixel-shell="quest-week" onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>
                    {weekModalMode === 'workweek' ? '📊 Work Week View' : '📆 Full Week View'}
                  </h2>
                  <button 
                    className={styles.closeButton}
                    onClick={handleCloseWeekModal}
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
                    onQuestSelect={handleQuestClick}
                    onQuestComplete={onQuestComplete}
                    onQuestEdit={onQuestEdit}
                    onQuestMove={onQuestMove}
                    onStartHyperfocus={onStartHyperfocus}
                    date={new Date()}
                    initialViewMode={weekModalMode}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}

      {/* Quest Detail Modal - Opens when clicking a quest */}
      {/* Keep modal open even if selectedQuest is temporarily null during reload */}
      {/* Use selectedQuestId as key to prevent remounting when quest object reference changes */}
      {detailModalOpen && selectedQuestId && (
        <QuestDetailModal
          key={selectedQuestId}
          isOpen={detailModalOpen}
          onClose={handleCloseDetail}
          quest={selectedQuest}
          plugin={plugin}
          currentEnergy={currentEnergy}
          onEdit={onQuestEdit}
          onComplete={onQuestComplete}
          onUncomplete={onUncompleteQuest}
          onToggleFavorite={onToggleFavorite}
          onStartPomodoro={onStartPomodoro}
          onStartHyperfocus={onStartHyperfocus}
          onDelete={onDeleteQuest}
          onToggleSubtask={onToggleSubtask}
        />
      )}
    </>
  );
};

export default UnifiedQuestView;

