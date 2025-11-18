import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import PlayerTabView from "@/views/tabs/TabView";
import type GamifiedObsidianPlugin from "src/core/main";

export const PLAYER_TAB_VIEW_TYPE = "gamified-player-tab";

/**
 * PlayerTab is the view for the player tab.
 * It displays the player's information and quests.
 */
export class PlayerTab extends ItemView {
	root!: Root;

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
		const container = this.containerEl.children[1] ?? this.containerEl;
		this.root = createRoot(container);
		this.root.render(<PlayerTabView plugin={this.plugin} />);
	}

	async onClose() {
		this.root?.unmount();
	}
}
