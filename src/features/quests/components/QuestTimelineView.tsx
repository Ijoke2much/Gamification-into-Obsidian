import React, { useMemo, useState, useEffect } from 'react';
import type GamificationObsidianPlugin from '../../../core/main';
import type { Quest } from '../utils/taskParser';
import { formatRecur } from '../utils/questDisplayUtils';
import { SavedQuestsManager } from '../services/savedQuestsManager';
import { 
  PriorityEditor, 
  DifficultyEditor, 
  TimeEditor, 
  SubtaskEditor 
} from './InlineEditors';
import styles from './QuestTimelineView.module.css';

interface QuestTimelineViewProps {
  quests: Quest[];
  plugin: GamificationObsidianPlugin;
  currentEnergy: number;
  onQuestSelect: (quest: Quest) => void;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  onQuestMove: (questId: string, newDateIso: string) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  date?: Date;
  initialViewMode?: 'day' | 'workweek' | 'week';
}

type TimelineViewMode = 'day' | 'week' | 'workweek';

type PlacedQuest = {
  quest: Quest;
  startMinutes: number;
  duration: number;
};

type DayColumn = {
  date: Date;
  quests: Quest[];
  scheduled: PlacedQuest[];
  allDay: Quest[];
  energyRequired: number;
  isToday: boolean;
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function parseDurationToMin(s?: string): number {
  if (!s) return 30;
  const str = s.toLowerCase();
  const mm = str.match(/(\d+)\s*m/);
  const hh = str.match(/(\d+)\s*h/);
  if (hh && mm) return parseInt(hh[1])*60 + parseInt(mm[1]);
  if (hh) return parseInt(hh[1]) * 60;
  if (mm) return parseInt(mm[1]);
  const num = parseInt(str);
  return Number.isFinite(num) ? num : 30;
}


function parseStartMinutes(quest: Quest): number | null {
  if (quest.due && quest.due.includes('T')) {
    const t = quest.due.split('T')[1];
    const [hh, mm] = t.split(':').map(Number);
    if (Number.isFinite(hh) && Number.isFinite(mm)) return hh*60 + mm;
  }
  return null;
}


function getEnergyIcon(cost: number): string {
  if (cost <= 15) return '🟢';
  if (cost <= 30) return '🟡';
  if (cost <= 50) return '🟠';
  return '🔴';
}

function getEnergyMatchClass(questEnergy: number, currentEnergy: number): string {
  if (questEnergy <= currentEnergy * 0.3) return 'low';
  if (questEnergy <= currentEnergy * 0.6) return 'medium';
  return 'high';
}

export const QuestTimelineView: React.FC<QuestTimelineViewProps> = ({
  quests,
  plugin,
  currentEnergy,
  onQuestSelect,
  onQuestComplete,
  onQuestEdit,
  onQuestMove,
  onStartHyperfocus,
  date,
  initialViewMode = 'day'
}) => {

  const [viewMode] = useState<TimelineViewMode>(initialViewMode);
  
  // DEBUG: Log when component renders - VERY PROMINENT
  window.console.log('🚨 TIMELINE COMPONENT RENDERED 🚨');
  window.console.log('  📊 Quest count:', quests.length);
  window.console.log('  📅 View mode:', viewMode);
  window.console.log('  📋 Quest details:', quests.map(q => ({ title: q.title, due: q.due })));
  window.console.log('🚨 END TIMELINE RENDER DEBUG 🚨');
  const [currentWeek, setCurrentWeek] = useState(() => {
    const d = date || new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Local visible date for day view navigation
  const [visibleDate, setVisibleDate] = useState<Date>(() => {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  useEffect(() => {
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      setVisibleDate(d);
    }
  }, [date]);

  const [collapseEarly] = useState(true);
  const [showEnergyOverview, setShowEnergyOverview] = useState(true);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  
  // Expanded quest blocks state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  
  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<{
    questId: string;
    field: string;
    subtaskIndex?: number;
  } | null>(null);

  // Per-quest color theme for calm palette (persisted locally)
  const [blockThemes, setBlockThemes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('questBlockThemes');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('questBlockThemes', JSON.stringify(blockThemes));
    } catch (e) {
      // Ignore storage write errors (e.g., privacy mode / quota)
    }
  }, [blockThemes]);
  
  // Toggle quest block expansion
  const toggleBlockExpansion = (questId: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  };
  
  // Toggle dropdown menu
  const toggleDropdown = (questId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown(prev => prev === questId ? null : questId);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const baseStartHour = collapseEarly ? 6 : 0;
  const [, setNowTop] = useState<number | null>(null);
  const [, setLastSelectedQuestId] = useState<string | null>(null);
  const [, setDragging] = useState<PlacedQuest | null>(null);
  const handleToggleSubtask = (questTitle: string, subtaskIndex: number) => {
    try {
      // Bridge to QuestTab handler if exposed; otherwise, noop
      const fn = (window as Window & { toggleQuestSubtask?: (title: string, idx: number) => void }).toggleQuestSubtask;
      if (typeof fn === 'function') fn(questTitle, subtaskIndex);
    } catch (error) {
      console.warn('Error toggling subtask:', error);
    }
  };

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
      const { QuestSystemIntegration } = await import('../index');
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

  const handleAddSubtask = async (questId: string, text: string) => {
    if (!text.trim()) return;

    try {
      const quest = quests.find(q => q.id === questId);
      if (!quest) return;

      const newSubtasks = [...(quest.subtasks || []), { text: text.trim(), completed: false }];
      
      const { QuestSystemIntegration } = await import('../index');
      await QuestSystemIntegration.updateQuest(questId, { subtasks: newSubtasks });
      
      // Refresh the quest list
      const refreshFn = (window as Window & { refreshQuests?: () => void }).refreshQuests;
      if (typeof refreshFn === 'function') refreshFn();
      
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };

  const handleDeleteSubtask = async (questId: string, subtaskIndex: number) => {
    try {
      const quest = quests.find(q => q.id === questId);
      if (!quest) return;

      const newSubtasks = [...(quest.subtasks || [])];
      newSubtasks.splice(subtaskIndex, 1);
      
      const { QuestSystemIntegration } = await import('../index');
      await QuestSystemIntegration.updateQuest(questId, { subtasks: newSubtasks });
      
      // Refresh the quest list
      const refreshFn = (window as Window & { refreshQuests?: () => void }).refreshQuests;
      if (typeof refreshFn === 'function') refreshFn();
      
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };
  // Debug constants to mirror CSS positioning for the spine layout
  const SPINE_DEBUG = { spineLeft: 24, pillLeft: 16, nodeLeft: 18, gridMarginLeft: 56 };

  useEffect(() => {
    try {
      window.console.log('🧭 [SPINE_DEBUG] Timeline mounted', {
        viewMode,
        visibleDate: visibleDate.toISOString(),
        ...SPINE_DEBUG
      });
    } catch (error) {
      console.warn('Error logging debug info:', error);
    }
  }, [viewMode, visibleDate, SPINE_DEBUG]);

  // Now line updater
  useEffect(() => {
    const isToday = (() => {
      const t = new Date(); t.setHours(0,0,0,0);
      return t.getTime() === visibleDate.getTime();
    })();
    if (!isToday) { setNowTop(null); return; }
    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setNowTop((mins/60) * hourHeight - (baseStartHour * hourHeight));
    };
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [visibleDate, baseStartHour]);

  // Calculate day data for single day or week
  const dayColumns = useMemo(() => {
    const columns: DayColumn[] = [];
    
    window.console.log('[Timeline] Total quests received:', quests.length);
    window.console.log('[Timeline] View mode:', viewMode);
    window.console.log('[Timeline] Visible date:', visibleDate.toISOString());
    
    if (viewMode === 'day') {
      columns.push(calculateDayData(visibleDate, quests));
    } else {
      // Week or workweek view
      const startOfWeek = new Date(currentWeek);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const numDays = viewMode === 'workweek' ? 5 : 7;
      for (let i = 0; i < numDays; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + (viewMode === 'workweek' ? i + 1 : i)); // workweek starts Monday
        columns.push(calculateDayData(day, quests));
      }
    }
    
    window.console.log('[Timeline] Day columns calculated:', columns.length);
    columns.forEach((col, idx) => {
      window.console.log(`[Timeline] Day ${idx}:`, {
        date: col.date.toISOString(),
        totalQuests: col.quests.length,
        scheduled: col.scheduled.length,
        allDay: col.allDay.length,
        energyRequired: col.energyRequired
      });
    });
    
    return columns;
  }, [viewMode, currentWeek, visibleDate, quests]);

  function calculateDayData(date: Date, allQuests: Quest[]): DayColumn {
    const dayISO = toISODate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    window.console.log('[Timeline] ═══════════════════════════════════════');
    window.console.log('[Timeline] calculateDayData for:', dayISO);
    window.console.log('[Timeline] Today is:', today.toISOString());
    window.console.log('[Timeline] View mode:', viewMode);
    window.console.log('[Timeline] Total quests received:', allQuests.length);
    window.console.log('[Timeline] All quests:', allQuests.map(q => ({ 
      title: q.title, 
      due: q.due, 
      today: q.today,
      completed: q.completed
    })));
    
    // Filter quests for this day - improved date matching
    const dayQuests = allQuests.filter(q => {
      // Skip completed quests
      if (q.completed) {
        window.console.log(`[Timeline] ❌ Skipping "${q.title}" - completed`);
        return false;
      }
      
      // Match by today flag
      if (q.today && date.getTime() === today.getTime()) {
        window.console.log(`[Timeline] ✅ Including "${q.title}" - marked as today`);
        return true;
      }
      
      // No due date - skip
      if (!q.due) {
        window.console.log(`[Timeline] ❌ Skipping "${q.title}" - no due date`);
        return false;
      }
      
      // Extract date part from due (handles both YYYY-MM-DD and YYYY-MM-DDTHH:MM)
      const questDateStr = q.due.includes('T') ? q.due.split('T')[0] : q.due;
      
      window.console.log(`[Timeline] Checking "${q.title}": questDate=${questDateStr}, dayISO=${dayISO}`);
      
      // Direct date match
      if (questDateStr === dayISO) {
        window.console.log(`[Timeline] ✅ Including "${q.title}" - exact date match`);
        return true;
      }
      
      // In day view, also show overdue quests that need attention
      if (viewMode === 'day') {
        try {
          const questDate = new Date(questDateStr + 'T00:00:00');
          const viewDate = new Date(dayISO + 'T00:00:00');
          const isOverdue = questDate.getTime() < viewDate.getTime();
          window.console.log(`[Timeline] Overdue check for "${q.title}": questDate=${questDate.toISOString()}, viewDate=${viewDate.toISOString()}, isOverdue=${isOverdue}`);
          if (isOverdue) {
            window.console.log(`[Timeline] ✅ Including "${q.title}" - overdue quest`);
            return true;
          }
        } catch (e) {
          console.warn('[Timeline] Invalid date format:', q.due);
        }
      }
      
      window.console.log(`[Timeline] ❌ Skipping "${q.title}" - no match`);
      return false;
    });
    
    window.console.log('[Timeline] Filtered dayQuests:', dayQuests.length, dayQuests.map(q => q.title));

    // Separate scheduled (with time) and all-day (date only) quests
    const scheduled: PlacedQuest[] = [];
    const allDay: Quest[] = [];
    
    window.console.log('[Timeline] ====== Separating quests into scheduled/all-day ======');
    for (const q of dayQuests) {
      const start = parseStartMinutes(q);
      const dur = parseDurationToMin(q.estimatedTime);
      window.console.log(`[Timeline] Quest: "${q.title}"`, {
        due: q.due,
        hasT: q.due?.includes('T'),
        startMinutes: start,
        duration: dur,
        willBeScheduled: start !== null
      });
      if (start !== null) {
        scheduled.push({ quest: q, startMinutes: start, duration: Math.max(30, Math.min(240, dur)) });
        window.console.log(`[Timeline] ✅ SCHEDULED at ${Math.floor(start/60)}:${(start%60).toString().padStart(2,'0')}`);
      } else {
        allDay.push(q);
        window.console.log(`[Timeline] ✅ ALL DAY (no time found in due date)`);
      }
    }
    window.console.log('[Timeline] ====== Final counts ======');
    window.console.log(`[Timeline] Scheduled: ${scheduled.length}, All Day: ${allDay.length}`);

    // Calculate total energy required
    const energyRequired = dayQuests.reduce((sum, q) => sum + (q.energyCost || 10), 0);

    return {
      date,
      quests: dayQuests,
      scheduled,
      allDay,
      energyRequired,
      isToday: date.getTime() === today.getTime()
    };
  }

  const hourHeight = viewMode === 'day' ? 60 : 50; // More space in day view, 50px for week views

  // Human-friendly duration label (e.g., 67 -> "1 hr 7 min", 120 -> "2 hrs")
  const formatMinutesHuman = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} ${h === 1 ? 'hr' : 'hrs'} ${m} min`;
    if (h > 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    return `${m} min`;
  };



  // Note: Drop is handled per day via handleDropForDay within each day column

  const navigateWeek = (direction: number) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const formatWeekRange = (week: Date) => {
    const start = new Date(week);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const totalScheduledEnergy = dayColumns.reduce((sum, col) => sum + col.energyRequired, 0);
  const isOvercommitted = viewMode === 'day' ? totalScheduledEnergy > currentEnergy : false;

  // Get unscheduled quests (quests with due date but no time) - show all active date-only quests
  const unscheduledQuests = useMemo(() => {
    const filtered = quests.filter(q => {
      if (!q.due || q.completed) return false;
      // Include both date-only quests and overdue quests needing scheduling
      const isDateOnly = !q.due.includes('T');
      return isDateOnly;
    });
    window.console.log('[Timeline] Unscheduled quests:', filtered.length, filtered.map(q => ({ 
      title: q.title, 
      due: q.due 
    })));
    return filtered;
  }, [quests]);

  return (
    <div className={`${styles.wrapper} ${styles.minimal} ${viewMode !== 'day' ? styles.weekView : ''}`}>
      {/* Debug Info - Only show if no quests are found */}
      {quests.length === 0 && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          color: '#856404'
        }}>
          <strong>⚠️ No quests found in any date</strong>
          <p style={{ margin: '8px 0', fontSize: '13px' }}>
            The timeline couldn't find any quests in your GamifiedTasks.md file.
          </p>
          <button
            onClick={() => {
              window.console.log('🔄 Forcing quest reload...');
              const win = window as Window & { manualLoadQuests?: () => void };
              win.manualLoadQuests?.();
            }}
            style={{
              background: '#ffc107',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#856404'
            }}
          >
            🔄 Reload Quests
          </button>
        </div>
      )}

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
          <button className={styles.navButton} onClick={() => navigateWeek(-1)}>← Previous Week</button>
          <h3 className={styles.weekTitle}>{formatWeekRange(currentWeek)}</h3>
          <button className={styles.navButton} onClick={() => navigateWeek(1)}>Next Week →</button>
        </div>
      ) : (
        <div className={styles.dayNavigation}>
          <button className={styles.navButton} onClick={() => {
            const prev = new Date(visibleDate);
            prev.setDate(prev.getDate() - 1);
            setVisibleDate(prev);
          }}>← Previous Day</button>
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
          <button className={styles.navButton} onClick={() => {
            const next = new Date(visibleDate);
            next.setDate(next.getDate() + 1);
            setVisibleDate(next);
          }}>Next Day →</button>
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
            ⚠️ Scheduled tasks require {totalScheduledEnergy} energy (you have {currentEnergy})
          </div>
        )}

        {currentEnergy >= 70 && viewMode === 'day' && (
          <div className={styles.hyperfocusAvailable}>
            ✨ Hyperfocus available! Perfect for challenging tasks.
          </div>
        )}

        <div className={styles.controls}>
          <button
            className={`${styles.controlBtn} ${showEnergyOverview ? styles.active : ''}`}
            onClick={() => setShowEnergyOverview(!showEnergyOverview)}
            title="Toggle Energy Overview"
          >
            ⚡ Energy View
          </button>
          <button
            className={`${styles.controlBtn} ${showUnscheduled ? styles.active : ''}`}
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            title="Toggle Unscheduled Quests"
          >
            📋 Unscheduled ({unscheduledQuests.length})
          </button>
        </div>
      </div>

      {/* Weekly Energy Overview */}
      {viewMode !== 'day' && showEnergyOverview && (
        <div className={styles.weeklyEnergyOverview}>
          <div className={styles.energyOverviewTitle}>Weekly Energy Distribution</div>
          <div className={styles.energyColumns}>
            {dayColumns.map((col, idx) => (
              <div key={idx} className={styles.energyColumn}>
                <div className={styles.dayLabel}>
                  {col.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={styles.energyBarVertical}>
                  <div 
                    className={`${styles.energyFillVertical} ${col.energyRequired > 100 ? styles.overcommit : ''}`}
                    style={{ height: `${Math.min(col.energyRequired, 150)}%` }}
                    title={`${col.energyRequired} energy required`}
                  />
                </div>
                <div className={styles.energyValue}>{col.energyRequired}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled Quests Section */}
      {showUnscheduled && unscheduledQuests.length > 0 && (
        <div className={styles.unscheduledSection}>
          <div className={styles.unscheduledHeader}>
            <h4>📋 Unscheduled Quests ({unscheduledQuests.length})</h4>
            <p className={styles.hint}>Click a quest to view details or edit to schedule</p>
          </div>
          <div className={styles.unscheduledQuests}>
            {unscheduledQuests.slice(0, 5).map(quest => (
              <div
                key={quest.id}
                className={styles.unscheduledQuest}
                draggable={true}
                onDragStart={(e) => {
                  const dummyBlock: PlacedQuest = {
                    quest,
                    startMinutes: 540, // 9am default
                    duration: parseDurationToMin(quest.estimatedTime)
                  };
                  setDragging(dummyBlock);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDragging(null)}
                onClick={() => onQuestSelect(quest)}
              >
                <div className={styles.energyBadge}>
                  {getEnergyIcon(quest.energyCost || 10)} {quest.energyCost || 10}
                </div>
                <div className={styles.questInfo}>
                  <div className={styles.questTitle}>{quest.title}</div>
                  <div className={styles.questMeta}>
                    {quest.estimatedTime && `⏱️ ${quest.estimatedTime}`}
                    {formatRecur(quest.recur) && ` • Recurring: ${formatRecur(quest.recur)}`}
                    {quest.priority && ` • ${quest.priority}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Grid */}
      <div className={`${styles.timelineContainer} ${viewMode !== 'day' ? styles.weekView : styles.dayView}`}>
        {dayColumns.map((dayCol, dayIdx) => (
          <div key={dayIdx} className={styles.dayColumn}>
            {/* Day Header (for week views) */}
            {viewMode !== 'day' && (
              <div className={`${styles.dayHeader} ${dayCol.isToday ? styles.today : ''}`}>
                <div className={styles.dayName}>
                  {dayCol.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={styles.dayDate}>
                  {dayCol.date.getDate()}
                </div>
                <div className={styles.questCount}>
                  {dayCol.quests.length} {dayCol.quests.length === 1 ? 'quest' : 'quests'}
                </div>
              </div>
            )}

            {/* All-Day Quests Section */}
            {dayCol.allDay.length > 0 && (
              <div className={styles.allDaySection}>
                <div className={styles.allDayLabel}>All Day</div>
                {dayCol.allDay.map(quest => (
                  <div
                    key={quest.id}
                    className={`${styles.allDayQuest} ${styles[getEnergyMatchClass(quest.energyCost || 10, currentEnergy)]}`}
                    onClick={() => onQuestSelect(quest)}
                    onDoubleClick={() => onQuestEdit(quest)}
                  >
                    <div className={styles.energyBadge}>
                      {getEnergyIcon(quest.energyCost || 10)} {quest.energyCost || 10}
                    </div>
                    <div className={styles.questContent}>
                      <div className={styles.questTitle}>
                        {quest.completed && '✅ '}
                        {quest.title}
                      </div>
                      {quest.estimatedTime && (
                        <div className={styles.questMeta}>⏱️ {quest.estimatedTime}</div>
                      )}
                      {formatRecur(quest.recur) && (
                        <div className={styles.questMeta}>Recurring: {formatRecur(quest.recur)}</div>
                      )}
                    </div>
                    {!quest.completed && (
                      <button
                        className={styles.completeBtn}
                        onClick={(e) => { e.stopPropagation(); onQuestComplete(quest.title); }}
                        title="Complete"
                      >✓</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timeline - Simplified list for day view, hourly grid for week views */}
            {viewMode === 'day' ? (
              /* SIMPLIFIED LIST VIEW FOR DAY MODE */
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                padding: '20px 0',
                maxWidth: '100%',
                overflowX: 'hidden',
                width: '100%'
              }}>
                {dayCol.scheduled.length === 0 ? (
                  <div className={styles.emptyTimeline}>
                    <div className={styles.emptyMessage}>
                      <div className={styles.emptyIcon}>📅</div>
                      <div className={styles.emptyTitle}>No quests scheduled for this date</div>
                      <div className={styles.emptySubtitle}>
                        {quests.length > 0 ? (
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
                      textColor = '#052e16'; // dark green for mint background
                    } else if (themeClass === 'calmBlue') {
                      borderColor = '#3b82f6';
                      textColor = '#172554'; // dark blue for blue background
                    } else if (themeClass === 'calmLavender') {
                      borderColor = '#8b5cf6';
                      textColor = '#312e81'; // dark purple for lavender background
                    } else if (themeClass === 'calmPeach') {
                      borderColor = '#f59e0b';
                      textColor = '#7c2d12'; // dark orange for peach background
                    } else if (themeClass === 'calmGray') {
                      borderColor = '#6b7280';
                      textColor = '#1f2937'; // dark gray for gray background
                    } else if (themeClass === 'calmRose') {
                      borderColor = '#f43f5e';
                      textColor = '#7f1d1d'; // dark red for rose background
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
                    const showGap = gapMinutes && gapMinutes > 0;
                    
                    return (
                      <div key={block.quest.id}>
                        {/* Time marker and connector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                          <div style={{
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            width: '48px',
                            color: isCurrentTask ? '#f59e0b' : 'var(--text-muted)',
                            textAlign: 'right'
                          }}>
                            {time}
                          </div>
                          <div style={{
                            width: '4px',
                            height: isCurrentTask ? '16px' : '12px',
                            borderRadius: '2px',
                            background: isCurrentTask ? '#f59e0b' : 'var(--background-modifier-border)',
                            transition: 'all 0.2s'
                          }} />
                          
                          {/* Gap indicator */}
                          {showGap && (
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              opacity: 0.7
                            }}>
                              {formatMinutesHuman(gapMinutes)} free
                            </div>
                          )}
                        </div>

                        {/* Quest Card */}
                        <div
                          className={`
                            ${styles.block} 
                            ${styles[`energy_${energyMatch}`]}
                            ${themeClass ? styles[themeClass] : ''}
                            ${isHyperfocusOptimal ? styles.hyperfocusOptimal : ''}
                            ${block.quest.completed ? styles.completed : ''}
                            ${isExpanded ? styles.expanded : ''}
                            ${isCurrentTask ? styles.currentTask : ''}
                          `}
                          style={{
                            marginLeft: '27px',
                            marginRight: '16px',
                            marginBottom: '16px',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${borderColor}`,
                            background: block.quest.completed ? 'rgba(var(--background-modifier-border-rgb), 0.4)' : 
                                        isCurrentTask ? `${borderColor}10` : 'var(--background-secondary)',
                            opacity: block.quest.completed ? 0.6 : 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            border: isCurrentTask ? `2px solid ${borderColor}40` : undefined,
                            boxShadow: isCurrentTask ? `0 0 20px ${borderColor}30` : undefined,
                            padding: '16px',
                            zIndex: isExpanded || isDropdownOpen ? 100 : 2,
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            width: '87%'
                          }}
                          onClick={() => { if (!isDropdownOpen) { setLastSelectedQuestId(block.quest.id); onQuestSelect(block.quest); } }}
                        >
                          {/* Card Header */}
                          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '12px', flex: 1, minWidth: 0 }}>
                              {/* Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuestComplete(block.quest.title);
                                }}
                                style={{
                                  marginTop: '4px',
                                  flexShrink: 0,
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  transition: 'transform 0.2s',
                                  fontSize: '20px'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                {block.quest.completed ? (
                                  <span style={{ color: '#10b981' }}>✓</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>○</span>
                                )}
                              </button>

                              {/* Quest Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{
                                    fontWeight: '600',
                                    fontSize: '16px',
                                    color: block.quest.completed ? 'var(--text-muted)' : (themeClass ? textColor : 'var(--text-normal)'),
                                    textDecoration: block.quest.completed ? 'line-through' : 'none'
                                  }}>
                                    {block.quest.title}
                                  </span>
                                  {block.quest.priority?.toLowerCase() === 'high' && !block.quest.completed && (
                                    <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>⚡ URGENT</span>
                                  )}
                                </div>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: themeClass ? `${textColor}99` : 'var(--text-muted)', 
                                  margin: 0 
                                }}>
                                  {time} - {endTime} • {durationLabel}
                                </p>
                                {(block.quest.description || block.quest.notes) && !isExpanded && (
                                  <p style={{ 
                                    fontSize: '11px', 
                                    color: themeClass ? `${textColor}99` : 'var(--text-muted)', 
                                    marginTop: '4px',
                                    fontStyle: 'italic',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {block.quest.description || block.quest.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Expand Button & Menu */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                              <button
                                className={`${styles.chevronButton} ${isExpanded ? styles.chevronOpen : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleBlockExpansion(block.quest.id); }}
                                aria-label={isExpanded ? 'Collapse details' : 'View details'}
                                type="button"
                              >
                                ▾
                              </button>
                              <button
                                className={styles.menuButton}
                                onClick={(e) => toggleDropdown(block.quest.id, e)}
                                aria-label="Quest actions"
                                type="button"
                              >
                                ⋮
                              </button>
                            </div>
                          </div>

                          {/* Collapsed Rewards Summary */}
                          {!isExpanded && (
                            <div style={{ padding: '8px 0 0 44px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {/* Energy Badge */}
                              <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#059669',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}>
                                {getEnergyIcon(energy)} {energy}
                              </span>
                              
                              {block.quest.xp && block.quest.xp > 0 && (
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(251, 191, 36, 0.15)',
                                  color: '#d97706',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  border: '1px solid rgba(251, 191, 36, 0.3)'
                                }}>
                                  ✨ {block.quest.xp}
                                </span>
                              )}
                              {typeof block.quest.cp === 'number' && (
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#2563eb',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  border: '1px solid rgba(59, 130, 246, 0.3)'
                                }}>
                                  ⚡ {block.quest.cp}
                                </span>
                              )}
                              {block.quest.coins && block.quest.coins > 0 && (
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#d97706',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  border: '1px solid rgba(245, 158, 11, 0.3)'
                                }}>
                                  🪙 {block.quest.coins}
                                </span>
                              )}
                            </div>
                          )}

                          {/* EXPANDED CONTENT - KEEP ALL EXISTING FEATURES */}
                          {isExpanded && (
                            <div style={{ 
                              borderTop: '1px solid var(--background-modifier-border)', 
                              marginTop: '16px',
                              paddingTop: '16px'
                            }}>
                              {/* Objective/Description */}
                              {(block.quest.description || block.quest.notes) && (
                                <div style={{ marginBottom: '16px' }}>
                                  <p style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-muted)', 
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                  }}>
                                    OBJECTIVE
                                  </p>
                                  <p style={{ 
                                    fontSize: '13px', 
                                    color: 'var(--text-normal)', 
                                    fontStyle: 'italic',
                                    lineHeight: '1.5',
                                    margin: 0
                                  }}>
                                    {block.quest.description || block.quest.notes}
                                  </p>
                                </div>
                              )}

                              {/* Rewards Row */}
                              <div style={{ marginBottom: '16px' }}>
                                <p style={{ 
                                  fontSize: '11px', 
                                  color: 'var(--text-muted)', 
                                  marginBottom: '8px',
                                  textTransform: 'uppercase',
                                  fontWeight: '700',
                                  letterSpacing: '0.5px'
                                }}>
                                  REWARDS
                                </p>
                                <div className={styles.rewardsRow}>
                                  {typeof block.quest.xp === 'number' && block.quest.xp > 0 && (
                                    <span className={`${styles.rewardChip} ${styles.xpChip}`}>✨ {block.quest.xp} XP</span>
                                  )}
                                  {typeof block.quest.cp === 'number' && block.quest.cp >= 0 && (
                                    <span className={`${styles.rewardChip} ${styles.cpChip}`}>⚡ {Number(block.quest.cp)} CP</span>
                                  )}
                                  {typeof block.quest.coins === 'number' && block.quest.coins > 0 && (
                                    <span className={`${styles.rewardChip} ${styles.coinsChip}`}>🪙 {block.quest.coins}</span>
                                  )}
                                  {formatRecur(block.quest.recur) && (
                                    <span className={`${styles.rewardChip} ${styles.recurChip}`}>♻️ {formatRecur(block.quest.recur)}</span>
                                  )}
                                </div>
                              </div>

                              {/* Skills */}
                              {Array.isArray(block.quest.skills) && block.quest.skills.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                  <p style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-muted)', 
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                  }}>
                                    SKILLS
                                  </p>
                                  <div className={styles.questSkills}>
                                    {block.quest.skills.map((skill: string, idx: number) => (
                                      <span key={idx} className={styles.questSkillTag}>🛠️ {skill}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Details Grid */}
                              <div style={{ marginBottom: '16px' }}>
                                <p style={{ 
                                  fontSize: '11px', 
                                  color: 'var(--text-muted)', 
                                  marginBottom: '8px',
                                  textTransform: 'uppercase',
                                  fontWeight: '700',
                                  letterSpacing: '0.5px'
                                }}>
                                  DETAILS
                                </p>
                              <div className={styles.metaRow}>
                                <div className={styles.metaBadge}>
                                  <span className={styles.metaLabel}>Energy</span>
                                  <span className={styles.metaValue}>{getEnergyIcon(energy)} {energy}</span>
                                </div>
                                <div 
                                  className={`${styles.metaBadge} ${styles.editableBadge}`}
                                  onClick={() => handleStartEditing(block.quest.id, 'estimatedTime')}
                                >
                                  <span className={styles.metaLabel}>Duration</span>
                                  <span className={styles.metaValue}>
                                    {editingField?.questId === block.quest.id && editingField?.field === 'estimatedTime' ? (
                                      <TimeEditor
                                        currentValue={block.quest.estimatedTime || ''}
                                        onSave={(newValue) => handleSaveEdit(newValue)}
                                        onCancel={handleCancelEdit}
                                      />
                                    ) : (
                                      formatMinutesHuman(block.duration)
                                    )}
                                  </span>
                                </div>
                                <div 
                                  className={`${styles.metaBadge} ${styles.editableBadge}`}
                                  onClick={() => handleStartEditing(block.quest.id, 'priority')}
                                >
                                  <span className={styles.metaLabel}>Priority</span>
                                  <span className={styles.metaValue}>
                                    {editingField?.questId === block.quest.id && editingField?.field === 'priority' ? (
                                      <PriorityEditor
                                        currentValue={block.quest.priority || 'low'}
                                        onSave={(newValue) => handleSaveEdit(newValue)}
                                        onCancel={handleCancelEdit}
                                      />
                                    ) : (
                                      block.quest.priority ? (
                                        block.quest.priority.toLowerCase() === 'high' || block.quest.priority.toLowerCase() === 'highest' ? 'High' :
                                        block.quest.priority.toLowerCase() === 'medium' ? 'Medium' : 'Low'
                                      ) : 'Low'
                                    )}
                                  </span>
                                </div>
                                <div 
                                  className={`${styles.metaBadge} ${styles.editableBadge}`}
                                  onClick={() => handleStartEditing(block.quest.id, 'difficulty')}
                                >
                                  <span className={styles.metaLabel}>Difficulty</span>
                                  <span className={styles.metaValue}>
                                    {editingField?.questId === block.quest.id && editingField?.field === 'difficulty' ? (
                                      <DifficultyEditor
                                        currentValue={block.quest.difficulty || 'easy'}
                                        onSave={(newValue) => handleSaveEdit(newValue)}
                                        onCancel={handleCancelEdit}
                                      />
                                    ) : (
                                      block.quest.difficulty === 'easy' ? 'Easy' :
                                      block.quest.difficulty === 'medium' ? 'Medium' :
                                      block.quest.difficulty === 'hard' ? 'Hard' : 'Epic'
                                    )}
                                  </span>
                                </div>
                              </div>
                              </div>

                              {/* Subtasks (PRESERVED) */}
                              {Array.isArray(block.quest.subtasks) && block.quest.subtasks.length > 0 && (
                                <div className={styles.subtasksContainer}>
                                  <div className={styles.subtasksHeader}>Sub Quests</div>
                                  {block.quest.subtasks.map((st: { text: string; completed?: boolean; estimatedMinutes?: number }, idx: number) => (
                                    <label key={idx} className={styles.subtaskRow} onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={!!st.completed}
                                        onChange={() => handleToggleSubtask(block.quest.title, idx)}
                                      />
                                      <span className={styles.subtaskText}>{st.text}</span>
                                      {st.estimatedMinutes && (
                                        <span className={styles.subtaskTime}>{st.estimatedMinutes}m</span>
                                      )}
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons (PRESERVED) */}
                              <div className={styles.expandedFooter}>
                                <button 
                                  className={styles.menuButton} 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onQuestSelect(block.quest);
                                  }} 
                                  title="Start now"
                                >
                                  🚀 Start Now
                                </button>
                                <button 
                                  className={styles.menuButton} 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (onStartHyperfocus) {
                                      onStartHyperfocus(block.quest);
                                    }
                                  }} 
                                  title={isHyperfocusOptimal 
                                    ? "Start Hyperfocus Mode (High energy + Hard quest = Optimal!)" 
                                    : "Hyperfocus available when energy ≥70 and quest is Hard"}
                                  disabled={!isHyperfocusOptimal}
                                  style={{ opacity: isHyperfocusOptimal ? 1 : 0.5 }}
                                >
                                  🧠⚡ Hyperfocus
                                </button>
                                <button 
                                  className={styles.menuButton} 
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    try {
                                      SavedQuestsManager.saveQuestForLater(
                                        {
                                          id: block.quest.id,
                                          title: block.quest.title,
                                          difficulty: block.quest.difficulty,
                                          priority: block.quest.priority,
                                          estimatedTime: block.quest.estimatedTime
                                        },
                                        currentEnergy
                                      );
                                    } catch (error) {
                                      console.error('Error saving quest:', error);
                                    }
                                  }} 
                                  title="Save for later"
                                >
                                  💾 Save Later
                                </button>
                              </div>
                            </div>
                          )}

                          {/* COLOR PALETTE DROPDOWN (PRESERVED) */}
                          {isDropdownOpen && (
                            <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                              <div className={styles.dropdownSectionTitle}>Quick Actions</div>
                              {/* Change color palette inline */}
                              <div className={styles.dropdownInfo}>
                                <span>Change Color</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {(['calmMint','calmBlue','calmLavender','calmPeach','calmGray','calmRose'] as const).map(k => (
                                    <button 
                                      key={k} 
                                      className={`${styles.paletteSwatch} ${styles[k]}`} 
                                      title={k}
                                      onClick={() => { 
                                        setBlockThemes(prev => ({ ...prev, [block.quest.id]: k })); 
                                        setOpenDropdown(null);
                                      }} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <button
                                className={styles.dropdownItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuestEdit(block.quest);
                                  setOpenDropdown(null);
                                }}
                              >✏️ Edit Quest</button>
                              <button
                                className={styles.dropdownItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuestComplete(block.quest.title);
                                  setOpenDropdown(null);
                                }}
                              >✅ Complete</button>
                              <div className={styles.dropdownDivider} />
                              <button
                                className={styles.dropdownItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dateOnly = block.quest.due?.split('T')[0];
                                  if (dateOnly) onQuestMove(block.quest.id, dateOnly);
                                  setOpenDropdown(null);
                                }}
                              >
                                <span className={styles.dropdownIcon}>🗑️</span>
                                <span>Unschedule</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* CLEAN LIST VIEW FOR WEEK VIEWS */
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                padding: '12px 0',
                width: '100%'
              }}>
                {dayCol.scheduled.length === 0 ? (
                  <div className={styles.emptyTimeline}>
                    <div className={styles.emptyMessage}>
                      <div className={styles.emptyIcon}>📅</div>
                      <div className={styles.emptyTitle}>No quests scheduled</div>
                    </div>
                  </div>
                ) : (
                  [...dayCol.scheduled]
                    .sort((a, b) => a.startMinutes - b.startMinutes)
                    .map((block, blockIdx) => {
                      const energy = block.quest.energyCost ?? 10;
                      const energyMatch = getEnergyMatchClass(energy, currentEnergy);
                      const isHyperfocusOptimal = block.quest.difficulty === 'hard' && currentEnergy >= 70;
                      const isExpanded = expandedBlocks.has(block.quest.id);
                      const isDropdownOpen = openDropdown === block.quest.id;
                      
                      const startHour = Math.floor(block.startMinutes / 60);
                      const startMin = block.startMinutes % 60;
                      const endMinutes = block.startMinutes + block.duration;
                      const endHour = Math.floor(endMinutes / 60);
                      const endMin = endMinutes % 60;
                      
                      // Convert to 12-hour format
                      const formatTime12 = (h: number, m: number) => {
                        const period = h >= 12 ? 'PM' : 'AM';
                        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
                      };
                      
                      const timeStart = formatTime12(startHour, startMin);
                      const timeEnd = formatTime12(endHour, endMin);
                      const durationLabel = formatMinutesHuman(block.duration);
                      
                      const now = new Date();
                      const currentMinutes = now.getHours() * 60 + now.getMinutes();
                      const isCurrentTask = dayCol.isToday && 
                        currentMinutes >= block.startMinutes && 
                        currentMinutes < (block.startMinutes + block.duration);
                      
                      const themeClass = blockThemes[block.quest.id];
                      let borderColor = '#3b82f6';
                      let textColor = 'var(--text-normal)';
                      
                      if (themeClass === 'calmMint') { borderColor = '#10b981'; textColor = '#052e16'; }
                      else if (themeClass === 'calmBlue') { borderColor = '#3b82f6'; textColor = '#172554'; }
                      else if (themeClass === 'calmLavender') { borderColor = '#8b5cf6'; textColor = '#312e81'; }
                      else if (themeClass === 'calmPeach') { borderColor = '#f59e0b'; textColor = '#7c2d12'; }
                      else if (themeClass === 'calmGray') { borderColor = '#6b7280'; textColor = '#1f2937'; }
                      else if (themeClass === 'calmRose') { borderColor = '#f43f5e'; textColor = '#7f1d1d'; }
                      else if (energyMatch === 'low') borderColor = '#34D399';
                      else if (energyMatch === 'medium') borderColor = '#F59E0B';
                      else if (energyMatch === 'high') borderColor = '#EF4444';

                      return (
                        <div key={block.quest.id}>
                          {/* Time marker with gap indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                            <div style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              width: '40px',
                              color: isCurrentTask ? '#f59e0b' : 'var(--text-muted)',
                              textAlign: 'right'
                            }}>
                              {timeStart}
                            </div>
                            <div style={{
                              width: '3px',
                              height: isCurrentTask ? '14px' : '10px',
                              borderRadius: '2px',
                              background: isCurrentTask ? '#f59e0b' : 'var(--background-modifier-border)',
                              transition: 'all 0.2s'
                            }} />
                          </div>

                          {/* Quest Card */}
                          <div
                            className={`
                              ${styles.block}
                              ${styles[`energy_${energyMatch}`]}
                              ${themeClass ? styles[themeClass] : ''}
                              ${isHyperfocusOptimal ? styles.hyperfocusOptimal : ''}
                              ${block.quest.completed ? styles.completed : ''}
                              ${isExpanded ? styles.expanded : ''}
                              ${isCurrentTask ? styles.currentTask : ''}
                            `}
                            style={{
                              marginLeft: '16px',
                              marginRight: '8px',
                              marginBottom: '12px',
                              borderRadius: '8px',
                              borderLeft: `4px solid ${borderColor}`,
                              background: block.quest.completed ? 'rgba(var(--background-modifier-border-rgb), 0.4)' : 
                                          isCurrentTask ? `${borderColor}10` : 'var(--background-secondary)',
                              opacity: block.quest.completed ? 0.6 : 1,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative',
                              border: isCurrentTask ? `2px solid ${borderColor}40` : undefined,
                              boxShadow: isCurrentTask ? `0 0 20px ${borderColor}30` : undefined,
                              padding: '12px',
                              zIndex: isExpanded || isDropdownOpen ? 100 : 2,
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              width: '90%'
                            }}
                            onClick={() => { if (!isDropdownOpen) { setLastSelectedQuestId(block.quest.id); onQuestSelect(block.quest); } }}
                          >
                            {/* Card Header */}
                            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'start', gap: '10px', flex: 1, minWidth: 0 }}>
                                {/* Checkbox */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuestComplete(block.quest.title);
                                  }}
                                  style={{
                                    marginTop: '2px',
                                    flexShrink: 0,
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'transform 0.2s',
                                    fontSize: '18px'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  {block.quest.completed ? (
                                    <span style={{ color: '#10b981' }}>✓</span>
                                  ) : (
                                    <span style={{ 
                                      display: 'inline-block', 
                                      width: '16px', 
                                      height: '16px', 
                                      border: `2px solid ${textColor}40`,
                                      borderRadius: '4px'
                                    }} />
                                  )}
                                </button>

                                {/* Title & Time */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    color: textColor,
                                    marginBottom: '4px',
                                    lineHeight: '1.3'
                                  }}>
                                    {block.quest.title}
                                  </div>
                                  <div style={{
                                    fontSize: '11px',
                                    color: textColor,
                                    opacity: 0.7,
                                    fontWeight: '600'
                                  }}>
                                    {timeStart} - {timeEnd} • {durationLabel}
                                  </div>
                                  {(block.quest.description || block.quest.notes) && !isExpanded && (
                                    <div style={{
                                      fontSize: '10px',
                                      color: textColor,
                                      opacity: 0.6,
                                      marginTop: '4px',
                                      fontStyle: 'italic'
                                    }}>
                                      {String(block.quest.description || block.quest.notes).substring(0, 50)}...
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button
                                  className={`${styles.chevronButton} ${isExpanded ? styles.chevronOpen : ''}`}
                                  onClick={(e) => { e.stopPropagation(); toggleBlockExpansion(block.quest.id); }}
                                  aria-label={isExpanded ? 'Collapse details' : 'View details'}
                                  type="button"
                                >
                                  ▾
                                </button>
                                <button
                                  className={styles.menuButton}
                                  onClick={(e) => toggleDropdown(block.quest.id, e)}
                                  aria-label="Quest actions"
                                  type="button"
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>

                            {/* Collapsed Rewards Summary */}
                            {!isExpanded && (
                              <div style={{ 
                                display: 'flex', 
                                gap: '6px', 
                                marginTop: '10px',
                                flexWrap: 'wrap'
                              }}>
                                {typeof block.quest.xp === 'number' && block.quest.xp > 0 && (
                                  <span style={{
                                    padding: '3px 8px',
                                    background: 'rgba(251, 191, 36, 0.2)',
                                    border: '1px solid rgba(251, 191, 36, 0.4)',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#92400e'
                                  }}>
                                    ✨ {block.quest.xp}
                                  </span>
                                )}
                                {typeof block.quest.cp === 'number' && block.quest.cp > 0 && (
                                  <span style={{
                                    padding: '3px 8px',
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    border: '1px solid rgba(168, 85, 247, 0.4)',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#581c87'
                                  }}>
                                    ⚡ {block.quest.cp}
                                  </span>
                                )}
                                {typeof block.quest.coins === 'number' && block.quest.coins > 0 && (
                                  <span style={{
                                    padding: '3px 8px',
                                    background: 'rgba(217, 119, 6, 0.2)',
                                    border: '1px solid rgba(217, 119, 6, 0.4)',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#92400e'
                                  }}>
                                    🪙 {block.quest.coins}
                                  </span>
                                )}
                                {formatRecur(block.quest.recur) && (
                                  <span style={{
                                    padding: '3px 8px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#065f46'
                                  }}>
                                    ♻️ Weekly
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div style={{ marginTop: '16px' }}>
                                {/* Objective/Description */}
                                {(block.quest.description || block.quest.notes) && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <p style={{ 
                                      fontSize: '11px', 
                                      color: 'var(--text-muted)', 
                                      marginBottom: '6px',
                                      textTransform: 'uppercase',
                                      fontWeight: '700',
                                      letterSpacing: '0.5px'
                                    }}>
                                      OBJECTIVE
                                    </p>
                                    <p style={{
                                      fontSize: '12px',
                                      color: textColor,
                                      opacity: 0.8,
                                      lineHeight: '1.5',
                                      margin: 0
                                    }}>
                                      {String(block.quest.description || block.quest.notes)}
                                    </p>
                                  </div>
                                )}

                                {/* Rewards */}
                                <div style={{ marginBottom: '16px' }}>
                                  <p style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-muted)', 
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                  }}>
                                    REWARDS
                                  </p>
                                  <div className={styles.rewardsRow}>
                                    {typeof block.quest.xp === 'number' && block.quest.xp > 0 && (
                                      <span className={`${styles.rewardChip} ${styles.xpChip}`}>✨ {block.quest.xp} XP</span>
                                    )}
                                    {typeof block.quest.cp === 'number' && block.quest.cp >= 0 && (
                                      <span className={`${styles.rewardChip} ${styles.cpChip}`}>⚡ {Number(block.quest.cp)} CP</span>
                                    )}
                                    {typeof block.quest.coins === 'number' && block.quest.coins > 0 && (
                                      <span className={`${styles.rewardChip} ${styles.coinsChip}`}>🪙 {block.quest.coins}</span>
                                    )}
                                    {formatRecur(block.quest.recur) && (
                                      <span className={`${styles.rewardChip} ${styles.recurChip}`}>♻️ {formatRecur(block.quest.recur)}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Skills */}
                                {Array.isArray(block.quest.skills) && block.quest.skills.length > 0 && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <p style={{ 
                                      fontSize: '11px', 
                                      color: 'var(--text-muted)', 
                                      marginBottom: '8px',
                                      textTransform: 'uppercase',
                                      fontWeight: '700',
                                      letterSpacing: '0.5px'
                                    }}>
                                      SKILLS
                                    </p>
                                    <div className={styles.questSkills}>
                                      {block.quest.skills.map((skill: string, idx: number) => (
                                        <span key={idx} className={styles.questSkillTag}>🛠️ {skill}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Details Grid */}
                                <div style={{ marginBottom: '16px' }}>
                                  <p style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-muted)', 
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                  }}>
                                    DETAILS
                                  </p>
                                  <div className={styles.metaRow}>
                                    <div className={styles.metaBadge}>
                                      <span className={styles.metaLabel}>Energy</span>
                                      <span className={styles.metaValue}>{getEnergyIcon(energy)} {energy}</span>
                                    </div>
                                    <div className={styles.metaBadge}>
                                      <span className={styles.metaLabel}>Duration</span>
                                      <span className={styles.metaValue}>{formatMinutesHuman(block.duration)}</span>
                                    </div>
                                    <div className={styles.metaBadge}>
                                      <span className={styles.metaLabel}>Priority</span>
                                      <span className={styles.metaValue}>
                                        {block.quest.priority ? (
                                          block.quest.priority.toLowerCase() === 'high' || block.quest.priority.toLowerCase() === 'highest' ? 'High' :
                                          block.quest.priority.toLowerCase() === 'medium' ? 'Medium' : 'Low'
                                        ) : 'Low'}
                                      </span>
                                    </div>
                                    {block.quest.difficulty && (
                                      <div className={styles.metaBadge}>
                                        <span className={styles.metaLabel}>Difficulty</span>
                                        <span className={styles.metaValue}>
                                          {block.quest.difficulty === 'easy' ? 'Easy' :
                                           block.quest.difficulty === 'medium' ? 'Medium' :
                                           block.quest.difficulty === 'hard' ? 'Hard' : 'Epic'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Interactive Subtasks */}
                                <div className={styles.subtasksContainer}>
                                  <div className={styles.subtasksHeader}>
                                    Sub Quests
                                    <button
                                      className={styles.quickAddButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const text = prompt('Add new subtask:');
                                        if (text) handleAddSubtask(block.quest.id, text);
                                      }}
                                      title="Add subtask"
                                    >
                                      +
                                    </button>
                                  </div>
                                  {Array.isArray(block.quest.subtasks) && block.quest.subtasks.length > 0 && (
                                    <>
                                      {block.quest.subtasks.map((st: { text: string; completed?: boolean; estimatedTime?: string }, idx: number) => (
                                        <div key={idx} className={styles.editableSubtaskRow} onClick={(e) => e.stopPropagation()}>
                                          <input
                                            type="checkbox"
                                            checked={st.completed || false}
                                            onChange={() => handleToggleSubtask(block.quest.id, idx)}
                                          />
                                          {editingField?.questId === block.quest.id && 
                                           editingField?.field === 'subtask' && 
                                           editingField?.subtaskIndex === idx ? (
                                            <SubtaskEditor
                                              currentValue={st.text}
                                              onSave={(newText) => handleSaveEdit(newText)}
                                              onCancel={handleCancelEdit}
                                            />
                                          ) : (
                                            <span 
                                              className={`${styles.editableSubtaskText} ${editingField?.questId === block.quest.id && editingField?.field === 'subtask' && editingField?.subtaskIndex === idx ? styles.editing : ''}`}
                                              onClick={() => handleStartEditing(block.quest.id, 'subtask', idx)}
                                              style={{
                                                textDecoration: st.completed ? 'line-through' : 'none',
                                                opacity: st.completed ? 0.6 : 1
                                              }}
                                            >
                                              {st.text}
                                            </span>
                                          )}
                                          {st.estimatedTime && (
                                            <span className={styles.subtaskTime}>{st.estimatedTime}</span>
                                          )}
                                          <div className={styles.subtaskActions}>
                                            <button
                                              className={`${styles.subtaskActionButton} ${styles.editButton}`}
                                              onClick={() => handleStartEditing(block.quest.id, 'subtask', idx)}
                                              title="Edit subtask"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              className={`${styles.subtaskActionButton} ${styles.deleteButton}`}
                                              onClick={() => handleDeleteSubtask(block.quest.id, idx)}
                                              title="Delete subtask"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div style={{
                                  display: 'flex',
                                  gap: '8px',
                                  marginTop: '12px',
                                  paddingTop: '12px',
                                  borderTop: '1px solid rgba(0, 0, 0, 0.1)'
                                }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onQuestSelect(block.quest);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      background: 'linear-gradient(135deg, #10b981, #059669)',
                                      border: 'none',
                                      borderRadius: '8px',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    🚀 Start Now
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onStartHyperfocus) {
                                        onStartHyperfocus(block.quest);
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                      border: 'none',
                                      borderRadius: '8px',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: isHyperfocusOptimal ? 'pointer' : 'not-allowed',
                                      transition: 'all 0.2s',
                                      opacity: isHyperfocusOptimal ? 1 : 0.5
                                    }}
                                    disabled={!isHyperfocusOptimal}
                                    title={isHyperfocusOptimal 
                                      ? "Start Hyperfocus Mode (High energy + Hard quest = Optimal!)" 
                                      : "Hyperfocus available when energy ≥70 and quest is Hard"}
                                  >
                                    ⚡ Hyperfocus
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      try {
                                        SavedQuestsManager.saveQuestForLater(
                                          {
                                            id: block.quest.id,
                                            title: block.quest.title,
                                            difficulty: block.quest.difficulty,
                                            priority: block.quest.priority,
                                            estimatedTime: block.quest.estimatedTime
                                          },
                                          currentEnergy
                                        );
                                        window.console.log('✅ Quest saved for later:', block.quest.title);
                                      } catch (error) {
                                        console.error('Error saving quest:', error);
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                                      border: 'none',
                                      borderRadius: '8px',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    💾 Save Later
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                              <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.dropdownSectionTitle}>Quick Actions</div>
                                <div className={styles.dropdownInfo}>
                            <span>Change Color</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(['calmMint','calmBlue','calmLavender','calmPeach','calmGray','calmRose'] as const).map(k => (
                                <button key={k} className={`${styles.paletteSwatch} ${styles[k]}`} title={k}
                                  onClick={() => { setBlockThemes(prev => ({ ...prev, [block.quest.id]: k })); setOpenDropdown(null);} }
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuestEdit(block.quest);
                              setOpenDropdown(null);
                            }}
                          >✏️ Edit Quest</button>
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuestComplete(block.quest.title);
                              setOpenDropdown(null);
                            }}
                          >✅ Complete</button>
                          <div className={styles.dropdownDivider} />
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              const dateOnly = block.quest.due?.split('T')[0];
                              if (dateOnly) onQuestMove(block.quest.id, dateOnly);
                              setOpenDropdown(null);
                            }}
                          >
                            <span className={styles.dropdownIcon}>🗑️</span>
                            <span>Unschedule</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    ))}
  </div>
</div>
);
};

export default QuestTimelineView;
