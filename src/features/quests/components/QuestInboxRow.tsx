import React from 'react';
import type { Quest } from '../utils/taskParser';
import { EnergyCalculationService } from '../services/energyCalculationService';
import styles from './QuestInboxRow.module.css';

interface QuestInboxRowProps {
  quest: Quest;
  isSelected: boolean;
  onToggleSelect: (questTitle: string) => void;
  onOpen: (quest: Quest) => void;
  currentEnergy: number;
}

export const QuestInboxRow: React.FC<QuestInboxRowProps> = ({
  quest,
  isSelected,
  onToggleSelect,
  onOpen,
  currentEnergy,
}) => {
  const handleRowClick = () => {
    onOpen(quest);
  };

  const handleCheckboxClick: React.MouseEventHandler<HTMLInputElement> = (e) => {
    e.stopPropagation();
    onToggleSelect(quest.title);
  };

  const dueLabel = getDueLabel(quest.due);
  const { energyLabel, isOverBudget } = getEnergyLabel(quest, currentEnergy);
  const isOverdue = dueLabel === 'Overdue';

  return (
    <div
      className={[
        styles.row,
        isSelected ? styles.selected : '',
        isOverdue ? styles.overdue : '',
        isOverBudget ? styles.energyHeavy : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleRowClick}
    >
      {/* LEFT: selection + quick icons */}
      <div className={styles.left}>
        <input
          type="checkbox"
          checked={isSelected}
          onClick={handleCheckboxClick}
          readOnly
        />
        {quest.isFavorite && <span className={styles.icon}>⭐</span>}
      </div>

      {/* MIDDLE: title + meta */}
      <div className={styles.middle}>
        <div className={styles.title}>{quest.title}</div>
        <div className={styles.meta}>
          {quest.priority && (
            <>
              <span
                className={[
                  styles.priorityDot,
                  styles[quest.priority.toLowerCase()] || '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span className={styles.metaItem}>{quest.priority}</span>
            </>
          )}
          {quest.skills && quest.skills.length > 0 && (
            <span className={styles.metaItem}>
              {quest.skills.slice(0, 2).join(' · ')}
              {quest.skills.length > 2 && ' ···'}
            </span>
          )}
          {quest.tags && quest.tags.length > 0 && (
            <span className={styles.metaItem}>
              {quest.tags.slice(0, 2).join(' · ')}
              {quest.tags.length > 2 && ' ···'}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT: due, energy, rewards */}
      <div className={styles.right}>
        <span className={[styles.badge, styles.dueBadge].join(' ')}>{dueLabel}</span>
        <span className={[styles.badge, styles.energyBadge].join(' ')}>{energyLabel}</span>
        {(quest.xp || quest.cp) && (
          <span className={styles.rewards}>
            {quest.xp ? `+${quest.xp} XP` : ''}
            {quest.cp ? ` · +${quest.cp} CP` : ''}
          </span>
        )}
        {quest.estimatedTime && (
          <span className={styles.time}>{quest.estimatedTime}</span>
        )}
        <span
          className={styles.menu}
          onClick={(e) => {
            e.stopPropagation();
            // Placeholder for future context menu actions
          }}
        >
          ⋮
        </span>
      </div>
    </div>
  );
};

function getDueLabel(due?: string): string {
  if (!due) return 'No due date';

  const dueDate = new Date(due);
  const today = new Date();
  const todayStr = today.toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (dueDate.toDateString() === todayStr) return 'Today';
  if (dueDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  if (dueDate < today) return 'Overdue';
  return dueDate.toLocaleDateString();
}

function getEnergyLabel(quest: Quest, currentEnergy: number): {
  energyLabel: string;
  isOverBudget: boolean;
} {
  const result = EnergyCalculationService.calculateQuestEnergy(quest, currentEnergy);

  let emoji = '⚡';
  switch (result.match) {
    case 'perfect':
      emoji = '🎯';
      break;
    case 'good':
      emoji = '✅';
      break;
    case 'challenging':
      emoji = '⚡';
      break;
    case 'insufficient':
      emoji = '🔋';
      break;
  }

  const energyLabel = `${emoji} ${result.match}`;
  const isOverBudget = result.match === 'insufficient';

  return { energyLabel, isOverBudget };
}
