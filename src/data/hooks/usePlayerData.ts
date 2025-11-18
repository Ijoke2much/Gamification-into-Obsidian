import { useState, useEffect, useCallback } from "react";
import type GamifiedObsidianPlugin from "../../core/main";
import { readPlayerData, updatePlayerData } from "../../features/player/utils/playerDataUtils";
import { PlayerData } from "../../data/models/PlayerData";
import { getStatsFromFolder, Stat } from "../../shared/utils/readStatsFile";
import { MobilePlayerDataLoader } from "../../shared/utils/mobilePlayerDataLoader";

export interface PlayerDataState {
    playerData: PlayerData | null;
    stats: Stat[];
    loading: boolean;
    error: string | null;
}

export interface PlayerDataActions {
    refreshPlayerData: () => Promise<void>;
    refreshStats: () => Promise<void>;
    updateAvatar: (avatarPath: string) => Promise<void>;
    updateLevel: (newLevel: number) => Promise<void>;
    updateExperience: (xp: number) => Promise<void>;
    updateCoins: (coins: number) => Promise<void>;
    setError: (error: string | null) => void;
}

export const usePlayerData = (plugin: GamifiedObsidianPlugin) => {
    const [state, setState] = useState<PlayerDataState>({
        playerData: null,
        stats: [],
        loading: true,
        error: null,
    });

    // Load player data with mobile optimization
    const loadPlayerData = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            // Check if mobile and use mobile loader
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());

            let data: PlayerData | null = null;

            if (isMobile) {
                console.log('📱 [usePlayerData] Using mobile-optimized loader');
                const mobileLoader = MobilePlayerDataLoader.getInstance();
                data = await mobileLoader.loadPlayerData(plugin.app.vault);
            } else {
                console.log('🖥️ [usePlayerData] Using standard loader');
                data = await readPlayerData(plugin.app.vault);
            }

            window.console.log('🚨 [PlayerData] Loading player data:', data?.avatar ? `Avatar: ${data.avatar}` : 'No avatar');
            setState(prev => ({ ...prev, playerData: data, loading: false }));
        } catch (error) {
            console.error("Failed to load player data:", error);
            setState(prev => ({
                ...prev,
                error: "Failed to load player data",
                loading: false
            }));
        }
    }, [plugin.app.vault]);

    // Load stats
    const loadStats = useCallback(async () => {
        try {
            const statsData = await getStatsFromFolder(plugin.app, plugin.settings.statFolder || "SkillTree/Master-Class/Stats");
            // Handle the case where statsData might be StatDebugInfo
            const stats = Array.isArray(statsData) ? statsData : [];
            setState(prev => ({ ...prev, stats }));
        } catch (error) {
            console.error("Failed to load stats:", error);
            setState(prev => ({ ...prev, error: "Failed to load stats" }));
        }
    }, [plugin.app, plugin.settings.statFolder]);

    // Initialize data
    useEffect(() => {
        loadPlayerData();
        loadStats();
    }, [loadPlayerData, loadStats]);

    // Listen for global update events to refresh UI automatically
    useEffect(() => {
        const onPlayerDataUpdated = () => {
            loadPlayerData();
        };
        const onStatsUpdated = () => {
            loadStats();
        };

        document.addEventListener('player-data-updated', onPlayerDataUpdated);
        document.addEventListener('stats-updated', onStatsUpdated);

        return () => {
            document.removeEventListener('player-data-updated', onPlayerDataUpdated);
            document.removeEventListener('stats-updated', onStatsUpdated);
        };
    }, [loadPlayerData, loadStats]);

    const actions: PlayerDataActions = {
        refreshPlayerData: loadPlayerData,
        refreshStats: loadStats,

        updateAvatar: async (avatarPath: string) => {
            try {
                if (!state.playerData) {
                    window.console.log('🚨 [Avatar] No playerData available for avatar update');
                    return;
                }

                window.console.log('🚨 [Avatar] Updating avatar from:', state.playerData.avatar, 'to:', avatarPath);
                const updatedData = { ...state.playerData, avatar: avatarPath };

                window.console.log('🚨 [Avatar] Calling updatePlayerData with:', updatedData);
                await updatePlayerData(plugin.app.vault, updatedData);
                window.console.log('🚨 [Avatar] updatePlayerData completed successfully');

                setState(prev => ({ ...prev, playerData: updatedData }));
                window.console.log('🚨 [Avatar] React state updated successfully');
            } catch (error) {
                window.console.error("🚨 [Avatar] Failed to update avatar:", error);
                setState(prev => ({ ...prev, error: "Failed to update avatar" }));
            }
        },

        updateLevel: async (newLevel: number) => {
            try {
                if (!state.playerData) return;

                const updatedData = { ...state.playerData, level: newLevel };
                await updatePlayerData(plugin.app.vault, updatedData);
                setState(prev => ({ ...prev, playerData: updatedData }));
            } catch (error) {
                console.error("Failed to update level:", error);
                setState(prev => ({ ...prev, error: "Failed to update level" }));
            }
        },

        updateExperience: async (xp: number) => {
            try {
                if (!state.playerData) return;

                const updatedData = { ...state.playerData, experience: xp };
                await updatePlayerData(plugin.app.vault, updatedData);
                setState(prev => ({ ...prev, playerData: updatedData }));
            } catch (error) {
                console.error("Failed to update experience:", error);
                setState(prev => ({ ...prev, error: "Failed to update experience" }));
            }
        },

        updateCoins: async (coins: number) => {
            try {
                if (!state.playerData) return;

                const updatedData = { ...state.playerData, coins };
                await updatePlayerData(plugin.app.vault, updatedData);
                setState(prev => ({ ...prev, playerData: updatedData }));
            } catch (error) {
                console.error("Failed to update coins:", error);
                setState(prev => ({ ...prev, error: "Failed to update coins" }));
            }
        },

        setError: (error: string | null) => {
            setState(prev => ({ ...prev, error }));
        },
    };

    return { state, actions };
}; 