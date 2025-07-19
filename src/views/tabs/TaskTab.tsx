import React, { useState } from "react";
import { getAllSkills, SkillMetadata } from "../../utils/skillDiscovery";
import { generateMarkdownTask, MetadataStyle } from "../../utils/taskParser";
import { TFile, App } from "obsidian";

const GAMIFIED_TASKS_PATH = "GamifiedTasks.md";

const TaskTab: React.FC<{ app?: App }> = ({ app }) => {
	const [showModal, setShowModal] = useState(false);
	const [skills, setSkills] = useState<SkillMetadata[]>([]);
	const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(
		null
	);
	const [title, setTitle] = useState("");
	const [xp, setXp] = useState(100);
	const [priority, setPriority] = useState("");
	const [difficulty, setDifficulty] = useState("");
	const [feedback, setFeedback] = useState("");
	const [metadataStyle, setMetadataStyle] = useState<MetadataStyle>("tags");

	// Load skills on mount
	React.useEffect(() => {
		(async () => {
			if (app?.vault) {
				const allSkills = await getAllSkills(app.vault);
				setSkills(allSkills);
				console.log("Loaded skills in TaskTab:", allSkills); // <-- Add this line
			}
		})();
	}, [app]);

	// Auto-select first skill
	React.useEffect(() => {
		if (skills.length && !selectedSkill) setSelectedSkill(skills[0]);
	}, [skills]);

	// Auto-calculate coins
	const coins = Math.round(xp * 0.1);

	// Handle task creation
	const handleCreateTask = async () => {
		if (!title || !selectedSkill) return;
		const md = generateMarkdownTask({
			title,
			skill: selectedSkill.name,
			className: selectedSkill.class,
			stats: selectedSkill.stats ? Object.keys(selectedSkill.stats) : [],
			xp,
			cp: xp,
			coins,
			priority,
			difficulty,
			metadataStyle,
		});
		if (app?.vault) {
			// Ensure file exists
			let file = app.vault.getAbstractFileByPath(GAMIFIED_TASKS_PATH);
			if (!file) {
				file = await app.vault.create(GAMIFIED_TASKS_PATH, "");
			}
			if (file instanceof TFile) {
				const content = await app.vault.read(file);
				await app.vault.modify(
					file,
					content + (content ? "\n" : "") + md + "\n"
				);
				setFeedback("Task added!");
				setShowModal(false);
				setTitle("");
				setPriority("");
				setDifficulty("");
			}
		}
	};

	return (
		<div style={{ padding: 24 }}>
			<h2>Task Creation</h2>
			<button onClick={() => setShowModal(true)}>+ Add Task</button>
			{feedback && (
				<div style={{ color: "green", marginTop: 8 }}>{feedback}</div>
			)}
			{showModal && (
				<div
					style={{
						marginTop: 16,
						background: "#222",
						padding: 24,
						borderRadius: 8,
						maxWidth: 400,
					}}
				>
					<h3>Create a New Task</h3>
					<label>
						Metadata Style:
						<br />
						<select
							value={metadataStyle}
							onChange={(e) =>
								setMetadataStyle(
									e.target.value as MetadataStyle
								)
							}
							style={{ width: "100%" }}
						>
							<option value="tags">Tags & Dataview</option>
							<option value="emoji">Emoji Inline</option>
						</select>
					</label>
					<br />
					<label>
						Title:
						<br />
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							style={{ width: "100%" }}
						/>
					</label>
					<br />
					<label>
						Skill:
						<br />
						<select
							value={selectedSkill?.name}
							onChange={(e) => {
								const skill = skills.find(
									(s) => s.name === e.target.value
								);
								setSelectedSkill(skill || null);
							}}
							style={{ width: "100%" }}
						>
							{skills.map((skill) => (
								<option key={skill.name} value={skill.name}>
									{skill.name}
								</option>
							))}
						</select>
					</label>
					<br />
					<label>
						Class:
						<br />
						<input
							value={selectedSkill?.class || ""}
							readOnly
							style={{ width: "100%" }}
						/>
					</label>
					<br />
					<label>
						Stats:
						<br />
						<input
							value={
								selectedSkill?.stats
									? Object.keys(selectedSkill.stats).join(
											", "
									)
									: ""
							}
							readOnly
							style={{ width: "100%" }}
						/>
					</label>
					<br />
					<label>
						XP:
						<br />
						<input
							type="number"
							value={xp}
							min={1}
							onChange={(e) => setXp(Number(e.target.value))}
							style={{ width: "100%" }}
						/>
					</label>
					<br />
					<label>
						Coins:
						<br />
						<input
							value={coins}
							readOnly
							style={{ width: "100%" }}
						/>
					</label>
					<br />
					<label>
						Priority:
						<br />
						<input
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
							style={{ width: "100%" }}
							placeholder="(optional)"
						/>
					</label>
					<br />
					<label>
						Difficulty:
						<br />
						<input
							value={difficulty}
							onChange={(e) => setDifficulty(e.target.value)}
							style={{ width: "100%" }}
							placeholder="(optional)"
						/>
					</label>
					<br />
					{/* Live Markdown Preview */}
					<div style={{ marginTop: 16 }}>
						<div style={{ fontWeight: "bold", marginBottom: 4 }}>
							Live Preview:
						</div>
						<pre
							style={{
								background: "#111",
								color: "#fff",
								padding: 12,
								borderRadius: 6,
								fontSize: 13,
								whiteSpace: "pre-wrap",
							}}
						>
							{generateMarkdownTask({
								title,
								skill: selectedSkill?.name || "",
								className: selectedSkill?.class || "",
								stats: selectedSkill?.stats
									? Object.keys(selectedSkill.stats)
									: [],
								xp,
								cp: xp,
								coins,
								priority,
								difficulty,
								metadataStyle,
							})}
						</pre>
					</div>
					<div style={{ display: "flex", gap: 8, marginTop: 16 }}>
						<button onClick={handleCreateTask} style={{ flex: 1 }}>
							Create Task
						</button>
						<button
							onClick={() => setShowModal(false)}
							style={{ flex: 1 }}
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default TaskTab;
