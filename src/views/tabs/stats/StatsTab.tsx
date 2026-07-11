import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { useCallback, useMemo } from "react";
import styles from './StatsTab.module.css';
import { usePlayerData } from '../../../data/hooks/usePlayerData';
import type GamifiedObsidianPlugin from '../../../core/main';
import PlayerStats from '../../../features/player/components/PlayerStats';
import type { StatEntry } from '../../../features/player/utils/statDefinitions';
import { openStatNote } from '../../../features/player/utils/statNoteUtils';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

// The React component for the stats tab view
export const StatsTabView: React.FC<{
  plugin: GamifiedObsidianPlugin;
  /** Full tab vs Player modal (modal skips duplicate title + outer card) */
  variant?: 'page' | 'modal';
}> = ({ plugin, variant = 'page' }) => {
  const { state } = usePlayerData(plugin);
  
  const folderStats = useMemo(
    () =>
      (state.stats || [])
        .filter((s) => typeof s.code === "string" && s.code)
        .map((s) => ({
          code: s.code as string,
          value: s.value || 0,
          level: s.level || 1,
          description: s.description,
          currentCP: s.currentCP,
          requiredCP: s.requiredCP,
          filePath: s.filePath,
          cpEstimated: s.cpEstimated,
        })),
    [state.stats]
  );

  const statFolder =
    plugin.settings.statFolder || "SkillTree/Master-Class/Stats";

  const handleOpenStatNote = useCallback(
    async (stat: StatEntry) => {
      const opened = await openStatNote(plugin.app, {
        statFolder,
        code: stat.code,
        filePath: stat.filePath,
      });
      if (!opened) {
        pixelNotice(`No stat note found for ${stat.code}`, 2500);
      }
    },
    [plugin.app, statFolder]
  );

  // Merge folder stat notes (primary) with playerData.stats fallback
  const combinedStats = useMemo((): StatEntry[] => {
    const map = new Map<string, StatEntry>();

    const playerStats: StatEntry[] = state.playerData?.stats
      ? Object.entries(state.playerData.stats)
          .filter(
            ([key, value]) =>
              typeof value === "number" &&
              key !== "energy" &&
              key !== "focus" &&
              key !== "motivation" &&
              key !== "calm" &&
              key !== "stress"
          )
          .map(([key, value]) => ({
            code: key.toUpperCase(),
            value: value as number,
            level: value as number,
            description: `Player's ${key} level`,
          }))
      : [];

    for (const s of playerStats) {
      map.set(s.code, s);
    }
    for (const s of folderStats) {
      const code = s.code.toUpperCase();
      const existing = map.get(code);
      map.set(code, {
        ...existing,
        ...s,
        code,
        value: s.value ?? existing?.value ?? 0,
        level: s.level ?? existing?.level ?? 1,
        description: s.description || existing?.description,
        currentCP: s.currentCP ?? existing?.currentCP,
        requiredCP: s.requiredCP ?? existing?.requiredCP,
        filePath: s.filePath ?? existing?.filePath,
        cpEstimated: s.cpEstimated ?? existing?.cpEstimated,
      });
    }

    return Array.from(map.values());
  }, [folderStats, state.playerData?.stats]);

  // Debug logging removed for production

  const shell =
    variant === 'modal' ? styles.statsTabRootCompact : styles.statsTabRoot;

  return (
    <div className={shell}>
      <h2 className={styles.header}>Stats</h2>
      <div className={styles.statsContent}>
        <PlayerStats
          stats={combinedStats}
          variant="pixel"
          frame={variant === 'modal' ? 'flush' : 'self'}
          onOpenStatNote={handleOpenStatNote}
        />
      </div>
    </div>
  );
};

export const STATS_TAB_VIEW_TYPE = "gamified-stats-tab";

export class StatsTab extends ItemView {
  root!: Root;
  constructor(leaf: WorkspaceLeaf, private plugin: GamifiedObsidianPlugin) {
    super(leaf);
  }
  getViewType(): string {
    return STATS_TAB_VIEW_TYPE;
  }
  getDisplayText(): string {
    return "Stats";
  }
  async onOpen() {
    const container = this.containerEl.children[1] ?? this.containerEl;
    this.root = createRoot(container);
    this.root.render(<StatsTabView plugin={this.plugin} />);
  }
  async onClose() {
    this.root?.unmount();
  }
} 