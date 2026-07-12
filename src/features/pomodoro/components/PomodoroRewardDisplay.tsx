import React, { useState, useEffect } from 'react';
import styles from './PomodoroRewardDisplay.module.css';

interface PomodoroRewardDisplayProps {
  xp: number;
  cp: number;
  currency: number;
  currencySymbol: string;
  currencyName: string;
  materials: Array<{
    name: string;
    icon: string;
    quality: string;
    rarity: string;
  }>;
  isVisible: boolean;
  animate?: boolean;
  onAnimationComplete?: () => void;
}

function normalizeQualityClass(quality: string): string {
  const q = (quality || 'normal').toLowerCase();
  const map: Record<string, string> = {
    fresh: 'fresh',
    normal: 'normal',
    refined: 'refined',
    masterwork: 'masterwork',
    dried: 'dried',
    rare: 'refined',
    uncommon: 'normal',
    common: 'normal',
    special: 'masterwork',
  };
  const key = map[q];
  if (key && key in styles) return key;
  if (['fresh', 'normal', 'refined', 'masterwork', 'dried'].includes(q) && q in styles) return q;
  return 'normal';
}

function formatLootSummary(materials: PomodoroRewardDisplayProps['materials']): string {
  if (materials.length === 0) return '';
  if (materials.length === 1) {
    const m = materials[0];
    return `${m.icon} ${m.name}`.trim();
  }
  return materials.map((m) => `${m.icon} ${m.name}`.trim()).join(' · ');
}

export const PomodoroRewardDisplay: React.FC<PomodoroRewardDisplayProps> = ({
  xp,
  cp,
  currency,
  currencySymbol,
  currencyName,
  materials,
  isVisible,
  animate = true,
  onAnimationComplete,
}) => {
  const [displayedValues, setDisplayedValues] = useState({ xp: 0, cp: 0 });

  const showCurrency = currency > 0;
  const showMaterials = materials.length > 0;
  const lootSummary = formatLootSummary(materials);

  useEffect(() => {
    if (!isVisible || !animate) {
      if (isVisible && !animate) setDisplayedValues({ xp, cp });
      return;
    }

    setDisplayedValues({ xp: 0, cp: 0 });

    const xpInterval = window.setInterval(() => {
      setDisplayedValues((prev) => {
        if (prev.xp < xp) {
          return { ...prev, xp: Math.min(prev.xp + Math.max(1, Math.ceil(xp / 20)), xp) };
        }
        return prev;
      });
    }, 50);

    const cpInterval = window.setInterval(() => {
      setDisplayedValues((prev) => {
        if (prev.cp < cp) {
          return { ...prev, cp: Math.min(prev.cp + Math.max(1, Math.ceil(cp / 20)), cp) };
        }
        return prev;
      });
    }, 50);

    const duration = Math.min(2200, 400 + Math.max(xp, cp) * 8);
    const doneTimer = window.setTimeout(() => {
      window.clearInterval(xpInterval);
      window.clearInterval(cpInterval);
      setDisplayedValues({ xp, cp });
      onAnimationComplete?.();
    }, duration);

    return () => {
      window.clearInterval(xpInterval);
      window.clearInterval(cpInterval);
      window.clearTimeout(doneTimer);
    };
  }, [isVisible, xp, cp, animate, onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.rewardDisplay} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.rewardsHeading}>REWARDS</div>
      <div className={styles.rewardGrid}>
        <div className={styles.rewardItem}>
          <div className={styles.rewardIcon}>⭐</div>
          <div className={styles.rewardValue}>+{displayedValues.xp}</div>
          <div className={styles.rewardLabel}>XP</div>
        </div>

        <div className={styles.rewardItem}>
          <div className={styles.rewardIcon}>⚡</div>
          <div className={styles.rewardValue}>+{displayedValues.cp}</div>
          <div className={styles.rewardLabel}>CP</div>
        </div>

        {showCurrency && (
          <div className={styles.rewardItem}>
            <div className={styles.rewardIcon}>{currencySymbol}</div>
            <div className={styles.rewardValue}>+{currency}</div>
            <div className={styles.rewardLabel}>{currencyName}</div>
          </div>
        )}

        {showMaterials && (
          <div
            className={`${styles.rewardItem} ${styles.rewardItemLoot}`}
            title={materials.map((m) => `${m.name} (${m.quality})`).join(', ')}
          >
            <div className={styles.rewardIcon}>💎</div>
            <div className={styles.lootValueWrap}>
              <div className={styles.lootValue}>{lootSummary}</div>
              <div className={styles.lootQualities}>
                {materials.map((m, i) => (
                  <span
                    key={`${m.name}-${i}`}
                    className={`${styles.lootQualityPill} ${styles[normalizeQualityClass(m.quality) as keyof typeof styles]}`}
                  >
                    {m.quality}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.rewardLabel}>Items</div>
          </div>
        )}
      </div>
    </div>
  );
};
