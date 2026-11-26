import React, { useState } from 'react';
import { EnergyQuickFilterCard } from './EnergyQuickFilterCard';
import { SavedQuestsManager } from '../services/savedQuestsManager';

/** Lite profile shows these by default; the rest sit behind "More filters". */
const LITE_PRIMARY_FILTERS = new Set(['all', 'today', 'quick_wins', 'overdue']);

interface EnhancedQuestFiltersProps {
  activeQuickFilter: string;
  setActiveQuickFilter: (filter: string) => void;
  quests: any[];
  currentEnergy: number;
  /** Phase 4 — collapse secondary filters for Lite profile */
  compactMode?: boolean;
  /** Hide energy-match filters when energy stat is not tracked */
  trackEnergyCost?: boolean;
}

export const EnhancedQuestFilters: React.FC<EnhancedQuestFiltersProps> = ({
  activeQuickFilter,
  setActiveQuickFilter,
  quests,
  currentEnergy,
  compactMode = false,
  trackEnergyCost = true,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const isFilterVisible = (filterId: string): boolean => {
    if (!trackEnergyCost && filterId === 'perfect_energy') {
      return false;
    }
    if (!compactMode) return true;
    if (LITE_PRIMARY_FILTERS.has(filterId)) return true;
    return showMoreFilters;
  };
  // Calculate quest counts for each filter
  const allQuests = quests.filter(q => !q.completed);
  const todayQuests = quests.filter(q => q.today && !q.completed);
  const tomorrowQuests = quests.filter(q => isTomorrow(q.due) && !q.completed);
  const overdueQuests = quests.filter(q => isOverdue(q.due) && !q.completed);
  const upcomingQuests = quests.filter(q => isUpcoming(q.due) && !q.completed);
  const noDueDateQuests = quests.filter(q => !q.due && !q.completed);
  
  // ADHD-specific filters
  const perfectEnergyQuests = quests.filter(q => 
    !q.completed && getEnergyMatch(q, currentEnergy) === 'perfect'
  );
  const quickWinQuests = quests.filter(q => 
    !q.completed && (q.estimatedTime && parseTimeToMinutes(q.estimatedTime) <= 10)
  );
  const hyperfocusQuests = quests.filter(q => 
    !q.completed && isHyperfocusCandidate(q)
  );
  
  // Saved for later filter
  const savedQuestIds = new Set(SavedQuestsManager.getAllSavedQuests().map(sq => sq.questId));
  const savedQuests = quests.filter(q => savedQuestIds.has(q.id) && !q.completed);
  const optimalSavedQuests = SavedQuestsManager.getOptimalSavedQuests(currentEnergy);

  return (
    <div
      data-quest-quick-filters="true"
      style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: 12,
      marginBottom: 48
    }}
    >
      {/* Original filters with energy enhancements */}
      {isFilterVisible('all') && (
      <EnergyQuickFilterCard
        label="ALL"
        emoji="📋"
        count={allQuests.length}
        color="99, 102, 241"
        isActive={activeQuickFilter === 'all'}
        onClick={() => setActiveQuickFilter('all')}
        
        description="All quests"
        energyCostRange="5-50"
        recommendedFor="any"
      />
      )}

      {isFilterVisible('today') && (
      <EnergyQuickFilterCard
        label="TODAY"
        emoji="🎯"
        count={todayQuests.length}
        color="34, 197, 94"
        isActive={activeQuickFilter === 'today'}
        onClick={() => setActiveQuickFilter('today')}
        
        description="Due today"
        energyCostRange="10-30"
        recommendedFor="medium"
        currentEnergyMatch={currentEnergy >= 40 && currentEnergy <= 80}
      />
      )}

      {isFilterVisible('tomorrow') && (
      <EnergyQuickFilterCard
        label="TOMORROW"
        emoji="📅"
        count={tomorrowQuests.length}
        color="59, 130, 246"
        isActive={activeQuickFilter === 'tomorrow'}
        onClick={() => setActiveQuickFilter('tomorrow')}
        
        description="Due tomorrow"
        energyCostRange="15-40"
        recommendedFor="high"
      />
      )}

      {isFilterVisible('overdue') && (
      <EnergyQuickFilterCard
        label="OVERDUE"
        emoji="🚨"
        count={overdueQuests.length}
        color="239, 68, 68"
        isActive={activeQuickFilter === 'overdue'}
        onClick={() => setActiveQuickFilter('overdue')}
        
        description="Past due"
        energyCostRange="5-25"
        recommendedFor="high"
        currentEnergyMatch={currentEnergy >= 70}
      />
      )}

      {isFilterVisible('upcoming') && (
      <EnergyQuickFilterCard
        label="UPCOMING"
        emoji="🔮"
        count={upcomingQuests.length}
        color="168, 85, 247"
        isActive={activeQuickFilter === 'upcoming'}
        onClick={() => setActiveQuickFilter('upcoming')}
        
        description="Due within 2 weeks"
        energyCostRange="10-35"
        recommendedFor="medium"
      />
      )}

      {isFilterVisible('no_due_date') && (
      <EnergyQuickFilterCard
        label="NO DUE DATE"
        emoji="📝"
        count={noDueDateQuests.length}
        color="107, 114, 128"
        isActive={activeQuickFilter === 'no_due_date'}
        onClick={() => setActiveQuickFilter('no_due_date')}
        
        description="Quests without due dates"
        energyCostRange="5-45"
        recommendedFor="any"
      />
      )}

      {/* ADHD-specific filters */}
      {isFilterVisible('perfect_energy') && (
      <EnergyQuickFilterCard
        label="PERFECT MATCH"
        emoji="🎯"
        count={perfectEnergyQuests.length}
        color="16, 185, 129"
        isActive={activeQuickFilter === 'perfect_energy'}
        onClick={() => setActiveQuickFilter('perfect_energy')}
        
        description="Perfect for your current energy"
        energyCostRange={`≤${Math.floor(currentEnergy * 0.3)}`}
        recommendedFor="any"
        currentEnergyMatch={true}
      />
      )}

      {isFilterVisible('quick_wins') && (
      <EnergyQuickFilterCard
        label="QUICK WINS"
        emoji="⚡"
        count={quickWinQuests.length}
        color="245, 158, 11"
        isActive={activeQuickFilter === 'quick_wins'}
        onClick={() => setActiveQuickFilter('quick_wins')}
        
        description="5-10 minute dopamine hits"
        energyCostRange="5-10"
        recommendedFor="low"
        currentEnergyMatch={currentEnergy < 40}
      />
      )}

      {isFilterVisible('hyperfocus') && (
      <EnergyQuickFilterCard
        label="HYPERFOCUS"
        emoji="🧠"
        count={hyperfocusQuests.length}
        color="139, 92, 246"
        isActive={activeQuickFilter === 'hyperfocus'}
        onClick={() => setActiveQuickFilter('hyperfocus')}
        
        description="Deep work candidates"
        energyCostRange="20-50"
        recommendedFor="high"
        currentEnergyMatch={currentEnergy >= 80}
      />
      )}

      {isFilterVisible('saved') && (
      <EnergyQuickFilterCard
        label="SAVED"
        emoji="💾"
        count={savedQuests.length}
        color="156, 163, 175"
        isActive={activeQuickFilter === 'saved'}
        onClick={() => setActiveQuickFilter('saved')}
        
        description={`Saved for later (${optimalSavedQuests.length} optimal now)`}
        energyCostRange="varies"
        recommendedFor="any"
        currentEnergyMatch={optimalSavedQuests.length > 0}
      />
      )}

      {compactMode && (
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          style={{
            gridColumn: '1 / -1',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--background-modifier-border)',
            background: 'var(--background-secondary)',
            color: 'var(--text-normal)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {showMoreFilters ? '▲ Fewer filters' : '▼ More filters'}
        </button>
      )}
    </div>
  );
};

