import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quest } from '../utils/taskParser';
import { AdvancedSearchFilters as SearchFilters, SearchPreset, FilterChip, SearchSuggestion } from '../types/SearchTypes';
import { AdvancedSearchService } from '../services/AdvancedSearchService';
import { SEARCH_PRESETS } from '../data/SearchPresets';
import styles from './AdvancedSearchFilters.module.css';

interface AdvancedSearchFiltersProps {
  quests: Quest[];
  onFiltersChange: (filters: SearchFilters) => void;
  onSearchResults: (results: any[]) => void;
  currentEnergy: number;
  className?: string;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  quests,
  onFiltersChange,
  onSearchResults,
  currentEnergy,
  className
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    searchFields: ['title', 'description', 'skills', 'subtasks', 'tags'],
    priority: [],
    difficulty: [],
    skills: [],
    tags: [],
    energyRange: { min: 1, max: 50 },
    durationRange: { min: 1, max: 480 },
    energyMatch: [],
    dueDateRange: { start: null, end: null },
    createdDateRange: { start: null, end: null },
    xpRange: { min: 0, max: 10000 },
    cpRange: { min: 0, max: 10000 },
    isRecurring: null,
    recurrenceTypes: [],
    status: ['active'],
    isFavorite: null,
    subtaskCompletion: 'all'
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filterChips, setFilterChips] = useState<FilterChip[]>([]);

  const searchService = useMemo(() => AdvancedSearchService.getInstance(), []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const results = searchService.searchQuests(quests, filters);
      onSearchResults(results);
      
      // Update filter chips
      updateFilterChips();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, quests, searchService, onSearchResults]);

  // Update search suggestions
  useEffect(() => {
    if (filters.search.length >= 2) {
      const suggestions = searchService.getSearchSuggestions(quests, filters.search);
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [filters.search, quests, searchService]);

  const updateFilterChips = useCallback(() => {
    const chips: FilterChip[] = [];

    // Search chip
    if (filters.search) {
      chips.push({
        id: 'search',
        label: `Search: "${filters.search}"`,
        value: filters.search,
        type: 'search',
        removable: true,
        color: '#3b82f6'
      });
    }

    // Priority chips
    filters.priority.forEach(priority => {
      chips.push({
        id: `priority-${priority}`,
        label: `Priority: ${priority}`,
        value: priority,
        type: 'priority',
        removable: true,
        color: getPriorityColor(priority)
      });
    });

    // Difficulty chips
    filters.difficulty.forEach(difficulty => {
      chips.push({
        id: `difficulty-${difficulty}`,
        label: `Difficulty: ${difficulty}`,
        value: difficulty,
        type: 'difficulty',
        removable: true,
        color: getDifficultyColor(difficulty)
      });
    });

    // Energy range chip
    if (filters.energyRange.min > 1 || filters.energyRange.max < 50) {
      chips.push({
        id: 'energy-range',
        label: `Energy: ${filters.energyRange.min}-${filters.energyRange.max}`,
        value: `${filters.energyRange.min}-${filters.energyRange.max}`,
        type: 'energy',
        removable: true,
        color: '#f59e0b'
      });
    }

    // Duration range chip
    if (filters.durationRange.min > 1 || filters.durationRange.max < 480) {
      chips.push({
        id: 'duration-range',
        label: `Duration: ${filters.durationRange.min}-${filters.durationRange.max}min`,
        value: `${filters.durationRange.min}-${filters.durationRange.max}`,
        type: 'duration',
        removable: true,
        color: '#8b5cf6'
      });
    }

    setFilterChips(chips);
  }, [filters]);

  const handleFilterChange = useCallback((updates: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const handlePresetSelect = useCallback((preset: SearchPreset) => {
    setActivePreset(preset.id);
    setFilters(prev => ({ ...prev, ...preset.filters }));
    onFiltersChange({ ...filters, ...preset.filters });
  }, [filters, onFiltersChange]);

  const handleChipRemove = useCallback((chipId: string) => {
    const chip = filterChips.find(c => c.id === chipId);
    if (!chip) return;

    switch (chip.type) {
      case 'search':
        handleFilterChange({ search: '' });
        break;
      case 'priority':
        handleFilterChange({ 
          priority: filters.priority.filter(p => p !== chip.value) 
        });
        break;
      case 'difficulty':
        handleFilterChange({ 
          difficulty: filters.difficulty.filter(d => d !== chip.value) 
        });
        break;
      case 'energy':
        handleFilterChange({ 
          energyRange: { min: 1, max: 50 } 
        });
        break;
      case 'duration':
        handleFilterChange({ 
          durationRange: { min: 1, max: 480 } 
        });
        break;
    }
  }, [filterChips, filters, handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      searchFields: ['title', 'description', 'skills', 'subtasks', 'tags'],
      priority: [],
      difficulty: [],
      skills: [],
      tags: [],
      energyRange: { min: 1, max: 50 },
      durationRange: { min: 1, max: 480 },
      energyMatch: [],
      dueDateRange: { start: null, end: null },
      createdDateRange: { start: null, end: null },
      xpRange: { min: 0, max: 10000 },
      cpRange: { min: 0, max: 10000 },
      isRecurring: null,
      recurrenceTypes: [],
      status: ['active'],
      isFavorite: null,
      subtaskCompletion: 'all'
    });
    setActivePreset(null);
  }, []);

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'highest': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      case 'lowest': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'hard': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'easy': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Search Bar */}
      <div className={styles.searchSection}>
        <div className={styles.searchInputContainer}>
          <input
            type="text"
            placeholder="Search quests..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className={styles.searchInput}
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
            title={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className={styles.suggestions}>
            {searchSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={styles.suggestionItem}
                onClick={() => {
                  handleFilterChange({ search: suggestion.text });
                  setShowSuggestions(false);
                }}
              >
                <span className={styles.suggestionIcon}>{suggestion.icon}</span>
                <span className={styles.suggestionText}>{suggestion.text}</span>
                <span className={styles.suggestionCount}>({suggestion.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Chips */}
      {filterChips.length > 0 && (
        <div className={styles.filterChips}>
          {filterChips.map(chip => (
            <div
              key={chip.id}
              className={styles.filterChip}
              style={{ backgroundColor: chip.color }}
            >
              <span className={styles.chipLabel}>{chip.label}</span>
              {chip.removable && (
                <button
                  onClick={() => handleChipRemove(chip.id)}
                  className={styles.chipRemove}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={clearAllFilters}
            className={styles.clearAllButton}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Search Presets */}
      <div className={styles.presetsSection}>
        <h4 className={styles.sectionTitle}>Quick Filters</h4>
        <div className={styles.presetGrid}>
          {SEARCH_PRESETS.map(preset => (
            <button
              key={preset.id}
              className={`${styles.presetButton} ${
                activePreset === preset.id ? styles.presetActive : ''
              }`}
              onClick={() => handlePresetSelect(preset)}
              style={{ 
                borderColor: preset.color,
                backgroundColor: activePreset === preset.id ? preset.color : 'transparent'
              }}
            >
              <span className={styles.presetIcon}>{preset.icon}</span>
              <span className={styles.presetName}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className={styles.advancedFilters}>
          <div className={styles.filterRow}>
            {/* Priority Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Priority</label>
              <div className={styles.multiSelect}>
                {['lowest', 'low', 'medium', 'high', 'highest'].map(priority => (
                  <label key={priority} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange({ 
                            priority: [...filters.priority, priority] 
                          });
                        } else {
                          handleFilterChange({ 
                            priority: filters.priority.filter(p => p !== priority) 
                          });
                        }
                      }}
                    />
                    <span className={styles.checkboxText}>{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Difficulty</label>
              <div className={styles.multiSelect}>
                {['easy', 'medium', 'hard'].map(difficulty => (
                  <label key={difficulty} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.difficulty.includes(difficulty)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange({ 
                            difficulty: [...filters.difficulty, difficulty] 
                          });
                        } else {
                          handleFilterChange({ 
                            difficulty: filters.difficulty.filter(d => d !== difficulty) 
                          });
                        }
                      }}
                    />
                    <span className={styles.checkboxText}>{difficulty}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.filterRow}>
            {/* Energy Range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                Energy Range: {filters.energyRange.min} - {filters.energyRange.max}
              </label>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={filters.energyRange.min}
                  onChange={(e) => handleFilterChange({
                    energyRange: { ...filters.energyRange, min: parseInt(e.target.value) }
                  })}
                  className={styles.rangeInput}
                />
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={filters.energyRange.max}
                  onChange={(e) => handleFilterChange({
                    energyRange: { ...filters.energyRange, max: parseInt(e.target.value) }
                  })}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            {/* Duration Range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                Duration: {filters.durationRange.min} - {filters.durationRange.max} min
              </label>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="1"
                  max="480"
                  value={filters.durationRange.min}
                  onChange={(e) => handleFilterChange({
                    durationRange: { ...filters.durationRange, min: parseInt(e.target.value) }
                  })}
                  className={styles.rangeInput}
                />
                <input
                  type="range"
                  min="1"
                  max="480"
                  value={filters.durationRange.max}
                  onChange={(e) => handleFilterChange({
                    durationRange: { ...filters.durationRange, max: parseInt(e.target.value) }
                  })}
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>

          <div className={styles.filterRow}>
            {/* Status Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status</label>
              <div className={styles.multiSelect}>
                {['active', 'completed', 'overdue'].map(status => (
                  <label key={status} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange({ 
                            status: [...filters.status, status as any] 
                          });
                        } else {
                          handleFilterChange({ 
                            status: filters.status.filter(s => s !== status) 
                          });
                        }
                      }}
                    />
                    <span className={styles.checkboxText}>{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Recurring Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Recurring</label>
              <select
                value={filters.isRecurring === null ? 'all' : filters.isRecurring ? 'yes' : 'no'}
                onChange={(e) => {
                  const value = e.target.value === 'all' ? null : e.target.value === 'yes';
                  handleFilterChange({ isRecurring: value });
                }}
                className={styles.selectInput}
              >
                <option value="all">All</option>
                <option value="yes">Recurring Only</option>
                <option value="no">Non-Recurring Only</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
