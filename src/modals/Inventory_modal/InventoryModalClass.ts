import { Modal, App } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import InventoryModal from "./InventoryModal";

export class InventoryModalClass extends Modal {
	private root: Root | null = null;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		this.root = createRoot(this.contentEl);
		this.root.render(
			React.createElement(InventoryModal, { app: this.app, onClose: () => this.close() })
		);
	}

	onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		this.contentEl.empty();
	}
}
