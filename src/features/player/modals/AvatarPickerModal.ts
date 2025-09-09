// Modal for changing avatar
import { Modal, TFile, App } from "obsidian";

export class AvatarPickerModal extends Modal {
	files: TFile[];
	onSelect: (path: string) => void;

	constructor(app: App, files: TFile[], onSelect: (path: string) => void) {
		super(app);
		this.files = files;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		
		// Ensure this modal appears above other modals (Quest modal has z-index 10000)
		(this.containerEl as HTMLElement).style.zIndex = "15000";
		contentEl.createEl("h2", { text: "Choose an Avatar" });
		
		// Add styling to the modal content
		contentEl.setAttr("style", `
			background: #23272e;
			border-radius: 8px;
			padding: 20px;
		`);

		const list = contentEl.createDiv({ cls: "avatar-list" });
		list.setAttr("style", `
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: 16px;
			max-height: 400px;
			overflow-y: auto;
		`);

		this.files.forEach((file) => {
			const img = list.createEl("img");
			img.src = this.app.vault.adapter.getResourcePath(file.path);
			img.setAttr("style", `
				width: 60px;
				height: 60px;
				object-fit: cover;
				margin: 5px;
				cursor: pointer;
				border-radius: 5px;
				border: 2px solid transparent;
			`);
			img.onclick = () => {
				this.onSelect(file.path);
				this.close();
			};
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
