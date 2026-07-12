import { Notice, Plugin } from 'obsidian';
import { MobileHub } from './hub';
import { MOBILE_PLAYER_VIEW_TYPE, MobilePlayerView } from './playerView';

export default class GamificationMobilePlugin extends Plugin {
	private hub: MobileHub | null = null;
	private fab: HTMLButtonElement | null = null;

	async onload(): Promise<void> {
		console.log('📱 Gamification Mobile: loading companion plugin');

		this.hub = new MobileHub(this.app);

		this.registerView(
			MOBILE_PLAYER_VIEW_TYPE,
			(leaf) => new MobilePlayerView(leaf, this)
		);

		this.addRibbonIcon('dice', 'Open Player', () => {
			void this.openPlayerTab();
		});

		this.addCommand({
			id: 'open-player-tab',
			name: 'Open Player tab',
			callback: () => {
				void this.openPlayerTab();
			},
		});

		this.addCommand({
			id: 'open-mobile-hub-overlay',
			name: 'Open Player (quick overlay)',
			callback: () => {
				void this.openHubOverlay();
			},
		});

		this.app.workspace.onLayoutReady(() => {
			this.scheduleFabAttempts();
		});

		this.scheduleFabAttempts();

		new Notice('📱 Player ready — tap 🎮, ribbon dice, or “Open Player tab”', 4500);
	}

	onunload(): void {
		this.fab?.remove();
		this.fab = null;
		this.hub?.destroy();
		this.hub = null;
	}

	async openPlayerTab(): Promise<void> {
		try {
			await this.app.workspace.onLayoutReady(async () => {
				const { workspace } = this.app;
				const existing = workspace.getLeavesOfType(MOBILE_PLAYER_VIEW_TYPE)[0];
				if (existing) {
					workspace.revealLeaf(existing);
					workspace.setActiveLeaf(existing, { focus: true });
					return;
				}

				const leaf = workspace.getLeaf('tab');
				await leaf.setViewState({
					type: MOBILE_PLAYER_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(leaf);
				workspace.setActiveLeaf(leaf, { focus: true });
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Could not open Player tab: ${message}`, 5000);
		}
	}

	private async openHubOverlay(): Promise<void> {
		try {
			await this.hub?.open();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Mobile hub failed: ${message}`, 5000);
		}
	}

	private scheduleFabAttempts(): void {
		const delays = [0, 600, 1500, 3000, 6000];
		for (const delay of delays) {
			window.setTimeout(() => this.ensureFab(), delay);
		}
	}

	private ensureFab(): void {
		if (this.fab && document.body.contains(this.fab)) return;

		const existing = document.querySelector('.gamification-mobile-fab');
		if (existing instanceof HTMLButtonElement) {
			this.fab = existing;
			return;
		}

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'gamification-mobile-fab';
		button.setAttribute('aria-label', 'Open Player tab');
		button.title = 'Open Player';
		button.innerHTML = '<span class="gm-fab-icon">🎮</span><span class="gm-fab-label">Player</span>';

		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void this.openPlayerTab();
		});

		document.body.appendChild(button);
		this.fab = button;
	}
}
