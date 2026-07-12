import { App, Modal, Setting } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import type { CraftingMaterial } from '../types/CraftingTypes';
import {
	ensureMaterialsFile,
	upsertVaultMaterial,
	notifyCraftingDataUpdated,
} from '../utils/materialsParser';
import { refreshAllCraftingData } from '../utils/craftingDataSync';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const CATEGORIES = ['herb', 'mineral', 'essence', 'crystal', 'organic', 'mystical', 'component'] as const;
const QUALITIES = ['fresh', 'normal', 'dried', 'refined', 'masterwork'] as const;
const SOURCES = ['gathering', 'crafting', 'trading', 'reward', 'quest'] as const;

const QUALITY_MULTIPLIERS: Record<(typeof QUALITIES)[number], number> = {
	fresh: 1.5,
	normal: 1.0,
	dried: 0.8,
	refined: 1.3,
	masterwork: 2.0,
};

function slugify(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export class AddMaterialModal extends Modal {
	private plugin: GamifiedObsidianPlugin;
	private onSubmit: () => void;
	private isEdit: boolean;
	private originalId?: string;

	id = '';
	name = '';
	icon = '📦';
	category: CraftingMaterial['category'] = 'organic';
	rarity: CraftingMaterial['rarity'] = 'common';
	description = '';
	baseValue = 1;
	quality: CraftingMaterial['quality'] = 'normal';
	qualityMultiplier = 1.0;
	source: CraftingMaterial['source'] = 'gathering';

	constructor(
		app: App,
		plugin: GamifiedObsidianPlugin,
		onSubmit: () => void,
		materialToEdit?: CraftingMaterial
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		if (materialToEdit) {
			this.isEdit = true;
			this.originalId = materialToEdit.id;
			this.id = materialToEdit.id;
			this.name = materialToEdit.name;
			this.icon = materialToEdit.icon || '📦';
			this.category = materialToEdit.category;
			this.rarity = materialToEdit.rarity;
			this.description = materialToEdit.description || '';
			this.baseValue = materialToEdit.baseValue;
			this.quality = materialToEdit.quality;
			this.qualityMultiplier = materialToEdit.qualityMultiplier;
			this.source = materialToEdit.source;
		} else {
			this.isEdit = false;
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', {
			text: this.isEdit ? 'Edit crafting material' : 'Add crafting material',
		});
		contentEl.createEl('p', {
			cls: 'mod-muted',
			text: 'Saved to Materials.md and merged with built-in defaults by id.',
		});

		new Setting(contentEl).setName('Name').addText((text) =>
			text
				.setPlaceholder('Moonleaf')
				.setValue(this.name)
				.onChange((v) => {
					this.name = v;
					if (!this.isEdit || !this.id) this.id = slugify(v);
				})
		);

		new Setting(contentEl).setName('Id (slug)').addText((text) =>
			text
				.setPlaceholder('moonleaf')
				.setValue(this.id)
				.setDisabled(this.isEdit)
				.onChange((v) => {
					this.id = slugify(v);
				})
		);

		new Setting(contentEl).setName('Icon').addText((text) =>
			text.setPlaceholder('🌙').setValue(this.icon).onChange((v) => {
				this.icon = v || '📦';
			})
		);

		new Setting(contentEl).setName('Category').addDropdown((dropdown) => {
			for (const c of CATEGORIES) dropdown.addOption(c, c);
			dropdown.setValue(this.category).onChange((v) => {
				this.category = v as CraftingMaterial['category'];
			});
		});

		new Setting(contentEl).setName('Rarity').addDropdown((dropdown) => {
			for (const r of RARITIES) dropdown.addOption(r, r);
			dropdown.setValue(this.rarity).onChange((v) => {
				this.rarity = v as CraftingMaterial['rarity'];
			});
		});

		new Setting(contentEl).setName('Quality').addDropdown((dropdown) => {
			for (const q of QUALITIES) dropdown.addOption(q, q);
			dropdown.setValue(this.quality).onChange((v) => {
				this.quality = v as CraftingMaterial['quality'];
				this.qualityMultiplier = QUALITY_MULTIPLIERS[this.quality];
			});
		});

		new Setting(contentEl).setName('Base value').addText((text) =>
			text.setValue(String(this.baseValue)).onChange((v) => {
				this.baseValue = parseInt(v, 10) || 1;
			})
		);

		new Setting(contentEl).setName('Source').addDropdown((dropdown) => {
			for (const s of SOURCES) dropdown.addOption(s, s);
			dropdown.setValue(this.source).onChange((v) => {
				this.source = v as CraftingMaterial['source'];
			});
		});

		new Setting(contentEl).setName('Description').addTextArea((text) =>
			text.setValue(this.description).onChange((v) => {
				this.description = v;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(this.isEdit ? 'Save material' : 'Add material')
				.setCta()
				.onClick(() => void this.handleSubmit())
		);
	}

	private async handleSubmit(): Promise<void> {
		if (!this.name.trim()) {
			pixelNotice('Please enter a material name.');
			return;
		}

		const id = this.id.trim() || slugify(this.name);
		if (!id) {
			pixelNotice('Please enter a valid material id.');
			return;
		}

		const material: CraftingMaterial = {
			id,
			name: this.name.trim(),
			icon: this.icon.trim() || '📦',
			category: this.category,
			rarity: this.rarity,
			description: this.description.trim(),
			baseValue: this.baseValue,
			quality: this.quality,
			qualityMultiplier: this.qualityMultiplier,
			source: this.source,
		};

		const created = await ensureMaterialsFile(this.plugin);
		if (!created) {
			pixelNotice('Could not create Materials.md.');
			return;
		}

		await upsertVaultMaterial(this.plugin, material);
		await refreshAllCraftingData(this.plugin);
		notifyCraftingDataUpdated();
		pixelNotice(this.isEdit ? `Updated material "${material.name}".` : `Added material "${material.name}".`);
		this.onSubmit();
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
