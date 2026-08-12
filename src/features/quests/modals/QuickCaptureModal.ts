import { App, Modal, Platform } from 'obsidian';
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
	private descriptionEl: HTMLTextAreaElement | null = null;
	private descriptionWrap: HTMLElement | null = null;
	private tagButtons: HTMLButtonElement[] = [];
	private onMobile = false;

	constructor(app: App, settings: GamificationPluginSettings) {
		super(app);
		this.settings = settings;
		this.onMobile = Platform.isMobile || Platform.isPhone || Platform.isTablet;
		if (settings.captureRememberLastTag !== false) {
			this.selectedTag = loadRememberedCaptureTag();
		}
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		modalEl?.addClass('gamify-quick-capture-modal');
		if (modalEl) {
			modalEl.style.zIndex = '100095';
		}
		if (this.containerEl) {
			this.containerEl.style.zIndex = '100094';
		}

		const wrapper = contentEl.createDiv({ cls: styles.modalWrapper });

		const header = wrapper.createEl('div', { cls: styles.modalHeader });
		header.setText('System: Brain Dump');

		if (!this.onMobile) {
			wrapper.createEl('p', {
				cls: styles.hint,
				text: 'Enter saves. Continue keeps dumping — Done closes.',
			});
		}

		this.inputEl = wrapper.createEl('input', {
			type: 'text',
			cls: styles.captureInput,
			attr: {
				placeholder: 'Capture an idea…',
				'aria-label': 'Capture text',
				autocomplete: 'off',
				autocapitalize: 'sentences',
			},
		});

		const showDescription = this.settings.captureIncludeDescription !== false;
		if (showDescription) {
			if (this.onMobile) {
				const noteToggle = wrapper.createEl('button', {
					type: 'button',
					cls: styles.noteToggle,
					text: '▸ Add note (optional)',
				});
				this.descriptionWrap = wrapper.createDiv();
				this.descriptionWrap.style.display = 'none';
				this.descriptionWrap.createEl('label', {
					cls: styles.sectionTitle,
					text: 'Description',
				});
				this.descriptionEl = this.descriptionWrap.createEl('textarea', {
					cls: styles.descriptionInput,
					attr: {
						placeholder: 'Extra context…',
						rows: '2',
						'aria-label': 'Capture description',
					},
				});
				noteToggle.onclick = () => {
					const open = this.descriptionWrap!.style.display !== 'none';
					this.descriptionWrap!.style.display = open ? 'none' : 'block';
					noteToggle.setText(open ? '▸ Add note (optional)' : '▾ Note');
					if (!open) this.descriptionEl?.focus();
				};
			} else {
				wrapper.createEl('label', {
					cls: styles.sectionTitle,
					text: 'Description (optional)',
				});
				this.descriptionEl = wrapper.createEl('textarea', {
					cls: styles.descriptionInput,
					attr: {
						placeholder: 'Extra context, links, or notes…',
						rows: '2',
						'aria-label': 'Capture description',
					},
				});
			}
		}

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

		// Focus ASAP — delay felt sluggish on phone
		requestAnimationFrame(() => this.inputEl?.focus());

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
		const description = this.descriptionEl?.value ?? '';
		const saved = await appendCaptureLine(
			this.app,
			this.settings,
			text,
			this.selectedTag,
			description
		);
		if (!saved) return false;

		if (this.settings.captureRememberLastTag !== false) {
			rememberCaptureTag(this.selectedTag);
		}

		pixelNotice('Captured ✓', 1500);
		return true;
	}

	private clearInputs() {
		if (this.inputEl) {
			this.inputEl.value = '';
			this.inputEl.focus();
		}
		if (this.descriptionEl) {
			this.descriptionEl.value = '';
		}
	}

	private async handleContinue() {
		const text = (this.inputEl?.value ?? '').trim();
		if (!text) return;

		await this.saveCurrentInput();
		this.clearInputs();
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
		this.modalEl?.removeClass('gamify-quick-capture-modal');
		this.contentEl.empty();
		this.inputEl = null;
		this.descriptionEl = null;
		this.descriptionWrap = null;
		this.tagButtons = [];
	}
}

export function openQuickCaptureModal(
	app: App,
	settings: GamificationPluginSettings
): void {
	new QuickCaptureModal(app, settings).open();
}
