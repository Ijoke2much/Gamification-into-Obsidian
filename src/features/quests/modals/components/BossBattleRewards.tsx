import React, { memo } from 'react';
import { BossBattleState } from '../../types/BossTypes';
import { EnhancedBossRewards } from '../../services/bossRewardService';
import { currencyDisplay } from '../../../../shared/services/currencyDisplayService';
import styles from '../BossBattleModal.module.css';

interface BossBattleRewardsProps {
  battleState: BossBattleState;
  showRewards: boolean;
  enhancedRewards: EnhancedBossRewards | null;
  onClose: () => void;
}

export const BossBattleRewards: React.FC<BossBattleRewardsProps> = memo(({
  battleState,
  showRewards,
  enhancedRewards,
  onClose
}) => {
  if (!battleState.gameOver) return null;

  return (
    <div className={styles.gameOver}>
      <h2>{battleState.victory ? 'Victory!' : 'Defeat!'}</h2>
      {battleState.victory && showRewards && enhancedRewards ? (
        <div className={styles.victoryRewards}>
          <h3>🎉 Victory Rewards!</h3>
          
          {/* Base Rewards */}
          <div className={styles.rewardsList}>
            <div className={styles.rewardItem}>
              <span className={styles.rewardIcon}>✨</span>
              <span className={styles.rewardText}>{enhancedRewards.xp} XP</span>
              {enhancedRewards.experienceMultiplier > 1 && (
                <span className={styles.multiplier}>({enhancedRewards.experienceMultiplier.toFixed(1)}x)</span>
              )}
            </div>
            <div className={styles.rewardItem}>
              <span className={styles.rewardIcon}>⭐</span>
              <span className={styles.rewardText}>{enhancedRewards.cp} CP</span>
            </div>
            <div className={styles.rewardItem}>
              <span className={styles.rewardIcon}>{currencyDisplay.getCurrencySymbol()}</span>
              <span className={styles.rewardText}>{enhancedRewards.coins} {currencyDisplay.getCurrencyName()}</span>
            </div>
          </div>

          {/* Bonus Rewards */}
          {enhancedRewards.bonusRewards.length > 0 && (
            <div className={styles.bonusRewards}>
              <h4>🌟 Bonus Rewards:</h4>
              {enhancedRewards.bonusRewards.map((bonus, index) => (
                <div key={index} className={styles.bonusItem}>
                  <span className={styles.bonusIcon}>🎯</span>
                  <span className={styles.bonusText}>
                    {bonus.description}: +{bonus.value} XP
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Materials */}
          {enhancedRewards.materials.length > 0 && (
            <div className={styles.materialsSection}>
              <h4>💎 Materials Earned:</h4>
              {enhancedRewards.materials.map((material, index) => (
                <div key={index} className={styles.rewardItem}>
                  <span className={styles.rewardIcon}>💎</span>
                  <span className={styles.rewardText}>
                    {material.quantity}x {material.name} ({material.rarity})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Life Items */}
          {enhancedRewards.lifeItems.length > 0 && (
            <div className={styles.lifeItemsSection}>
              <h4>🎁 Life Rewards:</h4>
              {enhancedRewards.lifeItems.map((item, index) => (
                <div key={index} className={styles.rewardItem}>
                  <span className={styles.rewardIcon}>🎁</span>
                  <span className={styles.rewardText}>
                    {item.name}: {item.description}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Achievements */}
          {enhancedRewards.achievements.length > 0 && (
            <div className={styles.achievements}>
              <h4>🏆 Achievements Unlocked:</h4>
              {enhancedRewards.achievements.map((achievement, index) => (
                <div key={index} className={styles.achievement}>🏆 {achievement}</div>
              ))}
            </div>
          )}

          {/* Unlocked Features */}
          {enhancedRewards.unlockedFeatures.length > 0 && (
            <div className={styles.unlockedFeatures}>
              <h4>🔓 Unlocked Features:</h4>
              {enhancedRewards.unlockedFeatures.map((feature, index) => (
                <div key={index} className={styles.feature}>🔓 {feature}</div>
              ))}
            </div>
          )}

          {/* Seasonal Bonuses */}
          {enhancedRewards.seasonalBonuses.length > 0 && (
            <div className={styles.seasonalBonuses}>
              <h4>🎃 Seasonal Bonuses:</h4>
              {enhancedRewards.seasonalBonuses.map((bonus, index) => (
                <div key={index} className={styles.seasonalItem}>
                  <span className={styles.seasonalIcon}>🎃</span>
                  <span className={styles.seasonalText}>
                    {bonus.name}: +{bonus.value} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.defeatMessage}>
          <p>The boss was too powerful this time. Complete more tasks to grow stronger!</p>
          <button className={styles.retryButton} onClick={onClose}>
            Try Again Later
          </button>
        </div>
      )}
    </div>
  );
});
