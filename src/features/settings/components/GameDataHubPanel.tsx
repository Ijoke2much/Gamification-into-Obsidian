import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TFile } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import { Card } from '../../../shared/components/ui/Card';
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
	formatRecipeMaterials,
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
import styles from './GameDataHubPanel.module.css';

interface GameDataHubPanelProps {
	plugin: GamifiedObsidianPlugin;
}

type HubTab = 'shop' | 'materials' | 'recipes' | 'bosses' | 'dungeon';

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
			const shopFile = plugin.app.vault
				.getMarkdownFiles()
				.find((f) => f.basename.toLowerCase() === 'shop');
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
		<div>
			<Card className={styles.panel}>
				<h3>🧰 Game data hub</h3>
				<p className={styles.intro}>
					Manage shop listings (<strong>Shop.md</strong>), crafting materials (
					<strong>Materials.md</strong>), recipes (<strong>Recipes.md</strong>), and gate bosses (
					<strong>Bosses/</strong>). Custom entries merge with built-in defaults by{' '}
					<strong>id</strong>.
				</p>

				<div className={styles.tabs}>
					<button
						type="button"
						className={`${styles.tab} ${activeTab === 'shop' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('shop')}
					>
						🛒 Shop
					</button>
					<button
						type="button"
						className={`${styles.tab} ${activeTab === 'materials' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('materials')}
					>
						📦 Materials
					</button>
					<button
						type="button"
						className={`${styles.tab} ${activeTab === 'recipes' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('recipes')}
					>
						📜 Recipes
					</button>
					<button
						type="button"
						className={`${styles.tab} ${activeTab === 'bosses' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('bosses')}
					>
						⚔️ Bosses
					</button>
					<button
						type="button"
						className={`${styles.tab} ${activeTab === 'dungeon' ? styles.tabActive : ''}`}
						onClick={() => setActiveTab('dungeon')}
					>
						🏛 Dungeon
					</button>
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
								className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
								disabled={shopNoteMissing}
								onClick={openNewArtifact}
							>
								🏺 New artifact listing
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
							<div className={styles.tableWrap}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Name</th>
											<th>Price</th>
											<th>Category</th>
											<th>Rarity</th>
											<th aria-label="Actions" />
										</tr>
									</thead>
									<tbody>
										{sortedItems.map((item, idx) => (
											<tr key={`${idx}-${item.name}-${item.price}`}>
												<td>
													{item.icon ? `${item.icon} ` : ''}
													{item.name}
												</td>
												<td>
													{item.price} {currencyLabel}
												</td>
												<td>{item.category || '—'}</td>
												<td>{item.rarity || '—'}</td>
												<td>
													<button
														type="button"
														className={styles.editBtn}
														onClick={() => openEditShopItem(item)}
														disabled={shopNoteMissing}
													>
														Edit
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
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
							<div className={styles.tableWrap}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Name</th>
											<th>Id</th>
											<th>Category</th>
											<th>Rarity</th>
											<th>Source</th>
											<th aria-label="Actions" />
										</tr>
									</thead>
									<tbody>
										{sortedMaterials.map((material) => (
											<tr key={material.id}>
												<td>
													{material.icon ? `${material.icon} ` : ''}
													{material.name}
													{isVaultMaterial(material.id) ? (
														<span className={`${styles.badge} ${styles.badgeCustom}`}>
															Custom
														</span>
													) : (
														<span className={`${styles.badge} ${styles.badgeBuiltin}`}>
															Built-in
														</span>
													)}
												</td>
												<td>
													<code>{material.id}</code>
												</td>
												<td>{material.category}</td>
												<td>{material.rarity}</td>
												<td>{material.source}</td>
												<td>
													<button
														type="button"
														className={styles.editBtn}
														onClick={() => void openEditMaterial(material)}
													>
														{isVaultMaterial(material.id) ? 'Edit' : 'Override'}
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
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
							<div className={styles.tableWrap}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Recipe</th>
											<th>Materials</th>
											<th>Creates</th>
											<th>Category</th>
											<th aria-label="Actions" />
										</tr>
									</thead>
									<tbody>
										{sortedRecipes.map((recipe) => (
											<tr key={recipe.id}>
												<td>
													{recipe.icon ? `${recipe.icon} ` : ''}
													{recipe.name}
													{isVaultRecipe(recipe.id) ? (
														<span className={`${styles.badge} ${styles.badgeCustom}`}>
															Custom
														</span>
													) : (
														<span className={`${styles.badge} ${styles.badgeBuiltin}`}>
															Built-in
														</span>
													)}
													<div style={{ fontSize: '0.75em', opacity: 0.7 }}>
														<code>{recipe.id}</code>
													</div>
												</td>
												<td>{formatRecipeMaterials(recipe)}</td>
												<td>{formatRecipeOutput(recipe)}</td>
												<td>{recipe.category}</td>
												<td>
													<button
														type="button"
														className={styles.editBtn}
														onClick={() => void openEditRecipe(recipe)}
													>
														{isVaultRecipe(recipe.id) ? 'Edit' : 'Override'}
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
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
								⚔️ Forge a boss
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
							<div className={styles.tableWrap}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Boss</th>
											<th>Difficulty</th>
											<th>Affinity</th>
											<th>Status</th>
											<th aria-label="Actions" />
										</tr>
									</thead>
									<tbody>
										{sortedBosses.map((boss) => (
											<tr key={boss.filePath}>
												<td>
													{boss.emoji ? `${boss.emoji} ` : ''}
													{boss.name}
												</td>
												<td>{boss.difficulty}</td>
												<td>{describeAffinityRule(boss.affinityRule)}</td>
												<td>{boss.status}</td>
												<td>
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
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</>
				)}

				{activeTab === 'dungeon' && (
					<>
						<p className={styles.intro}>
							Gate cycle tools for the Quest sidebar <strong>Dungeon</strong> tab. Reopening the gate
							only clears the &quot;cleared this cycle&quot; seal — it does not wipe Journey foe
							progress.
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
								🔓 Reopen gate this cycle
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
			</Card>
		</div>
	);
};
