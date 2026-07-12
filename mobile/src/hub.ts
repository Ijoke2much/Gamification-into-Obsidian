import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import type {
	MobileHabitItem,
	MobilePlayerSnapshot,
	MobileQuestItem,
	MobileSettings,
	MobileSkillItem,
	MobileTab,
	QuestEnergyFilter,
} from './types';
import { loadMobileSettings } from './settings';
import { readPlayerSnapshot } from './player';
import { completeQuest, countOpenQuests, loadQuests } from './quests';
import { getEnergyMatch } from './questMeta';
import { loadHabits, toggleHabitToday } from './habits';
import { loadSkills } from './skills';

export type HubMountMode = 'overlay' | 'inline';

export interface HubMountOptions {
	mode: HubMountMode;
	onClose?: () => void;
}

const TABS: { id: MobileTab; label: string }[] = [
	{ id: 'player', label: 'Player' },
	{ id: 'quests', label: 'Quests' },
	{ id: 'calendar', label: 'Calendar' },
	{ id: 'habits', label: 'Habits' },
	{ id: 'skills', label: 'Skills' },
];

export class MobileHubRenderer {
	private root: HTMLElement | null = null;
	private settings: MobileSettings | null = null;
	private player: MobilePlayerSnapshot | null = null;
	private quests: MobileQuestItem[] = [];
	private habits: MobileHabitItem[] = [];
	private skills: MobileSkillItem[] = [];
	private busy = false;
	private activeTab: MobileTab = 'player';
	private questFilter: QuestEnergyFilter = 'all';
	private calendarMonth = new Date();
	private selectedDate = formatDate();
	private options: HubMountOptions = { mode: 'inline' };

	constructor(private app: App) {}

	mount(container: HTMLElement, options: HubMountOptions): void {
		this.root = container;
		this.options = options;
		container.classList.add('gamification-mobile-root');
		if (options.mode === 'inline') {
			container.classList.add('gamification-mobile-root--inline');
		}
	}

	unmount(): void {
		if (this.root) {
			this.root.innerHTML = '';
			this.root.classList.remove('gamification-mobile-root', 'gamification-mobile-root--inline');
		}
		this.root = null;
	}

	async refresh(): Promise<void> {
		if (!this.root) return;
		this.settings = await loadMobileSettings(this.app);
		this.player = await readPlayerSnapshot(this.app.vault, this.settings);
		this.quests = await loadQuests(this.app.vault, this.settings);
		this.habits = await loadHabits(this.app.vault);
		this.skills = await loadSkills(this.app.vault);
		this.render();
	}

	private render(): void {
		if (!this.root || !this.settings || !this.player) return;

		const closeButton = this.options.mode === 'overlay'
			? '<button type="button" class="gm-icon-btn" data-action="close" aria-label="Close">✕</button>'
			: '';

		this.root.innerHTML = `
			<div class="gamification-mobile-panel" role="${this.options.mode === 'overlay' ? 'dialog' : 'main'}" aria-label="Player">
				<header class="gm-header gm-header--compact">
					<div>
						<p class="gm-eyebrow">Gamified Obsidian</p>
						<h2 class="gm-title">${escapeHtml(this.player.name)}</h2>
					</div>
					${closeButton}
				</header>
				<nav class="gm-tabbar" aria-label="Sections">
					${TABS.map((tab) => `
						<button type="button" class="gm-tab ${this.activeTab === tab.id ? 'gm-tab--active' : ''}" data-tab="${tab.id}">
							${tab.label}
						</button>
					`).join('')}
				</nav>
				<div class="gm-tab-body">
					${this.renderActiveTab()}
				</div>
				<footer class="gm-footer">
					<button type="button" class="gm-btn gm-btn--ghost" data-action="refresh">Refresh</button>
				</footer>
			</div>
		`;

		this.bindEvents();
	}

	private renderActiveTab(): string {
		switch (this.activeTab) {
			case 'player':
				return this.renderPlayerTab();
			case 'quests':
				return this.renderQuestsTab();
			case 'calendar':
				return this.renderCalendarTab();
			case 'habits':
				return this.renderHabitsTab();
			case 'skills':
				return this.renderSkillsTab();
			default:
				return '';
		}
	}

