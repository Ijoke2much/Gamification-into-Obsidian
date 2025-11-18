import React from 'react';
import { QuickFilterCard } from './QuickFilterCard';
import styles from './EnergyQuickFilterCard.module.css';

interface EnergyQuickFilterCardProps {
  label: string;
  emoji: string;
  count: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
  description?: string;
  compact?: boolean;
  // ADHD-specific props
  energyCostRange?: string; // e.g., "5-15 energy"
  recommendedFor?: 'high' | 'medium' | 'low' | 'any';
  currentEnergyMatch?: boolean;
}

export const EnergyQuickFilterCard: React.FC<EnergyQuickFilterCardProps> = ({
  energyCostRange,
  recommendedFor,
  currentEnergyMatch = false,
  ...props
}) => {
  // Compute extra bottom padding based on how many badges will render
  const badgeCount = (energyCostRange ? 1 : 0) + (recommendedFor && recommendedFor !== 'any' ? 1 : 0) + (currentEnergyMatch ? 1 : 0);
  const extraBottomPadding = Math.max(0, (badgeCount - 1) * 14 + 12);
  return (
    <div className={`${styles.energyWrapper} ${currentEnergyMatch ? styles.energyMatch : ''}`}>
      <QuickFilterCard {...props} extraBottomPadding={extraBottomPadding} />
      
      {/* Energy overlay information */}
      {(energyCostRange || recommendedFor) && (
        <div className={styles.energyOverlay}>
          {energyCostRange && (
            <div className={styles.energyCost}>
              ⚡ {energyCostRange}
            </div>
          )}
          {recommendedFor && recommendedFor !== 'any' && (
            <div className={`${styles.energyRecommendation} ${styles[recommendedFor]}`}>
              🔋 {recommendedFor} energy
            </div>
          )}
          {currentEnergyMatch && (
            <div className={styles.energyMatchIndicator}>
              🎯 Perfect match
            </div>
          )}
        </div>
      )}
    </div>
  );
};
