import React from "react";

/*
Tab for the players ingame stats
*/

// --- Stat Meta Mapping ---
const STAT_META = {
	CHA: {
		name: "Charisma",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle
					cx="16"
					cy="16"
					r="14"
					stroke="#FFD700"
					strokeWidth="3"
					fill="#FFF8DC"
				/>
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#FFD700"
				>
					🗣️
				</text>
			</svg>
		),
		description: "Charm, persuasion, and social influence.",
	},
	CRE: {
		name: "Creativity",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect
					x="4"
					y="4"
					width="24"
					height="24"
					rx="6"
					fill="#FFB6C1"
				/>
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#8B008B"
				>
					🎨
				</text>
			</svg>
		),
		description: "Imagination and artistic ability.",
	},
	DEX: {
		name: "Dexterity",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<ellipse cx="16" cy="16" rx="14" ry="10" fill="#ADD8E6" />
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#4682B4"
				>
					🏃
				</text>
			</svg>
		),
		description: "Agility, reflexes, and coordination.",
	},
	END: {
		name: "Endurance",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect
					x="6"
					y="6"
					width="20"
					height="20"
					rx="10"
					fill="#90EE90"
				/>
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#228B22"
				>
					🛡️
				</text>
			</svg>
		),
		description: "Stamina and physical resilience.",
	},
	FAI: {
		name: "Faith",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle cx="16" cy="16" r="14" fill="#E6E6FA" />
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#6A5ACD"
				>
					✝️
				</text>
			</svg>
		),
		description: "Belief, devotion, and spiritual strength.",
	},
	ING: {
		name: "Ingenuity",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect
					x="4"
					y="4"
					width="24"
					height="24"
					rx="8"
					fill="#FFE4B5"
				/>
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#DAA520"
				>
					🧠
				</text>
			</svg>
		),
		description: "Inventiveness and clever problem-solving.",
	},
	INT: {
		name: "Intelligence",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<ellipse cx="16" cy="16" rx="14" ry="10" fill="#B0C4DE" />
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#00008B"
				>
					📚
				</text>
			</svg>
		),
		description: "Reasoning, memory, and learning.",
	},
	MIN: {
		name: "Mindfulness",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle cx="16" cy="16" r="14" fill="#FFFACD" />
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#FFD700"
				>
					🧘
				</text>
			</svg>
		),
		description: "Awareness and presence in the moment.",
	},
	STR: {
		name: "Strength",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect
					x="4"
					y="10"
					width="24"
					height="12"
					rx="6"
					fill="#FF6347"
				/>
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#B22222"
				>
					💪
				</text>
			</svg>
		),
		description: "Physical power and force.",
	},
	WIL: {
		name: "Willpower",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<ellipse cx="16" cy="16" rx="14" ry="10" fill="#D8BFD8" />
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#8B008B"
				>
					🔥
				</text>
			</svg>
		),
		description: "Determination and mental fortitude.",
	},
	WIS: {
		name: "Wisdom",
		icon: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle cx="16" cy="16" r="14" fill="#F5DEB3" />
				<text
					x="16"
					y="22"
					textAnchor="middle"
					fontSize="16"
					fill="#8B4513"
				>
					🦉
				</text>
			</svg>
		),
		description: "Insight, judgment, and experience.",
	},
};

// --- Color Coding Helper ---
function getStatColor(value: number) {
	if (value >= 15) return "#4caf50"; // green
	if (value >= 8) return "#ffc107"; // yellow
	return "#f44336"; // red
}

// --- Clickable Tooltip for Stat Name/Icon ---
const ClickableTooltip: React.FC<{
	children: React.ReactNode;
	description: string;
}> = ({ children, description }) => {
	const [open, setOpen] = React.useState(false);
	return (
		<span style={{ position: "relative", display: "inline-block" }}>
			<span
				onClick={() => setOpen((v) => !v)}
				style={{
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: 4,
				}}
			>
				{children}
			</span>
			{open && (
				<div
					style={{
						position: "absolute",
						top: "120%",
						left: 0,
						background: "#222",
						color: "#fff",
						padding: 8,
						borderRadius: 4,
						zIndex: 100,
						minWidth: 120,
						boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
					}}
				>
					{description}
				</div>
			)}
		</span>
	);
};

// --- StatsTab Component ---
const StatsTab = ({
	stats,
}: {
	stats: {
		code: string;
		value: number;
		description?: string;
		level?: number;
	}[];
}) => {
	return (
		<div style={{ maxWidth: 260, margin: 0, padding: 0 }}>
			<div
				style={{
					fontSize: 12,
					color: "#aaa",
					marginBottom: 4,
					marginLeft: 4,
				}}
			>
				Codes: {stats.map((s) => s.code).join(", ")}
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: 0,
				}}
			>
				{stats.map((stat, i) => {
					const code = stat.code?.trim().toUpperCase();
					const meta = STAT_META[code as keyof typeof STAT_META];
					if (!meta) return null;
					const statDescription =
						stat.description || meta.description;
					return (
						<div
							key={code}
							style={{
								display: "flex",
								flexDirection: "column",
								padding: "6px 0 2px 0",
								borderBottom: "1px solid #222",
								minHeight: 44,
								justifyContent: "center",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
								}}
							>
								<ClickableTooltip description={statDescription}>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										{meta.icon}
										<span
											style={{
												fontWeight: 600,
												color: "#fff",
												fontSize: 13,
											}}
										>
											{meta.name}
										</span>
										<span
											style={{
												color: "#aaa",
												fontSize: 11,
											}}
										>
											({code})
										</span>
									</span>
								</ClickableTooltip>
								<span style={{ flex: 1 }} />
								<span
									style={{
										fontSize: 18,
										fontWeight: 700,
										color: getStatColor(stat.value),
										minWidth: 32,
										textAlign: "right",
									}}
								>
									{stat.value}
									{typeof stat.level === "number" && (
										<span
											style={{
												color: "#aaa",
												fontSize: 12,
												marginLeft: 4,
											}}
										>
											(Lv {stat.level})
										</span>
									)}
								</span>
							</div>
							{/* Thin Progress Bar */}
							<div
								style={{
									width: "100%",
									height: 4,
									background: "#111",
									borderRadius: 3,
									marginTop: 3,
									overflow: "hidden",
								}}
							>
								<div
									style={{
										width: `${
											Math.min(stat.value / 999, 1) * 100
										}%`,
										height: "100%",
										background: getStatColor(stat.value),
										transition:
											"width 0.7s cubic-bezier(.4,2,.3,1)",
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default StatsTab;
