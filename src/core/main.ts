import "../shared/styles/gamified-notices.css";
import "../shared/styles/system-hunter-shell.css";
import "../shared/styles/tab-system-shell.css";
import "../shared/styles/shop-system-hunter.css";
import "../shared/styles/pixel-enclave.css";
import { Plugin, App, PluginSettingTab, Setting, FuzzySuggestModal } from "obsidian";
import {
	listAllDataBackups,
	restoreDataBackup,
	type DataBackupEntry,
} from "../shared/utils/vaultDataBackup";
import React from 'react';
import { PlayerTab, PLAYER_TAB_VIEW_TYPE } from "../views/tabs/player/PlayerTab";
import { StatsTab, STATS_TAB_VIEW_TYPE } from "../views/tabs/stats/StatsTab";
// import { Player } from "../data/models/PlayerData"; // Using PlayerStore instead
import {
	BALANCED_GAMEPLAY_MODULES,
	GamificationPluginSettings,
	DEFAULT_SETTINGS,
	type GamificationModules,
} from "./settings";
import { Buff } from "../data/models/PlayerData";
import { TaskTabView, GAMIFIED_TASK_TAB_VIEW_TYPE } from '../views/tabs/quests/TaskTabView';
import { SidebarQuestBoardView, SIDEBAR_QUEST_VIEW_TYPE } from '../views/sidebar/SidebarQuestView';
import { SidebarBossView, SIDEBAR_BOSS_VIEW_TYPE } from '../views/sidebar/SidebarBossView';
import { BossView, BOSS_VIEW_TYPE } from '../views/tabs/boss/BossView';
import { playerStore } from '../shared/state/playerStore';
import { rewardService } from '../shared/services/rewardService';
import { buffService } from '../shared/services/buffService';
import { runtimeConfig, updateConfig } from '../shared/state/config';
import { currencyDisplay } from '../shared/services/currencyDisplayService';
import { GamifiedTaskScanner } from '../features/quests/services/gamifiedTaskScanner';
import { QuestCompletionTracker } from '../features/quests/services/questCompletionTracker';
import { ShopIntegration, setShopIntegration } from '../features/shop/utils/shopIntegration';
import { isDialogueCorrupted } from '../features/shop/utils/shopkeeperDialogueDefaults';
import { TaskIntegrationService } from '../features/quests/utils/taskIntegrationService';
import { QuestSystemIntegration } from '../features/quests/questSystemIntegration';
import { EnhancedQuestSystem } from '../features/quests/components/EnhancedQuestSystem';
import { PerformanceOptimizer } from '../shared/utils/performanceOptimizer';
import { showGameNotice, pixelNotice } from '../shared/utils/noticeUtils';
import { EnergyResetService } from '../features/energy/services/energyResetService';
import { EnergyNotificationService } from '../features/energy/services/energyNotificationService';
import { getFirstLeafOfTypeInMainWorkspace, isLeafInVaultMainWorkspace } from '../shared/utils/workspaceLeafUtils';
import { setNotificationLevel } from '../shared/utils/noticeUtils';
import { emitSettingsUpdated } from '../shared/utils/settingsEvents';
import {
	applyVisualTheme,
	migrateVisualThemeSettings,
} from '../shared/utils/visualThemeManager';

export const TASK_VIEW_TYPE = "gamified-task-view";

export default class GamifiedObsidianPlugin extends Plugin {
	// player: Player; // Removed - using playerStore instead
	sidebarView?: {
		rebuildShopTab?: () => Promise<void>;
	};
	settings: GamificationPluginSettings = DEFAULT_SETTINGS;
	private levelCheckInterval: NodeJS.Timeout | null = null;
	private lastPlayerLevel: number = 0;
	private taskScanner?: GamifiedTaskScanner;
	private completionTracker?: QuestCompletionTracker;
	private shopIntegration?: ShopIntegration;
	private taskIntegrationService?: TaskIntegrationService;
	public questSystem: QuestSystemIntegration | null = null;
	public enhancedQuestSystem?: EnhancedQuestSystem;
	private performanceOptimizer?: PerformanceOptimizer;
	private energyResetService?: EnergyResetService;
	private energyNotificationService?: EnergyNotificationService;
	private lastSavedModules: GamificationModules = { ...BALANCED_GAMEPLAY_MODULES };
	private playerRibbonEl?: HTMLElement;

	// Mobile detection and optimization methods
	private detectMobileDevice(): boolean {
		if (typeof window === 'undefined') return false;

		const userAgent = navigator.userAgent.toLowerCase();
		const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
		const isSmallScreen = window.innerWidth <= 768;
		const isCoarsePointer = typeof window.matchMedia === 'function'
			&& window.matchMedia('(pointer: coarse)').matches;

		return isMobileDevice || isSmallScreen || isCoarsePointer;
	}

	private initializeMobileOptimizations(): void {

		// Don't add mobile class to body - only to our plugin containers
		// This prevents interfering with Obsidian's native mobile UI

		// Disable complex animations on mobile for better performance
		const style = document.createElement('style');
		style.id = 'gamification-mobile-optimizations';
		style.textContent = `
			/* Only apply optimizations within our plugin containers */
			.gamification-mobile .gamification-container * {
				animation-duration: 0.1s !important;
				transition-duration: 0.1s !important;
			}
			
			/* Plugin-specific modal optimizations */
			.gamification-mobile .modal.mod-gamification {
				max-width: 95vw !important;
				max-height: 95vh !important;
			}
			
			.gamification-mobile .modal.mod-gamification .modal-content {
				padding: 1rem !important;
			}
			
			/* Plugin button optimizations */
			.gamification-mobile .gamification-container button {
				min-height: 44px !important;
				min-width: 44px !important;
			}
			
			.gamification-mobile .gamification-container input, 
			.gamification-mobile .gamification-container textarea, 
			.gamification-mobile .gamification-container select {
				min-height: 44px !important;
				font-size: 16px !important;
			}
			
			/* Force mobile layout for player cards within our plugin */
			.gamification-mobile .gamification-container .cardRow {
				flex-direction: column !important;
				gap: 12px !important;
			}
			
			.gamification-mobile .gamification-container .levelCard,
			.gamification-mobile .gamification-container .expCard,
			.gamification-mobile .gamification-container .coinsCard {
				width: 100% !important;
			}
			
			.gamification-mobile .gamification-container .avatarImg {
				max-width: 250px !important;
			}
			
			.gamification-mobile .gamification-container .playerName {
				font-size: 1.1em !important;
			}
			
			.gamification-mobile .gamification-container .playerClass {
				font-size: 0.9em !important;
			}
			
			.gamification-mobile .gamification-container .playerDesc {
				font-size: 0.85em !important;
				line-height: 1.3 !important;
			}
			
			/* Only adjust padding within our plugin */
			.gamification-mobile .gamification-container,
			[data-gamification-mobile="true"].gamification-container {
				padding: 4px !important;
				width: 100% !important;
				max-width: none !important;
				box-sizing: border-box !important;
			}

			.gamification-mobile .gamification-player-grid,
			[data-gamification-mobile="true"] .gamification-player-grid {
				width: 100% !important;
				max-width: none !important;
				padding: 2px !important;
				box-sizing: border-box !important;
			}

			.gamification-mobile .gamification-energy-hud [class*="statRow"],
			[data-gamification-mobile="true"] .gamification-energy-hud [class*="statRow"] {
				flex-direction: column !important;
				align-items: stretch !important;
				gap: 6px !important;
			}

			.gamification-mobile .gamification-energy-hud [class*="statBar"],
			[data-gamification-mobile="true"] .gamification-energy-hud [class*="statBar"] {
				width: 100% !important;
				min-width: 0 !important;
			}

			.gamification-mobile .gamification-energy-hud [class*="quickActions"],
			[data-gamification-mobile="true"] .gamification-energy-hud [class*="quickActions"] {
				display: none !important;
			}
		`;
		document.head.appendChild(style);
	}

