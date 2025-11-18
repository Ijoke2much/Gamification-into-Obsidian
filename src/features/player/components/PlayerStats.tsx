import React from "react";
import styles from './PlayerStats.module.css';

const STAT_META = {
  CHA: {
    name: "Charisma",
    icon: "🗣️",
    description: "Charm, persuasion, and social influence.",
  },
  CRE: {
    name: "Creativity",
    icon: "🎨",
    description: "Imagination and artistic ability.",
  },
  DEX: {
    name: "Dexterity",
    icon: "🏃",
    description: "Agility, reflexes, and coordination.",
  },
  END: {
    name: "Endurance",
    icon: "🛡️",
    description: "Stamina and physical resilience.",
  },
  FAI: {
    name: "Faith",
    icon: "✝️",
    description: "Belief, devotion, and spiritual strength.",
  },
  ING: {
    name: "Ingenuity",
    icon: "🧠",
    description: "Inventiveness and clever problem-solving.",
  },
  INT: {
    name: "Intelligence",
    icon: "📚",
    description: "Reasoning, memory, and learning.",
  },
  MIN: {
    name: "Mindfulness",
    icon: "🧘",
    description: "Awareness and presence in the moment.",
  },
  STR: {
    name: "Strength",
    icon: "💪",
    description: "Physical power and force.",
  },
  WIL: {
    name: "Willpower",
    icon: "🔥",
    description: "Determination and mental fortitude.",
  },
  WIS: {
    name: "Wisdom",
    icon: "🦉",
    description: "Insight, judgment, and experience.",
  },
};

const ORDER = [
  "STR",
  "DEX",
  "END",
  "INT",
  "WIS",
  "WIL",
  "CHA",
  "CRE",
  "ING",
  "MIN",
];

function getStatColor(value: number) {
  if (value >= 15) return styles.statValueHigh;
  if (value >= 8) return styles.statValueMed;
  return styles.statValueLow;
}

const PlayerStats: React.FC<{
  stats: {
    code: string;
    value: number;
    level?: number;
    description?: string;
  }[];
}> = ({ stats }) => {
  const cleaned = stats
    .map((s) => ({ ...s, code: s.code?.trim().toUpperCase() }))
    .filter((s) => s.code && typeof s.value === "number");

  const maxVal = Math.max(1, ...cleaned.map((s) => s.value));

  const getOrderIndex = (code: string): number => {
    const idx = ORDER.indexOf(code);
    return idx === -1 ? 999 : idx;
  };

  const sorted = [...cleaned].sort((a, b) => {
    const ai = getOrderIndex(a.code);
    const bi = getOrderIndex(b.code);
    if (ai !== bi) return ai - bi;
    return a.code.localeCompare(b.code);
  });

  return (
    <div className={styles.statsRoot}>
      <div className={styles.statsGrid}>
        {sorted.map((stat) => {
          const code = stat.code;
          const meta = STAT_META[code as keyof typeof STAT_META];
          const statDescription = stat.description || meta?.description || code;
          const widthPct = Math.min((stat.value / maxVal) * 100, 100);

          return (
            <div key={code} className={styles.statRow}>
              <div className={styles.statHeader}>
                <span
                  className={`${styles.statIcon} ${styles[`icon${code}`] || ""}`}
                  title={statDescription}
                >
                  <span className={styles.icon}>{meta?.icon ?? "📈"}</span>
                </span>
                <span className={styles.statName}>{meta?.name ?? code}</span>
                {!meta && <span className={styles.statCode}>({code})</span>}
                <span className={styles.spacer} />
                <span className={getStatColor(stat.level ?? stat.value)}>
                  {stat.value} Lv.{stat.level ?? 1}
                </span>
              </div>
              <div className={styles.statBarBg}>
                <div
                  className={styles.statBarFg}
                  style={{ width: `${widthPct}%` }}
                  aria-label={`${meta?.name ?? code} ${stat.value}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerStats; 