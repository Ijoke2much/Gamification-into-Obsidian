import React, { useState, useEffect } from "react";
import { App, TFile, Component } from "obsidian";
import type GamifiedObsidianPlugin from "../main";

interface DatacoreTaskViewProps {
	app: App;
	plugin: GamifiedObsidianPlugin;
}

interface DatacoreQuery {
	id: string;
	name: string;
	query: string;
	description: string;
}

const DEFAULT_QUERIES: DatacoreQuery[] = [
	{
		id: "overdue-tasks",
		name: "Overdue Tasks",
		query: `
TABLE WITHOUT ID
  file.link as Task,
  due as "Due Date",
  priority as Priority,
  choice(skills, skills[0], "General") as Skill
FROM #gamified-task
WHERE !completed AND due < date(today)
SORT due ASC
    `,
		description: "Shows all overdue tasks",
	},
	{
		id: "today-tasks",
		name: "Today's Tasks",
		query: `
TABLE WITHOUT ID
  file.link as Task,
  xp as XP,
  coins as Coins,
  choice(skills, skills[0], "General") as Skill
FROM #gamified-task  
WHERE !completed AND (due = date(today) OR today = true)
SORT priority DESC, xp DESC
    `,
		description: "Tasks due today",
	},
	{
		id: "high-xp-tasks",
		name: "High XP Tasks",
		query: `
TABLE WITHOUT ID
  file.link as Task,
  xp as XP,
  coins as Coins,
  due as "Due Date",
  choice(skills, skills[0], "General") as Skill
FROM #gamified-task
WHERE !completed AND xp >= 100
SORT xp DESC
    `,
		description: "Tasks with 100+ XP reward",
	},
	{
		id: "skill-breakdown",
		name: "Tasks by Skill",
		query: `
TABLE WITHOUT ID
  choice(skills, skills[0], "General") as Skill,
  length(filter(rows, (r) => !r.completed)) as "Active Tasks",
  sum(filter(rows.xp, (r, xp) => !r.completed)) as "Total XP"
FROM #gamified-task
GROUP BY choice(skills, skills[0], "General")
SORT "Total XP" DESC
    `,
		description: "Task breakdown by skill category",
	},
	{
		id: "weekly-progress",
		name: "Weekly Progress",
		query: `
TABLE WITHOUT ID
  dateformat(completed_date, "yyyy-MM-dd") as Date,
  count(rows) as "Tasks Completed",
  sum(rows.xp) as "XP Earned",
  sum(rows.coins) as "Coins Earned"
FROM #gamified-task
WHERE completed AND completed_date >= date(today) - dur(7 days)
GROUP BY dateformat(completed_date, "yyyy-MM-dd")
SORT Date DESC
    `,
		description: "Completed tasks in the last 7 days",
	},
];

