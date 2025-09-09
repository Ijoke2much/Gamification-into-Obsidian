import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type GamificationObsidianPlugin from '../../../core/main';
import { useQuestManagement } from '../../../data/hooks/useQuestManagement';
import { QuestCard } from '../../../features/quests/components/QuestCard';
import { handleFailQuestAddDebt } from '../../../features/quests/utils/questUtils';
import { QuestSearchBar, QuestFilters, QuestSortDropdown } from '../../../features/quests/components/QuestSearchAndSort';
import { QuestBoardHeader } from '../../../features/quests/components/QuestBoardHeader';
import { QuickFilterCard } from '../../../features/quests/components/QuickFilterCard';
import { QuestModal } from '../../../features/quests/modals/QuestModal';
import { QuestTemplateWizard } from '../../../features/quests/components/QuestTemplateWizard';


import { AdvancedQuestDashboard } from '../../../features/quests/components/AdvancedQuestDashboard';
import type { Quest } from '../../../features/quests/utils/taskParser';
import styles from './QuestTab.module.css';
// Boss view is now handled by the full-page BossView

interface QuestTabProps {
  plugin: GamificationObsidianPlugin;
}

export const QuestTab: React.FC<QuestTabProps> = ({ plugin }) => {
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
    handleQuestDropOnFilter,
    loadQuests
  } = useQuestManagement(plugin);
  
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
  const questTabRef = useRef<HTMLDivElement>(null);


  // Enhanced search function
  const enhancedSearchFilter = useMemo(() => {
    if (!filters.search) return quests;
    
    const searchTerm = filters.search.toLowerCase();
    
    // Check for special search prefixes
    if (searchTerm.startsWith('skill:')) {
      const skillName = searchTerm.replace('skill:', '').trim();
      return quests.filter(q => 
        q.skills?.some(skill => skill.toLowerCase().includes(skillName))
      );
    }
    
    if (searchTerm.startsWith('tag:')) {
      const tagName = searchTerm.replace('tag:', '').trim();
      return quests.filter(q => 
        q.tags?.some(tag => tag.toLowerCase().includes(tagName))
      );
    }
    
    if (searchTerm.startsWith('reward:')) {
      const rewardName = searchTerm.replace('reward:', '').trim();
      return quests.filter(q => 
        q.rewards?.some(reward => reward.toLowerCase().includes(rewardName))
      );
    }
    
    if (searchTerm.startsWith('time:')) {
      const timeFilter = searchTerm.replace('time:', '').trim();
      const minutes = parseInt(timeFilter);
      if (!isNaN(minutes)) {
        return quests.filter(q => 
          q.estimatedTime && parseInt(q.estimatedTime) <= minutes
        );
      }
    }
    
    if (searchTerm.startsWith('xp:')) {
      const xpFilter = searchTerm.replace('xp:', '').trim();
      const xpAmount = parseInt(xpFilter);
      if (!isNaN(xpAmount)) {
        return quests.filter(q => q.xp && q.xp >= xpAmount);
      }
    }
    
    // Default search (title, description, skills, subtasks)
    return quests.filter(q =>
      q.title.toLowerCase().includes(searchTerm) ||
      q.description?.toLowerCase().includes(searchTerm) ||
      q.skills?.some(skill => skill.toLowerCase().includes(searchTerm)) ||
      q.subtasks.some(st => st.text.toLowerCase().includes(searchTerm)) ||
      q.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      q.rewards?.some(reward => reward.toLowerCase().includes(searchTerm))
    );
  }, [quests, filters.search]);

  // Use the hook's filtered and sorted quests directly
  const filteredQuests = useMemo(() => {
    return getFilteredAndSortedQuests();
  }, [getFilteredAndSortedQuests, sortOptions, filters]);

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

  // Quick filter counts
  const quickFilterCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Helper function to format date consistently (same as drag handler)
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);

    return {
      all: quests.length,
      today: quests.filter(q => q.due === todayStr).length,
      tomorrow: quests.filter(q => q.due === tomorrowStr).length,
      overdue: quests.filter(q => q.due && q.due < todayStr).length,
      upcoming: quests.filter(q => {
        if (!q.due) return false;
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 14);
        const nextWeekStr = formatDate(nextWeek);
        return q.due > todayStr && q.due <= nextWeekStr;
      }).length,
      noDue: quests.filter(q => !q.due).length
    };
  }, [quests]);

  // Smart suggestions logic
  const smartSuggestions = useMemo(() => {
    const today = new Date();
    const activeQuests = quests.filter(q => !q.completed);
    
    // Quick wins: Easy quests or those with low estimated time
    const quickWins = activeQuests
      .filter(q => 
        q.difficulty?.toLowerCase() === 'easy' || 
        (q.estimatedTime && parseInt(q.estimatedTime) <= 30) ||
        (q.subtasks?.length || 0) <= 2
      )
      .slice(0, 3);

    // Focus time: High priority quests
    const focusTime = activeQuests
      .filter(q => 
        q.priority?.toLowerCase() === 'high' || 
        q.priority?.toLowerCase() === 'highest'
      )
      .sort((a, b) => {
        const priorityOrder = { highest: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
        return bPriority - aPriority;
      })
      .slice(0, 3);

    // Due today/overdue
    const urgent = activeQuests
      .filter(q => {
        if (!q.due) return false;
        const due = new Date(q.due);
        due.setHours(23, 59, 59, 999);
        return due <= today;
      })
      .slice(0, 3);

    return { quickWins, focusTime, urgent };
  }, [quests]);

  // Bulk operations handlers
  const handleSelectQuest = (questTitle: string) => {
    setSelectedQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questTitle)) {
        newSet.delete(questTitle);
      } else {
        newSet.add(questTitle);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allQuestTitles = filteredQuests.map(q => q.title);
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
    setFilters(prev => ({ ...prev, search }));
  };


  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleQuickFilterClick = (filterType: string) => {
    setActiveQuickFilter(filterType);
    
    switch (filterType) {
      case 'today':
        setFilters(prev => ({ ...prev, dueDate: 'today', status: 'active' }));
        break;
      case 'tomorrow':
        setFilters(prev => ({ ...prev, dueDate: 'tomorrow', status: 'active' }));
        break;
      case 'overdue':
        setFilters(prev => ({ ...prev, dueDate: 'overdue', status: 'active' }));
        break;
      case 'upcoming':
        setFilters(prev => ({ ...prev, dueDate: 'upcoming', status: 'active' }));
        break;
      case 'no-due':
        setFilters(prev => ({ ...prev, dueDate: 'no-due', status: 'active' }));
        break;
      default:
        setFilters(prev => ({ ...prev, dueDate: 'all', priority: 'all', status: 'active' }));
        break;
    }
  };





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
          <QuestFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availableSkills={Array.from(new Set(quests.flatMap(q => q.skills || [])))}
          />
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
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
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
                  {smartSuggestions.quickWins.map(quest => (
                    <div key={quest.title} style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "2px 0",
                      cursor: "pointer"
                    }} onClick={() => setFilters(prev => ({ ...prev, search: quest.title }))}>
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
                  {smartSuggestions.focusTime.map(quest => (
                    <div key={quest.title} style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "2px 0",
                      cursor: "pointer"
                    }} onClick={() => setFilters(prev => ({ ...prev, search: quest.title }))}>
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
                  {smartSuggestions.urgent.map(quest => (
                    <div key={quest.title} style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.8)",
                      padding: "2px 0",
                      cursor: "pointer"
                    }} onClick={() => setFilters(prev => ({ ...prev, search: quest.title }))}>
                      • {quest.title.substring(0, 25)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Filter Cards - Fixed below search/filters */}
      <div className={`${styles.quickFilterContainer} ${compactView ? styles.compact : ''}`}>
        <QuickFilterCard
          label="All"
          emoji="📋"
          count={quickFilterCounts.all}
          color="100, 149, 237"
          isActive={activeQuickFilter === 'all'}
          onClick={() => handleQuickFilterClick('all')}
          onQuestDrop={handleQuestDropOnFilter}
          filterType="all"
          description="All quests"
          compact={compactView}
        />
        <QuickFilterCard
          label="Today"
          emoji="⏰"
          count={quickFilterCounts.today}
          color="46, 204, 113"
          isActive={activeQuickFilter === 'today'}
          onClick={() => handleQuickFilterClick('today')}
          onQuestDrop={handleQuestDropOnFilter}
          filterType="today"
          description="Due today"
          compact={compactView}
        />
        <QuickFilterCard
          label="Tomorrow"
          emoji="📅"
          count={quickFilterCounts.tomorrow}
          color="52, 152, 219"
          isActive={activeQuickFilter === 'tomorrow'}
          onClick={() => handleQuickFilterClick('tomorrow')}
          onQuestDrop={handleQuestDropOnFilter}
          filterType="tomorrow"
          description="Due tomorrow"
          compact={compactView}
        />
        <QuickFilterCard
          label="Overdue"
          emoji="🚨"
          count={quickFilterCounts.overdue}
          color="231, 76, 60"
          isActive={activeQuickFilter === 'overdue'}
          onClick={() => handleQuickFilterClick('overdue')}
          onQuestDrop={handleQuestDropOnFilter}
          filterType="overdue"
          description="Past due"
          compact={compactView}
        />
        <QuickFilterCard
          label="Upcoming"
          emoji="📆"
          count={quickFilterCounts.upcoming}
          color="155, 89, 182"
          isActive={activeQuickFilter === 'upcoming'}
          onClick={() => handleQuickFilterClick('upcoming')}
          onQuestDrop={handleQuestDropOnFilter}
          filterType="upcoming"
          description="Due within 2 weeks"
          compact={compactView}
        />
        <QuickFilterCard
          label="No Due Date"
          emoji="📅"
          count={quickFilterCounts.noDue}
          color="128, 128, 128"
          isActive={activeQuickFilter === 'no-due'}
          onClick={() => handleQuickFilterClick('no-due')}
          onQuestDrop={handleQuestDropOnFilter}
          filterType="no-due"
          description="Quests without due dates"
          compact={compactView}
        />
      </div>
      


      {/* Quest List - Scrollable section with performance optimizations */}
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
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            {quests.length === 0 ? (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No quests yet!</div>
                <div>Create your first quest to get started on your adventure.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No quests match your filters</div>
                <div>Try adjusting your search criteria or filters.</div>
              </div>
            )}
          </div>
        ) : (
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
            
            {/* Render visible quests */}
            {visibleQuests.map((quest: Quest, index: number) => (
            <QuestCard
              key={quest.title}
              quest={quest}
                collapsed={compactView}
              onEdit={handleEditQuest}
              onToggleSubtask={handleToggleSubtask}
              onCompleteQuest={handleCompleteQuest}
              onUncompleteQuest={handleUncompleteQuest}
              onToggleFavorite={handleToggleFavorite}
                onDeleteQuest={handleDeleteQuest}
              onFailQuest={async (title) => {
                await handleFailQuestAddDebt(plugin.app, title, plugin.app.vault);
                await loadQuests();
              }}
                bulkMode={bulkMode}
                isSelected={selectedQuests.has(quest.title)}
                onSelect={handleSelectQuest}
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
      </div>

      {isModalOpen && (
        <QuestModal
          isOpen={isModalOpen}
          plugin={plugin}
          mode={editingQuest ? "edit" : "create"}
          quest={editingQuest}
          onClose={handleCloseModal}
          onSubmit={handleCloseModal}
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


    </div>
  );
};

export default QuestTab;