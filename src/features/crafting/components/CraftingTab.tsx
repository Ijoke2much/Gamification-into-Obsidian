import React, { useEffect, useMemo, useState } from 'react';
import {
	CraftingMaterial,
	CraftingRecipe,
	RandomItemTemplate,
} from '../types/CraftingTypes';
import { CraftingEngine } from '../utils/craftingEngine';
import { refreshAllCraftingData } from '../utils/craftingDataSync';
import { RandomItemGenerator } from '../utils/randomItemGenerator';
import { getCraftingMaterials } from '../utils/craftingMaterialRegistry';
import { isVaultRecipe } from '../utils/craftingRecipeRegistry';
import { PlayerData } from '../../../data/models/PlayerData';
import GamifiedObsidianPlugin from '../../../core/main';
import { useMobileOptimizations } from '../../../shared/hooks/useMobileOptimizations';
import styles from './CraftingTab.module.css';

type OwnedMaterial = CraftingMaterial & { quantity: number };
type WorkshopMode = 'recipes' | 'experiment';
type FilterKey = 'can' | 'all' | 'consumable' | 'equipment' | 'artifact' | 'misc';

const MOBILE_PAGE_SIZE = 12;

const FILTERS: { key: FilterKey; label: string }[] = [
	{ key: 'can', label: 'Can craft' },
	{ key: 'all', label: 'All' },
	{ key: 'consumable', label: 'Consumable' },
	{ key: 'equipment', label: 'Equipment' },
	{ key: 'artifact', label: 'Artifact' },
	{ key: 'misc', label: 'Misc' },
];

interface CraftingTabProps {
	plugin: GamifiedObsidianPlugin;
	playerData: PlayerData | null;
	reloadPlayerData: () => Promise<void>;
}

function normalizeRecipeCategory(category: string | undefined): FilterKey {
	const c = (category || '').toLowerCase();
	if (c === 'consumable' || c === 'potion') return 'consumable';
	if (c === 'equipment' || c === 'weapon' || c === 'armor' || c === 'tool') return 'equipment';
	if (c === 'artifact') return 'artifact';
	if (c === 'mystical' || c === 'decoration') return 'misc';
	return 'misc';
}

const GEAR_LABELS: Record<string, string> = {
	focus: 'Focus',
	focussession: 'Focus',
	focussessionbonus: 'Focus',
	boss: 'Boss damage',
	bossdamage: 'Boss damage',
	bossdamagebonus: 'Boss damage',
	xp: 'XP bonus',
	xpbonus: 'XP bonus',
	coins: 'Coin bonus',
	coin: 'Coin bonus',
	coinbonus: 'Coin bonus',
	energy: 'Energy cost',
	energycost: 'Energy cost',
	energycostreduction: 'Energy cost',
	crafting: 'Crafting success',
	craftingsuccess: 'Crafting success',
	craftingsuccessbonus: 'Crafting success',
	material: 'Material drops',
	materials: 'Material drops',
	materialdrop: 'Material drops',
	materialdropbonus: 'Material drops',
	distraction: 'Distraction resist',
	distractionresistance: 'Distraction resist',
};

function formatEffectLabel(effect: string): string {
	const e = effect.trim();
	const lower = e.toLowerCase();

	const coins = lower.match(/^coins:\+?(\d+)/);
	if (coins) return `+${coins[1]} Coins`;

	const xp = lower.match(/^xp:\+?(\d+)/);
	if (xp) return `+${xp[1]} XP`;

	const energy = lower.match(/^energy:\+?(\d+)/);
	if (energy) return `+${energy[1]} Energy`;

	const buff = lower.match(/^buff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)/);
	if (buff) return `${buff[1].toUpperCase()} ×${buff[2]} · ${buff[3]}`;

	const artifact = e.match(/^artifact:([^:]+):(\d+)/i);
	if (artifact) return `${artifact[1]} · ${artifact[2]}m`;

	const gear = lower.match(/^(?:gear:)?([a-z-]+)\s*[:=]\s*([+-]?\d+(?:\.\d+)?%?)/);
	if (gear) {
		const key = gear[1].replace(/-/g, '');
		const label = GEAR_LABELS[key] ?? gear[1].replace(/-/g, ' ');
		const value = gear[2].includes('%') ? gear[2] : `+${gear[2]}`;
		return `${label} ${value}`;
	}

	return e;
}

