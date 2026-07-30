import React from "react";
import styles from "./ProgressBar.module.css";

export type ProgressBarVariant = "green" | "purple" | "orange" | "teal";

interface ProgressBarProps {
	progress: number; // 0 to 100
	label?: string; // Optional custom label
	height?: number; // Optional height in px
	labelPosition?: "center" | "below";
	variant?: ProgressBarVariant;
	/** Square segments / pixel frame (Player tab) — clay = molded progress */
	appearance?: "smooth" | "pixel" | "clay";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
	progress,
	label,
	height = 20,
	labelPosition = "center",
	variant = "green",
	appearance = "smooth",
}) => {
	const pct = Math.max(0, Math.min(100, Number(progress) || 0));
	const percentage = Math.max(pct, 0);

	const colors =
		variant === "purple"
			? {
					border: "var(--go-progress-fill, #a78bfa)",
					from: "var(--go-progress-fill, #a78bfa)",
					to: "var(--go-progress-fill-strong, #ec4899)",
					glow: "var(--go-progress-glow, rgba(167, 139, 250, 0.45))",
			  }
			: variant === "orange"
				? {
						border: "#FFB84C",
						from: "#FFD36A",
						to: "#FF9738",
						glow: "rgba(255, 170, 70, 0.25)",
				  }
				: variant === "teal"
					? {
							border: "#4FCFC6",
							from: "#72E5DB",
							to: "#2FAFA7",
							glow: "rgba(79, 207, 198, 0.25)",
					  }
					: {
							border: "var(--go-progress-fill, #4ade80)",
							from: "var(--go-progress-fill, #4ade80)",
							to: "var(--go-progress-fill-strong, #22d3ee)",
							glow: "var(--go-progress-glow, rgba(74, 222, 128, 0.35))",
					  };

	if (appearance === "clay") {
		const clayHeight = Math.min(Math.max(height, 12), 16);
		const fillWidth = pct <= 0 ? 0 : Math.max(pct, 8);
		const fillClass =
			variant === "purple"
				? styles.clayFillPurple
				: variant === "orange"
					? styles.clayFillOrange
					: variant === "teal"
						? styles.clayFillTeal
						: styles.clayFillGreen;

		const bar = (
			<div
				className={styles.clayTrack}
				style={{ "--pb-height": `${clayHeight}px` } as React.CSSProperties}
			>
				{fillWidth > 0 && (
					<div
						className={`${styles.clayFill} ${fillClass}`}
						style={{ width: `${fillWidth}%` }}
					/>
				)}
				{labelPosition === "center" && (
					<div className={styles.clayLabelCenter}>
						{label ? label : `${Math.round(pct)}%`}
					</div>
				)}
			</div>
		);

		if (labelPosition === "below") {
			return (
				<div className={styles.clayWrap}>
					<div className={styles.clayLabelAbove}>
						{label ? label : `${Math.round(pct)}%`}
					</div>
					{bar}
				</div>
			);
		}

		return <div className={styles.clayWrap}>{bar}</div>;
	}

	if (appearance === "pixel") {
		const bar = (
			<div
				className={styles.pixelTrack}
				style={
					{
						"--pb-height": `${height}px`,
						borderColor: colors.border,
					} as React.CSSProperties
				}
			>
				<div
					className={styles.pixelFill}
					style={{
						width: `${percentage}%`,
						background: `linear-gradient(180deg, ${colors.from} 0%, ${colors.to} 100%)`,
						boxShadow: `inset 0 2px 0 rgba(255,255,255,0.2)`,
					}}
				/>
				{labelPosition === "center" && (
					<div className={styles.pixelLabel}>
						{label ? label : `${Math.round(pct)}%`}
					</div>
				)}
			</div>
		);

		if (labelPosition === "below") {
			return (
				<div style={{ width: "100%" }}>
					{bar}
					<div className={styles.pixelLabelBelow}>
						{label ? label : `${Math.round(pct)}%`}
					</div>
				</div>
			);
		}
		return bar;
	}

	const smoothPct = Math.max(pct, pct > 0 ? 2 : 0);
	const bar = (
		<div
			style={{
				width: "100%",
				background: "var(--go-progress-track, #333)",
				borderRadius: "8px",
				height: `${height}px`,
				position: "relative",
				marginTop: "8px",
				overflow: "hidden",
				boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
				border: `2px solid ${colors.border}`,
				minHeight: "20px",
			}}
		>
			<div
				style={{
					width: `${smoothPct}%`,
					background: `linear-gradient(90deg, ${colors.from} 0%, ${colors.to} 100%)`,
					height: "100%",
					borderRadius: "6px",
					boxShadow: `0 0 8px ${colors.glow}`,
					transition: "width 0.3s ease",
				}}
			/>
			{labelPosition === "center" && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "var(--go-exp-text, white)",
						fontWeight: "bold",
						fontSize: "0.85rem",
						textShadow: "0 0 2px black",
						userSelect: "none",
					}}
				>
					{label ? label : `${progress}%`}
				</div>
			)}
		</div>
	);

	if (labelPosition === "below") {
		return (
			<div style={{ width: "100%" }}>
				{bar}
				<div
					style={{
						marginTop: 6,
						textAlign: "center",
						color: "var(--go-exp-text, white)",
						fontWeight: 700,
						fontSize: "0.9rem",
						textShadow: "0 0 2px black",
						userSelect: "none",
					}}
				>
					{label ? label : `${progress}%`}
				</div>
			</div>
		);
	}

	return bar;
};