	private cleanupMobileOptimizations(): void {
		// Remove mobile-specific CSS classes from plugin containers only

		// Remove mobile optimization styles
		const mobileStyle = document.getElementById('gamification-mobile-optimizations');
		if (mobileStyle) {
			mobileStyle.remove();
		}

		const performanceStyle = document.getElementById('gamification-mobile-performance');
		if (performanceStyle) {
			performanceStyle.remove();
		}

	}

	private removePlayerRibbon(): void {
		this.playerRibbonEl?.remove();
		this.playerRibbonEl = undefined;
		// Fallback: strip stale ribbon nodes if onunload ran after a crash
		document.querySelectorAll('.side-dock-ribbon-action[aria-label="Open Player"]').forEach((el) => {
			el.remove();
		});
	}

	private setupMobileErrorHandling(): void {
		// Add mobile-specific error handling
		window.addEventListener('error', (event) => {
			// Show user-friendly error message on mobile
			if (event.error && event.error.message) {
				const errorMessage = event.error.message.toLowerCase();
				if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
					this.enableMobilePerformanceMode();
				}
			}
		});

		// Handle unhandled promise rejections
		window.addEventListener('unhandledrejection', () => {
			// Mobile-specific rejection handling
		});
	}

	private enableMobilePerformanceMode(): void {
		// Enable aggressive performance optimizations for mobile
		const performanceStyle = document.createElement('style');
		performanceStyle.id = 'gamification-mobile-performance';
		performanceStyle.textContent = `
			.gamification-mobile * {
				animation: none !important;
				transition: none !important;
				transform: none !important;
			}
			
			.gamification-mobile .modal {
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				width: 100vw !important;
				height: 100vh !important;
				max-width: none !important;
				max-height: none !important;
			}
		`;
		document.head.appendChild(performanceStyle);
	}

	private applyMobileOptimizationsAfterLoad(): void {
		// Wait a bit for the DOM to be fully rendered
		setTimeout(() => {
			// Only apply mobile class to our plugin containers, not Obsidian's UI
			const pluginContainers = [
				'.gamification-container',
				'.tab-content',
				'[data-gamification-plugin]'
			];

			pluginContainers.forEach(selector => {
				const elements = document.querySelectorAll(selector);
				elements.forEach(element => {
					element.classList.add('gamification-mobile');
				});
			});

			// Find our plugin's view content and apply mobile class
			const pluginViews = document.querySelectorAll('.workspace-leaf-content[data-type="gamified-player-tab"]');
			pluginViews.forEach(view => {
				view.classList.add('gamification-mobile');
			});
		}, 100);
	}

	async onload() {
		try {
			// Mobile detection and optimization
			const isMobile = this.detectMobileDevice();
			if (isMobile) {
				this.initializeMobileOptimizations();
				// Add mobile-specific error handling
				this.setupMobileErrorHandling();
			}
		} catch (error) {
			// Failed to initialize mobile optimizations - continue without mobile features
		}

        // Initialize Performance Optimizer (desktop only — timers add mobile WebView pressure)
        const isMobileLoad = this.detectMobileDevice();
        if (!isMobileLoad) {
            this.performanceOptimizer = PerformanceOptimizer.getInstance(this.app);
            this.performanceOptimizer.initialize().catch(() => {
                // Performance optimizer is optional; continue without it if initialization fails
            });
        }

		// Defer heavy initialization so Obsidian stays responsive while the plugin
		// finishes loading. This runs in the background without blocking onload.
		this.initializeServicesInBackground().catch(() => {
			// Service initialization is best-effort; the plugin should remain usable
			// even if some background services fail to start.
		});

		this.registerView(PLAYER_TAB_VIEW_TYPE, (leaf) => new PlayerTab(leaf, this));
		this.registerView(STATS_TAB_VIEW_TYPE, (leaf) => new StatsTab(leaf, this));
		this.registerView(BOSS_VIEW_TYPE, (leaf) => new BossView(leaf, this));

		// Defer opening heavy React views until the user explicitly opens them.
		// We still apply mobile optimizations once the workspace layout is ready.
		this.app.workspace.onLayoutReady(async () => {
			if (this.detectMobileDevice()) {
				this.applyMobileOptimizationsAfterLoad();
			}
		});

		this.removePlayerRibbon();
		this.playerRibbonEl = this.addRibbonIcon("dice", "Open Player", () => {
			this.app.workspace.onLayoutReady(async () => {
				this.activatePlayerTabView();
			});
		});

		this.addCommand({
			id: 'open-player-tab',
			name: 'Open Player tab',
			icon: 'dice',
			callback: () => {
				void this.activatePlayerTabView();
			},
		});

		// Add settings tab
		this.addSettingTab(new GamificationSettingTab(this.app, this));

		this.registerView(
			GAMIFIED_TASK_TAB_VIEW_TYPE,
			(leaf) => new TaskTabView(leaf, this)
		);
		this.addCommand({
			id: 'open-gamified-task-tab',
			name: 'Open Gamified Task Tab',
			callback: () => {
				this.app.workspace.onLayoutReady(async () => {
					const leaf = this.app.workspace.getLeaf('tab');
					await leaf.setViewState({
						type: GAMIFIED_TASK_TAB_VIEW_TYPE,
						active: true,
					});
					this.app.workspace.revealLeaf(leaf);
				});
			},
		});

		this.addCommand({
			id: 'quick-capture-idea',
			name: 'Brain dump idea',
			callback: () => {
				void import('../features/quests/modals/QuickCaptureModal').then(({ openQuickCaptureModal }) => {
					openQuickCaptureModal(this.app, this.settings);
				});
			},
		});

		// Boss Battle View Command
		this.addCommand({
			id: 'open-boss-battle-view',
			name: 'Open Boss Battle Arena',
			callback: () => {
				this.app.workspace.onLayoutReady(async () => {
					const { isBossBattlesEnabled } = await import('../shared/utils/gameplayConfig');
					if (!isBossBattlesEnabled(this.settings)) {
						const { pixelNotice } = await import('../shared/utils/noticeUtils');
						pixelNotice('Boss battles are disabled. Enable them in Settings → Feature Modules.', 5000);
						return;
					}
					this.activateBossView();
				});
			},
		});

		// Forge a file-backed boss (Bosses/ folder)
		this.addCommand({
			id: 'create-boss',
			name: 'Forge a boss',
			callback: () => {
				void this.openCreateBossModal();
			},
		});

		// Register Sidebar Quest Board View
		if (this.settings.enableSidebarQuestBoard) {
			this.registerView(
				SIDEBAR_QUEST_VIEW_TYPE,
				(leaf) => new SidebarQuestBoardView(leaf, this)
			);

			this.addCommand({
				id: 'open-sidebar-quest-board',
				name: 'Open Sidebar Quest Board',
				callback: () => {
					this.app.workspace.onLayoutReady(async () => {
						const leaf = this.app.workspace.getRightLeaf(false);
						if (leaf) {
							leaf.setViewState({
								type: SIDEBAR_QUEST_VIEW_TYPE,
								active: true,
							});
						}
					});
				},
			});
		}

		this.addCommand({
			id: 'expand-mission-board',
			name: 'Expand Mission Board',
			callback: () => {
				void this.openMissionBoardExpanded();
			},
		});

		// Register Sidebar Boss View
		this.registerView(
			SIDEBAR_BOSS_VIEW_TYPE,
			(leaf) => new SidebarBossView(leaf, this)
		);

		this.addCommand({
			id: 'open-sidebar-boss-view',
			name: 'Open Sidebar Boss Analytics',
			callback: () => {
				this.app.workspace.onLayoutReady(async () => {
					const leaf = this.app.workspace.getRightLeaf(false);
					if (leaf) {
						leaf.setViewState({
							type: SIDEBAR_BOSS_VIEW_TYPE,
							active: true,
						});
					}
				});
			},
		});

		// Add command to manually check and fix player level
		this.addCommand({
			id: 'check-player-level',
			name: 'Check and Fix Player Level',
			callback: async () => {
				try {
					const result = await playerStore.checkLevelAndRefresh();
					if (result?.leveledUp) {
						showGameNotice(`🎉 Level up! You are now level ${result.level}!`, 3000);
					} else {
						showGameNotice(`✅ Level check complete. Current level: ${result?.level || 'Unknown'}`, 3000);
					}
				} catch (error) {
					showGameNotice('❌ Level check failed', 3000);
				}
			},
		});

		this.addCommand({
			id: 'restore-data-backup',
			name: 'Restore data from backup (PlayerData / Inventory / Recipes / Materials)',
			callback: async () => {
				try {
					const backups = await listAllDataBackups(this.app.vault);
					if (backups.length === 0) {
						showGameNotice('No data backups found yet — backups are created automatically before writes.', 4000);
						return;
					}
					new RestoreBackupModal(this.app, backups, async (entry) => {
						try {
							await restoreDataBackup(this.app.vault, entry);
							showGameNotice(`✅ Restored ${entry.sourcePath} from backup`, 4000);
						} catch (err) {
							console.error('Restore from backup failed:', err);
							showGameNotice('❌ Restore failed — see console for details', 4000);
						}
					}).open();
				} catch (err) {
					console.error('Could not list backups:', err);
					showGameNotice('❌ Could not list backups', 3000);
				}
			},
		});

	}

	async loadSettings() {
		const loaded = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		this.settings.modules = {
			...BALANCED_GAMEPLAY_MODULES,
			...(loaded?.modules ?? {}),
		};

		// Visual theme: existing installs without visualTheme keep Classic (current look)
		this.settings.visualTheme = migrateVisualThemeSettings(loaded);

		// Existing installs skip first-run onboarding (Phase 3)
		if (loaded && loaded.gameplayOnboardingComplete === undefined) {
			this.settings.gameplayOnboardingComplete = true;
		}

		// Preserve full 5-stat HUD for existing users until they choose a mode
		if (loaded && loaded.energyHudMode === undefined) {
			this.settings.energyHudMode = 'full';
		}

		this.lastSavedModules = { ...this.settings.modules };

		// Migration: clear corrupted shopkeeper dialogue overrides (runs at plugin load)
		if (isDialogueCorrupted(this.settings.shopkeeperDialogueOverrides)) {
			this.settings.shopkeeperDialogueOverrides = {};
			await this.saveData(this.settings);
		}

		// Initialize currency display service with current settings
		currencyDisplay.initialize(this.settings);
		setNotificationLevel(this.settings.notificationLevel ?? 'normal');
		applyVisualTheme(this.settings);
	}

	async saveSettings() {
		const previousModules: GamificationModules = { ...this.lastSavedModules };
		const nextModules: GamificationModules = {
			...BALANCED_GAMEPLAY_MODULES,
			...(this.settings.modules ?? {}),
		};

		await this.saveData(this.settings);

		// Update currency display service with new settings
		currencyDisplay.updateSettings(this.settings);

		// Sync settings with runtime config
		this.syncSettingsToRuntimeConfig();

		await this.applyModuleRuntimeChanges(previousModules, nextModules);
		this.lastSavedModules = { ...nextModules };

		setNotificationLevel(this.settings.notificationLevel ?? 'normal');
		applyVisualTheme(this.settings);
		emitSettingsUpdated();
		void this.completionTracker?.refreshWatchList();
	}

	private async applyModuleRuntimeChanges(
		previous: GamificationModules,
		next: GamificationModules
	): Promise<void> {
		if (next.enableShopTab === true && previous.enableShopTab !== true) {
			if (!this.shopIntegration) {
				this.shopIntegration = new ShopIntegration(this);
				setShopIntegration(this.shopIntegration);
			}
			if (!this.shopIntegration.isInitialized()) {
				await this.shopIntegration.initialize().catch(() => {
					// Shop integration is optional
				});
			}
		}

		if (next.enableEnergySystem === true && previous.enableEnergySystem !== true) {
			if (!this.energyResetService) {
				this.energyResetService = EnergyResetService.getInstance(this.app);
				await this.energyResetService.initialize().catch(() => {
					// Energy reset service is optional
				});
			}

			if (!this.energyNotificationService) {
				this.energyNotificationService = EnergyNotificationService.getInstance();
				await this.energyNotificationService.initialize().catch(() => {
					// Notification service is optional
				});
			}
		}
	}

	private syncSettingsToRuntimeConfig() {

		updateConfig({
			enableEnergyHUD: this.settings.enableEnergyHUD ?? true,
			dailyResetHour: this.settings.dailyResetHour ?? 6,
			dailyRestore: {
				energy: this.settings.dailyRestoreEnergy ?? 30,
				focus: this.settings.dailyRestoreFocus ?? 20,
				motivation: this.settings.dailyRestoreMotivation ?? 25,
				calm: this.settings.dailyRestoreCalm ?? 15,
				stressReduce: this.settings.dailyRestoreStressReduce ?? 10,
			},
			questEnergyCostByDifficulty: {
				easy: {
					mental: this.settings.questCostEasyMental ?? 5,
					physical: this.settings.questCostEasyPhysical ?? 2,
					emotional: this.settings.questCostEasyEmotional ?? 2,
				},
				medium: {
					mental: this.settings.questCostMediumMental ?? 10,
					physical: this.settings.questCostMediumPhysical ?? 5,
					emotional: this.settings.questCostMediumEmotional ?? 5,
				},
				hard: {
					mental: this.settings.questCostHardMental ?? 15,
					physical: this.settings.questCostHardPhysical ?? 10,
					emotional: this.settings.questCostHardEmotional ?? 8,
				},
			},
			pomodoroCostPerMinute: {
				mental: this.settings.pomoCostPerMinMental ?? 3,
				physical: this.settings.pomoCostPerMinPhysical ?? 1,
				emotional: this.settings.pomoCostPerMinEmotional ?? 0.5,
			},
			breakRecovery: {
				rest: { energy: this.settings.breakRestEnergy ?? 20, focus: this.settings.breakRestFocus ?? 15, motivation: this.settings.breakRestMotivation ?? 10 },
				walk: { energy: this.settings.breakWalkEnergy ?? 25, focus: this.settings.breakWalkFocus ?? 20, motivation: this.settings.breakWalkMotivation ?? 15 },
				meditation: { energy: this.settings.breakMeditationEnergy ?? 10, focus: this.settings.breakMeditationFocus ?? 30, motivation: this.settings.breakMeditationMotivation ?? 20 },
				yoga: { energy: this.settings.breakYogaEnergy ?? 30, focus: this.settings.breakYogaFocus ?? 25, motivation: this.settings.breakYogaMotivation ?? 25 },
			},
		});

		// Update player store configuration
		playerStore.configure({
			resetHour: this.settings.dailyResetHour ?? 6,
			dailyRestore: {
				energy: this.settings.dailyRestoreEnergy ?? 30,
				focus: this.settings.dailyRestoreFocus ?? 20,
				motivation: this.settings.dailyRestoreMotivation ?? 25,
				calm: this.settings.dailyRestoreCalm ?? 15,
				stressReduce: this.settings.dailyRestoreStressReduce ?? 10,
			}
		});

	}

	async activateView() {
		await this.app.workspace.onLayoutReady(async () => {
			const { workspace } = this.app;
			const leaf = workspace.getLeavesOfType(TASK_VIEW_TYPE)[0];
			if (!leaf) {
				const newLeaf = workspace.getRightLeaf(false);
				if (!newLeaf) return;
				await newLeaf.setViewState({
					type: TASK_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(newLeaf);
				return;
			}
			workspace.revealLeaf(leaf);
		});
	}

	/** Focus or create the Player view in the main editor tab stack (not sidebar). */
	async focusPlayerInMainWorkspace(): Promise<void> {
		const { workspace } = this.app;
		let leaf = getFirstLeafOfTypeInMainWorkspace(workspace, PLAYER_TAB_VIEW_TYPE);
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({
				type: PLAYER_TAB_VIEW_TYPE,
				active: true,
			});
		}
		await workspace.revealLeaf(leaf);
		workspace.setActiveLeaf(leaf, { focus: true });
	}

	/** Boss-only leaf in the main editor stack (or pop-out): BossBattleUI without Player tab ribbon. */
	async focusBossViewInMainWorkspace(): Promise<void> {
		const { workspace } = this.app;
		const activeLeaf = workspace.activeLeaf;
		// If Player is focused in the main area, replace that tab with Boss (no ribbon, no extra tab).
		if (
			activeLeaf &&
			isLeafInVaultMainWorkspace(activeLeaf, workspace) &&
			activeLeaf.getViewState().type === PLAYER_TAB_VIEW_TYPE
		) {
			await activeLeaf.setViewState({
				type: BOSS_VIEW_TYPE,
				active: true,
			});
			await workspace.revealLeaf(activeLeaf);
			workspace.setActiveLeaf(activeLeaf, { focus: true });
			return;
		}
		let leaf = getFirstLeafOfTypeInMainWorkspace(workspace, BOSS_VIEW_TYPE);
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
		}
		await leaf.setViewState({
			type: BOSS_VIEW_TYPE,
			active: true,
		});
		await workspace.revealLeaf(leaf);
		workspace.setActiveLeaf(leaf, { focus: true });
	}

	async activatePlayerTabView() {
		await this.app.workspace.onLayoutReady(async () => {
			const { workspace } = this.app;
			const leaf = workspace.getLeavesOfType(PLAYER_TAB_VIEW_TYPE)[0];
			if (!leaf) {
				const newLeaf = workspace.getLeaf('tab');
				await newLeaf.setViewState({
					type: PLAYER_TAB_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(newLeaf);
				return;
			}
			workspace.revealLeaf(leaf);
		});
	}

	openPluginSettings(): void {
		const setting = (this.app as App & {
			setting?: { open: () => void; openTabById: (id: string) => void };
		}).setting;
		if (!setting) return;
		setting.open();
		setting.openTabById(this.manifest.id);
	}

	async activateStatsTabView() {
		await this.app.workspace.onLayoutReady(async () => {
			const { workspace } = this.app;
			const leaf = workspace.getLeavesOfType(STATS_TAB_VIEW_TYPE)[0];
			if (!leaf) {
				const newLeaf = workspace.getRightLeaf(false);
				if (!newLeaf) return;
				await newLeaf.setViewState({
					type: STATS_TAB_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(newLeaf);
				return;
			}
			workspace.revealLeaf(leaf);
		});
	}

	/** Opens the dedicated Boss Battle view (no Player tab ribbon) in the main workspace. */
	async activateBossView(): Promise<void> {
		await this.app.workspace.onLayoutReady(async () => {
			await this.focusBossViewInMainWorkspace();
		});
	}

	/** Opens the modal for forging a new file-backed boss (Bosses/ folder). */
	async openCreateBossModal(onSubmit?: () => void): Promise<void> {
		const { CreateBossModal } = await import('../features/quests/modals/CreateBossModal');
		new CreateBossModal(this.app, this, onSubmit ?? (() => {})).open();
	}

	/** Edit an existing file-backed boss note. */
	async openEditBossModal(
		bossOrPath: import('../features/quests/utils/bossFile').BossFileData | string,
		onSubmit?: () => void
	): Promise<void> {
		const { CreateBossModal } = await import('../features/quests/modals/CreateBossModal');
		const { readBoss } = await import('../features/quests/utils/bossFile');
		const editBoss =
			typeof bossOrPath === 'string'
				? (await readBoss(this.app, bossOrPath)) ?? undefined
				: bossOrPath;
		if (!editBoss) {
			const { pixelNotice } = await import('../shared/utils/noticeUtils');
			pixelNotice('Boss note not found.');
			return;
		}
		new CreateBossModal(this.app, this, onSubmit ?? (() => {}), editBoss).open();
	}

	/** Boss-raid launch intent consumed by BossBattleUI on mount. */
	pendingBossRaid: { path: string; lockDungeon: boolean } | null = null;

	/** Debug: open boss workspace straight to the victory screen for a boss note. */
	pendingBossVictoryPreview: { path: string } | null = null;

	/** Open the full-page boss workspace and fight the given boss note file. */
	async openBossRaid(
		bossPath: string,
		opts?: { lockDungeon?: boolean; resumeClaim?: boolean }
	): Promise<void> {
		const detail = {
			path: bossPath,
			lockDungeon: opts?.lockDungeon ?? false,
			resumeClaim: opts?.resumeClaim ?? false,
		};
		try {
			const { startBossFileRaid } = await import('../features/quests/utils/bossRaidService');
			await startBossFileRaid(this.app, bossPath, detail.lockDungeon, {
				resumeClaim: detail.resumeClaim,
			});
		} catch (error) {
			const { BossKeyRequiredError } = await import('../features/quests/utils/bossRaidService');
			if (error instanceof BossKeyRequiredError) {
				pixelNotice('🔑 A Boss Key is required. Win a dungeon raid on your Journey to earn one.', 4500);
				return;
			}
			console.error('[openBossRaid] Failed to start boss raid', error);
		}
		this.pendingBossRaid = { path: detail.path, lockDungeon: detail.lockDungeon };
		this.pendingBossVictoryPreview = null;
		await this.activateBossView();
		try {
			window.dispatchEvent(new CustomEvent('openBossRaid', { detail }));
		} catch {
			/* ignore dispatch errors outside the browser runtime */
		}
	}

	/** Open the boss workspace showing the full victory screen (debug / design preview). */
	async openBossVictoryPreview(bossPath?: string): Promise<void> {
		let path = bossPath?.trim();
		if (!path) {
			const { listBosses } = await import('../features/quests/utils/bossFile');
			const bosses = await listBosses(this.app);
			path = bosses[0]?.filePath;
			if (!path) {
				const { pixelNotice } = await import('../shared/utils/noticeUtils');
				pixelNotice('Create a boss in Bosses/ first, or pass a boss note path.', 3500);
				return;
			}
		}
		const detail = { path };
		this.pendingBossVictoryPreview = detail;
		this.pendingBossRaid = null;
		await this.activateBossView();
		try {
			window.dispatchEvent(new CustomEvent('openBossVictoryPreview', { detail }));
		} catch {
			/* ignore dispatch errors outside the browser runtime */
		}
	}

	/** Open Quests Mission Board in a wide main tab (expanded day plan + inbox). */
	async openMissionBoardExpanded(): Promise<void> {
		const { QUEST_HUB_SECTION_KEY } = await import('../features/quests/utils/questProjectUtils');
		try {
			localStorage.setItem(QUEST_HUB_SECTION_KEY, 'tasks');
			localStorage.setItem('gamification-selected-tab', 'quests');
		} catch {
			/* ignore storage failures */
		}

		await this.app.workspace.onLayoutReady(async () => {
			const { workspace } = this.app;

			if (this.settings.enableSidebarQuestBoard) {
				const leaf = workspace.getLeaf('tab');
				await leaf.setViewState({
					type: SIDEBAR_QUEST_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(leaf);
				workspace.setActiveLeaf(leaf, { focus: true });
				try {
					window.dispatchEvent(
						new CustomEvent('gamification-quest-hub-focus', {
							detail: { section: 'tasks' },
						})
					);
				} catch {
					/* ignore */
				}
				return;
			}

			let leaf = workspace.getLeavesOfType(PLAYER_TAB_VIEW_TYPE)[0];
			if (!leaf) {
				leaf = workspace.getLeaf('tab');
				await leaf.setViewState({
					type: PLAYER_TAB_VIEW_TYPE,
					active: true,
				});
			}
			workspace.revealLeaf(leaf);
			workspace.setActiveLeaf(leaf, { focus: true });
			window.setTimeout(() => {
				try {
					window.dispatchEvent(
						new CustomEvent('requestActiveTabChange', {
							detail: { targetTab: 'quests' },
						})
					);
				} catch {
					/* ignore */
				}
			}, 80);
		});
	}

	/** Open the sidebar quest board on a hub section (e.g. Dungeon gate roster). */
	async focusQuestHubSection(
		section: import('../features/quests/utils/questProjectUtils').QuestHubSection = 'dungeon'
	): Promise<void> {
		const { QUEST_HUB_SECTION_KEY } = await import('../features/quests/utils/questProjectUtils');
		try {
			localStorage.setItem(QUEST_HUB_SECTION_KEY, section);
		} catch {
			/* ignore storage failures */
		}
		try {
			window.dispatchEvent(
				new CustomEvent('gamification-quest-hub-focus', { detail: { section } })
			);
		} catch {
			/* ignore dispatch errors outside the browser runtime */
		}
		if (!this.settings.enableSidebarQuestBoard) {
			const { pixelNotice } = await import('../shared/utils/noticeUtils');
			pixelNotice('Enable the sidebar quest board in plugin settings.', 4000);
			return;
		}
		this.app.workspace.onLayoutReady(async () => {
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: SIDEBAR_QUEST_VIEW_TYPE,
					active: true,
				});
			}
		});
	}

	onunload() {
		this.removePlayerRibbon();
		playerStore.resetForPluginUnload();

		// Clean up mobile optimizations
		this.cleanupMobileOptimizations();

		// Clean up Performance Optimizer first
		if (this.performanceOptimizer) {
			this.performanceOptimizer.cleanup();
		}

		// Clean up Energy Services
		if (this.energyResetService) {
			this.energyResetService.cleanup();
		}
		if (this.energyNotificationService) {
			this.energyNotificationService.cleanup();
		}

		// Clean up the periodic level check interval
		if (this.levelCheckInterval) {
			clearInterval(this.levelCheckInterval);
			this.levelCheckInterval = null;
		}

		// Stop quest tracking services
		if (this.taskScanner) {
			this.taskScanner.stopAutoScan();
		}
		if (this.completionTracker) {
			this.completionTracker.stopTracking();
		}

		// Cleanup shop integration
		if (this.shopIntegration) {
			this.shopIntegration.cleanup();
		}

		this.app.workspace.detachLeavesOfType(PLAYER_TAB_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(STATS_TAB_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(GAMIFIED_TASK_TAB_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(SIDEBAR_QUEST_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(BOSS_VIEW_TYPE);
		// this.app.workspace.detachLeavesOfType(DATACORE_TASK_VIEW_TYPE);

		if (this.enhancedQuestSystem) {
			this.enhancedQuestSystem.destroy();
			this.enhancedQuestSystem = undefined;
		}

		// Clean up advanced quest system
		if (this.questSystem) {
			// Cleanup any event listeners or timers
		}
	}

	// Player data saving is now handled by playerStore automatically

	private setupPeriodicLevelCheck() {
		// Clear any existing interval
		if (this.levelCheckInterval) {
			clearInterval(this.levelCheckInterval);
		}

		// Set up a new interval to check player level every 5 minutes
		this.levelCheckInterval = setInterval(async () => {
			await this.checkPlayerLevel();
		}, 5 * 60 * 1000); // 5 minutes in milliseconds
	}

	private async checkPlayerLevel() {
		try {
			// Use the player store's level check method
			const result = await playerStore.checkLevelAndRefresh();
			if (result && result.leveledUp) {
				// The player store will automatically notify UI components
			}
		} catch (error) {
			// Periodic level check failed - will retry on next interval
		}
	}

	private async initializeServicesInBackground() {
		try {
			// Load plugin settings
			await this.loadSettings();
			const isMobile = this.detectMobileDevice();

			// Player store initializes when the Player tab opens on mobile (avoids retry storms at plugin enable).
			if (!isMobile) {
				playerStore.setVault(this.app.vault);
			}

			// Initialize buff service
			buffService;

			// Initialize reward service
			rewardService;

			// Configuration is now handled by syncSettingsToRuntimeConfig()
			// Sync settings to runtime config on startup
			this.syncSettingsToRuntimeConfig();

			// Desktop-only background services are deliberately not started on mobile.
			// They scan files/DOM and add timers even when their views are closed, which
			// can exhaust an iOS WebView and terminate the whole Obsidian app.
			if (!isMobile) {
				this.setupPeriodicLevelCheck();

				import('../features/achievements/services/achievementEventService').catch(() => {
					// Achievement service loading is optional
				});

				this.taskScanner = new GamifiedTaskScanner(this.app);
				this.completionTracker = new QuestCompletionTracker(this.app);
				this.completionTracker.startTracking();

				const shopEnabled = this.settings.modules?.enableShopTab === true;
				this.shopIntegration = new ShopIntegration(this);
				setShopIntegration(this.shopIntegration);
				if (shopEnabled) {
					this.shopIntegration.initialize().catch(() => {
						// Shop integration is optional
					});
				}
			}

			// Task integration and energy timers are deferred on mobile until a view needs them.
			if (!isMobile) {
				this.taskIntegrationService = TaskIntegrationService.getInstance(
					this.app.vault,
					this.app.metadataCache
				);
			}

			// Initialize Energy Services when energy module is enabled
			const energyEnabled = this.settings.modules?.enableEnergySystem !== false;
			if (energyEnabled && !isMobile) {
				this.energyResetService = EnergyResetService.getInstance(this.app);
				this.energyResetService.initialize().catch(() => {
					// Energy reset service is optional; failures are logged internally
				});

				this.energyNotificationService = EnergyNotificationService.getInstance();
				this.energyNotificationService.initialize().catch(() => {
					// Notification service is optional; continue without if it fails
				});
			}

			if (!isMobile) {
				// Initialize Advanced Quest System in the background so it doesn't block plugin load
				QuestSystemIntegration.initializeQuestSystem(this.app)
					.then((questSystem) => {
						this.questSystem = questSystem;
					})
					.catch(() => {
						// Advanced quest system is optional; fall back to basic quest features
					});

				// Banner fallback is desktop-only. It observes only the plugin root.
				this.enhancedQuestSystem = new EnhancedQuestSystem(this);
				this.enhancedQuestSystem.initialize().catch((err) => {
					console.error('Enhanced Quest System init failed:', err);
				});

				// File migrations must not run during iCloud mobile startup.
				try {
					const { migrateHabitsToPerFile } = await import('../features/habits/utils/habitsUtils');
					await migrateHabitsToPerFile(this.app.vault);
				} catch (e) {
					// Habit migration is best-effort; failures are logged in the utility
				}
			}
		} catch (error) {
			// Failed to initialize new services - using defaults
		}
	}
}

class GamificationSettingTab extends PluginSettingTab {
	plugin: GamifiedObsidianPlugin;

	constructor(app: App, plugin: GamifiedObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Create a container for our React settings UI
		const settingsContainer = containerEl.createDiv();
		settingsContainer.id = 'gamification-settings-container';

		// Import and render our modern settings UI
		import('../features/settings/components/SettingsUI').then(({ SettingsUI }) => {
			// Create React root and render the settings UI
			import('react-dom/client').then(({ createRoot }) => {
				const root = createRoot(settingsContainer);

				root.render(
					React.createElement(SettingsUI, {
						settings: this.plugin.settings,
						onSettingsChange: (newSettings: GamificationPluginSettings) => {
							this.plugin.settings = newSettings;
						},
						onSave: async () => {
							await this.plugin.saveSettings();
							// @ts-ignore
							pixelNotice('Settings saved successfully!');
						},
						app: this.app,
						plugin: this.plugin,
					})
				);
			});
		}).catch(() => {
			// Fallback to old settings UI
			this.displayLegacySettings(containerEl);
		});
	}

	displayLegacySettings(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: "Gamification Plugin Settings (Legacy Mode)" });

		new Setting(containerEl)
			.setName("XP per completed task")
			.setDesc("How much XP to award for each completed task.")
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(this.plugin.settings.xpPerTask.toString())
					.onChange(async (value) => {
						this.plugin.settings.xpPerTask = Number(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(`${currencyDisplay.getCurrencyLabel(true)} per completed task`)
			.setDesc(`How many ${currencyDisplay.getCurrencyLabel(true).toLowerCase()} to award for each completed task.`)
			.addText((text) =>
				text
					.setPlaceholder("5")
					.setValue(this.plugin.settings.coinPerTask.toString())
					.onChange(async (value) => {
						this.plugin.settings.coinPerTask = Number(value);
						await this.plugin.saveSettings();
					})
			);

		// Currency settings
		new Setting(containerEl)
			.setName("Currency name")
			.setDesc("Label to display for your currency across the UI (e.g., Coins, Gold, Credits)")
			.addText((text) =>
				text
					.setPlaceholder("Coins")
					.setValue(this.plugin.settings.currencyName || "Coins")
					.onChange(async (value) => {
						this.plugin.settings.currencyName = value || "Coins";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Currency symbol")
			.setDesc("Symbol or emoji shown next to currency values (e.g., 🪙, $, ¢)")
			.addText((text) =>
				text
					.setPlaceholder("🪙")
					.setValue(this.plugin.settings.currencySymbol || "🪙")
					.onChange(async (value) => {
						this.plugin.settings.currencySymbol = value || "🪙";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Leveling formula")
			.setDesc("Choose how XP required for each level is calculated.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("linear", "Linear")
					.addOption("exponential", "Exponential")
					.addOption("custom", "Custom")
					.setValue(this.plugin.settings.levelingFormula)
					.onChange(async (value) => {
						this.plugin.settings.levelingFormula = value;
						await this.plugin.saveSettings();
					})
			);

		// Quest Board Settings Section
		containerEl.createEl("h3", { text: "Quest Board Settings" });

		new Setting(containerEl)
			.setName("Enable Sidebar Quest Board")
			.setDesc("Show a compact quest board in the sidebar with drag & drop functionality.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableSidebarQuestBoard)
					.onChange(async (value) => {
						this.plugin.settings.enableSidebarQuestBoard = value;
						await this.plugin.saveSettings();
						// Reload plugin to register/unregister views
						// @ts-ignore
						pixelNotice("Restart Obsidian to apply quest board changes.");
					})
			);

		new Setting(containerEl)
			.setName("Quest Board Position")
			.setDesc("Choose which sidebar to show the quest board in.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("left", "Left Sidebar")
					.addOption("right", "Right Sidebar")
					.setValue(this.plugin.settings.questBoardPosition)
					.onChange(async (value) => {
						this.plugin.settings.questBoardPosition = value as 'left' | 'right';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-refresh Tasks")
			.setDesc("Automatically refresh quest board when task files are modified.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoRefreshTasks)
					.onChange(async (value) => {
						this.plugin.settings.autoRefreshTasks = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Hide Completed Quests")
			.setDesc("Hide completed quests by default in the quest board. You can still view them by changing the status filter.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideCompletedQuests)
					.onChange(async (value) => {
						this.plugin.settings.hideCompletedQuests = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Quest Refresh Interval")
			.setDesc("How often to automatically refresh quests (in seconds). Set to 0 to disable automatic refreshing.")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(this.plugin.settings.questRefreshInterval.toString())
					.onChange(async (value) => {
						const interval = parseInt(value) || 0;
						this.plugin.settings.questRefreshInterval = interval;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Skill Folder Path")
			.setDesc("Set the folder path for skill files. Example: SkillTree/Master-Class/Class/Skills")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class/Class/Skills")
					.setValue(this.plugin.settings.skillFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.skillFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Class Folder Path")
			.setDesc("Set the folder path for class files. Example: SkillTree/Master-Class/Class")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class/Class")
					.setValue(this.plugin.settings.classFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.classFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Master Class Folder Path")
			.setDesc("Set the folder path for master class files. Example: SkillTree/Master-Class")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class")
					.setValue(this.plugin.settings.masterClassFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.masterClassFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Stat Folder Path")
			.setDesc("Set the folder path for stat files. Example: SkillTree/Master-Class/Stats")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class/Stats")
					.setValue(this.plugin.settings.statFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.statFolder = value;
						await this.plugin.saveSettings();
					})
			);

		// Penalties & Pomodoro
		containerEl.createEl("h3", { text: "Penalties & Pomodoro" });

		new Setting(containerEl)
			.setName("Low priority failure penalty")
			.setDesc("Percentage of quest XP/coins added as debt when a low-priority quest fails (0.00 - 1.00)")
			.addText((text) =>
				text
					.setPlaceholder("0.10")
					.setValue(String(this.plugin.settings.penaltyLowPct))
					.onChange(async (value) => {
						const v = Math.max(0, Math.min(1, Number(value)));
						this.plugin.settings.penaltyLowPct = isFinite(v) ? v : 0.1;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Medium priority failure penalty")
			.setDesc("Percentage for medium-priority failures (0.00 - 1.00)")
			.addText((text) =>
				text
					.setPlaceholder("0.20")
					.setValue(String(this.plugin.settings.penaltyMediumPct))
					.onChange(async (value) => {
						const v = Math.max(0, Math.min(1, Number(value)));
						this.plugin.settings.penaltyMediumPct = isFinite(v) ? v : 0.2;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("High priority failure penalty")
			.setDesc("Percentage for high-priority failures (0.00 - 1.00)")
			.addText((text) =>
				text
					.setPlaceholder("0.30")
					.setValue(String(this.plugin.settings.penaltyHighPct))
					.onChange(async (value) => {
						const v = Math.max(0, Math.min(1, Number(value)));
						this.plugin.settings.penaltyHighPct = isFinite(v) ? v : 0.3;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Daily XP debt cap")
			.setDesc("Maximum XP that can be added to failure debt per day")
			.addText((text) =>
				text
					.setPlaceholder("500")
					.setValue(String(this.plugin.settings.dailyDebtCapXP))
					.onChange(async (value) => {
						const v = Math.max(0, Math.floor(Number(value)) || 0);
						this.plugin.settings.dailyDebtCapXP = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Daily coin debt cap")
			.setDesc("Maximum coins that can be added to debt per day")
			.addText((text) =>
				text
					.setPlaceholder("50")
					.setValue(String(this.plugin.settings.dailyDebtCapCoins))
					.onChange(async (value) => {
						const v = Math.max(0, Math.floor(Number(value)) || 0);
						this.plugin.settings.dailyDebtCapCoins = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pomodoro: fail only on Reset")
			.setDesc("When enabled, only Reset will fail an attached quest (Pause/Skip won’t)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.pomodoroFailOnlyOnReset)
					.onChange(async (value) => {
						this.plugin.settings.pomodoroFailOnlyOnReset = value;
						await this.plugin.saveSettings();
					})
			);

		// Energy & Focus System
		containerEl.createEl("h3", { text: "Energy & Focus" });

		new Setting(containerEl)
			.setName("Enable Energy HUD")
			.setDesc("Show the Energy/Focus HUD in the Player tab")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableEnergyHUD ?? true)
					.onChange(async (value) => {
						this.plugin.settings.enableEnergyHUD = value;
						updateConfig({ enableEnergyHUD: value });
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Daily reset hour")
			.setDesc("Hour of day to apply daily restore (0-23)")
			.addText((text) =>
				text
					.setPlaceholder("6")
					.setValue(String(this.plugin.settings.dailyResetHour ?? 6))
					.onChange(async (value) => {
						const v = Math.max(0, Math.min(23, Math.floor(Number(value) || 6)));
						this.plugin.settings.dailyResetHour = v;
						updateConfig({ dailyResetHour: v });
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h4", { text: "Daily restore amounts" });
		const dailyRestoreFields: Array<[string, keyof GamificationPluginSettings, keyof typeof runtimeConfig.dailyRestore]> = [
			["Energy", "dailyRestoreEnergy", "energy"],
			["Focus", "dailyRestoreFocus", "focus"],
			["Motivation", "dailyRestoreMotivation", "motivation"],
			["Calm", "dailyRestoreCalm", "calm"],
			["Stress reduce", "dailyRestoreStressReduce", "stressReduce"],
		];
		dailyRestoreFields.forEach(([label, settingKey, cfgKey]) => {
			new Setting(containerEl)
				.setName(label)
				.addText((text) =>
					text
						.setPlaceholder("0")
						.setValue(String(this.plugin.settings[settingKey] ?? (runtimeConfig.dailyRestore as unknown as Record<string, number>)[cfgKey]))
						.onChange(async (value) => {
							const v = Math.max(0, Math.floor(Number(value) || 0));
							(this.plugin.settings as unknown as Record<string, number>)[settingKey] = v;
							updateConfig({ dailyRestore: { ...runtimeConfig.dailyRestore, [cfgKey]: v } });
							await this.plugin.saveSettings();
						})
				);
		});

		containerEl.createEl("h4", { text: "Quest energy cost by difficulty" });
		const questCosts: Array<[string, keyof GamificationPluginSettings, keyof typeof runtimeConfig.questEnergyCostByDifficulty.easy]> = [
			["Mental", "questCostEasyMental", "mental"],
			["Physical", "questCostEasyPhysical", "physical"],
			["Emotional", "questCostEasyEmotional", "emotional"],
		];
		["easy", "medium", "hard"].forEach((diff) => {
			containerEl.createEl("h5", { text: String(diff).toUpperCase() });
			questCosts.forEach(([label, settingKeyBase, key]) => {
				const settingKey = (settingKeyBase as string).replace("Easy", (diff as string).charAt(0).toUpperCase() + (diff as string).slice(1)) as keyof GamificationPluginSettings;
				new Setting(containerEl)
					.setName(`${label}`)
					.addText((text) =>
						text
							.setPlaceholder("0")
							.setValue(String(this.plugin.settings[settingKey] ?? (runtimeConfig.questEnergyCostByDifficulty as unknown as Record<string, Record<string, number>>)[diff][key]))
							.onChange(async (value) => {
								const v = Math.max(0, Math.floor(Number(value) || 0));
								(this.plugin.settings as unknown as Record<string, number>)[settingKey] = v;
								const current = (runtimeConfig.questEnergyCostByDifficulty as unknown as Record<string, Record<string, number>>)[diff];
								updateConfig({ questEnergyCostByDifficulty: { ...runtimeConfig.questEnergyCostByDifficulty, [diff]: { ...current, [key]: v } } });
								await this.plugin.saveSettings();
							})
					);
			});
		});

		containerEl.createEl("h4", { text: "Pomodoro energy cost per minute" });
		const pomoFields: Array<[string, keyof GamificationPluginSettings, keyof typeof runtimeConfig.pomodoroCostPerMinute]> = [
			["Mental", "pomoCostPerMinMental", "mental"],
			["Physical", "pomoCostPerMinPhysical", "physical"],
			["Emotional", "pomoCostPerMinEmotional", "emotional"],
		];
		pomoFields.forEach(([label, settingKey, key]) => {
			new Setting(containerEl)
				.setName(label)
				.addText((text) =>
					text
						.setPlaceholder("0")
						.setValue(String(this.plugin.settings[settingKey] ?? (runtimeConfig.pomodoroCostPerMinute as unknown as Record<string, number>)[key]))
						.onChange(async (value) => {
							const v = Math.max(0, Number(value) || 0);
							(this.plugin.settings as unknown as Record<string, number>)[settingKey] = v;
							updateConfig({ pomodoroCostPerMinute: { ...runtimeConfig.pomodoroCostPerMinute, [key]: v } });
							await this.plugin.saveSettings();
						})
				);
		});

		containerEl.createEl("h4", { text: "Break recovery amounts" });
		const breakDefs: Array<[string, 'rest' | 'walk' | 'meditation' | 'yoga']> = [
			["Rest", "rest"],
			["Walk", "walk"],
			["Meditation", "meditation"],
			["Yoga", "yoga"],
		];
		breakDefs.forEach(([label, key]) => {
			containerEl.createEl("h5", { text: label });
			const fields: Array<[string, keyof GamificationPluginSettings, keyof typeof runtimeConfig.breakRecovery.rest]> = [
				["Energy", `break${label}Energy` as keyof GamificationPluginSettings, "energy"],
				["Focus", `break${label}Focus` as keyof GamificationPluginSettings, "focus"],
				["Motivation", `break${label}Motivation` as keyof GamificationPluginSettings, "motivation"],
			];
			fields.forEach(([fname, settingKey, prop]) => {
				new Setting(containerEl)
					.setName(fname)
					.addText((text) =>
						text
							.setPlaceholder("0")
							.setValue(String(this.plugin.settings[settingKey] ?? (runtimeConfig.breakRecovery as unknown as Record<string, Record<string, number>>)[key][prop]))
							.onChange(async (value) => {
								const v = Math.max(0, Math.floor(Number(value) || 0));
								(this.plugin.settings as unknown as Record<string, number>)[settingKey] = v;
								const current = (runtimeConfig.breakRecovery as unknown as Record<string, Record<string, number>>)[key];
								updateConfig({ breakRecovery: { ...runtimeConfig.breakRecovery, [key]: { ...current, [prop]: v } } });
								await this.plugin.saveSettings();
							})
					);
			});
		});

		// Shop System Settings
		containerEl.createEl("h3", { text: "🛒 Shop System" });

		new Setting(containerEl)
			.setName("Enable Seasonal Shop")
			.setDesc("Enable dynamic seasonal shop with rotating inventory and special events")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableSeasonalShop ?? true)
					.onChange(async (value) => {
						this.plugin.settings.enableSeasonalShop = value;
						await this.plugin.saveSettings();
						// @ts-ignore
						pixelNotice("Restart Obsidian to apply shop changes.");
					})
			);

		new Setting(containerEl)
			.setName("Shop Rotation Days")
			.setDesc("How often shop inventory rotates (in days)")
			.addText((text) =>
				text
					.setPlaceholder("7")
					.setValue(String(this.plugin.settings.shopRotationDays ?? 7))
					.onChange(async (value) => {
						const v = Math.max(1, Math.floor(Number(value) || 7));
						this.plugin.settings.shopRotationDays = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable Special Events")
			.setDesc("Enable special shop events like festivals and markets")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableSpecialEvents ?? true)
					.onChange(async (value) => {
						this.plugin.settings.enableSpecialEvents = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Dragon Festival Events")
			.setDesc("Enable Dragon Festival special events with discounted items")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.dragonFestivalEnabled ?? true)
					.onChange(async (value) => {
						this.plugin.settings.dragonFestivalEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Mystical Market Events")
			.setDesc("Enable Mystical Market special events with rare items")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.mysticalMarketEnabled ?? true)
					.onChange(async (value) => {
						this.plugin.settings.mysticalMarketEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Reset Only Skills")
			.setDesc("Reset all skill files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Skills")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all skills? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("../shared/utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.skillFolder, "skill");
						// @ts-ignore
						pixelNotice("All skills have been reset. Settings will remain open for your convenience.");
					})
			);

		new Setting(containerEl)
			.setName("Reset Only Classes")
			.setDesc("Reset all class files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Classes")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all classes? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("../shared/utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.classFolder, "class");
						// @ts-ignore
						pixelNotice("All classes have been reset. Settings will remain open for your convenience.");
					})
			);

		new Setting(containerEl)
			.setName("Reset Only Master Classes")
			.setDesc("Reset all master class files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Master Classes")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all master classes? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("../shared/utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.masterClassFolder, "master");
						// @ts-ignore
						pixelNotice("All master classes have been reset. Settings will remain open for your convenience.");
					})
			);

		new Setting(containerEl)
			.setName("Reset Only Stats")
			.setDesc("Reset all stat files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Stats")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all stats? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("../shared/utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.statFolder, "stat");
						// @ts-ignore
						pixelNotice("All stats have been reset. Settings will remain open for your convenience.");
					})
			);

		new Setting(containerEl)
			.setName("Reset Only Player Data")
			.setDesc(`Reset only the PlayerData.md file to level 1, xp 0, xpRequired 200, ${currencyDisplay.getCurrencyNameLowercase()} 0, and total_exp 0. This cannot be undone.`)
			.addButton((btn) =>
				btn.setButtonText("Reset Player Data")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset PlayerData.md? This cannot be undone.");
						if (!confirmed) return;
						const { readYamlFrontmatter, writeYamlFrontmatter } = await import("../shared/utils/progressUpdater");
						const playerPath = "SkillTree/PlayerData.md";
						const { frontmatter } = await readYamlFrontmatter(this.app.vault, playerPath);
						frontmatter.level = 1;
						frontmatter.xp = 0;
						frontmatter.xpRequired = 200;
						frontmatter.coins = 0;
						frontmatter.total_exp = 0;
						await writeYamlFrontmatter(this.app.vault, playerPath, frontmatter);
						// @ts-ignore
						pixelNotice("PlayerData.md has been reset. Settings will remain open for your convenience.");
					})
			);

		// Tree Reward System Settings
		containerEl.createEl("h3", { text: "🌳 Tree Reward System" });

		new Setting(containerEl)
			.setName("Enable Progressive Tree Rewards")
			.setDesc("Enable bonus XP/CP/Coins based on tree growth stage")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.treeRewardConfig.enableProgressiveRewards)
					.onChange(async (value) => {
						this.plugin.settings.treeRewardConfig.enableProgressiveRewards = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable Item Drops")
			.setDesc("Enable rare item drops when completing habits with growing trees")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.treeRewardConfig.enableItemDrops)
					.onChange(async (value) => {
						this.plugin.settings.treeRewardConfig.enableItemDrops = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Base Item Drop Chance")
			.setDesc("Base probability of getting an item drop (0.00 - 1.00)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.01)
					.setValue(this.plugin.settings.treeRewardConfig.itemDropChance)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.treeRewardConfig.itemDropChance = value;
						await this.plugin.saveSettings();
					})
			);

		// Tree Stage Reward Multipliers
		containerEl.createEl("h4", { text: "Tree Stage Reward Multipliers" });

		const treeStages = [
			{ stage: 0, name: "Seed (0 days)", default: 1.0 },
			{ stage: 1, name: "Sprout (1-3 days)", default: 1.05 },
			{ stage: 2, name: "Sapling (4-7 days)", default: 1.1 },
			{ stage: 3, name: "Young Tree (8-14 days)", default: 1.15 },
			{ stage: 4, name: "Mature Tree (15-21 days)", default: 1.2 },
			{ stage: 5, name: "World Tree (22+ days)", default: 1.25 }
		];

		treeStages.forEach(({ stage, name, default: defaultMultiplier }) => {
			const currentMultiplier = this.plugin.settings.treeRewardConfig.customRewards[stage]?.xpMultiplier || defaultMultiplier;

			new Setting(containerEl)
				.setName(`${name} - XP Multiplier`)
				.setDesc(`XP multiplier for ${name.toLowerCase()} stage`)
				.addSlider((slider) =>
					slider
						.setLimits(1.0, 2.0, 0.01)
						.setValue(currentMultiplier)
						.setDynamicTooltip()
						.onChange(async (value) => {
							if (!this.plugin.settings.treeRewardConfig.customRewards[stage]) {
								this.plugin.settings.treeRewardConfig.customRewards[stage] = {
									xpMultiplier: value,
									cpMultiplier: value,
									coinMultiplier: value
								};
							} else {
								this.plugin.settings.treeRewardConfig.customRewards[stage].xpMultiplier = value;
								this.plugin.settings.treeRewardConfig.customRewards[stage].cpMultiplier = value;
								this.plugin.settings.treeRewardConfig.customRewards[stage].coinMultiplier = value;
							}
							await this.plugin.saveSettings();
						})
				);
		});

		// Notification System Demo Section
		containerEl.createEl("h3", { text: "Notification System Demo" });

		const notificationDemoContainer = containerEl.createDiv();
		notificationDemoContainer.style.cssText = `
			background: #f8f9fa;
			border: 2px solid #e1e8ed;
			border-radius: 12px;
			padding: 20px;
			margin-bottom: 20px;
		`;

		// Demo description
		const demoDescription = notificationDemoContainer.createDiv();
		demoDescription.innerHTML = `
			<p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
				Test the global notification system that's available throughout the plugin. 
				Notifications will appear in the top-right corner of the main interface.
			</p>
		`;

		// Demo buttons container
		const demoButtonsContainer = notificationDemoContainer.createDiv();
		demoButtonsContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 10px;
		`;

		// Show all notification types button
		const showAllButton = demoButtonsContainer.createEl("button");
		showAllButton.textContent = "🔔 Show All Notification Types";
		showAllButton.style.cssText = `
			padding: 10px 20px;
			background: linear-gradient(135deg, #4CAF50, #45a049);
			color: white;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			transition: all 0.3s ease;
		`;
		showAllButton.addEventListener('click', () => {
			// Import and use the notification service
			import('../shared/services/notificationService').then(({ notify }) => {
				// Success
				notify.success("Success!", "Operation completed successfully", 4000);

				// Info
				setTimeout(() => {
					notify.info("Information", "Here's some useful information", 4000);
				}, 500);

				// Warning
				setTimeout(() => {
					notify.warning("Warning", "Please be careful with this action", 4000);
				}, 1000);

				// Error
				setTimeout(() => {
					notify.error("Error", "Something went wrong", 4000);
				}, 1500);

				// Achievement
				setTimeout(() => {
					notify.achievement("Achievement Unlocked!", "First Steps - Complete your first quest", 4000);
				}, 2000);

				// Quest
				setTimeout(() => {
					notify.quest("New Quest Available", "Daily Challenge: Complete 5 tasks", 4000);
				}, 2500);

				// Boss
				setTimeout(() => {
					notify.boss("Boss Defeated!", "You've defeated the Dragon Boss!", 4000);
				}, 3000);

				// Crafting
				setTimeout(() => {
					notify.crafting("Item Crafted!", "Successfully crafted Legendary Sword", 4000);
				}, 3500);

				// Shop
				setTimeout(() => {
					notify.shop("Purchase Complete", "Bought XP Booster for 100 coins", 4000);
				}, 4000);

				// Energy
				setTimeout(() => {
					notify.energy("Energy Restored", "Your energy has been fully restored", 4000);
				}, 4500);

				// Habit
				setTimeout(() => {
					notify.habit("Habit Streak!", "7-day streak maintained!", 4000);
				}, 5000);

				// Pomodoro
				setTimeout(() => {
					notify.pomodoro("Focus Session Complete", "Great work! Take a break.", 4000);
				}, 5500);
			});
		});

		// Test buff button
		const testBuffButton = demoButtonsContainer.createEl("button");
		testBuffButton.textContent = "✨ Test Active Buff System";
		testBuffButton.style.cssText = `
			padding: 10px 20px;
			background: linear-gradient(135deg, #2196F3, #1976D2);
			color: white;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 600;
			transition: all 0.3s ease;
		`;
		testBuffButton.addEventListener('click', async () => {
			try {
				// Import the player store
				const { playerStore } = await import('../shared/state/playerStore');
				const { notify } = await import('../shared/services/notificationService');

				// Get current player data
				const currentPlayer = await playerStore.get();

				// Handle null case
				if (!currentPlayer) {
					notify.error("Error", "Could not load player data", 4000);
					return;
				}

				// Create a test buff that matches the Buff interface
				const testBuff: Buff = {
					name: "XP Booster",
					type: "multiplier",
					value: 1.5,
					expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
					description: "Increases XP gain by 50% for 5 minutes",
					icon: "⚡",
					category: "general"
				};

				// Add the buff to player data
				const updatedPlayer = {
					...currentPlayer,
					buffs: [...(currentPlayer.buffs || []), testBuff]
				};

				// Update the player data
				await playerStore.update(() => updatedPlayer);

				// Show notification
				notify.success("Test Buff Applied!", "Check the Player tab to see the active buff", 4000);

			} catch (error) {
				// Error applying test buff - silent failure
			}
		});

		// Add hover effects
		[showAllButton, testBuffButton].forEach(button => {
			button.addEventListener('mouseenter', () => {
				button.style.transform = 'translateY(-2px)';
				button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
			});

			button.addEventListener('mouseleave', () => {
				button.style.transform = 'translateY(0)';
				button.style.boxShadow = 'none';
			});
		});
	}
}


// Inventory types and parsing are centralized under
// `

/** Fuzzy picker over automatic data backups (newest first). */
class RestoreBackupModal extends FuzzySuggestModal<DataBackupEntry> {
	constructor(
		app: App,
		private backups: DataBackupEntry[],
		private onPick: (entry: DataBackupEntry) => void | Promise<void>
	) {
		super(app);
		this.setPlaceholder('Pick a backup to restore (overwrites the current file)…');
	}

	getItems(): DataBackupEntry[] {
		return this.backups;
	}

	getItemText(entry: DataBackupEntry): string {
		return entry.label;
	}

	onChooseItem(entry: DataBackupEntry): void {
		void this.onPick(entry);
	}
}