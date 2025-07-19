import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import React from 'react';
import DatacoreTaskView from './DatacoreTaskView';
import type GamifiedObsidianPlugin from '../main';

export const DATACORE_TASK_VIEW_TYPE = "gamified-datacore-task-view";

export class DatacoreTaskBoardView extends ItemView {
	plugin: GamifiedObsidianPlugin;
	root: any;

	constructor(leaf: WorkspaceLeaf, plugin: GamifiedObsidianPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return DATACORE_TASK_VIEW_TYPE;
	}

	getDisplayText() {
		return "Task Analytics";
	}

	getIcon() {
		return "bar-chart-3";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("div", { cls: "gamified-datacore-task-view" });
		
		// Create React root and render the component
		this.root = createRoot(container.children[0] as HTMLElement);
		this.root.render(
			React.createElement(DatacoreTaskView, {
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