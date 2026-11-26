import React, { useMemo, useState } from "react";
import styles from "./PlayerStats.module.css";
import PixelRadar from "./PixelRadar";
import {
  STAT_META,
  STAT_ORDER,
  codeToKey,
  getArchetypeSummary,
  getXpProgress,
  isUntrained,
  normalizeStats,
  toRadarStats,
  type StatCode,
  type StatEntry,
} from "../utils/statDefinitions";

function getStatColor(value: number) {
  if (value >= 15) return styles.statValueHigh;
  if (value >= 8) return styles.statValueMed;
  return styles.statValueLow;
}

const GamifiedStatsPanel: React.FC<{
  stats: StatEntry[];
  onOpenStatNote?: (stat: StatEntry) => void;
  frame?: "self" | "flush";
}> = ({ stats, onOpenStatNote, frame = "self" }) => {
  const normalized = useMemo(() => normalizeStats(stats), [stats]);
  const radarStats = useMemo(() => toRadarStats(normalized), [normalized]);
  const radarMax = useMemo(
    () => Math.max(10, ...normalized.map((s) => s.value)),
    [normalized]
  );
  const archetype = useMemo(() => getArchetypeSummary(normalized), [normalized]);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const effectiveCode = selectedCode ?? archetype.strongestCode;
  const selected =
    normalized.find((s) => s.code === effectiveCode) ?? normalized[0];
  const selectedMeta = STAT_META[selected.code as StatCode];
  const selectedKey = codeToKey(selected.code);
  const xp = getXpProgress(selected);
  const untrained = isUntrained(selected);
  const statBarStyle = {
    "--stat-bar-color": `var(--stat-${selectedKey}, #22c55e)`,
  } as React.CSSProperties;

  return (
    <div
      className={[
        styles.statsRoot,
        styles.statsRootPixel,
        frame === "flush" ? styles.statsRootFlush : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.archetypeHeader}>
        <span className={styles.archetypeLabel}>{archetype.label}</span>
        <span className={styles.archetypeMeta}>
          Strongest: {archetype.strongestName} ({archetype.strongestValue})
          {archetype.secondName && archetype.secondValue !== undefined && (
            <>
              {" · "}
              Runner-up: {archetype.secondName} ({archetype.secondValue})
            </>
          )}
          {" · "}
          Weakest: {archetype.weakestName} ({archetype.weakestValue})
        </span>
      </div>

      <div className={styles.statsTabGrid}>
        <div className={styles.statsTabTiles}>
          {STAT_ORDER.map((code) => {
            const stat = normalized.find((s) => s.code === code)!;
            const key = codeToKey(code);
            const isActive = effectiveCode === code;
            return (
              <button
                key={code}
                type="button"
                className={[
                  styles.statTile,
                  styles[`statTile_${key}`],
                  isActive ? styles.statTileActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedCode(code)}
                title={STAT_META[code].description}
                aria-pressed={isActive}
              >
                <span className={styles.statTileCode}>{code}</span>
                <span className={styles.statTileNum}>{stat.value}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.statsTabDetail}>
          <PixelRadar
            stats={radarStats}
            maxValue={radarMax}
            px={140}
            scale={2}
            highlightCode={selected.code}
          />

          <div className={styles.detailTitleRow}>
            <div className={styles.detailTitle}>
              <span className={styles.detailIcon}>{selectedMeta?.icon ?? "📈"}</span>
              {selectedMeta?.name ?? selected.code}{" "}
              <span className={styles.detailCode}>({selected.code})</span>
            </div>
            {onOpenStatNote && (
              <button
                type="button"
                className={styles.openNoteBtn}
                onClick={() => onOpenStatNote(selected)}
                aria-label={`Open ${selectedMeta?.name ?? selected.code} stat note`}
              >
                View note
              </button>
            )}
          </div>

          <div className={styles.detailValues}>
            <span
              className={`${styles.statValueBadge} ${getStatColor(selected.value)}`.trim()}
            >
              {selected.value}
            </span>
            <span
              className={`${styles.statLevelBadge} ${getStatColor(selected.level ?? selected.value)}`.trim()}
            >
              Lv.{selected.level ?? 1}
            </span>
          </div>

          <div className={styles.xpSection}>
            <div className={styles.xpLabel}>
              CP: {xp.current}/{xp.required}
              {xp.remaining > 0 && (
                <span className={styles.xpRemaining}>
                  {" "}
                  · {xp.remaining} to Lv.{(selected.level ?? 1) + 1}
                </span>
              )}
              {xp.estimated && (
                <span className={styles.xpEstimated}> · projected</span>
              )}
            </div>
            <div
              className={`${styles.statBarBg} ${styles.statBarBgPixel}`}
              style={statBarStyle}
            >
              <div
                className={`${styles.statBarFg} ${styles.statBarFgPixel} ${styles.statBarFgColored}`}
                style={{ width: `${xp.pct}%`, ...statBarStyle }}
                aria-label={`${selectedMeta?.name} XP ${xp.pct}%`}
              />
            </div>
          </div>

          <div className={styles.detailDesc}>
            {untrained ? (
              <p className={styles.untrainedCta}>
                <span className={styles.untrainedBadge}>Untrained</span>
                {selectedMeta?.cta ??
                  `Complete quests tagged with ${selectedMeta?.name ?? selected.code} to grow this stat.`}
              </p>
            ) : (
              selected.description || selectedMeta?.description || ""
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Simple list view (non-pixel / legacy) */
const StatsListView: React.FC<{
  stats: StatEntry[];
  variant: "default" | "pixel";
}> = ({ stats, variant }) => {
  const cleaned = stats
    .map((s) => ({ ...s, code: s.code?.trim().toUpperCase() }))
    .filter((s) => s.code && typeof s.value === "number");

  const maxVal = Math.max(1, ...cleaned.map((s) => s.value));

  const getOrderIndex = (code: string): number => {
    const idx = STAT_ORDER.indexOf(code as StatCode);
    return idx === -1 ? 999 : idx;
  };

  const sorted = [...cleaned].sort((a, b) => {
    const ai = getOrderIndex(a.code);
    const bi = getOrderIndex(b.code);
    if (ai !== bi) return ai - bi;
    return a.code.localeCompare(b.code);
  });

  const rootClass =
    variant === "pixel"
      ? `${styles.statsRoot} ${styles.statsRootPixel}`
      : styles.statsRoot;

  return (
    <div className={rootClass}>
      <div className={styles.statsGrid}>
        {sorted.map((stat) => {
          const code = stat.code as StatCode;
          const meta = STAT_META[code];
          const statDescription = stat.description || meta?.description || code;
          const key = codeToKey(code);
          const widthPct = Math.min((stat.value / maxVal) * 100, 100);
          const barStyle = {
            "--stat-bar-color": `var(--stat-${key}, #22c55e)`,
          } as React.CSSProperties;

          return (
            <div
              key={code}
              className={`${styles.statRow} ${variant === "pixel" ? styles.statRowPixel : ""}`.trim()}
            >
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
                <span className={styles.statBadgeRow}>
                  <span
                    className={`${styles.statValueBadge} ${getStatColor(stat.level ?? stat.value)}`.trim()}
                  >
                    {stat.value}
                  </span>
                  <span
                    className={`${styles.statLevelBadge} ${getStatColor(stat.level ?? stat.value)}`.trim()}
                  >
                    Lv.{stat.level ?? 1}
                  </span>
                </span>
              </div>
              <div
                className={`${styles.statBarBg} ${variant === "pixel" ? styles.statBarBgPixel : ""}`.trim()}
                style={barStyle}
              >
                <div
                  className={`${styles.statBarFg} ${variant === "pixel" ? `${styles.statBarFgPixel} ${styles.statBarFgColored}` : ""}`.trim()}
                  style={{ width: `${widthPct}%`, ...barStyle }}
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

const PlayerStats: React.FC<{
  stats: StatEntry[];
  /** Match Player tab pixel / RPG shell; pixel uses gamified radar layout */
  variant?: "default" | "pixel";
  /** Force list layout even in pixel mode */
  layout?: "gamified" | "list";
  /** Let a parent modal provide the outer frame. */
  frame?: "self" | "flush";
  onOpenStatNote?: (stat: StatEntry) => void;
}> = ({ stats, variant = "default", layout = "gamified", frame = "self", onOpenStatNote }) => {
  if (variant === "pixel" && layout === "gamified") {
    return (
      <GamifiedStatsPanel stats={stats} onOpenStatNote={onOpenStatNote} frame={frame} />
    );
  }
  return <StatsListView stats={stats} variant={variant} />;
};

export default PlayerStats;
