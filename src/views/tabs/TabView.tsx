import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import type GamifiedObsidianPlugin from "src/core/main";
import { Notice } from "obsidian";
import { ErrorBoundary } from "../../shared/components/ErrorBoundary";
import { handleError, safeAsync } from "../../shared/utils/errorHandler";
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

import { 
    PlayerIcon, 
    ShopIcon, 
    QuestIcon, 
    StatsIcon, 
    AchievementsIcon,
    FlameTimerIcon
} from "../../shared/components/ui/GameIcons";
import { EnergyHUD } from "../../shared/components/ui/EnergyHUD";
import { SkillTreeButton } from "../../features/skillTree/components/SkillTreeButton";
import { InventoryButton } from "../../features/inventory/components/InventoryButton";
import { useMobileOptimizations, useMobilePerformance } from "../../shared/hooks/useMobileOptimizations";
import { currencyDisplay } from "../../shared/services/currencyDisplayService";

// Enhanced lazy loading with performance optimization
const ShopTab = React.lazy(() => import("src/features/shop/components/createShopTab"));
const QuestTab = React.lazy(() => import("./quests/QuestTab").then(module => ({ default: module.QuestTab })));
const HabitsTab = React.lazy(() => import("src/views/tabs/habits/HabitsTab").then(module => ({ default: module.HabitsTab })));
const StatsTabView = React.lazy(() => import("./stats/StatsTab").then(module => ({ default: module.StatsTabView })));
const AchievementsTab = React.lazy(() => import("./achievements/AchievementsTab"));
const PomodoroTab = React.lazy(() => import("./pomodoro/PomodoroTab").then(module => ({ default: module.PomodoroTab })));
const AnalyticsTab = React.lazy(() => import("./analytics/AnalyticsTab"));
const CraftingTab = React.lazy(() => import("../../features/crafting/components/CraftingTab").then(module => ({ default: module.CraftingTab })));

// Heavy features with enhanced lazy loading
const BossSystemTab = React.lazy(() => 
    import('../../features/quests/components/BossDashboard')
        .then(module => ({ default: module.BossDashboard }))
        .catch(error => {
            console.warn('Failed to load Boss System:', error);
            return { default: () => <div>Boss System temporarily unavailable</div> };
        })
);

const AdvancedQuestSystemTab = React.lazy(() => 
    import('../../features/quests/components/AdvancedQuestDashboard')
        .then(module => ({ default: module.AdvancedQuestDashboard }))
        .catch(error => {
            console.warn('Failed to load Advanced Quest System:', error);
            return { default: () => <div>Advanced Quest System temporarily unavailable</div> };
        })
);

const SkillTreeTab = React.lazy(() => 
    import('../../features/skillTree/modals/SkillTreeModal')
        .then(module => ({ default: module.SkillTreeModal }))
        .catch(error => {
            console.warn('Failed to load Skill Tree:', error);
            return { default: () => <div>Skill Tree temporarily unavailable</div> };
        })
);

// Debug components - only load in development
const EnergySystemTest = process.env.NODE_ENV === 'development' ? React.lazy(() => import("../../shared/components/ui/EnergySystemTest").then(module => ({ default: module.EnergySystemTest }))) : null;
const BatteryTest = process.env.NODE_ENV === 'development' ? React.lazy(() => import("../../shared/components/ui/BatteryTest").then(module => ({ default: module.BatteryTest }))) : null;
const EnergyDebug = process.env.NODE_ENV === 'development' ? React.lazy(() => import("../../shared/components/ui/EnergyDebug").then(module => ({ default: module.EnergyDebug }))) : null;

