import React, { useMemo } from 'react';
import styles from './BatteryProgressBar.module.css';

interface BatteryProgressBarProps {
  percent: number;
  segments?: number;
  width?: number;
  height?: number;
  showLabel?: boolean;
  className?: string;
  statType?: 'energy' | 'focus' | 'motivation' | 'calm' | 'stress' | 'default';
  pixel?: boolean;
  statLabel?: string;
}

const EMPTY_FILL_PIXEL = 'var(--go-progress-track, #2f3558)';
const EMPTY_FILL_DEFAULT = 'var(--go-progress-track, #3d4154)';
const STROKE_PIXEL = 'var(--go-border, #0f1120)';
const STROKE_DEFAULT = 'var(--go-border, rgba(255,255,255,0.22))';

export const BatteryProgressBar: React.FC<BatteryProgressBarProps> = ({
  percent,
  segments = 10,
  width,
  height = 20,
  showLabel = false,
  className = '',
  statType = 'default',
  pixel = false,
  statLabel,
}) => {
  const gradId = useMemo(
    () => `bat-grad-${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  const n = Number(percent);
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
  const filledSegments = Math.round((clamped / 100) * segments);

  const getStatColors = () => {
    const colors = {
      energy: {
        high: { from: '#ef4444', to: '#dc2626', glow: '#ef4444' },
        medium: { from: '#f97316', to: '#ea580c', glow: '#f97316' },
        low: { from: '#fbbf24', to: '#f59e0b', glow: '#fbbf24' },
        critical: { from: '#dc2626', to: '#991b1b', glow: '#dc2626' },
      },
      focus: {
        high: { from: '#3b82f6', to: '#2563eb', glow: '#3b82f6' },
        medium: { from: '#6366f1', to: '#4f46e5', glow: '#6366f1' },
        low: { from: '#8b5cf6', to: '#7c3aed', glow: '#8b5cf6' },
        critical: { from: '#9333ea', to: '#7e22ce', glow: '#9333ea' },
      },
      motivation: {
        high: { from: '#f59e0b', to: '#d97706', glow: '#f59e0b' },
        medium: { from: '#eab308', to: '#ca8a04', glow: '#eab308' },
        low: { from: '#facc15', to: '#eab308', glow: '#facc15' },
        critical: { from: '#d97706', to: '#b45309', glow: '#d97706' },
      },
      calm: {
        high: { from: '#10b981', to: '#059669', glow: '#10b981' },
        medium: { from: '#22c55e', to: '#16a34a', glow: '#22c55e' },
        low: { from: '#4ade80', to: '#22c55e', glow: '#4ade80' },
        critical: { from: '#059669', to: '#047857', glow: '#059669' },
      },
      stress: {
        high: { from: '#dc2626', to: '#991b1b', glow: '#dc2626' },
        medium: { from: '#ef4444', to: '#dc2626', glow: '#ef4444' },
        low: { from: '#f87171', to: '#ef4444', glow: '#f87171' },
        critical: { from: '#991b1b', to: '#7f1d1d', glow: '#991b1b' },
      },
      default: {
        high: {
          from: 'var(--go-progress-fill, #10b981)',
          to: 'var(--go-progress-fill-strong, #059669)',
          glow: 'var(--go-progress-glow, #10b981)',
        },
        medium: {
          from: 'var(--go-progress-fill, #f59e0b)',
          to: 'var(--go-progress-fill-strong, #d97706)',
          glow: 'var(--go-progress-glow, #f59e0b)',
        },
        low: {
          from: 'var(--go-progress-fill, #f97316)',
          to: 'var(--go-progress-fill-strong, #ea580c)',
          glow: 'var(--go-progress-glow, #f97316)',
        },
        critical: {
          from: 'var(--go-progress-fill, #ef4444)',
          to: 'var(--go-progress-fill-strong, #dc2626)',
          glow: 'var(--go-progress-glow, #ef4444)',
        },
      },
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

  const levelColors = getStatColors();

  const rootClass = [
    styles.battery,
    getLevelClass(),
    pixel ? styles.pixelBattery : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const a11yName = statLabel?.trim() || 'Battery';

  const pad = pixel ? 2 : 3;
  const gap = pixel ? 2 : 1;
  const cellW = 8;
  const vbH = 24;
  const vbW = segments * cellW + Math.max(0, segments - 1) * gap + pad * 2;

  const emptyFill = pixel ? EMPTY_FILL_PIXEL : EMPTY_FILL_DEFAULT;
  const stroke = pixel ? STROKE_PIXEL : STROKE_DEFAULT;

  const rects = useMemo(
    () =>
      Array.from({ length: segments }, (_, idx) => {
        const isFilled = idx < filledSegments;
        const x = pad + idx * (cellW + gap);
        const y = pad;
        const h = vbH - pad * 2;
        return { idx, isFilled, x, y, w: cellW, h };
      }),
    [segments, filledSegments, pad, gap, vbH, cellW]
  );

  return (
    <div
      className={rootClass}
      style={{
        width: width ? `${width}px` : '100%',
        maxWidth: width ? `${width}px` : '100%',
        minWidth: width ? `${width}px` : 0,
        height: `${height}px`,
      }}
      aria-label={`${a11yName} ${clamped}%`}
      title={`${a11yName} ${clamped}%`}
    >
      <div className={styles.body}>
        <svg
          className={pixel ? styles.svgPixel : styles.svgBattery}
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={levelColors.from} />
              <stop offset="100%" stopColor={levelColors.to} />
            </linearGradient>
          </defs>
          {rects.map(({ idx, isFilled, x, y, w, h }) => (
            <rect
              key={idx}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={pixel ? 0 : 1}
              ry={pixel ? 0 : 1}
              fill={isFilled ? `url(#${gradId})` : emptyFill}
              stroke={stroke}
              strokeWidth={pixel ? 1 : 0.75}
            />
          ))}
        </svg>
      </div>
      <div className={styles.cap} />
      {showLabel && <div className={styles.label}>{clamped}%</div>}
    </div>
  );
};

export default BatteryProgressBar;
