import React, { useState } from 'react';
import { Quest } from '../utils/taskParser';
import { MobileCinematicQuestCard } from './MobileCinematicQuestCard';
import { SavedQuestsManager } from '../services/savedQuestsManager';
import styles from './ADHDEnhancedQuestCard.module.css';

interface EnergyInfo {
  cost: number;
  match: 'perfect' | 'good' | 'challenging' | 'insufficient';
  recommendation: string;
}

interface ADHDEnhancedQuestCardProps {
  quest: Quest;
  plugin?: any;
  onEdit: (quest: Quest) => void;
  onToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
  onCompleteQuest: (questTitle: string) => void;
  onUncompleteQuest?: (questTitle: string) => void;
  collapsed: boolean;
  onDeleteQuest?: (questTitle: string) => void;
  onFailQuest?: (questTitle: string) => void;
  onToggleFavorite?: (questTitle: string) => void;
  isSelected?: boolean;
  onSelect?: (questTitle: string) => void;
  bulkMode?: boolean; // Add missing prop
  
  // ADHD-specific props
  currentEnergy?: number;
  energyInfo?: EnergyInfo;
  onStartPomodoro?: (quest: Quest) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  onBreakDown?: (quest: Quest) => void;
}

// Memoized component to prevent unnecessary re-renders
export const ADHDEnhancedQuestCard: React.FC<ADHDEnhancedQuestCardProps> = React.memo(({
  quest,
  currentEnergy = 70,
  energyInfo,
  onStartPomodoro,
  onStartHyperfocus,
  onBreakDown,
  bulkMode = false,
  ...questCardProps
}) => {
  const [showADHDActions, setShowADHDActions] = useState(false);
  
  // Calculate energy info if not provided
  const calculatedEnergyInfo = energyInfo || calculateEnergyInfo(quest, currentEnergy);
  
  // Check if quest is eligible for hyperfocus
  const hyperfocusEligible =
    (quest.priority && ['high','highest'].includes(quest.priority.toLowerCase())) ||
    (quest.difficulty && ['hard','epic'].includes(quest.difficulty.toLowerCase()));
  
  // Check if quest is saved
  const isSaved = SavedQuestsManager.isQuestSaved(quest.id);
  
  return (
    <div className={`${styles.adhdWrapper} ${styles[calculatedEnergyInfo.match]}`}>
      {/* Energy indicator overlay - clickable for ADHD actions */}
      <div className={styles.energyIndicator}>
        <div 
          className={`${styles.energyBadge} ${styles.clickableEnergyBadge}`}
          onClick={(e) => {
            e.stopPropagation();
            const newState = !showADHDActions;
            console.log('🔋 Energy badge clicked in ADHD card:', { questId: quest.id, currentState: showADHDActions, newState });
            setShowADHDActions(newState);
          }}
          title="Click for energy-based actions"
        >
          <span className={styles.iconLabel}>Energy</span>
          ⚡ {calculatedEnergyInfo.cost}
          <span className={styles.energyClickHint}>▼</span>
          {showADHDActions && <span style={{color: 'red', fontSize: '8px', marginLeft: '4px'}}>CLICKED!</span>}
        </div>
        <div className={`${styles.energyMatch} ${styles[calculatedEnergyInfo.match]}`} title={`Energy match: ${calculatedEnergyInfo.match}`}>
          <span className={styles.iconLabel}>Match</span>
          {getEnergyMatchIcon(calculatedEnergyInfo.match)}
        </div>
      </div>
      
      {/* Original Far Cry quest card */}
      <MobileCinematicQuestCard
        {...questCardProps}
        quest={quest}
        bulkMode={bulkMode}
      />
      
      {/* ADHD action overlay (appears when energy badge is clicked) */}
      <div 
        className={`${styles.adhdActions} ${showADHDActions ? styles.visible : ''}`}
        style={showADHDActions ? {
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.8))',
          backdropFilter: 'blur(10px)',
          borderRadius: '0 0 8px 8px',
          padding: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 999,
          animation: 'slideUp 0.3s ease-out'
        } : {}}
      >
        <div className={styles.adhdActionsHeader}>
          <span>Energy-based Actions</span>
          <button 
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              setShowADHDActions(false);
            }}
            title="Close actions"
          >
            ✕
          </button>
        </div>
        <div className={styles.adhdActionButtons}>
          {calculatedEnergyInfo.match === 'perfect' && onStartPomodoro && (
            <button 
              className={`${styles.adhdButton} ${styles.primary}`}
              onClick={(e) => { e.stopPropagation(); onStartPomodoro(quest); }}
              title="Perfect energy match - start now!"
            >
              🚀 Start Now
            </button>
          )}
          
          {onStartHyperfocus && hyperfocusEligible && (
            <button 
              className={`${styles.adhdButton} ${styles.hyperfocus}`}
              onClick={(e) => { e.stopPropagation(); onStartHyperfocus(quest); }}
              title="Enter hyperfocus mode"
            >
              🧠⚡ Hyperfocus
            </button>
          )}
          
          {calculatedEnergyInfo.match === 'insufficient' && onBreakDown && (
            <button 
              className={`${styles.adhdButton} ${styles.breakdown}`}
              onClick={(e) => { e.stopPropagation(); onBreakDown(quest); }}
              title="Break into smaller tasks"
            >
              ✂️ Break Down
            </button>
          )}
          
          <button 
            className={`${styles.adhdButton} ${isSaved ? styles.primary : styles.save}`}
            onClick={(e) => { 
              e.stopPropagation();
              if (isSaved) {
                SavedQuestsManager.unsaveQuest(quest.id);
                console.log('🗑️ Quest unsaved:', quest.title);
                // Trigger re-render by dispatching event
                window.dispatchEvent(new CustomEvent('questUnsaved', { detail: { questId: quest.id } }));
              } else {
                saveForOptimalEnergy(quest, currentEnergy);
              }
            }}
            title={isSaved ? "Remove from saved" : "Save for when energy matches"}
          >
            {isSaved ? '✅ Saved' : '💾 Save Later'}
          </button>
        </div>
        
        <div className={styles.energyRecommendation}>
          {calculatedEnergyInfo.recommendation}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if these props change
  return (
    prevProps.quest.id === nextProps.quest.id &&
    prevProps.quest.completed === nextProps.quest.completed &&
    prevProps.quest.due === nextProps.quest.due &&
    prevProps.currentEnergy === nextProps.currentEnergy &&
    prevProps.collapsed === nextProps.collapsed &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.bulkMode === nextProps.bulkMode
  );
});

