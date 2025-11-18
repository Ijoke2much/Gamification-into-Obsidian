import React, { useState, useEffect } from "react";
import { App, TFile, ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { Quest, parseQuestsFromMarkdown } from "../../features/quests/utils/taskParser";
import { SidebarAnalyticsWidget } from "../../features/analytics/components/SidebarAnalyticsWidget";
import { MobileAnalyticsWidget } from "../../features/analytics/components/MobileAnalyticsWidget";
import type GamifiedObsidianPlugin from "../../core/main";

export const SIDEBAR_QUEST_VIEW_TYPE = "sidebar-quest-view";

interface SidebarQuestViewProps {
	app: App;
	plugin: GamifiedObsidianPlugin;
}

interface CompactTask {
	id: string;
	title: string;
	skill: string;
	skillIcon: string;
	dueStatus: "today" | "tomorrow" | "missed" | "future";
	priority: "high" | "medium" | "low";
	completed: boolean;
	originalQuest: Quest;
}

const SKILL_ICONS: Record<string, string> = {
	wisdom: "🦉",
	intellect: "💡",
	muscle: "💪",
	faith: "🙏",
	strength: "💪",
	intelligence: "🧠",
	creativity: "🎨",
	endurance: "⚡",
	default: "⚔️",
};

const SidebarQuestViewComponent: React.FC<SidebarQuestViewProps> = ({ app, plugin }) => {
	const [tasks, setTasks] = useState<CompactTask[]>([]);
	const [draggedTask, setDraggedTask] = useState<CompactTask | null>(null);

	// Convert quests to compact tasks
	const convertToCompactTasks = (quests: Quest[]): CompactTask[] => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		return quests
			.map((quest) => {
				let dueStatus: "today" | "tomorrow" | "missed" | "future" =
					"future";

				if (quest.due) {
					const dueDate = new Date(quest.due);
					dueDate.setHours(0, 0, 0, 0);

					if (dueDate.getTime() === today.getTime()) {
						dueStatus = "today";
					} else if (dueDate.getTime() === tomorrow.getTime()) {
						dueStatus = "tomorrow";
					} else if (dueDate < today) {
						dueStatus = "missed";
					}
				} else if (quest.today) {
					dueStatus = "today";
				}

				const primarySkill =
					quest.skills?.[0] || quest.stats?.[0] || "default";
				const skillIcon =
					SKILL_ICONS[primarySkill.toLowerCase()] ||
					SKILL_ICONS.default;

				return {
					id: quest.id,
					title: quest.title,
					skill: primarySkill,
					skillIcon,
					dueStatus,
					priority:
						(quest.priority?.toLowerCase() as
							| "high"
							| "medium"
							| "low") || "medium",
					completed: quest.completed,
					originalQuest: quest,
				};
			})
			.filter((task) => !task.completed); // Only show incomplete tasks
	};

	// Load tasks from GamifiedTasks.md
	const loadTasks = async () => {
		try {
			const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				const content = await app.vault.read(file);
				const quests = parseQuestsFromMarkdown(content);
				setTasks(convertToCompactTasks(quests));
			}
		} catch (error) {
			console.error("Error loading tasks:", error);
		}
	};

	useEffect(() => {
		loadTasks();

		// Auto-refresh when file changes
		const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
		if (file && file instanceof TFile) {
			const onModify = (f: TFile) => {
				if (f.path === file.path) loadTasks();
			};
			   app.vault.on("modify", onModify as any);
   return () => app.vault.off("modify", onModify as any);
		}
	}, [app]);

	// Group tasks by due status
	const groupedTasks = {
		today: tasks.filter((t) => t.dueStatus === "today"),
		tomorrow: tasks.filter((t) => t.dueStatus === "tomorrow"),
		missed: tasks.filter((t) => t.dueStatus === "missed"),
	};

	// Drag and drop handlers - restrictive mode (only allow drops on quick filter cards)
	const handleDragStart = (e: React.DragEvent, task: CompactTask) => {
		e.stopPropagation();
		
		// Set the drag image to be invisible to prevent interference
		const dragImage = new Image();
		dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
		e.dataTransfer.setDragImage(dragImage, 0, 0);
		
		setDraggedTask(task);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("application/x-quest-drag", task.id);
		e.dataTransfer.setData("text/plain", task.id);
		
		// Mark the dragged element
		(e.target as HTMLElement).setAttribute('data-dragging', 'true');
		
		// Add a class to the body to indicate we're dragging (restrictive mode)
		document.body.classList.add('sidebar-quest-dragging');
		
		
	};

	const handleDragOver = (e: React.DragEvent) => {
		// Prevent default drag over - we only want drops on quick filter cards
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = "none"; // Show that this isn't a valid drop zone
	};

	const handleDrop = async (
		e: React.DragEvent,
		targetStatus: "today" | "tomorrow" | "missed"
	) => {
		// Prevent drops on sidebar sections - only allow drops on quick filter cards
		e.preventDefault();
		e.stopPropagation();

		
		// Clean up drag state
		setDraggedTask(null);
		document.body.classList.remove('sidebar-quest-dragging');
		
		// Find and clean up any dragged elements
		const draggedElement = document.querySelector('[data-dragging="true"]');
		if (draggedElement) {
			draggedElement.removeAttribute('data-dragging');
		}
	};

	const handleDragEnd = (e: React.DragEvent) => {
		e.stopPropagation();
		e.preventDefault();
		setDraggedTask(null);
		
		// Clean up drag attributes
		(e.target as HTMLElement).removeAttribute('data-dragging');
		
		// Remove the dragging class from body
		document.body.classList.remove('sidebar-quest-dragging');
		

	};

	// Task completion handler
	const handleTaskComplete = async (task: CompactTask) => {
		try {
			const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				const content = await app.vault.read(file);
				const lines = content.split("\n");

				const taskLineIndex = lines.findIndex(
					(line) =>
						line.includes(task.title) &&
						line.includes("#gamified-task")
				);

				if (taskLineIndex !== -1) {
					lines[taskLineIndex] = lines[taskLineIndex].replace(
						"- [ ]",
						"- [x]"
					);
					await app.vault.modify(file, lines.join("\n"));

					// Award XP and coins to player using playerStore
					const xp = task.originalQuest.xp || 0;
					const coins = task.originalQuest.coins || 0;
					
					// Import playerStore and update player data
					const { playerStore } = await import('../../shared/state/playerStore');
					if (xp > 0) {
						await playerStore.addXP(xp);
					}
					if (coins > 0) {
						await playerStore.addCoins(coins);
					}
				}
			}
		} catch (error) {
			console.error("Error completing task:", error);
		}
	};

	// Render task card
	const renderTaskCard = (task: CompactTask) => {
		const priorityColors = {
			high: "#ff6b6b",
			medium: "#4ecdc4",
			low: "#45b7d1",
		};

		return (
			<div
				key={task.id}
				draggable
				onDragStart={(e) => handleDragStart(e, task)}
				onDragEnd={handleDragEnd}
				onClick={() => handleTaskComplete(task)}
				style={{
					background: priorityColors[task.priority],
					borderRadius: 8,
					padding: 12,
					marginBottom: 8,
					cursor: "pointer",
					border:
						draggedTask?.id === task.id ? "2px solid #fff" : "none",
					opacity: draggedTask?.id === task.id ? 0.5 : 1,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<span style={{ fontSize: 16 }}>{task.skillIcon}</span>
					<div>
						<div
							style={{
								color: "#fff",
								fontWeight: 600,
								fontSize: 14,
								lineHeight: 1.2,
							}}
						>
							{task.title}
						</div>
						<div
							style={{
								color: "rgba(255,255,255,0.8)",
								fontSize: 12,
								textTransform: "capitalize",
							}}
						>
							{task.skill}
						</div>
					</div>
				</div>
				<div
					style={{
						color: "rgba(255,255,255,0.9)",
						fontSize: 12,
						fontWeight: 500,
					}}
				>
					{task.dueStatus === "today"
						? "Due Today"
						: task.dueStatus === "tomorrow"
						? "Due Tomorrow"
						: task.dueStatus === "missed"
						? "Due Yesterday"
						: ""}
				</div>
			</div>
		);
	};

	// Render section
	const renderSection = (
		title: string,
		tasks: CompactTask[],
		status: "today" | "tomorrow" | "missed"
	) => (
		<div style={{ marginBottom: 24 }}>
			<h3
				style={{
					color: "#fff",
					fontSize: 18,
					fontWeight: 600,
					marginBottom: 12,
					borderBottom: "1px solid #444",
					paddingBottom: 8,
				}}
			>
				{title}
			</h3>
			<div
				onDragOver={handleDragOver}
				onDrop={(e) => handleDrop(e, status)}
				style={{
					minHeight: tasks.length === 0 ? 60 : "auto",
					background:
						tasks.length === 0
							? "rgba(255,255,255,0.05)"
							: "transparent",
					borderRadius: 8,
					padding: tasks.length === 0 ? 16 : 0,
					border: tasks.length === 0 ? "2px dashed #666" : "none",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{tasks.length === 0 ? (
					<span style={{ color: "#888", fontSize: 14 }}>
						Drop tasks here
					</span>
				) : (
					<div style={{ width: "100%" }}>
						{tasks.map(renderTaskCard)}
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div
			className="sidebar-quest-container"
			style={{
				padding: 16,
				background: "#1a1a1a",
				minHeight: "100%",
				color: "#fff",
			}}
		>
			{/* Mobile Analytics Widget */}
			<div style={{ marginBottom: 20 }}>
				<MobileAnalyticsWidget plugin={plugin} isMinimized={true} />
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 24,
					borderBottom: "2px solid #333",
					paddingBottom: 16,
				}}
			>
				<h2
					style={{
						fontSize: 24,
						fontWeight: 700,
						margin: 0,
						color: "#fff",
					}}
				>
					Tasks
				</h2>
				<button
					onClick={() => {
						// Open the full quest tab
						app.workspace.onLayoutReady(async () => {
							const leaf = app.workspace.getRightLeaf(false);
							if (leaf) {
								leaf.setViewState({
									type: "gamified-task-tab-view",
									active: true,
								});
							}
						});
					}}
					style={{
						background: "#4a90e2",
						border: "none",
						borderRadius: 4,
						color: "#fff",
						padding: "6px 12px",
						fontSize: 12,
						cursor: "pointer",
					}}
				>
					Full View
				</button>
			</div>

			{renderSection("Today", groupedTasks.today, "today")}
			{renderSection("Tomorrow", groupedTasks.tomorrow, "tomorrow")}
			{renderSection("Missed", groupedTasks.missed, "missed")}
		</div>
	);
};

export default SidebarQuestViewComponent;

export class SidebarQuestBoardView extends ItemView {
	root: Root | null = null;
	plugin: GamifiedObsidianPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GamifiedObsidianPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return SIDEBAR_QUEST_VIEW_TYPE;
	}

	getDisplayText() {
		return "Sidebar Quest Board";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		this.root = createRoot(container);
		this.root.render(<SidebarQuestViewComponent app={this.app} plugin={this.plugin} />);
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
