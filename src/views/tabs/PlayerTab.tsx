import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import PlayerTabView from "@/views/tabs/PlayerTabView";
import type GamifiedObsidianPlugin from "src/main";

export const PLAYER_TAB_VIEW_TYPE = "gamified-player-tab";

export class PlayerTab extends ItemView {
	root: Root;

	constructor(leaf: WorkspaceLeaf, private plugin: GamifiedObsidianPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return PLAYER_TAB_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Player";
	}

	async onOpen() {
		console.log("PlayerTab: onOpen called");
		const container = this.containerEl.children[1] ?? this.containerEl;
		console.log("PlayerTab: mounting React root to container", container);
		this.root = createRoot(container);
		this.root.render(<PlayerTabView plugin={this.plugin} />);
		console.log("PlayerTab: React root rendered");
	}

	async onClose() {
		console.log("PlayerTab: onClose called");
		this.root?.unmount();
	}
}
