import { Notice, TFile, Modal } from "obsidian";
import GamifiedObsidianPlugin from "src/main";
import { ShopItem, getAllInventoryItems } from "src/utils/ShopParser";

export async function createInventoryTab(plugin: GamifiedObsidianPlugin): Promise<HTMLElement> {
	const container = document.createElement("div");
	container.createEl("h2", { text: "🎒 Inventory" });

	// Meta Rewards Button
	const metaBtn = container.createEl("button", { text: "Meta Rewards" });
	metaBtn.setAttr("style", "margin-bottom: 1em; margin-left: 1em;");
	metaBtn.onclick = async () => {
		const logFile = plugin.app.vault.getAbstractFileByPath("MetaEffectLog.md");
		let logContent = "";
		if (logFile instanceof TFile) {
			logContent = await plugin.app.vault.read(logFile);
		}
		const rewards = logContent.split("\n").filter(line => line.trim().length > 0);

		const modal = new Modal(plugin.app);
		modal.titleEl.textContent = "Meta Rewards";
		const list = document.createElement("ul");
		list.style.listStyle = "none";
		list.style.padding = "0";
		for (let i = 0; i < rewards.length; i++) {
			const li = document.createElement("li");
			li.textContent = rewards[i];
			li.style.marginBottom = "0.5em";
			const markBtn = document.createElement("button");
			markBtn.textContent = "Mark as Used";
			markBtn.style.marginLeft = "1em";
			markBtn.onclick = async () => {
				li.style.textDecoration = "line-through";
				// Optionally, remove from log file
				const updated = rewards.filter((_, idx) => idx !== i).join("\n");
				if (logFile instanceof TFile) {
					await plugin.app.vault.modify(logFile, updated);
				}
				markBtn.disabled = true;
			};
			li.appendChild(markBtn);
			list.appendChild(li);
		}
		modal.contentEl.appendChild(list);
		modal.open();
	};

	let items: ShopItem[] = [];
	try {
		items = await getAllInventoryItems(plugin);
	} catch (e) {
		console.error("Failed to load inventory items", e);
		container.createEl("p", { text: "⚠️ Could not load inventory." });
		return container;
	}

	if (items.length === 0) {
		container.createEl("p", { text: "No items in inventory." });
		return container;
	}

	items.forEach(item => {
		const itemDiv = container.createDiv({ cls: "inventory-item" });

		itemDiv.createEl("span", {
			text: `${item.name} - ${item.price} coins`,
			attr: { style: "font-weight: bold; margin-right: 10px;" }
		});

		item.tags.forEach(tag => {
			const tagSpan = itemDiv.createEl("span", { text: `#${tag}` });
			tagSpan.setAttr("style", `
				background-color: #444;
				color: white;
				border-radius: 5px;
				padding: 2px 6px;
				margin-right: 5px;
				font-size: 0.75em;
			`);
		});

		// 🔁 Restock Button
		const restockBtn = itemDiv.createEl("button", { text: "Restock" });
		restockBtn.onclick = async () => {
			const allFiles = plugin.app.vault.getMarkdownFiles();
			const shopFile = allFiles.find(f => f.basename.toLowerCase() === "shop");

			if (!shopFile) {
				new Notice("⚠️ Shop.md not found");
				return;
			}

			const line = `${item.name} #shop${item.price} ${item.tags.map(t => `#${t}`).join(" ")}`;
			await plugin.app.vault.append(shopFile, `\n${line}`);
			new Notice(`✅ Restocked "${item.name}" into the Shop`);

			if (plugin.sidebarView?.rebuildShopTab) {
				await plugin.sidebarView.rebuildShopTab();
			}
		};
	});

	return container;
}
