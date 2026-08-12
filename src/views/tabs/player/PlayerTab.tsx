import { ItemView, WorkspaceLeaf } from "obsidian";
import React, { Suspense } from "react";
import { createRoot, Root } from "react-dom/client";
import type GamifiedObsidianPlugin from "src/core/main";

export const PLAYER_TAB_VIEW_TYPE = "gamified-player-tab";

const PlayerTabView = React.lazy(() => import("@/views/tabs/TabView"));

const TabBootFallback = () => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			padding: "2rem",
			color: "var(--text-muted)",
			minHeight: "120px",
		}}
	>
		Loading Player…
	</div>
);

/**
 * PlayerTab is the view for the player tab.
 * It displays the player's information and quests.
 */
export class PlayerTab extends ItemView {
	private root?: Root;

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
		container.empty();
		container.addClass("gamification-player-view-root");
		this.root = createRoot(container);
		this.root.render(
			<Suspense fallback={<TabBootFallback />}>
				<PlayerTabView plugin={this.plugin} />
			</Suspense>
		);
	}

	async onClose() {
		this.root?.unmount();
		this.root = undefined;
		const container = this.containerEl.children[1] ?? this.containerEl;
		container.removeClass("gamification-player-view-root");
		container.empty();
	}
}
