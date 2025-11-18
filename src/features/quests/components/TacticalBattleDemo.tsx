import React, { useState } from 'react';
import TacticalBattleUI from './TacticalBattleUI';
import type { Quest } from '../utils/taskParser';
import type { PlayerData } from '../../../data/models/PlayerData';

interface TacticalBattleDemoProps {
  onClose: () => void;
}

const TacticalBattleDemo: React.FC<TacticalBattleDemoProps> = ({ onClose }) => {
  // Demo quest data
  const demoQuest: Quest = {
    id: 'demo-tactical-1',
    title: 'Training Dummy Dragon',
    className: 'training',
    stats: [],
    xp: 500,
    cp: 250,
    coins: 50,
    priority: 'medium',
    difficulty: 'medium',
    due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ['creativity', 'mindfulness'],
    description: 'A training battle to test your tactical skills',
    subtasks: [
      { text: 'Complete Task 1', completed: true },
      { text: 'Quest Analyze ability', completed: false },
      { text: 'Practice Create ability', completed: false }
    ],
    completed: false,
    tags: ['battle', 'training'],
    estimatedTime: '60',
    energyCost: 20
  };

  // Demo player data
  const demoPlayerData: PlayerData = {
    name: 'Adventurer',
    avatar: '🧙',
    rank: 'Warrior',
    masterClass: 'Battle Mage',
    description: 'A skilled tactical fighter',
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

  const handleQuestComplete = (questTitle: string) => {
    console.log(`Quest completed: ${questTitle}`);
    alert(`Victory! ${questTitle} completed!`);
    onClose();
  };

  const handleQuestFail = (questTitle: string) => {
    console.log(`Quest failed: ${questTitle}`);
    alert(`Defeat! ${questTitle} failed!`);
    onClose();
  };

  const handleSubtaskToggle = (questTitle: string, subtaskIndex: number) => {
    console.log(`Subtask toggled: ${questTitle}, index: ${subtaskIndex}`);
  };

  return (
    <TacticalBattleUI
      quest={demoQuest}
      playerData={demoPlayerData}
      onQuestComplete={handleQuestComplete}
      onQuestFail={handleQuestFail}
      onSubtaskToggle={handleSubtaskToggle}
      onClose={onClose}
    />
  );
};

export default TacticalBattleDemo;
