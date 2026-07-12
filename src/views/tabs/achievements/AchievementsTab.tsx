// Enhanced Achievements Tab - Display achievement progress and unlocked badges
// Optimized for 250px sidebar width with compact layout

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import {
	AchievementTracker,
	Achievement,
	PlayerAchievement,
	AchievementCategory,
	BadgeTier,
} from "../../../data/models/AchievementSystem";
import achStyles from "./AchievementsTab.module.css";

export interface AchievementsTabProps {
	tracker: AchievementTracker;
	onRefresh?: () => void;
	highlightAchievementId?: string | null;
}

const TIER_CLASS: Record<BadgeTier, string> = {
	bronze: achStyles.tierBronze,
	silver: achStyles.tierSilver,
	gold: achStyles.tierGold,
	legendary: achStyles.tierLegendary,
};

const TIER_CHIP_CLASS: Record<BadgeTier, string> = {
	bronze: achStyles.tierChipBronze,
	silver: achStyles.tierChipSilver,
	gold: achStyles.tierChipGold,
	legendary: achStyles.tierChipLegendary,
};

const TIER_ACTIVE_COLOR: Record<BadgeTier, string> = {
	bronze: "#CD7F32",
	silver: "#C0C0C0",
	gold: "#FFD700",
	legendary: "#9F7AEA",
};

const TIER_LOCKED_COLOR: Record<BadgeTier, string> = {
	bronze: "#8B4513",
	silver: "#696969",
	gold: "#B8860B",
	legendary: "#6B46C1",
};

const CATEGORY_CLASS: Record<AchievementCategory, string> = {
	quest: achStyles.catQuest,
	progress: achStyles.catProgress,
	collection: achStyles.catCollection,
	special: achStyles.catSpecial,
	pomodoro: achStyles.catPomodoro,
	energy: achStyles.catEnergy,
	habits: achStyles.catHabits,
	crafting: achStyles.catCrafting,
	boss: achStyles.catBoss,
};

function tierVars(tier: BadgeTier, status: string): React.CSSProperties {
	return {
		"--ach-tier":
			status === "completed" ? TIER_ACTIVE_COLOR[tier] : TIER_LOCKED_COLOR[tier],
	} as React.CSSProperties;
}

const ALL_CATEGORIES: AchievementCategory[] = [
	"quest",
	"progress",
	"collection",
	"special",
	"pomodoro",
	"energy",
	"habits",
	"crafting",
	"boss",
];