// Helper functions
function calculateEnergyInfo(quest: Quest, currentEnergy: number): EnergyInfo {
  // Estimate energy cost based on quest properties
  const baseCost = 10;
  const timeCost = quest.estimatedTime ? parseTimeToMinutes(quest.estimatedTime) / 5 : 5;
  const difficultyCost = quest.difficulty === 'hard' ? 15 : quest.difficulty === 'easy' ? 5 : 10;
  const skillCost = quest.skills?.length ? quest.skills.length * 2 : 0;
  
  const totalCost = Math.min(baseCost + timeCost + difficultyCost + skillCost, 50);
  const ratio = totalCost / currentEnergy;
  
  let match: EnergyInfo['match'];
  let recommendation: string;
  
  if (ratio <= 0.3) {
    match = 'perfect';
    recommendation = '🎯 Perfect match! Great time to start.';
  } else if (ratio <= 0.5) {
    match = 'good';
    recommendation = '✅ Good fit. You can handle this comfortably.';
  } else if (ratio <= 0.8) {
    match = 'challenging';
    recommendation = '⚡ Challenging but doable. Consider breaks.';
  } else {
    match = 'insufficient';
    recommendation = '🔋 Low energy. Rest first or break this down.';
  }
  
  return { cost: Math.round(totalCost), match, recommendation };
}

function getEnergyMatchIcon(match: EnergyInfo['match']): string {
  switch (match) {
    case 'perfect': return '🎯';
    case 'good': return '✅';
    case 'challenging': return '⚡';
    case 'insufficient': return '🔋';
    default: return '⚡';
  }
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+)\s*(min|hour|hr|h)/i);
  if (!match) return 15; // default
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit.startsWith('h')) return value * 60;
  return value;
}

function saveForOptimalEnergy(quest: Quest, currentEnergy: number = 70) {
  try {
    const savedQuest = SavedQuestsManager.saveQuestForLater(
      {
        id: quest.id,
        title: quest.title,
        difficulty: quest.difficulty,
        priority: quest.priority,
        estimatedTime: quest.estimatedTime
      },
      currentEnergy
    );
    
    console.log('✅ Quest saved for later:', savedQuest.questTitle);
    console.log(`   Optimal energy: ${savedQuest.optimalEnergy}%, Current: ${currentEnergy}%`);
    console.log(`   Reason: ${savedQuest.reason}`);
    
    // Show notification (if available)
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('questSavedForLater', {
        detail: { quest: savedQuest }
      });
      window.dispatchEvent(event);
    }
    
    return savedQuest;
  } catch (error) {
    console.error('Error saving quest for later:', error);
    return null;
  }
}