const DatacoreTaskView: React.FC<DatacoreTaskViewProps> = ({ app, plugin }) => {
	const [selectedQuery, setSelectedQuery] = useState<DatacoreQuery>(
		DEFAULT_QUERIES[0]
	);
	const [customQuery, setCustomQuery] = useState("");
	const [queryResult, setQueryResult] = useState<string>("");
	const [isDatacoreAvailable, setIsDatacoreAvailable] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Check if Datacore plugin is available
	useEffect(() => {
		const checkDatacore = () => {
			try {
				// @ts-ignore - Accessing plugin registry
				const datacorePlugin = app.plugins.plugins["datacore"];
				setIsDatacoreAvailable(!!datacorePlugin?.api);
			} catch (error) {
				setIsDatacoreAvailable(false);
			}
		};

		checkDatacore();

		// Listen for plugin changes
		app.workspace.onLayoutReady(checkDatacore);
	}, [app]);

	// Execute Datacore query
	const executeQuery = async (query: string) => {
		if (!isDatacoreAvailable) {
			setQueryResult(
				"Datacore plugin not found. Please install and enable the Datacore plugin."
			);
			return;
		}

		setIsLoading(true);
		try {
			// @ts-ignore - Accessing plugin registry
			const datacorePlugin = app.plugins.plugins["datacore"];

			if (!datacorePlugin?.api) {
				setQueryResult("Datacore plugin API not available.");
				return;
			}

			// Create a temporary component to render the query
			const component = new Component();
			const container = document.createElement("div");

			// Use the Datacore API with better error handling
			const api = datacorePlugin.api;
			if (api.executeQuery) {
				await api.executeQuery(query, container, component, "");
				setQueryResult(
					container.innerHTML || "Query executed successfully"
				);
			} else if (api.queryMarkdown) {
				// Alternative API method
				const result = await api.queryMarkdown(query, "");
				setQueryResult(result || "Query executed");
			} else {
				// Fallback: create a note with the query and let Datacore render it
				const queryNote = `\`\`\`dataview\n${query}\n\`\`\``;
				setQueryResult(queryNote);
			}
		} catch (error) {
			console.error("Error executing Datacore query:", error);
			setQueryResult(`Error: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle query selection
	const handleQuerySelect = (query: DatacoreQuery) => {
		setSelectedQuery(query);
		executeQuery(query.query);
	};

	// Handle custom query execution
	const handleCustomQueryExecute = () => {
		if (customQuery.trim()) {
			executeQuery(customQuery);
		}
	};

	// Create new task with Datacore metadata
	const createDatacoreTask = async () => {
		const taskName = prompt("Enter task name:");
		if (!taskName) return;

		const skill =
			prompt("Enter skill (wisdom, intellect, muscle, faith):") ||
			"general";
		const xp = parseInt(prompt("Enter XP reward:") || "50");
		const coins = parseInt(prompt("Enter coin reward:") || "10");
		const priority =
			prompt("Enter priority (high, medium, low):") || "medium";
		const due = prompt("Enter due date (YYYY-MM-DD):") || "";

		const taskContent = `
## ${taskName}

- [ ] ${taskName} #gamified-task
  - skills: [${skill}]
  - xp: ${xp}
  - coins: ${coins}
  - priority: ${priority}
  - due: ${due}
  - today: ${due === new Date().toISOString().split("T")[0]}
  - completed: false
`;

		try {
			const fileName = `${taskName.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
			await app.vault.create(fileName, taskContent.trim());

			// Also add to GamifiedTasks.md
			const gamifiedFile =
				app.vault.getAbstractFileByPath("GamifiedTasks.md");
			if (gamifiedFile && gamifiedFile instanceof TFile) {
				const content = await app.vault.read(gamifiedFile);
				const newTaskLine = `- [ ] ${taskName} skills:[${skill}] xp:${xp} coins:${coins} priority:${priority} due:${due} #gamified-task`;
				await app.vault.modify(
					gamifiedFile,
					content + "\n" + newTaskLine
				);
			}

			// Refresh the current query
			if (selectedQuery) {
				executeQuery(selectedQuery.query);
			}
		} catch (error) {
			console.error("Error creating task:", error);
		}
	};

	return (
		<div
			style={{
				padding: 20,
				background: "#1a1a1a",
				minHeight: "100vh",
				color: "#fff",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 30,
					borderBottom: "2px solid #333",
					paddingBottom: 20,
				}}
			>
				<h1
					style={{
						fontSize: 28,
						fontWeight: 700,
						margin: 0,
						color: "#fff",
					}}
				>
					📊 Advanced Task Analytics
				</h1>
				<div style={{ display: "flex", gap: 10 }}>
					<button
						onClick={createDatacoreTask}
						style={{
							background: "#28a745",
							border: "none",
							borderRadius: 6,
							color: "#fff",
							padding: "8px 16px",
							fontSize: 14,
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						+ New Task
					</button>
					<div
						style={{
							background: isDatacoreAvailable
								? "#28a745"
								: "#dc3545",
							padding: "8px 12px",
							borderRadius: 6,
							fontSize: 12,
							fontWeight: 600,
						}}
					>
						Datacore:{" "}
						{isDatacoreAvailable ? "✓ Active" : "✗ Inactive"}
					</div>
				</div>
			</div>

			{!isDatacoreAvailable && (
				<div
					style={{
						background: "#dc3545",
						padding: 16,
						borderRadius: 8,
						marginBottom: 20,
						border: "1px solid #721c24",
					}}
				>
					<h3 style={{ margin: 0, marginBottom: 8 }}>
						⚠️ Datacore Plugin Required
					</h3>
					<p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
						To use advanced task analytics, please install and
						enable the Datacore plugin from the Community Plugins
						section.
					</p>
				</div>
			)}

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 2fr",
					gap: 30,
				}}
			>
				{/* Query Selection Panel */}
				<div>
					<h2
						style={{
							fontSize: 20,
							marginBottom: 20,
							color: "#fff",
						}}
					>
						📋 Predefined Queries
					</h2>

					<div style={{ marginBottom: 30 }}>
						{DEFAULT_QUERIES.map((query) => (
							<div
								key={query.id}
								onClick={() => handleQuerySelect(query)}
								style={{
									background:
										selectedQuery.id === query.id
											? "#4a90e2"
											: "#333",
									padding: 16,
									marginBottom: 12,
									borderRadius: 8,
									cursor: "pointer",
									border:
										selectedQuery.id === query.id
											? "2px solid #6ba3f5"
											: "1px solid #555",
									transition: "all 0.2s ease",
								}}
							>
								<h3
									style={{
										margin: 0,
										marginBottom: 8,
										fontSize: 16,
										fontWeight: 600,
									}}
								>
									{query.name}
								</h3>
								<p
									style={{
										margin: 0,
										fontSize: 13,
										opacity: 0.8,
										lineHeight: 1.4,
									}}
								>
									{query.description}
								</p>
							</div>
						))}
					</div>

					<h3
						style={{
							fontSize: 18,
							marginBottom: 16,
							color: "#fff",
						}}
					>
						🔧 Custom Query
					</h3>
					<textarea
						value={customQuery}
						onChange={(e) => setCustomQuery(e.target.value)}
						placeholder="Enter your custom Datacore query here..."
						style={{
							width: "100%",
							minHeight: 120,
							background: "#333",
							border: "1px solid #555",
							borderRadius: 6,
							padding: 12,
							color: "#fff",
							fontSize: 13,
							fontFamily: "monospace",
							resize: "vertical",
						}}
					/>
					<button
						onClick={handleCustomQueryExecute}
						disabled={!customQuery.trim() || isLoading}
						style={{
							background: customQuery.trim() ? "#4a90e2" : "#555",
							border: "none",
							borderRadius: 6,
							color: "#fff",
							padding: "8px 16px",
							fontSize: 14,
							cursor: customQuery.trim()
								? "pointer"
								: "not-allowed",
							marginTop: 12,
							width: "100%",
						}}
					>
						{isLoading ? "Executing..." : "Execute Query"}
					</button>
				</div>

				{/* Query Results Panel */}
				<div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: 20,
						}}
					>
						<h2 style={{ fontSize: 20, margin: 0, color: "#fff" }}>
							📈 Results: {selectedQuery.name}
						</h2>
						{isLoading && (
							<div style={{ color: "#4a90e2", fontSize: 14 }}>
								Loading...
							</div>
						)}
					</div>

					<div
						style={{
							background: "#222",
							border: "1px solid #444",
							borderRadius: 8,
							padding: 20,
							minHeight: 400,
							maxHeight: "70vh",
							overflow: "auto",
						}}
					>
						{queryResult ? (
							<div
								dangerouslySetInnerHTML={{
									__html: queryResult,
								}}
								style={{
									color: "#fff",
									fontSize: 14,
									lineHeight: 1.6,
								}}
							/>
						) : (
							<div
								style={{
									textAlign: "center",
									color: "#888",
									fontSize: 16,
									paddingTop: 100,
								}}
							>
								Select a query to view results
							</div>
						)}
					</div>

					<div
						style={{
							marginTop: 20,
							padding: 16,
							background: "#333",
							borderRadius: 8,
							border: "1px solid #555",
						}}
					>
						<h3
							style={{
								margin: 0,
								marginBottom: 12,
								fontSize: 16,
							}}
						>
							💡 Pro Tips
						</h3>
						<ul
							style={{
								margin: 0,
								paddingLeft: 20,
								fontSize: 14,
								lineHeight: 1.6,
							}}
						>
							<li>
								Use <code>#gamified-task</code> tag to include
								tasks in queries
							</li>
							<li>
								Available fields:{" "}
								<code>
									skills, xp, coins, priority, due, completed
								</code>
							</li>
							<li>
								Use <code>!completed</code> to filter active
								tasks
							</li>
							<li>
								Sort by <code>priority DESC</code> or{" "}
								<code>xp DESC</code> for better organization
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DatacoreTaskView;
