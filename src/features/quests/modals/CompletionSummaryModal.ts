import { App, Modal } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import type { QuestRewardResult } from '../../../shared/utils/questCompletionPipeline';
import styles from './CompletionSummaryModal.module.css';

export interface CompletedQuestSummaryItem {
	title: string;
	filePath?: string;
	result: QuestRewardResult;
}

function formatItemLine(
	item: CompletedQuestSummaryItem,
	settings?: Partial<GamificationPluginSettings>
): string {
	const sym = settings?.currencySymbol || '🪙';
	const parts = [`+${item.result.awardedXP} XP`, `+${item.result.awardedCP} CP`];
	if (item.result.awardedCoins > 0) {
		parts.push(`${sym}${item.result.awardedCoins}`);
	}
	return parts.join(' · ');
}

export class CompletionSummaryModal extends Modal {
	private items: CompletedQuestSummaryItem[];
	private settings?: Partial<GamificationPluginSettings>;
	private titleText: string;

	constructor(
		app: App,
		items: CompletedQuestSummaryItem[],
		settings?: Partial<GamificationPluginSettings>,
		titleText = 'Quests completed while you were away'
	) {
		super(app);
		this.items = items;
		this.settings = settings;
		this.titleText = titleText;
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		if (modalEl) modalEl.style.zIndex = '10002';

		const totalXP = this.items.reduce((s, i) => s + i.result.awardedXP, 0);
		const totalCP = this.items.reduce((s, i) => s + i.result.awardedCP, 0);
		const totalCoins = this.items.reduce((s, i) => s + i.result.awardedCoins, 0);
		const sym = this.settings?.currencySymbol || '🪙';
		const currencyName = this.settings?.currencyName || 'Coins';

		const wrapper = contentEl.createDiv({ cls: styles.wrapper });
		wrapper.createEl('h2', { cls: styles.title, text: `🎉 ${this.titleText}` });
		wrapper.createEl('p', {
			cls: styles.subtitle,
			text: `${this.items.length} quest${this.items.length === 1 ? '' : 's'} completed`,
		});

		const list = wrapper.createDiv({ cls: styles.list });
		for (const item of this.items) {
			const row = list.createDiv({ cls: styles.row });
			row.createEl('div', { cls: styles.rowTitle, text: item.title });
			row.createEl('div', { cls: styles.rowRewards, text: formatItemLine(item, this.settings) });
		}

		const totals = wrapper.createDiv({ cls: styles.totals });
		totals.createEl('div', {
			text: `Total: +${totalXP} XP · +${totalCP} CP · ${sym}${totalCoins} ${currencyName}`,
		});

		const btnRow = wrapper.createDiv({ cls: styles.btnRow });
		const dismissBtn = btnRow.createEl('button', { text: 'Dismiss', cls: styles.primaryBtn });
		dismissBtn.onclick = () => this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}

export function openCompletionSummaryModal(
	app: App,
	items: CompletedQuestSummaryItem[],
	settings?: Partial<GamificationPluginSettings>,
	titleText?: string
): void {
	if (items.length === 0) return;
	new CompletionSummaryModal(app, items, settings, titleText).open();
}
