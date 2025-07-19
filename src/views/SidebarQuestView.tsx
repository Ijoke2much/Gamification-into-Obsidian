import React, { useState, useEffect } from "react";
import { App, TFile } from "obsidian";
import { Quest, parseQuestsFromMarkdown } from "../utils/taskParser";
import type GamifiedObsidianPlugin from "../main";

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

const SidebarQuestView: React.FC<SidebarQuestViewProps> = ({ app, plugin }) => {
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
			app.vault.on("modify", onModify);
			return () => app.vault.off("modify", onModify);
		}
	}, [app]);

	// Group tasks by due status
	const groupedTasks = {
		today: tasks.filter((t) => t.dueStatus === "today"),
		tomorrow: tasks.filter((t) => t.dueStatus === "tomorrow"),
		missed: tasks.filter((t) => t.dueStatus === "missed"),
	};

	// Drag and drop handlers
	const handleDragStart = (e: React.DragEvent, task: CompactTask) => {
		setDraggedTask(task);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = async (
		e: React.DragEvent,
		targetStatus: "today" | "tomorrow" | "missed"
	) => {
		e.preventDefault();
		if (!draggedTask) return;

		// Update the task's due date based on target status
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		let newDueDate: string;
		switch (targetStatus) {
			case "today":
				newDueDate = today.toISOString().split("T")[0];
				break;
			case "tomorrow":
				newDueDate = tomorrow.toISOString().split("T")[0];
				break;
			case "missed":
				newDueDate = yesterday.toISOString().split("T")[0];
				break;
		}

		// Update the task in the markdown file
		try {
			const file = app.vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				const content = await app.vault.read(file);
				const lines = content.split("\n");

				// Find and update the task line
				const taskLineIndex = lines.findIndex(
					(line) =>
						line.includes(draggedTask.title) &&
						line.includes("#gamified-task")
				);

				if (taskLineIndex !== -1) {
					let line = lines[taskLineIndex];

					// Update or add due date
					if (line.includes("due:")) {
						line = line.replace(/due:\S+/, `due:${newDueDate}`);
					} else {
						// Add due date before #gamified-task
						line = line.replace(
							"#gamified-task",
							`due:${newDueDate} #gamified-task`
						);
					}

					lines[taskLineIndex] = line;
					await app.vault.modify(file, lines.join("\n"));
				}
			}
		} catch (error) {
			console.error("Error updating task:", error);
		}

		setDraggedTask(null);
	};

	const handleDragEnd = () => {
		setDraggedTask(null);
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

					// Award XP and coins to player
					const xp = task.originalQuest.xp || 0;
					const coins = task.originalQuest.coins || 0;
					plugin.player.setXP(plugin.player.getXP() + xp);
					plugin.player.setCoins(plugin.player.getCoins() + coins);
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
			style={{
				padding: 16,
				background: "#1a1a1a",
				minHeight: "100%",
				color: "#fff",
			}}
		>
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

export default SidebarQuestView;
