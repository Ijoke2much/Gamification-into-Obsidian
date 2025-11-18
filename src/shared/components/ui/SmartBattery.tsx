import React from 'react';
import styles from './SmartBattery.module.css';

export interface SmartBatteryProps {
  currentEnergy: number;
  maxEnergy?: number;
  questEnergyCost?: number;
  energyTrend?: 'rising' | 'stable' | 'declining' | 'critical';
  showProjection?: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const SmartBattery: React.FC<SmartBatteryProps> = ({
  currentEnergy,
  maxEnergy = 100,
  questEnergyCost = 0,
  energyTrend = 'stable',
  showProjection = false,
  size = 'medium',
  interactive = false,
  showLabel = true,
  className = ''
}) => {
  const energyPercent = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));
  const projectedPercent = questEnergyCost > 0 
    ? Math.max(0, ((currentEnergy - questEnergyCost) / maxEnergy) * 100)
    : energyPercent;

  const getEnergyLevel = () => {
    if (energyPercent >= 80) return 'high';
    if (energyPercent >= 50) return 'medium';
    if (energyPercent >= 25) return 'low';
    return 'critical';
  };

  const getTrendIcon = () => {
    switch (energyTrend) {
      case 'rising': return '↗️';
      case 'declining': return '↘️';
      case 'critical': return '⚠️';
      case 'stable':
      default: return '→';
    }
  };

  const energyLevel = getEnergyLevel();

  return (
    <div className={`${styles.smartBattery} ${styles[size]} ${styles[energyLevel]} ${className}`}>
      {/* Battery Shell */}
      <div className={styles.batteryContainer}>
        <div className={styles.batteryShell}>
          {/* Battery Terminal */}
          <div className={styles.batteryTerminal} />
          
          {/* Current Energy Fill */}
          <div 
            className={`${styles.batteryFill} ${styles[energyLevel]}`}
            style={{ width: `${energyPercent}%` }}
          >
            {/* Energy segments for better readability */}
            <div className={styles.energySegments}>
              {Array.from({ length: 10 }, (_, i) => (
                <div 
                  key={i} 
                  className={`${styles.segment} ${i < (energyPercent / 10) ? styles.filled : styles.empty}`} 
                />
              ))}
            </div>
          </div>
          
          {/* Quest Energy Cost Preview */}
          {showProjection && questEnergyCost > 0 && projectedPercent < energyPercent && (
            <div 
              className={styles.energyProjection}
              style={{ 
                left: `${projectedPercent}%`,
                width: `${energyPercent - projectedPercent}%`
              }}
              title={`This quest will cost ${questEnergyCost} energy`}
            />
          )}
          
          {/* Energy Trend Indicator */}
          <div className={`${styles.trendIndicator} ${styles[energyTrend]}`}>
            {getTrendIcon()}
          </div>
        </div>
      </div>
      
      {/* Battery Stats */}
      {showLabel && (
        <div className={styles.batteryStats}>
          <div className={styles.energyValue}>
            {currentEnergy}/{maxEnergy}
          </div>
          {questEnergyCost > 0 && showProjection && (
            <div className={styles.energyCost}>
              -{questEnergyCost} ⚡
            </div>
          )}
        </div>
      )}
      
      {/* Interactive Energy Actions */}
      {interactive && (
        <div className={styles.batteryActions}>
          {energyPercent < 30 && (
            <button 
              className={`${styles.actionButton} ${styles.recharge}`}
              onClick={() => console.log('Recharge clicked')}
              title="Suggest energy restoration activities"
            >
              🔌 Recharge
            </button>
          )}
          {energyPercent > 80 && (
            <button 
              className={`${styles.actionButton} ${styles.highEnergy}`}
              onClick={() => console.log('High energy tasks clicked')}
              title="Show high energy tasks"
            >
              ⚡ High Energy
            </button>
          )}
        </div>
      )}
      
      {/* Energy Level Tooltip */}
      <div className={styles.tooltip}>
        <div className={styles.tooltipContent}>
          <div>Energy: {currentEnergy}/{maxEnergy}</div>
          <div>Level: {energyLevel}</div>
          <div>Trend: {energyTrend}</div>
          {questEnergyCost > 0 && (
            <div>After quest: {currentEnergy - questEnergyCost}</div>
          )}
        </div>
      </div>
    </div>
  );
};
