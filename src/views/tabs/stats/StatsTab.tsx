import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import styles from './StatsTab.module.css';
import { usePlayerData } from '../../../data/hooks/usePlayerData';
import type GamifiedObsidianPlugin from '../../../core/main';
import PlayerStats from '../../../features/player/components/PlayerStats';

// The React component for the stats tab view
export const StatsTabView: React.FC<{ plugin: GamifiedObsidianPlugin }> = ({ plugin }) => {
  const { state } = usePlayerData(plugin);
  
  // Get folder stats
  const folderStats = (state.stats || [])
    .filter(s => typeof s.code === 'string' && s.code)
    .map(s => ({
      code: s.code as string,
      value: s.value || 0, // Use for progress bar
      level: s.level || 1, // Use for level display
      description: s.description,
    }));

  // Get player's actual stat levels from playerData
  const playerStats = state.playerData?.stats ? Object.entries(state.playerData.stats)
    .filter(([key, value]) => typeof value === 'number' && key !== 'energy' && key !== 'focus' && key !== 'motivation' && key !== 'calm' && key !== 'stress')
    .map(([key, value]) => ({
      code: key.toUpperCase(),
      value: value as number,
      level: value as number, // For player stats, level is the same as value
      description: `Player's ${key} level`,
    })) : [];

  // Combine both stats, prioritizing player stats
  const combinedStats = [...playerStats, ...folderStats.filter(fs => 
    !playerStats.some(ps => ps.code === fs.code)
  )];

  // Debug logging
  console.log('StatsTab Debug:', {
    playerData: state.playerData,
    playerStats,
    folderStats,
    combinedStats
  });

  return (
    <div className={styles.statsTabRoot}>
      <h2 className={styles.header}>Stats</h2>
      <div className={styles.statsContent}>
        <PlayerStats stats={combinedStats} />
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