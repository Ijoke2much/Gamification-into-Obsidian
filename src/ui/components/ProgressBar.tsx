import React from "react";

interface ProgressBarProps {
	progress: number; // 0 to 100
	label?: string; // Optional custom label
	height?: number; // Optional height in px
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
	progress,
	label,
	height = 20,
}) => {
	const percentage = Math.max(progress, 2); // Ensure minimum width for visibility
	return (
		<div
			style={{
				width: "300px",
				background: "#333",
				borderRadius: "8px",
				height: `${height}px`,
				position: "relative",
				marginTop: "8px",
				overflow: "hidden",
				boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
				border: "2px solid #4ade80",
			}}
		>
			<div
				style={{
					width: `${percentage}%`,
					background:
						"linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)", // green to blue
					height: "400%",
					borderRadius: "8px",
					boxShadow: "0 0 8px #4ade80",
					transition: "width 0.3s ease",
				}}
			/>
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
		</div>
	);
};
