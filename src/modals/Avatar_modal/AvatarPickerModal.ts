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
		contentEl.createEl("h2", { text: "Choose an Avatar" });

		const list = contentEl.createDiv({ cls: "avatar-list" });

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
