import React, { useState } from "react";
import type { Quest, Subtask } from "../../utils/taskParser";
import type { JSX } from "react";

// Placeholder SVG icon components (replace with real SVGs later)
const XpIcon = () => <span style={{ marginRight: 2 }}>✨</span>;
const CpIcon = () => <span style={{ marginRight: 2 }}>⭐</span>;
const CoinIcon = () => <span style={{ marginRight: 2 }}>🪙</span>;
const PriorityIcon = () => <span style={{ marginRight: 2 }}>🔺</span>;
const DueIcon = () => <span style={{ marginRight: 2 }}>📅</span>;
const SkillIcon = () => <span style={{ marginRight: 2 }}>🛠️</span>;
const ClassIcon = () => <span style={{ marginRight: 2 }}>🎓</span>;
const StatIcon = () => <span style={{ marginRight: 2 }}>📊</span>;

// SVG badge components for type, difficulty, status
const TypeBadge = ({ type }: { type?: string }) => {
	if (type === "main")
		return (
			<span
				style={{
					background: "#2563eb",
					color: "#fff",
					borderRadius: 6,
					padding: "2px 6px",
					marginRight: 4,
					display: "inline-flex",
					alignItems: "center",
					fontSize: 12,
				}}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 20 20"
					fill="none"
					style={{ marginRight: 2 }}
				>
					<path d="M4 2l12 3-12 3v10l12-3V2z" fill="#fff" />
				</svg>
				Main
			</span>
		);
	if (type === "side")
		return (
			<span
				style={{
					background: "#22c55e",
					color: "#fff",
					borderRadius: 6,
					padding: "2px 6px",
					marginRight: 4,
					display: "inline-flex",
					alignItems: "center",
					fontSize: 12,
				}}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 20 20"
					fill="none"
					style={{ marginRight: 2 }}
				>
					<circle cx="10" cy="10" r="8" fill="#fff" />
					<path
						d="M10 4v12M4 10h12"
						stroke="#22c55e"
						strokeWidth="2"
					/>
				</svg>
				Side
			</span>
		);
	if (type === "daily")
		return (
			<span
				style={{
					background: "#f59e42",
					color: "#fff",
					borderRadius: 6,
					padding: "2px 6px",
					marginRight: 4,
					display: "inline-flex",
					alignItems: "center",
					fontSize: 12,
				}}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 20 20"
					fill="none"
					style={{ marginRight: 2 }}
				>
					<circle cx="10" cy="10" r="8" fill="#fff" />
					<path d="M10 5v5l3 3" stroke="#f59e42" strokeWidth="2" />
				</svg>
				Daily
			</span>
		);
	return null;
};

const DifficultyBadge = ({ difficulty }: { difficulty?: string }) => {
	if (difficulty === "Easy")
		return (
			<span
				style={{
					background: "#22c55e",
					color: "#fff",
					borderRadius: 6,
					padding: "2px 6px",
					marginRight: 4,
					display: "inline-flex",
					alignItems: "center",
					fontSize: 12,
				}}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 20 20"
					fill="none"
					style={{ marginRight: 2 }}
				>
					<path
						d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 12a4 4 0 110-8 4 4 0 010 8z"
						fill="#fff"
					/>
				</svg>
				Easy
			</span>
		);
	if (difficulty === "Medium")
		return (
			<span
				style={{
					background: "#eab308",
					color: "#fff",
					borderRadius: 6,
					padding: "2px 6px",
					marginRight: 4,
					display: "inline-flex",
					alignItems: "center",
					fontSize: 12,
				}}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 20 20"
					fill="none"
					style={{ marginRight: 2 }}
				>
					<path
						d="M10 2l3 8H7l3-8zm0 16a2 2 0 100-4 2 2 0 000 4z"
						fill="#fff"
					/>
				</svg>
				Medium
			</span>
		);
	if (difficulty === "Hard")
		return (
			<span
				style={{
					background: "#ef4444",
					color: "#fff",
					borderRadius: 6,
					padding: "2px 6px",
					marginRight: 4,
					display: "inline-flex",
					alignItems: "center",
					fontSize: 12,
				}}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 20 20"
					fill="none"
					style={{ marginRight: 2 }}
				>
					<path
						d="M10 2l6 16H4L10 2zm0 10a2 2 0 100 4 2 2 0 000-4z"
						fill="#fff"
					/>
				</svg>
				Hard
			</span>
		);
	return null;
};

