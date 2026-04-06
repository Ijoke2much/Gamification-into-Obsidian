import React from 'react';
import ReactDOM from 'react-dom';
import { Boss } from '../types/BossTypes';
import { EnhancedBossRewards } from '../services/bossRewardService';
import TacticalBattleUI from '../components/TacticalBattleUI';
import type { Quest } from '../utils/taskParser';
import type { PlayerData } from '../../../data/models/PlayerData';
import { applyTacticalBattleBonuses } from '../../../shared/utils/questCompletionPipeline';
import type { TacticalBattleCompletionExtras } from '../utils/tacticalBattleCompletion';

interface BossBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  boss: Boss;
  onVictory: (boss: Boss, rewards?: EnhancedBossRewards) => void;
  onDefeat: () => void;
  questContext?: {
    timeTaken?: number;
    questCompletionRate?: number;
    perfectCompletion?: boolean;
  };
}

export const BossBattleModal: React.FC<BossBattleModalProps> = ({
  isOpen,
  onClose,
  boss,
  onVictory,
  onDefeat,
  questContext
}) => {
  if (!isOpen) return null;

  // Convert Boss to Quest format for TacticalBattleUI
  const questFromBoss: Quest = {
    id: boss.id,
    title: boss.title,
    className: 'boss',
    stats: [],
    xp: boss.rewards?.xp || 100,
    cp: boss.rewards?.cp || 50,
    coins: boss.rewards?.coins || 25,
    priority: 'medium',
    difficulty: 'medium',
    due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    skills: [],
    description: boss.description || 'A challenging boss battle',
    subtasks: [],
    completed: false,
    tags: ['boss', 'battle'],
    estimatedTime: '60',
    energyCost: 20
  };

  // Create mock player data (in real implementation, this would come from props)
  const mockPlayerData: PlayerData = {
    name: 'Player',
    avatar: '🧙',
    rank: 'Adventurer',
    masterClass: 'Warrior',
    description: 'A skilled fighter',
    level: 5,
    xp: 2500,
    xpRequired: 3000,
    total_exp: 8500,
    coins: 1250,
    cp: 500,
    inventory: [],
    stats: {
      energy: 70,
      focus: 80,
      motivation: 75,
      strength: 75,
      intelligence: 82,
      creativity: 68,
      communication: 71,
      speed: 79,
      wisdom: 65
    },
    lastDailyReset: new Date().toISOString()
  };

  const handleQuestComplete = async (questTitle: string, extras?: TacticalBattleCompletionExtras) => {
    console.log(`Quest completed: ${questTitle}`, extras);
    if (extras) {
      const bonusXp = (extras.moveBonusXp ?? 0) + (extras.finisherBonusXp ?? 0);
      const bonusCoins = extras.moveBonusCoins ?? 0;
      await applyTacticalBattleBonuses(bonusXp, bonusCoins);
    }
    onVictory(boss);
  };

  const handleQuestFail = (questTitle: string) => {
    console.log(`Quest failed: ${questTitle}`);
    onDefeat();
  };

  const handleSubtaskToggle = (questTitle: string, subtaskIndex: number) => {
    console.log(`Subtask toggled: ${questTitle}, index: ${subtaskIndex}`);
  };

  return ReactDOM.createPortal(
    <TacticalBattleUI
      quest={questFromBoss}
      playerData={mockPlayerData}
      onQuestComplete={handleQuestComplete}
      onQuestFail={handleQuestFail}
      onSubtaskToggle={handleSubtaskToggle}
      onClose={onClose}
    />,
    document.body
  );
};