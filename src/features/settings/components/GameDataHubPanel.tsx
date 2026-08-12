import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TFile } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import { AddItemModal } from '../../player/modals/AddItemModal';
import { AddMaterialModal } from '../../crafting/modals/AddMaterialModal';
import {
	getCraftingMaterials,
	isVaultMaterial,
} from '../../crafting/utils/craftingMaterialRegistry';
import {
	getCraftingRecipes,
	isVaultRecipe,
} from '../../crafting/utils/craftingRecipeRegistry';
import type { CraftingMaterial, CraftingRecipe } from '../../crafting/types/CraftingTypes';
import { AddRecipeModal } from '../../crafting/modals/AddRecipeModal';
import {
	ensureRecipesFile,
	findRecipesFile,
	formatRecipeOutput,
} from '../../crafting/utils/recipesParser';
import {
	ensureMaterialsFile,
	findMaterialsFile,
} from '../../crafting/utils/materialsParser';
import { refreshAllCraftingData } from '../../crafting/utils/craftingDataSync';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import { BOSS_FOLDER, BOSS_UPDATED_EVENT, listBosses, type BossFileData } from '../../../features/quests/utils/bossFile';
import { describeAffinityRule } from '../../../features/quests/utils/journeyAffinity';
import {
	getDungeonProgress,
	loadJourneyState,
	reopenDungeonGateThisCycle,
} from '../../../features/quests/utils/journeyRunService';
import { getJourneyFoes } from '../../../features/quests/utils/journeyFoeRegistry';
import {
	getAllShopItems,
	type ShopItem,
} from '../../shop/utils/ShopParser';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';
import { resolveVaultMarkdownFile } from '../../../shared/utils/resolveVaultMarkdownFile';
import styles from './GameDataHubPanel.module.css';

interface GameDataHubPanelProps {
	plugin: GamifiedObsidianPlugin;
}

type HubTab = 'shop' | 'materials' | 'recipes' | 'bosses' | 'dungeon';

const HUB_TABS: { key: HubTab; label: string }[] = [
	{ key: 'shop', label: 'Shop' },
	{ key: 'materials', label: 'Materials' },
	{ key: 'recipes', label: 'Recipes' },
	{ key: 'bosses', label: 'Bosses' },
	{ key: 'dungeon', label: 'Dungeon' },
];

const FOOTER_BY_TAB: Record<HubTab, React.ReactNode> = {
	shop: (
		<>
			Shop tab buys from these listings · edits save to <strong>Shop.md</strong>
		</>
	),
	materials: (
		<>
			Workshop consumes these · edits save to <strong>Materials.md</strong>
		</>
	),
	recipes: (
		<>
			Workshop uses these · edits save to <strong>Recipes.md</strong>
		</>
	),
	bosses: (
		<>
			Dungeon gate roster · notes live in <strong>{BOSS_FOLDER}/</strong>
		</>
	),
	dungeon: (
		<>
			Gate cycle tools for the Quest sidebar <strong>Dungeon</strong> tab
		</>
	),
};

function materialChipLabel(materialId: string): { icon: string; name: string } {
	const def = getCraftingMaterials().find((m) => m.id === materialId);
	return { icon: def?.icon ?? '📦', name: def?.name ?? materialId };
}

