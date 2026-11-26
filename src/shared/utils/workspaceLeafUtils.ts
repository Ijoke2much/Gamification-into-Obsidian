import type { Workspace, WorkspaceLeaf } from "obsidian";
import { WorkspaceWindow } from "obsidian";

/** True when the leaf is in the main editor stack or a pop-out window (not left/right sidebar drawers). */
export function isLeafInVaultMainWorkspace(leaf: WorkspaceLeaf, workspace: Workspace): boolean {
	const root = leaf.getRoot();
	return root === workspace.rootSplit || root instanceof WorkspaceWindow;
}

/** First open leaf of a view type that is in the main workspace, or null. */
export function getFirstLeafOfTypeInMainWorkspace(
	workspace: Workspace,
	viewType: string
): WorkspaceLeaf | null {
	for (const leaf of workspace.getLeavesOfType(viewType)) {
		if (isLeafInVaultMainWorkspace(leaf, workspace)) {
			return leaf;
		}
	}
	return null;
}
