import React from "react";

interface ProgressBarProps {
	progress: number; // 0 to 100
	label?: string; // Optional custom label
	height?: number; // Optional height in px
	labelPosition?: "center" | "below";
	variant?: "green" | "purple";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
	progress,
	label,
	height = 20,
	labelPosition = "center",
	variant = "green",
}) => {
	const percentage = Math.max(progress, 2); // Ensure minimum width for visibility

	const colors =
		variant === "purple"
			? {
					border: "#a78bfa", // violet-400
					from: "#a78bfa",
					to: "#ec4899", // pink-500
					glow: "#a78bfa",
			  }
			: {
					border: "#4ade80",
					from: "#4ade80",
					to: "#22d3ee",
					glow: "#4ade80",
			  };

	const bar = (
		<div
			style={{
				width: "100%",
				background: "#333",
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
					width: `${percentage}%`,
					background:
						`linear-gradient(90deg, ${colors.from} 0%, ${colors.to} 100%)`,
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
						color: "white",
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
						color: "white",
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
