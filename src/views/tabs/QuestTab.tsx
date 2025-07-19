import { Quest, parseQuestsFromMarkdown } from "../../utils/taskParser";
import React, { useState, useEffect } from "react";
import { App, TFile, Notice } from "obsidian";
import ReactDOM from "react-dom";

/*
The Quest Tab is your main interface for creating, viewing, 
and completing quests, and for tracking your progress and rewards.

*/

// Placeholder components (to be implemented)
const QuestBoardHeader: React.FC<{ onAddQuest: () => void }> = ({
	onAddQuest,
}) => (
	<div style={{ marginBottom: 24 }}>
		{/* Quest board image and motivational text will go here */}
		<div
			style={{
				height: 120,
				background: "#222",
				borderRadius: 12,
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				color: "#fff",
				fontSize: 28,
				fontWeight: 700,
				position: "relative",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
					padding: "0 24px",
				}}
			>
				<span>Quest Board</span>
				{/* Removed the '+ Add Quest' button from here */}
			</div>
		</div>
		<div
			style={{
				marginTop: 8,
				color: "#aaa",
				fontStyle: "italic",
				textAlign: "center",
			}}
		>
			"Every quest completed is a step toward greatness!"
		</div>
	</div>
);

// --- QuestFilters with filtering logic ---
interface QuestFiltersProps {
	status: "active" | "completed" | "all";
	setStatus: (s: "active" | "completed" | "all") => void;
	className: string;
	setClassName: (c: string) => void;
	classOptions: string[];
	sortBy: string;
	setSortBy: (s: string) => void;
}
const SORT_OPTIONS = [
	{ value: "due", label: "Due Date" },
	{ value: "xp", label: "XP" },
	{ value: "title", label: "Title" },
];
const QuestFilters: React.FC<QuestFiltersProps> = ({
	status,
	setStatus,
	className,
	setClassName,
	classOptions,
	sortBy,
	setSortBy,
}) => (
	<div
		style={{
			marginBottom: 16,
			display: "flex",
			gap: 12,
			alignItems: "center",
		}}
	>
		<label style={{ color: "#888", fontSize: 13 }}>
			Status:
			<select
				value={status}
				onChange={(e) =>
					setStatus(e.target.value as "active" | "completed" | "all")
				}
				style={{ marginLeft: 4 }}
			>
				<option value="active">Active</option>
				<option value="completed">Completed</option>
				<option value="all">All</option>
			</select>
		</label>
		<label style={{ color: "#888", fontSize: 13 }}>
			Class:
			<select
				value={className}
				onChange={(e) => setClassName(e.target.value)}
				style={{ marginLeft: 4 }}
			>
				<option value="">All</option>
				{classOptions.map((c) => (
					<option key={c} value={c}>
						{c}
					</option>
				))}
			</select>
		</label>
		<label style={{ color: "#888", fontSize: 13 }}>
			Sort by:
			<select
				value={sortBy}
				onChange={(e) => setSortBy(e.target.value)}
				style={{ marginLeft: 4 }}
			>
				{SORT_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</label>
	</div>
);

// --- QuestCard ---
const QuestCard: React.FC<{
	quest: Quest;
	plugin?: { app: App };
	refreshQuests?: () => void;
	onQuestComplete?: (xp: number, coins: number, items?: string[]) => void;
	onEdit?: () => void;
	// Drag and drop props
	isDragging?: boolean;
	onDragStart?: (e: React.DragEvent, quest: Quest) => void;
	onDragEnd?: () => void;
	onDragOver?: (e: React.DragEvent) => void;
	onDrop?: (e: React.DragEvent, targetQuest: Quest) => void;
}> = ({
	quest,
	plugin,
	refreshQuests,
	onQuestComplete,
	onEdit,
	isDragging,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDrop,
}) => {
	const [expanded, setExpanded] = useState(false);

	// --- NEW: Main quest completion handler ---
	const handleMainQuestToggle = async () => {
		if (!plugin) return;
		const vault = plugin.app.vault;
		const file = vault.getAbstractFileByPath("GamifiedTasks.md");
		if (!(file && file instanceof TFile)) return;
		const content = await vault.read(file);
		const lines = content.split("\n");
		const questLineIdx = lines.findIndex(
			(l: string) =>
				l.includes(quest.title) && l.includes("#gamified-task")
		);
		if (questLineIdx === -1) return;
		const line = lines[questLineIdx];
		const checked = line.includes("[x]");
		const today = new Date().toISOString().slice(0, 10);
		if (!checked) {
			// Mark as checked, add ✅ and date
			lines[questLineIdx] = line.replace("[ ]", "[x]");
			if (!line.includes("✅")) {
				lines[questLineIdx] = lines[questLineIdx] + ` ✅ ${today}`;
			} else {
				lines[questLineIdx] = lines[questLineIdx].replace(
					/✅ [0-9-]+/,
					`✅ ${today}`
				);
			}
			await vault.modify(file, lines.join("\n"));

			// --- Call progress update logic ---
			try {
				console.log(
					`[Quest Completion] Starting update for quest:`,
					quest
				);
				const {
					updatePlayerData,
					updateSkillProgress,
					updateClassProgress,
					updateMasterClassProgress,
					updateStatProgress,
					readYamlFrontmatter,
				} = await import("../../utils/progressUpdater");
				const { getAllSkills } = await import(
					"../../utils/skillDiscovery"
				);
				const { findFileByFrontmatterName } = await import(
					"../../utils/playerDataUtils"
				);
				// Find all skills for this quest
				const allSkills = await getAllSkills(plugin.app.vault);
				const questSkills = quest.skills || [];
				const questStats = quest.stats || [];
				const cp = quest.cp || 0;
				console.log("Awarding CP", { cp, questSkills, quest });
				const summary = [];
				// Update each skill and propagate
				for (const skillName of questSkills) {
					const skill = allSkills.find((s) => s.name === skillName);
					if (!skill) continue;
					await updateSkillProgress(
						plugin.app.vault,
						skill.filePath,
						cp
					);
					summary.push(`+${cp} CP to skill: ${skill.name}`);
					// --- Update class ---
					if (skill.classPath) {
						await updateClassProgress(
							plugin.app.vault,
							skill.classPath,
							cp
						);
						summary.push(
							`+${cp} CP to class: ${
								skill.class || skill.classPath
							}`
						);
						// --- Dynamically resolve master class from class file ---
						try {
							const { frontmatter: classFrontmatter } =
								await readYamlFrontmatter(
									plugin.app.vault,
									skill.classPath
								);
							const masterClassName =
								classFrontmatter.masterClass;
							if (
								masterClassName &&
								typeof masterClassName === "string"
							) {
								const masterClassPath =
									await findFileByFrontmatterName(
										plugin.app.vault,
										"SkillTree/Master-Class/",
										masterClassName
									);
								if (masterClassPath) {
									await updateMasterClassProgress(
										plugin.app.vault,
										masterClassPath,
										cp
									);
									summary.push(
										`+${cp} CP to master class: ${masterClassName}`
									);
								}
							}
						} catch (err) {
							// ignore
						}
					}
					// --- Update stats for this skill ---
					if (skill.stats) {
						for (const statName of Object.keys(skill.stats)) {
							if (skill.stats[statName]) {
								const statPath =
									await findFileByFrontmatterName(
										plugin.app.vault,
										"SkillTree/Master-Class/Stats/",
										statName
									);
								if (statPath) {
									await updateStatProgress(
										plugin.app.vault,
										statPath,
										cp
									);
									summary.push(
										`+${cp} CP to stat: ${statName}`
									);
								}
							}
						}
					}
				}
				// Also update stats directly tagged in the quest (if any)
				for (const statName of questStats) {
					const statPath = await findFileByFrontmatterName(
						plugin.app.vault,
						"SkillTree/Master-Class/Stats/",
						statName
					);
					if (statPath) {
						await updateStatProgress(
							plugin.app.vault,
							statPath,
							cp
						);
						summary.push(`+${cp} CP to stat: ${statName}`);
					}
				}
				// Update player data (XP, coins)
				await updatePlayerData(
					plugin.app.vault,
					quest.xp || 0,
					Math.round((quest.xp || 0) * 0.1)
				);
				summary.push(
					`+${quest.xp || 0} XP, +${Math.round(
						(quest.xp || 0) * 0.1
					)} coins to player`
				);
				// Notify PlayerTabView to reload player data
				document.dispatchEvent(new CustomEvent("player-data-updated"));
				// Show single completion notice with breakdown
				new Notice(`Quest completed!\n${summary.join("\n")}`);
				if (onQuestComplete) {
					onQuestComplete(
						quest.xp || 0,
						Math.round((quest.xp || 0) * 0.1),
						[]
					);
				}
				console.log(
					`[Quest Completion] Update complete for quest:`,
					quest.title
				);
			} catch (err) {
				console.error(
					"Error updating progress after quest completion:",
					err
				);
			}
		}
		if (refreshQuests) refreshQuests();
	};

	const handleSubtaskToggle = async (idx: number) => {
		if (!plugin) return;
		const vault = plugin.app.vault;
		const file = vault.getAbstractFileByPath("GamifiedTasks.md");
		if (!(file && file instanceof TFile)) return;
		const content = await vault.read(file);
		const lines = content.split("\n");
		const questLineIdx = lines.findIndex(
			(l: string) =>
				l.includes(quest.title) && l.includes("#gamified-task")
		);
		if (questLineIdx === -1) return;
		// Find subtask lines (indented under quest)
		let i = questLineIdx + 1;
		let subIdx = 0;
		while (i < lines.length && lines[i].trim().startsWith("- [")) {
			if (subIdx === idx) {
				const line = lines[i];
				const checked = line.includes("[x]");
				const today = new Date().toISOString().slice(0, 10);
				if (!checked) {
					// Mark as checked, add ✅ and date
					lines[i] = line.replace("[ ]", "[x]");
					if (!line.includes("✅")) {
						lines[i] = lines[i] + ` ✅ ${today}`;
					} else {
						lines[i] = lines[i].replace(
							/✅ [0-9-]+/,
							`✅ ${today}`
						);
					}
				} else {
					// Uncheck, remove ✅ and date
					lines[i] = line.replace("[x]", "[ ]");
					lines[i] = lines[i].replace(/ ✅ [0-9-]+/, "");
				}
				break;
			}
			subIdx++;
			i++;
		}
		await vault.modify(file, lines.join("\n"));
		if (refreshQuests) refreshQuests();
	};

	// Add edit/delete handlers
	const handleEdit = () => {
		if (onEdit) return onEdit();
		new Notice("Edit quest coming soon!");
	};
	const handleDelete = async () => {
		if (!plugin) return;
		if (!confirm(`Delete quest: ${quest.title}?`)) return;
		const vault = plugin.app.vault;
		const file = vault.getAbstractFileByPath("GamifiedTasks.md");
		if (!(file && file instanceof TFile)) return;
		const content = await vault.read(file);
		const lines = content.split("\n");
		// Remove quest and its subtasks
		const i = lines.findIndex(
			(l) => l.includes(quest.title) && l.includes("#gamified-task")
		);
		if (i === -1) return;
		let end = i + 1;
		while (end < lines.length && lines[end].startsWith("  - [")) end++;
		lines.splice(i, end - i);
		await vault.modify(file, lines.join("\n"));
		refreshQuests && refreshQuests();
	};

	// Progress calculation
	const total = quest.subtasks.length;
	const done = quest.subtasks.filter((st) => st.completed).length;
	const percent = total > 0 ? Math.round((done / total) * 100) : 0;

	return (
		<div
			className={`quest-card${quest.completed ? " completed" : ""}${
				isDragging ? " dragging" : ""
			}`}
			draggable={!quest.completed} // Only allow dragging of non-completed quests
			onDragStart={(e) => onDragStart?.(e, quest)}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
			onDrop={(e) => onDrop?.(e, quest)}
			style={{
				marginBottom: 24,
				border: "1px solid #1a2639",
				borderRadius: 8,
				padding: 16,
				background: quest.completed ? "#18305a" : "#0a2342",
				boxShadow: quest.completed ? "0 0 0 2px #2196f3" : undefined,
				color: "#fff",
				transition:
					"background 0.2s, box-shadow 0.2s, transform 0.2s, opacity 0.2s",
				position: "relative",
				cursor: !quest.completed ? "grab" : "default",
				opacity: isDragging ? 0.5 : 1,
				transform: isDragging ? "scale(1.02)" : "scale(1)",
				// Add visual feedback for drag and drop
				...(isDragging && {
					boxShadow:
						"0 8px 16px rgba(33, 150, 243, 0.3), 0 0 0 2px #2196f3",
					zIndex: 1000,
				}),
			}}
		>
			{/* Add drag handle indicator */}
			{!quest.completed && (
				<div
					style={{
						position: "absolute",
						top: 8,
						left: 8,
						color: "#666",
						fontSize: 16,
						cursor: "grab",
						userSelect: "none",
					}}
					title="Drag to reorder quest"
				>
					⋮⋮
				</div>
			)}

			{/* Main quest completion checkbox */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					marginBottom: 8,
					marginLeft: !quest.completed ? 24 : 0, // Add margin for drag handle
				}}
			>
				<input
					type="checkbox"
					checked={quest.completed}
					disabled={quest.completed}
					onChange={handleMainQuestToggle}
					style={{ marginRight: 8 }}
				/>
				<span
					style={{
						fontWeight: 900,
						fontSize: 22,
						color: "#fff",
						textShadow: "none",
						letterSpacing: 0.5,
					}}
				>
					{quest.title}
				</span>
			</div>
			<div style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>
				{quest.className}{" "}
				{quest.stats.length > 0 && (
					<span style={{ marginLeft: 8 }}>
						{quest.stats.map((s) => (
							<span key={s} style={{ marginRight: 4 }}>
								{s}
							</span>
						))}
					</span>
				)}
			</div>
			{/* Rewards row with icons */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 16,
					margin: "8px 0 8px 0",
					fontWeight: 600,
					fontSize: 15,
					color: quest.completed ? "#2196f3" : "#f9d923",
				}}
			>
				<span
					title="XP"
					style={{ display: "flex", alignItems: "center", gap: 4 }}
				>
					<span style={{ fontSize: 18 }}>✨</span> {quest.xp}
				</span>
				<span
					title="CP"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 4,
						color: "#ffb703",
					}}
				>
					<span style={{ fontSize: 18 }}>⭐</span> {quest.cp || 0}
				</span>
				<span
					title="Coins"
					style={{
						display: "flex",
						alignItems: "center",
						gap: 4,
						color: "#8ecae6",
					}}
				>
					<span style={{ fontSize: 18 }}>🪙</span>{" "}
					{Math.round((quest.xp || 0) * 0.1)}
				</span>
			</div>
			{quest.due && (
				<div style={{ color: "#ffb703", fontSize: 13 }}>
					Due: {quest.due}
				</div>
			)}
			{quest.recur && (
				<div style={{ color: "#8ecae6", fontSize: 13 }}>
					Repeat: {quest.recur}
				</div>
			)}
			{quest.description && (
				<div style={{ margin: "8px 0", color: "#ccc" }}>
					{quest.description}
				</div>
			)}
			{/* Expand/collapse subtasks and details */}
			{quest.subtasks.length > 0 && (
				<div style={{ margin: "8px 0" }}>
					<button
						onClick={() => setExpanded((e) => !e)}
						style={{
							fontSize: 13,
							marginBottom: 4,
							background: "#222a",
							color: "#8ecae6",
							border: "none",
							borderRadius: 4,
							padding: "4px 12px",
							cursor: "pointer",
							fontWeight: 700,
							boxShadow: "0 1px 4px #0002",
							marginRight: 8,
						}}
					>
						{expanded ? "Hide Details" : "Show Details"}
					</button>
					<button
						onClick={onEdit}
						style={{
							fontSize: 13,
							marginBottom: 4,
							background: "#222a",
							color: "#f9d923",
							border: "none",
							borderRadius: 4,
							padding: "4px 12px",
							cursor: "pointer",
							fontWeight: 700,
							boxShadow: "0 1px 4px #0002",
						}}
					>
						Edit
					</button>
					{expanded && (
						<div style={{ marginTop: 8 }}>
							<ul style={{ paddingLeft: 18 }}>
								{quest.subtasks.map((st, idx) => (
									<li
										key={idx}
										style={{
											color: st.completed
												? "#6f6"
												: "#fff",
											textDecoration: st.completed
												? "line-through"
												: undefined,
											display: "flex",
											alignItems: "center",
										}}
									>
										<input
											type="checkbox"
											checked={st.completed}
											onChange={() =>
												handleSubtaskToggle(idx)
											}
											style={{ marginRight: 6 }}
										/>
										{st.text}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
			{/* More prominent progress bar */}
			{total > 0 && (
				<div style={{ margin: "16px 0 8px 0" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 4,
						}}
					>
						<span
							style={{
								fontSize: 13,
								color: percent === 100 ? "#4caf50" : "#2196f3",
								fontWeight: 600,
							}}
						>
							Progress
						</span>
						<span
							style={{
								fontSize: 13,
								color: percent === 100 ? "#4caf50" : "#2196f3",
								fontWeight: 600,
							}}
						>
							{percent}%
						</span>
					</div>
					<div
						style={{
							height: 18,
							background: "#e0e0e0",
							borderRadius: 9,
							overflow: "hidden",
							boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
						}}
					>
						<div
							style={{
								height: 18,
								width: `${percent}%`,
								background:
									percent === 100
										? "#4caf50"
										: "linear-gradient(90deg, #2196f3 0%, #8ecae6 100%)",
								transition: "width 0.3s",
								borderRadius: 9,
								display: "flex",
								alignItems: "center",
								justifyContent:
									percent > 10 ? "flex-end" : "center",
								color: "#fff",
								fontWeight: 700,
								fontSize: 13,
								paddingRight: percent > 10 ? 8 : 0,
							}}
						>
							{/* Optionally show percent inside bar if wide enough */}
							{percent > 30 && `${percent}%`}
						</div>
					</div>
					<div
						style={{
							fontSize: 12,
							color: "#aaa",
							marginTop: 2,
							textAlign: "right",
						}}
					>
						{done} / {total} subtasks complete
					</div>
				</div>
			)}
			{quest.subtasks.length > 0 && null}
			<div
				style={{
					position: "absolute",
					top: 10,
					right: 10,
					fontSize: 18,
				}}
			>
				{quest.completed ? "✅" : ""}
			</div>
			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button
					onClick={handleMainQuestToggle}
					style={{
						background: "#4caf50",
						color: "#fff",
						border: "none",
						borderRadius: 4,
						padding: "4px 10px",
						fontSize: 13,
						cursor: "pointer",
					}}
				>
					{quest.completed ? "Completed" : "Finish"}
				</button>
				<button
					onClick={handleEdit}
					style={{
						background: "#2196f3",
						color: "#fff",
						border: "none",
						borderRadius: 4,
						padding: "4px 10px",
						fontSize: 13,
						cursor: "pointer",
					}}
				>
					Edit
				</button>
				<button
					onClick={handleDelete}
					style={{
						background: "#f44336",
						color: "#fff",
						border: "none",
						borderRadius: 4,
						padding: "4px 10px",
						fontSize: 13,
						cursor: "pointer",
					}}
				>
					Delete
				</button>
			</div>
		</div>
	);
};

// --- QuestGallery ---
interface QuestGalleryProps {
	quests: Quest[];
	plugin?: { app: App };
	refreshQuests?: () => void;
	onEditQuest?: (quest: Quest) => void;
	onQuestReorder?: (newQuestOrder: Quest[]) => void;
}
const QuestGallery: React.FC<QuestGalleryProps> = ({
	quests,
	plugin,
	refreshQuests,
	onEditQuest,
	onQuestReorder,
}) => {
	const [draggedQuest, setDraggedQuest] = useState<Quest | null>(null);

	const handleDragStart = (e: React.DragEvent, quest: Quest) => {
		setDraggedQuest(quest);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", quest.id || quest.title);
	};

	const handleDragEnd = () => {
		setDraggedQuest(null);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = (e: React.DragEvent, targetQuest: Quest) => {
		e.preventDefault();

		if (!draggedQuest || draggedQuest.id === targetQuest.id) {
			return;
		}

		// Find indices
		const draggedIndex = quests.findIndex(
			(q) => q.id === draggedQuest.id || q.title === draggedQuest.title
		);
		const targetIndex = quests.findIndex(
			(q) => q.id === targetQuest.id || q.title === targetQuest.title
		);

		if (draggedIndex === -1 || targetIndex === -1) {
			return;
		}

		// Create new order
		const newQuests = [...quests];
		const [removed] = newQuests.splice(draggedIndex, 1);
		newQuests.splice(targetIndex, 0, removed);

		// Call parent handler to persist the new order
		if (onQuestReorder) {
			onQuestReorder(newQuests);
		}

		setDraggedQuest(null);
	};

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: 16,
				justifyContent: "flex-start",
				alignItems: "stretch",
				marginTop: 8,
			}}
		>
			{quests.map((q) => (
				<QuestCard
					key={q.id || q.title}
					quest={q}
					plugin={plugin}
					refreshQuests={refreshQuests}
					onEdit={() => onEditQuest && onEditQuest(q)}
					isDragging={
						draggedQuest?.id === q.id ||
						draggedQuest?.title === q.title
					}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
				/>
			))}

			{/* Drop zone indicator */}
			{draggedQuest && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(33, 150, 243, 0.1)",
						pointerEvents: "none",
						zIndex: 999,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "#2196f3",
						fontSize: 18,
						fontWeight: 600,
					}}
				>
					Drop quest to reorder
				</div>
			)}
		</div>
	);
};