export const GameDataHubPanel: React.FC<GameDataHubPanelProps> = ({ plugin }) => {
	const [activeTab, setActiveTab] = useState<HubTab>('shop');
	const [items, setItems] = useState<ShopItem[]>([]);
	const [materials, setMaterials] = useState<CraftingMaterial[]>([]);
	const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
	const [bosses, setBosses] = useState<BossFileData[]>([]);
	const [loading, setLoading] = useState(true);
	const [shopNoteMissing, setShopNoteMissing] = useState(false);
	const [materialsNoteMissing, setMaterialsNoteMissing] = useState(false);
	const [recipesNoteMissing, setRecipesNoteMissing] = useState(false);

	const loadShop = useCallback(async () => {
		try {
			currencyDisplay.initialize(plugin.settings);
			const shopFile = resolveVaultMarkdownFile(plugin.app, 'shop', [
				'Shop.md',
				'shop.md',
				'Gamification/Shop.md',
				'Gamified/Shop.md',
			]);
			setShopNoteMissing(!shopFile);
			const list = shopFile ? await getAllShopItems(plugin) : [];
			setItems(list);
		} catch (e) {
			console.error('[GameDataHub] Failed to load shop items', e);
			setItems([]);
		}
	}, [plugin]);

	const loadCraftingData = useCallback(async () => {
		try {
			setMaterialsNoteMissing(!findMaterialsFile(plugin));
			setRecipesNoteMissing(!findRecipesFile(plugin));
			await refreshAllCraftingData(plugin);
			setMaterials(getCraftingMaterials());
			setRecipes(getCraftingRecipes());
		} catch (e) {
			console.error('[GameDataHub] Failed to load crafting data', e);
			setMaterials(getCraftingMaterials());
			setRecipes(getCraftingRecipes());
		}
	}, [plugin]);

	const loadBosses = useCallback(async () => {
		try {
			const list = await listBosses(plugin.app);
			setBosses(list);
		} catch (e) {
			console.error('[GameDataHub] Failed to load bosses', e);
			setBosses([]);
		}
	}, [plugin]);

	const reloadAll = useCallback(async () => {
		setLoading(true);
		await Promise.all([loadShop(), loadCraftingData(), loadBosses()]);
		setLoading(false);
	}, [loadShop, loadCraftingData, loadBosses]);

	useEffect(() => {
		void reloadAll();
	}, [reloadAll]);

	useEffect(() => {
		const onShopUpdate = () => void loadShop();
		const onCraftingUpdate = () => void loadCraftingData();
		const onBossUpdate = () => void loadBosses();
		document.addEventListener('shop-data-updated', onShopUpdate);
		document.addEventListener('crafting-data-updated', onCraftingUpdate);
		window.addEventListener(BOSS_UPDATED_EVENT, onBossUpdate);
		return () => {
			document.removeEventListener('shop-data-updated', onShopUpdate);
			document.removeEventListener('crafting-data-updated', onCraftingUpdate);
			window.removeEventListener(BOSS_UPDATED_EVENT, onBossUpdate);
		};
	}, [loadShop, loadCraftingData, loadBosses]);

	const currencyLabel = currencyDisplay.getCurrencyLabel(true);

	const sortedItems = useMemo(
		() => [...items].sort((a, b) => a.name.localeCompare(b.name)),
		[items]
	);

	const sortedMaterials = useMemo(
		() => [...materials].sort((a, b) => a.name.localeCompare(b.name)),
		[materials]
	);

	const sortedRecipes = useMemo(
		() => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
		[recipes]
	);

	const sortedBosses = useMemo(
		() => [...bosses].sort((a, b) => a.name.localeCompare(b.name)),
		[bosses]
	);

	const dungeonProgress = useMemo(() => {
		const foes = getJourneyFoes();
		const state = loadJourneyState();
		return getDungeonProgress(
			{
				activeRun: state.activeRun,
				clearedFoeIds: state.clearedFoeIds,
				board: state.board,
				dungeonRaid: state.dungeonRaid,
				dungeonClearedForCycle: state.dungeonClearedForCycle,
			},
			foes.length
		);
	}, [loading, bosses]);

	const handleReopenDungeonGate = () => {
		const confirmed = window.confirm(
			'Reopen the dungeon gate for this board cycle?\n\nJourney foe clears are kept. Use this after claiming spoils if you want another raid before the roster reshuffles.'
		);
		if (!confirmed) return;
		const result = reopenDungeonGateThisCycle();
		if (result.wasSealed) {
			pixelNotice('Gate reopened — you can enter another raid this cycle.', 4000);
		} else {
			pixelNotice('Gate was not sealed for this cycle.', 3000);
		}
		void reloadAll();
	};

	const openBossNote = async (filePath: string) => {
		const file = plugin.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			await plugin.app.workspace.getLeaf(false).openFile(file);
		}
	};

	const openShopMd = async () => {
		const shopFile = plugin.app.vault
			.getMarkdownFiles()
			.find((f) => f.basename.toLowerCase() === 'shop');
		if (!shopFile) {
			pixelNotice('No note named Shop.md found in this vault.', 3500);
			return;
		}
		await plugin.app.workspace.getLeaf(false).openFile(shopFile);
	};

	const openMaterialsMd = async () => {
		let file = findMaterialsFile(plugin);
		if (!file) {
			const created = await ensureMaterialsFile(plugin);
			if (!created) {
				pixelNotice('Could not create Materials.md.', 3500);
				return;
			}
			file = findMaterialsFile(plugin);
		}
		if (file) {
			setMaterialsNoteMissing(false);
			await plugin.app.workspace.getLeaf(false).openFile(file);
		}
	};

	const openAddItem = () => {
		new AddItemModal(plugin.app, plugin, () => {}).open();
	};

	const openNewArtifact = () => {
		new AddItemModal(plugin.app, plugin, () => {}, undefined, 'artifact').open();
	};

	const openEditShopItem = (item: ShopItem) => {
		new AddItemModal(plugin.app, plugin, () => {}, item).open();
	};

	const openAddMaterial = async () => {
		const ok = await ensureMaterialsFile(plugin);
		if (!ok) {
			pixelNotice('Could not create Materials.md.');
			return;
		}
		setMaterialsNoteMissing(false);
		new AddMaterialModal(plugin.app, plugin, () => void loadCraftingData()).open();
	};

	const openEditMaterial = async (material: CraftingMaterial) => {
		const ok = await ensureMaterialsFile(plugin);
		if (!ok) {
			pixelNotice('Could not create Materials.md.');
			return;
		}
		setMaterialsNoteMissing(false);
		new AddMaterialModal(plugin.app, plugin, () => void loadCraftingData(), material).open();
	};

	const openRecipesMd = async () => {
		let file = findRecipesFile(plugin);
		if (!file) {
			const created = await ensureRecipesFile(plugin);
			if (!created) {
				pixelNotice('Could not create Recipes.md.', 3500);
				return;
			}
			file = findRecipesFile(plugin);
		}
		if (file) {
			setRecipesNoteMissing(false);
			await plugin.app.workspace.getLeaf(false).openFile(file);
		}
	};

	const openAddRecipe = async () => {
		const ok = await ensureRecipesFile(plugin);
		if (!ok) {
			pixelNotice('Could not create Recipes.md.');
			return;
		}
		setRecipesNoteMissing(false);
		new AddRecipeModal(plugin.app, plugin, () => void loadCraftingData()).open();
	};

	const openEditRecipe = async (recipe: CraftingRecipe) => {
		const ok = await ensureRecipesFile(plugin);
		if (!ok) {
			pixelNotice('Could not create Recipes.md.');
			return;
		}
		setRecipesNoteMissing(false);
		new AddRecipeModal(plugin.app, plugin, () => void loadCraftingData(), recipe).open();
	};

	return (
		<div className={styles.shell} data-gamification-shell="system">
			<header className={styles.header}>
				<span className={styles.headerIcon} aria-hidden="true">
					🗂
				</span>
				<p className={styles.systemLabel}>[ SYSTEM : DATA HUB ]</p>
				<h3 className={styles.title}>Vault content</h3>
			</header>
			<p className={styles.intro}>
				Author shop listings, materials, recipes, and gate bosses. Customs merge with built-ins by{' '}
				<strong>id</strong>.
			</p>

			<div className={styles.tabs} role="tablist" aria-label="Game data sections">
				{HUB_TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
						onClick={() => setActiveTab(tab.key)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === 'shop' && (
				<>
					{shopNoteMissing && (
						<div className={styles.warn}>
							Could not find <strong>Shop.md</strong>. Add a note with that basename so shop items
							can be saved.
						</div>
					)}

					<div className={styles.actions}>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void reloadAll()}
						>
							↻ Reload
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							disabled={shopNoteMissing}
							onClick={() => void openShopMd()}
						>
							Open Shop.md
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
							disabled={shopNoteMissing}
							onClick={openAddItem}
						>
							＋ Add shop item
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							disabled={shopNoteMissing}
							onClick={openNewArtifact}
						>
							＋ Artifact listing
						</button>
					</div>

					{loading ? (
						<p className={styles.empty}>Loading shop items…</p>
					) : sortedItems.length === 0 ? (
						<p className={styles.empty}>
							No items loaded.{' '}
							{shopNoteMissing ? 'Create Shop.md first.' : 'Shop.md exists but has no item lines.'}
						</p>
					) : (
						<ul className={styles.list}>
							{sortedItems.map((item, idx) => (
								<li key={`${idx}-${item.name}-${item.price}`} className={styles.row}>
									<span className={styles.rowIcon} aria-hidden="true">
										{item.icon || '🛒'}
									</span>
									<div className={styles.rowMain}>
										<div className={styles.rowNameLine}>
											<span className={styles.rowName}>{item.name}</span>
										</div>
										<div className={styles.rowMeta}>
											{item.price} {currencyLabel}
											{item.category ? ` · ${item.category}` : ''}
											{item.rarity ? ` · ${item.rarity}` : ''}
										</div>
									</div>
									<button
										type="button"
										className={styles.editBtn}
										onClick={() => openEditShopItem(item)}
										disabled={shopNoteMissing}
									>
										Edit
									</button>
								</li>
							))}
						</ul>
					)}
				</>
			)}

			{activeTab === 'materials' && (
				<>
					{materialsNoteMissing && (
						<div className={styles.warn}>
							No <strong>Materials.md</strong> yet. Use &quot;Create Materials.md&quot; or add a
							material — a starter file will be created automatically.
						</div>
					)}

					<div className={styles.actions}>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void reloadAll()}
						>
							↻ Reload
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void openMaterialsMd()}
						>
							{materialsNoteMissing ? 'Create Materials.md' : 'Open Materials.md'}
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
							onClick={() => void openAddMaterial()}
						>
							＋ Add material
						</button>
					</div>

					{loading ? (
						<p className={styles.empty}>Loading materials…</p>
					) : (
						<ul className={styles.list}>
							{sortedMaterials.map((material) => (
								<li key={material.id} className={styles.row}>
									<span className={styles.rowIcon} aria-hidden="true">
										{material.icon || '📦'}
									</span>
									<div className={styles.rowMain}>
										<div className={styles.rowNameLine}>
											<span className={styles.rowName}>{material.name}</span>
											{isVaultMaterial(material.id) ? (
												<span className={`${styles.badge} ${styles.badgeCustom}`}>Custom</span>
											) : (
												<span className={`${styles.badge} ${styles.badgeBuiltin}`}>
													Built-in
												</span>
											)}
										</div>
										<span className={styles.rowId}>{material.id}</span>
										<div className={styles.rowMeta}>
											{material.category} · {material.rarity}
										</div>
									</div>
									<button
										type="button"
										className={styles.editBtn}
										onClick={() => void openEditMaterial(material)}
									>
										{isVaultMaterial(material.id) ? 'Edit' : 'Override'}
									</button>
								</li>
							))}
						</ul>
					)}
				</>
			)}

			{activeTab === 'recipes' && (
				<>
					{recipesNoteMissing && (
						<div className={styles.warn}>
							No <strong>Recipes.md</strong> yet. Add a recipe or create the file — custom recipes
							define what materials craft which items and artifacts.
						</div>
					)}

					<div className={styles.actions}>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void reloadAll()}
						>
							↻ Reload
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void openRecipesMd()}
						>
							{recipesNoteMissing ? 'Create Recipes.md' : 'Open Recipes.md'}
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
							onClick={() => void openAddRecipe()}
						>
							＋ Add recipe
						</button>
					</div>

					{loading ? (
						<p className={styles.empty}>Loading recipes…</p>
					) : (
						<ul className={styles.list}>
							{sortedRecipes.map((recipe) => (
								<li key={recipe.id} className={styles.row}>
									<span className={styles.rowIcon} aria-hidden="true">
										{recipe.icon || '📜'}
									</span>
									<div className={styles.rowMain}>
										<div className={styles.rowNameLine}>
											<span className={styles.rowName}>{recipe.name}</span>
											{isVaultRecipe(recipe.id) ? (
												<span className={`${styles.badge} ${styles.badgeCustom}`}>Custom</span>
											) : (
												<span className={`${styles.badge} ${styles.badgeBuiltin}`}>
													Built-in
												</span>
											)}
										</div>
										<span className={styles.rowId}>{recipe.id}</span>
										<div className={styles.chips}>
											{recipe.materials
												.filter((m) => m.required !== false)
												.map((m) => {
													const { icon, name } = materialChipLabel(m.materialId);
													return (
														<span
															key={`${recipe.id}-${m.materialId}`}
															className={styles.chip}
															title={`${name} ×${m.quantity}`}
														>
															{icon} {name} ×{m.quantity}
														</span>
													);
												})}
										</div>
										<div className={styles.creates}>
											Creates <strong>{formatRecipeOutput(recipe)}</strong>
											{recipe.category ? ` · ${recipe.category}` : ''}
										</div>
									</div>
									<button
										type="button"
										className={styles.editBtn}
										onClick={() => void openEditRecipe(recipe)}
									>
										{isVaultRecipe(recipe.id) ? 'Edit' : 'Override'}
									</button>
								</li>
							))}
						</ul>
					)}
				</>
			)}

			{activeTab === 'bosses' && (
				<>
					<div className={styles.actions}>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void reloadAll()}
						>
							↻ Reload
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
							onClick={() => void plugin.openCreateBossModal(() => void reloadAll())}
						>
							＋ Forge a boss
						</button>
					</div>

					{loading ? (
						<p className={styles.empty}>Loading gate bosses…</p>
					) : sortedBosses.length === 0 ? (
						<p className={styles.empty}>
							No bosses in <strong>{BOSS_FOLDER}/</strong> yet. Forge one to populate the dungeon
							gate roster.
						</p>
					) : (
						<ul className={styles.list}>
							{sortedBosses.map((boss) => (
								<li key={boss.filePath} className={styles.row}>
									<span className={styles.rowIcon} aria-hidden="true">
										{boss.emoji || '⚔️'}
									</span>
									<div className={styles.rowMain}>
										<div className={styles.rowNameLine}>
											<span className={styles.rowName}>{boss.name}</span>
										</div>
										<div className={styles.rowMeta}>
											{boss.difficulty} · {describeAffinityRule(boss.affinityRule)} ·{' '}
											{boss.status}
										</div>
									</div>
									<div className={styles.rowActions}>
										<button
											type="button"
											className={styles.editBtn}
											onClick={() =>
												void plugin.openEditBossModal(boss, () => void reloadAll())
											}
										>
											Edit
										</button>
										<button
											type="button"
											className={styles.editBtn}
											onClick={() => void openBossNote(boss.filePath)}
										>
											Open note
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</>
			)}

			{activeTab === 'dungeon' && (
				<>
					<p className={styles.intro}>
						Reopening the gate only clears the &quot;cleared this cycle&quot; seal — it does not wipe
						Journey foe progress.
					</p>

					<div className={styles.dungeonStatusCard}>
						<div className={styles.dungeonStatusRow}>
							<span>Gate unlocked</span>
							<strong>{dungeonProgress.unlocked ? 'Yes' : 'No'}</strong>
						</div>
						<div className={styles.dungeonStatusRow}>
							<span>Clearance</span>
							<strong>
								{dungeonProgress.clearedCount}/{dungeonProgress.required}
							</strong>
						</div>
						<div className={styles.dungeonStatusRow}>
							<span>Gate sealed this cycle</span>
							<strong>{dungeonProgress.clearedForCycle ? 'Yes — spoils claimed' : 'No'}</strong>
						</div>
						<div className={styles.dungeonStatusRow}>
							<span>Raid in progress</span>
							<strong>{dungeonProgress.raidActive ? 'Yes' : 'No'}</strong>
						</div>
					</div>

					<div className={styles.actions}>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void reloadAll()}
						>
							↻ Refresh status
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
							disabled={!dungeonProgress.clearedForCycle}
							onClick={handleReopenDungeonGate}
						>
							Reopen gate this cycle
						</button>
						<button
							type="button"
							className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
							onClick={() => void plugin.focusQuestHubSection('dungeon')}
						>
							Open Dungeon sidebar
						</button>
					</div>

					{!dungeonProgress.clearedForCycle && (
						<p className={styles.empty}>
							Gate is open for raids, or you have not claimed spoils yet this cycle.
						</p>
					)}
				</>
			)}

			<p className={styles.footer}>{FOOTER_BY_TAB[activeTab]}</p>
		</div>
	);
};
