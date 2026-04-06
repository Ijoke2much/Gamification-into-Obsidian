// src/modals/AddItemModal.ts
import { App, Modal, Setting, Notice } from "obsidian";
import type GamifiedObsidianPlugin from "src/core/main";
import { ShopItem, getAllShopTemplates } from "src/features/shop/utils/ShopParser";

// High-level item mode used to drive defaults and UX
type ItemMode = "generic" | "artifact" | "weapon";

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

	// Effects editor state
	effectLines: string[] = [];
	private effectTextAreaEl?: HTMLTextAreaElement;

	// Preset/builder state
	private presetKey: string = "";
	private builderKind: "buff" | "debuff" | "xp" | "coins" = "buff";
	private builderTarget: "xp" | "coins" | "cp" | "rewards" | "trade" = "xp";
	private builderMultiplier: string = "1.5";
	private builderDuration: string = "30m";
	private builderAmount: string = "100";

	// Item mode (normal shop item vs artifact / weapon)
	private mode: ItemMode = "generic";

	private isEdit = false;
	private originalItem?: ShopItem;

	// Input references for UI sync
	private nameInput!: HTMLInputElement;
	private priceInput!: HTMLInputElement;
	private categoryInput!: HTMLInputElement;
	private rarityDropdown!: HTMLSelectElement;

	constructor(
		app: App,
		plugin: GamifiedObsidianPlugin,
		onSubmit: (item: ShopItem) => void,
		itemToEdit?: ShopItem,
		mode: ItemMode = "generic"
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.mode = mode;
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
			this.effectLines = ((itemToEdit as ShopItem & { rawEffectLines?: string[] }).rawEffectLines) || [];

			// If no explicit mode was provided, try to infer from category/tags
			if (mode === "generic") {
				const cat = (this.category || "").toLowerCase();
				const tags = (itemToEdit.tags || []).map(t => t.toLowerCase());
				if (cat === "artifact" || tags.includes("artifact")) {
					this.mode = "artifact";
				} else if (cat === "weapon" || tags.includes("weapon")) {
					this.mode = "weapon";
				}
			}
		} else {
			// New item: set a sensible default category based on mode
			if (this.mode === "artifact") {
				this.category = "artifact";
			} else if (this.mode === "weapon") {
				this.category = "weapon";
			}
		}
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add mobile-specific styling
		contentEl.addClass('mobile-friendly-modal');

		// Add mobile-specific CSS and slight desktop zoom
		const style = contentEl.createEl('style');
		style.textContent = `
			/* FORCE MOBILE MODAL TO FIT SCREEN */
			@media (max-width: 768px), (pointer: coarse) {
				/* Override Obsidian's modal container completely */
				.modal-container {
					position: fixed !important;
					top: 0 !important;
					left: 0 !important;
					right: 0 !important;
					bottom: 0 !important;
					width: 100vw !important;
					height: 100vh !important;
					max-width: none !important;
					max-height: none !important;
					margin: 0 !important;
					padding: 0 !important;
					transform: none !important;
					z-index: 1000 !important;
				}
				
				/* Override modal background */
				.modal-bg {
					position: fixed !important;
					top: 0 !important;
					left: 0 !important;
					right: 0 !important;
					bottom: 0 !important;
					width: 100vw !important;
					height: 100vh !important;
				}
				
				/* Force the actual modal content to fill screen */
				.modal {
					position: fixed !important;
					top: 0 !important;
					left: 0 !important;
					right: 0 !important;
					bottom: 0 !important;
					width: 100vw !important;
					height: 100vh !important;
					max-width: none !important;
					max-height: none !important;
					margin: 0 !important;
					padding: 0 !important;
					transform: none !important;
					border-radius: 0 !important;
				}
				
				/* Style the modal content */
				.mobile-friendly-modal {
					position: fixed !important;
					top: 0 !important;
					left: 0 !important;
					right: 0 !important;
					bottom: 0 !important;
					width: 100vw !important;
					height: 100vh !important;
					max-width: none !important;
					max-height: none !important;
					margin: 0 !important;
					padding: 10px !important;
					box-sizing: border-box !important;
					overflow-y: auto !important;
					overflow-x: hidden !important;
					-webkit-overflow-scrolling: touch !important;
					background: var(--background-primary) !important;
					color: var(--text-normal) !important;
					transform: none !important;
					border-radius: 0 !important;
				}
				
				/* Mobile header - make it smaller and visible */
				.mobile-friendly-modal h2 {
					font-size: 20px !important;
					margin: 0 0 15px 0 !important;
					padding: 10px 0 !important;
					text-align: center !important;
					color: var(--text-accent) !important;
					border-bottom: 2px solid var(--interactive-accent) !important;
					background: var(--background-secondary) !important;
					border-radius: 8px 8px 0 0 !important;
				}
				
				/* Compact form sections */
				.mobile-friendly-modal .setting-item {
					background: var(--background-secondary) !important;
					border: 2px solid var(--interactive-accent) !important;
					border-radius: 8px !important;
					margin-bottom: 10px !important;
					padding: 12px !important;
				}
				
				.mobile-friendly-modal .setting-item-name {
					color: var(--text-accent) !important;
					font-weight: 700 !important;
					font-size: 16px !important;
					margin-bottom: 8px !important;
				}
				
				.mobile-friendly-modal .setting-item-description {
					color: var(--text-muted) !important;
					font-size: 13px !important;
					margin-bottom: 8px !important;
				}
				
				/* Mobile inputs - make them clearly visible and touchable */
				.mobile-friendly-modal input, 
				.mobile-friendly-modal textarea, 
				.mobile-friendly-modal select {
					background: var(--background-primary) !important;
					color: var(--text-normal) !important;
					border: 3px solid var(--interactive-accent) !important;
					border-radius: 8px !important;
					padding: 12px 15px !important;
					font-size: 16px !important;
					font-weight: 500 !important;
					width: 100% !important;
					min-height: 48px !important;
					box-sizing: border-box !important;
					-webkit-appearance: none !important;
					appearance: none !important;
				}
				
				.mobile-friendly-modal input:focus, 
				.mobile-friendly-modal textarea:focus, 
				.mobile-friendly-modal select:focus {
					border-color: var(--interactive-accent-hover) !important;
					outline: none !important;
					box-shadow: 0 0 0 3px rgba(var(--interactive-accent-rgb), 0.3) !important;
					background: var(--background-modifier-form-field) !important;
				}
				
				/* Mobile buttons - make them big and clearly clickable */
				.mobile-friendly-modal button {
					background: var(--interactive-accent) !important;
					color: var(--text-on-accent) !important;
					border: none !important;
					border-radius: 10px !important;
					padding: 15px 20px !important;
					font-size: 18px !important;
					font-weight: 700 !important;
					cursor: pointer !important;
					margin: 8px 0 !important;
					min-height: 50px !important;
					width: 100% !important;
					box-sizing: border-box !important;
					text-align: center !important;
				}
				
				.mobile-friendly-modal button:active,
				.mobile-friendly-modal button:hover {
					background: var(--interactive-accent-hover) !important;
					transform: scale(0.98) !important;
				}
				
				/* Mobile dropdowns with clear indicators */
				.mobile-friendly-modal select {
					background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
					background-repeat: no-repeat !important;
					background-position: right 15px center !important;
					background-size: 20px !important;
					padding-right: 50px !important;
				}
				
				/* Mobile textarea */
				.mobile-friendly-modal textarea {
					min-height: 100px !important;
					resize: vertical !important;
				}
				
				/* Effect builder - make it more compact but still usable */
				.mobile-friendly-modal div[style*="border: 1px solid"] {
					background: var(--background-modifier-form-field) !important;
					border: 2px solid var(--interactive-accent) !important;
					border-radius: 8px !important;
					padding: 12px !important;
					margin: 10px 0 !important;
				}
				
				.mobile-friendly-modal div[style*="display: flex"] {
					flex-direction: column !important;
					gap: 8px !important;
				}
				
				.mobile-friendly-modal div[style*="display: flex"] select,
				.mobile-friendly-modal div[style*="display: flex"] input {
					margin: 0 !important;
					width: 100% !important;
				}
				
				.mobile-friendly-modal div[style*="display: flex"] button {
					margin: 8px 0 0 0 !important;
				}
			}
			
			/* Desktop styling */
			@media (min-width: 769px) {
				.mobile-friendly-modal {
					transform: scale(0.95);
					transform-origin: top center;
				}
			}
		`;

		// Hide Obsidian's default close button; we use our own styled one instead
		try {
			const modalEl = contentEl.closest(".modal") as HTMLElement | null;
			const defaultClose = modalEl?.querySelector(".modal-close-button") as HTMLElement | null;
			if (defaultClose) {
				defaultClose.style.display = "none";
			}
		} catch {
			// Fail silently if modal structure changes
		}

		// Force mobile modal positioning after creating the style
		const isMobile = window.innerWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());

		if (isMobile) {
			// Force the modal to be full screen after a short delay to ensure DOM is ready
			setTimeout(() => {
				// Get all modal-related elements and force them to full screen
				const modalContainer = contentEl.closest('.modal-container') as HTMLElement;
				const modal = contentEl.closest('.modal') as HTMLElement;
				const modalBg = document.querySelector('.modal-bg') as HTMLElement;

				if (modalContainer) {
					modalContainer.style.cssText = `
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
						width: 100vw !important;
						height: 100vh !important;
						max-width: none !important;
						max-height: none !important;
						margin: 0 !important;
						padding: 0 !important;
						transform: none !important;
						z-index: 1000 !important;
					`;
				}

				if (modal) {
					modal.style.cssText = `
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
						width: 100vw !important;
						height: 100vh !important;
						max-width: none !important;
						max-height: none !important;
						margin: 0 !important;
						padding: 0 !important;
						transform: none !important;
						border-radius: 0 !important;
					`;
				}

				if (modalBg) {
					modalBg.style.cssText = `
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
						width: 100vw !important;
						height: 100vh !important;
					`;
				}
			}, 10);
		}

		// Create header with close button
		const headerContainer = contentEl.createEl("div");
		headerContainer.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16px;
			padding: 0;
		`;

		const header = headerContainer.createEl("h2", { text: this.isEdit ? "✏️ Edit Shop Item" : "🆕 Add New Shop Item" });
		header.style.cssText = `
			margin: 0;
			flex: 1;
		`;

		// Add close button
		const closeButton = headerContainer.createEl("button", { text: "✕" });
		closeButton.style.cssText = `
			background: var(--interactive-accent) !important;
			color: var(--text-on-accent) !important;
			border: none !important;
			border-radius: 50% !important;
			width: 40px !important;
			height: 40px !important;
			font-size: 20px !important;
			font-weight: bold !important;
			cursor: pointer !important;
			display: flex !important;
			align-items: center !important;
			justify-content: center !important;
			flex-shrink: 0 !important;
			margin-left: 12px !important;
		`;

		closeButton.addEventListener('click', () => {
			this.close();
		});

		// Mobile-specific close button styling
		const closeButtonStyle = contentEl.createEl('style');
		closeButtonStyle.textContent = `
			@media (max-width: 768px), (pointer: coarse) {
				.mobile-friendly-modal button[style*="border-radius: 50%"] {
					width: 44px !important;
					height: 44px !important;
					font-size: 22px !important;
					min-height: 44px !important;
					position: sticky !important;
					top: 10px !important;
					z-index: 10 !important;
				}
				
				.mobile-friendly-modal button[style*="border-radius: 50%"]:active {
					background: var(--interactive-accent-hover) !important;
					transform: scale(0.9) !important;
				}
			}
		`;

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

		// --- Item Type / Mode ---
		new Setting(contentEl)
			.setName("Item Type")
			.setDesc("Use 'artifact' for real-world rewards or 'weapon' for boss items")
			.addDropdown(drop => {
				drop.addOption("generic", "Normal item");
				drop.addOption("artifact", "Artifact (real-world reward)");
				drop.addOption("weapon", "Weapon (boss item)");
				drop.setValue(this.mode);
				drop.onChange(value => {
					this.mode = value as ItemMode;
					// When switching modes, set a sensible default category if none chosen yet
					if (this.mode === "artifact") {
						if (!this.category || this.category.toLowerCase() === "weapon") {
							this.category = "artifact";
							if (this.categoryInput) this.categoryInput.value = this.category;
						}
					} else if (this.mode === "weapon") {
						if (!this.category || this.category.toLowerCase() === "artifact") {
							this.category = "weapon";
							if (this.categoryInput) this.categoryInput.value = this.category;
						}
					}
				});
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

		// --- Effects Editor ---
		// Preset quick-add (includes productivity buffs, coins, and artifact-style rewards)
		const PRESET_OPTIONS: Record<string, string> = {
			// Core progression presets
			"XP +50% (30m)": "buff:xp;mult=1.5;dur=30m",
			"CP +50% (30m)": "buff:cp;mult=1.5;dur=30m",
			"Rewards +25% (1h)": "buff:rewards;mult=1.25;dur=1h",
			"Trade +10% (1h)": "buff:trade;mult=1.1;dur=1h",
			"XP +100": "xp:+100",
			"Coins +50": "coins:+50",

			// Real-world artifact presets (understood by artifact: parser in inventory)
			"Anime Night (30m)": "artifact:Watch anime episode:30:entertainment",
			"Coffee Break (15m)": "artifact:Coffee break:15:rest",
			"Walk Outside (20m)": "artifact:Walk outside:20:movement",

			// Boss / weapon-style presets (one-time boosts usable in boss fights via existing buff engine)
			"Boss Damage +50% (1 battle)": "buff:rewards;mult=1.5;dur=1h;source=boss_weapon",
		};

		new Setting(contentEl)
			.setName("Effect Presets")
			.setDesc("Quickly add a common effect to this item")
			.addDropdown((drop) => {
				drop.addOption("", "Choose preset...");
				Object.keys(PRESET_OPTIONS).forEach((label) => drop.addOption(label, label));
				drop.onChange((val) => { this.presetKey = val; });
			})
			.addButton((btn) => {
				btn.setButtonText("Add preset")
					.onClick(() => {
						if (!this.presetKey || !PRESET_OPTIONS[this.presetKey]) return;
						this.effectLines.push(PRESET_OPTIONS[this.presetKey]);
						if (this.effectTextAreaEl) this.effectTextAreaEl.value = this.effectLines.join("\n");
					});
			});

		// Simple builder (contained UI)
		const builderWrap = contentEl.createEl("div");
		builderWrap.style.cssText = `
		  margin-top: 8px;
		  padding: 10px;
		  border: 1px solid var(--background-modifier-border);
		  border-radius: 8px;
		  background: var(--background-secondary);
		`;
		const builderTitle = builderWrap.createEl("div", { text: "Effect Builder", cls: "setting-item-name" });
		builderTitle.style.marginBottom = "6px";
		const row = builderWrap.createEl("div");
		row.style.cssText = `display: flex; flex-wrap: wrap; gap: 8px; align-items: center;`;

		const kindSel = row.createEl("select");
		["buff", "debuff", "xp", "coins"].forEach(k => {
			const opt = document.createElement("option");
			opt.value = k; opt.text = k; kindSel.appendChild(opt);
		});
		kindSel.value = this.builderKind;
		kindSel.onchange = () => { this.builderKind = kindSel.value as "buff" | "debuff" | "xp" | "coins"; toggleTargetVisibility(); };

		const targetSel = row.createEl("select");
		["xp", "coins", "cp", "rewards", "trade"].forEach(k => {
			const opt = document.createElement("option");
			opt.value = k; opt.text = k; targetSel.appendChild(opt);
		});
		targetSel.value = this.builderTarget;
		targetSel.onchange = () => { this.builderTarget = targetSel.value as "xp" | "coins" | "cp" | "rewards" | "trade"; };

		const multInput = row.createEl("input");
		multInput.type = "text";
		multInput.placeholder = "multiplier e.g. 1.5 or amount e.g. 100";
		multInput.value = this.builderMultiplier;
		multInput.oninput = () => { this.builderMultiplier = multInput.value; this.builderAmount = multInput.value; };
		multInput.style.width = "140px";

		const durInput = row.createEl("input");
		durInput.type = "text";
		durInput.placeholder = "duration e.g. 30m / 1h";
		durInput.value = this.builderDuration;
		durInput.oninput = () => { this.builderDuration = durInput.value; };
		durInput.style.width = "120px";

		const addBtn = row.createEl("button", { text: "Add" });
		addBtn.classList.add("mod-cta");
		addBtn.onclick = () => {
			let line = "";
			if (this.builderKind === "xp" || this.builderKind === "coins") {
				const amt = parseInt(this.builderAmount || "0", 10);
				if (!isFinite(amt) || amt <= 0) return;
				line = `${this.builderKind}:+${amt}`;
			} else {
				const mult = parseFloat(this.builderMultiplier || "1");
				const dur = (this.builderDuration || "").trim();
				if (!isFinite(mult) || mult <= 0) return;
				line = `${this.builderKind}:${this.builderTarget};mult=${mult}${dur ? `;dur=${dur}` : ""}`;
			}
			this.effectLines.push(line);
			if (this.effectTextAreaEl) this.effectTextAreaEl.value = this.effectLines.join("\n");
		};

		function toggleTargetVisibility() {
			const needsTarget = (kindSel.value === "buff" || kindSel.value === "debuff");
			targetSel.style.display = needsTarget ? "" : "none";
			durInput.style.display = needsTarget ? "" : "none";
		}
		toggleTargetVisibility();

		new Setting(contentEl)
			.setName("Effects")
			.setDesc("Add one per line. Examples: buff:xp;mult=1.5;dur=30m | debuff:coins;mult=0.9;dur=1h | xp:+100 | coins:+50")
			.addTextArea((ta) => {
				ta.inputEl.rows = 6;
				ta.setValue(this.effectLines.join("\n"));
				ta.onChange((value) => {
					this.effectLines = value
						.split("\n")
						.map((v) => v.trim())
						.filter(Boolean);
				});
				this.effectTextAreaEl = ta.inputEl;
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
						let line = "";
						if (this.icon.trim()) line += `${this.icon.trim()} `;
						line += `${this.name} #shop${this.price} ${tags.map(t => `#${t}`).join(" ")}`;
						const descLine = this.description.trim() ? `// ${this.description.trim()}` : null;
						const iconLine = this.icon.trim() ? `// icon: ${this.icon.trim()}` : null;
						const stockLine = this.stock > 0 ? `// stock: ${this.stock}` : null;
						const effectLines = this.effectLines.map((e) => `// effect: ${e}`);

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

							// Instead of trying to reconstruct the exact original line,
							// match by item name and shop tag pattern
							const updatedLines: string[] = [];
							let itemFound = false;

							for (let i = 0; i < shopLines.length; i++) {
								const currentLine = shopLines[i].trim();

								// Check if this line contains the item we're editing
								// More robust matching that handles icons and exact name matching
								let nameMatch = false;
								let shopMatch = false;

								// Remove potential emoji/icon from the beginning to get clean name
								const cleanLine = currentLine.replace(/^[\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}]\s+/u, '');
								const lineName = cleanLine.split(' #')[0].trim();

								// Match by exact name
								nameMatch = lineName === this.originalItem.name;

								// Match by shop price pattern
								shopMatch = currentLine.includes(`#shop${this.originalItem.price}`);

								if (nameMatch && shopMatch && !itemFound) {
									// Replace item line
									updatedLines.push(line);
									itemFound = true;

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
									for (const el of effectLines) updatedLines.push(el);
								} else {
									updatedLines.push(shopLines[i]);
								}
							}

							if (!itemFound) {
								new Notice(`⚠️ Could not find original item "${this.originalItem.name}" in shop. Adding as new item instead.`);
								// Fallback: add as new item
								let toAppend = `\n${line}`;
								if (descLine) toAppend += `\n${descLine}`;
								if (iconLine) toAppend += `\n${iconLine}`;
								if (stockLine) toAppend += `\n${stockLine}`;
								await this.app.vault.append(shopFile, toAppend);
							} else {
								await this.app.vault.modify(shopFile, updatedLines.join("\n"));
							}

							new Notice(`✅ Edited "${this.name}" in shop.`);
						} else {
							// Add mode: append new line
							let toAppend = `\n${line}`;
							if (descLine) toAppend += `\n${descLine}`;
							if (iconLine) toAppend += `\n${iconLine}`;
							if (stockLine) toAppend += `\n${stockLine}`;
							if (effectLines.length) toAppend += `\n${effectLines.join("\n")}`;
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

						// Force refresh the shop tab display
						if (this.plugin.sidebarView?.rebuildShopTab) {
							await this.plugin.sidebarView.rebuildShopTab();
						}

						// Small delay to ensure file changes are processed
						setTimeout(() => {
							// Trigger a custom event to notify any listeners that shop data has changed
							document.dispatchEvent(new CustomEvent('shop-data-updated'));
						}, 100);

						this.close();
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}
