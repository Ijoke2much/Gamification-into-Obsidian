import React from 'react';
import type { GameplayProfile } from '../../../core/settings';
import styles from './SettingsUI.module.css';

export interface GameplayOnboardingChoice {
  profile: GameplayProfile;
  label: string;
  icon: string;
  description: string;
}

const CHOICES: GameplayOnboardingChoice[] = [
  {
    profile: 'lite',
    label: 'Lite',
    icon: '🌱',
    description: 'Quests, Pomodoro, and energy only. No shop, crafting, or boss pressure.',
  },
  {
    profile: 'balanced',
    label: 'Balanced',
    icon: '⚖️',
    description: 'Recommended. Core tabs and boss battles; penalties off until you opt in.',
  },
  {
    profile: 'hardcore',
    label: 'Hardcore',
    icon: '💀',
    description: 'All tabs and systems on, including penalties and failure debt.',
  },
];

interface GameplayOnboardingModalProps {
  onSelectProfile: (profile: GameplayProfile) => void;
  onCustomize: () => void;
  onDismissBalanced: () => void;
}

export const GameplayOnboardingModal: React.FC<GameplayOnboardingModalProps> = ({
  onSelectProfile,
  onCustomize,
  onDismissBalanced,
}) => (
  <div className={styles.onboardingModal} role="dialog" aria-modal="true" aria-labelledby="gameplay-onboarding-title">
    <div className={styles.onboardingContent}>
      <h2 id="gameplay-onboarding-title" className={styles.onboardingTitle}>
        Choose your experience
      </h2>
      <p className={styles.onboardingLead}>
        Pick a starting profile. You can change tabs, penalties, and modules anytime under{' '}
        <strong>Advanced → Feature Modules</strong>.
      </p>

      <div className={styles.onboardingChoices}>
        {CHOICES.map((choice) => (
          <button
            key={choice.profile}
            type="button"
            className={`${styles.onboardingChoice} ${
              choice.profile === 'balanced' ? styles.onboardingChoiceRecommended : ''
            }`}
            onClick={() => onSelectProfile(choice.profile)}
          >
            <span className={styles.onboardingChoiceIcon}>{choice.icon}</span>
            <span className={styles.onboardingChoiceLabel}>{choice.label}</span>
            <span className={styles.onboardingChoiceDesc}>{choice.description}</span>
            {choice.profile === 'balanced' && (
              <span className={styles.onboardingRecommendedBadge}>Recommended</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.onboardingActions}>
        <button type="button" className={styles.onboardingPrimaryButton} onClick={onDismissBalanced}>
          Use Balanced &amp; save
        </button>
        <button type="button" className={styles.onboardingSecondaryButton} onClick={onCustomize}>
          Customize modules first
        </button>
      </div>
    </div>
  </div>
);