function shortMaterialName(name: string): string {
	return name.length > 10 ? name.slice(0, 9) + '…' : name;
}

function ownedQty(materials: OwnedMaterial[], materialId: string): number {
	return materials.find((m) => m.id === materialId)?.quantity ?? 0;
}

function materialLabel(materialId: string): { icon: string; name: string } {
	const def = getCraftingMaterials().find((m) => m.id === materialId);
	return {
		icon: def?.icon ?? '📦',
		name: def?.name ?? materialId,
	};
}

function missingSummary(missing: string[]): string {
	if (missing.length === 0) return 'Craft';
	const first = missing[0];
	if (missing.length === 1) return `Need ${first.replace('×', ' ×')}`;
	return `Need ${missing.length} mats`;
}

export const CraftingTab: React.FC<CraftingTabProps> = ({
	plugin,
	playerData,
	reloadPlayerData,
}) => {
	const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
	const [playerMaterials, setPlayerMaterials] = useState<OwnedMaterial[]>([]);
	const [mode, setMode] = useState<WorkshopMode>('recipes');
	const [filter, setFilter] = useState<FilterKey>('can');
	const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
	const [availableTemplates, setAvailableTemplates] = useState<RandomItemTemplate[]>([]);
	const [craftableTemplates, setCraftableTemplates] = useState<RandomItemTemplate[]>([]);
	const [heavyReady, setHeavyReady] = useState(false);
	const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_PAGE_SIZE);
	const [craftingBusy, setCraftingBusy] = useState(false);

	const { isMobile } = useMobileOptimizations();

	const loadCoreCrafting = async () => {
		await refreshAllCraftingData(plugin);
		setRecipes(CraftingEngine.getRecipes());
		try {
			const materials = await CraftingEngine.getPlayerMaterialsFromInventory(plugin.app);
			setPlayerMaterials(materials);
		} catch (error) {
			console.error('Error loading materials:', error);
		}
	};

	const loadHeavyCrafting = async () => {
		if (!playerData) return;
		const templates = RandomItemGenerator.getAvailableTemplates(playerData.level);
		setAvailableTemplates(templates);
		try {
			const craftable = await RandomItemGenerator.getCraftableTemplates(
				plugin.app,
				playerData.level
			);
			setCraftableTemplates(craftable);
		} catch (error) {
			console.error('Error loading craftable templates:', error);
		}
		setHeavyReady(true);
	};

	useEffect(() => {
		const init = async () => {
			await loadCoreCrafting();
			if (!isMobile && playerData) {
				await loadHeavyCrafting();
			}
		};

		void init();

		const onCraftingDataUpdate = () => {
			void init();
		};
		const onInventoryUpdated = () => {
			void CraftingEngine.getPlayerMaterialsFromInventory(plugin.app).then(setPlayerMaterials);
		};

		document.addEventListener('crafting-data-updated', onCraftingDataUpdate);
		window.addEventListener('inventory-updated', onInventoryUpdated);
		return () => {
			document.removeEventListener('crafting-data-updated', onCraftingDataUpdate);
			window.removeEventListener('inventory-updated', onInventoryUpdated);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- avoid playerData identity thrash
	}, [plugin, isMobile]);

	useEffect(() => {
		if (!isMobile || !playerData) return;
		if (mode !== 'experiment') return;
		if (heavyReady) return;
		void loadHeavyCrafting();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, mode, playerData?.level, heavyReady]);

	useEffect(() => {
		setMobileVisibleCount(MOBILE_PAGE_SIZE);
	}, [filter, mode]);

	const recipeRows = useMemo(() => {
		if (!playerData) return [];

		const rows = recipes.map((recipe) => {
			const check = CraftingEngine.canCraftRecipe(recipe, playerMaterials, playerData);
			return {
				recipe,
				canCraft: check.canCraft,
				missing: check.missingMaterials,
				category: normalizeRecipeCategory(recipe.category),
				custom: isVaultRecipe(recipe.id),
			};
		});

		const filtered = rows.filter((row) => {
			if (filter === 'can') return row.canCraft;
			if (filter === 'all') return true;
			return row.category === filter;
		});

		filtered.sort((a, b) => {
			if (a.canCraft !== b.canCraft) return a.canCraft ? -1 : 1;
			return a.recipe.name.localeCompare(b.recipe.name);
		});

		return filtered;
	}, [recipes, playerMaterials, playerData, filter]);

	const visibleRecipes = useMemo(() => {
		if (!isMobile) return recipeRows;
		return recipeRows.slice(0, mobileVisibleCount);
	}, [recipeRows, isMobile, mobileVisibleCount]);

	const selectedRecipe = useMemo(() => {
		if (!selectedRecipeId) return null;
		return recipes.find((r) => r.id === selectedRecipeId) ?? null;
	}, [selectedRecipeId, recipes]);

	const selectedCheck = useMemo(() => {
		if (!selectedRecipe || !playerData) {
			return { canCraft: false, missingMaterials: [] as string[] };
		}
		return CraftingEngine.canCraftRecipe(selectedRecipe, playerMaterials, playerData);
	}, [selectedRecipe, playerMaterials, playerData]);

	const startCrafting = async (recipe: CraftingRecipe) => {
		if (!playerData || craftingBusy) return;
		setCraftingBusy(true);
		try {
			const result = await CraftingEngine.craftItemWithInventory(
				plugin.app,
				recipe,
				playerData
			);
			if (result) {
				const materials = await CraftingEngine.getPlayerMaterialsFromInventory(plugin.app);
				setPlayerMaterials(materials);
				await reloadPlayerData?.();
				if (isMobile) setSelectedRecipeId(null);
			}
		} catch (error) {
			console.error('Error crafting item:', error);
		} finally {
			setCraftingBusy(false);
		}
	};

	const generateRandomItem = async (templateId?: string) => {
		if (!playerData || craftingBusy) return;
		setCraftingBusy(true);
		try {
			const result = await RandomItemGenerator.generateRandomItem(
				plugin.app,
				playerData.level,
				templateId
			);
			if (result) {
				const materials = await CraftingEngine.getPlayerMaterialsFromInventory(plugin.app);
				setPlayerMaterials(materials);
				const craftable = await RandomItemGenerator.getCraftableTemplates(
					plugin.app,
					playerData.level
				);
				setCraftableTemplates(craftable);
				await reloadPlayerData?.();
			}
		} catch (error) {
			console.error('Error generating random item:', error);
		} finally {
			setCraftingBusy(false);
		}
	};

	const closeDetail = () => setSelectedRecipeId(null);

	if (!playerData) {
		return (
			<div className={`${styles.workshop} ${styles.pixelCraftingShell}`} data-pixel-shell="crafting">
				Loading player data...
			</div>
		);
	}

	const outputEffects =
		selectedRecipe?.guaranteedItem?.effects ??
		selectedRecipe?.possibleResults?.[0]?.effects ??
		[];

	return (
		<div
			className={`${styles.workshop} ${styles.pixelCraftingShell}`}
			data-pixel-shell="crafting"
			data-gamification-mobile={isMobile ? 'true' : 'false'}
		>
			<header className={styles.header}>
				<div className={styles.headerTitle}>
					<span className={styles.systemLabel}>SYSTEM</span>
					<h2 className={styles.workshopTitle}>WORKSHOP</h2>
				</div>
				<span className={styles.headerChip}>materials only</span>
			</header>

			<section className={styles.materialsStrip} aria-label="Your materials">
				{playerMaterials.length > 0 ? (
					playerMaterials.map((mat) => (
						<div key={mat.id} className={styles.materialChip} title={mat.name}>
							<span className={styles.materialChipIcon}>{mat.icon}</span>
							<span className={styles.materialChipName}>{mat.name}</span>
							<span className={styles.materialChipQty}>×{mat.quantity}</span>
						</div>
					))
				) : (
					<p className={styles.emptyStrip}>
						No materials yet — complete quests, habits, and pomodoros to earn some.
					</p>
				)}
			</section>

			<div className={styles.controls}>
				<div className={styles.filters} role="tablist" aria-label="Recipe filters">
					{FILTERS.map((f) => (
						<button
							key={f.key}
							type="button"
							role="tab"
							aria-selected={filter === f.key}
							className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
							onClick={() => setFilter(f.key)}
						>
							{f.label}
						</button>
					))}
				</div>
				<div className={styles.modeToggle} role="tablist" aria-label="Workshop mode">
					<button
						type="button"
						role="tab"
						aria-selected={mode === 'recipes'}
						className={`${styles.modeBtn} ${mode === 'recipes' ? styles.modeActive : ''}`}
						onClick={() => setMode('recipes')}
					>
						Recipes
					</button>
					<span className={styles.modeSep} aria-hidden="true">
						|
					</span>
					<button
						type="button"
						role="tab"
						aria-selected={mode === 'experiment'}
						className={`${styles.modeBtn} ${mode === 'experiment' ? styles.modeActive : ''}`}
						onClick={() => setMode('experiment')}
					>
						Experiment
					</button>
				</div>
			</div>

			{mode === 'recipes' ? (
				<>
					<ul className={styles.recipeList}>
						{visibleRecipes.length === 0 ? (
							<li className={styles.emptyList}>
								{filter === 'can'
									? 'Nothing craftable right now. Switch to All or gather more materials.'
									: 'No recipes in this filter.'}
							</li>
						) : (
							visibleRecipes.map(({ recipe, canCraft, missing, custom }) => (
								<li key={recipe.id}>
									<button
										type="button"
										className={`${styles.recipeRow} ${
											selectedRecipeId === recipe.id ? styles.recipeRowSelected : ''
										} ${canCraft ? styles.recipeRowReady : styles.recipeRowLocked}`}
										onClick={() => setSelectedRecipeId(recipe.id)}
									>
										<span className={styles.recipeIcon}>{recipe.icon}</span>
										<span className={styles.recipeMain}>
											<span className={styles.recipeNameRow}>
												<span className={styles.recipeName}>{recipe.name}</span>
												{custom && <span className={styles.customBadge}>CUSTOM</span>}
											</span>
											<span className={styles.recipeMats}>
												{recipe.materials
													.filter((m) => m.required)
													.map((m) => {
														const { icon, name } = materialLabel(m.materialId);
														const have = ownedQty(playerMaterials, m.materialId);
														const ok = have >= m.quantity;
														return (
															<span
																key={`${recipe.id}-${m.materialId}`}
																className={`${styles.matChip} ${
																	ok ? styles.matOk : styles.matMissing
																}`}
																title={`${name}: ${have}/${m.quantity}`}
															>
																<span className={styles.matChipIcon}>{icon}</span>
																<span className={styles.matChipName}>
																	{shortMaterialName(name)}
																</span>
																<span className={styles.matChipFrac}>
																	{have}/{m.quantity}
																</span>
															</span>
														);
													})}
											</span>
										</span>
										<span
											className={`${styles.rowAction} ${
												canCraft ? styles.rowActionReady : styles.rowActionNeed
											}`}
										>
											{canCraft ? 'Craft' : missingSummary(missing)}
										</span>
									</button>
								</li>
							))
						)}
					</ul>

					{isMobile && recipeRows.length > mobileVisibleCount && (
						<button
							type="button"
							className={styles.showMore}
							onClick={() => setMobileVisibleCount((n) => n + MOBILE_PAGE_SIZE)}
						>
							Show more
						</button>
					)}
				</>
			) : (
				<>
					<ul className={styles.recipeList}>
						{availableTemplates.length === 0 ? (
							<li className={styles.emptyList}>No experiment templates unlocked.</li>
						) : craftableTemplates.length === 0 && availableTemplates.length > 0 ? (
							<li className={styles.emptyList}>
								Need more materials before experimenting. Gather crystals, herbs, or essence.
							</li>
						) : null}
						{(isMobile
							? availableTemplates.slice(0, mobileVisibleCount)
							: availableTemplates
						).map((template) => {
							const can = craftableTemplates.some((t) => t.id === template.id);
							const need = template.materialRequirements.quantity;
							const cats = template.materialRequirements.categories;
							return (
								<li key={template.id}>
									<button
										type="button"
										className={`${styles.recipeRow} ${
											can ? styles.recipeRowReady : styles.recipeRowLocked
										}`}
										onClick={() => {
											if (can && !craftingBusy) void generateRandomItem(template.id);
										}}
										disabled={craftingBusy || !can}
										aria-label={
											can
												? `Experiment: ${template.name}`
												: `${template.name} — need materials`
										}
									>
										<span className={styles.recipeIcon}>{template.icon}</span>
										<span className={styles.recipeMain}>
											<span className={styles.recipeNameRow}>
												<span className={styles.recipeName}>{template.name}</span>
												<span className={styles.rarityBadge} data-rarity={template.rarity}>
													{template.rarity}
												</span>
											</span>
											<span className={styles.recipeMats}>
												{cats.map((cat) => (
													<span
														key={`${template.id}-${cat}`}
														className={`${styles.matChip} ${
															can ? styles.matOk : styles.matMissing
														}`}
														title={`${need}× from ${cat}`}
													>
														<span className={styles.matChipName}>{cat}</span>
														<span className={styles.matChipFrac}>{need}×</span>
													</span>
												))}
											</span>
										</span>
										<span
											className={`${styles.rowAction} ${
												can ? styles.rowActionReady : styles.rowActionNeed
											}`}
										>
											{can ? 'Roll' : 'Need mats'}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
					{isMobile && availableTemplates.length > mobileVisibleCount && (
						<button
							type="button"
							className={styles.showMore}
							onClick={() => setMobileVisibleCount((n) => n + MOBILE_PAGE_SIZE)}
						>
							Show more
						</button>
					)}
				</>
			)}

			{/* Desktop / inline detail — big icon left, details right */}
			{mode === 'recipes' && selectedRecipe && !isMobile && (
				<section className={styles.detailPanel}>
					<button
						type="button"
						className={styles.detailClose}
						onClick={closeDetail}
						aria-label="Close recipe detail"
					>
						✕
					</button>
					<div className={styles.detailBody}>
						<span className={styles.detailIcon} aria-hidden="true">
							{selectedRecipe.icon}
						</span>
						<div className={styles.detailInfo}>
							<h3 className={styles.detailTitle}>{selectedRecipe.name}</h3>
							<p className={styles.detailMeta}>
								{normalizeRecipeCategory(selectedRecipe.category)} ·{' '}
								{selectedRecipe.guaranteedItem?.rarity ??
									selectedRecipe.possibleResults?.[0]?.rarity ??
									'common'}
								{isVaultRecipe(selectedRecipe.id) ? ' · custom' : ''}
							</p>
							<div className={styles.detailNeeds}>
								<span className={styles.detailLabel}>Needs</span>
								{selectedRecipe.materials
									.filter((m) => m.required)
									.map((m) => {
										const { icon, name } = materialLabel(m.materialId);
										const have = ownedQty(playerMaterials, m.materialId);
										const ok = have >= m.quantity;
										return (
											<div
												key={m.materialId}
												className={`${styles.needRow} ${ok ? styles.matOk : styles.matMissing}`}
											>
												<span className={styles.needLeft}>
													<span className={styles.matChipIcon}>{icon}</span>
													<span className={styles.needName}>{name.toLowerCase()}</span>
													<span className={styles.needHave}>
														{have}/{m.quantity}
													</span>
												</span>
												<span className={styles.needCheck} aria-hidden="true">
													{ok ? '✓' : '○'}
												</span>
											</div>
										);
									})}
							</div>
							<div className={styles.detailEffects}>
								<span className={styles.detailLabel}>Effect</span>
								{(outputEffects.length > 0 ? outputEffects : ['Cosmetic item']).map(
									(eff, i) => (
										<div key={i} className={styles.effectLine}>
											<span className={styles.effectBadge} aria-hidden="true">
												⇈
											</span>
											<span className={styles.effectText}>
												{formatEffectLabel(eff)}
											</span>
										</div>
									)
								)}
								{selectedRecipe.possibleResults &&
									selectedRecipe.possibleResults.length > 1 && (
										<div className={styles.effectHint}>
											Random result from weighted pool
										</div>
									)}
							</div>
						</div>
					</div>
					<button
						type="button"
						className={styles.primaryCraft}
						disabled={!selectedCheck.canCraft || craftingBusy}
						onClick={() => void startCrafting(selectedRecipe)}
					>
						{selectedCheck.canCraft
							? 'Craft'
							: missingSummary(selectedCheck.missingMaterials)}
					</button>
				</section>
			)}

			{/* Mobile bottom sheet — same layout */}
			{mode === 'recipes' && selectedRecipe && isMobile && (
				<>
					<button
						type="button"
						className={styles.sheetBackdrop}
						aria-label="Close recipe detail"
						onClick={closeDetail}
					/>
					<section className={styles.detailSheet} role="dialog" aria-modal="true">
						<div className={styles.sheetHandle} />
						<button
							type="button"
							className={styles.detailClose}
							onClick={closeDetail}
							aria-label="Close recipe detail"
						>
							✕
						</button>
						<div className={styles.detailBody}>
							<span className={styles.detailIcon} aria-hidden="true">
								{selectedRecipe.icon}
							</span>
							<div className={styles.detailInfo}>
								<h3 className={styles.detailTitle}>{selectedRecipe.name}</h3>
								<p className={styles.detailMeta}>
									{normalizeRecipeCategory(selectedRecipe.category)} ·{' '}
									{selectedRecipe.guaranteedItem?.rarity ??
										selectedRecipe.possibleResults?.[0]?.rarity ??
										'common'}
								</p>
								<div className={styles.detailNeeds}>
									<span className={styles.detailLabel}>Needs</span>
									{selectedRecipe.materials
										.filter((m) => m.required)
										.map((m) => {
											const { icon, name } = materialLabel(m.materialId);
											const have = ownedQty(playerMaterials, m.materialId);
											const ok = have >= m.quantity;
											return (
												<div
													key={m.materialId}
													className={`${styles.needRow} ${
														ok ? styles.matOk : styles.matMissing
													}`}
												>
													<span className={styles.needLeft}>
														<span className={styles.matChipIcon}>{icon}</span>
														<span className={styles.needName}>
															{name.toLowerCase()}
														</span>
														<span className={styles.needHave}>
															{have}/{m.quantity}
														</span>
													</span>
													<span className={styles.needCheck} aria-hidden="true">
														{ok ? '✓' : '○'}
													</span>
												</div>
											);
										})}
								</div>
								<div className={styles.detailEffects}>
									<span className={styles.detailLabel}>Effect</span>
									{(outputEffects.length > 0 ? outputEffects : ['Cosmetic item']).map(
										(eff, i) => (
											<div key={i} className={styles.effectLine}>
												<span className={styles.effectBadge} aria-hidden="true">
													⇈
												</span>
												<span className={styles.effectText}>
													{formatEffectLabel(eff)}
												</span>
											</div>
										)
									)}
								</div>
							</div>
						</div>
						<button
							type="button"
							className={`${styles.primaryCraft} ${styles.stickyCraft}`}
							disabled={!selectedCheck.canCraft || craftingBusy}
							onClick={() => void startCrafting(selectedRecipe)}
						>
							{selectedCheck.canCraft
								? 'Craft'
								: missingSummary(selectedCheck.missingMaterials)}
						</button>
					</section>
				</>
			)}

		</div>
	);
};
