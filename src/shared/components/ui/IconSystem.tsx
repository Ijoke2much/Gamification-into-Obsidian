/**
 * Centralized Icon System for Gamification Plugin
 * 
 * This file provides both emoji and SVG icons in a performance-optimized way.
 * Icons are categorized and can be easily imported throughout the application.
 */

import React from 'react';

// Export all optimized SVG icons
export * from './OptimizedIcons';

// Export game-specific icons 
export {
  PlayerIcon,
  ShopIcon,
  QuestIcon,
  BossIcon,
  StatsIcon,
  AchievementsIcon,
  SkillTreeIcon,
  InventoryIcon,
  FlameTimerIcon,
  HabitsIcon,
  getDifficultyIcon,
  EasyIcon,
  MediumIcon,
  HardIcon
} from './GameIcons';

// Emoji icon collections for easy access
export const EmojiIcons = {
  // Actions
  add: '➕',
  edit: '✏️',
  delete: '🗑️',
  save: '💾',
  close: '❌',
  check: '✅',
  target: '🎯',
  
  // Navigation
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
  expand: '🔽',
  collapse: '🔼',
  
  // Stats & Progress
  fire: '🔥',
  trophy: '🏆',
  star: '⭐',
  lightning: '⚡',
  crown: '👑',
  gem: '💎',
  
  // Activities
  calendar: '📅',
  clock: '⏰',
  timer: '⏱️',
  chart: '📊',
  activity: '📈',
  
  // Items & Rewards
  coin: '🪙',
  potion: '🧪',
  weapon: '⚔️',
  shield: '🛡️',
  bow: '🏹',
  wand: '🪄',
  
  // Nature & Growth
  tree: '🌳',
  sprout: '🌱',
  flower: '🌸',
  
  // Emotions & Status
  happy: '😊',
  success: '🎉',
  warning: '⚠️',
  error: '❗',
  info: 'ℹ️',
  
  // Food & Consumables
  food: '🍖',
  bread: '🍞',
  apple: '🍎',
  
  // Tools & Equipment
  hammer: '🔨',
  axe: '🪓',
  pickaxe: '⛏️',
  key: '🗝️',
} as const;

// Type for emoji icon keys
export type EmojiIconKey = keyof typeof EmojiIcons;

// Helper component for consistent emoji rendering
export const EmojiIcon: React.FC<{
  icon: EmojiIconKey | string;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  'aria-label'?: string;
}> = ({ icon, size = 'md', className = '', 'aria-label': ariaLabel }) => {
  const iconValue = typeof icon === 'string' && icon in EmojiIcons 
    ? EmojiIcons[icon as EmojiIconKey] 
    : icon;
    
  const fontSize = typeof size === 'number' 
    ? `${size}px`
    : size === 'sm' 
      ? '0.875rem' 
      : size === 'lg' 
        ? '1.5rem' 
        : '1rem';

  return (
    <span 
      className={`emoji-icon ${className}`}
      style={{ 
        fontSize,
        display: 'inline-block',
        lineHeight: 1,
        verticalAlign: 'middle'
      }}
      role="img"
      aria-label={ariaLabel || (typeof icon === 'string' ? icon : undefined)}
    >
      {iconValue}
    </span>
  );
};

// Quick access functions for common icons
export const getActionIcon = (action: 'add' | 'edit' | 'delete' | 'save' | 'close') => 
  EmojiIcons[action];

export const getStatusIcon = (status: 'success' | 'warning' | 'error' | 'info') => 
  status === 'success' ? EmojiIcons.check : EmojiIcons[status];

export const getNavigationIcon = (direction: 'up' | 'down' | 'left' | 'right') => 
  EmojiIcons[direction];

// Icon category collections for systematic usage
export const IconCategories = {
  actions: {
    add: EmojiIcons.add,
    edit: EmojiIcons.edit,
    delete: EmojiIcons.delete,
    save: EmojiIcons.save,
    close: EmojiIcons.close,
  },
  
  rewards: {
    coin: EmojiIcons.coin,
    gem: EmojiIcons.gem,
    trophy: EmojiIcons.trophy,
    crown: EmojiIcons.crown,
    star: EmojiIcons.star,
  },
  
  equipment: {
    weapon: EmojiIcons.weapon,
    shield: EmojiIcons.shield,
    bow: EmojiIcons.bow,
    wand: EmojiIcons.wand,
  },
  
  tools: {
    hammer: EmojiIcons.hammer,
    axe: EmojiIcons.axe,
    pickaxe: EmojiIcons.pickaxe,
    key: EmojiIcons.key,
  }
} as const;
