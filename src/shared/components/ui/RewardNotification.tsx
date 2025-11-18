import React, { useState, useEffect } from "react";
import {
	QuestRewardItem,
	getRarityColor,
	getRarityDisplayName,
} from "../../../features/quests/utils/questRewardsSystem";

interface RewardNotificationProps {
	rewards: QuestRewardItem[];
	isVisible: boolean;
	onClose: () => void;
	questTitle: string;
}

export const RewardNotification: React.FC<RewardNotificationProps> = ({
	rewards,
	isVisible,
	onClose,
	questTitle,
}) => {
	const [animationStage, setAnimationStage] = useState<
		"entering" | "showing" | "leaving"
	>("entering");
	const [currentRewardIndex, setCurrentRewardIndex] = useState(0);

	useEffect(() => {
		if (!isVisible) return;

		// Animation sequence
		setAnimationStage("entering");
		const enterTimer = setTimeout(() => setAnimationStage("showing"), 300);

		// Auto-close after showing all rewards
		const closeTimer = setTimeout(() => {
			setAnimationStage("leaving");
			setTimeout(onClose, 500);
		}, 3000 + rewards.length * 500);

		return () => {
			clearTimeout(enterTimer);
			clearTimeout(closeTimer);
		};
	}, [isVisible, rewards.length, onClose]);

	// Cycle through rewards for display
	useEffect(() => {
		if (animationStage === "showing" && rewards.length > 1) {
			const interval = setInterval(() => {
				setCurrentRewardIndex((prev) => (prev + 1) % rewards.length);
			}, 800);
			return () => clearInterval(interval);
		}
	}, [animationStage, rewards.length]);

	if (!isVisible || rewards.length === 0) return null;

	const currentReward = rewards[currentRewardIndex] || rewards[0];
	const rarityColor = getRarityColor(currentReward.rarity);

	return (
		<div
			style={{
				position: "fixed",
				top: "20px",
				right: "20px",
				zIndex: 10000,
				transform:
					animationStage === "entering"
						? "translateX(400px)"
						: animationStage === "leaving"
						? "translateX(400px) rotateY(90deg)"
						: "translateX(0px)",
				transition: "all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
				opacity: animationStage === "leaving" ? 0 : 1,
			}}
		>
			{/* Main notification card */}
			<div
				style={{
					background: `linear-gradient(135deg, ${rarityColor}20, ${rarityColor}40)`,
					border: `2px solid ${rarityColor}`,
					borderRadius: "12px",
					padding: "16px",
					minWidth: "320px",
					maxWidth: "400px",
					backdropFilter: "blur(10px)",
					boxShadow: `0 8px 32px ${rarityColor}30, 0 0 0 1px rgba(255,255,255,0.1)`,
					color: "#fff",
					fontFamily: "system-ui, -apple-system, sans-serif",
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Sparkle animation overlay */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: `radial-gradient(circle at 50% 50%, ${rarityColor}15 0%, transparent 70%)`,
						animation:
							animationStage === "showing"
								? "pulse 2s ease-in-out infinite"
								: "none",
						pointerEvents: "none",
					}}
				/>

				{/* Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: "12px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<span style={{ fontSize: "20px" }}>🎁</span>
						<span
							style={{
								fontSize: "14px",
								fontWeight: "600",
								color: "#fff",
							}}
						>
							Quest Rewards!
						</span>
					</div>
					<button
						onClick={onClose}
						style={{
							background: "rgba(255,255,255,0.2)",
							border: "none",
							borderRadius: "6px",
							color: "#fff",
							width: "24px",
							height: "24px",
							cursor: "pointer",
							fontSize: "16px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: 1,
						}}
					>
						×
					</button>
				</div>

				{/* Quest title */}
				<div
					style={{
						fontSize: "12px",
						opacity: 0.8,
						marginBottom: "16px",
						fontStyle: "italic",
					}}
				>
					Completed: {questTitle}
				</div>

				{/* Current reward display */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
						position: "relative",
						zIndex: 1,
					}}
				>
					<div
						style={{
							fontSize: "48px",
							transform:
								animationStage === "showing"
									? "scale(1.1)"
									: "scale(1)",
							transition: "transform 0.3s ease",
						}}
					>
						{currentReward.icon}
					</div>

					<div style={{ flex: 1 }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "4px",
							}}
						>
							<span
								style={{
									fontSize: "16px",
									fontWeight: "700",
									color: "#fff",
								}}
							>
								{currentReward.name}
							</span>
							{currentReward.quantity &&
								currentReward.quantity > 1 && (
									<span
										style={{
											background: rarityColor,
											color: "#fff",
											fontSize: "12px",
											fontWeight: "600",
											padding: "2px 6px",
											borderRadius: "10px",
										}}
									>
										x{currentReward.quantity}
									</span>
								)}
						</div>

						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "4px",
							}}
						>
							<span
								style={{
									background: `${rarityColor}40`,
									color: rarityColor,
									fontSize: "11px",
									fontWeight: "600",
									padding: "2px 6px",
									borderRadius: "4px",
									border: `1px solid ${rarityColor}60`,
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								{getRarityDisplayName(currentReward.rarity)}
							</span>
							<span
								style={{
									background: "rgba(255,255,255,0.15)",
									color: "#fff",
									fontSize: "11px",
									padding: "2px 6px",
									borderRadius: "4px",
									textTransform: "capitalize",
								}}
							>
								{currentReward.category}
							</span>
						</div>

						<div
							style={{
								fontSize: "12px",
								opacity: 0.9,
								lineHeight: "1.3",
								color: "#fff",
							}}
						>
							{currentReward.description}
						</div>
					</div>
				</div>

				{/* Multiple rewards indicator */}
				{rewards.length > 1 && (
					<div
						style={{
							marginTop: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							fontSize: "12px",
							opacity: 0.8,
						}}
					>
						<span>
							{currentRewardIndex + 1} of {rewards.length} rewards
						</span>
						<div style={{ display: "flex", gap: "4px" }}>
							{rewards.map((_, index) => (
								<div
									key={index}
									style={{
										width: "6px",
										height: "6px",
										borderRadius: "50%",
										background:
											index === currentRewardIndex
												? rarityColor
												: "rgba(255,255,255,0.3)",
										transition: "background 0.3s ease",
									}}
								/>
							))}
						</div>
					</div>
				)}

				{/* Effects list */}
				{currentReward.effects && currentReward.effects.length > 0 && (
					<div
						style={{
							marginTop: "8px",
							fontSize: "11px",
							opacity: 0.7,
							fontStyle: "italic",
						}}
					>
						<span style={{ color: rarityColor }}>✨</span>{" "}
						{currentReward.effects.join(", ")}
					</div>
				)}
			</div>

			{/* Floating particles effect */}
			{animationStage === "showing" && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: "none",
					}}
				>
					{[...Array(6)].map((_, i) => (
						<div
							key={i}
							style={{
								position: "absolute",
								top: `${20 + Math.random() * 60}%`,
								left: `${10 + Math.random() * 80}%`,
								width: "4px",
								height: "4px",
								background: rarityColor,
								borderRadius: "50%",
								animation: `float 2s ease-in-out infinite ${
									i * 0.3
								}s`,
								opacity: 0.6,
							}}
						/>
					))}
				</div>
			)}

			{/* Animated border glow */}
			<div
				style={{
					position: "absolute",
					top: "-2px",
					left: "-2px",
					right: "-2px",
					bottom: "-2px",
					background: `linear-gradient(45deg, ${rarityColor}, transparent, ${rarityColor})`,
					borderRadius: "14px",
					zIndex: -1,
					opacity: animationStage === "showing" ? 0.6 : 0,
					transition: "opacity 0.5s ease",
				}}
			/>
		</div>
	);
};

// Add CSS animations to the document if not already added
if (
	typeof document !== "undefined" &&
	!document.querySelector("#reward-notification-styles")
) {
	const style = document.createElement("style");
	style.id = "reward-notification-styles";
	style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    
    @keyframes float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      50% {
        transform: translateY(-20px) rotate(180deg);
        opacity: 0.8;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translateY(-40px) rotate(360deg);
        opacity: 0;
      }
    }
  `;
	document.head.appendChild(style);
}

export default RewardNotification;