// Helper functions
function isTomorrow(dueDate?: string): boolean {
  if (!dueDate) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(dueDate).toDateString() === tomorrow.toDateString();
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function isUpcoming(dueDate?: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(today.getDate() + 14);
  return due > today && due <= twoWeeksFromNow;
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+)\s*(min|hour|hr|h)/i);
  if (!match) return 15;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit.startsWith('h')) return value * 60;
  return value;
}

function getEnergyMatch(quest: any, currentEnergy: number): string {
  const estimatedCost = Math.min(
    10 + (quest.estimatedTime ? parseTimeToMinutes(quest.estimatedTime) / 5 : 5) +
    (quest.difficulty === 'hard' ? 15 : quest.difficulty === 'easy' ? 5 : 10),
    50
  );
  
  const ratio = estimatedCost / currentEnergy;
  
  if (ratio <= 0.3) return 'perfect';
  if (ratio <= 0.5) return 'good';
  if (ratio <= 0.8) return 'challenging';
  return 'insufficient';
}

function isHyperfocusCandidate(quest: any): boolean {
  // Quests that are good for hyperfocus sessions
  const hasDeepWorkSkills = quest.skills?.some((skill: string) => 
    ['@coding', '@writing', '@learning', '@research', '@analysis'].includes(skill)
  );
  const isLongEnough = quest.estimatedTime && parseTimeToMinutes(quest.estimatedTime) >= 30;
  const isComplex = quest.difficulty === 'hard' || quest.difficulty === 'epic';
  
  return hasDeepWorkSkills || isLongEnough || isComplex;
}
