import React from 'react';
import styles from './BatteryProgressBar.module.css';

interface BatteryProgressBarProps {
  percent: number; // 0-100
  segments?: number; // number of cells/segments in the battery
  width?: number; // total width in px
  height?: number; // battery height in px (excluding cap)
  showLabel?: boolean;
  className?: string;
  statType?: 'energy' | 'focus' | 'motivation' | 'calm' | 'stress' | 'default';
}

export const BatteryProgressBar: React.FC<BatteryProgressBarProps> = ({
  percent,
  segments = 10,
  width,
  height = 20,
  showLabel = false,
  className = '',
  statType = 'default',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filledSegments = Math.round((clamped / 100) * segments);
  
  // Debug logging
  console.log(`[BatteryProgressBar] percent: ${percent}, clamped: ${clamped}, filledSegments: ${filledSegments}/${segments}`);

  const getStatColors = () => {
    const colors = {
      energy: {
        high: { from: '#ef4444', to: '#dc2626', glow: '#ef4444' },    // Red energy
        medium: { from: '#f97316', to: '#ea580c', glow: '#f97316' },  // Orange
        low: { from: '#fbbf24', to: '#f59e0b', glow: '#fbbf24' },     // Yellow
        critical: { from: '#dc2626', to: '#991b1b', glow: '#dc2626' } // Dark red
      },
      focus: {
        high: { from: '#3b82f6', to: '#2563eb', glow: '#3b82f6' },    // Blue focus
        medium: { from: '#6366f1', to: '#4f46e5', glow: '#6366f1' },  // Indigo
        low: { from: '#8b5cf6', to: '#7c3aed', glow: '#8b5cf6' },     // Purple
        critical: { from: '#9333ea', to: '#7e22ce', glow: '#9333ea' } // Dark purple
      },
      motivation: {
        high: { from: '#f59e0b', to: '#d97706', glow: '#f59e0b' },    // Amber motivation
        medium: { from: '#eab308', to: '#ca8a04', glow: '#eab308' },  // Yellow
        low: { from: '#facc15', to: '#eab308', glow: '#facc15' },     // Light yellow
        critical: { from: '#d97706', to: '#b45309', glow: '#d97706' } // Dark amber
      },
      calm: {
        high: { from: '#10b981', to: '#059669', glow: '#10b981' },    // Green calm
        medium: { from: '#22c55e', to: '#16a34a', glow: '#22c55e' },  // Light green
        low: { from: '#4ade80', to: '#22c55e', glow: '#4ade80' },     // Bright green
        critical: { from: '#059669', to: '#047857', glow: '#059669' } // Dark green
      },
      stress: {
        high: { from: '#dc2626', to: '#991b1b', glow: '#dc2626' },    // Red stress (bad)
        medium: { from: '#ef4444', to: '#dc2626', glow: '#ef4444' },  // Light red
        low: { from: '#f87171', to: '#ef4444', glow: '#f87171' },     // Pink red
        critical: { from: '#991b1b', to: '#7f1d1d', glow: '#991b1b' } // Very dark red
      },
      default: {
        high: { from: '#10b981', to: '#059669', glow: '#10b981' },
        medium: { from: '#f59e0b', to: '#d97706', glow: '#f59e0b' },
        low: { from: '#f97316', to: '#ea580c', glow: '#f97316' },
        critical: { from: '#ef4444', to: '#dc2626', glow: '#ef4444' }
      }
    };

    const statColors = colors[statType] || colors.default;
    
    if (clamped >= 80) return statColors.high;
    if (clamped >= 50) return statColors.medium;
    if (clamped >= 20) return statColors.low;
    return statColors.critical;
  };

  const getLevelClass = (): string => {
    if (clamped >= 80) return styles.high;
    if (clamped >= 50) return styles.medium;
    if (clamped >= 20) return styles.low;
    return styles.critical;
  };

  return (
    <div
      className={`${styles.battery} ${getLevelClass()} ${className}`}
      style={{ 
        width: width ? `${width}px` : '100%',
        maxWidth: width ? `${width}px` : '400px',
        minWidth: '120px',
        height: `${height}px` 
      }}
      aria-label={`Battery at ${clamped}%`}
    >
      <div className={styles.body}>
        {Array.from({ length: segments }).map((_, idx) => {
          const isFilled = idx < filledSegments;
          const colors = getStatColors();
          
          return (
            <div
              key={idx}
              className={`${styles.cell} ${isFilled ? styles.filled : ''}`}
              data-filled={isFilled}
              data-segment={idx}
              style={{
                background: isFilled 
                  ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
                  : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isFilled 
                  ? `inset 0 1px 3px rgba(255, 255, 255, 0.2), 0 0 8px ${colors.glow}40`
                  : 'none'
              }}
            />
          );
        })}
      </div>
      <div className={styles.cap} />
      {showLabel && (
        <div className={styles.label}>{clamped}%</div>
      )}
    </div>
  );
};

export default BatteryProgressBar;


