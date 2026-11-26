/**
 * Integration Example: How to use i18n and theming in your components
 * This file shows how to integrate the new features into existing components
 */

import React from 'react';
import { i18n, formatDate, formatTime, formatDateTime, formatNumber, formatCurrency, t } from './i18n';
import { theming, setTheme, getTheme } from './theming';

// ============================================================================
// EXAMPLE 1: Using i18n in a Quest Component
// ============================================================================

export const QuestCardExample = () => {
  // Instead of hardcoded strings, use translation keys
  const questTitle = t('questTitle');
  const questDescription = t('questDescription');
  const questDueDate = t('questDueDate');
  const questComplete = t('questComplete');
  const questIncomplete = t('questIncomplete');

  // Instead of hardcoded date formatting, use i18n formatting
  const formatQuestDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDateTime(date);
  };

  // Instead of hardcoded number formatting, use i18n formatting
  const formatQuestReward = (xp: number, coins: number) => {
    return `${formatNumber(xp)} XP, ${formatCurrency(coins, 'USD')}`;
  };

  return {
    questTitle,
    questDescription,
    questDueDate,
    questComplete,
    questIncomplete,
    formatQuestDate,
    formatQuestReward
  };
};

// ============================================================================
// EXAMPLE 2: Using theming in a Component
// ============================================================================

export const ThemedComponentExample = () => {
  // Get current theme
  const theme = getTheme();

  // Apply theme-aware styling
  const getComponentStyles = () => {
    return {
      backgroundColor: 'var(--gamification-background)',
      color: 'var(--gamification-text)',
      borderColor: 'var(--gamification-primary)',
      // Use CSS custom properties that are automatically updated by theming service
    };
  };

  // Check if we should reduce motion
  const shouldReduceMotion = theming.prefersReducedMotion();

  return {
    theme,
    getComponentStyles,
    shouldReduceMotion
  };
};

// ============================================================================
// EXAMPLE 3: Settings Integration
// ============================================================================

export const SettingsIntegrationExample = (settings: any) => {
  // Initialize i18n with settings
  if (settings.internationalization?.locale) {
    i18n.setLocale(settings.internationalization.locale);
  }

  // Initialize theming with settings
  if (settings.theming) {
    theming.setTheme(settings.theming);
  }

  // Update i18n when settings change
  const updateI18nSettings = (newI18nSettings: any) => {
    if (newI18nSettings.locale) {
      i18n.setLocale(newI18nSettings.locale);
    }
  };

  // Update theming when settings change
  const updateThemingSettings = (newThemingSettings: any) => {
    theming.setTheme(newThemingSettings);
  };

  return {
    updateI18nSettings,
    updateThemingSettings
  };
};

// ============================================================================
// EXAMPLE 4: CSS Integration
// ============================================================================

export const CSSIntegrationExample = `
/* Use CSS custom properties for theming */
.quest-card {
  background-color: var(--gamification-background);
  color: var(--gamification-text);
  border: 1px solid var(--gamification-primary);
  border-radius: 8px;
  padding: 16px;
}

.quest-card:hover {
  background-color: var(--gamification-surface);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}

.quest-card.completed {
  background-color: var(--gamification-success);
  color: white;
}

.quest-card.overdue {
  background-color: var(--gamification-error);
  color: white;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .quest-card {
    transition: none;
  }
  
  .quest-card:hover {
    transform: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .quest-card {
    --gamification-background: #1f2937;
    --gamification-text: #f9fafb;
    --gamification-surface: #374151;
  }
}
`;

// ============================================================================
// EXAMPLE 5: Component with Full Integration
// ============================================================================

export const FullyIntegratedComponent = (props: any) => {
  const { quest, settings } = props;

  // Initialize with settings
  React.useEffect(() => {
    if (settings.internationalization?.locale) {
      i18n.setLocale(settings.internationalization.locale);
    }
    if (settings.theming) {
      theming.setTheme(settings.theming);
    }
  }, [settings]);

  // Use i18n for all text
  const questTitle = t('questTitle');
  const questDescription = t('questDescription');
  const questDueDate = t('questDueDate');
  const questComplete = t('questComplete');
  const questIncomplete = t('questIncomplete');

  // Use i18n for formatting
  const formatQuestDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDateTime(date);
  };

  const formatQuestReward = (xp: number, coins: number) => {
    return `${formatNumber(xp)} XP, ${formatCurrency(coins, 'USD')}`;
  };

  // Use theming for styling
  const getQuestCardClass = () => {
    const baseClass = 'quest-card';
    const statusClass = quest.completed ? 'completed' : 'incomplete';
    const themeClass = `theme-${getTheme().mode}`;
    return `${baseClass} ${statusClass} ${themeClass}`;
  };

  return {
    questTitle,
    questDescription,
    questDueDate,
    questComplete,
    questIncomplete,
    formatQuestDate,
    formatQuestReward,
    getQuestCardClass
  };
};

// ============================================================================
// MIGRATION GUIDE
// ============================================================================

export const MigrationGuide = `
# Migration Guide: Adding i18n and Theming to Existing Components

## Step 1: Import the utilities
\`\`\`typescript
import { i18n, formatDate, formatTime, formatDateTime, formatNumber, formatCurrency, t } from '../shared/utils/i18n';
import { theming, setTheme, getTheme } from '../shared/utils/theming';
\`\`\`

## Step 2: Replace hardcoded strings
\`\`\`typescript
// Before
const title = "Quest Board";
const description = "Manage your quests";

// After
const title = t('questBoard');
const description = t('questDescription');
\`\`\`

## Step 3: Replace hardcoded date/number formatting
\`\`\`typescript
// Before
const formattedDate = date.toLocaleDateString('en-US');
const formattedNumber = number.toLocaleString('en-US');

// After
const formattedDate = formatDate(date);
const formattedNumber = formatNumber(number);
\`\`\`

## Step 4: Use CSS custom properties for theming
\`\`\`css
/* Before */
.quest-card {
  background-color: #ffffff;
  color: #1f2937;
  border-color: #667eea;
}

/* After */
.quest-card {
  background-color: var(--gamification-background);
  color: var(--gamification-text);
  border-color: var(--gamification-primary);
}
\`\`\`

## Step 5: Initialize with settings
\`\`\`typescript
useEffect(() => {
  if (settings.internationalization?.locale) {
    i18n.setLocale(settings.internationalization.locale);
  }
  if (settings.theming) {
    theming.setTheme(settings.theming);
  }
}, [settings]);
\`\`\`
`;
