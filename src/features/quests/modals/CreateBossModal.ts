import { App, Modal, Setting } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import { getAllSkills, type SkillMetadata } from '../../../shared/utils/skillDiscovery';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
	createBossFile,
	getDefaultMaxArmor,
	getDefaultMaxHp,
	getRequiredTasks,
	normalizeBossDifficulty,
	renameBossFile,
	updateBossDefinition,
	type BossDifficulty,
	type BossFileData,
} from '../utils/bossFile';
import { migrateBossRaidFilePath } from '../utils/bossRaidService';

const DIFFICULTIES: BossDifficulty[] = ['easy', 'medium', 'hard'];

const SKILL_KINDS = [
	['neutral', 'Neutral — any task lands'],
	['fixed-skill', 'A specific skill'],
	['fixed-class', 'A specific class'],
] as const;

type SkillKind = (typeof SKILL_KINDS)[number][0];

function parseSkillKindFromBoss(boss: BossFileData): { kind: SkillKind; target: string } {
	const skill = boss.skill.trim();
	if (skill.startsWith('skill:')) {
		return { kind: 'fixed-skill', target: skill.slice('skill:'.length).trim() };
	}
	if (skill.startsWith('class:')) {
		return { kind: 'fixed-class', target: skill.slice('class:'.length).trim() };
	}
	return { kind: 'neutral', target: '' };
}

/**
 * Create a file-backed boss (`Bosses/<name>.md`). HP is felled by completing the
 * boss's body tasks; armor (broken by attacks) damps task damage until shattered.
 */
export class CreateBossModal extends Modal {
	private plugin: GamifiedObsidianPlugin;
	private onSubmit: () => void;
	private editBoss?: BossFileData;

	name = '';
	emoji = '👹';
	description = '';
	difficulty: BossDifficulty = 'medium';
	skillKind: SkillKind = 'neutral';
	fixedTarget = '';
	/** One entry per checklist row (blank rows are dropped on submit). */
	tasks: string[] = [];

	private skills: SkillMetadata[] = [];
	private targetContainerEl?: HTMLElement;
	private statsEl?: HTMLElement;
	private taskRowsEl?: HTMLElement;
	private taskCountEl?: HTMLElement;

