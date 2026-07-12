import { PlayerData } from '../../data/models/PlayerData';
import { readPlayerData, updatePlayerData } from '../../features/player/utils/playerDataUtils';
import { Vault } from 'obsidian';
import { performanceManager } from '../utils/performanceManager';
import { getRankFromLevel, type Rank } from '../../features/player/utils/playerRank';

export interface XPGainResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  rankChanged: boolean;
  oldRank: Rank;
  newRank: Rank;
}

export type PlayerStateChange =
  | {
    type: 'data-updated';
    payload: PlayerData | null;
    timestamp: number;
  }
  | {
    type: 'stats-changed';
    payload: NonNullable<PlayerData['stats']>;
    timestamp: number;
  }
  | {
    type: 'inventory-changed';
    payload: { inventory: PlayerData['inventory'] };
    timestamp: number;
  }
  | {
    type: 'buffs-changed';
    payload: { buffs: PlayerData['buffs']; debuffs: PlayerData['debuffs'] };
    timestamp: number;
  };

class PlayerStore {
  private data: PlayerData | null = null;
  private writeQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private listeners: Array<(change: PlayerStateChange) => void> = [];
  private lastResetDate: string | null = null;
  private resetHour: number = 6;
  private dailyRestore: { energy?: number; focus?: number; motivation?: number; calm?: number; stressReduce?: number } | null = null;
  private vault: Vault | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Don't auto-initialize - wait for vault to be set

