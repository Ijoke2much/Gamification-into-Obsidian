import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { EnhancedBossRewards } from '../services/bossRewardService';
import styles from './BossRewardNotification.module.css';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';

interface BossRewardNotificationProps {
  rewards: EnhancedBossRewards;
  bossName: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const BossRewardNotification: React.FC<BossRewardNotificationProps> = ({
  rewards,
  bossName,
  isVisible,
  onClose,
  duration = 5000
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setAnimationClass(styles.slideIn);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setAnimationClass(styles.slideOut);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 300);
  };

  if (!shouldRender) return null;

  const totalBonusXP = rewards.bonusRewards.reduce((sum, bonus) => sum + bonus.value, 0);
  const totalSeasonalXP = rewards.seasonalBonuses.reduce((sum, bonus) => sum + bonus.value, 0);
  const totalXP = rewards.xp + totalBonusXP + totalSeasonalXP;

  return createPortal(
    <div className={`${styles.notification} ${animationClass}`}>
      <div className={styles.header}>
        <div className={styles.title}>
          🎉 Boss Defeated!
        </div>
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
      </div>
      
      <div className={styles.content}>
        <div className={styles.bossName}>
          {bossName}
        </div>
        
        <div className={styles.mainRewards}>
          <div className={styles.rewardStat}>
            <span className={styles.rewardIcon}>✨</span>
            <span className={styles.rewardValue}>{totalXP}</span>
            <span className={styles.rewardLabel}>XP</span>
            {rewards.experienceMultiplier > 1 && (
              <span className={styles.multiplier}>
                {rewards.experienceMultiplier.toFixed(1)}x
              </span>
            )}
          </div>
          
          <div className={styles.rewardStat}>
            <span className={styles.rewardIcon}>⭐</span>
            <span className={styles.rewardValue}>{rewards.cp}</span>
            <span className={styles.rewardLabel}>CP</span>
          </div>
          
          <div className={styles.rewardStat}>
            <span className={styles.rewardIcon}>{currencyDisplay.getCurrencySymbol()}</span>
            <span className={styles.rewardValue}>{rewards.coins}</span>
            <span className={styles.rewardLabel}>{currencyDisplay.getCurrencyName()}</span>
          </div>
        </div>

        {/* Highlight special rewards */}
        <div className={styles.specialRewards}>
          {rewards.bonusRewards.length > 0 && (
            <div className={styles.bonusIndicator}>
              🌟 {rewards.bonusRewards.length} Bonus{rewards.bonusRewards.length > 1 ? 'es' : ''}
            </div>
          )}
          
          {rewards.materials.length > 0 && (
            <div className={styles.materialIndicator}>
              💎 {rewards.materials.length} Material{rewards.materials.length > 1 ? 's' : ''}
            </div>
          )}
          
          {rewards.unlockedFeatures.length > 0 && (
            <div className={styles.featureIndicator}>
              🔓 {rewards.unlockedFeatures.length} Feature{rewards.unlockedFeatures.length > 1 ? 's' : ''} Unlocked
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.footer}>
        <div className={styles.viewDetailsHint}>
          Check your inventory and stats for full rewards!
        </div>
      </div>
    </div>,
    document.body
  );
};

export const showBossRewardNotification = (
  rewards: EnhancedBossRewards,
  bossName: string,
  duration: number = 5000
): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    document.body.removeChild(container);
  };

  root.render(
    <BossRewardNotification
      rewards={rewards}
      bossName={bossName}
      isVisible={true}
      onClose={cleanup}
      duration={duration}
    />
  );
};
