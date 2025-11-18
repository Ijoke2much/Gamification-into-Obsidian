import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import type GamificationObsidianPlugin from '../../../core/main';
import { useQuestManagement, QuestFilters } from '../../../data/hooks/useQuestManagement';
import { usePlayerData } from '../../../data/hooks/usePlayerData';
import { ADHDEnhancedQuestCard } from '../../../features/quests/components/ADHDEnhancedQuestCard';
import { QuestViewToggle, QuestViewMode } from '../../../features/quests/components/QuestViewToggle';
import { EnhancedQuestFilters } from '../../../features/quests/components/EnhancedQuestFilters';
import { EnergyCalculationService } from '../../../features/quests/services/energyCalculationService';
import { SavedQuestsManager } from '../../../features/quests/services/savedQuestsManager';
import { handleFailQuestAddDebt } from '../../../features/quests/utils/questUtils';
import { QuestSearchBar, QuestFilters as QuestFiltersComponent, QuestSortDropdown } from '../../../features/quests/components/QuestSearchAndSort';
import { QuestBoardHeader } from '../../../features/quests/components/QuestBoardHeader';
import { QuestModal } from '../../../features/quests/modals/QuestModal';
import { QuestTemplateWizard } from '../../../features/quests/components/QuestTemplateWizard';
import { AdvancedQuestDashboard } from '../../../features/quests/components/AdvancedQuestDashboard';
import { AdvancedSearchFilters } from '../../../features/quests/components/AdvancedSearchFilters';
import { SearchResults } from '../../../features/quests/components/SearchResults';
import { SearchResult } from '../../../features/quests/types/SearchTypes';
// Lazy-load heavy views
const QuestCalendarView = lazy(() => import('../../../features/quests/components/QuestCalendarView').then(m => ({ default: m.QuestCalendarView })));
const QuestTimelineView = lazy(() => import('../../../features/quests/components/QuestTimelineView').then(m => ({ default: m.QuestTimelineView })));
const TimelineModal = lazy(() => import('../../../features/quests/components/TimelineModal').then(m => ({ default: m.TimelineModal })));
import type { Quest } from '../../../features/quests/utils/taskParser';
import { TFile } from 'obsidian';
import styles from './QuestTab.module.css';
// Boss view is now handled by the full-page BossView

interface QuestTabProps {
  plugin: GamificationObsidianPlugin;
}

