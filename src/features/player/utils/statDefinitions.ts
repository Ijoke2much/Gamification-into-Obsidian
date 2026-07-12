import { calculateRequiredCP } from "../../../shared/utils/progressUpdater";

export const STAT_ORDER = [
  "CHA",
  "CRE",
  "FAI",
  "ING",
  "INT",
  "STR",
  "DEX",
  "WIL",
  "WIS",
  "END",
  "MIN",
] as const;

export type StatCode = (typeof STAT_ORDER)[number];

export const STAT_META: Record<
  StatCode,
  { name: string; icon: string; description: string; cta: string }
> = {
  CHA: {
    name: "Charisma",
    icon: "🗣️",
    description: "Charm, persuasion, and social influence.",
    cta: "Complete social or communication quests to grow Charisma.",
  },
  CRE: {
    name: "Creativity",
    icon: "🎨",
    description: "Imagination and artistic ability.",
    cta: "Complete creative or design quests to grow Creativity.",
  },
  DEX: {
    name: "Dexterity",
    icon: "🏃",
    description: "Agility, reflexes, and coordination.",
    cta: "Complete quick-action or agility quests to grow Dexterity.",
  },
  END: {
    name: "Endurance",
    icon: "🛡️",
    description: "Stamina and physical resilience.",
    cta: "Complete endurance or long-form quests to grow Endurance.",
  },
  FAI: {
    name: "Faith",
    icon: "✝️",
    description: "Belief, devotion, and spiritual strength.",
    cta: "Complete faith or reflection quests to grow Faith.",
  },
  ING: {
    name: "Ingenuity",
    icon: "🧠",
    description: "Inventiveness and clever problem-solving.",
    cta: "Complete problem-solving quests to grow Ingenuity.",
  },
  INT: {
    name: "Intelligence",
    icon: "📚",
    description: "Reasoning, memory, and learning.",
    cta: "Complete study or research quests to grow Intelligence.",
  },
  MIN: {
    name: "Mindfulness",
    icon: "🧘",
    description: "Awareness and presence in the moment.",
    cta: "Complete mindfulness or wellness quests to grow Mindfulness.",
  },
  STR: {
    name: "Strength",
    icon: "💪",
    description: "Physical power and force.",
    cta: "Complete strength or physical quests to grow Strength.",
  },
  WIL: {
    name: "Willpower",
    icon: "🔥",
    description: "Determination and mental fortitude.",
    cta: "Complete focus or discipline quests to grow Willpower.",
  },
  WIS: {
    name: "Wisdom",
    icon: "🦉",
    description: "Insight, judgment, and experience.",
    cta: "Complete reflection or mentoring quests to grow Wisdom.",
  },
};

export const STAT_COLORS: Record<string, string> = {
  cha: "#ff7aa2",
  cre: "#ff9f5a",
  fai: "#ffd45a",
  ing: "#7ee6c9",
  int: "#6f93ff",
  str: "#f4b24a",
  dex: "#66d28b",
  wil: "#ff6b6b",
  wis: "#b37bff",
  end: "#4fb7ff",
  min: "#a3a3a3",
  other: "#9ca3af",
};

export const ARCHETYPE_LABELS: Record<StatCode, string> = {
  STR: "Warrior",
  DEX: "Rogue",
  END: "Guardian",
  INT: "Scholar",
  WIS: "Sage",
  WIL: "Stalwart",
  CHA: "Diplomat",
  CRE: "Artist",
  FAI: "Devoted",
  ING: "Inventor",
  MIN: "Monk",
};

export interface StatEntry {
  code: string;
  value: number;
  level?: number;
  description?: string;
  currentCP?: number;
  requiredCP?: number;
  filePath?: string;
  cpEstimated?: boolean;
}

export interface RadarStat {
  code: string;
  key: string;
  value: number;
}

export function codeToKey(code: string): string {
  const c = code.trim().toUpperCase();
  const map: Record<string, string> = {
    STR: "str",
    DEX: "dex",
    CON: "con",
    INT: "int",
    WIS: "wis",
    CHA: "cha",
    CRE: "cre",
    FAI: "fai",
    ING: "ing",
    WIL: "wil",
    END: "end",
    MIN: "min",
  };
  return map[c] ?? "other";
}

export function normalizeStats(raw: StatEntry[]): StatEntry[] {
  const map = new Map(
    raw
      .map((s) => ({ ...s, code: s.code?.trim().toUpperCase() ?? "" }))
      .filter((s) => s.code)
      .map((s) => [s.code, s] as const)
  );

  return STAT_ORDER.map((code) => {
    const existing = map.get(code);
    if (existing) return existing;
    return {
      code,
      value: 0,
      level: 1,
      description: STAT_META[code].description,
      currentCP: 0,
      requiredCP: calculateRequiredCP("stat", 1),
      cpEstimated: true,
    };
  });
}

export function toRadarStats(stats: StatEntry[]): RadarStat[] {
  return stats.map((s) => ({
    code: s.code,
    key: codeToKey(s.code),
    value: s.value,
  }));
}

export interface ArchetypeSummary {
  label: string;
  secondaryLabel?: string;
  strongestCode: StatCode;
  strongestName: string;
  strongestValue: number;
  secondCode?: StatCode;
  secondName?: string;
  secondValue?: number;
  weakestCode: StatCode;
  weakestName: string;
  weakestValue: number;
}

export function getArchetypeSummary(stats: StatEntry[]): ArchetypeSummary {
  const sorted = [...stats].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const second = sorted[1];
  const bottom = sorted[sorted.length - 1];
  const topCode = top.code as StatCode;
  const bottomCode = bottom.code as StatCode;
  const primary = ARCHETYPE_LABELS[topCode] ?? "Adventurer";

  let label = primary;
  let secondaryLabel: string | undefined;
  let secondCode: StatCode | undefined;
  let secondName: string | undefined;
  let secondValue: number | undefined;

  if (
    second &&
    second.value > 0 &&
    second.code !== top.code
  ) {
    const secondStatCode = second.code as StatCode;
    const secondary = ARCHETYPE_LABELS[secondStatCode] ?? second.code;
    label = `${primary} · ${secondary}`;
    secondaryLabel = secondary;
    secondCode = secondStatCode;
    secondName = STAT_META[secondStatCode]?.name ?? second.code;
    secondValue = second.value;
  }

  return {
    label,
    secondaryLabel,
    strongestCode: topCode,
    strongestName: STAT_META[topCode]?.name ?? top.code,
    strongestValue: top.value,
    secondCode,
    secondName,
    secondValue,
    weakestCode: bottomCode,
    weakestName: STAT_META[bottomCode]?.name ?? bottom.code,
    weakestValue: bottom.value,
  };
}

export interface XpProgress {
  current: number;
  required: number;
  remaining: number;
  pct: number;
  /** True when requiredCP was inferred from level, not read from the note */
  estimated?: boolean;
}

export function getXpProgress(stat: StatEntry): XpProgress {
  const level = Math.max(1, stat.level ?? 1);
  const hasRequired = (stat.requiredCP ?? 0) > 0;
  const required = hasRequired
    ? (stat.requiredCP as number)
    : calculateRequiredCP("stat", level);
  const current = Math.max(0, stat.currentCP ?? 0);

  return {
    current,
    required,
    remaining: Math.max(0, required - current),
    pct: Math.min(100, required > 0 ? (current / required) * 100 : 0),
    estimated: stat.cpEstimated ?? !hasRequired,
  };
}

export function isUntrained(stat: StatEntry): boolean {
  return (stat.value ?? 0) <= 0 && (stat.level ?? 1) <= 1;
}
