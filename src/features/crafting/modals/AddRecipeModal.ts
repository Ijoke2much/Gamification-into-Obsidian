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
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

/** Presets write machine-readable inventory effect lines that Use actually applies. */
const EFFECT_PRESETS: { id: string; label: string; line: string }[] = [
	{ id: 'energy15', label: '+15 Energy', line: 'energy:+15' },
	{ id: 'energy25', label: '+25 Energy', line: 'energy:+25' },
	{ id: 'energy50', label: '+50 Energy', line: 'energy:+50' },
	{ id: 'xp50', label: '+50 XP', line: 'xp:+50' },
	{ id: 'xp100', label: '+100 XP', line: 'xp:+100' },
	{ id: 'coins30', label: '+30 Coins', line: 'coins:+30' },
	{ id: 'buffXp', label: 'XP ×1.5 · 1h', line: 'buff:xp;mult=1.5;dur=1h' },
	{ id: 'buffCoins', label: 'Coins ×1.25 · 1h', line: 'buff:coins;mult=1.25;dur=1h' },
	{ id: 'buffRewards', label: 'Rewards ×1.2 · 30m', line: 'buff:rewards;mult=1.2;dur=30m' },
	{
		id: 'artifactWalk',
		label: 'Real-world: walk 20m',
		line: 'artifact:Take a walk:20:health',
	},
	{
		id: 'artifactBreak',
		label: 'Real-world: mindful break 15m',
		line: 'artifact:Take a mindful break:15:health',
	},
	{ id: 'gearFocus', label: 'Gear: Focus +10', line: 'gear:focus:=10' },
];

type MaterialRow = { materialId: string; quantity: number };

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
	materialRows: MaterialRow[] = [{ materialId: 'herb', quantity: 1 }];
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
			this.materialRows =
				recipeToEdit.materials.length > 0
					? recipeToEdit.materials.map((m) => ({
							materialId: m.materialId,
							quantity: m.quantity,
						}))
					: [{ materialId: 'herb', quantity: 1 }];

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
			text: 'Materials in → usable item out. Saved to Recipes.md (Settings → Game Data Hub).',
		});

		new Setting(contentEl).setName('Recipe name').addText((text) =>
			text.setValue(this.name).onChange((v) => {
				this.name = v;
				if (!this.isEdit) this.id = slugify(v);
			})
		);

		new Setting(contentEl)
			.setName('Recipe id')
			.setDesc('Auto-filled from the name. Used to merge with built-in recipes.')
			.addText((text) =>
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

		contentEl.createEl('h3', { text: 'Materials' });
		this.materialsContainerEl = contentEl.createDiv();
		this.renderMaterialRows();

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText('＋ Add material').onClick(() => {
				this.materialRows.push({ materialId: 'herb', quantity: 1 });
				this.renderMaterialRows();
			})
		);

		contentEl.createEl('h3', { text: 'Output (crafted item)' });

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

		const effectsSetting = new Setting(contentEl)
			.setName('Output effects')
			.setDesc('Pick presets (recommended). Lines are written as machine form inventory effects.');

		const effectsPreview = effectsSetting.controlEl.createEl('div', {
			cls: 'mod-muted',
			attr: { style: 'margin-bottom: 8px; font-size: 12px; width: 100%;' },
		});
		const refreshEffectsPreview = () => {
			const lines = this.outputEffects
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean);
			effectsPreview.setText(
				lines.length > 0 ? `Active: ${lines.join(' · ')}` : 'No effects yet — add a preset below.'
			);
		};
		refreshEffectsPreview();

		let effectsTextArea: { setValue: (v: string) => unknown } | null = null;

		new Setting(contentEl).setName('Add effect preset').addDropdown((dropdown) => {
			dropdown.addOption('', 'Choose a preset…');
			for (const p of EFFECT_PRESETS) dropdown.addOption(p.id, p.label);
			dropdown.onChange((v) => {
				const preset = EFFECT_PRESETS.find((p) => p.id === v);
				if (!preset) return;
				const existing = this.outputEffects
					.split('\n')
					.map((l) => l.trim())
					.filter(Boolean);
				if (!existing.includes(preset.line)) {
					existing.push(preset.line);
					this.outputEffects = existing.join('\n');
					effectsTextArea?.setValue(this.outputEffects);
					refreshEffectsPreview();
				}
				dropdown.setValue('');
			});
		});

		new Setting(contentEl)
			.setName('Effect lines (advanced)')
			.setDesc('Optional edit. Format: energy:+25 · xp:+100 · buff:xp;mult=1.5;dur=1h')
			.addTextArea((text) => {
				effectsTextArea = text;
				text.setValue(this.outputEffects).onChange((v) => {
					this.outputEffects = v;
					refreshEffectsPreview();
				});
			});

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
					text
						.setPlaceholder('qty')
						.setValue(String(row.quantity))
						.onChange((v) => {
							row.quantity = parseInt(v, 10) || 1;
						})
				);

			rowSetting.addButton((btn) =>
				btn.setButtonText('Remove').onClick(() => {
					this.materialRows.splice(index, 1);
					if (this.materialRows.length === 0) {
						this.materialRows.push({ materialId: 'herb', quantity: 1 });
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

		// Silent schema defaults — workshop is materials-only; these fields stay for file compat.
		const recipe: CraftingRecipe = {
			id,
			name: this.name.trim(),
			description: this.description.trim(),
			icon: this.icon.trim() || '📜',
			category: this.category,
			materials: this.materialRows.map((row) => ({
				materialId: row.materialId,
				quantity: row.quantity,
				required: true,
			})),
			craftingTime: 0,
			difficulty: 'easy',
			skillRequired: 0,
			craftingStation: 'workbench',
			guaranteedItem: {
				name: this.outputName.trim(),
				category: this.outputCategory,
				rarity: this.outputRarity,
				effects,
				icon: this.outputIcon.trim() || '🎁',
				description: this.outputDescription.trim(),
				quality: 'basic',
			},
			xpReward: 10,
			boogersReward: 5,
			skillXp: 0,
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
