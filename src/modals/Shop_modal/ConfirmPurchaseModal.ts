import { App, Modal, Setting } from "obsidian";
import type { ShopItem } from "src/utils/ShopParser";

export class ConfirmPurchaseModal extends Modal {
	item: ShopItem;
	onConfirm: () => void;

	constructor(app: App, item: ShopItem, onConfirm: () => void) {
		super(app);
		this.item = item;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: `Buy ${this.item.name}?` });

		if (this.item.icon) {
			if (this.item.icon.startsWith("http")) {
				const img = contentEl.createEl("img");
				img.src = this.item.icon;
				img.style.width = "48px";
				img.style.height = "48px";
				img.style.display = "block";
				img.style.margin = "0 auto 8px auto";
			} else {
				contentEl.createEl("div", { text: this.item.icon, cls: "shop-item-emoji" });
			}
		}

		contentEl.createEl("div", { text: `Price: ${this.item.price} coins`, cls: "shop-item-price" });

		if (this.item.description) {
			contentEl.createEl("div", { text: this.item.description, cls: "shop-item-description" });
		}

		new Setting(contentEl)
			.addButton(btn =>
				btn.setButtonText("Confirm")
				.setCta()
				.onClick(() => {
					this.onConfirm();
					this.close();
				})
			)
			.addButton(btn =>
				btn.setButtonText("Cancel")
				.onClick(() => this.close())
			);
	}

	onClose() {
		this.contentEl.empty();
	}
} 