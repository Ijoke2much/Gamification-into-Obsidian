import { Plugin, App, PluginSettingTab, Setting, Modal, Notice } from "obsidian";
import React from 'react';
import { PlayerTab, PLAYER_TAB_VIEW_TYPE } from "../views/tabs/player/PlayerTab";
import { StatsTab, STATS_TAB_VIEW_TYPE } from "../views/tabs/stats/StatsTab";
// import { Player } from "../data/models/PlayerData"; // Using PlayerStore instead
import { GamificationPluginSettings, DEFAULT_SETTINGS } from "./settings";
import { Buff } from "../data/models/PlayerData";
import { TaskTabView, GAMIFIED_TASK_TAB_VIEW_TYPE } from '../views/tabs/quests/TaskTabView';
import { SidebarQuestBoardView, SIDEBAR_QUEST_VIEW_TYPE } from '../views/sidebar/SidebarQuestView';
import { SidebarBossView, SIDEBAR_BOSS_VIEW_TYPE } from '../views/sidebar/SidebarBossView';
import { BossView, BOSS_VIEW_TYPE } from '../views/tabs/boss/BossView';
import { giveBuffPreset } from '../features/inventory/utils/updateInventoryFile';
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
import { QuestSystemIntegration } from '../features/quests';
import { EnhancedQuestSystem } from '../features/quests/components/EnhancedQuestSystem';
import { PerformanceOptimizer } from '../shared/utils/performanceOptimizer';
import { showGameNotice } from '../shared/utils/noticeUtils';
import { EnergyResetService } from '../features/energy/services/energyResetService';
import { EnergyNotificationService } from '../features/energy/services/energyNotificationService';
import { getFirstLeafOfTypeInMainWorkspace, isLeafInVaultMainWorkspace } from '../shared/utils/workspaceLeafUtils';

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
	private advancedQuestDashboard: unknown = null;
	private performanceOptimizer!: PerformanceOptimizer;
	private energyResetService?: EnergyResetService;
	private energyNotificationService?: EnergyNotificationService;

	// Make AdvancedQuestModal available on the plugin instance
	public AdvancedQuestModal = AdvancedQuestModal;

	// Mobile detection and optimization methods
	private detectMobileDevice(): boolean {
		if (typeof window === 'undefined') return false;

		const userAgent = navigator.userAgent.toLowerCase();
		const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
		const isSmallScreen = window.innerWidth <= 768;
		const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		return isMobileDevice || (isSmallScreen && isTouchDevice);
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
			.gamification-mobile .gamification-container {
				padding: 8px !important;
			}
		`;
		document.head.appendChild(style);

		// Only prevent zoom within our plugin containers, not globally
		let lastTouchEnd = 0;
		this.preventZoomHandler = (event: TouchEvent) => {
			// Only prevent zoom if the touch is within our plugin
			const target = event.target as Element;
			if (target && target.closest('.gamification-mobile')) {
				const now = (new Date()).getTime();
				if (now - lastTouchEnd <= 300) {
					event.preventDefault();
				}
				lastTouchEnd = now;
			}
		};
		document.addEventListener('touchend', this.preventZoomHandler, false);

		// Don't modify viewport meta tag - let Obsidian handle it
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

		// Remove touch event listeners
		if (this.preventZoomHandler) {
			document.removeEventListener('touchend', this.preventZoomHandler);
		}
	}

	private preventZoomHandler?: (event: TouchEvent) => void;

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

		// Initialize Performance Optimizer (non-blocking so plugin load stays fast)
		this.performanceOptimizer = PerformanceOptimizer.getInstance(this.app);
		this.performanceOptimizer.initialize().catch(() => {
			// Performance optimizer is optional; continue without it if initialization fails
		});

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

		this.addRibbonIcon("dice", "Open Player", () => {
			this.app.workspace.onLayoutReady(async () => {
				this.activatePlayerTabView();
			});
		});

		// Removed the Advanced Quest Dashboard ribbon since it should be accessed through buttons
		// this.addRibbonIcon('target', 'Advanced Quest Dashboard', async (evt: MouseEvent) => {
		// 	try {
		// 		if (!this.questSystem) {
		// 			new Notice('Advanced quest system not initialized');
		// 			return;
		// 		}
		// 
		// 		const modal = new AdvancedQuestModal(this.app, {
		// 			questSystem: this.questSystem,
		// 			onQuestUpdate: (quest) => {
		// 				new Notice('Quest updated successfully');
		// 			},
		// 			onQuestCreate: (quest) => {
		// 				new Notice('Quest created successfully');
		// 			},
		// 			onQuestDelete: (questId) => {
		// 				new Notice('Quest deleted successfully');
		// 			}
		// 		});
		// 
		// 		modal.open();
		// 	} catch (error) {
		// 		new Notice('Failed to open advanced quest dashboard');
		// 	}
		// });

		// Removed the Stats ribbon since stats are available in the sidebar
		// this.addRibbonIcon("bar-chart", "Open Stats", () => {
		// 	this.app.workspace.onLayoutReady(async () => {
		// 		this.activateStatsTabView();
		// 	});
		// });

		// Add settings tab
		this.addSettingTab(new GamificationSettingTab(this.app, this));
		// Commands: Give common buff presets
		this.addCommand({
			id: 'give-xp-booster-30m',
			name: 'Give Item: XP Booster (30m)',
			callback: async () => { await giveBuffPreset(this.app, 'xp_booster_30m', 1); }
		});
		this.addCommand({
			id: 'give-cp-booster-30m',
			name: 'Give Item: CP Booster (30m)',
			callback: async () => { await giveBuffPreset(this.app, 'cp_booster_30m', 1); }
		});
		this.addCommand({
			id: 'give-rewards-booster-1h',
			name: 'Give Item: Rewards Booster (1h)',
			callback: async () => { await giveBuffPreset(this.app, 'rewards_booster_1h', 1); }
		});
		this.addCommand({
			id: 'give-trade-booster-1h',
			name: 'Give Item: Trade Booster (1h)',
			callback: async () => { await giveBuffPreset(this.app, 'trade_booster_1h', 1); }
		});

		// Register the TaskTab in the tab system (example pattern)
		// this.addTab({
		// 	id: 'task-tab',
		// 	title: 'Tasks',
		// 	icon: 'check-square', // or any icon you prefer
		// 	component: TaskTab,
		// });

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

		// Boss Battle View Command
		this.addCommand({
			id: 'open-boss-battle-view',
			name: 'Open Boss Battle Arena',
			callback: () => {
				this.app.workspace.onLayoutReady(async () => {
					this.activateBossView();
				});
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

		// Add command to show performance monitor
		this.addCommand({
			id: 'show-performance-monitor',
			name: 'Show Performance Monitor',
			callback: () => {
				// This will be handled by the TabView component
				showGameNotice('🔧 Performance monitor available in the Player tab', 3000);
			},
		});

		// Add command to get performance stats
		this.addCommand({
			id: 'get-performance-stats',
			name: 'Get Performance Statistics',
			callback: () => {
				if (this.performanceOptimizer) {
					this.performanceOptimizer.getStats();
					showGameNotice('📊 Performance stats available in console', 3000);
				} else {
					showGameNotice('❌ Performance optimizer not initialized', 3000);
				}
			},
		});

		// Register Datacore Task Analytics View - Disabled for now
		// if (this.settings.enableDatacoreIntegration) {
		//	// this.registerView(
		//	//	DATACORE_TASK_VIEW_TYPE,
		//	//	(leaf) => new DatacoreTaskBoardView(leaf, this)
		//	// );
		//
		//	this.addCommand({
		//		id: 'open-datacore-task-analytics',
		//		name: 'Open Task Analytics (Datacore)',
		//		callback: () => {
		//			this.app.workspace.onLayoutReady(async () => {
		//				const leaf = this.app.workspace.getRightLeaf(false);
		//				if (leaf) {
		//					// leaf.setViewState({
		//					//	type: DATACORE_TASK_VIEW_TYPE,
		//					//	active: true,
		//					// });
		//				}
		//			});
		//		},
		//	});
		// }
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Migration: clear corrupted shopkeeper dialogue overrides (runs at plugin load)
		if (isDialogueCorrupted(this.settings.shopkeeperDialogueOverrides)) {
			this.settings.shopkeeperDialogueOverrides = {};
			await this.saveData(this.settings);
		}

		// Initialize currency display service with current settings
		currencyDisplay.initialize(this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update currency display service with new settings
		currencyDisplay.updateSettings(this.settings);

		// Sync settings with runtime config
		this.syncSettingsToRuntimeConfig();
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

	onunload() {
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

	private setupAdvancedQuestFeatures() {
		// Removed ribbon icon - advanced quest dashboard should be accessed through buttons/commands
		// this.addRibbonIcon('target', 'Advanced Quest Dashboard', async (evt: MouseEvent) => {
		// 	await this.showAdvancedQuestDashboard();
		// });

		// Add advanced quest commands
		this.addCommand({
			id: 'show-advanced-quest-dashboard',
			name: 'Show Advanced Quest Dashboard',
			callback: async () => {
				await this.showAdvancedQuestDashboard();
			}
		});

		this.addCommand({
			id: 'generate-quest-analytics',
			name: 'Generate Quest Analytics',
			callback: async () => {
				await this.generateQuestAnalytics();
			}
		});

		this.addCommand({
			id: 'sync-quest-vaults',
			name: 'Sync Quest Vaults',
			callback: async () => {
				await this.syncQuestVaults();
			}
		});

		this.addCommand({
			id: 'show-quest-templates',
			name: 'Show Quest Templates',
			callback: async () => {
				await this.showQuestTemplates();
			}
		});

		// Add status bar item for quest system status
		this.addStatusBarItem().setText('🎯 Quest System Active');
	}

	private async showAdvancedQuestDashboard() {
		try {
			await import('../features/quests/components/AdvancedQuestDashboard');

			const modal = new AdvancedQuestModal(this.app, {
				questSystem: this.questSystem,
				onQuestUpdate: () => {
					// Handle quest updates
				},
				onQuestCreate: () => {
					// Handle quest creation
				},
				onQuestDelete: () => {
					// Handle quest deletion
				}
			});

			modal.open();
		} catch (error) {
			showGameNotice('Failed to load advanced quest dashboard');
		}
	}

	private async generateQuestAnalytics() {
		try {
			await QuestSystemIntegration.generateAnalytics();

			// Show analytics in a modal or notification
			const insights = QuestSystemIntegration.getAnalyticsInsights();
			if (insights) {
				showGameNotice(`Analytics generated! Completion rate: ${(insights.overview.completionRate * 100).toFixed(1)}%`);
			}
		} catch (error) {
			showGameNotice('Failed to generate analytics');
		}
	}

	private async syncQuestVaults() {
		try {
			await QuestSystemIntegration.syncWithVaults();
			showGameNotice('Quest vaults synced successfully');
		} catch (error) {
			showGameNotice('Failed to sync quest vaults');
		}
	}

	private async showQuestTemplates() {
		try {
			const suggestions = await QuestSystemIntegration.getTemplateSuggestions();

			if (suggestions.length > 0) {
				showGameNotice(`${suggestions.length} template suggestions available`);
			} else {
				showGameNotice('No template suggestions available');
			}
		} catch (error) {
			showGameNotice('Failed to load template suggestions');
		}
	}

	private async initializeServicesInBackground() {
		try {
			// Load plugin settings
			await this.loadSettings();

			// Set the vault on the player store
			playerStore.setVault(this.app.vault);

			// Initialize buff service
			buffService;

			// Initialize reward service
			rewardService;

			// Configuration is now handled by syncSettingsToRuntimeConfig()
			// Sync settings to runtime config on startup
			this.syncSettingsToRuntimeConfig();

			// Set up periodic level checking to ensure UI stays in sync
			this.setupPeriodicLevelCheck();

			// Initialize achievement event service for game event tracking (lazy)
			import('../features/achievements/services/achievementEventService').catch(() => {
				// Achievement service loading is optional
			});

			// Initialize quest tracking services
			this.taskScanner = new GamifiedTaskScanner(this.app);
			this.completionTracker = new QuestCompletionTracker(this.app);

			// Start automatic tracking
			// this.taskScanner.startAutoScan(); // Disabled - was causing repetitive notifications every 10 seconds
			this.completionTracker.startTracking();

			// Initialize shop integration system
			this.shopIntegration = new ShopIntegration(this);
			setShopIntegration(this.shopIntegration);

			// Initialize shop system (async, don't block main initialization)
			this.shopIntegration.initialize().catch(() => {
				// Shop integration is optional
			});

			// Initialize task integration service
			this.taskIntegrationService = TaskIntegrationService.getInstance(
				this.app.vault,
				this.app.metadataCache
			);

			// Initialize Energy Services (non-blocking; they will start in the background)
			this.energyResetService = EnergyResetService.getInstance(this.app);
			this.energyResetService.initialize().catch(() => {
				// Energy reset service is optional; failures are logged internally
			});

			this.energyNotificationService = EnergyNotificationService.getInstance();
			this.energyNotificationService.initialize().catch(() => {
				// Notification service is optional; continue without if it fails
			});

			// Initialize Advanced Quest System in the background so it doesn't block plugin load
			QuestSystemIntegration.initializeQuestSystem(this.app)
				.then((questSystem) => {
					this.questSystem = questSystem;
					// Check if advanced features are enabled
					if (QuestSystemIntegration.isAdvancedFeaturesEnabled()) {
						this.setupAdvancedQuestFeatures();
					}
				})
				.catch(() => {
					// Advanced quest system is optional; fall back to basic quest features
				});

			// Initialize Enhanced Quest System for banner caching and display
			this.enhancedQuestSystem = new EnhancedQuestSystem(this);
			this.enhancedQuestSystem.initialize().catch((err) => {
				console.error('Enhanced Quest System init failed:', err);
			});

			// Migrate legacy habits file into per-habit notes if needed
			try {
				const { migrateHabitsToPerFile } = await import('../features/habits/utils/habitsUtils');
				await migrateHabitsToPerFile(this.app.vault);
			} catch (e) {
				// Habit migration is best-effort; failures are logged in the utility
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
							new window.Notice('Settings saved successfully!');
						}
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
						new window.Notice("Restart Obsidian to apply quest board changes.");
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
						new window.Notice("Restart Obsidian to apply shop changes.");
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
						new window.Notice("All skills have been reset. Settings will remain open for your convenience.");
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
						new window.Notice("All classes have been reset. Settings will remain open for your convenience.");
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
						new window.Notice("All master classes have been reset. Settings will remain open for your convenience.");
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
						new window.Notice("All stats have been reset. Settings will remain open for your convenience.");
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
						new window.Notice("PlayerData.md has been reset. Settings will remain open for your convenience.");
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

// Advanced Quest Modal Component
class AdvancedQuestModal extends Modal {
	private questSystem: QuestSystemIntegration | null;
	private onQuestUpdate?: () => void;
	private onQuestCreate?: () => void;
	private onQuestDelete?: (questId: string) => void;

	constructor(app: App, options: {
		questSystem: QuestSystemIntegration | null;
		onQuestUpdate?: () => void;
		onQuestCreate?: () => void;
		onQuestDelete?: (questId: string) => void;
	}) {
		super(app);
		this.questSystem = options.questSystem;
		this.onQuestUpdate = options.onQuestUpdate;
		this.onQuestCreate = options.onQuestCreate;
		this.onQuestDelete = options.onQuestDelete;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Create a simple native HTML interface instead of React
		this.createNativeDashboard(contentEl);
	}

	private createNativeDashboard(container: HTMLElement) {
		// Create the dashboard container
		const dashboardContainer = container.createDiv('advanced-quest-dashboard-container');
		dashboardContainer.style.cssText = `
			padding: 20px;
			max-width: 800px;
			margin: 0 auto;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		`;

		// Header
		const header = dashboardContainer.createDiv();
		header.innerHTML = `
			<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #4a9eff;">
				<span style="font-size: 24px;">🎯</span>
				<h2 style="margin: 0; color: #4a9eff; font-size: 24px;">Advanced Quest Dashboard</h2>
			</div>
		`;

		// Status section
		const statusSection = dashboardContainer.createDiv();
		statusSection.innerHTML = `
			<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin-bottom: 24px; color: white;">
				<h3 style="margin: 0 0 16px 0; font-size: 18px;">System Status</h3>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
					<div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
						<div style="font-size: 14px; opacity: 0.8;">Total Quests</div>
						<div style="font-size: 24px; font-weight: bold;">-</div>
					</div>
					<div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
						<div style="font-size: 14px; opacity: 0.8;">Completed</div>
						<div style="font-size: 24px; font-weight: bold;">-</div>
					</div>
					<div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
						<div style="font-size: 14px; opacity: 0.8;">Active</div>
						<div style="font-size: 24px; font-weight: bold;">-</div>
					</div>
				</div>
			</div>
		`;

		// Features section
		const featuresSection = dashboardContainer.createDiv();
		featuresSection.innerHTML = `
			<div style="margin-bottom: 24px;">
				<h3 style="margin: 0 0 16px 0; color: #333;">Advanced Features</h3>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
					<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #4a9eff;">
						<h4 style="margin: 0 0 8px 0; color: #4a9eff;">🚀 Performance Optimization</h4>
						<p style="margin: 0; font-size: 14px; color: #666;">Incremental parsing and caching for large quest files</p>
					</div>
					<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #28a745;">
						<h4 style="margin: 0 0 8px 0; color: #28a745;">📋 Smart Templates</h4>
						<p style="margin: 0; font-size: 14px; color: #666;">Context-aware quest templates and wizards</p>
					</div>
					<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #ffc107;">
						<h4 style="margin: 0 0 8px 0; color: #ffc107;">🔄 Cross-Vault Sharing</h4>
						<p style="margin: 0; font-size: 14px; color: #666;">Share quests between different Obsidian vaults</p>
					</div>
					<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #dc3545;">
						<h4 style="margin: 0 0 8px 0; color: #dc3545;">🧠 Advanced Analytics</h4>
						<p style="margin: 0; font-size: 14px; color: #666;">Deep insights and optimization recommendations</p>
					</div>
				</div>
			</div>
		`;

		// Actions section
		const actionsSection = dashboardContainer.createDiv();
		actionsSection.innerHTML = `
			<div style="margin-bottom: 24px;">
				<h3 style="margin: 0 0 16px 0; color: #333;">Quick Actions</h3>
				<div style="display: flex; gap: 12px; flex-wrap: wrap;">
					<button id="generate-analytics" style="padding: 12px 20px; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
						📊 Generate Analytics
					</button>
					<button id="sync-vaults" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
						🔄 Sync Vaults
					</button>
					<button id="show-templates" style="padding: 12px 20px; background: #ffc107; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
						📋 Show Templates
					</button>
				</div>
			</div>
		`;

		// Add event listeners
		this.addDashboardEventListeners(dashboardContainer);
	}

	private addDashboardEventListeners(container: HTMLElement) {
		// Generate Analytics button
		const analyticsBtn = container.querySelector('#generate-analytics');
		if (analyticsBtn) {
			analyticsBtn.addEventListener('click', async () => {
				try {
					await QuestSystemIntegration.generateAnalytics();
					showGameNotice('Analytics generated successfully!');
				} catch (error) {
					showGameNotice('Failed to generate analytics');
				}
			});
		}

		// Sync Vaults button
		const syncBtn = container.querySelector('#sync-vaults');
		if (syncBtn) {
			syncBtn.addEventListener('click', async () => {
				try {
					await QuestSystemIntegration.syncWithVaults();
					showGameNotice('Vaults synced successfully!');
				} catch (error) {
					showGameNotice('Failed to sync vaults');
				}
			});
		}

		// Show Templates button
		const templatesBtn = container.querySelector('#show-templates');
		if (templatesBtn) {
			templatesBtn.addEventListener('click', async () => {
				try {
					const suggestions = await QuestSystemIntegration.getTemplateSuggestions();
					showGameNotice(`Found ${suggestions.length} template suggestions`);
				} catch (error) {
					showGameNotice('Failed to get template suggestions');
				}
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Inventory types and parsing are centralized under
// `