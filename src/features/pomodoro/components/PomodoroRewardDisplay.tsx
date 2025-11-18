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
  animate?: boolean; // Whether to animate the values or show them immediately
  onAnimationComplete?: () => void;
}

// Random material icons for variety
const MATERIAL_ICONS = [
  '💎', '🔮', '⚔️', '🛡️', '🎁', '🌟', '✨', '🔥', '⚡', '🌙',
  '☀️', '🌊', '🌪️', '🌍', '🌌', '🎯', '🏆', '👑', '💫', '🌈'
];

export const PomodoroRewardDisplay: React.FC<PomodoroRewardDisplayProps> = ({
  xp,
  cp,
  currency,
  currencySymbol,
  currencyName,
  materials,
  isVisible,
  animate = true, // Default to animation
  onAnimationComplete
}) => {
  const [displayedValues, setDisplayedValues] = useState({
    xp: 0,
    cp: 0,
    currency: 0
  });
  const [materialIcons, setMaterialIcons] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Generate random material icons
  useEffect(() => {
    if (materials.length > 0) {
      const icons = materials.map(() => 
        MATERIAL_ICONS[Math.floor(Math.random() * MATERIAL_ICONS.length)]
      );
      setMaterialIcons(icons);
    }
  }, [materials]);

  // Animate values when component becomes visible
  useEffect(() => {
    if (isVisible && !isAnimating && animate) {
      setIsAnimating(true);
      
      // Animate XP
      const xpInterval = setInterval(() => {
        setDisplayedValues(prev => {
          if (prev.xp < xp) {
            return { ...prev, xp: Math.min(prev.xp + Math.ceil(xp / 20), xp) };
          }
          clearInterval(xpInterval);
          return prev;
        });
      }, 50);

      // Animate CP
      const cpInterval = setInterval(() => {
        setDisplayedValues(prev => {
          if (prev.cp < cp) {
            return { ...prev, cp: Math.min(prev.cp + Math.ceil(cp / 20), cp) };
          }
          clearInterval(cpInterval);
          return prev;
        });
      }, 50);

      // Animate Currency
      const currencyInterval = setInterval(() => {
        setDisplayedValues(prev => {
          if (prev.currency < currency) {
            return { ...prev, currency: Math.min(prev.currency + Math.ceil(currency / 20), currency) };
          }
          clearInterval(currencyInterval);
          return prev;
        });
      }, 50);

      // Check if all animations are complete
      const checkComplete = setInterval(() => {
        if (displayedValues.xp >= xp && displayedValues.cp >= cp && displayedValues.currency >= currency) {
          clearInterval(checkComplete);
          setIsAnimating(false);
          onAnimationComplete?.();
        }
      }, 100);

      return () => {
        clearInterval(xpInterval);
        clearInterval(cpInterval);
        clearInterval(currencyInterval);
        clearInterval(checkComplete);
      };
    }
  }, [isVisible, xp, cp, currency, isAnimating, onAnimationComplete]);

  // Initialize values when component first loads
  useEffect(() => {
    // For quest rewards, show values immediately without animation
    if (isVisible && !animate) {
      setDisplayedValues({ xp, cp, currency });
    }
  }, [xp, cp, currency, isVisible, animate]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.rewardDisplay} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.rewardGrid}>
        {/* XP Display */}
        <div className={styles.rewardItem}>
          <div className={styles.rewardIcon}>⭐</div>
          <div className={styles.rewardValue}>+{displayedValues.xp}</div>
          <div className={styles.rewardLabel}>XP</div>
        </div>

        {/* CP Display */}
        <div className={styles.rewardItem}>
          <div className={styles.rewardIcon}>⚡</div>
          <div className={styles.rewardValue}>+{displayedValues.cp}</div>
          <div className={styles.rewardLabel}>CP</div>
        </div>

        {/* Currency Display */}
        <div className={styles.rewardItem}>
          <div className={styles.rewardIcon}>{currencySymbol}</div>
          <div className={styles.rewardValue}>+{displayedValues.currency}</div>
          <div className={styles.rewardLabel}>{currencyName}</div>
        </div>

        {/* Materials Display */}
        {materials.length > 0 && (
          <div className={styles.materialsContainer}>
            <div className={styles.materialsLabel}>Materials</div>
            <div className={styles.materialsGrid}>
              {materials.map((material, index) => (
                <div key={index} className={styles.materialItem}>
                  <div className={styles.materialIcon}>
                    {materialIcons[index] || material.icon}
                  </div>
                  <div className={styles.materialName}>{material.name}</div>
                  <div className={`${styles.materialQuality} ${styles[material.quality]}`}>
                    {material.quality}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