	private renderPlayerTab(): string {
		const p = this.player!;
		const xpPct = p.xpRequired > 0 ? Math.min(100, Math.round((p.xp / p.xpRequired) * 100)) : 0;
		const mc = p.masterProgress;
		const mcPct = mc && mc.requiredCP > 0 ? Math.min(100, Math.round((mc.currentCP / mc.requiredCP) * 100)) : 0;

		return `
			<section class="gm-section">
				<p class="gm-subtitle">Player Lv ${p.level} · Rank ${escapeHtml(p.rank)}</p>
				<div class="gm-stat-card">
					<span class="gm-stat-label">Experience</span>
					<div class="gm-progress-track"><div class="gm-progress-fill" style="width:${xpPct}%"></div></div>
					<span class="gm-stat-value">${p.xp} / ${p.xpRequired} XP · CP ${p.cp}</span>
				</div>
				<div class="gm-stats">
					<div class="gm-stat-card gm-stat-card--coins">
						<span class="gm-stat-label">${escapeHtml(this.settings!.currencyName)}</span>
						<span class="gm-stat-value gm-stat-value--large">${this.settings!.currencySymbol} ${p.coins}</span>
					</div>
					<div class="gm-stat-card">
						<span class="gm-stat-label">Energy</span>
						<div class="gm-progress-track gm-progress-track--energy"><div class="gm-progress-fill gm-progress-fill--energy" style="width:${p.energy}%"></div></div>
						<span class="gm-stat-value">${p.energy}%</span>
					</div>
				</div>
			</section>
			<section class="gm-section">
				<h3 class="gm-section-title">Master Class</h3>
				<p class="gm-subtitle">${escapeHtml(p.masterClass)}${mc ? ` · Lv ${mc.level}` : ''}</p>
				${mc ? `
					<div class="gm-progress-track"><div class="gm-progress-fill gm-progress-fill--master" style="width:${mcPct}%"></div></div>
					<span class="gm-stat-value">${mc.currentCP} / ${mc.requiredCP} CP</span>
				` : '<p class="gm-empty">No master class note found in SkillTree/Master-Class/.</p>'}
			</section>
		`;
	}

	private renderQuestsTab(): string {
		const open = this.getFilteredQuests().filter((q) => !q.completed);
		const openCount = countOpenQuests(this.quests);

		return `
			<section class="gm-section">
				<div class="gm-section-head">
					<h3>Quest Inbox</h3>
					<span class="gm-badge">${openCount} open</span>
				</div>
				<div class="gm-filter-row">
					${(['all', 'good-fit', 'low-energy'] as QuestEnergyFilter[]).map((filter) => `
						<button type="button" class="gm-chip ${this.questFilter === filter ? 'gm-chip--active' : ''}" data-filter="${filter}">
							${filter === 'all' ? 'All' : filter === 'good-fit' ? '🎯 Good fit' : '🔋 Low energy'}
						</button>
					`).join('')}
				</div>
				${open.length === 0
					? `<p class="gm-empty">No matching quests in <code>${escapeHtml(this.settings!.defaultQuestFilePath)}</code>.</p>`
					: `<ul class="gm-quest-list">${open.map((q) => this.renderQuestRow(q)).join('')}</ul>`
				}
			</section>
		`;
	}

