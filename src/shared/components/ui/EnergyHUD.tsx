import React, { useState, useEffect } from 'react';
import { playerStore, PlayerStateChange } from '../../state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import styles from './EnergyHUD.module.css';
import { BatteryProgressBar } from './BatteryProgressBar';

interface EnergyHUDProps {
  className?: string;
  showTooltips?: boolean;
  compact?: boolean;
}

export const EnergyHUD: React.FC<EnergyHUDProps> = ({ 
  className = '', 
  showTooltips = true,
  compact = false 
}) => {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  useEffect(() => {
    const loadPlayerData = async () => {
      const data = await playerStore.get();
      setPlayerData(data);
    };

    loadPlayerData();

    // Subscribe to player data changes
    const unsubscribe = playerStore.onChange((change: PlayerStateChange) => {
      if (change.type === 'data-updated') {
        setPlayerData(change.payload);
      }
    });

    return unsubscribe;
  }, []);

  if (!playerData || !playerData.stats) {
    return <div className={`${styles.energyHUD} ${className}`}>Loading...</div>;
  }

  const stats = playerData.stats;
  const energy = stats.energy || 50;
  const focus = stats.focus || 50;
  const motivation = stats.motivation || 50;
  const calm = stats.calm || 50;
  const stress = stats.stress || 0;

  const getStatColor = (stat: string, value: number) => {
    if (value >= 80) return styles.high;
    if (value >= 50) return styles.medium;
    if (value >= 20) return styles.low;
    return styles.critical;
  };

  const getStatIcon = (stat: string, value: number) => {
    if (value >= 80) return '⚡';
    if (value >= 50) return '✅';
    if (value >= 20) return '⚠️';
    return '🔴';
  };

  const renderStatBar = (stat: string, value: number, maxValue: number = 100) => {
    const percentage = Math.min(100, (value / maxValue) * 100);
    const colorClass = getStatColor(stat, value);
    const icon = getStatIcon(stat, value);

    return (
      <div 
        key={stat}
        className={`${styles.statBar} ${colorClass}`}
        onMouseEnter={() => showTooltips && setIsHovered(stat)}
        onMouseLeave={() => setIsHovered(null)}
      >
        <div className={styles.statHeader}>
          <span className={styles.statIcon}>{icon}</span>
          <span className={styles.statName}>{stat}</span>
          <span className={styles.statValue}>{value}</span>
        </div>
        <div className={styles.barContainer}>
          <BatteryProgressBar 
            percent={percentage} 
            segments={20} 
            height={24} 
            statType={stat.toLowerCase() as 'energy' | 'focus' | 'motivation' | 'calm' | 'stress'}
          />
        </div>
        {showTooltips && isHovered === stat && (
          <div className={styles.tooltip}>
            {stat}: {value}/{maxValue}
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`${styles.energyHUD} ${styles.compact} ${className}`}>
        <div className={styles.compactStats}>
          <div className={`${styles.compactStat} ${getStatColor('energy', energy)}`}>
            <span className={styles.compactIcon}>⚡</span>
            <span className={styles.compactValue}>{energy}</span>
          </div>
          <div className={`${styles.compactStat} ${getStatColor('focus', focus)}`}>
            <span className={styles.compactIcon}>🎯</span>
            <span className={styles.compactValue}>{focus}</span>
          </div>
          <div className={`${styles.compactStat} ${getStatColor('motivation', motivation)}`}>
            <span className={styles.compactIcon}>💪</span>
            <span className={styles.compactValue}>{motivation}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.energyHUD} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Daily Stats</h3>
        <div className={styles.timeInfo}>
          {new Date().toLocaleDateString()}
        </div>
      </div>
      
      <div className={styles.statsContainer}>
        {renderStatBar('Energy', energy)}
        {renderStatBar('Focus', focus)}
        {renderStatBar('Motivation', motivation)}
        {renderStatBar('Calm', calm)}
        {renderStatBar('Stress', stress, 100)}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Overall:</span>
          <span className={`${styles.summaryValue} ${getStatColor('overall', (energy + focus + motivation) / 3)}`}>
            {Math.round((energy + focus + motivation) / 3)}%
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Status:</span>
          <span className={styles.summaryStatus}>
            {energy < 20 || focus < 20 ? '⚠️ Low Energy' : '✅ Good to Go'}
          </span>
        </div>
      </div>
    </div>
  );
};