// Import CSS modules
import styles from "./TabView.module.css";
import cardStyles from "../../features/player/components/PlayerInfoCard.module.css";

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
    { key: "stats", label: "Stats", icon: StatsIcon },
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
    const [selectedTab, setSelectedTab] = useState<string>("player");
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [stats, setStats] = useState<Stat[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Mobile optimizations
    const { 
        isMobile, 
        mobileClasses, 
        useSwipe,
        preventZoom 
    } = useMobileOptimizations();
    
    const { debounce } = useMobilePerformance();

    // Create achievement tracker instance for AchievementsTab
    const [achievementTracker] = useState(() => new AchievementTracker());

    const currentTab = TABS.find(tab => tab.key === selectedTab) || TABS[0];

    // Mobile swipe navigation
    const swipeHandlers = useSwipe(
        () => {
            // Swipe left - next tab
            const currentIndex = TABS.findIndex(tab => tab.key === selectedTab);
            const nextIndex = (currentIndex + 1) % TABS.length;
            setSelectedTab(TABS[nextIndex].key);
        },
        () => {
            // Swipe right - previous tab
            const currentIndex = TABS.findIndex(tab => tab.key === selectedTab);
            const prevIndex = currentIndex === 0 ? TABS.length - 1 : currentIndex - 1;
            setSelectedTab(TABS[prevIndex].key);
        }
    );

    // Prevent zoom on mobile
    useEffect(() => {
        if (isMobile) {
            const cleanup = preventZoom();
            return cleanup;
        }
    }, [isMobile, preventZoom]);

    // Debounced dropdown close for mobile
    const debouncedCloseDropdown = useCallback(
        debounce(() => setDropdownOpen(false), 100),
        [debounce]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                debouncedCloseDropdown();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [debouncedCloseDropdown]);

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
        const initializePlayerData = async () => {
            setLoading(true);
            try {
                // Initialize playerStore with the vault from the plugin
                const { playerStore } = await import('../../shared/state/playerStore');
                await playerStore.setVault(plugin.app.vault);
                
                // Get initial data
                const data = await playerStore.get();
                setPlayerData(data);
                
                // Subscribe to changes
                const unsubscribe = playerStore.onChange((change) => {
                    if (change.type === 'data-updated') {
                        setPlayerData(change.payload);
                    }
                });
                
                setLoading(false);
                
                // Return cleanup function
                return unsubscribe;
            } catch (error) {
                console.error("Error initializing player data:", error);
                setLoading(false);
            }
        };
        
        const cleanup = initializePlayerData();
        
        // Cleanup on unmount
        return () => {
            cleanup.then(unsubscribe => {
                if (unsubscribe && typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };
    }, [plugin]);

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

    // Handler for avatar change
    const handleAvatarChange = async (newAvatarPath: string) => {
        if (!playerData) return;
        const updatedData = { ...playerData, avatar: newAvatarPath };
        await updatePlayerData(plugin.app.vault, updatedData);
        setPlayerData(updatedData);
    };

    // Open the avatar picker modal (now used)
    const openAvatarPicker = async () => {
        // Only show images from the avatar folder (default 'assets/')
        const avatarFolder = plugin.settings.avatarFolder || "assets/";
        const files = plugin.app.vault
            .getFiles()
            .filter(
                (file) =>
                    file.path.startsWith(avatarFolder) &&
                    ["png", "jpg", "jpeg", "svg"].includes(
                        file.extension.toLowerCase()
                    )
            );
        new AvatarPickerModal(plugin.app, files, handleAvatarChange).open();
    };

    if (selectedTab === "stats") {
        console.log("[PlayerTabView] Stats passed to StatsTab:", stats);
    }

    return (
        <div className={`${styles.container} ${mobileClasses.container} gamification-container`} data-gamification-plugin {...swipeHandlers}>
            {/* Global Notification System */}
            <GlobalNotificationSystem />
            
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
                            new Notice("❌ Error checking player level", 3000);
                        }
                    }}
                    className={`${styles.reloadButton} ${mobileClasses.button}`}
                    style={{ marginLeft: isMobile ? "8px" : "10px" }}
                    aria-label="Check player level"
                >
                    {isMobile ? '📊' : 'Check Level'}
                </button>
            )}
            
            {loading ? (
                <TabLoadingState tabName="Player Data" />
            ) : !playerData ? (
                <div className="text-red-400" style={{ padding: isMobile ? '1rem' : '2rem', textAlign: 'center' }}>
                    Player data not found. Please create SkillTree/PlayerData.md
                    with the correct YAML.
                </div>
            ) : (
                <>
                    {/* Mobile-optimized dropdown */}
                    <div
                        ref={dropdownRef}
                        className={`${styles.dropdown} ${isMobile ? styles.mobileDropdown : ''}`}
                    >
                        <div
                            className={
                                dropdownOpen
                                    ? `${styles.dropdownToggle} ${styles.dropdownToggleActive} ${mobileClasses.button}`
                                    : `${styles.dropdownToggle} ${mobileClasses.button}`
                            }
                            onClick={() => setDropdownOpen((v) => !v)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Current tab: ${currentTab.label}. Click to change tab.`}
                            aria-expanded={dropdownOpen}
                            aria-haspopup="listbox"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setDropdownOpen((v) => !v);
                                }
                            }}
                        >
                            <span style={{ marginRight: isMobile ? 8 : 10 }}>
                                {currentTab.icon}
                            </span>
                            {currentTab.label}
                            <span
                                className={styles.dropdownArrow}
                                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            >
                                ▼
                            </span>
                        </div>
                        {dropdownOpen && (
                            <div
                                className={`${styles.dropdownMenu} ${isMobile ? styles.mobileDropdownMenu : ''}`}
                                role="listbox"
                                aria-label="Available tabs"
                            >
                                {TABS.map((tab) => (
                                    <div
                                        key={tab.key}
                                        className={
                                            selectedTab === tab.key
                                                ? `${styles.dropdownItem} ${styles.dropdownItemActive} ${mobileClasses.touchTarget}`
                                                : `${styles.dropdownItem} ${mobileClasses.touchTarget}`
                                        }
                                        onClick={() => {
                                            setSelectedTab(tab.key);
                                            setDropdownOpen(false);
                                        }}
                                        role="option"
                                        aria-selected={selectedTab === tab.key}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedTab(tab.key);
                                                setDropdownOpen(false);
                                            }
                                        }}
                                    >
                                        <span style={{ marginRight: isMobile ? 8 : 10 }}>
                                            {tab.icon}
                                        </span>
                                        {tab.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mobile-optimized tab content */}
                    <div className={`${styles.tabContent} ${mobileClasses.scrollable}`}>
                        {selectedTab === "player" && (
                            <div className={`${styles.gridCol} ${mobileClasses.container}`}>
                                {/* Avatar & Main Info Card */}
                                <PlayerInfoCard
                                    playerData={playerData}
                                    plugin={plugin}
                                    openAvatarPicker={openAvatarPicker}
                                />
                                {/* Level & EXP Cards Side by Side */}
                                <div className={`${cardStyles.cardRow} ${isMobile ? styles.mobileCardRow : ''}`}>
                                    {/* Level Card */}
                                    <div className={`${cardStyles.levelCard} ${mobileClasses.card}`}>
                                        <ClickableTooltip
                                            icon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    style={{
                                                        paddingRight: "2px",
                                                    }}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <title>Level</title>
                                                    <circle
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                    />
                                                    <text
                                                        x="12"
                                                        y="16"
                                                        textAnchor="middle"
                                                        fontSize="10"
                                                        fill="currentColor"
                                                    >
                                                        Lv
                                                    </text>
                                                </svg>
                                            }
                                            label="Level"
                                            tooltipContent={
                                                <div>
                                                    Level is your overall
                                                    progress. Earn XP to
                                                    increase it!
                                                </div>
                                            }
                                        />
                                        <div className={cardStyles.levelValue}>
                                            {playerData.level}
                                        </div>
                                    </div>
                                    {/* EXP Card */}
                                    <div className={`${cardStyles.expCard} ${mobileClasses.card}`}>
                                        <ClickableTooltip
                                            icon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    style={{
                                                        paddingRight: "2px",
                                                    }}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <title>Experience</title>
                                                    <rect
                                                        x="4"
                                                        y="4"
                                                        width="16"
                                                        height="16"
                                                        rx="4"
                                                    />
                                                    <text
                                                        x="12"
                                                        y="16"
                                                        textAnchor="middle"
                                                        fontSize="10"
                                                        fill="currentColor"
                                                    >
                                                        XP
                                                    </text>
                                                </svg>
                                            }
                                            label="EXP"
                                            tooltipContent={
                                                <div>
                                                    Earn EXP by completing
                                                    tasks. Reach the next level
                                                    by filling the bar!
                                                </div>
                                            }
                                        />
                                        <div className={cardStyles.expValue}>
                                            {playerData.xp} /{" "}
                                            {playerData.xpRequired}
                                        </div>
                                    </div>
                                </div>
                                {/* Progress Bar Card */}
                                <div className={`${cardStyles.progressCard} ${mobileClasses.card}`}>
                                    <div style={{ width: "100%" }}>
                                        <ProgressBar
                                            progress={Math.round(
                                                (playerData.xp /
                                                    playerData.xpRequired) *
                                                    100
                                            )}
                                            height={isMobile ? 16 : 20}
                                        />
                                    </div>
                                </div>
                                {/* Currency, Skill Tree & Inventory Side by Side */}
                                <div className={`${cardStyles.cardRow} ${isMobile ? styles.mobileCardRow : ''}`}>
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
                                    {/* Skill Tree Card */}
                                    <div className={`${cardStyles.skillTreeCard} ${mobileClasses.card}`}>
                                        <SkillTreeButton plugin={plugin} />
                                    </div>
                                    {/* Inventory Card */}
                                    <div className={`${cardStyles.inventoryCard} ${mobileClasses.card}`}>
                                        <InventoryButton plugin={plugin} />
                                    </div>
                                </div>
                                                                                                 {/* Energy HUD */}
                                <div className={`${cardStyles.energyCard} ${mobileClasses.card}`}>
                                    <EnergyHUD />
                                </div>
                                
                                {/* Active Buffs */}
                                <ActiveBuffsCard />
                                
                                {/* Penalty Status */}
                                <PenaltyStatusCard />
                                
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
                                {selectedTab === "quests" && (<QuestTab plugin={plugin} />)}
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

                        <ErrorBoundary componentName="Stats Tab">
                            <Suspense fallback={<TabLoadingState tabName="Stats" />}>
                                {selectedTab === "stats" && (<StatsTabView plugin={plugin} />)}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Achievements Tab">
                            <Suspense fallback={<TabLoadingState tabName="Achievements" />}>
                                {selectedTab === "achievements" && (<AchievementsTab tracker={achievementTracker} onRefresh={reloadPlayerData} />)}
                            </Suspense>
                        </ErrorBoundary>

                        <ErrorBoundary componentName="Pomodoro Tab">
                            <Suspense fallback={<TabLoadingState tabName="Pomodoro" />}>
                                {selectedTab === "pomodoro" && (<PomodoroTab plugin={plugin} playerData={playerData} reloadPlayerData={reloadPlayerData} />)}
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
        </div>
    );
};

export default PlayerTabView;