// Add CreateQuestModal skeleton
interface CreateQuestModalProps {
	isOpen: boolean;
	onClose: () => void;
	onQuestCreated: () => void;
	plugin: { app: App };
}

import type { SkillMetadata } from "../../utils/skillDiscovery";

const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];

const CreateQuestModal: React.FC<CreateQuestModalProps> = ({
	isOpen,
	onClose,
	onQuestCreated,
	plugin,
}) => {
	const [title, setTitle] = useState("");
	const [skills, setSkills] = useState<SkillMetadata[]>([]);
	const [allSkills, setAllSkills] = useState<SkillMetadata[]>([]);
	const [priority, setPriority] = useState("Medium");
	const [difficulty, setDifficulty] = useState("Medium");
	const [xp, setXp] = useState(10);
	const [cp, setCp] = useState(5);
	const [due, setDue] = useState("");
	const [recur, setRecur] = useState("");
	const [error, setError] = useState<string | null>(null);
	// Change subtasks state to array of objects
	const [subtasks, setSubtasks] = useState<
		{ text: string; completed: boolean }[]
	>([]);
	const [newSubtask, setNewSubtask] = useState("");
	const [metadataStyle, setMetadataStyle] = useState<"emoji" | "tags">(
		"emoji"
	);

	// Load all skills from skillDiscovery
	useEffect(() => {
		(async () => {
			const mod = await import("../../utils/skillDiscovery");
			if (mod.getAllSkills && plugin?.app?.vault) {
				const skills = await mod.getAllSkills(plugin.app.vault);
				setAllSkills(skills);
				console.log("Loaded skills in CreateQuestModal:", skills); // <-- Add this line
			} else {
				setAllSkills([]);
				console.log("No skills loaded (missing vault or getAllSkills)");
			}
		})();
	}, [plugin]);

	const handleAddSkill = () => {
		// Add first unselected skill
		const unselected = allSkills.find(
			(s) => !skills.some((sel) => sel.name === s.name)
		);
		if (unselected) setSkills([...skills, unselected]);
	};
	const handleRemoveSkill = (name: string) =>
		setSkills(skills.filter((s) => s.name !== name));
	const handleSkillChange = (idx: number, name: string) => {
		const skill = allSkills.find((s) => s.name === name);
		if (skill) setSkills(skills.map((s, i) => (i === idx ? skill : s)));
	};

	// Subtask handlers
	const handleAddSubtask = () => {
		if (newSubtask.trim()) {
			setSubtasks([
				...subtasks,
				{ text: newSubtask.trim(), completed: false },
			]);
			setNewSubtask("");
		}
	};
	const handleRemoveSubtask = (idx: number) => {
		setSubtasks(subtasks.filter((_, i) => i !== idx));
	};
	const handleEditSubtask = (idx: number, value: string) => {
		setSubtasks(
			subtasks.map((st, i) => (i === idx ? { ...st, text: value } : st))
		);
	};
	const handleToggleSubtask = (idx: number) => {
		setSubtasks(
			subtasks.map((st, i) =>
				i === idx ? { ...st, completed: !st.completed } : st
			)
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) {
			setError("Title is required");
			return;
		}
		if (skills.length === 0) {
			setError("At least one skill/class is required");
			return;
		}
		// Generate markdown
		const questMd = generateMarkdownTask({
			title,
			subtasks,
			skills,
			priority,
			difficulty,
			xp,
			cp,
			due,
			recur,
			metadataStyle,
		});
		// Write to file
		try {
			const { vault } = plugin.app;
			const file = vault.getAbstractFileByPath("GamifiedTasks.md");
			if (
				file &&
				file instanceof TFile &&
				"append" in vault &&
				typeof vault.append === "function"
			) {
				await vault.append(file, `\n${questMd}\n`);
			} else if (file && file instanceof TFile) {
				// fallback: read, append, write
				const content = await vault.read(file);
				await vault.modify(file, content + `\n${questMd}\n`);
			} else {
				await vault.create("GamifiedTasks.md", questMd);
			}
			onQuestCreated();
			onClose();
		} catch (err) {
			setError("Failed to save quest: " + (err as Error).message);
		}
	};

	// --- UI ---
	if (!isOpen) return null;

	// Modal content
	const modalContent = (
		<div
			className="modal-overlay"
			onClick={onClose}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "rgba(0,0,0,0.5)",
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				className="modal"
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "#23272e",
					borderRadius: 12,
					padding: 24,
					maxWidth: 360,
					width: "100%",
					boxShadow: "0 4px 32px #000a",
					zIndex: 10000,
				}}
			>
				<h2 style={{ marginBottom: 8 }}>Add Quest</h2>
				<form onSubmit={handleSubmit}>
					<label>
						Title
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							style={{ width: "100%" }}
						/>
					</label>
					{/* Subtasks UI */}
					<div style={{ margin: "12px 0 0 0" }}>
						<label>Subtasks</label>
						<ul style={{ paddingLeft: 16, margin: 0 }}>
							{subtasks.map((st, idx) => (
								<li
									key={idx}
									style={{
										display: "flex",
										alignItems: "center",
										marginBottom: 2,
									}}
								>
									<input
										type="checkbox"
										checked={st.completed}
										onChange={() =>
											handleToggleSubtask(idx)
										}
										style={{ marginRight: 4 }}
									/>
									<input
										type="text"
										value={st.text}
										onChange={(e) =>
											handleEditSubtask(
												idx,
												e.target.value
											)
										}
										style={{ flex: 1, marginRight: 4 }}
									/>
									<button
										type="button"
										onClick={() => handleRemoveSubtask(idx)}
										style={{ marginLeft: 2 }}
									>
										×
									</button>
								</li>
							))}
						</ul>
						<div style={{ display: "flex", gap: 4, marginTop: 4 }}>
							<input
								type="text"
								placeholder="Add subtask..."
								value={newSubtask}
								onChange={(e) => setNewSubtask(e.target.value)}
								style={{ flex: 1 }}
							/>
							<button type="button" onClick={handleAddSubtask}>
								+
							</button>
						</div>
					</div>
					{/* Skills/Classes UI (restored) */}
					<label>Skills/Classes</label>
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 4,
							marginBottom: 4,
						}}
					>
						{skills.map((skill, idx) => (
							<span
								key={skill.name}
								style={{
									background: "#eee",
									borderRadius: 12,
									padding: "2px 8px",
									display: "flex",
									alignItems: "center",
								}}
							>
								<select
									value={skill.name}
									onChange={(e) =>
										handleSkillChange(idx, e.target.value)
									}
								>
									{allSkills.map((s) => (
										<option key={s.name} value={s.name}>
											{s.name}
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={() =>
										handleRemoveSkill(skill.name)
									}
									style={{ marginLeft: 4 }}
								>
									×
								</button>
							</span>
						))}
						<button
							type="button"
							onClick={handleAddSkill}
							style={{
								background: "#f5f5f5",
								borderRadius: 12,
								padding: "2px 8px",
							}}
						>
							+
						</button>
					</div>
					{skills.length > 0 && (
						<div style={{ margin: "8px 0" }}>
							<label>Stats for selected skills:</label>
							<ul style={{ margin: 0, paddingLeft: 16 }}>
								{skills.map((skill) => (
									<li key={skill.name}>
										<b>{skill.name}</b>: {skill.class} |{" "}
										{skill.stats
											? Object.keys(skill.stats).join(
													", "
											  )
											: "No stats"}
									</li>
								))}
							</ul>
						</div>
					)}
					<div style={{ margin: "12px 0 0 0" }}>
						<label>Metadata Style</label>
						<select
							value={metadataStyle}
							onChange={(e) =>
								setMetadataStyle(
									e.target.value as "emoji" | "tags"
								)
							}
							style={{ width: "100%" }}
						>
							<option value="emoji">Emoji</option>
							<option value="tags">Tags/Curly Braces</option>
						</select>
					</div>
					{/* Live Markdown Preview */}
					<div style={{ margin: "16px 0 0 0" }}>
						<label>Preview</label>
						<pre
							style={{
								background: "#181a1b",
								color: "#e0e0e0",
								borderRadius: 8,
								padding: 12,
								fontSize: 13,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								minHeight: 60,
								marginTop: 4,
								userSelect: "text",
							}}
						>
							{generateMarkdownTask({
								title,
								subtasks,
								skills,
								priority,
								difficulty,
								xp,
								cp,
								due,
								recur,
								metadataStyle,
							})}
						</pre>
					</div>
					<div
						style={{
							margin: "12px 0 0 0",
							display: "flex",
							gap: 8,
						}}
					>
						<label style={{ flex: 1 }}>
							Priority
							<select
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								style={{ width: "100%" }}
							>
								{PRIORITY_OPTIONS.map((opt) => (
									<option key={opt} value={opt}>
										{opt}
									</option>
								))}
							</select>
						</label>
						<label style={{ flex: 1 }}>
							Difficulty
							<select
								value={difficulty}
								onChange={(e) => setDifficulty(e.target.value)}
								style={{ width: "100%" }}
							>
								{DIFFICULTY_OPTIONS.map((opt) => (
									<option key={opt} value={opt}>
										{opt}
									</option>
								))}
							</select>
						</label>
					</div>
					<div
						style={{
							margin: "12px 0 0 0",
							display: "flex",
							gap: 8,
						}}
					>
						<label style={{ flex: 1 }}>
							XP
							<input
								type="number"
								value={xp}
								min={0}
								onChange={(e) => setXp(Number(e.target.value))}
								style={{ width: "100%" }}
							/>
						</label>
						<label style={{ flex: 1 }}>
							CP
							<input
								type="number"
								value={cp}
								min={0}
								onChange={(e) => setCp(Number(e.target.value))}
								style={{ width: "100%" }}
							/>
						</label>
					</div>
					<div
						style={{
							margin: "12px 0 0 0",
							display: "flex",
							gap: 8,
						}}
					>
						<label style={{ flex: 1 }}>
							Due Date
							<input
								type="date"
								value={due}
								onChange={(e) => setDue(e.target.value)}
								style={{ width: "100%" }}
							/>
						</label>
						<label style={{ flex: 1 }}>
							Recurrence
							<input
								type="text"
								value={recur}
								onChange={(e) => setRecur(e.target.value)}
								placeholder="e.g. weekly"
								style={{ width: "100%" }}
							/>
						</label>
					</div>
					{error && (
						<div style={{ color: "red", marginTop: 8 }}>
							{error}
						</div>
					)}
					<div
						style={{
							marginTop: 16,
							display: "flex",
							justifyContent: "flex-end",
							gap: 8,
						}}
					>
						<button type="button" onClick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							style={{ background: "#4caf50", color: "white" }}
						>
							Add Quest
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	// Use portal to render outside sidebar
	return ReactDOM.createPortal(modalContent, document.body);
};

// --- Markdown generation helper ---
function sanitizeForClassName(value: string): string {
	return value.replace(/\s+/g, "-");
}

function generateMarkdownTask({
	title,
	subtasks,
	skills,
	priority,
	difficulty,
	xp,
	cp,
	due,
	recur,
	metadataStyle = "emoji",
}: {
	title: string;
	subtasks: { text: string; completed: boolean }[];
	skills: SkillMetadata[];
	priority: string;
	difficulty: string;
	xp: number;
	cp: number;
	due?: string;
	recur?: string;
	metadataStyle?: "emoji" | "tags";
}): string {
	const sanitizedDifficulty = sanitizeForClassName(difficulty);
	const priorityEmoji =
		priority === "High"
			? "⏫"
			: priority === "Medium"
			? "🔼"
			: priority === "Low"
			? "⏩"
			: "";

	// --- Emoji-based metadata ---
	const emojiMeta: string[] = [];
	if (metadataStyle === "emoji") {
		// Always include CP, XP, and coins (rounded, 10% of XP)
		if (typeof cp === "number") emojiMeta.push(`⭐${cp}`);
		if (typeof xp === "number") emojiMeta.push(`✨${xp}`);
		const coins = Math.round((typeof xp === "number" ? xp : 0) * 0.1);
		emojiMeta.push(`🪙${coins}`);
		if (recur) emojiMeta.push(`🔁${recur}`);
		else if (recur === "") emojiMeta.push(`🔁`); // show toggle if present but empty
		if (skills.length > 0)
			emojiMeta.push(`🛠️${skills.map((s) => s.name).join(",")}`);
		if (sanitizedDifficulty) emojiMeta.push(`🔺${sanitizedDifficulty}`);
		else if (difficulty === "") emojiMeta.push(`🔺`); // show toggle if present but empty
		// Place date last
		if (due) emojiMeta.push(`📅${due}`);
	}

	// --- Tasks plugin metadata (inline comment) ---
	const tasksMeta = [
		`difficulty: ${sanitizedDifficulty}`,
		`xp: ${xp}`,
		`cp: ${cp}`,
		due ? `due: ${due}` : null,
		recur ? `recur: ${recur}` : null,
		`skills: ${skills.map((s) => s.name).join(", ")}`,
	].filter(Boolean);
	const tasksMetaString = tasksMeta.join(" | ");

	// --- TaskGenius plugin metadata (curly braces) ---
	const tgMetaObj: Record<string, string | number | boolean | string[]> = {
		difficulty: sanitizedDifficulty,
		xp,
		cp,
		...(due ? { due } : {}),
		...(recur ? { recur } : {}),
		skills: skills.map((s) => s.name),
	};
	const tgMetaString = `{${Object.entries(tgMetaObj)
		.map(([k, v]) =>
			Array.isArray(v)
				? `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`
				: typeof v === "string"
				? `${k}: "${v}"`
				: `${k}: ${v}`
		)
		.join(", ")}}`;

	let md = `- [ ]${
		priorityEmoji ? ` ${priorityEmoji}` : ""
	} ${title} #gamified-task`;
	if (metadataStyle === "emoji" && emojiMeta.length > 0) {
		md += " " + emojiMeta.join(" ");
	}
	if (metadataStyle === "tags") {
		md += `  // ${tasksMetaString} ${tgMetaString}`;
	}
	if (subtasks.length > 0) {
		md +=
			"\n" +
			subtasks
				.map((st) => `  - [${st.completed ? "x" : " "}] ${st.text}`)
				.join("\n");
	}
	return md;
}

const EditQuestModal: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	quest: Quest | null;
	plugin: { app: App };
	onQuestEdited: () => void;
}> = ({ isOpen, onClose, quest, plugin, onQuestEdited }) => {
	const [title, setTitle] = useState(quest?.title || "");
	const [skills, setSkills] = useState<string[]>(quest?.skills || []);
	const [className, setClassName] = useState(quest?.className || "");
	const [stats, setStats] = useState<string[]>(quest?.stats || []);
	const [priority, setPriority] = useState(quest?.priority || "Medium");
	const [difficulty, setDifficulty] = useState(quest?.difficulty || "Medium");
	const [xp, setXp] = useState(quest?.xp || 0);
	const [cp, setCp] = useState(quest?.cp || 0);
	const [due, setDue] = useState(quest?.due || "");
	const [recur, setRecur] = useState(quest?.recur || "");
	const [description, setDescription] = useState(quest?.description || "");
	const [subtasks, setSubtasks] = useState<
		{ text: string; completed: boolean }[]
	>(quest?.subtasks || []);
	const [newSubtask, setNewSubtask] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (quest) {
			setTitle(quest.title);
			setSkills(quest.skills || []);
			setClassName(quest.className || "");
			setStats(quest.stats || []);
			setPriority(quest.priority || "Medium");
			setDifficulty(quest.difficulty || "Medium");
			setXp(quest.xp || 0);
			setCp(quest.cp || 0);
			setDue(quest.due || "");
			setRecur(quest.recur || "");
			setDescription(quest.description || "");
			setSubtasks(quest.subtasks || []);
		}
	}, [quest]);

	const handleAddSubtask = () => {
		if (newSubtask.trim()) {
			setSubtasks([
				...subtasks,
				{ text: newSubtask.trim(), completed: false },
			]);
			setNewSubtask("");
		}
	};
	const handleRemoveSubtask = (idx: number) => {
		setSubtasks(subtasks.filter((_, i) => i !== idx));
	};
	const handleEditSubtask = (idx: number, value: string) => {
		setSubtasks(
			subtasks.map((st, i) => (i === idx ? { ...st, text: value } : st))
		);
	};
	const handleToggleSubtask = (idx: number) => {
		setSubtasks(
			subtasks.map((st, i) =>
				i === idx ? { ...st, completed: !st.completed } : st
			)
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) {
			setError("Title is required");
			return;
		}
		// Update quest in file
		try {
			const { vault } = plugin.app;
			const file = vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				const content = await vault.read(file);
				const lines = content.split("\n");
				// Find quest start
				const i = lines.findIndex(
					(l) =>
						l.includes(quest?.title || "") &&
						l.includes("#gamified-task")
				);
				if (i === -1) throw new Error("Quest not found");
				// Find end of quest block (subtasks)
				let end = i + 1;
				while (end < lines.length && lines[end].startsWith("  - ["))
					end++;
				// Generate new quest markdown
				let md = `- [${
					quest?.completed ? "x" : " "
				}] ${title} #gamified-task class:${className} stats:${stats.join(
					","
				)} xp:${xp} cp:${cp} priority:${priority} difficulty:${difficulty} due:${due} recur:${recur}`;
				if (description) md += ` description:${description}`;
				if (subtasks.length > 0) {
					md +=
						"\n" +
						subtasks
							.map(
								(st) =>
									`  - [${st.completed ? "x" : " "}] ${
										st.text
									}`
							)
							.join("\n");
				}
				// Replace quest block
				lines.splice(i, end - i, ...md.split("\n"));
				await vault.modify(file, lines.join("\n"));
				onQuestEdited();
				onClose();
			}
		} catch (err) {
			setError("Failed to update quest: " + (err as Error).message);
		}
	};

	if (!isOpen || !quest) return null;
	return ReactDOM.createPortal(
		<div
			className="modal-overlay"
			onClick={onClose}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				background: "rgba(0,0,0,0.5)",
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				className="modal"
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "#23272e",
					borderRadius: 12,
					padding: 24,
					maxWidth: 360,
					width: "100%",
					boxShadow: "0 4px 32px #000a",
					zIndex: 10000,
				}}
			>
				<h2 style={{ marginBottom: 8 }}>Edit Quest</h2>
				<form onSubmit={handleSubmit}>
					<label>
						Title
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							style={{ width: "100%" }}
						/>
					</label>
					<label>
						Description
						<input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							style={{ width: "100%" }}
						/>
					</label>
					<label>
						Class
						<input
							type="text"
							value={className}
							onChange={(e) => setClassName(e.target.value)}
							style={{ width: "100%" }}
						/>
					</label>
					<label>
						Stats
						<input
							type="text"
							value={stats.join(", ")}
							onChange={(e) =>
								setStats(
									e.target.value
										.split(",")
										.map((s) => s.trim())
								)
							}
							style={{ width: "100%" }}
						/>
					</label>
					<label>
						Skills
						<input
							type="text"
							value={skills.join(", ")}
							onChange={(e) =>
								setSkills(
									e.target.value
										.split(",")
										.map((s) => s.trim())
								)
							}
							style={{ width: "100%" }}
						/>
					</label>
					<div style={{ margin: "12px 0 0 0" }}>
						<label>Subtasks</label>
						<ul style={{ paddingLeft: 16, margin: 0 }}>
							{subtasks.map((st, idx) => (
								<li
									key={idx}
									style={{
										display: "flex",
										alignItems: "center",
										marginBottom: 2,
									}}
								>
									<input
										type="checkbox"
										checked={st.completed}
										onChange={() =>
											handleToggleSubtask(idx)
										}
										style={{ marginRight: 4 }}
									/>
									<input
										type="text"
										value={st.text}
										onChange={(e) =>
											handleEditSubtask(
												idx,
												e.target.value
											)
										}
										style={{ flex: 1, marginRight: 4 }}
									/>
									<button
										type="button"
										onClick={() => handleRemoveSubtask(idx)}
										style={{ marginLeft: 2 }}
									>
										×
									</button>
								</li>
							))}
						</ul>
						<div style={{ display: "flex", gap: 4, marginTop: 4 }}>
							<input
								type="text"
								placeholder="Add subtask..."
								value={newSubtask}
								onChange={(e) => setNewSubtask(e.target.value)}
								style={{ flex: 1 }}
							/>
							<button type="button" onClick={handleAddSubtask}>
								+
							</button>
						</div>
					</div>
					<div
						style={{
							margin: "12px 0 0 0",
							display: "flex",
							gap: 8,
						}}
					>
						<label style={{ flex: 1 }}>
							Priority
							<select
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								style={{ width: "100%" }}
							>
								{PRIORITY_OPTIONS.map((opt) => (
									<option key={opt} value={opt}>
										{opt}
									</option>
								))}
							</select>
						</label>
						<label style={{ flex: 1 }}>
							Difficulty
							<select
								value={difficulty}
								onChange={(e) => setDifficulty(e.target.value)}
								style={{ width: "100%" }}
							>
								{DIFFICULTY_OPTIONS.map((opt) => (
									<option key={opt} value={opt}>
										{opt}
									</option>
								))}
							</select>
						</label>
					</div>
					<div
						style={{
							margin: "12px 0 0 0",
							display: "flex",
							gap: 8,
						}}
					>
						<label style={{ flex: 1 }}>
							XP
							<input
								type="number"
								value={xp}
								min={0}
								onChange={(e) => setXp(Number(e.target.value))}
								style={{ width: "100%" }}
							/>
						</label>
						<label style={{ flex: 1 }}>
							CP
							<input
								type="number"
								value={cp}
								min={0}
								onChange={(e) => setCp(Number(e.target.value))}
								style={{ width: "100%" }}
							/>
						</label>
					</div>
					<div
						style={{
							margin: "12px 0 0 0",
							display: "flex",
							gap: 8,
						}}
					>
						<label style={{ flex: 1 }}>
							Due Date
							<input
								type="date"
								value={due}
								onChange={(e) => setDue(e.target.value)}
								style={{ width: "100%" }}
							/>
						</label>
						<label style={{ flex: 1 }}>
							Recurrence
							<input
								type="text"
								value={recur}
								onChange={(e) => setRecur(e.target.value)}
								placeholder="e.g. weekly"
								style={{ width: "100%" }}
							/>
						</label>
					</div>
					{error && (
						<div style={{ color: "red", marginTop: 8 }}>
							{error}
						</div>
					)}
					<div
						style={{
							marginTop: 16,
							display: "flex",
							justifyContent: "flex-end",
							gap: 8,
						}}
					>
						<button type="button" onClick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							style={{ background: "#2196f3", color: "white" }}
						>
							Save Changes
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
};

