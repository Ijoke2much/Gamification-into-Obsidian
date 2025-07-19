// src/modals/AddItemModal.ts
import { App, Modal, Setting, Notice } from "obsidian";
import type GamifiedObsidianPlugin from "src/main";
import { ShopItem, getAllShopTemplates } from "src/utils/ShopParser";

export class AddItemModal extends Modal {
	plugin: GamifiedObsidianPlugin;
	onSubmit: (item: ShopItem) => void;

	// Item fields
	name = "";
	price = 0;
	category = "";
	rarity = "common";
	description = "";
	icon = "";
	stock = 0;

	private isEdit = false;
	private originalItem?: ShopItem;

	// Input references for UI sync
	private nameInput: HTMLInputElement;
	private priceInput: HTMLInputElement;
	private categoryInput: HTMLInputElement;
	private rarityDropdown: HTMLSelectElement;

	constructor(app: App, plugin: GamifiedObsidianPlugin, onSubmit: (item: ShopItem) => void, itemToEdit?: ShopItem) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		if (itemToEdit) {
			this.isEdit = true;
			this.originalItem = itemToEdit;
			this.name = itemToEdit.name;
			this.price = itemToEdit.price;
			this.category = itemToEdit.category || "";
			this.rarity = itemToEdit.rarity || "common";
			this.description = itemToEdit.description || "";
			this.icon = itemToEdit.icon || "";
			this.stock = itemToEdit.stock ?? 0;
		}
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: this.isEdit ? "✏️ Edit Shop Item" : "🆕 Add New Shop Item" });

		// --- Load templates ---
		const templates = await getAllShopTemplates(this.plugin);
		const templateOptions = ["Custom...", ...templates.map(t => t.name)];

		// --- Template Picker ---
		new Setting(contentEl)
			.setName("Template")
			.setDesc("Pick a template to autofill the form")
			.addDropdown(drop => {
				drop.addOptions(Object.fromEntries(templateOptions.map(t => [t, t])));
				drop.setValue("Custom...");
				drop.onChange(value => {
					if (value !== "Custom...") {
						const selected = templates.find(t => t.name === value);
						if (selected) {
							this.name = selected.name;
							this.price = selected.price;
							this.category = selected.category || "";
							this.rarity = selected.rarity || "common";

							this.nameInput.value = this.name;
							this.priceInput.value = this.price.toString();
							this.categoryInput.value = this.category;
							this.rarityDropdown.value = this.rarity;
						}
					}
				});
			});

		// --- Name Field ---
		new Setting(contentEl)
			.setName("Item Name")
			.addText(text => {
				this.nameInput = text.inputEl;
				text.setValue(this.name);
				text.onChange(value => this.name = value);
			});

		// --- Price Field ---
		new Setting(contentEl)
			.setName("Price")
			.addText(text => {
				this.priceInput = text.inputEl;
				text.inputEl.type = "number";
				text.setValue(this.price.toString());
				text.onChange(value => this.price = parseInt(value) || 0);
			});

		// --- Category Field ---
		new Setting(contentEl)
			.setName("Category")
			.setDesc("Becomes a #tag automatically")
			.addText(text => {
				this.categoryInput = text.inputEl;
				text.setValue(this.category);
				text.onChange(value => this.category = value.trim());
			});

		// --- Rarity Dropdown ---
		new Setting(contentEl)
			.setName("Rarity")
			.addDropdown(drop => {
				["common", "uncommon", "rare", "epic", "legendary"].forEach(r => {
					drop.addOption(r, r.charAt(0).toUpperCase() + r.slice(1));
				});
				this.rarityDropdown = drop.selectEl;
				drop.setValue(this.rarity);
				drop.onChange(value => this.rarity = value);
			});

		// --- Description Field ---
		new Setting(contentEl)
			.setName("Description")
			.setDesc("Optional: Add a description for this item (will be saved as a comment)")
			.addTextArea(textarea => {
				textarea.setValue(this.description);
				textarea.inputEl.rows = 3;
				textarea.onChange(value => this.description = value);
			});

		// --- Icon Field ---
		new Setting(contentEl)
			.setName("Icon (emoji or image URL)")
			.setDesc("Optional: Enter an emoji or image URL for this item")
			.addText(text => {
				text.setValue(this.icon);
				text.onChange(value => this.icon = value.trim());
			});

		// --- Stock Field ---
		new Setting(contentEl)
			.setName("Stock/Quantity")
			.setDesc("Optional: How many times can this item be purchased? Leave 0 for unlimited.")
			.addText(text => {
				text.inputEl.type = "number";
				text.setValue(this.stock.toString());
				text.onChange(value => this.stock = parseInt(value) || 0);
			});

		// --- Submit Button ---
		new Setting(contentEl)
			.addButton(btn => {
				btn.setButtonText(this.isEdit ? "Save Changes" : "Add Item")
					.setCta()
					.onClick(async () => {
						if (!this.name.trim()) {
							new Notice("❌ Please enter a name.");
							return;
						}

						const tags = [this.category, this.rarity].filter(Boolean);
						const line = `${this.name} #shop${this.price} ${tags.map(t => `#${t}`).join(" ")}`;
						const descLine = this.description.trim() ? `// ${this.description.trim()}` : null;
						const iconLine = this.icon.trim() ? `// icon:${this.icon.trim()}` : null;
						const stockLine = this.stock > 0 ? `// stock:${this.stock}` : null;

						const allFiles = this.app.vault.getMarkdownFiles();
						const shopFile = allFiles.find(f => f.basename.toLowerCase() === "shop");

						if (!shopFile) {
							new Notice("⚠️ Could not find Shop.md!");
							return;
						}

						if (this.isEdit && this.originalItem) {
							// Edit mode: replace the original line with the new one
							const shopContent = await this.app.vault.read(shopFile);
							const shopLines = shopContent.split("\n");
							const origTags = [this.originalItem.category, this.originalItem.rarity].filter(Boolean);
							const origLine = `${this.originalItem.name} #shop${this.originalItem.price} ${origTags.map(t => `#${t}`).join(" ")}`;
							const updatedLines: string[] = [];
							for (let i = 0; i < shopLines.length; i++) {
								if (shopLines[i] === origLine) {
									// Replace item line
									updatedLines.push(line);
									// Skip all consecutive comment lines after the item line
									let j = i + 1;
									while (j < shopLines.length && shopLines[j].trim().startsWith("//")) {
										j++;
									}
									i = j - 1;
									// Add new comment lines if present
									if (descLine) updatedLines.push(descLine);
									if (iconLine) updatedLines.push(iconLine);
									if (stockLine) updatedLines.push(stockLine);
								} else {
									updatedLines.push(shopLines[i]);
								}
							}
							await this.app.vault.modify(shopFile, updatedLines.join("\n"));
							new Notice(`✅ Edited "${this.name}" in shop.`);
						} else {
							// Add mode: append new line
							let toAppend = `\n${line}`;
							if (descLine) toAppend += `\n${descLine}`;
							if (iconLine) toAppend += `\n${iconLine}`;
							if (stockLine) toAppend += `\n${stockLine}`;
							await this.app.vault.append(shopFile, toAppend);
							new Notice(`✅ Added "${this.name}" to shop.`);
						}

						this.onSubmit({
							name: this.name,
							price: this.price,
							tags,
							rarity: this.rarity,
							category: this.category,
							description: this.description,
							icon: this.icon,
							stock: this.stock,
						});

						if (this.plugin.sidebarView?.rebuildShopTab) {
							await this.plugin.sidebarView.rebuildShopTab();
						}

						this.close();
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}