export const QuestTab: React.FC<QuestTabProps> = ({ plugin }) => {

  // Expose a simple bridge for quick-add from timeline gap clicks
  (window as Window & { openQuestQuickAdd?: (opts: { startMinutes: number; durationMinutes: number; date: Date }) => void; __questQuickPrefill?: unknown }).openQuestQuickAdd = (opts: { startMinutes: number; durationMinutes: number; date: Date }) => {
    try {
      // Open create modal (not edit) and pass prefill for time
      setEditingQuest(null);
      setIsModalOpen(true);
      // Stash prefill on window for the modal props
      (window as Window & { __questQuickPrefill?: unknown }).__questQuickPrefill = {
        dueISO: (() => {
          const startH = Math.floor(opts.startMinutes / 60);
          const startM = opts.startMinutes % 60;
          const date = opts.date;
          return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}T${startH.toString().padStart(2,'0')}:${startM.toString().padStart(2,'0')}`;
        })(),
        estimatedMinutes: opts.durationMinutes
      };
    } catch (e) {
      console.error('openQuestQuickAdd failed', e);
    }
  };

  const {
    quests,
    loading,
    error,
    filters,
    sortOptions,
    setFilters,
    setSortOptions,
    getFilteredAndSortedQuests,
    handleToggleSubtask,
    handleCompleteQuest,
    handleUncompleteQuest,
    handleToggleFavorite,
    handleDeleteQuest,
    // handleQuestDropOnFilter, // Available but not used in this component
    loadQuests
  } = useQuestManagement(plugin);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).manualLoadQuests = loadQuests;
  }, [loadQuests]);

  // Listen for quest saved/unsaved events to trigger re-render
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleQuestSaved = () => forceUpdate({});
    const handleQuestUnsaved = () => forceUpdate({});
    
    window.addEventListener('questSavedForLater', handleQuestSaved as EventListener);
    window.addEventListener('questUnsaved', handleQuestUnsaved as EventListener);
    
    return () => {
      window.removeEventListener('questSavedForLater', handleQuestSaved as EventListener);
      window.removeEventListener('questUnsaved', handleQuestUnsaved as EventListener);
    };
  }, []);

  // Player data for energy system
  const { state: playerState } = usePlayerData(plugin);
  const currentEnergy = playerState.playerData?.stats?.energy || 70;
  
  // ADHD-enhanced state management
  const [viewMode, setViewMode] = useState<QuestViewMode>('cards');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  
  // Timeline modal state
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineModalMode, setTimelineModalMode] = useState<'workweek' | 'week'>('workweek');
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [isTemplateWizardOpen, setIsTemplateWizardOpen] = useState(false);
  const [isAdvancedDashboardOpen, setIsAdvancedDashboardOpen] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [virtualScrolling, setVirtualScrolling] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(false);
  const questTabRef = useRef<HTMLDivElement>(null);

  // Enhanced quest processing with energy calculation
  const enhancedQuests = useMemo(() => {
    return EnergyCalculationService.enhanceQuestsWithEnergy(quests, currentEnergy);
  }, [quests, currentEnergy]);



  // Use the hook's filtered and sorted quests directly with mobile debugging
  const filteredQuests = useMemo(() => {
    let filtered = getFilteredAndSortedQuests();
    
    // Apply active quick filter
    if (activeQuickFilter && activeQuickFilter !== 'all') {
      if (activeQuickFilter === 'saved') {
        const savedQuestIds = new Set(SavedQuestsManager.getAllSavedQuests().map(sq => sq.questId));
        filtered = filtered.filter((q: Quest) => savedQuestIds.has(q.id));
      }
      // Other quick filters can be added here as needed
    }
    
    return filtered;
  }, [getFilteredAndSortedQuests, sortOptions, filters, isMobile, quests.length, loading, error, plugin.app.vault, activeQuickFilter]);

  // Ensure timeline receives data even if filters hide everything
  const timelineQuests = useMemo(() => {
    if (filteredQuests.length > 0) return filteredQuests;
    return quests;
  }, [filteredQuests, quests]);

  // Ensure calendar receives data even if filters hide everything
  const calendarQuests = useMemo(() => {
    if (filteredQuests.length > 0) {
      return filteredQuests;
    }
    return quests;
  }, [filteredQuests, quests, filters, activeQuickFilter]);

  // Performance optimization: Enable virtual scrolling for large lists
  useEffect(() => {
    const shouldUseVirtualScrolling = filteredQuests.length > 100;
    setVirtualScrolling(shouldUseVirtualScrolling);
    if (shouldUseVirtualScrolling) {
      setVisibleRange({ start: 0, end: 50 });
    }
  }, [filteredQuests.length]);

  // Virtual scrolling handler
  const handleScroll = useCallback(() => {
    if (!virtualScrolling || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = compactView ? 60 : 120; // Estimated height per quest card
    const containerHeight = container.clientHeight;
    
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 5; // Buffer
    const end = Math.min(start + visibleCount, filteredQuests.length);
    
    setVisibleRange({ start, end });
  }, [virtualScrolling, filteredQuests.length, compactView]);

  // Memoized quest rendering for performance
  const visibleQuests = useMemo(() => {
    if (!virtualScrolling) return filteredQuests;
    return filteredQuests.slice(visibleRange.start, visibleRange.end);
  }, [filteredQuests, virtualScrolling, visibleRange]);

  // Attach scroll listener for virtual scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !virtualScrolling) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [virtualScrolling, handleScroll]);


  // Smart suggestions logic
  const smartSuggestions = useMemo(() => {
    const today = new Date();
    const activeQuests = quests.filter((q: Quest) => !q.completed);
    
    // Quick wins: Easy quests or those with low estimated time
    const quickWins = activeQuests
      .filter((q: Quest) => 
        q.difficulty?.toLowerCase() === 'easy' || 
        (q.estimatedTime && parseInt(q.estimatedTime) <= 30) ||
        (q.subtasks?.length || 0) <= 2
      )
      .slice(0, 3);

    // Focus time: High priority quests
    const focusTime = activeQuests
      .filter((q: Quest) => 
        q.priority?.toLowerCase() === 'high' || 
        q.priority?.toLowerCase() === 'highest'
      )
      .sort((a: Quest, b: Quest) => {
        const priorityOrder = { highest: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
        return bPriority - aPriority;
      })
      .slice(0, 3);

    // Due today/overdue
    const urgent = activeQuests
      .filter((q: Quest) => {
        if (!q.due) return false;
        const due = new Date(q.due);
        due.setHours(23, 59, 59, 999);
        return due <= today;
      })
      .slice(0, 3);

    return { quickWins, focusTime, urgent };
  }, [quests]);

  // Bulk operations handlers (for future use)
  // const handleSelectQuest = (questTitle: string) => {
  //   setSelectedQuests(prev => {
  //     const newSet = new Set(prev);
  //     if (newSet.has(questTitle)) {
  //       newSet.delete(questTitle);
  //     } else {
  //       newSet.add(questTitle);
  //     }
  //     return newSet;
  //   });
  // };

  const handleSelectAll = () => {
    const allQuestTitles = filteredQuests.map((q: Quest) => q.title);
    setSelectedQuests(new Set(allQuestTitles));
  };

  const handleDeselectAll = () => {
    setSelectedQuests(new Set());
  };

  const handleBulkComplete = async () => {
    for (const questTitle of selectedQuests) {
      await handleCompleteQuest(questTitle);
    }
    setSelectedQuests(new Set());
    setBulkMode(false);
  };

  const handleBulkDelete = async () => {
    for (const questTitle of selectedQuests) {
      await handleDeleteQuest(questTitle);
    }
    setSelectedQuests(new Set());
    setBulkMode(false);
  };

  const handleBulkPriorityChange = async (newPriority: string) => {
    // This would need to be implemented in the quest management system
    console.log(`Bulk priority change to ${newPriority} for:`, selectedQuests);
    // For now, just clear selection
    setSelectedQuests(new Set());
  };

  // Keyboard shortcuts - only active when quest tab is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only process shortcuts when the quest tab container is visible and focused
      if (!questTabRef.current || !questTabRef.current.contains(e.target as Node)) {
        return;
      }

      // Handle shortcuts
      switch (e.key.toLowerCase()) {
        case 'n':
          if (e.ctrlKey || e.metaKey) break; // Don't interfere with browser shortcuts
          e.preventDefault();
          handleCreateQuest();
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) break; // Don't interfere with browser find
          e.preventDefault();
          setShowFilters(!showFilters);
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) break;
          e.preventDefault();
          setCompactView(!compactView);
          break;
        case 't':
          if (e.ctrlKey || e.metaKey) break;
          e.preventDefault();
          handleCreateFromTemplate();
          break;
        case 'b':
          if (e.ctrlKey || e.metaKey) break;
          e.preventDefault();
          handleBossDashboard();
          break;
        case 'v':
          if (e.ctrlKey || e.metaKey) break;
          e.preventDefault();
          setBulkMode(!bulkMode);
          if (bulkMode) {
            setSelectedQuests(new Set());
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) break;
          e.preventDefault();
          setShowSmartSuggestions(!showSmartSuggestions);
          break;
        case 'escape':
          setShowFilters(false);
          setSelectedQuests(new Set());
          setBulkMode(false);
          setShowSmartSuggestions(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFilters, compactView]);

  const handleEditQuest = useCallback((quest: Quest) => {
    setEditingQuest(quest);
    setIsModalOpen(true);
  }, []);

  const handleCreateQuest = useCallback(() => {
    setEditingQuest(null);
    setIsModalOpen(true);
  }, []);

  // ADHD-specific handlers
  const handleQuestSelect = useCallback((questTitle: string) => {
    const quest = enhancedQuests.find(q => q.title === questTitle);
    setSelectedQuest(quest || null);
  }, [enhancedQuests]);

  const handleStartPomodoro = useCallback((quest: Quest) => {
    window.console.log('🚀 ========== START NOW BUTTON CLICKED ==========');
    window.console.log('🚀 Quest:', quest.title);
    window.console.log('🚀 Quest data:', quest);
    
    // Parse estimated time from quest (handle formats like "5m", "25 min", "1h", etc.)
    let estimatedTime = 25; // Default to 25 minutes
    if (quest.estimatedTime) {
      const timeStr = quest.estimatedTime.toLowerCase().trim();
      const match = timeStr.match(/(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2] || 'm';
        if (unit.startsWith('h')) {
          estimatedTime = value * 60; // Convert hours to minutes
        } else {
          estimatedTime = value;
        }
      }
    }
    window.console.log(`⏱️ Quest estimated time parsed: ${quest.estimatedTime} → ${estimatedTime} minutes`);
    
    // Create attached quest object for Pomodoro timer
    const attachedQuest = {
      title: quest.title,
      progress: 0,
      difficulty: quest.difficulty,
      priority: quest.priority,
      rewards: { 
        xp: quest.xp || 0,
        coins: quest.cp || 0,
        cp: quest.cp || 0,
        materials: quest.rewards || []
      },
      description: quest.description || 'Complete this quest to earn rewards!',
      dueDate: quest.due,
      subtasks: quest.subtasks?.map(subtask => ({
        completed: subtask.completed,
        text: subtask.text
      })) || [],
      tags: quest.tags || [],
      skills: quest.skills || [],
      filePath: quest.id, // Use quest.id as filePath fallback
      lineNumber: 0, // Default line number
      isTimedQuest: false, // Default to false
      estimatedTime: estimatedTime // Pass the estimated time in minutes
    };

    // Store the attached quest in plugin settings for Pomodoro tab to pick up
    (plugin.settings as unknown as Record<string, unknown>).pomodoroAttachedQuest = attachedQuest;
    plugin.saveSettings();

    // Request tab switch to Pomodoro FIRST
    window.console.log('🔄 Requesting tab switch to pomodoro');
    const tabSwitchEvent = new CustomEvent('requestActiveTabChange', {
      detail: { targetTab: 'pomodoro' }
    });
    window.dispatchEvent(tabSwitchEvent);
    window.console.log('🔄 Tab switch event dispatched');

    // Wait for Pomodoro tab to mount, then dispatch quest attachment event
    // Use longer delay to ensure component is fully mounted
    setTimeout(() => {
      window.console.log('📡 [After 500ms] Dispatching switchToPomodoroTab event with quest:', attachedQuest.title);
      const switchToPomodoroEvent = new CustomEvent('switchToPomodoroTab', {
        detail: { attachedQuest }
      });
      window.dispatchEvent(switchToPomodoroEvent);
      window.console.log('📡 Event dispatched successfully');
    }, 500); // 500ms delay to ensure tab is fully mounted

    window.console.log('🚀 Pomodoro started with quest:', quest.title);
  }, [plugin]);

  const handleStartHyperfocus = useCallback((quest: Quest) => {
    window.console.log('🧠 ========== HYPERFOCUS BUTTON CLICKED ==========');
    window.console.log('🧠 Quest:', quest.title);
    
    // Parse estimated time from quest
    let estimatedTime = 25;
    if (quest.estimatedTime) {
      const timeStr = quest.estimatedTime.toLowerCase().trim();
      const match = timeStr.match(/(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2] || 'm';
        if (unit.startsWith('h')) {
          estimatedTime = value * 60;
        } else {
          estimatedTime = value;
        }
      }
    }
    
    // Create attached quest object
    const attachedQuest = {
      title: quest.title,
      progress: 0,
      difficulty: quest.difficulty,
      priority: quest.priority,
      rewards: { 
        xp: quest.xp || 0,
        coins: quest.cp || 0,
        cp: quest.cp || 0,
        materials: quest.rewards || []
      },
      description: quest.description || 'Complete this quest to earn rewards!',
      dueDate: quest.due,
      subtasks: quest.subtasks?.map(subtask => ({
        completed: subtask.completed,
        text: subtask.text
      })) || [],
      tags: quest.tags || [],
      skills: quest.skills || [],
      filePath: quest.id,
      lineNumber: 0,
      isTimedQuest: false,
      estimatedTime: estimatedTime,
      startWithHyperfocus: true // Flag to auto-enable hyperfocus
    };

    // Store in plugin settings
    (plugin.settings as unknown as Record<string, unknown>).pomodoroAttachedQuest = attachedQuest;
    plugin.saveSettings();

    // Switch to Pomodoro tab
    window.console.log('🔄 Requesting tab switch to pomodoro with hyperfocus');
    const tabSwitchEvent = new CustomEvent('requestActiveTabChange', {
      detail: { targetTab: 'pomodoro' }
    });
    window.dispatchEvent(tabSwitchEvent);

    // Dispatch quest attachment event with hyperfocus flag
    setTimeout(() => {
      window.console.log('📡 Dispatching switchToPomodoroTab event with hyperfocus');
      const switchToPomodoroEvent = new CustomEvent('switchToPomodoroTab', {
        detail: { attachedQuest, enableHyperfocus: true }
      });
      window.dispatchEvent(switchToPomodoroEvent);
      window.console.log('📡 Hyperfocus event dispatched');
    }, 500);

    window.console.log('🧠 Hyperfocus started for quest:', quest.title);
  }, [plugin]);

  const handleBreakDown = useCallback((quest: Quest) => {
    console.log('Breaking down quest:', quest.title);
    // TODO: Implement quest breakdown functionality
  }, []);

  // Quest move handler for calendar view
  const handleQuestMove = useCallback(async (questId: string, newDate: string) => {
    try {
      const file = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
      if (file && file instanceof TFile) {
        const content = await plugin.app.vault.read(file);
        const lines = content.split('\n');
        
        // Find and update the quest's due date
        const questLineIndex = lines.findIndex(line => 
          line.includes(questId) && line.includes('#gamified-task')
        );
        
        if (questLineIndex !== -1) {
          // Update the due date in the quest line
          let updatedLine = lines[questLineIndex];
          
          // Remove existing due date if present
          updatedLine = updatedLine.replace(/due::\s*\d{4}-\d{2}-\d{2}/g, '');
          updatedLine = updatedLine.replace(/\{[^}]*due:\s*\d{4}-\d{2}-\d{2}[^}]*\}/g, (match) => {
            return match.replace(/due:\s*\d{4}-\d{2}-\d{2}/, `due: ${newDate}`);
          });
          
          // Add new due date if no existing metadata block
          if (!updatedLine.includes('due:')) {
            updatedLine = updatedLine.replace('#gamified-task', `{due: ${newDate}} #gamified-task`);
          }
          
          lines[questLineIndex] = updatedLine;
          await plugin.app.vault.modify(file, lines.join('\n'));
          await loadQuests(); // Reload quests
        }
      }
    } catch (error) {
      console.error('Error moving quest:', error);
    }
  }, [plugin.app.vault, loadQuests]);


  const handleCreateFromTemplate = () => {
    setIsTemplateWizardOpen(true);
  };

  const handleTemplateQuestCreate = async (questData: Partial<Quest>) => {
    try {
      // Create the quest using the existing modal system
      setEditingQuest(questData as Quest);
      setIsModalOpen(true);
      setIsTemplateWizardOpen(false);
    } catch (error) {
      console.error('Failed to create quest from template:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQuest(null);
    loadQuests(); // Reload quests after modal closes
  };

  const handleBossDashboard = () => {
    // Open the full-page boss battle view instead of the modal
    plugin.activateBossView();
  };



  const handleSearchChange = (search: string) => {
    setFilters((prev: QuestFilters) => ({ ...prev, search }));
  };


  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev: QuestFilters) => ({ ...prev, ...newFilters }));
  };

  // Advanced search handlers
  const handleAdvancedSearchResults = useCallback((results: SearchResult[]) => {
    setSearchResults(results);
    setUseAdvancedSearch(true);
  }, []);

  const handleAdvancedSearchToggle = useCallback(() => {
    setShowAdvancedSearch(prev => !prev);
    if (showAdvancedSearch) {
      setUseAdvancedSearch(false);
      setSearchResults([]);
    }
  }, [showAdvancedSearch]);

  // Close advanced search when filters are closed
  useEffect(() => {
    if (!showFilters) {
      setShowAdvancedSearch(false);
      setUseAdvancedSearch(false);
      setSearchResults([]);
    }
  }, [showFilters]);

  // Cleanup function for advanced search - available for future use
  // const handleAdvancedSearchClose = useCallback(() => {
  //   setShowAdvancedSearch(false);
  //   setUseAdvancedSearch(false);
  //   setSearchResults([]);
  // }, []);

  // const handleQuickFilterClick = (filterType: string) => {
  //   setActiveQuickFilter(filterType);
  //   
  //   switch (filterType) {
  //     case 'today':
  //       setFilters(prev => ({ ...prev, dueDate: 'today', status: 'active' }));
  //       break;
  //     case 'tomorrow':
  //       setFilters(prev => ({ ...prev, dueDate: 'tomorrow', status: 'active' }));
  //       break;
  //     case 'overdue':
  //       setFilters(prev => ({ ...prev, dueDate: 'overdue', status: 'active' }));
  //       break;
  //     case 'upcoming':
  //       setFilters(prev => ({ ...prev, dueDate: 'upcoming', status: 'active' }));
  //       break;
  //     case 'no-due':
  //       setFilters(prev => ({ ...prev, dueDate: 'no-due', status: 'active' }));
  //       break;
  //     default:
  //       setFilters(prev => ({ ...prev, dueDate: 'all', priority: 'all', status: 'active' }));
  //       break;
  //   }
  // };





  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading quests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-error)' }}>
        <div>Error loading quests: {error}</div>
        <button onClick={loadQuests} style={{ marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={questTabRef} className={styles.questTabContainer}>
      {/* Mobile-specific CSS */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        @media (max-width: 768px) {
          .quest-tab-mobile {
            padding: 12px !important;
          }
          
          .quest-tab-mobile .quest-card {
            margin-bottom: 12px !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          }
          
          .quest-tab-mobile button {
            min-height: 44px !important;
            font-size: 16px !important;
            padding: 12px 16px !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
      <QuestBoardHeader 
        onAddQuest={handleCreateQuest}
      />
      
      {/* Keyboard Shortcuts Help */}
      <div style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "rgba(255, 255, 255, 0.7)",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "9px",
        zIndex: 1000,
        cursor: "help"
      }} title="Keyboard Shortcuts: N=New Quest, /=Search, F=Filters, C=Compact, V=Bulk Mode, S=Suggestions, T=Templates, B=Boss, ESC=Clear">
        ⌨️ Shortcuts
      </div>
      
      {/* Search and Filter Controls - Fixed at top */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        {/* Search bar on its own line */}
        <div className={styles.searchContainer}>
          <QuestSearchBar
            searchValue={filters.search}
            onSearchChange={handleSearchChange}
            placeholder="Search quests... Try: skill:coding, tag:urgent, time:30, xp:100"
            ref={searchInputRef}
          />
        </div>
        
        {/* Sort and Filters side by side */}
        <div className={styles.controlsContainer}>
          <QuestSortDropdown
            sortOptions={sortOptions}
            onSortChange={setSortOptions}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.actionButton} ${styles.filterButton} ${showFilters ? styles.active : ''}`}
            title="Toggle Filters (F)"
          >
            🔧 Filters
          </button>
          <button
            onClick={() => setCompactView(!compactView)}
            className={`${styles.actionButton} ${styles.filterButton} ${compactView ? styles.active : ''}`}
            title="Compact View (C)"
          >
            {compactView ? '📋' : '📄'} {compactView ? 'Compact' : 'Normal'}
          </button>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`${styles.actionButton} ${styles.filterButton} ${bulkMode ? styles.active : ''}`}
            title="Bulk Operations (V)"
          >
            ☑️ {bulkMode ? 'Exit Bulk' : 'Bulk Mode'}
          </button>
          <button
            onClick={() => setShowSmartSuggestions(!showSmartSuggestions)}
            className={`${styles.actionButton} ${styles.filterButton} ${showSmartSuggestions ? styles.active : ''}`}
            title="Smart Suggestions (S)"
          >
            🎯 Suggestions
          </button>
          <button
            onClick={handleCreateFromTemplate}
            className={`${styles.actionButton} ${styles.templateButton}`}
            title="Templates (T)"
          >
            🎯 Template
          </button>
          <button
            onClick={() => setIsAdvancedDashboardOpen(true)}
            className={`${styles.actionButton} ${styles.advancedButton}`}
          >
            🚀 Advanced
          </button>
          <button
            onClick={handleBossDashboard}
            className={`${styles.actionButton} ${styles.bossButton}`}
            title="Boss Arena (B)"
          >
            🐉 Boss
          </button>
          <button
            onClick={() => {
              // Export quests functionality
              const questData = JSON.stringify(quests, null, 2);
              const blob = new Blob([questData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'quests-export.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className={`${styles.actionButton} ${styles.exportButton}`}
          >
            📤 Export
          </button>

        </div>
        
        {showFilters && (
          <div>
            <QuestFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableSkills={Array.from(new Set(quests.flatMap((q: Quest) => q.skills || [])))}
            />
            
            {/* Advanced Search Toggle - Full width below filters */}
            <div style={{
              marginTop: '8px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              marginBottom: '20px',
              minWidth: '100%',
              boxSizing: 'border-box'
            }}>
              <button
                onClick={handleAdvancedSearchToggle}
                className={`${styles.actionButton} ${styles.filterButton} ${showAdvancedSearch ? styles.active : ''}`}
                style={{
                  width: '100%',
                  minWidth: '200px',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: showAdvancedSearch ? 'var(--interactive-accent)' : 'transparent',
                  color: showAdvancedSearch ? 'var(--text-on-accent)' : 'var(--text-normal)',
                  border: '1px solid var(--interactive-accent)',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  textOverflow: 'unset'
                }}
                title={showAdvancedSearch ? 'Hide Advanced Search' : 'Show Advanced Search'}
              >
                🔍 {showAdvancedSearch ? 'Hide Advanced' : 'Show Advanced'}
              </button>
            </div>
          </div>
        )}

        {/* Bulk Operations Toolbar */}
        {bulkMode && (
          <div style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap"
          }}>
            <span style={{ 
              color: "rgba(59, 130, 246, 1)", 
              fontWeight: "600", 
              fontSize: "12px" 
            }}>
              {selectedQuests.size} selected
            </span>
            <button
              onClick={handleSelectAll}
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                color: "#3b82f6",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              style={{
                background: "rgba(107, 114, 128, 0.2)",
                border: "1px solid rgba(107, 114, 128, 0.4)",
                color: "#6b7280",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              Deselect All
            </button>
            {selectedQuests.size > 0 && (
              <>
                <button
                  onClick={handleBulkComplete}
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#22c55e",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  ✅ Complete ({selectedQuests.size})
                </button>
                <button
                  onClick={handleBulkDelete}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#ef4444",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  🗑 Delete ({selectedQuests.size})
                </button>
                <select
                  onChange={(e) => handleBulkPriorityChange(e.target.value)}
                  style={{
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#f59e0b",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Set Priority</option>
                  <option value="highest">Highest</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="lowest">Lowest</option>
                </select>
              </>
            )}
          </div>
        )}

        {/* Smart Suggestions */}
        {showSmartSuggestions && (
          <div style={{
            background: "rgba(156, 163, 175, 0.1)",
            border: "1px solid rgba(156, 163, 175, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            marginTop: "8px"
          }}>
            <h4 style={{ 
              margin: "0 0 8px 0", 
              color: "#9ca3af", 
              fontSize: "12px", 
              fontWeight: "600" 
            }}>
              🎯 Smart Suggestions
            </h4>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {smartSuggestions.quickWins.length > 0 && (
                <div style={{ flex: "1", minWidth: "100px" }}>
                  <h5 style={{ 
                    margin: "0 0 4px 0", 
                    color: "#22c55e", 
                    fontSize: "10px", 
                    fontWeight: "600" 
                  }}>
                    ⚡ Quick Wins
                  </h5>
                  {smartSuggestions.quickWins.map((quest: Quest) => (
                    <div key={quest.title} style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "2px 0",
                      cursor: "pointer"
                    }} onClick={() => setFilters((prev: QuestFilters) => ({ ...prev, search: quest.title }))}>
                      • {quest.title.substring(0, 25)}...
                    </div>
                  ))}
                </div>
              )}
              {smartSuggestions.focusTime.length > 0 && (
                <div style={{ flex: "1", minWidth: "100px" }}>
                  <h5 style={{ 
                    margin: "0 0 4px 0", 
                    color: "#ef4444", 
                    fontSize: "10px", 
                    fontWeight: "600" 
                  }}>
                    🎯 Focus Time
                  </h5>
                  {smartSuggestions.focusTime.map((quest: Quest) => (
                    <div key={quest.title} style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "2px 0",
                      cursor: "pointer"
                    }} onClick={() => setFilters((prev: QuestFilters) => ({ ...prev, search: quest.title }))}>
                      • {quest.title.substring(0, 25)}...
                    </div>
                  ))}
                </div>
              )}
              {smartSuggestions.urgent.length > 0 && (
                <div style={{ flex: "1", minWidth: "100px" }}>
                  <h5 style={{ 
                    margin: "0 0 4px 0", 
                    color: "#f59e0b", 
                    fontSize: "10px", 
                    fontWeight: "600" 
                  }}>
                    🚨 Urgent
                  </h5>
                  {smartSuggestions.urgent.map((quest: Quest) => (
                    <div key={quest.title} style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "2px 0",
                      cursor: "pointer"
                    }} onClick={() => setFilters((prev: QuestFilters) => ({ ...prev, search: quest.title }))}>
                      • {quest.title.substring(0, 25)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Quick Filter Cards with ADHD features */}
      <EnhancedQuestFilters
        activeQuickFilter={activeQuickFilter}
        setActiveQuickFilter={setActiveQuickFilter}
        quests={enhancedQuests}
        currentEnergy={currentEnergy}
      />

      {/* View Toggle Buttons - Cards, Calendar, Timeline */}
      <div style={{ marginTop: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
        <QuestViewToggle 
          currentView={viewMode}
          onViewChange={setViewMode}
        />
      </div>

      {/* Loading State - Mobile Optimized */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: isMobile ? '60px 20px' : '40px 20px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ 
            fontSize: isMobile ? '64px' : '48px', 
            marginBottom: '20px',
            animation: 'pulse 2s infinite'
          }}>🎯</div>
          <div style={{ 
            fontSize: isMobile ? '20px' : '18px', 
            marginBottom: '12px',
            fontWeight: 600
          }}>Loading your quests...</div>
          <div style={{ fontSize: isMobile ? '16px' : '14px' }}>Preparing your adventure!</div>
        </div>
      )}
      
      {/* Error State - Mobile Optimized */}
      {error && (
        <div style={{
          textAlign: 'center',
          padding: isMobile ? '60px 20px' : '40px 20px',
          color: 'var(--text-accent)'
        }}>
          <div style={{ 
            fontSize: isMobile ? '64px' : '48px', 
            marginBottom: '20px'
          }}>⚠️</div>
          <div style={{ 
            fontSize: isMobile ? '20px' : '18px', 
            marginBottom: '12px',
            fontWeight: 600
          }}>Error loading quests</div>
          <div style={{ 
            fontSize: isMobile ? '16px' : '14px',
            marginBottom: '20px'
          }}>{error}</div>
          <button
            onClick={loadQuests}
            style={{
              padding: isMobile ? '12px 24px' : '8px 16px',
              background: 'var(--interactive-accent)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '16px' : '14px',
              fontWeight: 600
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Advanced Search */}
      {showFilters && showAdvancedSearch && (
        <AdvancedSearchFilters
          quests={quests}
          onFiltersChange={() => {}} // Handled internally
          onSearchResults={handleAdvancedSearchResults}
          currentEnergy={currentEnergy}
        />
      )}

      {/* Search Results */}
      {useAdvancedSearch && searchResults.length > 0 && (
        <SearchResults
          results={searchResults}
          onQuestSelect={(quest) => handleQuestSelect(quest.title)}
          onQuestComplete={handleCompleteQuest}
          onQuestEdit={handleEditQuest}
          currentEnergy={currentEnergy}
        />
      )}

      {/* Quest List - Scrollable section with performance optimizations */}
      {!loading && !error && (
        <div 
          ref={scrollContainerRef}
          className={styles.questListContainer}
          style={{ 
            position: 'relative',
            ...(virtualScrolling && {
              height: filteredQuests.length * (compactView ? 60 : 120) + 'px'
            })
          }}
        >
        {filteredQuests.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '60px 20px' : '40px 20px',
            color: 'var(--text-muted)'
          }}>
            {quests.length === 0 ? (
              <div>
                <div style={{ 
                  fontSize: isMobile ? '64px' : '48px', 
                  marginBottom: '20px' 
                }}>📝</div>
                <div style={{ 
                  fontSize: isMobile ? '22px' : '18px', 
                  marginBottom: '12px',
                  fontWeight: 600
                }}>No quests yet!</div>
                <div style={{ 
                  fontSize: isMobile ? '16px' : '14px',
                  marginBottom: '24px'
                }}>Create your first quest to get started on your adventure.</div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    padding: isMobile ? '16px 32px' : '12px 24px',
                    background: 'var(--interactive-accent)',
                    color: 'var(--text-on-accent)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '18px' : '16px',
                    fontWeight: 600
                  }}
                >
                  Create Your First Quest
                </button>
              </div>
            ) : (
              <div>
                <div style={{ 
                  fontSize: isMobile ? '64px' : '48px', 
                  marginBottom: '20px' 
                }}>🔍</div>
                <div style={{ 
                  fontSize: isMobile ? '22px' : '18px', 
                  marginBottom: '12px',
                  fontWeight: 600
                }}>No quests match your filters</div>
                <div style={{ 
                  fontSize: isMobile ? '16px' : '14px',
                  marginBottom: '24px'
                }}>Try adjusting your search criteria or filters.</div>
                <button
                  onClick={() => {
                    setFilters({
                      search: '',
                      priority: [],
                      difficulty: [],
                      skills: [],
                      tags: [],
                      dueDateRange: { start: null, end: null },
                      status: 'all',
                      favorites: false,
                    });
                    setActiveQuickFilter('all');
                  }}
                  style={{
                    padding: isMobile ? '16px 32px' : '12px 24px',
                    background: 'var(--interactive-accent)',
                    color: 'var(--text-on-accent)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '18px' : '16px',
                    fontWeight: 600
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Render based on view mode */}
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading view…</div>}>
            {viewMode === 'calendar' ? (
              <QuestCalendarView
                quests={calendarQuests}
                plugin={plugin}
                currentEnergy={currentEnergy}
                onQuestSelect={setSelectedQuest}
                onQuestComplete={handleCompleteQuest}
                onQuestEdit={handleEditQuest}
                onDateSelect={() => {}}
                onQuestMove={handleQuestMove}
                onStartHyperfocus={handleStartHyperfocus}
              />
            ) : viewMode === 'timeline' ? (
              <>
                {/* Week View Buttons - Open Modal */}
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'var(--background-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--background-modifier-border)'
                }}>
                  <button
                    onClick={() => {
                      setTimelineModalMode('workweek');
                      setTimelineModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(59, 130, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }}
                  >
                    📊 Open Work Week View
                  </button>
                  <button
                    onClick={() => {
                      setTimelineModalMode('week');
                      setTimelineModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(139, 92, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                    }}
                  >
                    📆 Open Full Week View
                  </button>
                </div>
                
                {/* Day View Timeline (in sidebar) */}
                <QuestTimelineView
                  quests={timelineQuests}
                  plugin={plugin}
                  currentEnergy={currentEnergy}
                  onQuestSelect={setSelectedQuest}
                  onQuestComplete={handleCompleteQuest}
                  onQuestEdit={handleEditQuest}
                  onQuestMove={handleQuestMove}
                  onStartHyperfocus={handleStartHyperfocus}
                  date={new Date()}
                  initialViewMode="day"
                />
              </>
            ) : (
              // Default cards view - existing quest cards rendering
              <>
                {/* Performance indicator for large lists */}
                {virtualScrolling && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#22c55e',
                    padding: '4px 8px',
                    borderRadius: '0 0 0 8px',
                    fontSize: '10px',
                    zIndex: 10
                  }}>
                    ⚡ Virtual Scrolling ({filteredQuests.length} quests)
                  </div>
                )}
                
                {/* Virtual scrolling spacer for content above visible area */}
                {virtualScrolling && visibleRange.start > 0 && (
                  <div style={{ 
                    height: visibleRange.start * (compactView ? 60 : 120) + 'px' 
                  }} />
                )}
                
                {/* Render visible quests with ADHD enhancements */}
                {visibleQuests.map((quest: Quest, index: number) => (
                <ADHDEnhancedQuestCard
                  key={`${quest.id || quest.title}-${quest.due || 'no-due'}-${quest.lastModified || Date.now()}`}
                  quest={quest}
                  plugin={plugin}
                  collapsed={compactView}
                  onEdit={handleEditQuest}
                  onToggleSubtask={handleToggleSubtask}
                  onCompleteQuest={handleCompleteQuest}
                  onUncompleteQuest={handleUncompleteQuest}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteQuest={handleDeleteQuest}
                  onSelect={handleQuestSelect}
                  isSelected={selectedQuest?.id === quest.id}
                  currentEnergy={currentEnergy}
                  onStartPomodoro={handleStartPomodoro}
                  onStartHyperfocus={handleStartHyperfocus}
                  onBreakDown={handleBreakDown}
                  onFailQuest={async (title) => {
                    await handleFailQuestAddDebt(plugin.app, title, plugin.app.vault);
                    await loadQuests();
                  }}
                  bulkMode={bulkMode}
                />
                ))}
                
                {/* Virtual scrolling spacer for content below visible area */}
                {virtualScrolling && visibleRange.end < filteredQuests.length && (
                  <div style={{ 
                    height: (filteredQuests.length - visibleRange.end) * (compactView ? 60 : 120) + 'px' 
                  }} />
                )}
              </>
            )}
            </Suspense>
          </>
        )}
        </div>
      )}

      {isModalOpen && (
        <QuestModal
          isOpen={isModalOpen}
          plugin={plugin}
          mode={editingQuest ? "edit" : "create"}
          quest={editingQuest}
          onClose={handleCloseModal}
          onSubmit={handleCloseModal}
          prefill={(window as Window & { __questQuickPrefill?: { dueISO?: string; estimatedMinutes?: number; title?: string; description?: string } }).__questQuickPrefill}
        />
      )}

      {isTemplateWizardOpen && (
        <QuestTemplateWizard
          isOpen={isTemplateWizardOpen}
          onClose={() => setIsTemplateWizardOpen(false)}
          onCreateQuest={handleTemplateQuestCreate}
        />
      )}

      {isAdvancedDashboardOpen && (
        <AdvancedQuestDashboard
          isOpen={isAdvancedDashboardOpen}
          onClose={() => setIsAdvancedDashboardOpen(false)}
          quests={quests}
        />
      )}

      {timelineModalOpen && (
        <Suspense fallback={null}>
          <TimelineModal
            isOpen={timelineModalOpen}
            onClose={() => setTimelineModalOpen(false)}
            quests={timelineQuests}
            plugin={plugin}
            currentEnergy={currentEnergy}
            onQuestSelect={setSelectedQuest}
            onQuestComplete={handleCompleteQuest}
            onQuestEdit={handleEditQuest}
            onQuestMove={handleQuestMove}
            onStartHyperfocus={handleStartHyperfocus}
            initialViewMode={timelineModalMode}
          />
        </Suspense>
      )}

    </div>
  );
};

export default QuestTab;