const statusCycle = ["active", "completed", "failed"];
const statusColors: Record<string, string> = {
	active: "#3b82f6",
	completed: "#22c55e",
	failed: "#ef4444",
};
const statusIcons: Record<string, JSX.Element> = {
	active: (
		<svg
			width="14"
			height="14"
			viewBox="0 0 20 20"
			fill="none"
			style={{ marginRight: 2 }}
		>
			<circle cx="10" cy="10" r="8" fill="#fff" />
			<polygon points="8,6 14,10 8,14" fill="#3b82f6" />
		</svg>
	),
	completed: (
		<svg
			width="14"
			height="14"
			viewBox="0 0 20 20"
			fill="none"
			style={{ marginRight: 2 }}
		>
			<circle cx="10" cy="10" r="8" fill="#fff" />
			<path
				d="M7 10l2 2 4-4"
				stroke="#22c55e"
				strokeWidth="2"
				fill="none"
			/>
		</svg>
	),
	failed: (
		<svg
			width="14"
			height="14"
			viewBox="0 0 20 20"
			fill="none"
			style={{ marginRight: 2 }}
		>
			<circle cx="10" cy="10" r="8" fill="#fff" />
			<line
				x1="7"
				y1="7"
				x2="13"
				y2="13"
				stroke="#ef4444"
				strokeWidth="2"
			/>
			<line
				x1="13"
				y1="7"
				x2="7"
				y2="13"
				stroke="#ef4444"
				strokeWidth="2"
			/>
		</svg>
	),
};

const StatusBadge = ({
	status,
	onClick,
}: {
	status: string;
	onClick: () => void;
}) => (
	<span
		style={{
			background: statusColors[status] || "#888",
			color: "#fff",
			borderRadius: 6,
			padding: "2px 6px",
			marginRight: 4,
			display: "inline-flex",
			alignItems: "center",
			fontSize: 12,
			cursor: "pointer",
			userSelect: "none",
			border: status === "failed" ? "1px solid #ef4444" : undefined,
			boxShadow: status === "completed" ? "0 0 4px #22c55e55" : undefined,
		}}
		title="Click to change status"
		onClick={onClick}
	>
		{statusIcons[status]}
		{status.charAt(0).toUpperCase() + status.slice(1)}
	</span>
);

interface QuestCardProps {
	quest: Quest;
}

export const QuestCard: React.FC<QuestCardProps> = ({ quest }) => {
	// Local state for status (could be lifted up for persistence)
	const [status, setStatus] = useState(quest.status || "active");
	const handleStatusClick = () => {
		const idx = statusCycle.indexOf(status);
		setStatus(statusCycle[(idx + 1) % statusCycle.length]);
		// TODO: Call parent handler to persist status change if needed
	};

	return (
		<div
			className={`quest-card${quest.completed ? " completed" : ""}`}
			style={{
				border: "1px solid var(--background-modifier-border)",
				borderRadius: 8,
				padding: 12,
				marginBottom: 10,
				background: "var(--background-primary)",
				fontSize: 14,
				boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
				opacity: quest.completed ? 0.6 : 1,
			}}
		>
			{/* Badge Row */}
			<div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
				<TypeBadge type={quest.type} />
				<DifficultyBadge difficulty={quest.difficulty} />
				<StatusBadge status={status} onClick={handleStatusClick} />
			</div>
			<div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
				<span style={{ marginRight: 4 }}>
					<CpIcon />
				</span>
				{quest.title}
			</div>
			<div
				style={{
					color: "var(--text-muted)",
					fontSize: 13,
					marginBottom: 6,
				}}
			>
				{quest.className && (
					<span>
						<ClassIcon />
						{quest.className}{" "}
					</span>
				)}
				{quest.skills && quest.skills.length > 0 && (
					<span>
						<SkillIcon />
						{quest.skills.join(", ")}{" "}
					</span>
				)}
				{quest.stats && quest.stats.length > 0 && (
					<span>
						<StatIcon />
						{quest.stats.join(", ")}{" "}
					</span>
				)}
			</div>
			<div
				style={{
					display: "flex",
					gap: 10,
					alignItems: "center",
					marginBottom: 6,
				}}
			>
				<span>
					<XpIcon />
					{quest.xp}
				</span>
				<span>
					<CpIcon />
					{quest.cp}
				</span>
				<span>
					<CoinIcon />
					{quest.coins}
				</span>
				{quest.priority && (
					<span>
						<PriorityIcon />
						{quest.priority}
					</span>
				)}
				{quest.due && (
					<span>
						<DueIcon />
						{quest.due}
					</span>
				)}
			</div>
			{quest.subtasks && quest.subtasks.length > 0 && (
				<div style={{ marginTop: 4 }}>
					<div
						style={{
							fontWeight: 500,
							fontSize: 13,
							marginBottom: 2,
						}}
					>
						Subtasks:
					</div>
					<ul style={{ paddingLeft: 18, margin: 0 }}>
						{quest.subtasks.map((sub: Subtask, idx: number) => (
							<li
								key={idx}
								style={{
									listStyle: "none",
									textIndent: "-1.2em",
									marginLeft: "2em",
									color: sub.completed
										? "var(--text-faint)"
										: undefined,
									textDecoration: sub.completed
										? "line-through"
										: undefined,
									fontSize: 13,
								}}
							>
								<input
									type="checkbox"
									checked={sub.completed}
									readOnly
									style={{ marginRight: 6 }}
								/>
								{sub.text}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
