import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { BossBattleUI } from "./BossBattleUI";
import type GamifiedObsidianPlugin from "../../../core/main";

export const BOSS_VIEW_TYPE = "boss-view";

/**
 * BossView is a full-page view for boss battles.
 * It displays the boss battle interface with bosses, player stats, and battle actions.
 */
export class BossView extends ItemView {
	root!: Root;

	constructor(leaf: WorkspaceLeaf, private plugin: GamifiedObsidianPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return BOSS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Boss Battle";
	}

	getIcon(): string {
		return "sword";
	}

	async onOpen() {
		console.log("BossView: onOpen called");
		const container = this.containerEl.children[1] ?? this.containerEl;
		console.log("BossView: mounting React root to container", container);
		this.root = createRoot(container);
		this.root.render(<BossBattleUI plugin={this.plugin} />);
		console.log("BossView: React root rendered");
	}

	async onClose() {
		console.log("BossView: onClose called");
		this.root?.unmount();
	}
}
