import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TFile } from 'obsidian';
import type { Quest } from '../utils/taskParser';
import type GamificationObsidianPlugin from '../../../core/main';
import { formatRecur } from '../utils/questDisplayUtils';
import { 
  PriorityEditor, 
  DifficultyEditor, 
  TimeEditor
} from './InlineEditors';
import styles from './QuestCalendarView.module.css';
import { BatteryProgressBar } from '../../../shared/components/ui/BatteryProgressBar';

interface QuestCalendarViewProps {
  quests: Quest[];
  plugin: GamificationObsidianPlugin;
  currentEnergy: number;
  onQuestSelect: (quest: Quest) => void;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  onDateSelect: (date: Date) => void;
  onQuestMove: (questId: string, newDate: string) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  hideSelectedDateDetails?: boolean; // For unified view, hide the selected date details section
  onAddQuestForDate?: (date: Date) => void; // Opens create modal with date pre-filled
  showFocusEnergyControls?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  quests: Quest[];
  questCount: number;
  urgentCount: number;
  completedCount: number;
  energyRequirement: number;
}

export const QuestCalendarView: React.FC<QuestCalendarViewProps> = ({
  quests,
  plugin,
  currentEnergy,
  onQuestSelect,
  onQuestComplete,
  onQuestEdit,
  onDateSelect,
  onQuestMove,
  onStartHyperfocus,
  hideSelectedDateDetails = false,
  onAddQuestForDate,
  showFocusEnergyControls = true,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingField, setEditingField] = useState<{ questId: string; field: string; subtaskIndex?: number } | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [energyFilter, setEnergyFilter] = useState(false);

  // Format date as YYYY-MM-DD in local timezone (avoids UTC offset bugs)
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  // Calendar generation logic
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = toLocalDateStr(date);
      const isToday = date.getTime() === today.getTime();
      const dayQuests = quests.filter(quest => {
        if (quest.completed && focusMode) return false;
        // Handle both date-only (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:MM)
        if (quest.due) {
          const questDateStr = quest.due.includes('T') ? quest.due.split('T')[0] : quest.due;
          if (questDateStr === dateStr) return true;
        }
        // Undated quests: show on today (common UX - no date = appears today)
        if (isToday && (!quest.due || quest.today)) return true;
        return false;
      });

      // Filter by energy if enabled
      const filteredQuests = energyFilter 
        ? dayQuests.filter(quest => (quest.energyCost || 10) <= currentEnergy)
        : dayQuests;

      const urgentQuests = filteredQuests.filter(quest => 
        quest.priority?.toLowerCase() === 'high' || 
        (quest.due && new Date(quest.due) <= today)
      );

      const completedQuests = filteredQuests.filter(quest => quest.completed);
      const totalEnergyRequired = filteredQuests
        .filter(quest => !quest.completed)
        .reduce((sum, quest) => sum + (quest.energyCost || 10), 0);

      // Include completed quests in questCount so dots show for all quests (completed styled differently)
      const totalQuestCount = filteredQuests.length;

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        quests: filteredQuests,
        questCount: totalQuestCount,
        urgentCount: urgentQuests.filter(q => !q.completed).length,
        completedCount: completedQuests.length,
        energyRequirement: totalEnergyRequired
      });
    }

    return days;
  }, [currentMonth, quests, focusMode, energyFilter, currentEnergy]);

  // Debug logging for calendar quest detection
  useEffect(() => {
    const questsWithDue = quests.filter(q => q.due);
    const undatedCount = quests.filter(q => !q.due).length;
    const completedCount = quests.filter(q => q.completed).length;
    window.console.log('🔍 [Calendar] Debug Info:');
    window.console.log('  Current Month:', currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    window.console.log('  Total Quests:', quests.length, '(completed:', completedCount, ', undated:', undatedCount, ')');
    window.console.log('  Quests with due dates:', questsWithDue.length);
    if (questsWithDue.length > 0) {
      window.console.log('  Quest Dates:', questsWithDue.map(q => ({ 
        title: q.title, 
        due: q.due, 
        questDate: q.due?.split('T')[0],
        completed: q.completed
      })));
    }
    if (undatedCount > 0) {
      window.console.log('  Undated quests (shown on today):', quests.filter(q => !q.due).map(q => q.title));
    }
    
    const currentMonthDays = calendarDays.filter(day => day.isCurrentMonth);
    const daysWithQuests = currentMonthDays.filter(day => day.questCount > 0);
    window.console.log('  Days in current month with quests:', daysWithQuests.length);
    if (daysWithQuests.length > 0) {
      window.console.log('  Days with quests:', daysWithQuests.map(d => ({
        date: toLocalDateStr(d.date),
        questCount: d.questCount,
        completedCount: d.completedCount
      })));
    } else if (quests.length > 0) {
      window.console.log('  ⚠️ No days matched - check date format / timezone');
    }
  }, [currentMonth, quests, calendarDays]);

  // Navigation functions
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    onDateSelect(today);
  }, [onDateSelect]);

  // Drag and drop handlers
  const [draggedQuest, setDraggedQuest] = useState<Quest | null>(null);
  
  const handleDragStart = useCallback((e: React.DragEvent, quest: Quest) => {
    setDraggedQuest(quest);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', quest.id || quest.title);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedQuest) {
      const newDateStr = targetDate.toISOString().split('T')[0];
      onQuestMove(draggedQuest.id || draggedQuest.title, newDateStr);
      setDraggedQuest(null);
    }
  }, [draggedQuest, onQuestMove]);

  // Inline editing handlers
  const handleStartEditing = (questId: string, field: string, subtaskIndex?: number) => {
    setEditingField({ questId, field, subtaskIndex });
  };

  const handleSaveEdit = async (newValue: string | number) => {
    if (!editingField) return;

    try {
      const quest = quests.find(q => q.id === editingField.questId);
      if (!quest) return;

      const updates: Partial<Quest> = {};
      
      switch (editingField.field) {
        case 'priority':
          updates.priority = newValue as string;
          break;
        case 'difficulty':
          updates.difficulty = newValue as string;
          break;
        case 'estimatedTime':
          updates.estimatedTime = newValue as string;
          break;
        case 'recur':
          updates.recur = newValue as string;
          break;
        case 'xp':
          updates.xp = newValue as number;
          break;
        case 'cp':
          updates.cp = newValue as number;
          break;
        case 'coins':
          updates.coins = newValue as number;
          break;
        case 'subtask':
          if (editingField.subtaskIndex !== undefined) {
            const newSubtasks = [...(quest.subtasks || [])];
            newSubtasks[editingField.subtaskIndex] = {
              ...newSubtasks[editingField.subtaskIndex],
              text: newValue as string
            };
            updates.subtasks = newSubtasks;
          }
          break;
      }

      // Update quest via the quest system
      const { QuestSystemIntegration } = await import('../questSystemIntegration');
      await QuestSystemIntegration.updateQuest(editingField.questId, updates);
      
      // Refresh the quest list
      const refreshFn = (window as Window & { refreshQuests?: () => void }).refreshQuests;
      if (typeof refreshFn === 'function') refreshFn();
      
    } catch (error) {
      console.error('Error saving inline edit:', error);
    } finally {
      setEditingField(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };


  const handleToggleSubtask = async (questTitle: string, subtaskIndex: number) => {
    try {
      console.log('🔄 [Calendar] Toggling subtask:', { questTitle, subtaskIndex });
      
      // Immediately update the local quest data for instant UI feedback
      const quest = quests.find(q => q.title === questTitle);
      if (quest && quest.subtasks && quest.subtasks[subtaskIndex]) {
        quest.subtasks[subtaskIndex].completed = !quest.subtasks[subtaskIndex].completed;
        console.log('⚡ [Calendar] Updated local quest state immediately');
      }
      
      // Find the quest file and update the subtask
      const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md") as TFile;
      if (!questFile) {
        console.error("GamifiedTasks.md file not found");
        return;
      }

      const content = await plugin.app.vault.read(questFile);
      const lines = content.split('\n');
      
      // Find the quest block
      let questStartIndex = -1;
      let questEndIndex = -1;
      
      console.log('🔍 [Calendar] Looking for quest:', questTitle);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`- [ ] ${questTitle}`)) {
          questStartIndex = i;
          console.log('✅ [Calendar] Found quest at line:', i);
          // Find the end of this quest block (next quest or end of file)
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].startsWith('- [ ]') && lines[j].includes('title:')) {
              questEndIndex = j;
              break;
            }
          }
          if (questEndIndex === -1) questEndIndex = lines.length;
          console.log('📍 [Calendar] Quest block ends at line:', questEndIndex);
          break;
        }
      }

      if (questStartIndex === -1) {
        console.error("❌ [Calendar] Quest not found in file:", questTitle);
        return;
      }

      // Find and toggle the specific subtask
      let subtaskCount = 0;
      console.log('🎯 [Calendar] Looking for subtask at index:', subtaskIndex);
      for (let i = questStartIndex; i < questEndIndex; i++) {
        if (lines[i].startsWith('  - [ ]') || lines[i].startsWith('  - [x]')) {
          console.log(`📝 [Calendar] Found subtask ${subtaskCount}:`, lines[i]);
          if (subtaskCount === subtaskIndex) {
            // Toggle this subtask
            if (lines[i].startsWith('  - [ ]')) {
              lines[i] = lines[i].replace('  - [ ]', '  - [x]');
              console.log('✅ [Calendar] Marked subtask as completed');
            } else {
              lines[i] = lines[i].replace('  - [x]', '  - [ ]');
              console.log('❌ [Calendar] Marked subtask as incomplete');
            }
            console.log('🔄 [Calendar] Updated line:', lines[i]);
            break;
          }
          subtaskCount++;
        }
      }

      // Write the updated content back
      const newContent = lines.join('\n');
      await plugin.app.vault.modify(questFile, newContent);
      
      // Clear quest cache and trigger a refresh
      const clearCache = (window as Window & { clearQuestCache?: () => void }).clearQuestCache;
      if (clearCache) {
        clearCache();
      }
      
      // Trigger a refresh of the quest data
      window.dispatchEvent(new CustomEvent('quest-data-updated'));
      
      // Also try to trigger the manual load quests function
      const manualLoad = (window as Window & { manualLoadQuests?: () => Promise<void> }).manualLoadQuests;
      if (manualLoad) {
        await manualLoad();
      }
      
      // Force a small delay to ensure the file modification is processed
      setTimeout(() => {
        console.log('🔄 [Calendar] Subtask toggle completed, triggering refresh');
      }, 100);
      
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  // Get priority color for quest indicators
  const getPriorityColor = (quest: Quest): string => {
    const priority = quest.priority?.toLowerCase();
    if (priority === 'high') return '#ef4444'; // Red
    if (priority === 'medium') return '#f59e0b'; // Yellow
    if (priority === 'low') return '#10b981'; // Green
    return '#6b7280'; // Gray
  };

  // Get energy level indicator
  const getEnergyIndicator = (energyRequired: number): string => {
    if (energyRequired === 0) return '';
    if (energyRequired <= currentEnergy * 0.3) return '🟢'; // Low energy
    if (energyRequired <= currentEnergy * 0.7) return '🟡'; // Medium energy
    return '🔴'; // High energy
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={styles.calendarContainer}>
      {/* Debug Info - Only show if no quests are found */}
      {quests.length === 0 && (
        <div className={styles.emptyQuestBanner}>
          <strong className={styles.emptyQuestBannerTitle}>⚠️ No quests found</strong>
          <p className={styles.emptyQuestBannerText}>
            The calendar couldn't find any quests in your GamifiedTasks.md file.
          </p>
          <button
            type="button"
            className={styles.reloadQuestsBtn}
            onClick={() => {
              window.console.log('🔄 Forcing quest reload...');
              const win = window as Window & { manualLoadQuests?: () => void };
              win.manualLoadQuests?.();
            }}
          >
            🔄 Reload Quests
          </button>
        </div>
      )}

      {/* Month hint - show if quests exist but not in current month */}
      {quests.length > 0 && calendarDays.filter(day => day.isCurrentMonth).every(day => day.questCount === 0) && (
        <div className={styles.monthHintBanner}>
          <strong>💡 Tip:</strong> You have {quests.length} quest{quests.length !== 1 ? 's' : ''} total, but none in {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}.
          {(() => {
            // Find which months have quests
            const monthsWithQuests = new Set(
              quests.filter(q => q.due).map(q => {
                const date = new Date(q.due!.split('T')[0] + 'T00:00:00');
                return `${date.getFullYear()}-${date.getMonth()}`;
              })
            );
            if (monthsWithQuests.size > 0) {
              return <> Try navigating to a different month.</>;
            }
            return <> Try adding dates to your quests.</>;
          })()}
        </div>
      )}

      {/* Calendar Header */}
      <div className={styles.calendarHeader}>
        <div className={styles.monthNavigation}>
          <button 
            className={styles.navButton} 
            onClick={goToPreviousMonth}
            title="Previous Month"
          >
            ◀
          </button>
          <h2 className={styles.monthTitle}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            {quests.length > 0 && (
              <span style={{ fontSize: '12px', marginLeft: '8px', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                ({quests.length} total quests)
              </span>
            )}
          </h2>
          <button 
            className={styles.navButton} 
            onClick={goToNextMonth}
            title="Next Month"
          >
            ▶
          </button>
        </div>

        <div className={styles.calendarControls}>
          <button 
            className={styles.todayButton} 
            onClick={goToToday}
            title="Go to Today"
          >
            Today
          </button>
          {showFocusEnergyControls && (
            <>
              <button 
                className={`${styles.filterButton} ${focusMode ? styles.active : ''}`}
                onClick={() => setFocusMode(!focusMode)}
                title="Focus Mode - Hide completed quests"
              >
                🎯 Focus
              </button>
              <button 
                className={`${styles.filterButton} ${energyFilter ? styles.active : ''}`}
                onClick={() => setEnergyFilter(!energyFilter)}
                title="Energy Filter - Show only quests within energy level"
              >
                ⚡ Energy
              </button>
            </>
          )}
        </div>
      </div>

      {/* Energy Level Indicator */}
      <div className={styles.energyIndicator}>
        <div className={styles.energyBatteryWrap}>
          <BatteryProgressBar
            percent={Math.min(currentEnergy, 100)}
            statType="energy"
            pixel
            segments={12}
            height={24}
          />
        </div>
        <span className={styles.energyText}>Energy: {currentEnergy}/100</span>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarGrid}>
        {/* Day Headers */}
        {dayNames.map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              ${styles.calendarDay}
              ${!day.isCurrentMonth ? styles.otherMonth : ''}
              ${day.isToday ? styles.today : ''}
              ${day.isWeekend ? styles.weekend : ''}
              ${selectedDate?.getTime() === day.date.getTime() ? styles.selected : ''}
            `}
            onClick={() => {
              const selected = new Date(day.date);
              selected.setHours(0, 0, 0, 0);
              setSelectedDate(selected);
              onDateSelect(selected);
              if (!day.isCurrentMonth) {
                setCurrentMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
              }
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day.date)}
          >
            {/* Date Number */}
            <div className={styles.dateNumber}>
              {day.date.getDate()}
              {day.energyRequirement > 0 && (
                <span className={styles.energyIcon} title={`Energy Required: ${day.energyRequirement}`}>
                  {getEnergyIndicator(day.energyRequirement)}
                </span>
              )}
            </div>

            {/* Quest Indicators */}
            {day.questCount > 0 && (
              <div className={styles.questIndicators}>
                {day.quests.slice(0, 3).map((quest, qIndex) => (
                  <div
                    key={qIndex}
                    className={`${styles.questDot} ${quest.completed ? styles.completed : ''}`}
                    style={{ backgroundColor: getPriorityColor(quest) }}
                    title={quest.title}
                    draggable={!quest.completed}
                    onDragStart={(e) => handleDragStart(e, quest)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuestSelect(quest);
                    }}
                  />
                ))}
                {day.questCount > 3 && (
                  <div className={styles.questOverflow}>
                    +{day.questCount - 3}
                  </div>
                )}
              </div>
            )}

            {/* Urgent Badge */}
            {day.urgentCount > 0 && (
              <div className={styles.urgentBadge} title={`${day.urgentCount} urgent quests`}>
                🚨
              </div>
            )}

            {/* Completion Badge */}
            {day.completedCount > 0 && (
              <div className={styles.completionBadge} title={`${day.completedCount} completed`}>
                ✅
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Date Details - Hidden in unified view */}
      {!hideSelectedDateDetails && selectedDate && (
        <div className={styles.dateDetails}>
          <h3 className={styles.dateDetailsTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          {(() => {
            const selectedDay = calendarDays.find(day => 
              day.date.getTime() === selectedDate.getTime()
            );
            
            if (!selectedDay || selectedDay.quests.length === 0) {
              return (
                <div className={styles.noQuests}>
                  <span className={styles.noQuestsIcon}>📝</span>
                  <p>No quests scheduled for this day</p>
                  <button 
                    className={styles.addQuestButton}
                    onClick={() => onAddQuestForDate?.(selectedDate)}
                  >
                    Add Quest
                  </button>
                </div>
              );
            }

            return (
              <div className={styles.questList}>
                {selectedDay.quests.map((quest, index) => (
                  <div 
                    key={index} 
                    className={`${styles.questItem} ${quest.completed ? styles.questCompleted : ''}`}
                  >
                    <div className={styles.questItemHeader}>
                      <div 
                        className={styles.questPriority}
                        style={{ backgroundColor: getPriorityColor(quest) }}
                      />
                      <span className={styles.questTitle}>{quest.title}</span>
                      <div className={styles.questActions}>
                        {!quest.completed && onStartHyperfocus && (
                          (quest.priority && ['high','highest'].includes(quest.priority.toLowerCase())) ||
                          (quest.difficulty && ['hard','epic'].includes(quest.difficulty.toLowerCase()))
                        ) && (
                          <button
                            className={styles.hyperfocusButton}
                            onClick={() => onStartHyperfocus(quest)}
                            title="Start with Hyperfocus"
                          >
                            🧠⚡
                          </button>
                        )}
                        {!quest.completed && (
                          <button
                            className={styles.completeButton}
                            onClick={() => onQuestComplete(quest.title)}
                            title="Complete Quest"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          className={styles.editButton}
                          onClick={() => onQuestEdit(quest)}
                          title="Edit Quest"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                    
                    {quest.description && (
                      <p className={styles.questDescription}>{quest.description}</p>
                    )}
                    
                    {/* Subtasks Progress */}
                    {quest.subtasks && quest.subtasks.length > 0 && (
                      <div className={styles.subtasksProgress}>
                        <div className={styles.subtasksProgressLabel}>
                          ✓ {quest.subtasks.filter((st: { completed: boolean }) => st.completed).length}/{quest.subtasks.length} Subquests
                          {quest.subtasks.filter((st: { completed: boolean }) => st.completed).length === quest.subtasks.length && ' 🎉'}
                        </div>
                        <div className={styles.subtasksProgressBar}>
                          <div 
                            className={`${styles.subtasksProgressFill} ${quest.subtasks.filter((st: { completed: boolean }) => st.completed).length === quest.subtasks.length ? styles.complete : ''}`}
                            style={{ width: `${(quest.subtasks.filter((st: { completed: boolean }) => st.completed).length / quest.subtasks.length) * 100}%` }}
                          />
                        </div>
                        
                        {/* Subtasks List */}
                        <div className={styles.subtasksList}>
                          {quest.subtasks.map((subtask: { text: string; completed: boolean; description?: string }, index: number) => (
                            <div 
                              key={index} 
                              className={styles.subtaskItem}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleSubtask(quest.title, index);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className={styles.subtaskCheckbox}>
                                {subtask.completed ? '✓' : '○'}
                              </div>
                              <div className={styles.subtaskContent}>
                                <div className={`${styles.subtaskText} ${subtask.completed ? styles.completed : ''}`}>
                                  {subtask.text}
                                </div>
                                {subtask.description && (
                                  <div className={styles.subtaskDescription}>
                                    {subtask.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.questMeta}>
                      {/* Scheduled Time - if has specific time */}
                      {quest.due && quest.due.includes('T') && (
                        <span className={styles.questScheduledTime} style={{
                          backgroundColor: 'rgba(66, 135, 245, 0.2)',
                          color: '#4287f5',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          🕐 {(() => {
                            const date = new Date(quest.due);
                            return date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          })()}
                        </span>
                      )}
                      
                      {/* Duration */}
                      <span 
                        className={`${styles.questTime} ${styles.editableBadge}`}
                        onClick={() => handleStartEditing(quest.id, 'estimatedTime')}
                      >
                        ⏱️ {editingField?.questId === quest.id && editingField?.field === 'estimatedTime' ? (
                          <TimeEditor
                            currentValue={quest.estimatedTime || ''}
                            onSave={(newValue) => handleSaveEdit(newValue)}
                            onCancel={handleCancelEdit}
                          />
                        ) : (
                          quest.estimatedTime ? `${quest.estimatedTime}min` : 'No time'
                        )}
                      </span>
                      
                      {/* Difficulty */}
                      <span 
                        className={`${styles.questDifficulty} ${styles.editableBadge}`}
                        onClick={() => handleStartEditing(quest.id, 'difficulty')}
                      >
                        {editingField?.questId === quest.id && editingField?.field === 'difficulty' ? (
                          <DifficultyEditor
                            currentValue={quest.difficulty || 'easy'}
                            onSave={(newValue) => handleSaveEdit(newValue)}
                            onCancel={handleCancelEdit}
                          />
                        ) : (
                          quest.difficulty === 'easy' ? '🌱 Easy' :
                          quest.difficulty === 'medium' ? '⚖️ Medium' :
                          quest.difficulty === 'hard' ? '🔥 Hard' : 
                          '⭐ Epic'
                        )}
                      </span>
                      
                      {/* Priority Label */}
                      <span 
                        className={`${styles.questPriorityLabel} ${styles[quest.priority?.toLowerCase() || 'low']} ${styles.editableBadge}`}
                        onClick={() => handleStartEditing(quest.id, 'priority')}
                      >
                        {editingField?.questId === quest.id && editingField?.field === 'priority' ? (
                          <PriorityEditor
                            currentValue={quest.priority || 'low'}
                            onSave={(newValue) => handleSaveEdit(newValue)}
                            onCancel={handleCancelEdit}
                          />
                        ) : (
                          quest.priority?.toLowerCase() === 'high' || quest.priority?.toLowerCase() === 'highest' ? '🔴 High' :
                          quest.priority?.toLowerCase() === 'medium' ? '🟡 Medium' :
                          '🟢 Low'
                        )}
                      </span>
                      
                      {/* Energy Cost */}
                      {quest.energyCost && (
                        <span className={styles.questEnergy}>⚡ {quest.energyCost}</span>
                      )}
                    </div>
                    
                    {/* Row 2: Rewards and Skills */}
                    <div className={styles.questMetaRow}>
                      {/* XP Reward */}
                      {quest.xp && (
                        <span className={styles.questXP}>✨ {quest.xp} XP</span>
                      )}
                      
                      {/* CP Reward */}
                      {quest.cp && quest.cp > 0 && (
                        <span className={styles.questCp}>⚔️ {quest.cp} CP</span>
                      )}
                      
                      {/* Coins */}
                      {quest.coins && quest.coins > 0 && (
                        <span className={styles.questCoins}>🪙 {quest.coins}</span>
                      )}
                      
                      {/* Recurrence */}
                      {formatRecur(quest.recur) && (
                        <span className={styles.questRecurrence}>Recurring: {formatRecur(quest.recur)}</span>
                      )}
                    </div>
                    
                    {/* Skills */}
                    {quest.skills && quest.skills.length > 0 && (
                      <div className={styles.questSkills}>
                        {quest.skills.map((skill: string, idx: number) => (
                          <span key={idx} className={styles.questSkillTag}>
                            🛠️ {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
