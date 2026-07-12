import React from "react";
import styles from "./CircularProgressBar.module.css";

interface CircularProgressBarProps {
  percent: number; // From 0 to 100
  radius?: number;
  stroke?: number;
  isRunning?: boolean;
}

export const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  percent,
  radius = 40,
  stroke = 8,
  isRunning = false,
}) => {
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset =
    circumference - (percent / 100) * circumference;

  return (
    <div
      className={`${styles["progress-ring"]} ${
        percent === 100
          ? styles.complete
          : isRunning
          ? styles.active
          : ""
      }`}
    >
      <svg height={radius * 2} width={radius * 2}>
        {/* Pixel-style gradient ring */}
        <defs>
          <linearGradient id="pixelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--go-progress-fill, #00ffe7)" />
            <stop offset="50%" stopColor="var(--go-progress-fill-strong, #8e44ad)" />
            <stop offset="100%" stopColor="var(--go-gold, #f39c12)" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          stroke="var(--go-progress-track, #2c3e50)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        {/* Foreground circle with pixel gradient */}
        <circle
          stroke="url(#pixelGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      {/* Percent text inside */}
      <span className={styles.percentText}>{Math.floor(percent)}%</span>
    </div>
  );
};