	constructor(
		app: App,
		plugin: GamifiedObsidianPlugin,
		onSubmit: () => void,
		editBoss?: BossFileData
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.editBoss = editBoss;
		if (editBoss) {
			this.name = editBoss.name;
			this.emoji = editBoss.emoji || '👹';
			this.description = editBoss.description;
			this.difficulty = editBoss.difficulty;
			const parsed = parseSkillKindFromBoss(editBoss);
			this.skillKind = parsed.kind;
			this.fixedTarget = parsed.target;
			this.tasks = editBoss.tasks.map((t) => t.text);
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		// Seed one blank row per required task so the count guides the user.
		this.ensureRequiredRows();
		contentEl.createEl('h2', { text: this.editBoss ? 'Edit boss' : 'Forge a boss' });
		contentEl.createEl('p', {
			cls: 'mod-muted',
			text: this.editBoss
				? 'Update this gate boss note. Task labels reset unchecked when saved.'
				: 'Bosses are saved as notes in the Bosses/ folder. Complete the tasks inside to lower HP; attack to break armor.',
		});

		new Setting(contentEl)
			.setName('Boss name')
			.setDesc(
				this.editBoss
					? 'Renaming moves the Bosses/ note and updates any active gate raid pointer.'
					: ''
			)
			.addText((text) =>
				text
					.setPlaceholder('Deadline Wraith')
					.setValue(this.name)
					.onChange((v) => {
						this.name = v;
					})
			);

		new Setting(contentEl).setName('Emoji').addText((text) =>
			text.setValue(this.emoji).onChange((v) => {
				this.emoji = v || '👹';
			})
		);

		new Setting(contentEl)
			.setName('Difficulty')
			.setDesc('Sets required tasks, HP, and armor.')
			.addDropdown((dropdown) => {
				for (const d of DIFFICULTIES) dropdown.addOption(d, d);
				dropdown.setValue(this.difficulty).onChange((v) => {
					this.difficulty = normalizeBossDifficulty(v);
					this.ensureRequiredRows();
					this.renderStats();
					this.renderTaskRows();
				});
			});

		this.statsEl = contentEl.createDiv({ cls: 'mod-muted' });
		this.renderStats();

		new Setting(contentEl)
			.setName('Skill / weakness')
			.setDesc('Themes the boss. Off-skill tasks only graze.')
			.addDropdown((dropdown) => {
				for (const [value, label] of SKILL_KINDS) dropdown.addOption(value, label);
				dropdown.setValue(this.skillKind).onChange((v) => {
					this.skillKind = v as SkillKind;
					this.fixedTarget = '';
					this.renderTarget();
				});
			});

		this.targetContainerEl = contentEl.createDiv();
		void this.loadSkillsAndRenderTarget();

		const tasksHeader = new Setting(contentEl)
			.setName('Tasks')
			.setDesc('Each row is a checkbox that lowers the boss HP when completed.')
			.addButton((btn) =>
				btn.setButtonText('+ Add task').onClick(() => {
					this.tasks.push('');
					this.renderTaskRows();
				})
			);
		this.taskCountEl = tasksHeader.descEl.createSpan({ cls: 'mod-muted' });
		this.taskRowsEl = contentEl.createDiv();
		this.renderTaskRows();

		new Setting(contentEl).setName('Description').addTextArea((text) =>
			text.setValue(this.description).onChange((v) => {
				this.description = v;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(this.editBoss ? 'Save changes' : 'Create boss')
				.setCta()
				.onClick(() => void this.handleSubmit())
		);
	}

	private renderStats(): void {
		const el = this.statsEl;
		if (!el) return;
		el.empty();
		el.createEl('p', {
			text: `Required tasks: ${getRequiredTasks(this.difficulty)} · Max HP: ${getDefaultMaxHp(
				this.difficulty
			)} · Max armor: ${getDefaultMaxArmor(this.difficulty)}`,
		});
	}

	/** Pad the row list up to the difficulty's required task count (never truncates). */
	private ensureRequiredRows(): void {
		const required = getRequiredTasks(this.difficulty);
		while (this.tasks.length < required) this.tasks.push('');
		if (this.tasks.length === 0) this.tasks.push('');
	}

	private renderTaskRows(): void {
		const container = this.taskRowsEl;
		if (!container) return;
		container.empty();

		this.tasks.forEach((task, index) => {
			new Setting(container)
				.addText((text) =>
					text
						.setPlaceholder(`Task ${index + 1}`)
						.setValue(task)
						.onChange((v) => {
							this.tasks[index] = v;
							this.updateTaskCount();
						})
				)
				.addExtraButton((btn) =>
					btn
						.setIcon('x')
						.setTooltip('Remove task')
						.onClick(() => {
							this.tasks.splice(index, 1);
							if (this.tasks.length === 0) this.tasks.push('');
							this.renderTaskRows();
						})
				);
		});

		this.updateTaskCount();
	}

	private updateTaskCount(): void {
		const el = this.taskCountEl;
		if (!el) return;
		const filled = this.tasks.filter((t) => t.trim()).length;
		const required = getRequiredTasks(this.difficulty);
		el.setText(` — ${filled}/${required} filled`);
	}

	private async loadSkillsAndRenderTarget(): Promise<void> {
		try {
			this.skills = await getAllSkills(this.plugin.app.vault);
		} catch (error) {
			console.error('[CreateBossModal] Failed to load skills', error);
			this.skills = [];
		}
		this.renderTarget();
	}

	private renderTarget(): void {
		const container = this.targetContainerEl;
		if (!container) return;
		container.empty();

		if (this.skillKind !== 'fixed-skill' && this.skillKind !== 'fixed-class') return;

		const isSkill = this.skillKind === 'fixed-skill';
		const options = isSkill
			? [...new Set(this.skills.map((s) => s.name?.trim()).filter(Boolean))]
			: [...new Set(this.skills.map((s) => s.class?.trim()).filter(Boolean))];

		const setting = new Setting(container).setName(isSkill ? 'Skill' : 'Class');

		if (options.length === 0) {
			setting.setDesc(`No ${isSkill ? 'skills' : 'classes'} found — type a name manually.`);
			setting.addText((text) =>
				text.setValue(this.fixedTarget).onChange((v) => {
					this.fixedTarget = v;
				})
			);
			return;
		}

		setting.addDropdown((dropdown) => {
			for (const o of options as string[]) dropdown.addOption(o, o);
			if (!this.fixedTarget) this.fixedTarget = options[0] as string;
			dropdown.setValue(this.fixedTarget).onChange((v) => {
				this.fixedTarget = v;
			});
		});
	}

	private buildSkillString(): string {
		if (this.skillKind === 'fixed-skill' && this.fixedTarget.trim()) {
			return `skill:${this.fixedTarget.trim()}`;
		}
		if (this.skillKind === 'fixed-class' && this.fixedTarget.trim()) {
			return `class:${this.fixedTarget.trim()}`;
		}
		return 'neutral';
	}

	private async handleSubmit(): Promise<void> {
		if (!this.name.trim()) {
			pixelNotice('Please enter a boss name.');
			return;
		}
		if (
			(this.skillKind === 'fixed-skill' || this.skillKind === 'fixed-class') &&
			!this.fixedTarget.trim()
		) {
			pixelNotice('Pick a skill or class for the boss weakness.');
			return;
		}

		const tasks = this.tasks.map((t) => t.trim()).filter(Boolean);

		try {
			const payload = {
				name: this.name.trim(),
				emoji: this.emoji.trim() || '👹',
				description: this.description.trim(),
				skill: this.buildSkillString(),
				difficulty: this.difficulty,
				tasks,
			};
			if (this.editBoss) {
				let filePath = this.editBoss.filePath;
				const trimmedName = this.name.trim();
				if (trimmedName !== this.editBoss.name) {
					const renamed = await renameBossFile(this.plugin.app, filePath, trimmedName);
					if (renamed.filePath !== filePath) {
						migrateBossRaidFilePath(filePath, renamed.filePath);
					}
					filePath = renamed.filePath;
				}
				await updateBossDefinition(this.plugin.app, filePath, payload);
				pixelNotice(`Updated boss "${trimmedName}".`);
			} else {
				await createBossFile(this.plugin.app, payload);
				pixelNotice(`Forged boss "${this.name.trim()}".`);
			}
			this.onSubmit();
			this.close();
		} catch (error) {
			console.error('[CreateBossModal] Failed to save boss', error);
			pixelNotice(this.editBoss ? 'Could not update the boss note.' : 'Could not create the boss note.');
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
