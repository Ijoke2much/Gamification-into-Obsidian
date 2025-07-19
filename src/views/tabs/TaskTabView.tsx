import { ItemView, WorkspaceLeaf, App } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import TaskTab from "./TaskTab";

export const GAMIFIED_TASK_TAB_VIEW_TYPE = "gamified-task-tab";

export class TaskTabView extends ItemView {
	root: Root | null = null;
	app: App;

	constructor(leaf: WorkspaceLeaf, app: App) {
		super(leaf);
		this.app = app;
	}

	getViewType() {
		return GAMIFIED_TASK_TAB_VIEW_TYPE;
	}

	getDisplayText() {
		return "Gamified Tasks";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		this.root = createRoot(container);
		this.root.render(<TaskTab app={this.app} />);
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
