import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export type VaultPickKind = 'image' | 'folder' | 'markdown';

/** Pick a vault path. The plugin only reads files that already live in the vault. */
export class VaultPathPicker extends FuzzySuggestModal<string> {
	constructor(
		app: App,
		private kind: VaultPickKind,
		private onPick: (path: string) => void
	) {
		super(app);
		this.setPlaceholder(
			kind === 'image'
				? 'Choose an image in the vault'
				: kind === 'folder'
					? 'Choose a folder'
					: 'Choose a note'
		);
	}

	getItems(): string[] {
		if (this.kind === 'folder') {
			return this.app.vault
				.getAllLoadedFiles()
				.filter((file): file is TFolder => file instanceof TFolder)
				.map((folder) => folder.path)
				.filter((path) => path && path !== '/')
				.sort((a, b) => a.localeCompare(b));
		}
		const files = this.app.vault.getFiles();
		const matched =
			this.kind === 'image'
				? files.filter((file) => /\.(png|jpe?g|gif|webp|svg)$/i.test(file.path))
				: files.filter((file) => file.extension === 'md');
		return matched.map((file) => file.path).sort((a, b) => a.localeCompare(b));
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string): void {
		this.onPick(item);
	}
}
