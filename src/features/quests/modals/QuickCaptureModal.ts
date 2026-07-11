import { App, Modal } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
	appendCaptureLine,
	getCaptureTagPresets,
	loadRememberedCaptureTag,
	rememberCaptureTag,
} from '../utils/captureService';
import styles from './QuickCaptureModal.module.css';

export class QuickCaptureModal extends Modal {
	private settings: GamificationPluginSettings;
	private selectedTag: string | undefined;
	private inputEl: HTMLInputElement | null = null;
	private tagButtons: HTMLButtonElement[] = [];

	constructor(app: App, settings: GamificationPluginSettings) {
		super(app);
		this.settings = settings;
		if (settings.captureRememberLastTag !== false) {
			this.selectedTag = loadRememberedCaptureTag();
		}
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		if (modalEl) {
			modalEl.style.zIndex = '10001';
		}

		const wrapper = contentEl.createDiv({ cls: styles.modalWrapper });

		const header = wrapper.createEl('div', { cls: styles.modalHeader });
		header.innerHTML = '<span aria-hidden="true">🧠</span> Brain Dump';

		wrapper.createEl('p', {
			cls: styles.hint,
			text: 'Enter saves with #gamified-task. Continue keeps dumping — Done closes.',
		});

		this.inputEl = wrapper.createEl('input', {
			type: 'text',
			cls: styles.captureInput,
			attr: {
				placeholder: 'Capture an idea…',
				'aria-label': 'Capture text',
			},
		});

		const tagSection = wrapper.createDiv();
		tagSection.createEl('h3', { text: 'Tag (optional)', cls: styles.sectionTitle });
		const tagGrid = tagSection.createDiv({ cls: styles.tagGrid });

		const presets = getCaptureTagPresets(this.settings);
		this.tagButtons = presets.map((tag) => {
			const btn = tagGrid.createEl('button', {
				type: 'button',
				text: `#${tag}`,
				cls: styles.tagChip,
			});
			btn.onclick = () => this.toggleTag(tag, btn);
			if (this.selectedTag === tag) {
				btn.addClass(styles.tagChipActive);
			}
			return btn;
		});

		const buttonRow = wrapper.createDiv({ cls: styles.buttonRow });

		const doneBtn = buttonRow.createEl('button', {
			type: 'button',
			text: 'Done',
			cls: styles.primaryBtn,
		});
		doneBtn.onclick = () => void this.handleDone(true);

		const continueBtn = buttonRow.createEl('button', {
			type: 'button',
			text: 'Continue',
			cls: styles.continueBtn,
		});
		continueBtn.onclick = () => void this.handleContinue();

		setTimeout(() => this.inputEl?.focus(), 80);

		this.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				if (event.metaKey || event.ctrlKey) {
					void this.handleDone(true);
				} else {
					void this.handleContinue();
				}
			}
		});
	}

	private toggleTag(tag: string, btn: HTMLButtonElement) {
		if (this.selectedTag === tag) {
			this.selectedTag = undefined;
			btn.removeClass(styles.tagChipActive);
			return;
		}

		this.selectedTag = tag;
		this.tagButtons.forEach((b) => b.removeClass(styles.tagChipActive));
		btn.addClass(styles.tagChipActive);
	}

	private async saveCurrentInput(): Promise<boolean> {
		const text = this.inputEl?.value ?? '';
		const saved = await appendCaptureLine(this.app, this.settings, text, this.selectedTag);
		if (!saved) return false;

		if (this.settings.captureRememberLastTag !== false) {
			rememberCaptureTag(this.selectedTag);
		}

		pixelNotice('Captured ✓', 1500);
		return true;
	}

	private async handleContinue() {
		const text = (this.inputEl?.value ?? '').trim();
		if (!text) return;

		await this.saveCurrentInput();
		if (this.inputEl) {
			this.inputEl.value = '';
			this.inputEl.focus();
		}
	}

	private async handleDone(closeAfterSave: boolean) {
		const text = (this.inputEl?.value ?? '').trim();
		if (text) {
			await this.saveCurrentInput();
		}
		if (closeAfterSave) {
			this.close();
		}
	}

	onClose() {
		this.contentEl.empty();
		this.inputEl = null;
		this.tagButtons = [];
	}
}

export function openQuickCaptureModal(
	app: App,
	settings: GamificationPluginSettings
): void {
	new QuickCaptureModal(app, settings).open();
}
