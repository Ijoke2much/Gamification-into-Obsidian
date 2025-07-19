import ShopTab from "@/ui/components/createShopTab";
import React, { useState, useRef, useEffect } from "react";
import type GamifiedObsidianPlugin from "src/main";
import { InventoryModalClass } from "@/modals/Inventory_modal/InventoryModalClass";
import { ProgressBar } from "src/ui/components/ProgressBar";
import StatsTab from "@/ui/components/StatsTab";
import { getStatsFromFolder, Stat, StatDebugInfo } from "@/utils/readStatsFile";
import QuestTab from "./QuestTab";
import { readPlayerData, updatePlayerData } from "@/utils/playerDataUtils";
import { AvatarPickerModal } from "../../modals/Avatar_modal/AvatarPickerModal";
import { PlayerData } from "src/data/PlayerData";

/**
 * PlayerTabView
 *
 * This is the main tab for the player.
 * It contains the player's stats, achievements, shop, Quest, and in-game stats
 *
 *
 *
 *
 */

interface Props {
	plugin: GamifiedObsidianPlugin;
}

// Add Card component for reuse
function Card({
	children,
	className = "",
	onClick,
}: {
	children: React.ReactNode;
	className?: string;
	onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
	return (
		<div
			className={`obs-card bg-base-200 border border-base-300 rounded-lg shadow-sm p-4 min-w-0 w-full ${className}`}
			onClick={onClick}
		>
			{children}
		</div>
	);
}

// ClickableTooltip component for clickable tooltips
function ClickableTooltip({
	icon,
	label,
	tooltipContent,
}: {
	icon: React.ReactNode;
	label: React.ReactNode;
	tooltipContent: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	return (
		<div style={{ position: "relative", display: "inline-block" }}>
			<span
				onClick={() => setOpen((v) => !v)}
				style={{
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					gap: "4px",
				}}
			>
				{icon}
				<span>{label}</span>
			</span>
			{open && (
				<div
					style={{
						position: "absolute",
						top: "120%",
						left: "0",
						background: "#222",
						color: "#fff",
						padding: "8px",
						borderRadius: "4px",
						zIndex: 100,
						minWidth: "120px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
					}}
				>
					{tooltipContent}
				</div>
			)}
		</div>
	);
}

// Extract SVGs for reuse
const PlayerIcon = (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ verticalAlign: "middle" }}
	>
		<circle cx="10" cy="6" r="4" fill="#8ecae6" />
		<ellipse cx="10" cy="15" rx="7" ry="4" fill="#219ebc" />
	</svg>
);
const SlopShopIcon = (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ verticalAlign: "middle" }}
	>
		<rect x="3" y="7" width="14" height="8" rx="2" fill="#ffb703" />
		<rect x="6" y="3" width="8" height="4" rx="1" fill="#fb8500" />
	</svg>
);
const QuestIcon = (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ verticalAlign: "middle" }}
	>
		<rect x="9" y="2" width="2" height="12" fill="#adb5bd" />
		<polygon points="10,2 12,4 8,4" fill="#adb5bd" />
		<rect x="8" y="14" width="4" height="2" fill="#b5651d" />
		<rect x="8.5" y="16" width="3" height="2" fill="#ffe066" />
	</svg>
);
const StatsIcon = (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ verticalAlign: "middle" }}
	>
		<rect x="4" y="10" width="2" height="6" fill="#8ecae6" />
		<rect x="9" y="6" width="2" height="10" fill="#219ebc" />
		<rect x="14" y="2" width="2" height="14" fill="#023047" />
	</svg>
);
const AchievementsIcon = (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ verticalAlign: "middle" }}
	>
		<circle cx="10" cy="10" r="7" fill="#ffd166" />
		<circle cx="10" cy="10" r="4" fill="#fff" />
		<path d="M10 3v4" stroke="#ffd166" strokeWidth="2" />
		<path d="M10 13v4" stroke="#ffd166" strokeWidth="2" />
	</svg>
);

const TABS = [
	{ key: "player", label: "Player", icon: PlayerIcon },
	{ key: "shop", label: "The Slop Shop", icon: SlopShopIcon },
	{ key: "quest", label: "Quest", icon: QuestIcon },
	{ key: "stats", label: "Stats", icon: StatsIcon },
	{ key: "achievements", label: "Achievements", icon: AchievementsIcon },
];

