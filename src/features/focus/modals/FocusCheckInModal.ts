import { App, Modal } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
	completeFocusCheckIn,
	formatCheckInWindowLabel,
	skipFocusCheckIn,
	snoozeFocusCheckIn,
} from '../utils/focusCheckInService';
import styles from './FocusCheckInModal.module.css';

export class FocusCheckInModal extends Modal {
	private settings: GamificationPluginSettings;
	private notesEl: HTMLTextAreaElement | null = null;

	constructor(app: App, settings: GamificationPluginSettings) {
		super(app);
		this.settings = settings;
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		if (modalEl) modalEl.style.zIndex = '10001';

		const windowLabel = formatCheckInWindowLabel(this.settings);
		const wrapper = contentEl.createDiv({ cls: styles.modalWrapper });

		wrapper.createEl('div', {
			cls: styles.modalHeader,
			text: `⏱️ What did you do in the last ${windowLabel}?`,
		});

		wrapper.createEl('p', {
			cls: styles.hint,
			text: 'No pressure — jot down anything you remember. Bullets or a quick sentence both work.',
		});

		this.notesEl = wrapper.createEl('textarea', {
			cls: styles.notesInput,
			attr: {
				placeholder: 'e.g. Fixed the quest sync bug, took a walk, replied to emails…',
				'aria-label': 'Check-in notes',
				rows: '5',
			},
		});

		const buttonRow = wrapper.createDiv({ cls: styles.buttonRow });

		const skipBtn = buttonRow.createEl('button', {
			type: 'button',
			text: 'Skip for now',
			cls: styles.ghostBtn,
		});
		skipBtn.onclick = () => void this.handleSkip();

		const snoozeBtn = buttonRow.createEl('button', {
			type: 'button',
			text: `Snooze ${this.settings.focusCheckInSnoozeMinutes ?? 30}m`,
			cls: styles.secondaryBtn,
		});
		snoozeBtn.onclick = () => void this.handleSnooze();

		const doneBtn = buttonRow.createEl('button', {
			type: 'button',
			text: 'Save check-in',
			cls: styles.primaryBtn,
		});
		doneBtn.onclick = () => void this.handleSave();

		setTimeout(() => this.notesEl?.focus(), 80);

		this.notesEl.addEventListener('keydown', (event: KeyboardEvent) => {
			if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				void this.handleSave();
			}
		});
	}

	private async handleSave() {
		const text = this.notesEl?.value ?? '';
		if (!text.trim()) {
			pixelNotice('Add a note or use Skip / Snooze', 2000);
			return;
		}
		await completeFocusCheckIn(this.app, this.settings, text);
		pixelNotice('Check-in saved ✓', 1500);
		this.close();
	}

	private async handleSkip() {
		await skipFocusCheckIn(this.app);
		pixelNotice('Check-in skipped — timer reset', 1500);
		this.close();
	}

	private async handleSnooze() {
		await snoozeFocusCheckIn(this.app, this.settings);
		const mins = this.settings.focusCheckInSnoozeMinutes ?? 30;
		pixelNotice(`Snoozed ${mins} minutes`, 1500);
		this.close();
	}

	onClose() {
		this.contentEl.empty();
		this.notesEl = null;
	}
}

export function openFocusCheckInModal(app: App, settings: GamificationPluginSettings): void {
	new FocusCheckInModal(app, settings).open();
}
