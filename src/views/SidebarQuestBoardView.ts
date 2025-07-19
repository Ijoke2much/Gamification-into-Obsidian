import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import React from 'react';
import SidebarQuestView from './SidebarQuestView';
import type GamifiedObsidianPlugin from '../main';

export const SIDEBAR_QUEST_VIEW_TYPE = "gamified-sidebar-quest-view";

export class SidebarQuestBoardView extends ItemView {
	plugin: GamifiedObsidianPlugin;
	root: any;

	constructor(leaf: WorkspaceLeaf, plugin: GamifiedObsidianPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return SIDEBAR_QUEST_VIEW_TYPE;
	}

	getDisplayText() {
		return "Quest Board";
	}

	getIcon() {
		return "target";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("div", { cls: "gamified-sidebar-quest-view" });
		
		// Create React root and render the component
		this.root = createRoot(container.children[0] as HTMLElement);
		this.root.render(
			React.createElement(SidebarQuestView, {
				app: this.app,
				plugin: this.plugin
			})
		);
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
		}
	}
} 