function getRankFromLevel(level: number): string {
	if (level <= 15) return "E";
	if (level <= 25) return "D";
	if (level <= 50) return "C";
	if (level <= 75) return "B";
	if (level <= 100) return "A";
	if (level <= 200) return "S";
	if (level <= 500) return "SS";
	if (level <= 700) return "SSS";
	if (level <= 999) return "SSS+";
	return "???";
}

// --- Stat name to code mapping ---

export default function PlayerTabView({ plugin }: Props) {
	const [selectedTab, setSelectedTab] = useState(TABS[0].key);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// --- NEW: Player data state ---
	const [playerData, setPlayerData] = useState<PlayerData | null>(null);
	const [loading, setLoading] = useState(true);

	// Load player data from PlayerData.md on mount
	useEffect(() => {
		async function loadPlayer() {
			setLoading(true);
			const data = await readPlayerData(plugin.app.vault);
			console.log("[PlayerTabView] Loaded playerData from file:", data);
			setPlayerData(data);
			setLoading(false);
		}
		loadPlayer();

		// Listen for player-data-updated event
		const handler = () => loadPlayer();
		document.addEventListener("player-data-updated", handler);
		return () => {
			document.removeEventListener("player-data-updated", handler);
		};
	}, [plugin.app.vault]);

	// Add reload button for debugging
	const reloadPlayerData = async () => {
		setLoading(true);
		const data = await readPlayerData(plugin.app.vault);
		console.log("[PlayerTabView] Reloaded playerData from file:", data);
		setPlayerData(data);
		setLoading(false);
	};

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		}
		if (dropdownOpen) {
			document.addEventListener("mousedown", handleClick);
		} else {
			document.removeEventListener("mousedown", handleClick);
		}
		return () => document.removeEventListener("mousedown", handleClick);
	}, [dropdownOpen]);

	const currentTab = TABS.find((t) => t.key === selectedTab) ?? TABS[0];

	// Remove: const percentage = 50; // Hardcoded for debugging
	// --- Stats state and loader ---
	const [stats, setStats] = useState<Stat[]>([]);
	// Debug state
	const [debugStats, setDebugStats] = useState<StatDebugInfo | null>(null);
	const [statsDebugMode, setStatsDebugMode] = useState(false);

	// Refactor stats loading logic into a function
	const loadStats = React.useCallback(() => {
		const statFolder =
			plugin.settings?.statFolder || "SkillTree/Master-Class/Stats";
		console.log("[PlayerTabView] Stat folder path:", statFolder);
		console.log("[PlayerTabView] Plugin settings:", plugin.settings);
		if (statsDebugMode) {
			getStatsFromFolder(plugin.app, statFolder, { debug: true })
				.then((info) => {
					console.log(
						"[PlayerTabView] getStatsFromFolder (debug):",
						info
					);
					if (
						info &&
						typeof info === "object" &&
						"parsedStats" in info
					) {
						setDebugStats(info as StatDebugInfo);
						setStats((info as StatDebugInfo).parsedStats);
					} else {
						setDebugStats(null);
						setStats([]);
					}
				})
				.catch((err) => {
					console.error(
						"[PlayerTabView] Error in getStatsFromFolder (debug):",
						err
					);
					setDebugStats(null);
					setStats([]);
				});
		} else {
			getStatsFromFolder(plugin.app, statFolder)
				.then((data) => {
					console.log(
						"[PlayerTabView] getStatsFromFolder (normal):",
						data
					);
					if (Array.isArray(data) && data.length > 0) setStats(data);
					else setStats([]);
					setDebugStats(null);
				})
				.catch((err) => {
					console.error(
						"[PlayerTabView] Error in getStatsFromFolder (normal):",
						err
					);
					setStats([]);
					setDebugStats(null);
				});
		}
	}, [plugin.app, plugin.settings?.statFolder, statsDebugMode]);

	// Listen for stats-updated event and reload stats
	useEffect(() => {
		const handler = () => {
			console.log(
				"[PlayerTabView] stats-updated event received, reloading stats..."
			);
			loadStats();
		};
		document.addEventListener("stats-updated", handler);
		return () => {
			document.removeEventListener("stats-updated", handler);
		};
	}, [loadStats]);

	// Load stats when stats tab is selected or dependencies change
	useEffect(() => {
		if (selectedTab === "stats") {
			loadStats();
		}
	}, [selectedTab, loadStats]);

	// Remove: const [avatar, setAvatar] = useState(player.data.avatar);
	// Instead, use playerData?.avatar directly

	const rebuildShopTab = () => {};

	// Remove the unused changeAvatar function

	const achievementCategories = ["levels", "milestones", "tasks", "custom"];
	const achievementCategoryLabels: Record<string, string> = {
		levels: "Levels",
		milestones: "Milestones",
		tasks: "Task Mastery",
		custom: "Custom",
	};
	const [selectedCategory, setSelectedCategory] = useState("levels");
	const [dropdownOpenAchievements, setDropdownOpenAchievements] =
		useState(false);
	const dropdownBtnRefAchievements = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				dropdownBtnRefAchievements.current &&
				!dropdownBtnRefAchievements.current.contains(e.target as Node)
			) {
				setDropdownOpenAchievements(false);
			}
		}
		if (dropdownOpenAchievements) {
			document.addEventListener("mousedown", handleClick);
		} else {
			document.removeEventListener("mousedown", handleClick);
		}
		return () => {
			document.removeEventListener("mousedown", handleClick);
		};
	}, [dropdownOpenAchievements]);

	// Add sample achievements data at the top of the component
	const achievements = [
		{
			name: "Level Up!",
			category: "levels",
			description: "Reach level 5.",
			progress: 3,
			goal: 5,
		},
		{
			name: "Coin Collector",
			category: "Currency",
			description: "Collect 100 coins.",
			progress: 60,
			goal: 100,
		},
		{
			name: "Task Master",
			category: "Tasks",
			description: "Complete 10 tasks.",
			progress: 10,
			goal: 10,
		},
		{
			name: "Inventory Starter",
			category: "Inventory",
			description: "Obtain your first item.",
			progress: 1,
			goal: 1,
		},
	];

	// Filter achievements based on selectedCategory
	const filteredAchievements = achievements.filter(
		(ach) => selectedCategory === "All" || ach.category === selectedCategory
	);

	// Handler for avatar change
	const handleAvatarChange = async (newAvatarPath: string) => {
		if (!playerData) return;
		const updatedData = { ...playerData, avatar: newAvatarPath };
		await updatePlayerData(plugin.app.vault, updatedData);
		setPlayerData(updatedData);
	};

	// Open the avatar picker modal (now used)
	const openAvatarPicker = async () => {
		// Only show images from the avatar folder (default 'assets/')
		const avatarFolder = plugin.settings.avatarFolder || "assets/";
		const files = plugin.app.vault
			.getFiles()
			.filter(
				(file) =>
					file.path.startsWith(avatarFolder) &&
					["png", "jpg", "jpeg", "svg"].includes(
						file.extension.toLowerCase()
					)
			);
		new AvatarPickerModal(plugin.app, files, handleAvatarChange).open();
	};

	if (selectedTab === "stats") {
		console.log("[PlayerTabView] Stats passed to StatsTab:", stats);
	}

	return (
		<div className="p-2 space-y-3 text-white">
			{/* Debug reload button */}
			<button
				onClick={reloadPlayerData}
				style={{
					marginBottom: 8,
					background: "#444",
					color: "#fff",
					borderRadius: 4,
					padding: "4px 12px",
					fontSize: 12,
				}}
			>
				Reload Player Data
			</button>
			{loading ? (
				<div>Loading player data...</div>
			) : !playerData ? (
				<div className="text-red-400">
					Player data not found. Please create SkillTree/PlayerData.md
					with the correct YAML.
				</div>
			) : (
				<>
					{/* Custom Dropdown */}
					<div
						ref={dropdownRef}
						style={{
							position: "relative",
							margin: "16px 0",
							width: 220,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								background: "#222",
								color: "#fff",
								borderRadius: 6,
								padding: "8px 12px",
								cursor: "pointer",
								border: dropdownOpen
									? "2px solid #8ecae6"
									: "2px solid transparent",
								userSelect: "none",
								fontWeight: 500,
								fontSize: 16,
							}}
							onClick={() => setDropdownOpen((v) => !v)}
						>
							<span style={{ marginRight: 10 }}>
								{currentTab.icon}
							</span>
							{currentTab.label}
							<span
								style={{
									marginLeft: "auto",
									fontSize: 14,
									opacity: 0.7,
								}}
							>
								▼
							</span>
						</div>
						{dropdownOpen && (
							<div
								style={{
									position: "absolute",
									top: "110%",
									left: 0,
									width: "100%",
									background: "#222",
									border: "1px solid #8ecae6",
									borderRadius: 6,
									zIndex: 10,
									boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
								}}
							>
								{TABS.map((tab) => (
									<div
										key={tab.key}
										style={{
											display: "flex",
											alignItems: "center",
											padding: "8px 12px",
											cursor: "pointer",
											background:
												selectedTab === tab.key
													? "#333"
													: undefined,
											fontWeight:
												selectedTab === tab.key
													? 600
													: 400,
											fontSize: 16,
										}}
										onClick={() => {
											setSelectedTab(tab.key);
											setDropdownOpen(false);
										}}
									>
										<span style={{ marginRight: 10 }}>
											{tab.icon}
										</span>
										{tab.label}
									</div>
								))}
							</div>
						)}
					</div>

					{/* Tab Content */}
					<div style={{ marginTop: 24 }}>
						{selectedTab === "player" && (
							<div className="grid grid-cols-1 gap-2 w-full">
								{/* Avatar & Main Info Card */}
								<Card className="flex flex-col items-center justify-between mt-2">
									<img
										src={plugin.app.vault.adapter.getResourcePath(
											playerData.avatar ||
												"assets/avatar-default.png"
										)}
										className="w-20 h-20 rounded-full object-cover border-2 border-base-300 shadow mb-2"
										alt="Avatar"
										style={{ cursor: "pointer" }}
										onClick={openAvatarPicker}
									/>
									<button
										className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
										onClick={openAvatarPicker}
									>
										Change Avatar
									</button>
									<div className="w-full space-y-1 text-base text-center">
										<div className="font-bold text-lg">
											{playerData.name}
										</div>
										<div className="player-rank">
											<strong>Rank:</strong>{" "}
											{getRankFromLevel(playerData.level)}
										</div>
										<div className="text-sm text-gray-400">
											Class: {playerData.masterClass}
										</div>
										{playerData.description && (
											<div className="mt-2 text-sm text-gray-300 italic">
												{playerData.description}
											</div>
										)}
									</div>
								</Card>
								{/* Level & EXP Cards Side by Side */}
								<div className="flex flex-row justify-center items-stretch gap-4">
									{/* Level Card */}
									<Card className="flex flex-col items-center justify-center w-32 min-w-0 px-1 py-1 mx-auto">
										<ClickableTooltip
											icon={
												<svg
													width="16"
													height="16"
													style={{
														paddingRight: "2px",
													}}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													xmlns="http://www.w3.org/2000/svg"
												>
													<title>Level</title>
													<circle
														cx="12"
														cy="12"
														r="10"
													/>
													<text
														x="12"
														y="16"
														textAnchor="middle"
														fontSize="10"
														fill="currentColor"
													>
														Lv
													</text>
												</svg>
											}
											label="Level"
											tooltipContent={
												<div>
													Level is your overall
													progress. Earn XP to
													increase it!
												</div>
											}
										/>
										<div className="text-sm font-bold text-yellow-400">
											{playerData.level}
										</div>
									</Card>
									{/* EXP Card */}
									<Card className="flex flex-col items-center justify-center w-32 min-w-0 px-1 py-1 mx-auto">
										<ClickableTooltip
											icon={
												<svg
													width="16"
													height="16"
													style={{
														paddingRight: "2px",
													}}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													xmlns="http://www.w3.org/2000/svg"
												>
													<title>Experience</title>
													<rect
														x="4"
														y="4"
														width="16"
														height="16"
														rx="4"
													/>
													<text
														x="12"
														y="16"
														textAnchor="middle"
														fontSize="10"
														fill="currentColor"
													>
														XP
													</text>
												</svg>
											}
											label="EXP"
											tooltipContent={
												<div>
													Earn EXP by completing
													tasks. Reach the next level
													by filling the bar!
												</div>
											}
										/>
										<div className="text-sm font-semibold">
											{playerData.xp} /{" "}
											{playerData.xpRequired}
										</div>
									</Card>
								</div>
								{/* Progress Bar Card */}
								<Card className="flex flex-col items-center justify-center w-full min-w-0 p-2 mt-1 border-4 border-blue-500 bg-gray-900">
									<div className="w-full">
										<ProgressBar
											progress={Math.round(
												(playerData.xp /
													playerData.xpRequired) *
													100
											)}
											height={20}
										/>
									</div>
								</Card>
								{/* Coins & Skill Tree Button Side by Side */}
								<div className="flex flex-row justify-center items-stretch gap-4 w-full min-w-0">
									{/* Coins Card */}
									<Card className="flex flex-col items-center justify-center w-32 min-w-0 px-1 py-1 mx-auto">
										<ClickableTooltip
											icon={
												<svg
													width="16"
													height="16"
													style={{
														paddingRight: "2px",
													}}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													xmlns="http://www.w3.org/2000/svg"
												>
													<title>Coins</title>
													<circle
														cx="12"
														cy="12"
														r="10"
													/>
													<circle
														cx="12"
														cy="12"
														r="6"
														fill="#FFD700"
														stroke="none"
													/>
													<text
														x="12"
														y="16"
														textAnchor="middle"
														fontSize="10"
														fill="#bfa100"
													>
														¢
													</text>
												</svg>
											}
											label="Coins"
											tooltipContent={
												<div>
													Coins are earned by
													completing tasks and can be
													spent in the shop.
												</div>
											}
										/>
										<div className="text-sm font-semibold text-yellow-400">
											{playerData.coins?.toLocaleString?.() ??
												playerData.coins}
										</div>
									</Card>
									{/* Skill Tree Button Card */}
									<Card className="flex flex-col items-center justify-center w-32 min-w-0 px-1 py-1 mx-auto">
										<button
											className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow w-full text-xs"
											onClick={() => {
												console.log(
													"Skill Tree button clicked"
												);
											}}
										>
											🌳 View Skill Tree
										</button>
									</Card>
								</div>
								{/* Inventory Card/Button at the bottom */}
								<Card
									className="flex flex-row items-center justify-between cursor-pointer hover:bg-base-300 transition"
									onClick={() => {
										// Use the Obsidian modal class, not the React component
										new InventoryModalClass(
											plugin.app
										).open();
									}}
								>
									<ClickableTooltip
										icon={
											<svg
												width="20"
												height="20"
												style={{ paddingRight: "2px" }}
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												xmlns="http://www.w3.org/2000/svg"
											>
												<title>Inventory</title>
												<rect
													x="3"
													y="7"
													width="18"
													height="13"
													rx="2"
												/>
												<path d="M16 3v4M8 3v4" />
											</svg>
										}
										label={
											<span className="font-semibold">
												Inventory
											</span>
										}
										tooltipContent={
											<div>
												View and manage your collected
												items here.
											</div>
										}
									/>
									<button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
										Open
									</button>
								</Card>
							</div>
						)}

						{/* --- ACHIEVEMENTS TAB --- */}
						{selectedTab === "achievements" && (
							<div className="achievement-bg border-gray-700 rounded-xl p-5 shadow-inner space-y-4 mt-4">
								<div className="flex items-center gap-2 mb-2 relative">
									<label
										htmlFor="achievement-category"
										className="font-semibold text-purple-300 mr-2"
									>
										Achievements:
									</label>
									<div className="relative">
										<button
											id="achievement-category"
											className="achievement-dropdown-btn flex items-center min-w-[140px] px-5 py-1.5 justify-between"
											style={{ border: "none" }}
											onClick={() =>
												setDropdownOpenAchievements(
													(open) => !open
												)
											}
											ref={dropdownBtnRefAchievements}
										>
											{selectedCategory}
											<span className="ml-2">
												<svg
													width="18"
													height="18"
													viewBox="0 0 20 20"
													fill="none"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														d="M6 8L10 12L14 8"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</span>
										</button>
										{dropdownOpenAchievements && (
											<div className="achievement-dropdown-menu">
												{/* Caret/triangle at the top */}
												<div className="dropdown-caret" />
												{achievementCategories.map(
													(cat) => (
														<button
															key={cat}
															className={`achievement-dropdown-option${
																selectedCategory ===
																cat
																	? " selected"
																	: ""
															}`}
															onClick={() => {
																setSelectedCategory(
																	cat
																);
																setDropdownOpenAchievements(
																	false
																);
															}}
														>
															{
																achievementCategoryLabels[
																	cat
																]
															}
														</button>
													)
												)}
											</div>
										)}
									</div>
								</div>
								{/* 3. Render filtered achievements */}
								<div className="space-y-4">
									{filteredAchievements.length === 0 ? (
										<div className="text-gray-400 italic">
											No achievements in this category
											yet.
										</div>
									) : (
										filteredAchievements.map((ach, idx) => (
											<div
												key={idx}
												className="bg-gray-900/60 rounded-lg p-4 flex flex-col gap-2 border border-gray-800"
											>
												<div className="flex items-center justify-between">
													<div className="font-bold text-lg text-purple-200">
														{ach.name}
													</div>
													<div className="text-xs text-gray-400">
														{ach.category}
													</div>
												</div>
												<div className="text-gray-300">
													{ach.description}
												</div>
												{/* Progress text above the bar */}
												<div className="text-xs text-gray-400 mb-1 text-right">
													{ach.progress >= ach.goal
														? "Completed!"
														: `${ach.progress} / ${ach.goal}`}
												</div>
												{/* Progress bar */}
												{ach.progress < ach.goal && (
													<div className="w-full bg-gray-800 rounded-full h-3">
														<div
															className="bg-purple-500 h-3 rounded-full transition-all duration-300"
															style={{
																width: `${
																	(ach.progress /
																		ach.goal) *
																	100
																}%`,
															}}
														></div>
													</div>
												)}
											</div>
										))
									)}
								</div>
							</div>
						)}

						{/* --- SHOP TAB --- */}
						{selectedTab === "shop" && (
							<ShopTab
								plugin={plugin}
								rebuildShopTab={rebuildShopTab}
							/>
						)}

						{/* --- STATS TAB --- */}
						{selectedTab === "stats" && (
							<div>
								<button
									onClick={() => setStatsDebugMode((v) => !v)}
									style={{
										marginBottom: 8,
										background: statsDebugMode
											? "#b91c1c"
											: "#444",
										color: "#fff",
										borderRadius: 4,
										padding: "4px 12px",
										fontSize: 12,
									}}
								>
									{statsDebugMode ? "Disable" : "Enable"}{" "}
									Debug Mode
								</button>
								{statsDebugMode && debugStats && (
									<div
										style={{
											background: "#222",
											color: "#fff",
											padding: 12,
											borderRadius: 6,
											marginBottom: 12,
										}}
									>
										<div>
											<b>Stats Debug Info</b>
										</div>
										<div>
											<b>Folder Path:</b>{" "}
											{debugStats.folderPath}
										</div>
										<div>
											<b>Files Found:</b>{" "}
											{debugStats.filesFound.length ? (
												debugStats.filesFound.join(", ")
											) : (
												<i>None</i>
											)}
										</div>
										<div>
											<b>Parsed Stats:</b>
											<pre
												style={{
													whiteSpace: "pre-wrap",
													fontSize: 12,
												}}
											>
												{JSON.stringify(
													debugStats.parsedStats,
													null,
													2
												)}
											</pre>
										</div>
										{debugStats.errors.length > 0 && (
											<div style={{ color: "#f87171" }}>
												<b>Errors:</b>
												<ul>
													{debugStats.errors.map(
														(err, i) => (
															<li key={i}>
																{err.file}:{" "}
																{err.error}
															</li>
														)
													)}
												</ul>
											</div>
										)}
									</div>
								)}
								<StatsTab
									stats={stats.map((s) => ({
										code: (s.code || "").toUpperCase(),
										value:
											typeof s.value === "number"
												? s.value
												: 0,
										description: s.description,
										level:
											typeof s.level === "number"
												? s.level
												: 1,
									}))}
								/>
							</div>
						)}

						{/* --- QUEST TAB --- */}
						{selectedTab === "quest" && (
							<QuestTab plugin={plugin} />
						)}
					</div>
				</>
			)}
		</div>
	);
}
