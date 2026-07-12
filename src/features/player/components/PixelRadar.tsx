import React from "react";
import { STAT_COLORS, type RadarStat } from "../utils/statDefinitions";
import styles from "./PixelRadar.module.css";

export interface PixelRadarProps {
  stats: RadarStat[];
  maxValue?: number;
  px?: number;
  scale?: number;
  /** Highlight a specific stat axis by code (e.g. "INT") */
  highlightCode?: string;
}

const PixelRadar: React.FC<PixelRadarProps> = ({
  stats,
  maxValue: maxValueProp,
  px = 140,
  scale = 2,
  highlightCode,
}) => {
  const size = px;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  const levels = 5;
  const n = stats.length;
  const maxValue = maxValueProp ?? Math.max(10, ...stats.map((s) => s.value));

  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pt = (i: number, value: number, mul = 1): [number, number] => {
    const a = angleFor(i);
    const t = Math.max(0, Math.min(1, value / maxValue)) * mul;
    return [cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t];
  };

  const gridRings = [];
  for (let lvl = 1; lvl <= levels; lvl++) {
    const mul = lvl / levels;
    const points: string[] = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, maxValue, mul);
      points.push(`${x},${y}`);
    }
    gridRings.push(
      <polygon
        key={lvl}
        points={points.join(" ")}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />
    );
  }

  const axes = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, maxValue, 1);
    const isHighlight =
      highlightCode &&
      stats[i]?.code.toUpperCase() === highlightCode.toUpperCase();
    axes.push(
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        stroke={isHighlight ? "rgba(255,209,102,0.85)" : "rgba(255,255,255,0.25)"}
        strokeWidth={isHighlight ? 2 : 1}
      />
    );
  }

  const polyPoints = stats
    .map((s, i) => pt(i, s.value, 1))
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  const labels = [];
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const label = String(stats[i]?.code ?? "").toUpperCase();
    const isHighlight =
      highlightCode &&
      stats[i]?.code.toUpperCase() === highlightCode.toUpperCase();
    const lx = cx + Math.cos(a) * r * 1.22;
    const ly = cy + Math.sin(a) * r * 1.22;
    labels.push(
      <g key={i}>
        <rect
          x={Math.round(lx) - 12}
          y={Math.round(ly) - 6}
          width={24}
          height={12}
          fill={isHighlight ? "rgba(255,209,102,0.55)" : "rgba(0,0,0,0.45)"}
        />
        <text
          x={Math.round(lx)}
          y={Math.round(ly)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isHighlight ? "#ffd166" : "rgba(255,255,255,0.92)"}
          fontSize="9"
          fontFamily="monospace"
          fontWeight={isHighlight ? "bold" : "normal"}
        >
          {label}
        </text>
      </g>
    );
  }

  const points = stats.map((s, i) => {
    const [x, y] = pt(i, s.value, 1);
    const c = STAT_COLORS[s.key] ?? STAT_COLORS.other;
    const isHighlight =
      highlightCode &&
      s.code.toUpperCase() === highlightCode.toUpperCase();
    return (
      <rect
        key={i}
        x={Math.round(x) - (isHighlight ? 3 : 2)}
        y={Math.round(y) - (isHighlight ? 3 : 2)}
        width={isHighlight ? 6 : 4}
        height={isHighlight ? 6 : 4}
        fill={c}
        stroke={isHighlight ? "#ffd166" : "rgba(0,0,0,0.35)"}
        strokeWidth={isHighlight ? 2 : 1}
      />
    );
  });

  const edges = stats.map((sA, i) => {
    const sB = stats[(i + 1) % n];
    const [x1, y1] = pt(i, sA.value, 1);
    const [x2, y2] = pt((i + 1) % n, sB.value, 1);
    const edgeColor = STAT_COLORS[sA.key] ?? STAT_COLORS.other;
    return (
      <line
        key={`edge-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={edgeColor}
        strokeWidth="2"
      />
    );
  });

  return (
    <div className={styles.radarWrap}>
      <svg
        width={px * scale}
        height={px * scale}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.radarSvg}
        aria-hidden
      >
        <rect width={size} height={size} fill="rgba(0,0,0,0.10)" />
        {gridRings}
        {axes}
        <polygon
          points={polyPoints}
          fill="rgba(125,169,255,0.22)"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="2"
        />
        {edges}
        {labels}
        {points}
      </svg>
    </div>
  );
};

export default PixelRadar;