export default function AchievementsTab({
	tracker,
	onRefresh,
	highlightAchievementId = null,
}: AchievementsTabProps) {
	const [selectedCategory, setSelectedCategory] = useState<
		AchievementCategory | "all"
	>("all");
	const [showCompleted, setShowCompleted] = useState<boolean>(true);
	const [showInProgress, setShowInProgress] = useState<boolean>(true);
	const [showLocked, setShowLocked] = useState<boolean>(true);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [sortBy, setSortBy] = useState<"progress" | "tier" | "name" | "date">("progress");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [recentlyUnlocked, setRecentlyUnlocked] = useState<string[]>([]);
	const [detailEntry, setDetailEntry] = useState<{
		achievement: Achievement;
		playerData: PlayerAchievement;
	} | null>(null);
	const shellRef = useRef<HTMLDivElement>(null);

	const allAchievements = tracker.getAllAchievements();
	const completedCount = tracker.getCompletedAchievements().length;
	const totalCount = allAchievements.length;
	const recentUnlocks = useMemo(() => tracker.getRecentlyUnlocked(), [tracker, allAchievements]);
	const showcase = useMemo(() => tracker.getShowcaseAchievements(), [tracker, allAchievements]);
	const tierCounts = useMemo(() => tracker.getTierCounts(), [tracker, allAchievements]);

	useEffect(() => {
		if (!highlightAchievementId || !shellRef.current) return;
		const el = shellRef.current.querySelector(
			`[data-achievement-id="${highlightAchievementId}"]`
		);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			setRecentlyUnlocked((prev) =>
				prev.includes(highlightAchievementId)
					? prev
					: [...prev, highlightAchievementId]
			);
			const timer = window.setTimeout(() => {
				setRecentlyUnlocked((prev) =>
					prev.filter((id) => id !== highlightAchievementId)
				);
			}, 4000);
			return () => window.clearTimeout(timer);
		}
	}, [highlightAchievementId]);

	const openDetail = useCallback(
		(achievement: Achievement, playerData: PlayerAchievement) => {
			setDetailEntry({ achievement, playerData });
		},
		[]
	);

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

	// Get category display info
	const getCategoryInfo = (category: AchievementCategory) => {
		const categoryInfo = {
			quest: { name: "Quest", icon: "🎯" },
			progress: { name: "Progress", icon: "📈" },
			collection: { name: "Collection", icon: "💰" },
			special: { name: "Special", icon: "⭐" },
			pomodoro: { name: "Focus", icon: "🍅" },
			energy: { name: "Energy", icon: "⚡" },
			habits: { name: "Habits", icon: "🌱" },
			crafting: { name: "Crafting", icon: "🔨" },
			boss: { name: "Boss", icon: "⚔️" },
		};
		return categoryInfo[category];
	};

	// Compact Achievement Card optimized for sidebar
	const AchievementCard = ({
		achievement,
		playerData,
		viewMode = "list",
	}: {
		achievement: Achievement;
		playerData: PlayerAchievement;
		viewMode?: "grid" | "list";
	}) => {
		const isCompleted = playerData.status === "completed";
		const isLocked = playerData.status === "locked";
		const isInProgress = playerData.status === "in_progress";
		const isHighlighted = recentlyUnlocked.includes(achievement.id);

		const cardClassName = [
			achStyles.achCard,
			isCompleted ? achStyles.achCardCompleted : undefined,
			viewMode === "grid" ? achStyles.achCardGrid : achStyles.achCardList,
			isHighlighted ? achStyles.highlightPulse : undefined,
		]
			.filter(Boolean)
			.join(" ");

		const titleClassName = [
			achStyles.achCardTitle,
			viewMode === "grid" ? achStyles.achCardTitleGrid : achStyles.achCardTitleList,
			isCompleted ? achStyles.achCardTitleCompleted : achStyles.achCardTitleMuted,
		].join(" ");

		// Grid view (compact card)
		if (viewMode === "grid") {
			return (
				<div
					data-achievement-card
					data-achievement-id={achievement.id}
					data-achievement-view="grid"
					className={cardClassName}
					style={tierVars(achievement.tier, playerData.status)}
					onClick={() => openDetail(achievement, playerData)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							openDetail(achievement, playerData);
						}
					}}
					role="button"
					tabIndex={0}
				>
					<span
						className={`${achStyles.achCardIcon} ${achStyles.achCardIconGrid} ${
							isLocked ? achStyles.achCardIconLocked : ""
						}`}
					>
						{achievement.icon}
					</span>

					<div className={titleClassName} title={achievement.title}>
						{achievement.title}
					</div>

					<div
						className={`${achStyles.achCardTier} ${achStyles.achCardTierGrid}`}
						style={{ "--ach-tier": TIER_ACTIVE_COLOR[achievement.tier] } as React.CSSProperties}
					>
						{achievement.tier}
					</div>

					{isCompleted && (
						<div className={`${achStyles.achCardCheck} ${achStyles.achCardCheckGrid}`}>
							✓
						</div>
					)}

					{!isLocked && !isCompleted && (
						<div
							className={`${achStyles.achCardProgressTrack} ${achStyles.achCardProgressTrackGrid}`}
						>
							<div
								className={achStyles.achCardProgressFill}
								style={{ width: `${playerData.progress}%` }}
							/>
						</div>
					)}
				</div>
			);
		}

		// List view (detailed card)
		return (
			<div
				data-achievement-card
				data-achievement-id={achievement.id}
				data-achievement-view="list"
				className={cardClassName}
				style={tierVars(achievement.tier, playerData.status)}
				onClick={() => openDetail(achievement, playerData)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						openDetail(achievement, playerData);
					}
				}}
				role="button"
				tabIndex={0}
			>
				<div className={achStyles.achCardHeader}>
					<span
						className={`${achStyles.achCardIcon} ${achStyles.achCardIconList} ${
							isLocked ? achStyles.achCardIconLocked : ""
						}`}
					>
						{achievement.icon}
					</span>
					<div className={achStyles.achCardHeaderBody}>
						<div className={titleClassName} title={achievement.title}>
							{achievement.title}
						</div>
						<div
							className={`${achStyles.achCardTier} ${achStyles.achCardTierList}`}
							style={{ "--ach-tier": TIER_ACTIVE_COLOR[achievement.tier] } as React.CSSProperties}
						>
							{achievement.tier}
						</div>
					</div>
					{isCompleted && (
						<div className={`${achStyles.achCardCheck} ${achStyles.achCardCheckList}`}>
							✓
						</div>
					)}
				</div>

				<p
					className={`${achStyles.achCardDesc} ${
						isLocked && achievement.hidden ? achStyles.achCardDescHidden : ""
					}`}
				>
					{isLocked && achievement.hidden ? "???" : achievement.description}
				</p>

				{!isLocked && (
					<div
						className={`${achStyles.achCardProgressTrack} ${achStyles.achCardProgressTrackList}`}
					>
						<div
							className={`${achStyles.achCardProgressFill} ${
								isCompleted ? achStyles.achCardProgressFillDone : ""
							}`}
							style={{ width: `${playerData.progress}%` }}
						>
							{isInProgress && <div className={achStyles.achCardProgressShine} />}
						</div>
					</div>
				)}

				<div className={achStyles.achCardMeta}>
					{!isLocked && (
						<span className={achStyles.achCardMetaValue}>
							{Math.round(playerData.progress)}%
							{playerData.currentValue !== undefined && (
								<span className={achStyles.achCardMetaSub}>
									({playerData.currentValue}/{achievement.criteria.target})
								</span>
							)}
						</span>
					)}
					{isCompleted && playerData.unlockedDate && (
						<span className={achStyles.achCardUnlocked}>
							🏆 {new Date(playerData.unlockedDate).toLocaleDateString()}
						</span>
					)}
				</div>

				{(isCompleted || !isLocked) && achievement.rewards && (
					<div className={achStyles.achCardRewards}>
						<div className={achStyles.achCardRewardsLabel}>🎁 Rewards</div>
						<div className={achStyles.achCardRewardsRow}>
							{achievement.rewards.xp && (
								<span className={achStyles.achRewardXp}>
									⚡ +{achievement.rewards.xp} XP
								</span>
							)}
							{achievement.rewards.coins && (
								<span className={achStyles.achRewardCoins}>
									🪙 +{achievement.rewards.coins}
								</span>
							)}
							{achievement.rewards.title && (
								<span className={achStyles.achRewardTitle}>
									👑 "{achievement.rewards.title}"
								</span>
							)}
						</div>
					</div>
				)}

				{achievement.hidden && isLocked && (
					<div
						className={achStyles.achHiddenHint}
						title="This is a hidden achievement. Keep playing to discover it!"
					>
						❓
					</div>
				)}
			</div>
		);
	};

	return (
		<div
			ref={shellRef}
			className={`${achStyles.pixelAchievementsShell} ${achStyles.shellRoot}`}
			data-pixel-shell="achievements"
		>
			{/* Compact Header with Progress Overview */}
			<div className={achStyles.progressHero}>
				<h2 className={achStyles.progressHeroTitle}>
					🏆 Trophy Gallery
				</h2>
				<div className={achStyles.progressHeroCount}>
					<span className={achStyles.progressHeroCountDone}>{completedCount}</span> /{" "}
					<span>{totalCount}</span>
				</div>
				<div className={achStyles.progressHeroTrack}>
					<div
						className={achStyles.progressHeroFill}
						style={{ width: `${(completedCount / totalCount) * 100}%` }}
					/>
				</div>
				<div className={achStyles.progressHeroPct}>
					{Math.round((completedCount / totalCount) * 100)}% Complete
				</div>
			</div>

			<div className={achStyles.galleryHero}>
				<h3 className={achStyles.galleryHeroTitle}>TROPHY ROOM</h3>
				<p className={achStyles.galleryHeroSub}>
					Badges earned across quests, focus, habits, crafting, and gate raids.
				</p>
				<div className={achStyles.tierStrip}>
					{(["bronze", "silver", "gold", "legendary"] as BadgeTier[]).map((tier) => (
						<div
							key={tier}
							className={`${achStyles.tierChip} ${TIER_CHIP_CLASS[tier]}`}
						>
							<span className={achStyles.tierChipLabel}>{tier}</span>
							<span className={achStyles.tierChipCount}>
								{tierCounts[tier].earned}/{tierCounts[tier].total}
							</span>
						</div>
					))}
				</div>
			</div>

			{recentUnlocks.length > 0 && (
				<section className={achStyles.recentSection}>
					<h3 className={achStyles.sectionLabel}>RECENT UNLOCKS</h3>
					<div className={achStyles.recentRow}>
						{recentUnlocks.slice(0, 8).map(({ achievement, playerData }) => (
							<button
								key={achievement.id}
								type="button"
								className={achStyles.recentBadge}
								data-achievement-id={achievement.id}
								onClick={() => openDetail(achievement, playerData)}
							>
								<span className={achStyles.recentIcon}>{achievement.icon}</span>
								<span className={achStyles.recentTitle} title={achievement.title}>
									{achievement.title}
								</span>
								<span className={`${achStyles.showcaseTier} ${TIER_CLASS[achievement.tier]}`}>
									{achievement.tier}
								</span>
							</button>
						))}
					</div>
				</section>
			)}

			{showcase.length > 0 ? (
				<section className={achStyles.showcaseSection}>
					<h3 className={achStyles.sectionLabel}>SHOWCASE</h3>
					<div className={achStyles.showcaseRow}>
						{showcase.map(({ achievement, playerData }) => (
							<button
								key={achievement.id}
								type="button"
								className={achStyles.showcaseBadge}
								data-achievement-id={achievement.id}
								onClick={() => openDetail(achievement, playerData)}
							>
								<span className={achStyles.showcaseIcon}>{achievement.icon}</span>
								<span className={achStyles.showcaseTitle} title={achievement.title}>
									{achievement.title}
								</span>
								<span className={`${achStyles.showcaseTier} ${TIER_CLASS[achievement.tier]}`}>
									{achievement.tier}
								</span>
							</button>
						))}
					</div>
				</section>
			) : (
				<div className={achStyles.emptyGallery}>
					No trophies yet — complete quests and gate raids to fill the room.
				</div>
			)}

			{/* Compact Filter Controls */}
			<div className={achStyles.filterPanel}>
				<input
					type="text"
					placeholder="🔍 Search..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className={achStyles.filterSearch}
				/>

				<div className={achStyles.filterSection}>
					<label className={achStyles.filterLabel}>Category:</label>
					<div className={achStyles.filterChipRow}>
						<button
							type="button"
							onClick={() => setSelectedCategory("all")}
							className={`${achStyles.filterChip} ${
								selectedCategory === "all" ? achStyles.filterChipAllActive : ""
							}`}
						>
							All
						</button>
						{ALL_CATEGORIES.map((category) => {
							const info = getCategoryInfo(category);
							return (
								<button
									key={category}
									type="button"
									onClick={() => setSelectedCategory(category)}
									className={`${achStyles.filterChip} ${CATEGORY_CLASS[category]} ${
										selectedCategory === category ? achStyles.filterChipActive : ""
									}`}
								>
									{info.icon}
								</button>
							);
						})}
					</div>

					<div className={achStyles.viewToggleRow}>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							className={`${achStyles.viewToggleBtn} ${
								viewMode === "list" ? achStyles.viewToggleBtnActive : ""
							}`}
						>
							📋 List
						</button>
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`${achStyles.viewToggleBtn} ${
								viewMode === "grid" ? achStyles.viewToggleBtnActive : ""
							}`}
						>
							📱 Grid
						</button>
					</div>
				</div>

				<div className={achStyles.filterSection}>
					<label className={achStyles.filterLabel}>Sort:</label>
					<select
						value={sortBy}
						onChange={(e) =>
							setSortBy(e.target.value as "progress" | "tier" | "name" | "date")
						}
						className={achStyles.sortSelect}
					>
						<option value="progress">Progress</option>
						<option value="tier">Tier</option>
						<option value="name">Name</option>
						<option value="date">Date</option>
					</select>
				</div>

				<div className={achStyles.statusFilterCol}>
					<button
						type="button"
						onClick={() => setShowCompleted(!showCompleted)}
						className={`${achStyles.statusFilterBtn} ${
							showCompleted
								? `${achStyles.statusFilterBtnActive} ${achStyles.statusCompletedActive}`
								: ""
						}`}
					>
						<span className={achStyles.statusFilterIcon}>✅</span>
						<span>Show Completed</span>
					</button>
					<button
						type="button"
						onClick={() => setShowInProgress(!showInProgress)}
						className={`${achStyles.statusFilterBtn} ${
							showInProgress
								? `${achStyles.statusFilterBtnActive} ${achStyles.statusProgressActive}`
								: ""
						}`}
					>
						<span className={achStyles.statusFilterIcon}>🔄</span>
						<span>Show In Progress</span>
					</button>
					<button
						type="button"
						onClick={() => setShowLocked(!showLocked)}
						className={`${achStyles.statusFilterBtn} ${
							showLocked
								? `${achStyles.statusFilterBtnActive} ${achStyles.statusLockedActive}`
								: ""
						}`}
					>
						<span className={achStyles.statusFilterIcon}>🔒</span>
						<span>Show Locked</span>
					</button>
				</div>
			</div>

			{/* Achievement List by Category - Optimized for sidebar */}
			{Object.entries(groupedAchievements).map(
				([category, achievements]) => {
					const categoryInfo = getCategoryInfo(
						category as AchievementCategory
					);

					return (
						<div key={category} className={`${achStyles.categorySection} ${CATEGORY_CLASS[category as AchievementCategory]}`}>
							<h3 className={achStyles.categoryHeading}>
								<span className={achStyles.categoryHeadingIcon}>
									{categoryInfo.icon}
								</span>
								{categoryInfo.name}
								<span className={achStyles.categoryCount}>
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

							<div
								className={
									viewMode === "grid"
										? achStyles.achievementGrid
										: achStyles.achievementList
								}
							>
								{achievements.map(({ achievement, playerData }) => (
									<AchievementCard
										key={achievement.id}
										achievement={achievement}
										playerData={playerData}
										viewMode={viewMode}
									/>
								))}
							</div>
						</div>
					);
				}
			)}

			{filteredAchievements.length === 0 && (
				<div className={achStyles.emptyState}>
					<div className={achStyles.emptyStateIcon}>🔍</div>
					<h3>No achievements found</h3>
					<p>Try adjusting your filters.</p>
				</div>
			)}

			{onRefresh && (
				<button
					type="button"
					onClick={onRefresh}
					className={achStyles.refreshBtn}
					title="Refresh achievements"
				>
					🔄
				</button>
			)}

			{detailEntry &&
				ReactDOM.createPortal(
					<div
						className={achStyles.detailBackdrop}
						role="dialog"
						aria-modal="true"
						onClick={() => setDetailEntry(null)}
						onKeyDown={(e) => e.key === "Escape" && setDetailEntry(null)}
					>
						<div className={achStyles.detailPanel} onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								className={achStyles.detailClose}
								onClick={() => setDetailEntry(null)}
								aria-label="Close"
							>
								×
							</button>
							<div className={achStyles.detailIcon}>{detailEntry.achievement.icon}</div>
							<h3 className={achStyles.detailTitle}>{detailEntry.achievement.title}</h3>
							<p className={achStyles.detailDesc}>{detailEntry.achievement.description}</p>
							<div className={achStyles.detailMeta}>
								<span className={`${achStyles.showcaseTier} ${TIER_CLASS[detailEntry.achievement.tier]}`}>
									{detailEntry.achievement.tier}
								</span>
								<span className={achStyles.showcaseTier}>
									{getCategoryInfo(detailEntry.achievement.category).icon}{" "}
									{getCategoryInfo(detailEntry.achievement.category).name}
								</span>
								{detailEntry.playerData.status === "completed" && detailEntry.playerData.unlockedDate && (
									<span className={achStyles.showcaseTier}>
										🏆 {new Date(detailEntry.playerData.unlockedDate).toLocaleDateString()}
									</span>
								)}
							</div>
							{detailEntry.playerData.status !== "locked" && (
								<div className={achStyles.detailProgressWrap}>
									<div className={achStyles.detailProgressTrack}>
										<div
											className={`${achStyles.detailProgressFill} ${
												detailEntry.playerData.status === "completed"
													? achStyles.detailProgressFillDone
													: ""
											}`}
											style={{ width: `${detailEntry.playerData.progress}%` }}
										/>
									</div>
									<div className={achStyles.detailProgressMeta}>
										{Math.round(detailEntry.playerData.progress)}%
										{detailEntry.playerData.currentValue !== undefined && (
											<>
												{" "}
												({detailEntry.playerData.currentValue}/
												{detailEntry.achievement.criteria.target})
											</>
										)}
									</div>
								</div>
							)}
							{detailEntry.achievement.rewards && (
								<div className={achStyles.detailRewards}>
									<strong>Rewards:</strong>{" "}
									{[
										detailEntry.achievement.rewards.xp
											? `+${detailEntry.achievement.rewards.xp} XP`
											: null,
										detailEntry.achievement.rewards.coins
											? `+${detailEntry.achievement.rewards.coins} coins`
											: null,
										detailEntry.achievement.rewards.title
											? `title "${detailEntry.achievement.rewards.title}"`
											: null,
									]
										.filter(Boolean)
										.join(" · ") || "Bragging rights"}
								</div>
							)}
						</div>
					</div>,
					document.body
				)}
		</div>
	);
}
