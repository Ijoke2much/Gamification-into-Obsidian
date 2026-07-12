import { ItemView, Plugin, WorkspaceLeaf } from 'obsidian';
import { MobileHubRenderer } from './hub';

export const MOBILE_PLAYER_VIEW_TYPE = 'gamification-mobile-player';

export class MobilePlayerView extends ItemView {
	private renderer: MobileHubRenderer;

	constructor(leaf: WorkspaceLeaf, _plugin: Plugin) {
		super(leaf);
		this.renderer = new MobileHubRenderer(this.app);
	}

	getViewType(): string {
		return MOBILE_PLAYER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Player';
	}

	getIcon(): string {
		return 'dice';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] ?? this.containerEl;
		container.empty();
		const host = container.createDiv({ cls: 'gamification-mobile-view-host' });
		this.renderer.mount(host, { mode: 'inline' });
		await this.renderer.refresh();
	}

	async onClose(): Promise<void> {
		this.renderer.unmount();
	}
}
