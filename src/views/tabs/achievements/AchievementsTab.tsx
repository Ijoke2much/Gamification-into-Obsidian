// Enhanced Achievements Tab - Display achievement progress and unlocked badges
// Optimized for 250px sidebar width with compact layout

import React, { useState, useEffect } from "react";
import {
	AchievementTracker,
	Achievement,
	PlayerAchievement,
	AchievementCategory,
	BadgeTier,
} from "../../../data/models/AchievementSystem";

export interface AchievementsTabProps {
	tracker: AchievementTracker;
	onRefresh?: () => void;
}

export default function AchievementsTab({
	tracker,
	onRefresh,
}: AchievementsTabProps) {
	const [selectedCategory, setSelectedCategory] = useState<
		AchievementCategory | "all"
	>("all");
	const [showCompleted, setShowCompleted] = useState<boolean>(true);
	const [showInProgress, setShowInProgress] = useState<boolean>(true);
	const [showLocked, setShowLocked] = useState<boolean>(true);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [sortBy, setSortBy] = useState<"progress" | "tier" | "name" | "date">("progress");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // Default to list for sidebar
	const [recentlyUnlocked, setRecentlyUnlocked] = useState<string[]>([]);

	const allAchievements = tracker.getAllAchievements();
	const completedCount = tracker.getCompletedAchievements().length;
	const totalCount = allAchievements.length;

	// Filter achievements based on selected criteria
	const filteredAchievements = allAchievements.filter(
		({ achievement, playerData }) => {
			if (
				selectedCategory !== "all" &&
				achievement.category !== selectedCategory
			)
				return false;
			
			if (!showCompleted && playerData.status === "completed")
				return false;
			if (!showInProgress && playerData.status === "in_progress")
				return false;
			if (!showLocked && playerData.status === "locked") return false;

			// Search functionality
			if (searchTerm && !achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
				!achievement.description.toLowerCase().includes(searchTerm.toLowerCase())) {
				return false;
			}

			// Don't show hidden achievements unless they're unlocked or in progress
			if (achievement.hidden && playerData.status === "locked")
				return false;

			return true;
		}
	);

	// Sort achievements
	const sortedAchievements = [...filteredAchievements].sort((a, b) => {
		switch (sortBy) {
			case "progress": {
				return b.playerData.progress - a.playerData.progress;
			}
			case "tier": {
				const tierOrder = { bronze: 1, silver: 2, gold: 3, legendary: 4 };
				return tierOrder[b.achievement.tier] - tierOrder[a.achievement.tier];
			}
			case "name": {
				return a.achievement.title.localeCompare(b.achievement.title);
			}
			case "date": {
				if (a.playerData.unlockedDate && b.playerData.unlockedDate) {
					return new Date(b.playerData.unlockedDate).getTime() - new Date(a.playerData.unlockedDate).getTime();
				}
				return 0;
			}
			default: {
				return 0;
			}
		}
	});

	// Group achievements by category for display
	const groupedAchievements = sortedAchievements.reduce((groups, item) => {
		const category = item.achievement.category;
		if (!groups[category]) {
			groups[category] = [];
		}
		groups[category].push(item);
		return groups;
	}, {} as Record<AchievementCategory, { achievement: Achievement; playerData: PlayerAchievement }[]>);

	// Get tier colors and styling with enhanced visual effects
	const getTierStyle = (tier: BadgeTier, status: string) => {
		const tierColors = {
			bronze: status === "completed" ? "#CD7F32" : "#8B4513",
			silver: status === "completed" ? "#C0C0C0" : "#696969",
			gold: status === "completed" ? "#FFD700" : "#B8860B",
			legendary: status === "completed" ? "#9F7AEA" : "#6B46C1",
		};

		const isCompleted = status === "completed";
		const isRecentlyUnlocked = recentlyUnlocked.includes(status);

		return {
			borderColor: tierColors[tier],
			boxShadow: isCompleted
				? `0 0 10px ${tierColors[tier]}40`
				: "0 1px 4px rgba(0,0,0,0.2)",
			background: isCompleted
				? `linear-gradient(135deg, ${tierColors[tier]}20, ${tierColors[tier]}10, rgba(255,255,255,0.03))`
				: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
			transform: isRecentlyUnlocked ? "scale(1.01)" : "scale(1)",
			transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
			border: isCompleted ? `1px solid ${tierColors[tier]}` : "1px solid rgba(255,255,255,0.08)",
		};
	};

	// Get category display info with enhanced styling
	const getCategoryInfo = (category: AchievementCategory) => {
		const categoryInfo = {
			quest: { name: "Quest", icon: "🎯", color: "#4CAF50" },
			progress: { name: "Progress", icon: "📈", color: "#2196F3" },
			collection: { name: "Collection", icon: "💰", color: "#FF9800" },
			special: { name: "Special", icon: "⭐", color: "#9C27B0" },
			pomodoro: { name: "Focus", icon: "🍅", color: "#FF5722" },
			energy: { name: "Energy", icon: "⚡", color: "#FFD700" },
			habits: { name: "Habits", icon: "🌱", color: "#4CAF50" },
			crafting: { name: "Crafting", icon: "🔨", color: "#795548" },
			boss: { name: "Boss", icon: "⚔️", color: "#F44336" },
		};
		return categoryInfo[category];
	};

	// Compact Achievement Card optimized for sidebar
	const AchievementCard = ({
		achievement,
		playerData,
	}: {
		achievement: Achievement;
		playerData: PlayerAchievement;
	}) => {
		const isCompleted = playerData.status === "completed";
		const isLocked = playerData.status === "locked";
		const isInProgress = playerData.status === "in_progress";

		// Add to recently unlocked for animation
		useEffect(() => {
			if (isCompleted && playerData.unlockedDate) {
				const unlockTime = new Date(playerData.unlockedDate).getTime();
				const now = Date.now();
				// If unlocked within last 24 hours, add to recent
				if (now - unlockTime < 24 * 60 * 60 * 1000) {
					setRecentlyUnlocked(prev => [...prev, achievement.id]);
					// Remove from recent after animation
					setTimeout(() => {
						setRecentlyUnlocked(prev => prev.filter(id => id !== achievement.id));
					}, 3000);
				}
			}
		}, [isCompleted, playerData.unlockedDate, achievement.id]);

		return (
			<div
				style={{
					...getTierStyle(achievement.tier, playerData.status),
					borderRadius: "8px",
					padding: "12px",
					margin: "6px 0",
					position: "relative",
					overflow: "hidden",
					cursor: "pointer",
					fontSize: "12px",
				}}
				onMouseEnter={(e) => {
					if (isCompleted) {
						e.currentTarget.style.transform = "scale(1.02) translateY(-1px)";
					}
				}}
				onMouseLeave={(e) => {
					if (isCompleted) {
						e.currentTarget.style.transform = "scale(1.01)";
					}
				}}
			>
				{/* Compact Achievement Header */}
				<div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
					<span 
						style={{ 
							fontSize: "20px", 
							marginRight: "8px",
							filter: isLocked ? "grayscale(100%)" : "none",
							transition: "all 0.3s ease",
						}}
					>
						{achievement.icon}
					</span>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								margin: "0 0 4px 0",
								fontSize: "13px",
								fontWeight: "600",
								color: isCompleted ? "#fff" : "#ccc",
								textShadow: isCompleted ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
							title={achievement.title}
						>
							{achievement.title}
						</div>
						<div
							style={{
								display: "inline-block",
								padding: "2px 6px",
								borderRadius: "8px",
								background: getTierStyle(achievement.tier, "completed").borderColor,
								color: "#fff",
								fontSize: "9px",
								fontWeight: "600",
								textTransform: "uppercase",
								letterSpacing: "0.3px",
							}}
						>
							{achievement.tier}
						</div>
					</div>
					{/* Completion indicator */}
					{isCompleted && (
						<div
							style={{
								background: "linear-gradient(135deg, #4CAF50, #66BB6A)",
								borderRadius: "50%",
								width: "16px",
								height: "16px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "10px",
								boxShadow: "0 2px 6px rgba(76, 175, 80, 0.4)",
								animation: "pulse 2s infinite",
								flexShrink: 0,
							}}
						>
							✓
						</div>
					)}
				</div>

				{/* Compact description */}
				<p
					style={{
						margin: "0 0 8px 0",
						fontSize: "11px",
						color: "#aaa",
						lineHeight: "1.3",
						fontStyle: isLocked && achievement.hidden ? "italic" : "normal",
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
					}}
				>
					{isLocked && achievement.hidden
						? "???"
						: achievement.description}
				</p>

				{/* Compact Progress Bar */}
				{!isLocked && (
					<div
						style={{
							background: "rgba(255,255,255,0.1)",
							borderRadius: "6px",
							height: "6px",
							marginBottom: "8px",
							overflow: "hidden",
							position: "relative",
						}}
					>
						<div
							style={{
								background: isCompleted
									? `linear-gradient(90deg, #4CAF50, #66BB6A)`
									: `linear-gradient(90deg, #2196F3, #42A5F5)`,
								height: "100%",
								width: `${playerData.progress}%`,
								borderRadius: "6px",
								transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
								position: "relative",
							}}
						>
							{/* Progress bar shine effect */}
							{isInProgress && (
								<div
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
										animation: "shimmer 2s infinite",
									}}
								/>
							)}
						</div>
					</div>
				)}

				{/* Compact Progress Text */}
				<div
					style={{
						fontSize: "10px",
						color: "#888",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "8px",
					}}
				>
					{!isLocked && (
						<span style={{ fontWeight: "500" }}>
							{Math.round(playerData.progress)}%
							{playerData.currentValue !== undefined && (
								<span style={{ color: "#aaa", marginLeft: "4px" }}>
									({playerData.currentValue}/{achievement.criteria.target})
								</span>
							)}
						</span>
					)}
					{isCompleted && playerData.unlockedDate && (
						<span style={{ 
							color: "#4CAF50", 
							fontSize: "9px",
							fontWeight: "600",
							background: "rgba(76, 175, 80, 0.1)",
							padding: "2px 6px",
							borderRadius: "6px",
						}}>
							🏆 {new Date(playerData.unlockedDate).toLocaleDateString()}
						</span>
					)}
				</div>

				{/* Compact Rewards Preview */}
				{(isCompleted || !isLocked) && achievement.rewards && (
					<div
						style={{
							marginTop: "8px",
							padding: "8px",
							background: "rgba(255,255,255,0.06)",
							borderRadius: "6px",
							border: "1px solid rgba(255,255,255,0.08)",
						}}
					>
						<div style={{ 
							color: "#ccc", 
							marginBottom: "6px",
							fontSize: "10px",
							fontWeight: "600",
							textTransform: "uppercase",
							letterSpacing: "0.3px",
						}}>
							🎁 Rewards
						</div>
						<div
							style={{
								display: "flex",
								gap: "6px",
								flexWrap: "wrap",
							}}
						>
							{achievement.rewards.xp && (
								<span style={{ 
									color: "#66BB6A",
									background: "rgba(102, 187, 106, 0.1)",
									padding: "2px 6px",
									borderRadius: "4px",
									fontSize: "9px",
									fontWeight: "500",
								}}>
									⚡ +{achievement.rewards.xp} XP
								</span>
							)}
							{achievement.rewards.coins && (
								<span style={{ 
									color: "#FFD54F",
									background: "rgba(255, 213, 79, 0.1)",
									padding: "2px 6px",
									borderRadius: "4px",
									fontSize: "9px",
									fontWeight: "500",
								}}>
									🪙 +{achievement.rewards.coins}
								</span>
							)}
							{achievement.rewards.title && (
								<span style={{ 
									color: "#BA68C8",
									background: "rgba(186, 104, 200, 0.1)",
									padding: "2px 6px",
									borderRadius: "4px",
									fontSize: "9px",
									fontWeight: "500",
								}}>
									👑 "{achievement.rewards.title}"
								</span>
							)}
						</div>
					</div>
				)}

				{/* Hidden achievement hint */}
				{achievement.hidden && isLocked && (
					<div style={{
						position: "absolute",
						bottom: "8px",
						right: "8px",
						background: "rgba(255,255,255,0.1)",
						borderRadius: "50%",
						width: "16px",
						height: "16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "9px",
						color: "#666",
						cursor: "help",
					}} title="This is a hidden achievement. Keep playing to discover it!">
						❓
					</div>
				)}
			</div>
		);
	};

	return (
		<div
			style={{
				padding: "16px",
				maxHeight: "80vh",
				overflowY: "auto",
				color: "#fff",
				background: "linear-gradient(135deg, #0f0f23, #1a1a2e)",
				width: "100%",
				boxSizing: "border-box",
			}}
		>
			{/* Compact Header with Progress Overview */}
			<div
				style={{
					background: "linear-gradient(135deg, #1a1a2e, #16213e)",
					borderRadius: "12px",
					padding: "16px",
					marginBottom: "16px",
					textAlign: "center",
					border: "1px solid rgba(255,255,255,0.1)",
					boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
				}}
			>
				<h2 style={{ 
					margin: "0 0 12px 0", 
					fontSize: "18px",
					fontWeight: "700",
					background: "linear-gradient(135deg, #FFD700, #FFA500)",
					WebkitBackgroundClip: "text",
					WebkitTextFillColor: "transparent",
					textShadow: "0 2px 4px rgba(0,0,0,0.3)",
				}}>
					🏆 Achievements
				</h2>
				<div style={{ 
					fontSize: "14px", 
					marginBottom: "8px",
					fontWeight: "600",
				}}>
					<span style={{ color: "#4CAF50" }}>{completedCount}</span> /{" "}
					<span style={{ color: "#fff" }}>{totalCount}</span>
				</div>
				<div
					style={{
						background: "rgba(255,255,255,0.1)",
						borderRadius: "8px",
						height: "8px",
						overflow: "hidden",
						marginBottom: "8px",
						border: "1px solid rgba(255,255,255,0.2)",
					}}
				>
					<div
						style={{
							background: "linear-gradient(90deg, #4CAF50, #66BB6A, #81C784)",
							height: "100%",
							width: `${(completedCount / totalCount) * 100}%`,
							borderRadius: "8px",
							transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
							position: "relative",
						}}
					>
						{/* Progress bar shine effect */}
						<div
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
								animation: "shimmer 3s infinite",
							}}
						/>
					</div>
				</div>
				<div
					style={{
						fontSize: "12px",
						color: "#aaa",
						fontWeight: "500",
					}}
				>
					{Math.round((completedCount / totalCount) * 100)}% Complete
				</div>
			</div>

			{/* Compact Filter Controls */}
			<div
				style={{
					background: "rgba(255,255,255,0.06)",
					borderRadius: "10px",
					padding: "12px",
					marginBottom: "16px",
					border: "1px solid rgba(255,255,255,0.08)",
				}}
			>
				{/* Compact Search Bar */}
				<div style={{ marginBottom: "12px" }}>
					<input
						type="text"
						placeholder="🔍 Search..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						style={{
							width: "100%",
							padding: "8px 12px",
							borderRadius: "8px",
							border: "1px solid rgba(255,255,255,0.2)",
							background: "rgba(255,255,255,0.1)",
							color: "#fff",
							fontSize: "12px",
							outline: "none",
							boxSizing: "border-box",
						}}
					/>
				</div>

				{/* Compact Category and View Controls */}
				<div style={{ marginBottom: "12px" }}>
					<label
						style={{
							fontSize: "11px",
							color: "#ccc",
							marginBottom: "6px",
							display: "block",
							fontWeight: "600",
						}}
					>
						Category:
					</label>
					<div
						style={{
							display: "flex",
							gap: "4px",
							flexWrap: "wrap",
							marginBottom: "8px",
						}}
					>
						<button
							onClick={() => setSelectedCategory("all")}
							style={{
								padding: "4px 8px",
								borderRadius: "12px",
								border: "none",
								background:
									selectedCategory === "all"
										? "#2196F3"
										: "rgba(255,255,255,0.1)",
								color: "#fff",
								fontSize: "10px",
								cursor: "pointer",
								fontWeight: "600",
								transition: "all 0.2s ease",
							}}
						>
							All
						</button>
						{(
							[
								"quest",
								"progress",
								"collection",
								"special",
								"pomodoro",
							] as AchievementCategory[]
						).map((category) => {
							const info = getCategoryInfo(category);
							return (
								<button
									key={category}
									onClick={() =>
										setSelectedCategory(category)
									}
									style={{
										padding: "4px 8px",
										borderRadius: "12px",
										border: "none",
										background:
											selectedCategory === category
												? info.color
												: "rgba(255,255,255,0.1)",
										color: "#fff",
										fontSize: "10px",
										cursor: "pointer",
										fontWeight: "600",
										transition: "all 0.2s ease",
									}}
								>
									{info.icon}
								</button>
							);
						})}
					</div>

					{/* Compact View Mode Toggle */}
					<div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
						<button
							onClick={() => setViewMode("list")}
							style={{
								padding: "4px 8px",
								borderRadius: "6px",
								border: "none",
								background: viewMode === "list" ? "#4CAF50" : "rgba(255,255,255,0.1)",
								color: "#fff",
								fontSize: "10px",
								cursor: "pointer",
								transition: "all 0.2s ease",
							}}
						>
							📋 List
						</button>
						<button
							onClick={() => setViewMode("grid")}
							style={{
								padding: "4px 8px",
								borderRadius: "6px",
								border: "none",
								background: viewMode === "grid" ? "#4CAF50" : "rgba(255,255,255,0.1)",
								color: "#fff",
								fontSize: "10px",
								cursor: "pointer",
								transition: "all 0.2s ease",
							}}
						>
							📱 Grid
						</button>
					</div>
				</div>

				{/* Compact Sorting */}
				<div style={{ marginBottom: "12px" }}>
					<label
						style={{
							fontSize: "11px",
							color: "#ccc",
							marginBottom: "4px",
							display: "block",
							fontWeight: "600",
						}}
					>
						Sort:
					</label>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as "progress" | "tier" | "name" | "date")}
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							border: "1px solid rgba(255,255,255,0.2)",
							background: "rgba(255,255,255,0.1)",
							color: "#fff",
							fontSize: "10px",
							outline: "none",
							width: "100%",
							boxSizing: "border-box",
						}}
					>
						<option value="progress">Progress</option>
						<option value="tier">Tier</option>
						<option value="name">Name</option>
						<option value="date">Date</option>
					</select>
				</div>

				{/* Compact Status Filters */}
				<div style={{ display: "flex", gap: "8px", fontSize: "10px" }}>
					<label
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							cursor: "pointer",
							padding: "3px 6px",
							borderRadius: "6px",
							background: showCompleted ? "rgba(76, 175, 80, 0.2)" : "transparent",
							border: showCompleted ? "1px solid #4CAF50" : "1px solid rgba(255,255,255,0.2)",
						}}
					>
						<input
							type="checkbox"
							checked={showCompleted}
							onChange={(e) => setShowCompleted(e.target.checked)}
							style={{ accentColor: "#4CAF50", transform: "scale(0.8)" }}
						/>
						<span style={{ color: "#4CAF50", fontWeight: "600" }}>✅</span>
					</label>
					<label
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							cursor: "pointer",
							padding: "3px 6px",
							borderRadius: "6px",
							background: showInProgress ? "rgba(33, 150, 243, 0.2)" : "transparent",
							border: showInProgress ? "1px solid #2196F3" : "1px solid rgba(255,255,255,0.2)",
						}}
					>
						<input
							type="checkbox"
							checked={showInProgress}
							onChange={(e) =>
								setShowInProgress(e.target.checked)
							}
							style={{ accentColor: "#2196F3", transform: "scale(0.8)" }}
						/>
						<span style={{ color: "#2196F3", fontWeight: "600" }}>🔄</span>
					</label>
					<label
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							cursor: "pointer",
							padding: "3px 6px",
							borderRadius: "6px",
							background: showLocked ? "rgba(255,255,255,0.1)" : "transparent",
							border: showLocked ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.2)",
						}}
					>
						<input
							type="checkbox"
							checked={showLocked}
							onChange={(e) => setShowLocked(e.target.checked)}
							style={{ accentColor: "#666", transform: "scale(0.8)" }}
						/>
						<span style={{ color: "#666", fontWeight: "600" }}>🔒</span>
					</label>
				</div>
			</div>

			{/* Achievement List by Category - Optimized for sidebar */}
			{Object.entries(groupedAchievements).map(
				([category, achievements]) => {
					const categoryInfo = getCategoryInfo(
						category as AchievementCategory
					);

					return (
						<div key={category} style={{ marginBottom: "20px" }}>
							<h3
								style={{
									color: categoryInfo.color,
									fontSize: "14px",
									marginBottom: "8px",
									display: "flex",
									alignItems: "center",
									gap: "6px",
									fontWeight: "700",
									textShadow: "0 1px 2px rgba(0,0,0,0.3)",
								}}
							>
								<span style={{ fontSize: "16px" }}>{categoryInfo.icon}</span>
								{categoryInfo.name}
								<span
									style={{
										fontSize: "10px",
										color: "#666",
										background: "rgba(255,255,255,0.1)",
										padding: "2px 6px",
										borderRadius: "10px",
										fontWeight: "600",
										marginLeft: "auto",
									}}
								>
									{
										achievements.filter(
											(a) =>
												a.playerData.status ===
												"completed"
										).length
									}
									/{achievements.length}
								</span>
							</h3>

							{/* List view optimized for sidebar */}
							<div style={{
								display: "block",
								gap: "4px",
							}}>
								{achievements.map(({ achievement, playerData }) => (
									<AchievementCard
										key={achievement.id}
										achievement={achievement}
										playerData={playerData}
									/>
								))}
							</div>
						</div>
					);
				}
			)}

			{/* Compact Empty State */}
			{filteredAchievements.length === 0 && (
				<div
					style={{
						textAlign: "center",
						padding: "40px 20px",
						color: "#666",
						fontSize: "14px",
						background: "rgba(255,255,255,0.05)",
						borderRadius: "12px",
						border: "1px solid rgba(255,255,255,0.1)",
					}}
				>
					<div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
					<h3 style={{ margin: "0 0 8px 0", color: "#ccc", fontSize: "14px" }}>No achievements found</h3>
					<p style={{ margin: 0, color: "#888", fontSize: "12px" }}>
						Try adjusting your filters.
					</p>
				</div>
			)}

			{/* Compact Refresh Button */}
			{onRefresh && (
				<button
					onClick={onRefresh}
					style={{
						position: "fixed",
						bottom: "16px",
						right: "16px",
						background: "linear-gradient(135deg, #2196F3, #42A5F5)",
						border: "none",
						borderRadius: "50%",
						width: "48px",
						height: "48px",
						color: "#fff",
						fontSize: "20px",
						cursor: "pointer",
						boxShadow: "0 4px 16px rgba(33, 150, 243, 0.4)",
						transition: "all 0.3s ease",
						zIndex: 1000,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = "scale(1.1)";
						e.currentTarget.style.boxShadow = "0 8px 24px rgba(33, 150, 243, 0.6)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = "scale(1)";
						e.currentTarget.style.boxShadow = "0 4px 16px rgba(33, 150, 243, 0.4)";
					}}
					title="Refresh achievements"
				>
					🔄
				</button>
			)}

			{/* CSS Animations */}
			<style>
				{`
					@keyframes pulse {
						0%, 100% { transform: scale(1); }
						50% { transform: scale(1.05); }
					}
					
					@keyframes shimmer {
						0% { transform: translateX(-100%); }
						100% { transform: translateX(100%); }
					}
				`}
			</style>
		</div>
	);
}
