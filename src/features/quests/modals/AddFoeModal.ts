import { App, Modal, Setting, type TextComponent } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import type { JourneyAffinityRule, JourneyFoeDefinition } from '../data/journeyFoeCatalog';
import { ensureFoesFile, upsertVaultFoe } from '../utils/foesParser';
import { ensureJourneyBoard } from '../utils/journeyBoardService';
import { resolveFoeSpriteUrl, saveFoeSpriteToVault } from '../utils/foeSprites';
import { getAllSkills, type SkillMetadata } from '../../../shared/utils/skillDiscovery';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const LOOT_TIERS = ['common', 'uncommon', 'rare'] as const;
const AFFINITY_KINDS = [
	['neutral', 'Neutral — any task lands'],
	['random', 'Random — skill or class each board'],
	['random-skill', 'Random skill each board'],
	['random-class', 'Random class each board'],
	['fixed-skill', 'Always a specific skill'],
	['fixed-class', 'Always a specific class'],
] as const;

type AffinityKind = (typeof AFFINITY_KINDS)[number][0];

function slugify(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export class AddFoeModal extends Modal {
	private plugin: GamifiedObsidianPlugin;
	private onSubmit: () => void;
	private isEdit: boolean;

	id = '';
	name = '';
	emoji = '👾';
	description = '';
	difficulty: JourneyFoeDefinition['difficulty'] = 'medium';
	maxHp = 100;
	windowDays = 7;
	lootTier: JourneyFoeDefinition['lootTier'] = 'common';
	pathWhisper = '';
	affinityKind: AffinityKind = 'random';
	fixedTarget = '';
	sprite = '';

	private skills: SkillMetadata[] = [];
	private fixedTargetContainerEl?: HTMLElement;
	private spriteTextComponent?: TextComponent;
	private spritePreviewEl?: HTMLElement;

	constructor(
		app: App,
		plugin: GamifiedObsidianPlugin,
		onSubmit: () => void,
		foeToEdit?: JourneyFoeDefinition
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.isEdit = !!foeToEdit;

		if (foeToEdit) {
			this.id = foeToEdit.id;
			this.name = foeToEdit.name;
			this.emoji = foeToEdit.emoji;
			this.description = foeToEdit.description;
			this.difficulty = foeToEdit.difficulty;
			this.maxHp = foeToEdit.maxHp;
			this.windowDays = foeToEdit.windowDays;
			this.lootTier = foeToEdit.lootTier;
			this.pathWhisper = foeToEdit.pathWhisper;
			this.sprite = foeToEdit.sprite ?? '';

			const rule = foeToEdit.affinityRule;
			this.affinityKind = rule.kind;
			if (rule.kind === 'fixed-skill') this.fixedTarget = rule.skill;
			if (rule.kind === 'fixed-class') this.fixedTarget = rule.className;
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: this.isEdit ? 'Edit foe' : 'Create foe' });
		contentEl.createEl('p', {
			cls: 'mod-muted',
			text: 'Custom Journey foes are saved to Foes.md and appear on the foe board.',
		});

		new Setting(contentEl).setName('Foe name').addText((text) =>
			text.setValue(this.name).onChange((v) => {
				this.name = v;
				if (!this.isEdit) this.id = slugify(v);
			})
		);

		new Setting(contentEl).setName('Foe id').addText((text) =>
			text
				.setValue(this.id)
				.setDisabled(this.isEdit)
				.onChange((v) => {
					this.id = slugify(v);
				})
		);

		new Setting(contentEl)
			.setName('Emoji')
			.setDesc('Shown when no sprite is set.')
			.addText((text) =>
				text.setValue(this.emoji).onChange((v) => {
					this.emoji = v || '👾';
				})
			);

		const spriteFileInput = contentEl.createEl('input', { type: 'file' });
		spriteFileInput.accept = 'image/*';
		spriteFileInput.style.display = 'none';
		spriteFileInput.addEventListener('change', () => {
			const file = spriteFileInput.files?.[0];
			if (file) void this.handleSpriteUpload(file);
			spriteFileInput.value = '';
		});

		new Setting(contentEl)
			.setName('Sprite image')
			.setDesc('Vault path to an image, or upload one. Overrides the emoji on the board.')
			.addText((text) => {
				this.spriteTextComponent = text;
				text
					.setPlaceholder('GamifiedSprites/foes/my-foe.png')
					.setValue(this.sprite)
					.onChange((v) => {
						this.sprite = v.trim();
						this.renderSpritePreview();
					});
			})
			.addButton((btn) =>
				btn.setButtonText('Upload…').onClick(() => spriteFileInput.click())
			);

		this.spritePreviewEl = contentEl.createDiv();
		this.renderSpritePreview();

		new Setting(contentEl).setName('Difficulty').addDropdown((dropdown) => {
			for (const d of DIFFICULTIES) dropdown.addOption(d, d);
			dropdown.setValue(this.difficulty).onChange((v) => {
				this.difficulty = v as JourneyFoeDefinition['difficulty'];
			});
		});

		new Setting(contentEl).setName('Max HP').addText((text) =>
			text.setValue(String(this.maxHp)).onChange((v) => {
				this.maxHp = Math.max(10, parseInt(v, 10) || 100);
			})
		);

		new Setting(contentEl)
			.setName('Window (days)')
			.setDesc('How long you have to defeat this foe once a run starts.')
			.addText((text) =>
				text.setValue(String(this.windowDays)).onChange((v) => {
					this.windowDays = Math.max(1, parseInt(v, 10) || 7);
				})
			);

		new Setting(contentEl).setName('Loot tier').addDropdown((dropdown) => {
			for (const t of LOOT_TIERS) dropdown.addOption(t, t);
			dropdown.setValue(this.lootTier).onChange((v) => {
				this.lootTier = v as JourneyFoeDefinition['lootTier'];
			});
		});

		new Setting(contentEl)
			.setName('Weakness (affinity)')
			.setDesc('Which tasks deal full damage. Off-affinity tasks only graze.')
			.addDropdown((dropdown) => {
				for (const [value, label] of AFFINITY_KINDS) dropdown.addOption(value, label);
				dropdown.setValue(this.affinityKind).onChange((v) => {
					this.affinityKind = v as AffinityKind;
					this.fixedTarget = '';
					this.renderFixedTarget();
				});
			});

		this.fixedTargetContainerEl = contentEl.createDiv();
		void this.loadSkillsAndRenderTarget();

		new Setting(contentEl)
			.setName('Path whisper')
			.setDesc('Flavor line shown during the run.')
			.addTextArea((text) =>
				text.setValue(this.pathWhisper).onChange((v) => {
					this.pathWhisper = v;
				})
			);

		new Setting(contentEl).setName('Description').addTextArea((text) =>
			text.setValue(this.description).onChange((v) => {
				this.description = v;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(this.isEdit ? 'Save foe' : 'Create foe')
				.setCta()
				.onClick(() => void this.handleSubmit())
		);
	}

	private async handleSpriteUpload(file: File): Promise<void> {
		try {
			const path = await saveFoeSpriteToVault(this.plugin, file);
			this.sprite = path;
			this.spriteTextComponent?.setValue(path);
			this.renderSpritePreview();
			pixelNotice(`Sprite saved to ${path}`);
		} catch (error) {
			console.error('[AddFoeModal] Sprite upload failed', error);
			pixelNotice('Could not save the sprite image.');
		}
	}

	private renderSpritePreview(): void {
		const container = this.spritePreviewEl;
		if (!container) return;
		container.empty();
		if (!this.sprite) return;

		const url = resolveFoeSpriteUrl(this.plugin, {
			sprite: this.sprite,
		} as JourneyFoeDefinition);

		if (!url) {
			container.createEl('p', {
				cls: 'mod-muted',
				text: 'Image not found in vault — the emoji will be used instead.',
			});
			return;
		}

		const img = container.createEl('img');
		img.src = url;
		img.alt = 'Sprite preview';
		img.style.maxWidth = '64px';
		img.style.maxHeight = '64px';
		img.style.imageRendering = 'pixelated';
		img.style.border = '1px solid var(--background-modifier-border)';
	}

	private async loadSkillsAndRenderTarget(): Promise<void> {
		try {
			this.skills = await getAllSkills(this.plugin.app.vault);
		} catch (error) {
			console.error('[AddFoeModal] Failed to load skills', error);
			this.skills = [];
		}
		this.renderFixedTarget();
	}

	private renderFixedTarget(): void {
		const container = this.fixedTargetContainerEl;
		if (!container) return;
		container.empty();

		if (this.affinityKind !== 'fixed-skill' && this.affinityKind !== 'fixed-class') return;

		const isSkill = this.affinityKind === 'fixed-skill';
		const options = isSkill
			? [...new Set(this.skills.map((s) => s.name?.trim()).filter(Boolean))]
			: [...new Set(this.skills.map((s) => s.class?.trim()).filter(Boolean))];

		const setting = new Setting(container).setName(isSkill ? 'Skill' : 'Class');

		if (options.length === 0) {
			setting.setDesc(
				`No ${isSkill ? 'skills' : 'classes'} found in your skill tree. Type a name manually.`
			);
			setting.addText((text) =>
				text.setValue(this.fixedTarget).onChange((v) => {
					this.fixedTarget = v;
				})
			);
			return;
		}

		setting.addDropdown((dropdown) => {
			for (const o of options as string[]) dropdown.addOption(o, o);
			if (this.fixedTarget && !options.includes(this.fixedTarget)) {
				dropdown.addOption(this.fixedTarget, this.fixedTarget);
			}
			if (!this.fixedTarget) this.fixedTarget = options[0] as string;
			dropdown.setValue(this.fixedTarget).onChange((v) => {
				this.fixedTarget = v;
			});
		});
	}

	private buildAffinityRule(): JourneyAffinityRule {
		switch (this.affinityKind) {
			case 'fixed-skill':
				return { kind: 'fixed-skill', skill: this.fixedTarget.trim() };
			case 'fixed-class':
				return { kind: 'fixed-class', className: this.fixedTarget.trim() };
			default:
				return { kind: this.affinityKind };
		}
	}

	private async handleSubmit(): Promise<void> {
		if (!this.name.trim()) {
			pixelNotice('Please enter a foe name.');
			return;
		}
		if (
			(this.affinityKind === 'fixed-skill' || this.affinityKind === 'fixed-class') &&
			!this.fixedTarget.trim()
		) {
			pixelNotice('Pick a skill or class for the pinned weakness.');
			return;
		}

		const foe: JourneyFoeDefinition = {
			id: this.id.trim() || slugify(this.name),
			name: this.name.trim(),
			description: this.description.trim(),
			emoji: this.emoji.trim() || '👾',
			maxHp: this.maxHp,
			windowDays: this.windowDays,
			difficulty: this.difficulty,
			lootTier: this.lootTier,
			pathWhisper: this.pathWhisper.trim() || 'The road waits. Finish what you start.',
			affinityRule: this.buildAffinityRule(),
			...(this.sprite ? { sprite: this.sprite } : {}),
			isCustom: true,
		};

		const created = await ensureFoesFile(this.plugin);
		if (!created) {
			pixelNotice('Could not create Foes.md.');
			return;
		}

		await upsertVaultFoe(this.plugin, foe);
		// Roll (or reroll) just this foe's board entry; the rest of the board keeps its cycle.
		await ensureJourneyBoard(this.plugin, { rerollFoeIds: [foe.id] });
		pixelNotice(this.isEdit ? `Updated foe "${foe.name}".` : `Created foe "${foe.name}".`);
		this.onSubmit();
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
