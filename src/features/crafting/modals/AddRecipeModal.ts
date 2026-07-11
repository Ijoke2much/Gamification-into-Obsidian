import { App, Modal, Setting } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import type { CraftingRecipe } from '../types/CraftingTypes';
import { ensureRecipesFile, upsertVaultRecipe, notifyCraftingDataUpdated } from '../utils/recipesParser';
import { getCraftingMaterials } from '../utils/craftingMaterialRegistry';
import { refreshAllCraftingData } from '../utils/craftingDataSync';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

const CATEGORIES = [
	'consumable',
	'weapon',
	'armor',
	'tool',
	'artifact',
	'mystical',
	'decoration',
] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;
const STATIONS = ['workbench', 'alchemy_lab', 'forge', 'enchanting_table'] as const;
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

type MaterialRow = { materialId: string; quantity: number; required: boolean };

function slugify(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export class AddRecipeModal extends Modal {
	private plugin: GamifiedObsidianPlugin;
	private onSubmit: () => void;
	private isEdit: boolean;

	id = '';
	name = '';
	icon = '📜';
	description = '';
	category: CraftingRecipe['category'] = 'consumable';
	difficulty: CraftingRecipe['difficulty'] = 'easy';
	craftingTime = 30;
	skillRequired = 1;
	craftingStation: CraftingRecipe['craftingStation'] = 'workbench';
	xpReward = 10;
	boogersReward = 5;
	skillXp = 5;
	materialRows: MaterialRow[] = [{ materialId: 'herb', quantity: 1, required: true }];
	outputName = '';
	outputCategory = 'consumable';
	outputRarity: (typeof RARITIES)[number] = 'common';
	outputIcon = '🎁';
	outputDescription = '';
	outputEffects = '';

	private materialsContainerEl?: HTMLElement;

	constructor(
		app: App,
		plugin: GamifiedObsidianPlugin,
		onSubmit: () => void,
		recipeToEdit?: CraftingRecipe
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.isEdit = !!recipeToEdit;

		if (recipeToEdit) {
			this.id = recipeToEdit.id;
			this.name = recipeToEdit.name;
			this.icon = recipeToEdit.icon;
			this.description = recipeToEdit.description;
			this.category = recipeToEdit.category;
			this.difficulty = recipeToEdit.difficulty;
			this.craftingTime = recipeToEdit.craftingTime;
			this.skillRequired = recipeToEdit.skillRequired;
			this.craftingStation = recipeToEdit.craftingStation ?? 'workbench';
			this.xpReward = recipeToEdit.xpReward;
			this.boogersReward = recipeToEdit.boogersReward;
			this.skillXp = recipeToEdit.skillXp;
			this.materialRows =
				recipeToEdit.materials.length > 0
					? recipeToEdit.materials.map((m) => ({
							materialId: m.materialId,
							quantity: m.quantity,
							required: m.required,
						}))
					: [{ materialId: 'herb', quantity: 1, required: true }];

			if (recipeToEdit.guaranteedItem) {
				this.outputName = recipeToEdit.guaranteedItem.name;
				this.outputCategory = recipeToEdit.guaranteedItem.category;
				this.outputRarity = recipeToEdit.guaranteedItem.rarity as (typeof RARITIES)[number];
				this.outputIcon = recipeToEdit.guaranteedItem.icon;
				this.outputDescription = recipeToEdit.guaranteedItem.description;
				this.outputEffects = recipeToEdit.guaranteedItem.effects.join('\n');
			}
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: this.isEdit ? 'Edit recipe' : 'Add recipe' });
		contentEl.createEl('p', {
			cls: 'mod-muted',
			text: 'Defines materials required and the item or artifact produced. Saved to Recipes.md.',
		});

		new Setting(contentEl).setName('Recipe name').addText((text) =>
			text.setValue(this.name).onChange((v) => {
				this.name = v;
				if (!this.isEdit) this.id = slugify(v);
			})
		);

		new Setting(contentEl).setName('Recipe id').addText((text) =>
			text
				.setValue(this.id)
				.setDisabled(this.isEdit)
				.onChange((v) => {
					this.id = slugify(v);
				})
		);

		new Setting(contentEl).setName('Icon').addText((text) =>
			text.setValue(this.icon).onChange((v) => {
				this.icon = v || '📜';
			})
		);

		new Setting(contentEl).setName('Category').addDropdown((dropdown) => {
			for (const c of CATEGORIES) dropdown.addOption(c, c);
			dropdown.setValue(this.category).onChange((v) => {
				this.category = v as CraftingRecipe['category'];
			});
		});

		new Setting(contentEl).setName('Difficulty').addDropdown((dropdown) => {
			for (const d of DIFFICULTIES) dropdown.addOption(d, d);
			dropdown.setValue(this.difficulty).onChange((v) => {
				this.difficulty = v as CraftingRecipe['difficulty'];
			});
		});

		new Setting(contentEl).setName('Craft time (seconds)').addText((text) =>
			text.setValue(String(this.craftingTime)).onChange((v) => {
				this.craftingTime = parseInt(v, 10) || 30;
			})
		);

		new Setting(contentEl).setName('Skill required').addText((text) =>
			text.setValue(String(this.skillRequired)).onChange((v) => {
				this.skillRequired = parseInt(v, 10) || 1;
			})
		);

		new Setting(contentEl).setName('Station').addDropdown((dropdown) => {
			for (const s of STATIONS) dropdown.addOption(s, s);
			dropdown.setValue(this.craftingStation ?? 'workbench').onChange((v) => {
				this.craftingStation = v as CraftingRecipe['craftingStation'];
			});
		});

		contentEl.createEl('h3', { text: 'Materials' });
		this.materialsContainerEl = contentEl.createDiv();
		this.renderMaterialRows();

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText('＋ Add material row').onClick(() => {
				this.materialRows.push({ materialId: 'herb', quantity: 1, required: true });
				this.renderMaterialRows();
			})
		);

		contentEl.createEl('h3', { text: 'Output (crafted item / artifact)' });

		new Setting(contentEl).setName('Output name').addText((text) =>
			text.setValue(this.outputName).onChange((v) => {
				this.outputName = v;
			})
		);

		new Setting(contentEl).setName('Output category').addDropdown((dropdown) => {
			for (const c of CATEGORIES) dropdown.addOption(c, c);
			dropdown.setValue(this.outputCategory).onChange((v) => {
				this.outputCategory = v;
			});
		});

		new Setting(contentEl).setName('Output rarity').addDropdown((dropdown) => {
			for (const r of RARITIES) dropdown.addOption(r, r);
			dropdown.setValue(this.outputRarity).onChange((v) => {
				this.outputRarity = v as (typeof RARITIES)[number];
			});
		});

		new Setting(contentEl).setName('Output icon').addText((text) =>
			text.setValue(this.outputIcon).onChange((v) => {
				this.outputIcon = v || '🎁';
			})
		);

		new Setting(contentEl).setName('Output description').addTextArea((text) =>
			text.setValue(this.outputDescription).onChange((v) => {
				this.outputDescription = v;
			})
		);

		new Setting(contentEl)
			.setName('Output effects (one per line)')
			.setDesc('e.g. Restore 25 Energy, Focus +50% for 1 hour')
			.addTextArea((text) =>
				text.setValue(this.outputEffects).onChange((v) => {
					this.outputEffects = v;
				})
			);

		new Setting(contentEl).setName('Recipe description').addTextArea((text) =>
			text.setValue(this.description).onChange((v) => {
				this.description = v;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(this.isEdit ? 'Save recipe' : 'Add recipe')
				.setCta()
				.onClick(() => void this.handleSubmit())
		);
	}

	private renderMaterialRows(): void {
		if (!this.materialsContainerEl) return;
		this.materialsContainerEl.empty();

		const knownMaterials = getCraftingMaterials();

		this.materialRows.forEach((row, index) => {
			const rowSetting = new Setting(this.materialsContainerEl!)
				.setName(`Material ${index + 1}`)
				.addDropdown((dropdown) => {
					for (const m of knownMaterials) {
						dropdown.addOption(m.id, `${m.icon} ${m.name} (${m.id})`);
					}
					if (!knownMaterials.some((m) => m.id === row.materialId) && row.materialId) {
						dropdown.addOption(row.materialId, row.materialId);
					}
					dropdown.setValue(row.materialId).onChange((v) => {
						row.materialId = v;
					});
				})
				.addText((text) =>
					text.setValue(String(row.quantity)).onChange((v) => {
						row.quantity = parseInt(v, 10) || 1;
					})
				);

			rowSetting.addToggle((toggle) =>
				toggle.setValue(row.required).onChange((v) => {
					row.required = v;
				})
			);
			rowSetting.setDesc('Required');

			rowSetting.addButton((btn) =>
				btn.setButtonText('Remove').onClick(() => {
					this.materialRows.splice(index, 1);
					if (this.materialRows.length === 0) {
						this.materialRows.push({ materialId: 'herb', quantity: 1, required: true });
					}
					this.renderMaterialRows();
				})
			);
		});
	}

	private async handleSubmit(): Promise<void> {
		if (!this.name.trim()) {
			pixelNotice('Please enter a recipe name.');
			return;
		}
		if (!this.outputName.trim()) {
			pixelNotice('Please enter an output item name.');
			return;
		}
		if (this.materialRows.length === 0) {
			pixelNotice('Add at least one material.');
			return;
		}

		const id = this.id.trim() || slugify(this.name);
		const effects = this.outputEffects
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);

		const recipe: CraftingRecipe = {
			id,
			name: this.name.trim(),
			description: this.description.trim(),
			icon: this.icon.trim() || '📜',
			category: this.category,
			materials: this.materialRows.map((row) => ({
				materialId: row.materialId,
				quantity: row.quantity,
				required: row.required,
			})),
			craftingTime: this.craftingTime,
			difficulty: this.difficulty,
			skillRequired: this.skillRequired,
			craftingStation: this.craftingStation,
			guaranteedItem: {
				name: this.outputName.trim(),
				category: this.outputCategory,
				rarity: this.outputRarity,
				effects,
				icon: this.outputIcon.trim() || '🎁',
				description: this.outputDescription.trim(),
				quality: 'basic',
			},
			xpReward: this.xpReward,
			boogersReward: this.boogersReward,
			skillXp: this.skillXp,
		};

		const created = await ensureRecipesFile(this.plugin);
		if (!created) {
			pixelNotice('Could not create Recipes.md.');
			return;
		}

		await upsertVaultRecipe(this.plugin, recipe);
		await refreshAllCraftingData(this.plugin);
		notifyCraftingDataUpdated();
		pixelNotice(this.isEdit ? `Updated recipe "${recipe.name}".` : `Added recipe "${recipe.name}".`);
		this.onSubmit();
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
