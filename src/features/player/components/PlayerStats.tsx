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
    icon: "��",
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
    icon: "��",
    description: "Insight, judgment, and experience.",
  },
};

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
  return (
    <div className={styles.statsRoot}>
      <div className={styles.codesRow}>
        Codes: {stats.map((s) => s.code).join(", ")}
      </div>
      <div className={styles.statsGrid}>
        {stats.map((stat) => {
          const code = stat.code?.trim().toUpperCase();
          const meta = STAT_META[code as keyof typeof STAT_META];
          if (!meta) return null;
          const statDescription = stat.description || meta.description;
          return (
            <div key={code} className={styles.statRow}>
              <div className={styles.statHeader}>
                <span
                  className={
                    styles.statIcon +
                    ' ' + styles[`icon${code}`] +
                    (code === 'CHA' ? ' ' + styles.testDebugBg : '')
                  }
                  title={statDescription}
                >
                  <span className={styles.icon}>{meta.icon}</span>
                </span>
                <span className={styles.statName}>{meta.name}</span>
                <span className={styles.statCode}>({code})</span>
                <span className={styles.spacer} />
                <span className={getStatColor(stat.level || stat.value)}>
                  {stat.value} Lv.{stat.level || 1}
                </span>
              </div>
              <div className={styles.statBarBg}>
                <div
                  className={styles.statBarFg}
                  style={{ width: `${Math.min(stat.value / 100, 1) * 100}%` }}
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