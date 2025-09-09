import React from 'react';
import styles from './SkillProgressVisual.module.css';

interface SkillProgressData {
  name: string;
  currentLevel: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  maxLevel: number;
  isUnlocked: boolean;
  isMastered: boolean;
  progressToNext: number; // 0-100
}

interface SkillProgressVisualProps {
  skill: SkillProgressData;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  onSkillClick?: (skillName: string) => void;
}

export const SkillProgressVisual: React.FC<SkillProgressVisualProps> = ({
  skill,
  showDetails = true,
  size = 'medium',
  onSkillClick
}) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 90) return '#4ade80'; // Green
    if (progress >= 70) return '#fbbf24'; // Yellow
    if (progress >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getVisualEffect = () => {
    if (skill.isMastered) return styles.mastered;
    if (skill.progressToNext >= 90) return styles.glowing;
    if (skill.progressToNext >= 70) return styles.pulsing;
    if (!skill.isUnlocked) return styles.locked;
    return '';
  };

  const getLevelIcon = () => {
    if (skill.isMastered) return '👑';
    if (skill.currentLevel >= 5) return '⭐';
    if (skill.currentLevel >= 3) return '🔥';
    if (skill.currentLevel >= 1) return '✨';
    return '🔒';
  };

  return (
    <div 
      className={`${styles.skillProgress} ${styles[size]} ${getVisualEffect()}`}
      onClick={() => onSkillClick?.(skill.name)}
    >
      {/* Skill Header */}
      <div className={styles.skillHeader}>
        <div className={styles.skillIcon}>
          {getLevelIcon()}
        </div>
        <div className={styles.skillInfo}>
          <h4 className={styles.skillName}>{skill.name}</h4>
          <div className={styles.levelInfo}>
            Level {skill.currentLevel}/{skill.maxLevel}
          </div>
        </div>
        {skill.isMastered && (
          <div className={styles.masteryBadge}>
            MASTERED
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${skill.progressToNext}%`,
              backgroundColor: getProgressColor(skill.progressToNext)
            }}
          />
        </div>
        <div className={styles.progressText}>
          {skill.currentCP}/{skill.requiredCP} CP
          {skill.progressToNext > 0 && (
            <span className={styles.progressPercent}>
              ({skill.progressToNext.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      {/* Detailed Stats */}
      {showDetails && (
        <div className={styles.skillDetails}>
          <div className={styles.statRow}>
            <span>Total CP Earned:</span>
            <span className={styles.statValue}>{skill.totalCP}</span>
          </div>
          <div className={styles.statRow}>
            <span>CP to Next Level:</span>
            <span className={styles.statValue}>
              {skill.requiredCP - skill.currentCP}
            </span>
          </div>
          {skill.isUnlocked && !skill.isMastered && (
            <div className={styles.nextLevelPreview}>
              <span>Next Level Bonus:</span>
              <span className={styles.bonusText}>
                +{Math.floor(skill.currentLevel * 1.5)}% effectiveness
              </span>
            </div>
          )}
        </div>
      )}

      {/* Visual Effects Overlay */}
      {skill.isMastered && (
        <div className={styles.masteryOverlay}>
          <div className={styles.masterySparkles}>
            ✨✨✨
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillProgressVisual;
