import React from 'react';
import type { Quest } from '../../utils/taskParser';
import { DayColumn, PlacedQuest, getEnergyMatchClass, formatMinutesHuman, parseStartMinutes, parseDurationToMin } from './TimelineUtils';
import { QuestBlock } from './QuestBlock';
import styles from '../QuestTimelineView.module.css';

interface TimelineGridProps {
  viewMode: 'day' | 'week' | 'workweek';
  dayColumns: DayColumn[];
  currentEnergy: number;
  quests: Quest[];
  visibleDate: Date;
  expandedBlocks: Set<string>;
  openDropdown: string | null;
  blockThemes: Record<string, string>;
  baseStartHour: number;
  hourHeight: number;
  setVisibleDate: (date: Date) => void;
  onQuestSelect: (quest: Quest) => void;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  onQuestMove: (questId: string, newDateIso: string) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  setLastSelectedQuestId: (id: string) => void;
  toggleBlockExpansion: (questId: string) => void;
  toggleDropdown: (questId: string, e: React.MouseEvent) => void;
  handleToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
  setOpenDropdown: (id: string | null) => void;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  viewMode,
  dayColumns,
  currentEnergy,
  quests,
  visibleDate,
  expandedBlocks,
  openDropdown,
  blockThemes,
  baseStartHour,
  hourHeight,
  setVisibleDate,
  onQuestSelect,
  onQuestComplete,
  onQuestEdit,
  onQuestMove,
  onStartHyperfocus,
  setLastSelectedQuestId,
  toggleBlockExpansion,
  toggleDropdown,
  handleToggleSubtask,
  setOpenDropdown
}) => {
  const renderDayColumn = (dayCol: DayColumn, dayIdx: number) => {
    const isOvercommitted = dayCol.energyRequired > currentEnergy;
    
    return (
      <div key={dayCol.date.toISOString()} className={styles.dayColumn}>
        {/* Day Header */}
        <div className={styles.dayHeader}>
          <div className={styles.dayName}>
            {dayCol.date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div className={styles.dayNumber}>
            {dayCol.date.getDate()}
          </div>
          <div className={styles.dayMonth}>
            {dayCol.date.toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>

        {/* Energy indicator */}
        <div className={styles.dayEnergy}>
          <span className={isOvercommitted ? styles.overcommitted : ''}>
            ⚡ {dayCol.energyRequired}
          </span>
        </div>

        {/* Timeline content */}
        <div className={styles.timelineContent}>
          {dayCol.quests.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                {quests.length === 0 ? (
                  'No quests found'
                ) : dayCol.date.getTime() === visibleDate.getTime() ? (
                  <>
                    You have {quests.length} quest{quests.length !== 1 ? 's' : ''} total, but none on this date.
                    <br />
                    <strong>Try:</strong> Navigate to a different day, or add a date/time to your quests.
                  </>
                ) : (
                  'Add time-specific quests with 📅YYYY-MM-DDTHH:MM to see them in the timeline'
                )}
              </div>
              {quests.length > 0 && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div><strong>Quest dates in your file:</strong></div>
                  {Array.from(new Set(quests.filter(q => q.due).map(q => q.due?.split('T')[0]))).slice(0, 5).map(date => (
                    <div key={date} style={{ marginTop: '4px' }}>
                      • {date}
                      <button
                        onClick={() => {
                          if (date) {
                            const newDate = new Date(date + 'T00:00:00');
                            setVisibleDate(newDate);
                          }
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          background: 'var(--interactive-accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Go to date
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            [...dayCol.scheduled].sort((a,b) => a.startMinutes - b.startMinutes).map((block, blockIdx) => {
              const energy = block.quest.energyCost ?? 10;
              const energyMatch = getEnergyMatchClass(energy, currentEnergy);
              const isHyperfocusOptimal = block.quest.difficulty === 'hard' && currentEnergy >= 70;
              const isExpanded = expandedBlocks.has(block.quest.id);
              const isDropdownOpen = openDropdown === block.quest.id;
              
              const startHour = Math.floor(block.startMinutes / 60);
              const startMin = block.startMinutes % 60;
              const time = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
              
              const endMinutes = block.startMinutes + block.duration;
              const endHour = Math.floor(endMinutes / 60);
              const endMin = endMinutes % 60;
              const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
              const durationLabel = formatMinutesHuman(block.duration);
              
              // Check if current task
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const isCurrentTask = dayCol.isToday && 
                currentMinutes >= block.startMinutes && 
                currentMinutes < (block.startMinutes + block.duration);
              
              // Get border color and text color based on block theme or energy
              const themeClass = blockThemes[block.quest.id];
              let borderColor = '#3b82f6'; // default blue
              let textColor = 'var(--text-normal)';
              
              if (themeClass === 'calmMint') {
                borderColor = '#10b981';
                textColor = '#052e16';
              } else if (themeClass === 'calmBlue') {
                borderColor = '#3b82f6';
                textColor = '#172554';
              } else if (themeClass === 'calmLavender') {
                borderColor = '#8b5cf6';
                textColor = '#312e81';
              } else if (themeClass === 'calmPeach') {
                borderColor = '#f59e0b';
                textColor = '#7c2d12';
              } else if (themeClass === 'calmGray') {
                borderColor = '#6b7280';
                textColor = '#1f2937';
              } else if (themeClass === 'calmRose') {
                borderColor = '#f43f5e';
                textColor = '#7f1d1d';
              } else if (energyMatch === 'low') {
                borderColor = '#34D399';
              } else if (energyMatch === 'medium') {
                borderColor = '#F59E0B';
              } else if (energyMatch === 'high') {
                borderColor = '#EF4444';
              }
              
              // Calculate gap to previous task
              const prevBlock = blockIdx > 0 ? [...dayCol.scheduled].sort((a,b) => a.startMinutes - b.startMinutes)[blockIdx - 1] : null;
              const gapMinutes = prevBlock ? block.startMinutes - (prevBlock.startMinutes + prevBlock.duration) : null;
              const showGap = gapMinutes !== null && gapMinutes > 0;
              
              return (
                <QuestBlock
                  key={block.quest.id}
                  block={block}
                  blockIdx={blockIdx}
                  dayCol={dayCol}
                  currentEnergy={currentEnergy}
                  expandedBlocks={expandedBlocks}
                  openDropdown={openDropdown}
                  blockThemes={blockThemes}
                  isExpanded={isExpanded}
                  isDropdownOpen={isDropdownOpen}
                  isCurrentTask={isCurrentTask}
                  energy={energy}
                  energyMatch={energyMatch}
                  isHyperfocusOptimal={isHyperfocusOptimal}
                  time={time}
                  endTime={endTime}
                  durationLabel={durationLabel}
                  gapMinutes={gapMinutes}
                  showGap={showGap}
                  themeClass={themeClass}
                  borderColor={borderColor}
                  textColor={textColor}
                  onQuestSelect={onQuestSelect}
                  onQuestComplete={onQuestComplete}
                  onQuestEdit={onQuestEdit}
                  onQuestMove={onQuestMove}
                  onStartHyperfocus={onStartHyperfocus}
                  setLastSelectedQuestId={setLastSelectedQuestId}
                  toggleBlockExpansion={toggleBlockExpansion}
                  toggleDropdown={toggleDropdown}
                  handleToggleSubtask={handleToggleSubtask}
                  setOpenDropdown={setOpenDropdown}
                />
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.timelineGrid}>
      {dayColumns.map(renderDayColumn)}
    </div>
  );
};
