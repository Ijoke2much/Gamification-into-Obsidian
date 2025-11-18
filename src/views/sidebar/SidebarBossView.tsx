import React, { useState, useEffect } from "react";
import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import type GamifiedObsidianPlugin from "../../core/main";
import { SidebarBossAnalytics } from "../../features/analytics/components/SidebarBossAnalytics";
import { bossManagementService } from "../../features/quests/utils/bossManagementService";
import styles from "./SidebarBossView.module.css";

export const SIDEBAR_BOSS_VIEW_TYPE = "sidebar-boss-view";

interface SidebarBossViewProps {
	app: App;
	plugin: GamifiedObsidianPlugin;
}

interface BossData {
	id: string;
	name: string;
	theme: string;
	difficulty: string;
	health: number;
	maxHealth: number;
	isActive: boolean;
	questId?: string;
}

const SidebarBossViewComponent: React.FC<SidebarBossViewProps> = ({ app, plugin }) => {
	const [activeBosses, setActiveBosses] = useState<BossData[]>([]);
	const [recentDefeated, setRecentDefeated] = useState<BossData[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadBossData();
		
		// Set up event listeners for boss updates
		const handleBossUpdate = () => {
			loadBossData();
		};

		window.addEventListener('bossUpdated', handleBossUpdate);
		window.addEventListener('bossDefeated', handleBossUpdate);
		
		return () => {
			window.removeEventListener('bossUpdated', handleBossUpdate);
			window.removeEventListener('bossDefeated', handleBossUpdate);
		};
	}, []);

	const loadBossData = async () => {
		setLoading(true);
		try {
			// Try to load active bosses, but handle if service doesn't exist
			if (typeof bossManagementService?.getActiveBosses === 'function') {
				const active = bossManagementService.getActiveBosses();
				setActiveBosses(active.map(boss => ({
					id: boss.boss.id,
					name: boss.boss.name,
					theme: boss.boss.theme || 'General',
					difficulty: boss.boss.difficulty || 'medium',
					health: boss.progress?.currentHP || boss.boss.stats?.currentHP || 100,
					maxHealth: boss.boss.stats?.maxHP || 100,
					isActive: true,
					questId: boss.quest?.id
				})));

				// Load recently defeated bosses (last 3)
				const defeated = bossManagementService.getDefeatedBosses();
				setRecentDefeated(defeated.slice(0, 3).map(boss => ({
					id: boss.boss.id,
					name: boss.boss.name,
					theme: boss.boss.theme || 'General',
					difficulty: boss.boss.difficulty || 'medium',
					health: 0,
					maxHealth: boss.boss.stats?.maxHP || 100,
					isActive: false,
					questId: boss.quest?.id
				})));
			} else {
				console.log("Boss management service not available");
				// Set empty arrays as fallback
				setActiveBosses([]);
				setRecentDefeated([]);
			}
		} catch (error) {
			console.error("Error loading boss data:", error);
			// Set empty arrays as fallback
			setActiveBosses([]);
			setRecentDefeated([]);
		} finally {
			setLoading(false);
		}
	};

	const getDifficultyColor = (difficulty: string): string => {
		switch (difficulty.toLowerCase()) {
			case 'easy': return '#10b981';
			case 'medium': return '#f59e0b';
			case 'hard': return '#ef4444';
			case 'legendary': return '#8b5cf6';
			default: return '#6b7280';
		}
	};

	const getThemeEmoji = (theme: string): string => {
		switch (theme.toLowerCase()) {
			case 'dragon': return '🐉';
			case 'demon': return '👹';
			case 'undead': return '☠️';
			case 'beast': return '🦁';
			case 'elemental': return '🔥';
			case 'mechanical': return '⚙️';
			case 'cosmic': return '🌌';
			default: return '👑';
		}
	};

	const handleBossBattle = (boss: BossData) => {
		// Open the full boss battle view
		const event = new CustomEvent('openBossBattle', {
			detail: { bossId: boss.id, questId: boss.questId }
		});
		window.dispatchEvent(event);
	};

	const renderBossCard = (boss: BossData, isActive: boolean = true) => {
		const healthPercentage = isActive ? (boss.health / boss.maxHealth) * 100 : 0;
		
		return (
			<div
				key={boss.id}
				className={`${styles.bossCard} ${!isActive ? styles.defeated : ''}`}
				onClick={() => isActive && handleBossBattle(boss)}
				style={{ cursor: isActive ? 'pointer' : 'default' }}
			>
				<div className={styles.bossHeader}>
					<div className={styles.bossInfo}>
						<span className={styles.themeEmoji}>{getThemeEmoji(boss.theme)}</span>
						<div className={styles.bossDetails}>
							<div className={styles.bossName}>{boss.name}</div>
							<div className={styles.bossTheme}>{boss.theme}</div>
						</div>
					</div>
					<div 
						className={styles.difficulty}
						style={{ color: getDifficultyColor(boss.difficulty) }}
					>
						{boss.difficulty}
					</div>
				</div>
				
				{isActive && (
					<div className={styles.healthBar}>
						<div className={styles.healthBarLabel}>
							<span>HP</span>
							<span>{boss.health}/{boss.maxHealth}</span>
						</div>
						<div className={styles.healthBarTrack}>
							<div 
								className={styles.healthBarFill}
								style={{ width: `${healthPercentage}%` }}
							/>
						</div>
					</div>
				)}
				
				{!isActive && (
					<div className={styles.defeatedLabel}>
						<span>💀 Defeated</span>
					</div>
				)}
			</div>
		);
	};

	const renderSection = (title: string, bosses: BossData[], emptyMessage: string, isActive: boolean = true) => (
		<div className={styles.section}>
			<h3 className={styles.sectionTitle}>{title}</h3>
			{bosses.length === 0 ? (
				<div className={styles.emptyState}>
					<span>{emptyMessage}</span>
				</div>
			) : (
				<div className={styles.bossesList}>
					{bosses.map(boss => renderBossCard(boss, isActive))}
				</div>
			)}
		</div>
	);

	if (loading) {
		return (
			<div className={styles.sidebarBossContainer}>
				<div className={styles.loading}>Loading boss data...</div>
			</div>
		);
	}

	return (
		<div className={styles.sidebarBossContainer}>
			{/* Debug identifier */}
			<div style={{ 
				fontSize: '10px', 
				color: '#666', 
				textAlign: 'center', 
				padding: '2px',
				borderBottom: '1px solid #333'
			}}>
				COMPACT SIDEBAR VIEW
			</div>
			<div className={styles.header}>
				<h2 className={styles.title}>
					<span className={styles.titleIcon}>👑</span>
					Boss System
				</h2>
				<button
					className={styles.fullViewButton}
					onClick={() => {
						// Open the full boss view
						const event = new CustomEvent('openBossSystem', {
							detail: { tab: 'selection' }
						});
						window.dispatchEvent(event);
					}}
				>
					Full View
				</button>
			</div>

			{/* Analytics Section */}
			<SidebarBossAnalytics />

			{/* Active Bosses Section */}
			{renderSection("⚔️ Active Battles", activeBosses, "No active boss battles", true)}

			{/* Recent Victories Section */}
			{renderSection("🏆 Recent Victories", recentDefeated, "No recent victories", false)}

			{/* Quick Actions */}
			<div className={styles.quickActions}>
				<button
					className={styles.actionButton}
					onClick={() => {
						const event = new CustomEvent('openBossCreation');
						window.dispatchEvent(event);
					}}
				>
					<span>➕</span>
					Create Boss
				</button>
				<button
					className={styles.actionButton}
					onClick={() => {
						const event = new CustomEvent('openBossAnalytics', {
							detail: { tab: 'analytics' }
						});
						window.dispatchEvent(event);
					}}
				>
					<span>📊</span>
					Analytics
				</button>
			</div>
		</div>
	);
};

export default SidebarBossViewComponent;

export class SidebarBossView extends ItemView {
	root: Root | null = null;
	plugin: GamifiedObsidianPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GamifiedObsidianPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return SIDEBAR_BOSS_VIEW_TYPE;
	}

	getDisplayText() {
		return "Boss System";
	}

	getIcon() {
		return "crown";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		this.root = createRoot(container);
		this.root.render(<SidebarBossViewComponent app={this.app} plugin={this.plugin} />);
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
