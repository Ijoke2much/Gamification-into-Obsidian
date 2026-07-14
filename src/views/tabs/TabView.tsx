import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import type GamifiedObsidianPlugin from "src/core/main";
import { TFile } from 'obsidian';
import { ErrorBoundary } from "../../shared/components/ErrorBoundary";
import { safeAsync } from "../../shared/utils/errorHandler";
import { ProgressBar } from "src/shared/components/ui/ProgressBar";
import { getStatsFromFolder, Stat, StatDebugInfo } from "src/shared/utils/readStatsFile";
import { updatePlayerData } from "src/features/player/utils/playerDataUtils";
import { AvatarPickerModal } from "../../features/player/modals/AvatarPickerModal";
import { PlayerData } from "src/data/models/PlayerData";
import { AchievementTracker } from "../../data/models/AchievementSystem";
import { PlayerInfoCard } from "../../features/player/components/PlayerInfoCard";
import { PenaltyStatusCard } from "../../features/player/components/PenaltyStatusCard";
import { ActiveArtifactsCard } from "../../features/player/components/ActiveArtifactsCard";
import { ActiveBuffsCard } from "../../features/player/components/ActiveBuffsCard";
import { ClickableTooltip } from "../../shared/components/ui/ClickableTooltip";
import { GlobalNotificationSystem } from "../../shared/components/ui/GlobalNotificationSystem";
import { CeremonyHost } from "../../shared/components/ui/CeremonyHost";
import { AchievementUnlockHost } from "../../features/achievements/components/AchievementUnlockHost";
import { onAchievementGalleryOpen } from "../../shared/utils/achievementGalleryEvents";

import { pixelNotice } from '../../shared/utils/noticeUtils';
import { simulateDebugQuestRewards } from '../../features/quests/utils/debugQuestSimulator';
import { openFocusCheckInModal } from '../../features/focus/modals/FocusCheckInModal';
import {
	debugSimulateCheckInDue,
	isFocusCheckInDue,
	subscribeFocusCheckInChanges,
} from '../../features/focus/utils/focusCheckInService';
import {
    getResolvedGameplayConfig,
    isEnergySystemEnabled,
    isPlayerTabEnabled,
    type PlayerTabKey,
} from '../../shared/utils/gameplayConfig';
import { resolveEnergyHudConfig } from '../../shared/utils/energyHudConfig';
import { onSettingsUpdated } from '../../shared/utils/settingsEvents';
import { getAppliedVisualTheme } from '../../shared/utils/visualThemeManager';
import { SystemResourceBar } from '../../shared/components/ui/system';
import {
    PlayerIcon,
    ShopIcon,
    QuestIcon,
    StatsIcon,
    AchievementsIcon,
    FlameTimerIcon
} from "../../shared/components/ui/GameIcons";
import { EnhancedEnergyHUD } from "../../features/energy/components/EnhancedEnergyHUD";
import SkillTreeModal from "../../features/skillTree/modals/SkillTreeModal";
import { InventoryModalClass } from "../../features/inventory/modals/InventoryModalClass";
import { useMobileOptimizations } from "../../shared/hooks/useMobileOptimizations";
import { currencyDisplay } from "../../shared/services/currencyDisplayService";
import { MobileErrorBoundary } from "../../shared/components/MobileErrorBoundary";

// Enhanced lazy loading with performance optimization
const ShopTab = React.lazy(() => import("src/features/shop/components/createShopTab"));
const QuestTab = React.lazy(() =>
	import("../sidebar/SidebarQuestView").then((m) => ({ default: m.SidebarQuestViewComponent }))
);
const HabitsTab = React.lazy(() => import("src/views/tabs/habits/HabitsTab").then(module => ({ default: module.HabitsTab })));
const StatsTabView = React.lazy(() => import("./stats/StatsTab").then(module => ({ default: module.StatsTabView })));
const AchievementsTab = React.lazy(() => import("./achievements/AchievementsTab"));
const PomodoroTab = React.lazy(() => import("./pomodoro/PomodoroTab").then(module => ({ default: module.PomodoroTab })));
const AnalyticsTab = React.lazy(() => import("./analytics/AnalyticsTab"));
const CraftingTab = React.lazy(() => import("../../features/crafting/components/CraftingTab").then(module => ({ default: module.CraftingTab })));
// Heavy features with enhanced lazy loading

// Debug components - only load in development
const EnergySystemTest = process.env.NODE_ENV === 'development' ? React.lazy(() => import("../../shared/components/ui/EnergySystemTest").then(module => ({ default: module.EnergySystemTest }))) : null;
const BatteryTest = process.env.NODE_ENV === 'development' ? React.lazy(() => import("../../shared/components/ui/BatteryTest").then(module => ({ default: module.BatteryTest }))) : null;
const EnergyDebug = process.env.NODE_ENV === 'development' ? React.lazy(() => import("../../shared/components/ui/EnergyDebug").then(module => ({ default: module.EnergyDebug }))) : null;

// Import CSS modules
import styles from "./TabView.module.css";
import cardStyles from "../../features/player/components/PlayerTabCards.module.css";

// Add HabitsIcon component (you can create this or use an existing icon)
const HabitsIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-7z"/>
        <path d="M13 3h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
        <path d="M16 8l-2 2-1-1"/>
        <path d="M8 16l-2 2-1-1"/>
    </svg>
);

// Add the crafting icon component
const CraftingIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        <path d="M12 22V12"/>
    </svg>
);

const AnalyticsIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18"/>
        <path d="M7 15l3-3 4 4 5-7"/>
    </svg>
);

const SettingsIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const SkillTreeCardIcon = (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
    >
        <circle cx="12" cy="7" r="4.5" fill="#16a34a" />
        <circle cx="9" cy="8" r="3.5" fill="#22c55e" />
        <circle cx="15" cy="8" r="3.5" fill="#22c55e" />
        <path
            d="M12 11v6"
            stroke="#bbf7d0"
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M12 13l-3 2.5M12 14.5l3 2"
            stroke="#bbf7d0"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
        <circle cx="12" cy="19" r="1.3" fill="#15803d" />
    </svg>
);

// Mobile-optimized loading component
const TabLoadingState: React.FC<{ tabName: string }> = ({ tabName }) => {
    const { isMobile, mobileClasses } = useMobileOptimizations();
    
    return (
        <div className={`${mobileClasses.container} ${styles.loadingContainer}`} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '1rem' : '2rem',
            color: 'var(--text-muted)',
            gap: isMobile ? '0.75rem' : '1rem',
            minHeight: isMobile ? '200px' : '300px'
        }}>
            <div style={{
                width: isMobile ? '20px' : '24px',
                height: isMobile ? '20px' : '24px',
                border: '2px solid var(--background-modifier-border)',
                borderTop: '2px solid var(--interactive-accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: isMobile ? '14px' : '16px' }}>Loading {tabName}...</p>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

/**
 * TABS is the array of tabs that are displayed in the player tab.
 * It contains the key, label, and icon for each tab. and allows for easy addition of new tabs.
 */
const TABS = [
    { key: "player", label: "Player", icon: PlayerIcon },
    { key: "shop", label: "Shop", icon: ShopIcon },
    { key: "quests", label: "Quests", icon: QuestIcon },
    { key: "habits", label: "Habits", icon: HabitsIcon },
    { key: "crafting", label: "Crafting", icon: CraftingIcon },
    { key: "achievements", label: "Achievements", icon: AchievementsIcon },
    { key: "pomodoro", label: "Pomodoro", icon: FlameTimerIcon },
    { key: "analytics", label: "Analytics", icon: AnalyticsIcon }
];

interface PlayerTabViewProps {
    plugin: GamifiedObsidianPlugin;
}

/**
 * PlayerTabView is the view for the player tab.
 * It displays the player's information and quests.
 */
const PlayerTabView: React.FC<PlayerTabViewProps> = ({ plugin }) => {
    // Use localStorage to persist tab state
    const [selectedTab, setSelectedTab] = useState<string>(() => {
        const saved = localStorage.getItem('gamification-selected-tab');
        if (saved === 'stats' || saved === 'boss') return 'player';
        return saved || 'player';
    });
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stat[]>([]);
    const tabRibbonRef = useRef<HTMLDivElement>(null);
    const [showStats, setShowStats] = useState(false);
    const [saving, setSaving] = useState(false);
    const [debugRunning, setDebugRunning] = useState(false);
    const [checkInDue, setCheckInDue] = useState(false);
    const [visible, setVisible] = useState(!document.hidden);
    const [pinned] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('gamification-pinned-tabs') || '[]'); } catch { return []; }
    });
    const [showSkillTreeModal, setShowSkillTreeModal] = useState(false);
    // Keep Pomodoro mounted after first open so the timer doesn't reset on tab switch
    const [hasMountedPomodoro, setHasMountedPomodoro] = useState(() => selectedTab === 'pomodoro');
    const [visualThemeRevision, setVisualThemeRevision] = useState(0);
    const appliedVisualTheme = useMemo(
        () => getAppliedVisualTheme(),
        [visualThemeRevision]
    );

    useEffect(() => onSettingsUpdated(() => setVisualThemeRevision((n) => n + 1)), []);

    // Debug logging
    console.log('🎮 PlayerTabView component loaded, selectedTab:', selectedTab);
    console.log('=== PLAYER TAB VIEW RENDER ===');
    console.log('Selected tab:', selectedTab);
    console.log('Plugin exists:', !!plugin);
    console.log('============================');

    // Mobile optimizations
    const { 
        isMobile, 
        mobileClasses, 
        useSwipe
    } = useMobileOptimizations();

    // Simple mobile initialization - let Obsidian handle viewport
    useEffect(() => {
        if (isMobile) {
            console.log('📱 Mobile device detected, applying light mobile optimizations...');
            
            // Add mobile class to body for global mobile styles (non-intrusive)
            document.body.classList.add('gamification-mobile');
            
            // Let Obsidian handle its own viewport settings - don't override
            
            return () => {
                document.body.classList.remove('gamification-mobile');
            };
        }
    }, [isMobile]);

    // Create achievement tracker instance for AchievementsTab
    const [achievementTracker] = useState(() => new AchievementTracker());
    const [highlightAchievementId, setHighlightAchievementId] = useState<string | null>(null);
    const [settingsRevision, setSettingsRevision] = useState(0);

    useEffect(() => {
        return onAchievementGalleryOpen((achievementId) => {
            setSelectedTab("achievements");
            if (achievementId) setHighlightAchievementId(achievementId);
        });
    }, []);

    useEffect(() => {
        return onSettingsUpdated(() => setSettingsRevision((v) => v + 1));
    }, []);

    const refreshCheckInDue = useCallback(async () => {
        if (plugin.settings.enableFocusCheckIns === false) {
            setCheckInDue(false);
            return;
        }
        const due = await isFocusCheckInDue(plugin.app, plugin.settings);
        setCheckInDue(due);
    }, [plugin.app, plugin.settings]);

    useEffect(() => {
        void refreshCheckInDue();
        const unsub = subscribeFocusCheckInChanges(() => {
            void refreshCheckInDue();
        });
        const interval = window.setInterval(() => {
            if (visible) void refreshCheckInDue();
        }, 30_000);
        return () => {
            unsub();
            window.clearInterval(interval);
        };
    }, [refreshCheckInDue, visible, settingsRevision]);

    const handleOpenCheckIn = useCallback(() => {
        openFocusCheckInModal(plugin.app, plugin.settings);
    }, [plugin.app, plugin.settings]);

    const gameplayConfig = useMemo(
        () => getResolvedGameplayConfig(plugin.app),
        [plugin.settings, settingsRevision]
    );
    const energySystemOn = isEnergySystemEnabled(plugin.settings);
    const energyHudConfig = useMemo(
        () => resolveEnergyHudConfig(plugin.settings),
        [plugin.settings, settingsRevision]
    );
    const penaltiesUiOn = gameplayConfig.penaltiesEnabled;

    const filteredTabs = TABS.filter((t) =>
        isPlayerTabEnabled(gameplayConfig, t.key as PlayerTabKey)
    );
    useEffect(() => {
        const tabExists = filteredTabs.some(t => t.key === selectedTab);
        if (!tabExists) {
            const fallbackKey = filteredTabs[0]?.key || 'player';
            if (selectedTab !== fallbackKey) {
                setSelectedTab(fallbackKey);
            }
        }
    }, [filteredTabs, selectedTab]);

    // Pinned tabs ordering (legacy localStorage order preserved)
    const displayTabs = [
        ...pinned.map(k => filteredTabs.find(t => t.key === k)).filter(Boolean) as typeof TABS,
        ...filteredTabs.filter(t => !pinned.includes(t.key))
    ];
    const currentTab = displayTabs.find(tab => tab.key === selectedTab) || displayTabs[0] || TABS[0];

    const openPluginSettings = useCallback(() => {
        plugin.openPluginSettings();
    }, [plugin]);

    // Save tab state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('gamification-selected-tab', selectedTab);
    }, [selectedTab]);

    // Once Pomodoro has been opened, keep it mounted (hidden when inactive)
    useEffect(() => {
        if (selectedTab === 'pomodoro') {
            setHasMountedPomodoro(true);
        }
    }, [selectedTab]);

    // Listen for tab switch requests from other components
    useEffect(() => {
        const handleTabSwitchRequest = (event: CustomEvent) => {
            const { targetTab } = event.detail ?? {};
            window.console.log('🔄 TabView: Received tab switch request for:', targetTab);
            if (targetTab === 'boss') {
                void plugin.activateBossView();
                return;
            }
            if (targetTab === 'stats') {
                setShowStats(true);
                return;
            }
            if (targetTab && targetTab !== selectedTab) {
                setSelectedTab(targetTab);
                window.console.log('🔄 TabView: Switched to tab:', targetTab);
            }
        };

        window.addEventListener('requestActiveTabChange', handleTabSwitchRequest as EventListener);

        return () => {
            window.removeEventListener('requestActiveTabChange', handleTabSwitchRequest as EventListener);
        };
    }, [selectedTab, plugin]);

    // Saving indicator events
    useEffect(() => {
        const onSaving = () => setSaving(true);
        const onSaved = () => setSaving(false);
        document.addEventListener('player-data-saving', onSaving as EventListener);
        document.addEventListener('player-data-saved', onSaved as EventListener);
        return () => {
            document.removeEventListener('player-data-saving', onSaving as EventListener);
            document.removeEventListener('player-data-saved', onSaved as EventListener);
        };
    }, []);

    // Visibility handling for background timers
    useEffect(() => {
        const onVis = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    const selectTabKey = useCallback(
        (tabKey: string) => {
            if (tabKey === 'boss') {
                void plugin.activateBossView();
                return;
            }
            setSelectedTab(tabKey);
        },
        [plugin]
    );

    // Mobile swipe navigation - disable for tabs that have their own internal navigation
    const swipeHandlers = useSwipe(
        () => {
            if (selectedTab === 'analytics') return;
            const n = displayTabs.length;
            let idx = displayTabs.findIndex(tab => tab.key === selectedTab);
            for (let s = 0; s < n; s++) {
                idx = (idx + 1) % n;
                const key = displayTabs[idx].key;
                if (key !== 'analytics') {
                    setSelectedTab(key);
                    return;
                }
            }
        },
        () => {
            if (selectedTab === 'analytics') return;
            const n = displayTabs.length;
            let idx = displayTabs.findIndex(tab => tab.key === selectedTab);
            for (let s = 0; s < n; s++) {
                idx = (idx - 1 + n) % n;
                const key = displayTabs[idx].key;
                if (key !== 'analytics') {
                    setSelectedTab(key);
                    return;
                }
            }
        }
    );

    // Let Obsidian handle zoom behavior - don't interfere
    // useEffect(() => {
    //     if (isMobile) {
    //         const cleanup = preventZoom();
    //         return cleanup;
    //     }
    // }, [isMobile, preventZoom]);

    useEffect(() => {
        const ribbon = tabRibbonRef.current;
        if (!ribbon) return;
        const activeTab = ribbon.querySelector<HTMLElement>(`[data-tab-key="${selectedTab}"]`);
        activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [selectedTab]);

    // Manual reload function for button clicks
    const reloadPlayerData = useCallback(async () => {
        await safeAsync(
            async () => {
                const { playerStore } = await import('../../shared/state/playerStore');
                await playerStore.refreshPlayerData();
                // Data will update automatically via the subscription
            },
            {
                context: 'Refresh player data',
                noticeMessage: 'Failed to refresh player data',
                retries: 1,
                retryDelay: 500
            }
        );
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
        const initializePlayerData = async () => {
            setLoading(true);
            try {
                if (isMobile) {
                    console.log('📱 Initializing player data for mobile device...');
                }
                
                // Initialize playerStore with the vault from the plugin
                // PlayerStore now has guards to prevent multiple initializations
                const { playerStore } = await import('../../shared/state/playerStore');
                await playerStore.setVault(plugin.app.vault);
                
                // Ensure currency display service is initialized with current settings
                currencyDisplay.initialize(plugin.settings);
                
                // Get initial data
                const data = await playerStore.get();
                setPlayerData(data);
                
                if (isMobile) {
                    console.log('📱 Player data loaded successfully on mobile:', data ? 'Data found' : 'No data');
                }
                
                // Subscribe to changes
                unsubscribe = playerStore.onChange((change) => {
                    if (change.type === 'data-updated') {
                        setPlayerData(change.payload);
                        if (isMobile) {
                            console.log('📱 Player data updated on mobile');
                        }
                    }
                });
                
                setLoading(false);
            } catch (error) {
                console.error("Error initializing player data:", error);
                if (isMobile) {
                    console.error("📱 Mobile-specific error details:", error);
                }
                setLoading(false);
            }
        };
        
        initializePlayerData();
        
        // Cleanup on unmount
        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [plugin, isMobile]);

    // NOTE: Removed player-data-updated event listener to prevent infinite loops
    // since we're using playerStore directly in reloadPlayerData

    // Listen for stats updates
    useEffect(() => {
        const handleStatsUpdate = () => {
            console.log("[PlayerTabView] Stats update event received, reloading stats...");
            const loadStats = async () => {
                const folderPath = plugin.settings.statFolder || "SkillTree/Master-Class/Stats";
                try {
                    const result = await getStatsFromFolder(plugin.app, folderPath);
                    if (Array.isArray(result)) {
                        setStats(result);
                    } else if (result && typeof result === 'object' && 'parsedStats' in result) {
                        setStats((result as StatDebugInfo).parsedStats);
                    }
                } catch (error) {
                    console.error("Error loading stats:", error);
                    setStats([]);
                }
            };
            loadStats();
        };

        document.addEventListener("stats-updated", handleStatsUpdate);
        return () => document.removeEventListener("stats-updated", handleStatsUpdate);
    }, [plugin]);

    // Initial stats loading
    useEffect(() => {
        const loadStats = async () => {
            const folderPath = plugin.settings.statFolder || "SkillTree/Master-Class/Stats";
            try {
                const result = await getStatsFromFolder(plugin.app, folderPath);
                if (Array.isArray(result)) {
                    setStats(result);
                } else if (result && typeof result === 'object' && 'parsedStats' in result) {
                    setStats((result as StatDebugInfo).parsedStats);
                }
            } catch (error) {
                console.error("Error loading stats:", error);
                setStats([]);
            }
        };
        loadStats();
    }, [plugin]);

    // Handler for avatar change with enhanced mobile debugging
    const handleAvatarChange = async (newAvatarPath: string) => {
        console.log('🎯 handleAvatarChange called with:', newAvatarPath);
        console.log('🎯 Current playerData:', playerData);
        
        if (!playerData) {
            console.error('❌ No playerData available for avatar change');
            return;
        }
        
        const updatedData = { ...playerData, avatar: newAvatarPath };
        console.log('🎯 Updated data:', updatedData);
        
        try {
            await updatePlayerData(plugin.app.vault, updatedData);
            console.log('✅ PlayerData file updated successfully');
            
            setPlayerData(updatedData);
            console.log('✅ React state updated successfully');
            
            // Force a re-render
            document.dispatchEvent(new Event('player-data-updated'));
            console.log('✅ Player data update event dispatched');
            
        } catch (error) {
            console.error('❌ Error updating avatar:', error);
        }
    };

    // Open the avatar picker modal (now used)
    const openAvatarPicker = async () => {
        // Only show images from the avatar folder (default 'assets/')
        const avatarFolder = plugin.settings.avatarFolder || "assets/";
        console.log('🔍 Looking for avatar files in folder:', avatarFolder);
        
        const allFiles = plugin.app.vault.getFiles();
        console.log('🔍 Total files in vault:', allFiles.length);
        
        const files = allFiles.filter(
            (file) =>
                file.path.startsWith(avatarFolder) &&
                ["png", "jpg", "jpeg", "svg"].includes(
                    file.extension.toLowerCase()
                )
        );
        
        console.log('🔍 Avatar files found:', files.length);
        console.log('🔍 Avatar file paths:', files.map(f => f.path));
        
        try {
            // Mobile-safe modal instantiation
            const modal = new AvatarPickerModal(plugin.app, files, handleAvatarChange);
            if (modal && typeof modal.open === 'function') {
                modal.open();
            } else {
                console.error('📱 Modal constructor failed on mobile');
                pixelNotice('Avatar picker not available on mobile');
            }
        } catch (error) {
            console.error('📱 Mobile avatar picker error:', error);
            pixelNotice('Avatar picker not available on mobile');
        }
    };

    if (selectedTab === "stats") {
        console.log("[PlayerTabView] Stats passed to StatsTab:", stats);
    }

    return (
        <MobileErrorBoundary>
            <div
                className={`${styles.container} ${isMobile ? mobileClasses.container : ''} gamification-container gamification-plugin`}
                data-gamification-plugin
                data-gamification-visual-theme={appliedVisualTheme.preset}
                data-gamification-shell={appliedVisualTheme.shell}
                {...swipeHandlers}
            >
            {/* Global Notification System */}
            <GlobalNotificationSystem />
            <CeremonyHost />
            <AchievementUnlockHost />

            <div className={styles.debugRow}>
            {checkInDue && plugin.settings.enableFocusCheckIns !== false && (
                <button
                    type="button"
                    onClick={handleOpenCheckIn}
                    className={styles.checkInButton}
                    aria-label="Open focus check-in"
                >
                    {isMobile ? '⏱️ Check in' : '⏱️ Check in'}
                </button>
            )}
            
            {/* Debug reload button - hidden on mobile in production */}
            {(!isMobile || process.env.NODE_ENV === 'development') && (
                <button
                    onClick={reloadPlayerData}
                    className={`${styles.reloadButton} ${mobileClasses.button}`}
                    aria-label="Reload player data"
                >
                    {isMobile ? '🔄' : 'Reload Player Data'}
                </button>
            )}
            
            {/* Manual level check button - hidden on mobile in production */}
            {(!isMobile || process.env.NODE_ENV === 'development') && (
                <button
                    onClick={async () => {
                        try {
                            const { playerStore } = await import("../../shared/state/playerStore");
                            const result = await playerStore.checkLevelAndRefresh();
                            console.log("Level check result:", result);
                            if (result?.leveledUp) {
                                // Reload player data to show the changes
                                await reloadPlayerData();
                            }
                        } catch (error) {
                            console.error("Error checking player level:", error);
                            pixelNotice("❌ Error checking player level", 3000);
                        }
                    }}
                    className={`${styles.reloadButton} ${mobileClasses.button}`}
                    style={{ marginLeft: isMobile ? "8px" : "10px" }}
                    aria-label="Check player level"
                >
                    {isMobile ? '📊' : 'Check Level'}
                </button>
            )}
            {/* Test notice button for debugging the gamified notice styling */}
            {(!isMobile || process.env.NODE_ENV === 'development') && (
                <button
                    onClick={() => {
                        // Lazy-load to avoid circular deps at module load time
                        import('../../shared/utils/noticeUtils')
                            .then(({ showGameNotice }) => {
                                showGameNotice('Test Gamification Notice');
                            })
                            .catch(err => {
                                console.error('Failed to show test notice:', err);
                            });
                    }}
                    className={`${styles.reloadButton} ${mobileClasses.button}`}
                    style={{ marginLeft: isMobile ? "8px" : "10px" }}
                    aria-label="Show test notice"
                >
                    {isMobile ? '🧪' : 'Test Notice'}
                </button>
            )}
            {(!isMobile || process.env.NODE_ENV === 'development') && (
                <button
                    disabled={debugRunning}
                    onClick={() => {
                        if (debugRunning) return;
                        setDebugRunning(true);
                        void simulateDebugQuestRewards(plugin.app)
                            .catch((err) => {
                                console.error('Debug quest simulation failed:', err);
                                pixelNotice('❌ Debug simulation failed', 3000);
                            })
                            .finally(() => setDebugRunning(false));
                    }}
                    className={`${styles.reloadButton} ${mobileClasses.button}`}
                    style={{ marginLeft: isMobile ? "8px" : "10px", opacity: debugRunning ? 0.6 : 1 }}
                    aria-label="Simulate debug quest rewards"
                >
                    {debugRunning ? 'Simulating…' : isMobile ? '🎮' : 'Debug Quests'}
                </button>
            )}
            {(!isMobile || process.env.NODE_ENV === 'development') && (
                <button
                    onClick={() => {
                        void debugSimulateCheckInDue(plugin.app).catch((err) => {
                            console.error('Debug check-in simulation failed:', err);
                            pixelNotice('❌ Could not simulate check-in', 3000);
                        });
                    }}
                    className={`${styles.reloadButton} ${mobileClasses.button}`}
                    style={{ marginLeft: isMobile ? "8px" : "10px" }}
                    aria-label="Simulate check-in button due"
                >
                    {isMobile ? '⏱️' : 'Debug Check-In'}
                </button>
            )}
            </div>
            {saving && (
                <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>Saving…</span>
            )}
            
            {loading ? (
                <TabLoadingState tabName="Player Data" />
            ) : !playerData ? (
                <div className={`${mobileClasses.container}`} style={{ 
                    padding: isMobile ? '1rem' : '2rem', 
                    textAlign: 'center',
                    color: 'var(--text-error)',
                    background: 'var(--background-primary)',
                    borderRadius: '8px',
                    border: '1px solid var(--background-modifier-border)',
                    margin: '1rem 0'
                }}>
                    <h3>Player Data Not Found</h3>
                    <p>Please create SkillTree/PlayerData.md with the correct YAML format.</p>
                    {isMobile && (
                                        <>
                                            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '1rem' }}>
                                                📱 Mobile detected - ensure your vault is properly synced.
                                            </p>
                                            <button 
                                                onClick={async () => {
                                                    // Force mobile PlayerData loading test
                                                    try {
                                                        console.log("🔄 Testing direct mobile PlayerData loading...");
                                                        const { readPlayerData } = await import('../../features/player/utils/playerDataUtils');
                                                        const result = await readPlayerData(plugin.app.vault);
                                                        if (result) {
                                                            console.log("✅ Direct readPlayerData worked!");
                                                            setPlayerData(result);
                                                            alert(`SUCCESS! Loaded player data directly:\n👤 ${result.name}\n⭐ Level ${result.level}\n💰 ${result.coins} coins`);
                                                        } else {
                                                            alert("❌ Direct readPlayerData still returned null");
                                                        }
                                                    } catch (err) {
                                                        alert(`❌ Error: ${String(err)}`);
                                                    }
                                                }}
                                                style={{
                                                    marginTop: '1rem',
                                                    padding: '8px 16px',
                                                    background: 'var(--interactive-success)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    width: '100%'
                                                }}
                                            >
                                                🔄 Force Load Player Data
                                            </button>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={async () => {
                                    try {
                                        const file = plugin.app.vault.getAbstractFileByPath('SkillTree/PlayerData.md');
                                        let fileContent = "File not accessible";
                                        let fileError: string | null = null;
                                        
                                        if (file) {
                                            try {
                                                // DIRECT FILE CONTENT TEST - multiple methods
                                                console.log("🔍 Direct file content test starting...");
                                                
                                                let rawContent = null;
                                                let readMethod = "none";
                                                const testResults = [];
                                                
                                                // Method 1: Direct adapter read
                                                try {
                                                    rawContent = await plugin.app.vault.adapter.read('SkillTree/PlayerData.md');
                                                    readMethod = "adapter.read";
                                                    testResults.push("✅ adapter.read: SUCCESS");
                                                } catch (err1) {
                                                    testResults.push(`❌ adapter.read: ${String(err1).substring(0, 50)}`);
                                                    
                                                    // Method 2: Try with file object
                                                    try {
                                                        rawContent = await plugin.app.vault.read(file as TFile);
                                                        readMethod = "vault.read";
                                                        testResults.push("✅ vault.read: SUCCESS");
                                                    } catch (err2) {
                                                        testResults.push(`❌ vault.read: ${String(err2).substring(0, 50)}`);
                                                        
                                                        // Method 3: Try cachedRead
                                                        try {
                                                            rawContent = await plugin.app.vault.cachedRead(file as TFile);
                                                            readMethod = "cachedRead";
                                                            testResults.push("✅ cachedRead: SUCCESS");
                                                        } catch (err3) {
                                                            testResults.push(`❌ cachedRead: ${String(err3).substring(0, 50)}`);
                                                            fileError = "All read methods failed";
                                                        }
                                                    }
                                                }
                                                
                                                if (rawContent && rawContent.length > 0) {
                                                    // Parse YAML manually
                                                    try {
                                                        const lines = rawContent.split('\n');
                                                        const yamlStart = lines.findIndex(l => l.trim() === '---');
                                                        const yamlEnd = lines.findIndex((l, i) => i > yamlStart && l.trim() === '---');
                                                        
                                                        if (yamlStart >= 0 && yamlEnd > yamlStart) {
                                                            const yamlLines = lines.slice(yamlStart + 1, yamlEnd);
                                                            
                                                            // Simple YAML parser
                                                            const playerData: Record<string, string | number | unknown[]> = {};
                                                            yamlLines.forEach(line => {
                                                                const colonIndex = line.indexOf(':');
                                                                if (colonIndex > 0) {
                                                                    const key = line.substring(0, colonIndex).trim();
                                                                    let value: string | number | unknown[] = line.substring(colonIndex + 1).trim();
                                                                    
                                                                    // Remove quotes
                                                                    if (typeof value === 'string') {
                                                                        if ((value.startsWith('"') && value.endsWith('"')) || 
                                                                            (value.startsWith("'") && value.endsWith("'"))) {
                                                                            value = value.slice(1, -1);
                                                                        }
                                                                        
                                                                        // Convert numbers
                                                                        if (!isNaN(Number(value)) && value !== '') {
                                                                            value = Number(value);
                                                                        } else if (value === '[]') {
                                                                            // Handle arrays
                                                                            value = [];
                                                                        }
                                                                    }
                                                                    
                                                                    playerData[key] = value;
                                                                }
                                                            });
                                                            
                                                            fileContent = `SUCCESS via ${readMethod}!
File Length: ${rawContent.length} characters

PLAYER DATA FOUND:
👤 Name: ${playerData.name || 'Unknown'}
⭐ Level: ${playerData.level || 'Unknown'}  
💰 Coins: ${playerData.coins || 'Unknown'}
🎯 XP: ${playerData.xp || 'Unknown'}/${playerData.xpRequired || 'Unknown'}
🏆 Class: ${playerData.masterClass || 'Unknown'}

YAML Keys Found: ${Object.keys(playerData).join(', ')}

Test Results:
${testResults.join('\n')}

First 200 chars of file:
${rawContent.substring(0, 200)}`;
                                                            
                                                        } else {
                                                            fileContent = `File read via ${readMethod} but no YAML frontmatter found!
Length: ${rawContent.length}
Content preview: ${rawContent.substring(0, 200)}`;
                                                        }
                                                    } catch (parseErr) {
                                                        fileContent = `File read via ${readMethod} but parsing failed!
Length: ${rawContent.length}
Parse Error: ${String(parseErr)}
Content preview: ${rawContent.substring(0, 200)}`;
                                                    }
                                                } else {
                                                    fileContent = `All read methods failed:
${testResults.join('\n')}`;
                                                }
                                            } catch (err) {
                                                fileError = String(err);
                                                fileContent = "ERROR during direct file test";
                                            }
                                        }
                                        
                                        const debugInfo = {
                                            userAgent: navigator.userAgent,
                                            vaultFiles: plugin.app.vault.getAllLoadedFiles().length,
                                            skillTreeFiles: plugin.app.vault.getAllLoadedFiles().filter(f => f.path.includes('SkillTree') || f.path.includes('PlayerData')).map(f => f.path),
                                            directFileCheck: !!file,
                                            fileType: file?.constructor.name || 'N/A',
                                            fileReadable: !fileError,
                                            fileError: fileError,
                                            fileContentLength: fileContent.length,
                                            firstChars: fileContent.substring(0, 100)
                                        };
                                        const debugText = JSON.stringify(debugInfo, null, 2);
                                        
                                        // Try to copy to clipboard
                                        if (navigator.clipboard) {
                                            try {
                                                await navigator.clipboard.writeText(debugText);
                                                alert(`Debug Info (Copied to clipboard):\n${debugText}`);
                                            } catch (clipErr) {
                                                alert(`Debug Info:\n${debugText}\n\n(Could not copy to clipboard)`);
                                            }
                                        } else {
                                            alert(`Debug Info:\n${debugText}\n\n(Clipboard not available)`);
                                        }
                                    } catch (err) {
                                        alert(`Debug Error: ${String(err)}`);
                                    }
                                }}
                                style={{
                                    marginTop: '1rem',
                                    padding: '8px 16px',
                                    background: 'var(--interactive-accent)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}
                                >
                                    Debug Info & Copy
                                </button>
                                <button 
                                    onClick={() => {
                                        // Force a fresh attempt to load player data and show console logs
                                        console.log("🔍 Manual debug: Attempting to reload player data...");
                                        reloadPlayerData();
                                        alert("Check browser console for detailed 📱 mobile debug logs!");
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'var(--interactive-accent-hover)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                    }}
                                >
                                    Show Console Logs
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tabNavBar}>
                        <div
                            ref={tabRibbonRef}
                            className={styles.tabRibbon}
                            role="tablist"
                            aria-label="Main tabs"
                        >
                            {displayTabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    data-tab-key={tab.key}
                                    onClick={() => selectTabKey(tab.key)}
                                    className={
                                        selectedTab === tab.key
                                            ? `${styles.tabButton} ${styles.tabButtonActive} ${isMobile ? mobileClasses.touchTarget : ''}`
                                            : `${styles.tabButton} ${isMobile ? mobileClasses.touchTarget : ''}`
                                    }
                                    role="tab"
                                    aria-selected={selectedTab === tab.key}
                                    title={tab.label}
                                >
                                    <span className={styles.tabIcon}>{tab.icon}</span>
                                    <span className={styles.tabLabel}>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.tabNavDivider} aria-hidden="true" />
                        <button
                            type="button"
                            className={`${styles.settingsButton} ${isMobile ? mobileClasses.touchTarget : ''}`}
                            onClick={openPluginSettings}
                            title="Plugin settings"
                            aria-label="Open gamification settings"
                        >
                            {SettingsIcon}
                        </button>
                    </div>

                    {/* Mobile-optimized tab content */}
                    <div className={`${styles.tabContent} ${isMobile ? mobileClasses.scrollable : ''}`}>
                        {selectedTab === "player" && (
                            <div className={`${styles.gridCol} ${isMobile ? mobileClasses.container : ''} ${appliedVisualTheme.preset === 'system-hunter' ? cardStyles.playerTabSystem : ''}`}>
                                {/* Avatar & Main Info Card */}
                                <PlayerInfoCard
                                    playerData={playerData}
                                    plugin={plugin}
                                    openAvatarPicker={openAvatarPicker}
                                />
                                {/* Player Level + EXP row (below Player card) */}
                                <div
                                    className={cardStyles.cardRow}
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'nowrap',
                                        gap: isMobile ? '10px' : '16px',
                                        alignItems: 'stretch',
                                    }}
                                >
                                    <div className={`${cardStyles.levelCard} ${isMobile ? mobileClasses.card : ''}`}>
                                        <div className={cardStyles.cardLabel}>LEVEL</div>
                                        <div className={cardStyles.levelValue}>{playerData.level}</div>
                                    </div>

                                    <div className={`${cardStyles.expCard} ${isMobile ? mobileClasses.card : ''} ${appliedVisualTheme.preset === 'system-hunter' ? cardStyles.expCardSystem : ''}`}>
                                        {appliedVisualTheme.preset === 'system-hunter' ? (
                                            <SystemResourceBar
                                                label="EXP"
                                                icon="exp"
                                                current={Number(playerData.xp || 0)}
                                                max={Math.max(1, Number(playerData.xpRequired || 1))}
                                            />
                                        ) : (
                                            <>
                                                <div className={cardStyles.cardLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <title>Experience</title>
                                                            <rect x="4" y="4" width="16" height="16" rx="4" />
                                                            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">
                                                                XP
                                                            </text>
                                                        </svg>
                                                    </span>
                                                    EXP
                                                </div>
                                                <ProgressBar
                                                    progress={Math.min(
                                                        100,
                                                        Math.max(
                                                            0,
                                                            Math.round(
                                                                (Number(playerData.xp || 0) /
                                                                    Math.max(1, Number(playerData.xpRequired || 1))) *
                                                                    100
                                                            )
                                                        )
                                                    )}
                                                    height={16}
                                                    labelPosition="center"
                                                    appearance="pixel"
                                                    label={`${Number(playerData.xp || 0)}/${Math.max(1, Number(playerData.xpRequired || 1))}`}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* Currency, Skill Tree & Inventory Side by Side */}
                                <div className={`${cardStyles.cardRow} ${isMobile ? styles.mobileCardRow : ''}`} style={{
                                  flexDirection: isMobile ? 'column' : 'row',
                                  gap: isMobile ? '12px' : '16px',
                                  alignItems: 'stretch',
                                }}>
                                    {/* Currency Card */}
                                    <div className={`${cardStyles.coinsCard} ${mobileClasses.card}`}>
                                        <ClickableTooltip
                                            icon={
                                                <span style={{ fontSize: "16px", paddingRight: "2px" }}>
                                                    {currencyDisplay.getCurrencySymbol()}
                                                </span>
                                            }
                                            label={currencyDisplay.getCurrencyName()}
                                            tooltipContent={
                                                <div>
                                                    Your current {currencyDisplay.getCurrencyNameLowercase()} balance.
                                                    Spend {currencyDisplay.getCurrencyNameLowercase()} in the shop!
                                                </div>
                                            }
                                        />
                                        <div className={cardStyles.coinsValue}>
                                            {playerData.coins}
                                        </div>
                                    </div>
                                    {/* Skill Tree Card - outer card is the button */}
                                    <button
                                        type="button"
                                        className={`${cardStyles.skillTreeCard} ${mobileClasses.card}`}
                                        onClick={() => setShowSkillTreeModal(true)}
                                        aria-label="Open Skill Tree"
                                    >
                                        <span className={cardStyles.actionIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            {SkillTreeCardIcon}
                                        </span>
                                        <span className={cardStyles.actionLabel}>Skill Tree</span>
                                    </button>
                                    {/* Inventory Card - outer card is the button */}
                                    <button
                                        type="button"
                                        className={`${cardStyles.inventoryCard} ${mobileClasses.card}`}
                                        onClick={() => new InventoryModalClass(plugin.app).open()}
                                        aria-label="Open Inventory"
                                    >
                                        <span className={cardStyles.actionIcon}>🎒</span>
                                        <span className={cardStyles.actionLabel}>Inventory</span>
                                    </button>
                                    {/* Stats Button Card - outer card is the button */}
                                    <button
                                        type="button"
                                        className={`${cardStyles.inventoryCard} ${mobileClasses.card}`}
                                        onClick={() => setShowStats(true)}
                                        aria-label="View Stats"
                                    >
                                        <span className={cardStyles.actionIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            {StatsIcon}
                                        </span>
                                        <span className={cardStyles.actionLabel}>Stats</span>
                                    </button>
                                </div>
                                {energySystemOn && energyHudConfig.showHud && (
                                <div
                                    className={`${cardStyles.energyCard} ${cardStyles.energyCardFlush} ${mobileClasses.card}`}
                                >
                                    <EnhancedEnergyHUD
                                        variant="pixel"
                                        showRecommendations={energyHudConfig.showRecommendations}
                                        compact={false}
                                        autoRefresh={visible}
                                        visibleStats={energyHudConfig.visibleStats}
                                        hudTitle={energyHudConfig.hudTitle}
                                    />
                                </div>
                                )}

                                <ActiveBuffsCard />

                                {penaltiesUiOn && <PenaltyStatusCard />}
                                
                                {/* Active Artifacts */}
                                <ActiveArtifactsCard />
                            </div>
                        )}

                        {/* Mobile-optimized tab content with Suspense and Error Boundaries */}
                        <ErrorBoundary componentName="Shop Tab">
                            <Suspense fallback={<TabLoadingState tabName={currentTab.label} />}>
                                {selectedTab === "shop" && (<ShopTab plugin={plugin} rebuildShopTab={() => {}} />)}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Quest Tab">
                            <Suspense fallback={<TabLoadingState tabName="Quests" />}>
                                {selectedTab === "quests" && (<QuestTab app={plugin.app} plugin={plugin} />)}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Habits Tab">
                            <Suspense fallback={<TabLoadingState tabName="Habits" />}>
                                {selectedTab === "habits" && (<HabitsTab plugin={plugin} playerData={playerData} reloadPlayerData={reloadPlayerData} />)}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Crafting Tab">
                            <Suspense fallback={<TabLoadingState tabName="Crafting" />}>
                                {selectedTab === "crafting" && (<CraftingTab plugin={plugin} playerData={playerData} reloadPlayerData={reloadPlayerData} />)}
                            </Suspense>
                        </ErrorBoundary>

                        {/* Stats is now opened via modal; tab removed */}

                        <ErrorBoundary componentName="Achievements Tab">
                            <Suspense fallback={<TabLoadingState tabName="Achievements" />}>
                                {selectedTab === "achievements" && (
                                    <AchievementsTab
                                        tracker={achievementTracker}
                                        onRefresh={reloadPlayerData}
                                        highlightAchievementId={highlightAchievementId}
                                    />
                                )}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Pomodoro Tab">
                            <Suspense fallback={<TabLoadingState tabName="Pomodoro" />}>
                                {hasMountedPomodoro && (
                                    <div style={{ display: selectedTab === 'pomodoro' ? 'block' : 'none' }}>
                                        <PomodoroTab plugin={plugin} playerData={playerData} reloadPlayerData={reloadPlayerData} />
                                    </div>
                                )}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Analytics Tab">
                            <Suspense fallback={<TabLoadingState tabName="Analytics" />}>
                                {selectedTab === "analytics" && (<AnalyticsTab plugin={plugin} />)}
                            </Suspense>
                        </ErrorBoundary>

                        {/* Debug components - only load in development and not on mobile */}
                        {process.env.NODE_ENV === 'development' && !isMobile && (
                            <>
                                <Suspense fallback={<TabLoadingState tabName="Energy System Test" />}>
                                    {EnergySystemTest && <EnergySystemTest />}
                                </Suspense>

                                <Suspense fallback={<TabLoadingState tabName="Battery Test" />}>
                                    {BatteryTest && <BatteryTest />}
                                </Suspense>

                                <Suspense fallback={<TabLoadingState tabName="Energy Debug" />}>
                                    {EnergyDebug && <EnergyDebug />}
                                </Suspense>
                            </>
                        )}
                    </div>
                </>
            )}
        {/* Stats Modal */}
        {showStats && createPortal(
            <div className={styles.modalBackdrop} role="dialog" aria-modal="true" onClick={() => setShowStats(false)}>
                <div className={`${styles.modalPanel} ${styles.statsModalPanel}`} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <div className={styles.statsModalTitleRow}>
                            <span className={styles.statsModalIcon}>{StatsIcon}</span>
                            <h3 className={styles.statsModalTitle}>Stats</h3>
                        </div>
                        <button onClick={() => setShowStats(false)} className={styles.reloadButton} aria-label="Close stats">✕</button>
                    </div>
                    <ErrorBoundary componentName="Stats Modal">
                        <Suspense fallback={<TabLoadingState tabName="Stats" />}>
                            <StatsTabView plugin={plugin} variant="modal" />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>,
            document.body
        )}

        {/* Skill Tree Modal */}
        {showSkillTreeModal && (
            <SkillTreeModal
                isOpen={showSkillTreeModal}
                onClose={() => setShowSkillTreeModal(false)}
                plugin={plugin}
            />
        )}
        </div>
        </MobileErrorBoundary>
    );
};

export default PlayerTabView;