    // Listen for player data updates from external sources (like level checks)
    document.addEventListener('player-data-updated', this.handleExternalDataUpdate.bind(this));
  }

  private async handleExternalDataUpdate() {
    console.log('[PlayerStore] Received player-data-updated event, refreshing data...');
    if (this.vault) {
      try {
        this.data = await readPlayerData(this.vault);
        this.emitChange({
          type: 'data-updated',
          payload: this.data,
          timestamp: Date.now()
        });
        console.log('[PlayerStore] Successfully refreshed player data from external update');
      } catch (error) {
        console.error('[PlayerStore] Failed to refresh player data from external update:', error);
      }
    }
  }

  public setVault(vault: Vault) {
    // Prevent multiple initializations with the same vault
    if (this.vault === vault && this.isInitialized) {
      console.log('[PlayerStore] Vault already set and initialized, skipping...');
      return;
    }

    this.vault = vault;
    this.initializeStore();
  }

  public getVault(): Vault | null {
    return this.vault;
  }

  public async refreshPlayerData(): Promise<void> {
    if (!this.vault) {
      console.warn('[PlayerStore] Cannot refresh player data without vault');
      return;
    }

    try {
      this.data = await readPlayerData(this.vault);
      this.emitChange({
        type: 'data-updated',
        payload: this.data,
        timestamp: Date.now()
      });
      console.log('[PlayerStore] Successfully refreshed player data');

      // Dispatch custom event for external listeners
      document.dispatchEvent(new CustomEvent('player-data-updated', {
        detail: {
          type: 'data-updated',
          payload: this.data,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      console.error('[PlayerStore] Failed to refresh player data:', error);
    }
  }

  public async checkLevelAndRefresh(): Promise<{ level: number; xp: number; xpRequired: number; leveledUp: boolean } | null> {
    if (!this.vault) {
      console.warn('[PlayerStore] Cannot check level without vault');
      return null;
    }

    try {
      const { checkAndFixPlayerLevel } = await import('../utils/progressUpdater');
      const levelResult = await checkAndFixPlayerLevel(this.vault, this);

      // Refresh player data after level check to ensure UI is up to date
      await this.refreshPlayerData();

      console.log('[PlayerStore] Level check and refresh completed:', levelResult);

      // Dispatch custom event for external listeners
      document.dispatchEvent(new CustomEvent('player-data-updated', {
        detail: {
          type: 'level-checked',
          payload: this.data,
          timestamp: Date.now()
        }
      }));
      return levelResult;
    } catch (error) {
      console.error('[PlayerStore] Level check and refresh failed:', error);
      return null;
    }
  }

  private async initializeStore() {
    if (!this.vault) {
      console.error('[PlayerStore] Cannot initialize store without vault');
      return;
    }

    // Prevent multiple concurrent initializations - set flag immediately
    if (this.isInitialized) {
      console.log('[PlayerStore] Already initialized, skipping...');
      return;
    }

    // Set initialization flag immediately to prevent race conditions
    this.isInitialized = true;

    try {
      console.log('[PlayerStore] Initializing store with vault...');

      // Wait for vault to be fully loaded, retry up to 10 times with longer delays
      let retries = 0;
      let data: PlayerData | null = null;

      while (retries < 10 && !data) {
        if (retries > 0) {
          const delay = Math.min(1000 * retries, 5000); // Progressive delay up to 5 seconds
          console.log(`[PlayerStore] Retry ${retries}/10 - waiting ${delay}ms for vault to load files...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
          data = await readPlayerData(this.vault);
          if (data) {
            console.log(`[PlayerStore] Successfully loaded player data on attempt ${retries + 1}`);
          }
        } catch (error) {
          console.warn(`[PlayerStore] Attempt ${retries + 1} failed:`, error);
          // Continue to next retry
        }
        retries++;
      }

      this.data = data;

      if (!this.data) {
        console.error('[PlayerStore] Failed to load player data after retries - data is null');
        // Still emit change with null data so UI can show error state
        this.emitChange({
          type: 'data-updated',
          payload: null,
          timestamp: Date.now()
        });
        return;
      }

      console.log('[PlayerStore] Player data loaded during initialization:', this.data);
      console.log('[PlayerStore] Stats data:', this.data?.stats);

      await this.checkDailyReset();

      this.emitChange({
        type: 'data-updated',
        payload: this.data,
        timestamp: Date.now()
      });

      // Dispatch custom event for external listeners (like TabView)
      document.dispatchEvent(new CustomEvent('player-data-updated', {
        detail: {
          type: 'data-updated',
          payload: this.data,
          timestamp: Date.now()
        }
      }));

      console.log('[PlayerStore] Store initialization completed successfully');
    } catch (error) {
      console.error('[PlayerStore] Failed to initialize player store:', error);

      // Reset initialization flag on error so it can be retried
      this.isInitialized = false;

      // Emit error state
      this.emitChange({
        type: 'data-updated',
        payload: null,
        timestamp: Date.now()
      });

      // Dispatch error event for UI error boundaries
      document.dispatchEvent(new CustomEvent('player-data-error', {
        detail: { error: error instanceof Error ? error : new Error(String(error)) }
      }));
    }
  }

  private async checkDailyReset() {
    if (!this.data) return;

    const now = new Date();
    const today = now.toDateString();
    const resetHour = this.resetHour; // configurable

    // Check if we need to reset
    const last = this.data.lastDailyReset ? new Date(this.data.lastDailyReset).toDateString() : this.lastResetDate;
    if (last !== today && now.getHours() >= resetHour) {
      await this.performDailyReset();
      this.lastResetDate = today;
    }
  }

  private async performDailyReset() {
    if (!this.data) return;
    const restore = this.dailyRestore || {};
    await this.update(current => {
      const stats = { ...(current.stats || {}) } as NonNullable<PlayerData['stats']>;
      if (typeof restore.energy === 'number') stats.energy = Math.min(100, (stats.energy || 0) + restore.energy);
      if (typeof restore.focus === 'number') stats.focus = Math.min(100, (stats.focus || 0) + restore.focus);
      if (typeof restore.motivation === 'number') stats.motivation = Math.min(100, (stats.motivation || 0) + restore.motivation);
      if (typeof restore.calm === 'number') stats.calm = Math.min(100, (stats.calm || 0) + restore.calm);
      if (typeof restore.stressReduce === 'number') stats.stress = Math.max(0, (stats.stress || 0) - restore.stressReduce);

      const newDebuffs = (current.debuffs || []).filter(debuff => !debuff.name.includes('Daily') && !debuff.name.includes('Tired'));
      return {
        ...current,
        stats,
        debuffs: newDebuffs,
        lastDailyReset: new Date().toISOString(),
      };
    });
  }

  async get(): Promise<PlayerData | null> {
    if (!this.data) {
      await this.initializeStore();
    }
    await this.checkDailyReset();
    return this.data;
  }

  async update(updater: (data: PlayerData) => PlayerData | Promise<PlayerData>): Promise<void> {
    if (!this.data) {
      await this.initializeStore();
    }

    if (!this.vault) {
      console.error('Cannot update player data without vault');
      return;
    }

    const newData = await updater(this.data!);
    this.data = newData;

    // CRITICAL FIX: Write PlayerData IMMEDIATELY without debouncing
    // The DebouncedWriteManager was causing race conditions where:
    // 1. File content is read
    // 2. Delay happens (setTimeout)
    // 3. File gets cleared by something
    // 4. Write happens with stale/empty content
    // Solution: Skip the debouncer entirely for PlayerData
    try {
      const { updatePlayerData } = await import('../../features/player/utils/playerDataUtils');
      await updatePlayerData(this.vault, newData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[PlayerStore] Failed to write player data:', message);
      throw error;
    }

    this.emitChange({
      type: 'data-updated',
      payload: this.data,
      timestamp: Date.now()
    });
  }

  private async processWriteQueue() {
    if (this.isProcessingQueue || this.writeQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.writeQueue.length > 0) {
      const writeOp = this.writeQueue.shift();
      if (writeOp) {
        await writeOp();
      }
    }

    this.isProcessingQueue = false;
  }

  onChange(callback: (change: PlayerStateChange) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emitChange(change: PlayerStateChange) {
    this.listeners.forEach(listener => {
      try {
        listener(change);
      } catch (error) {
        console.error('Error in player store listener:', error);
      }
    });
  }

  // Convenience methods for common operations
  async addCoins(amount: number): Promise<void> {
    await this.update(data => ({
      ...data,
      coins: (data.coins || 0) + amount
    }));

    // Trigger achievement events
    try {
      const { achievementEventService } = await import('../../features/achievements/services/achievementEventService');
      await achievementEventService.processGameEvent({
        type: 'coins_earned',
        data: { amount, totalCoins: this.data?.coins || 0 },
        timestamp: new Date()
      });
    } catch (error) {
      console.warn('[PlayerStore] Failed to trigger achievement events:', error);
    }
  }

  async spendCoins(amount: number): Promise<boolean> {
    if (!this.data || (this.data.coins || 0) < amount) {
      return false;
    }

    await this.update(data => ({
      ...data,
      coins: data.coins - amount
    }));
    return true;
  }

  async addXP(amount: number): Promise<XPGainResult> {
    const oldLevel = this.data?.level || 1;
    const oldRank = getRankFromLevel(oldLevel);
    const oldData = { ...this.data };

    await this.update(data => {
      // Helper function to calculate XP required for a level
      const getXpRequired = (level: number): number => {
        return level * level * 1000 - (level - 1) * (level - 1) * 1000;
      };

      let currentXP = (data.xp || 0) + amount;
      let currentLevel = data.level || 1;
      let currentXPRequired = data.xpRequired || getXpRequired(currentLevel);
      let leveledUp = false;

      // Check for level ups
      while (currentXP >= currentXPRequired) {
        currentXP -= currentXPRequired;
        currentLevel++;
        currentXPRequired = getXpRequired(currentLevel);
        leveledUp = true;
      }

      return {
        ...data,
        xp: currentXP,
        level: currentLevel,
        xpRequired: currentXPRequired,
        total_exp: (data.total_exp || 0) + amount
      };
    });

    const newLevel = this.data?.level || oldLevel;
    const newRank = getRankFromLevel(newLevel);
    const result: XPGainResult = {
      leveledUp: newLevel > oldLevel,
      oldLevel,
      newLevel,
      rankChanged: newRank !== oldRank,
      oldRank,
      newRank,
    };

    // Trigger achievement events
    try {
      const { achievementEventService } = await import('../../features/achievements/services/achievementEventService');
      await achievementEventService.processGameEvent({
        type: 'xp_gained',
        data: { amount, totalXP: this.data?.xp || 0 },
        timestamp: new Date()
      });

      if (this.data && oldData && this.data.level > (oldData.level || 1)) {
        await achievementEventService.processGameEvent({
          type: 'level_up',
          data: { newLevel: this.data.level, oldLevel: oldData.level },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.warn('[PlayerStore] Failed to trigger achievement events:', error);
    }

    return result;
  }

  async updateStats(statsUpdate: Partial<PlayerData['stats']>): Promise<void> {
    await this.update(data => ({
      ...data,
      stats: {
        ...data.stats,
        ...statsUpdate
      }
    }));
  }

  // Allow settings to configure reset hour and restore amounts
  configure(opts: { resetHour?: number; dailyRestore?: { energy?: number; focus?: number; motivation?: number; calm?: number; stressReduce?: number } }) {
    if (typeof opts.resetHour === 'number') {
      this.resetHour = Math.max(0, Math.min(23, Math.floor(opts.resetHour)));
    }
    if (opts.dailyRestore && this.data?.stats) {
      const r = opts.dailyRestore;
      const s = this.data.stats;
      if (typeof r.energy === 'number') s.energy = Math.min(100, (s.energy || 0) + r.energy);
      if (typeof r.focus === 'number') s.focus = Math.min(100, (s.focus || 0) + r.focus);
      if (typeof r.motivation === 'number') s.motivation = Math.min(100, (s.motivation || 0) + r.motivation);
      if (typeof r.calm === 'number') s.calm = Math.min(100, (s.calm || 0) + r.calm);
      if (typeof r.stressReduce === 'number') s.stress = Math.max(0, (s.stress || 0) - r.stressReduce);
      this.emitChange({ type: 'stats-changed', payload: { ...s }, timestamp: Date.now() });
    }
  }
}

export const playerStore = new PlayerStore();
