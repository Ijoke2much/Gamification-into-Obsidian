import { App, Modal, Setting } from "obsidian";
import type GamifiedObsidianPlugin from "../../../core/main";
import {
  DEFAULT_SHOPKEEPER_DIALOGUE,
  type ShopkeeperDialogueOverrides,
} from "../utils/shopkeeperDialogueDefaults";

const DIALOGUE_FIELDS: { key: keyof ShopkeeperDialogueOverrides; label: string; placeholder?: string }[] = [
  { key: "greeting", label: "Initial Greeting" },
  { key: "purchaseConfirmation", label: "Purchase Confirmation (before buy)", placeholder: "Use {item}, {price}, {currency}, {effects}" },
  { key: "purchaseSuccess", label: "Purchase Success (after buy)", placeholder: "Use {item}, {price}, {currency}" },
  { key: "purchaseFollowUp", label: "Follow-up (What else do you have?)" },
  { key: "farewell", label: "Farewell" },
  { key: "noThanks", label: "No Thanks (Maybe later)" },
  { key: "insufficientFunds", label: "Insufficient Funds", placeholder: "Use {currency}, {amount}, {item}" },
  { key: "addItem", label: "Add Item to Shop", placeholder: "Use {item}" },
  { key: "addArtifact", label: "Add Artifact to Shop", placeholder: "Use {item}" },
  { key: "imageUpdated", label: "Image Updated" },
];

export class EditShopkeeperDialogueModal extends Modal {
  private plugin: GamifiedObsidianPlugin;
  private values: ShopkeeperDialogueOverrides;
  private onSave: (overrides: ShopkeeperDialogueOverrides) => void;

  constructor(
    app: App,
    plugin: GamifiedObsidianPlugin,
    onSave: (overrides: ShopkeeperDialogueOverrides) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.values = { ...(plugin.settings.shopkeeperDialogueOverrides || {}) };
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;

    (this.containerEl as HTMLElement).style.zIndex = "15000";

    contentEl.empty();

    const header = contentEl.createDiv({ cls: "edit-shopkeeper-dialogue-header" });
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--background-modifier-border);
    `;
    const title = header.createEl("h2", { text: "Edit Shopkeeper Dialogue" });
    title.style.cssText = "margin: 0; font-size: 1.25em;";
    const icon = header.createSpan({ text: "💬" });
    icon.style.fontSize = "1.2em";
    header.insertBefore(icon, title);

    const scrollContainer = contentEl.createDiv({ cls: "edit-shopkeeper-dialogue-scroll" });
    scrollContainer.style.cssText = `
      max-height: 55vh;
      overflow-y: auto;
      margin-bottom: 16px;
    `;

    for (const { key, label, placeholder } of DIALOGUE_FIELDS) {
      const currentValue = this.values[key] ?? DEFAULT_SHOPKEEPER_DIALOGUE[key];
      const setting = new Setting(scrollContainer).setName(label);
      if (placeholder) setting.setDesc(placeholder);
      setting.addText((text) => {
          text
            .setPlaceholder(DEFAULT_SHOPKEEPER_DIALOGUE[key])
            .setValue(currentValue)
            .onChange((val) => {
              this.values[key] = val || undefined;
            });
          text.inputEl.style.width = "100%";
          text.inputEl.style.minHeight = "36px";
        });
    }

    const buttonRow = contentEl.createDiv({ cls: "edit-shopkeeper-dialogue-buttons" });
    buttonRow.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 12px;
      border-top: 1px solid var(--background-modifier-border);
    `;

    const resetBtn = buttonRow.createEl("button", { text: "Reset to Defaults" });
    resetBtn.style.cssText = `
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      color: var(--text-normal);
      cursor: pointer;
      font-size: 0.9em;
    `;
    resetBtn.onclick = () => {
      this.values = {};
      this.onSave({});
      contentEl.empty();
      this.onOpen();
    };

    const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--background-modifier-border);
      background: var(--background-secondary);
      color: var(--text-normal);
      cursor: pointer;
      font-size: 0.9em;
    `;
    cancelBtn.onclick = () => this.close();

    const saveBtn = buttonRow.createEl("button", { text: "Save" });
    saveBtn.style.cssText = `
      padding: 8px 20px;
      border-radius: 6px;
      border: none;
      background: #7c3aed;
      color: white;
      cursor: pointer;
      font-size: 0.9em;
      font-weight: 600;
    `;
    saveBtn.onclick = () => {
      this.onSave(this.values);
      this.close();
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}