	private renderCalendarTab(): string {
		const monthLabel = this.calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
		const days = buildMonthDays(this.calendarMonth);
		const dueMap = groupQuestsByDate(this.quests.filter((q) => !q.completed && q.dueDate));
		const selectedQuests = dueMap.get(this.selectedDate) || [];

		return `
			<section class="gm-section">
				<div class="gm-section-head">
					<button type="button" class="gm-btn gm-btn--ghost gm-btn--small" data-cal-prev>‹</button>
					<h3>${monthLabel}</h3>
					<button type="button" class="gm-btn gm-btn--ghost gm-btn--small" data-cal-next>›</button>
				</div>
				<div class="gm-calendar-grid">
					${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="gm-cal-dow">${d}</div>`).join('')}
					${days.map((day) => {
						const key = formatDate(day.date);
						const count = dueMap.get(key)?.length || 0;
						const classes = [
							'gm-cal-day',
							day.inMonth ? '' : 'gm-cal-day--muted',
							key === formatDate() ? 'gm-cal-day--today' : '',
							key === this.selectedDate ? 'gm-cal-day--selected' : '',
						].filter(Boolean).join(' ');
						return `<button type="button" class="${classes}" data-cal-date="${key}"><span>${day.date.getDate()}</span>${count ? `<em>${count}</em>` : ''}</button>`;
					}).join('')}
				</div>
				<div class="gm-section-head"><h3>Due ${this.selectedDate}</h3></div>
				${selectedQuests.length === 0
					? '<p class="gm-empty">No open quests due this day.</p>'
					: `<ul class="gm-quest-list">${selectedQuests.map((q) => this.renderQuestRow(q)).join('')}</ul>`
				}
			</section>
		`;
	}

	private renderHabitsTab(): string {
		if (this.habits.length === 0) {
			return '<p class="gm-empty">No habits found in SkillTree/Habits/.</p>';
		}
		return `
			<ul class="gm-habit-list">
				${this.habits.map((habit) => `
					<li class="gm-habit ${habit.doneToday ? 'gm-habit--done' : ''}">
						<button type="button" class="gm-habit-check ${habit.doneToday ? 'gm-habit-check--done' : ''}" data-habit="${escapeHtml(habit.id)}" aria-label="Toggle habit">
							${habit.doneToday ? '✓' : ''}
						</button>
						<div class="gm-habit-main">
							<span class="gm-habit-title">${habit.emoji} ${escapeHtml(habit.name)}</span>
							<span class="gm-habit-meta">🔥 ${habit.streak} day streak · 🌳 stage ${habit.treeStage}</span>
						</div>
					</li>
				`).join('')}
			</ul>
		`;
	}

	private renderSkillsTab(): string {
		if (this.skills.length === 0) {
			return '<p class="gm-empty">No skills found under SkillTree/**/Skills/.</p>';
		}
		return `
			<ul class="gm-skill-list">
				${this.skills.map((skill) => {
					const pct = skill.requiredCP > 0 ? Math.min(100, Math.round((skill.currentCP / skill.requiredCP) * 100)) : 0;
					return `
						<li class="gm-skill">
							<div class="gm-skill-head">
								<strong>${escapeHtml(skill.name)}</strong>
								<span>Lv ${skill.level}</span>
							</div>
							<p class="gm-skill-meta">${escapeHtml(skill.className)}</p>
							<div class="gm-progress-track"><div class="gm-progress-fill" style="width:${pct}%"></div></div>
							<span class="gm-stat-value">${skill.currentCP} / ${skill.requiredCP} CP</span>
						</li>
					`;
				}).join('')}
			</ul>
		`;
	}

	private renderQuestRow(quest: MobileQuestItem): string {
		const diff = quest.difficulty ? `<span class="gm-tag">${quest.difficulty}</span>` : '';
		const rewards = `✨${quest.xp} ⭐${quest.cp} ${this.settings?.currencySymbol ?? '🪙'}${quest.coins}`;
		const match = getEnergyMatch(this.player?.energy ?? 100, quest.energyCost);
		const matchLabel = match === 'perfect' ? '🎯 Perfect' : match === 'good' ? '✅ Good fit' : match === 'challenging' ? '⚠️ Heavy' : '❌ Too much';
		const due = quest.dueDate ? `<span class="gm-tag">📅 ${quest.dueDate}</span>` : '';

		return `
			<li class="gm-quest">
				<div class="gm-quest-main">
					<span class="gm-quest-title">${escapeHtml(quest.title)}</span>
					<div class="gm-quest-meta">${diff}${due}<span class="gm-tag gm-tag--energy">⚡${quest.energyCost}</span><span class="gm-tag">${matchLabel}</span><span class="gm-quest-rewards">${rewards}</span></div>
				</div>
				<button type="button" class="gm-btn gm-btn--primary" data-complete="${quest.lineIndex}" ${this.busy ? 'disabled' : ''}>Complete</button>
			</li>
		`;
	}

	private getFilteredQuests(): MobileQuestItem[] {
		const energy = this.player?.energy ?? 100;
		return this.quests.filter((quest) => {
			if (quest.completed) return false;
			if (this.questFilter === 'all') return true;
			const match = getEnergyMatch(energy, quest.energyCost);
			if (this.questFilter === 'good-fit') return match === 'perfect' || match === 'good';
			return quest.energyCost <= 10;
		});
	}

	private bindEvents(): void {
		if (!this.root) return;

		this.root.querySelector('[data-action="close"]')?.addEventListener('click', () => this.options.onClose?.());
		this.root.querySelector('[data-action="refresh"]')?.addEventListener('click', () => void this.refresh());

		this.root.querySelectorAll('[data-tab]').forEach((button) => {
			button.addEventListener('click', () => {
				this.activeTab = (button as HTMLElement).dataset.tab as MobileTab;
				this.render();
			});
		});

		this.root.querySelectorAll('[data-filter]').forEach((button) => {
			button.addEventListener('click', () => {
				this.questFilter = (button as HTMLElement).dataset.filter as QuestEnergyFilter;
				this.render();
			});
		});

		this.root.querySelector('[data-cal-prev]')?.addEventListener('click', () => {
			this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
			this.render();
		});
		this.root.querySelector('[data-cal-next]')?.addEventListener('click', () => {
			this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
			this.render();
		});
		this.root.querySelectorAll('[data-cal-date]').forEach((button) => {
			button.addEventListener('click', () => {
				this.selectedDate = (button as HTMLElement).dataset.calDate || this.selectedDate;
				this.render();
			});
		});

		this.root.querySelectorAll('[data-complete]').forEach((button) => {
			button.addEventListener('click', () => {
				const index = Number((button as HTMLElement).dataset.complete);
				const quest = this.quests.find((q) => q.lineIndex === index);
				if (quest) void this.handleComplete(quest, button as HTMLButtonElement);
			});
		});

		this.root.querySelectorAll('[data-habit]').forEach((button) => {
			button.addEventListener('click', () => {
				const id = (button as HTMLElement).dataset.habit;
				const habit = this.habits.find((h) => h.id === id);
				if (habit) void this.handleHabitToggle(habit);
			});
		});
	}

	private async handleComplete(quest: MobileQuestItem, button: HTMLButtonElement): Promise<void> {
		if (this.busy || !this.settings) return;
		this.busy = true;
		button.disabled = true;
		button.textContent = 'Saving…';
		try {
			const result = await completeQuest(this.app.vault, this.settings, quest);
			let msg = `Quest complete: ${result.title} (+${result.xp} XP, +${result.cp} CP, +${result.coins} coins).`;
			if (result.leveledUp && result.newLevel) msg += ` Level up! Now level ${result.newLevel}.`;
			if (result.skillLevelUps.length > 0) msg += ` ${result.skillLevelUps.join(', ')}`;
			new Notice(msg, 5000);
			await this.refresh();
		} catch (error) {
			new Notice(`Could not complete quest: ${error instanceof Error ? error.message : String(error)}`, 5000);
			button.disabled = false;
			button.textContent = 'Complete';
		} finally {
			this.busy = false;
		}
	}

	private async handleHabitToggle(habit: MobileHabitItem): Promise<void> {
		if (this.busy || !this.settings) return;
		this.busy = true;
		try {
			const result = await toggleHabitToday(this.app.vault, this.settings, habit);
			if (result.completed && result.rewards) {
				new Notice(`Habit done: ${habit.name} (+${result.rewards.xp} XP)`, 3000);
			}
			await this.refresh();
		} catch (error) {
			new Notice(`Habit update failed: ${error instanceof Error ? error.message : String(error)}`, 5000);
		} finally {
			this.busy = false;
		}
	}
}

export class MobileHub {
	private overlay: HTMLElement | null = null;
	private renderer: MobileHubRenderer;

	constructor(app: App) {
		this.renderer = new MobileHubRenderer(app);
	}

	async open(): Promise<void> {
		if (!this.overlay) {
			this.overlay = document.createElement('div');
			this.overlay.className = 'gamification-mobile-overlay';
			this.overlay.addEventListener('click', (event) => {
				if (event.target === this.overlay) this.close();
			});
			document.body.appendChild(this.overlay);
			this.renderer.mount(this.overlay, {
				mode: 'overlay',
				onClose: () => this.close(),
			});
		}
		this.overlay.style.display = 'flex';
		await this.renderer.refresh();
	}

	close(): void {
		if (this.overlay) this.overlay.style.display = 'none';
	}

	destroy(): void {
		this.renderer.unmount();
		this.overlay?.remove();
		this.overlay = null;
	}
}

function groupQuestsByDate(quests: MobileQuestItem[]): Map<string, MobileQuestItem[]> {
	const map = new Map<string, MobileQuestItem[]>();
	for (const quest of quests) {
		if (!quest.dueDate) continue;
		const list = map.get(quest.dueDate) || [];
		list.push(quest);
		map.set(quest.dueDate, list);
	}
	return map;
}

function buildMonthDays(month: Date): { date: Date; inMonth: boolean }[] {
	const year = month.getFullYear();
	const m = month.getMonth();
	const first = new Date(year, m, 1);
	const start = new Date(first);
	start.setDate(first.getDate() - first.getDay());
	const days: { date: Date; inMonth: boolean }[] = [];
	for (let i = 0; i < 42; i++) {
		const date = new Date(start);
		date.setDate(start.getDate() + i);
		days.push({ date, inMonth: date.getMonth() === m });
	}
	return days;
}

function formatDate(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