// --- Main QuestTab ---
const MOCK_MARKDOWN = `
- [ ] Defeat the Slime King #gamified-task class:Warrior stats:Strength,Endurance xp:200 coins:20
  - [x] Find the Slime King
  - [ ] Land the final blow
- [x] Brew a Healing Potion #gamified-task class:Alchemist stats:Intelligence xp:100 coins:10
  - [x] Gather herbs
  - [x] Mix ingredients
- [ ] Write a plugin #gamified-task class:Wizard stats:Intelligence,Creativity xp:300 coins:30 special:today
  - [ ] Plan features
  - [ ] Write code
  - [ ] Test in Obsidian
`;

interface QuestTabProps {
	plugin: { app: App };
}

const QuestTab: React.FC<QuestTabProps> = ({ plugin }) => {
	const [quests, setQuests] = useState<Quest[]>([]);
	const [isCreateModalOpen, setCreateModalOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
	// --- Filter state ---
	const [status, setStatus] = useState<"active" | "completed" | "all">(
		"active"
	);
	const [className, setClassName] = useState("");
	// --- Sort state ---
	const [sortBy, setSortBy] = useState("due");
	// --- Auto-refresh on file change ---
	useEffect(() => {
		const vault = plugin.app.vault;
		const file = vault.getAbstractFileByPath("GamifiedTasks.md");
		if (!file || !(file instanceof TFile)) return;
		const onModify = (f: TFile) => {
			if (f.path === file.path) loadQuests();
		};
		vault.on("modify", onModify);
		return () => {
			vault.off("modify", onModify);
		};
	}, [plugin]);
	// --- Extract class options ---
	const classOptions = Array.from(
		new Set(quests.map((q) => q.className).filter(Boolean))
	);
	// --- Filter quests ---
	let filteredQuests = quests.filter((q) => {
		if (status === "active" && q.completed) return false;
		if (status === "completed" && !q.completed) return false;
		if (className && q.className !== className) return false;
		return true;
	});
	// --- Sort quests ---
	filteredQuests = [...filteredQuests].sort((a, b) => {
		if (sortBy === "due") {
			if (!a.due && !b.due) return 0;
			if (!a.due) return 1;
			if (!b.due) return -1;
			return a.due.localeCompare(b.due);
		} else if (sortBy === "xp") {
			return (b.xp || 0) - (a.xp || 0);
		} else if (sortBy === "title") {
			return a.title.localeCompare(b.title);
		}
		return 0;
	});

	const loadQuests = async () => {
		try {
			const vault = plugin.app.vault;
			const file = vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				const content = await vault.read(file);
				setQuests(parseQuestsFromMarkdown(content));
			} else {
				setQuests(parseQuestsFromMarkdown(MOCK_MARKDOWN));
			}
		} catch (e) {
			setQuests(parseQuestsFromMarkdown(MOCK_MARKDOWN));
		}
	};

	useEffect(() => {
		loadQuests();
	}, [plugin]);

	const refreshQuests = () => {
		loadQuests();
	};

	// Handle quest reordering
	const handleQuestReorder = async (newQuestOrder: Quest[]) => {
		try {
			const vault = plugin.app.vault;
			const file = vault.getAbstractFileByPath("GamifiedTasks.md");
			if (file && file instanceof TFile) {
				// Read current content
				const content = await vault.read(file);
				const lines = content.split("\n");

				// Find all quest blocks (quest + subtasks)
				const questBlocks: {
					quest: Quest;
					lines: string[];
					startIndex: number;
				}[] = [];

				for (const quest of quests) {
					const questLineIndex = lines.findIndex(
						(l: string) =>
							l.includes(quest.title) &&
							l.includes("#gamified-task")
					);

					if (questLineIndex !== -1) {
						let endIndex = questLineIndex + 1;
						// Find end of subtasks
						while (
							endIndex < lines.length &&
							lines[endIndex].trim().startsWith("  - [")
						) {
							endIndex++;
						}

						const questLines = lines.slice(
							questLineIndex,
							endIndex
						);
						questBlocks.push({
							quest,
							lines: questLines,
							startIndex: questLineIndex,
						});
					}
				}

				// Sort quest blocks by their original position (descending) for safe removal
				questBlocks.sort((a, b) => b.startIndex - a.startIndex);

				// Remove all quest blocks from original positions
				const remainingLines = [...lines];
				for (const block of questBlocks) {
					remainingLines.splice(block.startIndex, block.lines.length);
				}

				// Find non-quest content (header, etc.)
				const headerEndIndex = remainingLines.findIndex(
					(line) =>
						line.trim() === "" || line.includes("#gamified-task")
				);
				const headerLines =
					headerEndIndex > 0
						? remainingLines.slice(0, headerEndIndex)
						: [];

				// Rebuild file with new quest order
				const newLines = [...headerLines];
				if (
					headerLines.length > 0 &&
					headerLines[headerLines.length - 1].trim() !== ""
				) {
					newLines.push(""); // Add empty line after header
				}

				for (const quest of newQuestOrder) {
					const questBlock = questBlocks.find(
						(b) =>
							b.quest.id === quest.id ||
							b.quest.title === quest.title
					);
					if (questBlock) {
						newLines.push(...questBlock.lines);
					}
				}

				// Write the reordered content back
				await vault.modify(file, newLines.join("\n"));

				// Update local state
				setQuests(newQuestOrder);

				new Notice("Quest order updated!");
			}
		} catch (err) {
			console.error("Failed to reorder quests:", err);
			new Notice("Failed to reorder quests");
		}
	};

	return (
		<div style={{ padding: 24 }}>
			{/* Add Quest button outside the Quest Board card */}
			<button
				style={{
					background: "#8ecae6",
					color: "#222",
					border: "none",
					borderRadius: 6,
					padding: "8px 16px",
					fontWeight: 600,
					fontSize: 16,
					cursor: "pointer",
					marginBottom: 16,
					boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
					display: "block",
					marginLeft: "auto",
				}}
				onClick={() => setCreateModalOpen(true)}
			>
				+ Add Quest
			</button>
			<QuestBoardHeader onAddQuest={() => setCreateModalOpen(true)} />
			<CreateQuestModal
				isOpen={isCreateModalOpen}
				onClose={() => setCreateModalOpen(false)}
				onQuestCreated={refreshQuests}
				plugin={plugin}
			/>
			{/* Move EditQuestModal here, outside the QuestBoardHeader area */}
			<EditQuestModal
				isOpen={!!editingQuest}
				onClose={() => setEditingQuest(null)}
				quest={editingQuest}
				plugin={plugin}
				onQuestEdited={refreshQuests}
			/>
			<QuestFilters
				status={status}
				setStatus={setStatus}
				className={className}
				setClassName={setClassName}
				classOptions={classOptions}
				sortBy={sortBy}
				setSortBy={setSortBy}
			/>
			<QuestGallery
				quests={filteredQuests}
				plugin={plugin}
				refreshQuests={refreshQuests}
				onEditQuest={setEditingQuest}
				onQuestReorder={handleQuestReorder}
			/>
		</div>
	);
};

export default QuestTab;
