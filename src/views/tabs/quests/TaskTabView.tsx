import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { QuestTab } from './QuestTab';

export const GAMIFIED_TASK_TAB_VIEW_TYPE = "gamified-task-tab-view";

export class TaskTabView extends ItemView {
  plugin: GamifiedObsidianPlugin;
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: GamifiedObsidianPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return GAMIFIED_TASK_TAB_VIEW_TYPE;
  }

  getDisplayText() {
    return "Quests";
  }

  getIcon() {
    return "sword";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    
    // Create a React root and render the QuestTab component
    this.root = createRoot(container);
    this.root.render(
      React.createElement(QuestTab, { plugin: this.plugin })
    );
  }

  async onClose() {
    // Cleanup React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}