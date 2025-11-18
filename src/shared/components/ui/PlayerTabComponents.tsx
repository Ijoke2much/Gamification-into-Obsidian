import React, { useState } from "react";
import { GRADIENTS, SPACING, BORDERS, SHADOWS } from "../../utils/commonStyles";

// Reusable Card component
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}> = ({ children, className = "", onClick, style }) => (
  <div
    className={`obs-card bg-base-200 border border-base-300 rounded-lg shadow-sm p-4 min-w-0 w-full ${className}`}
    onClick={onClick}
    style={{
      background: GRADIENTS.card,
      border: BORDERS.default,
      borderRadius: 12,
      padding: SPACING.md,
      minWidth: 0,
      width: "100%",
      ...style
    }}
  >
    {children}
  </div>
);

// Clickable Tooltip component
export const ClickableTooltip: React.FC<{
  icon: React.ReactNode;
  label: React.ReactNode;
  tooltipContent: React.ReactNode;
}> = ({ icon, label, tooltipContent }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setOpen(v => !v)}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: SPACING.xs,
        }}
      >
        {icon}
        <span>{label}</span>
      </span>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: 0,
            background: "#222",
            color: "#fff",
            padding: SPACING.sm,
            borderRadius: SPACING.xs,
            zIndex: 100,
            minWidth: 120,
            boxShadow: SHADOWS.card,
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

// Common SVG Icons
export const PlayerIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <circle cx="10" cy="6" r="4" fill="#8ecae6" />
    <ellipse cx="10" cy="15" rx="7" ry="4" fill="#219ebc" />
  </svg>
);

export const ShopIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="3" y="7" width="14" height="8" rx="2" fill="#ffb703" />
    <rect x="6" y="3" width="8" height="4" rx="1" fill="#fb8500" />
  </svg>
);

export const QuestIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="9" y="2" width="2" height="12" fill="#adb5bd" />
    <polygon points="10,2 12,4 8,4" fill="#adb5bd" />
    <rect x="8" y="14" width="4" height="2" fill="#b5651d" />
    <rect x="8.5" y="16" width="3" height="2" fill="#ffe066" />
  </svg>
);

export const StatsIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="4" y="10" width="2" height="6" fill="#8ecae6" />
    <rect x="9" y="6" width="2" height="10" fill="#219ebc" />
    <rect x="14" y="4" width="2" height="12" fill="#023047" />
  </svg>
);

export const AchievementsIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <polygon points="10,2 12,7 18,7 13,11 15,18 10,14 5,18 7,11 2,7 8,7" fill="#ffd60a" />
  </svg>
);

export const InventoryIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="3" y="3" width="14" height="14" rx="2" fill="#6c757d" />
    <rect x="6" y="6" width="2" height="2" fill="#adb5bd" />
    <rect x="9" y="6" width="2" height="2" fill="#adb5bd" />
    <rect x="12" y="6" width="2" height="2" fill="#adb5bd" />
    <rect x="6" y="9" width="2" height="2" fill="#adb5bd" />
    <rect x="9" y="9" width="2" height="2" fill="#adb5bd" />
    <rect x="12" y="9" width="2" height="2" fill="#adb5bd" />
  </svg>
);

// Tab Button Component
export const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: SPACING.sm,
      padding: `${SPACING.md}px ${SPACING.lg}px`,
      background: isActive ? GRADIENTS.primary : GRADIENTS.card,
      border: BORDERS.default,
      borderRadius: SPACING.sm,
      color: "#ffffff",
      cursor: "pointer",
      transition: "all 0.2s ease",
      fontSize: 14,
      fontWeight: 600,
      minWidth: 120,
    }}
  >
    {icon}
    {label}
  </button>
);

// Progress Bar with Label
export const LabeledProgressBar: React.FC<{
  label: string;
  current: number;
  max: number;
  color?: string;
  showPercentage?: boolean;
}> = ({ label, current, max, color = "#4caf50", showPercentage = true }) => {
  const percentage = Math.min((current / max) * 100, 100);
  
  return (
    <div style={{ marginBottom: SPACING.md }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.xs,
        fontSize: 14,
        fontWeight: 600,
        color: "#ffffff"
      }}>
        <span>{label}</span>
        <span>
          {current}/{max} {showPercentage && `(${Math.round(percentage)}%)`}
        </span>
      </div>
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: 10,
        height: 8,
        overflow: "hidden"
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          height: "100%",
          width: `${percentage}%`,
          borderRadius: 10,
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );
};

// Stat Display Component
export const StatDisplay: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
}> = ({ icon, label, value, color = "#ffffff" }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    background: GRADIENTS.card,
    borderRadius: SPACING.sm,
    border: BORDERS.default,
  }}>
    <div style={{ color }}>{icon}</div>
    <div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  </div>
); 