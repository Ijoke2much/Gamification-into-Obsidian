import { App, Modal } from "obsidian";
import type GamifiedObsidianPlugin from "../../../core/main";
import type { ShopItem } from "../utils/ShopParser";
import {
	getShopkeeperDialogue,
	fillDialogueTemplate,
} from "../utils/shopkeeperDialogueDefaults";
import type { ShopkeeperDialogueOverrides } from "../utils/shopkeeperDialogueDefaults";

export type PurchaseConfirmationPhase = "confirm" | "success";

export interface PurchaseConfirmationModalOptions {
	app: App;
	plugin: GamifiedObsidianPlugin;
	item: ShopItem;
	price: number;
	effectsText: string;
	shopkeeperImg: string;
	overrides?: ShopkeeperDialogueOverrides;
	currencyName: string;
	currencyNameLower: string;
	currencySymbol: string;
	onPurchase: () => Promise<void>;
	onClose?: () => void;
	onWhatElse?: () => void;
}

export class PurchaseConfirmationModal extends Modal {
	private options: PurchaseConfirmationModalOptions;
	private phase: PurchaseConfirmationPhase = "confirm";
	private isPurchasing = false;

	constructor(opts: PurchaseConfirmationModalOptions) {
		super(opts.app);
		this.options = opts;
		(this.containerEl as HTMLElement).style.zIndex = "15000";
	}

	private getDialogue(key: keyof ShopkeeperDialogueOverrides) {
		return getShopkeeperDialogue(key, this.options.overrides);
	}

	onOpen() {
		this.phase = "confirm";
		this.render();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();

		const container = contentEl.createDiv({ cls: "gami-purchase-modal" });
		container.style.cssText = `
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 16px;
			gap: 16px;
			max-width: 420px;
			margin: 0 auto;
		`;

		// Shopkeeper image
		if (this.options.shopkeeperImg) {
			const imgWrap = container.createDiv();
			imgWrap.style.cssText = "text-align: center;";
			const img = imgWrap.createEl("img", {
				attr: {
					src: this.options.shopkeeperImg,
					alt: "Shopkeeper",
				},
			});
			img.style.cssText = `
				max-height: 100px;
				max-width: 100%;
				object-fit: contain;
				border-radius: 10px;
				box-shadow: 0 2px 6px rgba(0,0,0,0.3);
			`;
		}

		// Dialogue box
		const dialogueBox = container.createDiv({ cls: "gami-purchase-dialogue" });
		dialogueBox.style.cssText = `
			width: 100%;
			padding: 14px 16px;
			background: #222;
			color: #fff;
			border-radius: 8px;
			font-family: monospace;
			font-size: 0.9em;
			line-height: 1.5;
			white-space: pre-wrap;
			box-shadow: 0 2px 8px rgba(0,0,0,0.2);
		`;

		if (this.phase === "confirm") {
			const text = fillDialogueTemplate(this.getDialogue("purchaseConfirmation"), {
				item: this.options.item.name,
				price: this.options.price.toLocaleString(),
				currency: this.options.currencyNameLower,
				effects: this.options.effectsText,
			});
			dialogueBox.setText(text);

			const btnRow = container.createDiv();
			btnRow.style.cssText = `
				display: flex;
				gap: 10px;
				width: 100%;
				justify-content: center;
			`;
			const yesBtn = btnRow.createEl("button", {
				text: `Yes, buy for ${this.options.currencySymbol}${this.options.price.toLocaleString()}`,
			});
			yesBtn.style.cssText = `
				padding: 10px 18px;
				border-radius: 6px;
				border: none;
				background: #16a34a;
				color: #fff;
				font-weight: 600;
				cursor: pointer;
				font-size: 0.9em;
			`;
			yesBtn.onclick = () => this.handleConfirm();

			const noBtn = btnRow.createEl("button", { text: "No, maybe later" });
			noBtn.style.cssText = `
				padding: 10px 18px;
				border-radius: 6px;
				border: 1px solid #4b5563;
				background: #374151;
				color: #e5e7eb;
				cursor: pointer;
				font-size: 0.9em;
			`;
			noBtn.onclick = () => this.close();
		} else {
			const text = fillDialogueTemplate(this.getDialogue("purchaseSuccess"), {
				item: this.options.item.name,
				price: this.options.price.toLocaleString(),
				currency: this.options.currencyNameLower,
			});
			dialogueBox.setText(text);

			const btnRow = container.createDiv();
			btnRow.style.cssText = `
				display: flex;
				gap: 10px;
				width: 100%;
				justify-content: center;
			`;
			const thanksBtn = btnRow.createEl("button", { text: "Thanks!" });
			thanksBtn.style.cssText = `
				padding: 10px 18px;
				border-radius: 6px;
				border: none;
				background: #16a34a;
				color: #fff;
				font-weight: 600;
				cursor: pointer;
				font-size: 0.9em;
			`;
			thanksBtn.onclick = () => this.close();

			const whatElseBtn = btnRow.createEl("button", {
				text: "What else do you have?",
			});
			whatElseBtn.style.cssText = `
				padding: 10px 18px;
				border-radius: 6px;
				border: 1px solid #4b5563;
				background: #374151;
				color: #e5e7eb;
				cursor: pointer;
				font-size: 0.9em;
			`;
			whatElseBtn.onclick = () => {
				this.options.onWhatElse?.();
				this.close();
			};
		}
	}

	private async handleConfirm() {
		if (this.isPurchasing) return;
		this.isPurchasing = true;
		try {
			await this.options.onPurchase();
			this.phase = "success";
			this.render();
		} catch (e) {
			console.error("Purchase failed", e);
			this.isPurchasing = false;
		}
		this.isPurchasing = false;
	}

	onClose() {
		this.contentEl.empty();
		this.options.onClose?.();
	}
}
