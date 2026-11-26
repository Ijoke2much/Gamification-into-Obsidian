import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { minutesToClock } from "../../../features/quests/utils/questDateRange";
import styles from "./PlaceOnDayPlanSheet.module.css";

const TIME_CHIPS = [
	{ label: "9 AM", value: "09:00" },
	{ label: "12 PM", value: "12:00" },
	{ label: "2 PM", value: "14:00" },
	{ label: "5 PM", value: "17:00" },
	{ label: "8 PM", value: "20:00" },
] as const;

interface PlaceOnDayPlanSheetProps {
	open: boolean;
	questTitle: string;
	dateLabel: string;
	suggestedMinutes: number;
	durationHint?: string;
	clay?: boolean;
	onCancel: () => void;
	onConfirm: (minutesFromMidnight: number) => void;
}

export const PlaceOnDayPlanSheet: React.FC<PlaceOnDayPlanSheetProps> = ({
	open,
	questTitle,
	dateLabel,
	suggestedMinutes,
	durationHint,
	clay = true,
	onCancel,
	onConfirm,
}) => {
	const [time, setTime] = useState(() => minutesToClock(suggestedMinutes));

	useEffect(() => {
		if (open) setTime(minutesToClock(suggestedMinutes));
	}, [open, suggestedMinutes]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onCancel]);

	if (!open) return null;

	const confirm = () => {
		const parts = time.split(":").map((n) => Number(n));
		const hours = Number.isFinite(parts[0]) ? parts[0] : 9;
		const mins = Number.isFinite(parts[1]) ? parts[1] : 0;
		onConfirm(hours * 60 + mins);
	};

	return createPortal(
		<div
			className={styles.overlay}
			role="presentation"
			data-clay-shell={clay ? "place-time" : undefined}
			data-pixel-shell={clay ? undefined : "place-time"}
			onClick={onCancel}
		>
			<div
				className={styles.panel}
				role="dialog"
				aria-modal="true"
				aria-labelledby="place-on-day-plan-title"
				onClick={(e) => e.stopPropagation()}
			>
				<p className={styles.eyebrow}>Place on day plan</p>
				<h2 id="place-on-day-plan-title" className={styles.title}>
					{questTitle}
				</h2>
				<p className={styles.date}>{dateLabel}</p>
				<label className={styles.label} htmlFor="place-on-day-plan-time">
					Start time
				</label>
				<input
					id="place-on-day-plan-time"
					type="time"
					step={60}
					value={time}
					onChange={(e) => setTime((e.target.value || "09:00").slice(0, 5))}
					className={styles.timeInput}
					autoFocus
				/>
				<div className={styles.chips}>
					{TIME_CHIPS.map((slot) => (
						<button
							key={slot.value}
							type="button"
							className={`${styles.chip}${time === slot.value ? ` ${styles.chipActive}` : ""}`}
							onClick={() => setTime(slot.value)}
						>
							{slot.label}
						</button>
					))}
				</div>
				{durationHint ? <p className={styles.hint}>About {durationHint} on the plan</p> : null}
				<div className={styles.actions}>
					<button type="button" className={styles.cancel} onClick={onCancel}>
						Cancel
					</button>
					<button type="button" className={styles.confirm} onClick={confirm}>
						Place
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};
