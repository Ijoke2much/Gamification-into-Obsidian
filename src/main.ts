import { Plugin, App, TFile, PluginSettingTab, Setting } from "obsidian";
import { PlayerTab, PLAYER_TAB_VIEW_TYPE } from "./views/tabs/PlayerTab";
import { Player } from "./data/PlayerData";
import { GamificationPluginSettings, DEFAULT_SETTINGS } from "./settings";
import { TaskTabView, GAMIFIED_TASK_TAB_VIEW_TYPE } from './views/tabs/TaskTabView';

export const TASK_VIEW_TYPE = "gamified-task-view";

export default class GamifiedObsidianPlugin extends Plugin {
	player: Player;
	sidebarView?: {
		rebuildShopTab?: () => Promise<void>;
	};
	settings: GamificationPluginSettings;

	async onload() {
		console.log("🔌 GamifiedObsidianPlugin loading...");

		// Load plugin settings
		await this.loadSettings();

		const saved = await this.loadData();
		if (saved) {
			this.player = Player.fromJSON(saved);
		} else {
			this.player = new Player();
		}

		this.player.setSaveCallback(() => this.savePlayerData());

		this.registerView(PLAYER_TAB_VIEW_TYPE, (leaf) => new PlayerTab(leaf, this));

		// Always open the Player tab on plugin reload
		await this.app.workspace.onLayoutReady(async () => {
			this.activatePlayerTabView();
		});

		this.addRibbonIcon("dice", "Open Player", () => {
			this.app.workspace.onLayoutReady(async () => {
				this.activatePlayerTabView();
			});
		});

		// Add settings tab
		this.addSettingTab(new GamificationSettingTab(this.app, this));

		// Register the TaskTab in the tab system (example pattern)
		// this.addTab({
		// 	id: 'task-tab',
		// 	title: 'Tasks',
		// 	icon: 'check-square', // or any icon you prefer
		// 	component: TaskTab,
		// });

		this.registerView(
			GAMIFIED_TASK_TAB_VIEW_TYPE,
			(leaf) => new TaskTabView(leaf, this.app)
		);
		this.addCommand({
			id: 'open-gamified-task-tab',
			name: 'Open Gamified Task Tab',
			callback: () => {
				this.app.workspace.onLayoutReady(async () => {
					const leaf = this.app.workspace.getRightLeaf(false);
					if (leaf) {
						leaf.setViewState({
							type: GAMIFIED_TASK_TAB_VIEW_TYPE,
							active: true,
						});
					}
				});
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		await this.app.workspace.onLayoutReady(async () => {
			const { workspace } = this.app;
			const leaf = workspace.getLeavesOfType(TASK_VIEW_TYPE)[0];
			if (!leaf) {
				const newLeaf = workspace.getRightLeaf(false);
				if (!newLeaf) return;
				await newLeaf.setViewState({
					type: TASK_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(newLeaf);
				return;
			}
			workspace.revealLeaf(leaf);
		});
	}

	async activatePlayerTabView() {
		await this.app.workspace.onLayoutReady(async () => {
			const { workspace } = this.app;
			const leaf = workspace.getLeavesOfType(PLAYER_TAB_VIEW_TYPE)[0];
			if (!leaf) {
				const newLeaf = workspace.getRightLeaf(false);
				if (!newLeaf) return;
				await newLeaf.setViewState({
					type: PLAYER_TAB_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(newLeaf);
				return;
			}
			workspace.revealLeaf(leaf);
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(PLAYER_TAB_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(GAMIFIED_TASK_TAB_VIEW_TYPE);
	}

	async savePlayerData() {
		await this.saveData(this.player.toJSON());
	}
}

class GamificationSettingTab extends PluginSettingTab {
	plugin: GamifiedObsidianPlugin;

	constructor(app: App, plugin: GamifiedObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Gamification Plugin Settings" });

		new Setting(containerEl)
			.setName("XP per completed task")
			.setDesc("How much XP to award for each completed task.")
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(this.plugin.settings.xpPerTask.toString())
					.onChange(async (value) => {
						this.plugin.settings.xpPerTask = Number(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Coins per completed task")
			.setDesc("How many coins to award for each completed task.")
			.addText((text) =>
				text
					.setPlaceholder("5")
					.setValue(this.plugin.settings.coinPerTask.toString())
					.onChange(async (value) => {
						this.plugin.settings.coinPerTask = Number(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Leveling formula")
			.setDesc("Choose how XP required for each level is calculated.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("linear", "Linear")
					.addOption("exponential", "Exponential")
					.addOption("custom", "Custom")
					.setValue(this.plugin.settings.levelingFormula)
					.onChange(async (value) => {
						this.plugin.settings.levelingFormula = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Skill Folder Path")
			.setDesc("Set the folder path for skill files. Example: SkillTree/Master-Class/Class/Skills")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class/Class/Skills")
					.setValue(this.plugin.settings.skillFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.skillFolder = value;
						await this.plugin.saveSettings();
					})
				);

		new Setting(containerEl)
			.setName("Class Folder Path")
			.setDesc("Set the folder path for class files. Example: SkillTree/Master-Class/Class")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class/Class")
					.setValue(this.plugin.settings.classFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.classFolder = value;
						await this.plugin.saveSettings();
					})
				);

		new Setting(containerEl)
			.setName("Master Class Folder Path")
			.setDesc("Set the folder path for master class files. Example: SkillTree/Master-Class")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class")
					.setValue(this.plugin.settings.masterClassFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.masterClassFolder = value;
						await this.plugin.saveSettings();
					})
				);

		new Setting(containerEl)
			.setName("Stat Folder Path")
			.setDesc("Set the folder path for stat files. Example: SkillTree/Master-Class/Class/Stat")
			.addText((text) =>
				text
					.setPlaceholder("SkillTree/Master-Class/Class/Stat")
					.setValue(this.plugin.settings.statFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.statFolder = value;
						await this.plugin.saveSettings();
					})
				);

		new Setting(containerEl)
			.setName("Reset Only Skills")
			.setDesc("Reset all skill files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Skills")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all skills? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("./utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.skillFolder, "skill");
						// @ts-ignore
						new window.Notice("All skills have been reset.");
						location.reload();
					})
				);

		new Setting(containerEl)
			.setName("Reset Only Classes")
			.setDesc("Reset all class files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Classes")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all classes? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("./utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.classFolder, "class");
						// @ts-ignore
						new window.Notice("All classes have been reset.");
						location.reload();
					})
				);

		new Setting(containerEl)
			.setName("Reset Only Master Classes")
			.setDesc("Reset all master class files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Master Classes")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all master classes? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("./utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.masterClassFolder, "master");
						// @ts-ignore
						new window.Notice("All master classes have been reset.");
						location.reload();
					})
				);

		new Setting(containerEl)
			.setName("Reset Only Stats")
			.setDesc("Reset all stat files to level 1 and CP 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Stats")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset all stats? This cannot be undone.");
						if (!confirmed) return;
						const { resetYamlFrontmatterForType } = await import("./utils/progressUpdater");
						await resetYamlFrontmatterForType(this.app.vault, this.plugin.settings.statFolder, "stat");
						// @ts-ignore
						new window.Notice("All stats have been reset.");
						location.reload();
					})
				);

		new Setting(containerEl)
			.setName("Reset Only Player Data")
			.setDesc("Reset only the PlayerData.md file to level 1, xp 0, xpRequired 200, coins 0, and total_exp 0. This cannot be undone.")
			.addButton((btn) =>
				btn.setButtonText("Reset Player Data")
					.setCta()
					.onClick(async () => {
						const confirmed = confirm("Are you sure you want to reset PlayerData.md? This cannot be undone.");
						if (!confirmed) return;
						const { readYamlFrontmatter, writeYamlFrontmatter } = await import("./utils/progressUpdater");
						const playerPath = "SkillTree/PlayerData.md";
						const { frontmatter } = await readYamlFrontmatter(this.app.vault, playerPath);
						frontmatter.level = 1;
						frontmatter.xp = 0;
						frontmatter.xpRequired = 200;
						frontmatter.coins = 0;
						frontmatter.total_exp = 0;
						await writeYamlFrontmatter(this.app.vault, playerPath, frontmatter);
						// @ts-ignore
						new window.Notice("PlayerData.md has been reset.");
						location.reload();
					})
				);
	}
}

export interface InventoryItem {
  name: string;
  quantity: number;
  tags: string[];
}

export async function loadInventoryFromMarkdown(app: App): Promise<InventoryItem[]> {
	const file = app.vault.getAbstractFileByPath("inventory.md");
	if (!file || !(file instanceof TFile)) return [];

	const content = await app.vault.read(file);
	return content
		.split("\n")
		.map((line: string) => line.trim())
		.filter((line: string) => line.length > 0)
		.map((line: string) => {
			// Match "Name xN #tag1 #tag2"
			const match = line.match(/^(.+?)(?: x(\d+))?( .+)?$/);
			if (match) {
				const name = match[1].trim();
				const quantity = match[2] ? parseInt(match[2], 10) : 1;
				const tags = match[3]
					? match[3].split(" ").filter((t) => t.startsWith("#"))
					: [];
				return { name, quantity, tags };
			}
			return { name: line, quantity: 1, tags: [] };
		});
}
