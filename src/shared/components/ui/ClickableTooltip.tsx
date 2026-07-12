import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ClickableTooltipProps {
	icon: React.ReactNode;
	label: React.ReactNode;
	tooltipContent: React.ReactNode;
}

export const ClickableTooltip: React.FC<ClickableTooltipProps> = ({
	icon,
	label,
	tooltipContent,
}) => {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLSpanElement>(null);
	const popRef = useRef<HTMLDivElement>(null);
	const [coords, setCoords] = useState({ top: 0, left: 0 });

	useLayoutEffect(() => {
		if (!open) return;
		const run = () => {
			const el = triggerRef.current;
			const pop = popRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			const pad = 8;
			let top = r.bottom + 6;
			let left = r.left;
			if (pop) {
				const pw = pop.offsetWidth;
				const ph = pop.offsetHeight;
				if (left + pw > window.innerWidth - pad) {
					left = Math.max(pad, window.innerWidth - pad - pw);
				}
				if (left < pad) left = pad;
				if (top + ph > window.innerHeight - pad) {
					top = Math.max(pad, r.top - ph - 6);
				}
				if (top < pad) top = pad;
			}
			setCoords({ top, left });
		};
		run();
		const id = requestAnimationFrame(run);
		return () => cancelAnimationFrame(id);
	}, [open, tooltipContent]);

	useEffect(() => {
		if (!open) return;
		const onScrollOrResize = () => {
			const el = triggerRef.current;
			const pop = popRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			const pad = 8;
			let top = r.bottom + 6;
			let left = r.left;
			if (pop) {
				const pw = pop.offsetWidth;
				const ph = pop.offsetHeight;
				if (left + pw > window.innerWidth - pad) {
					left = Math.max(pad, window.innerWidth - pad - pw);
				}
				if (left < pad) left = pad;
				if (top + ph > window.innerHeight - pad) {
					top = Math.max(pad, r.top - ph - 6);
				}
				if (top < pad) top = pad;
			}
			setCoords({ top, left });
		};
		window.addEventListener("scroll", onScrollOrResize, true);
		window.addEventListener("resize", onScrollOrResize);
		return () => {
			window.removeEventListener("scroll", onScrollOrResize, true);
			window.removeEventListener("resize", onScrollOrResize);
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			const t = e.target as Node;
			if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
			setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [open]);

	const popover =
		open &&
		createPortal(
			<div
				ref={popRef}
				role="tooltip"
				style={{
					position: "fixed",
					top: coords.top,
					left: coords.left,
					zIndex: 100_000,
					background: "var(--go-panel, #222)",
					color: "var(--go-text, #fff)",
					padding: "10px 12px",
					borderRadius: "var(--go-radius, 4px)",
					minWidth: 120,
					maxWidth: "min(280px, calc(100vw - 16px))",
					boxShadow: "var(--go-shadow-soft, 0 4px 12px rgba(0,0,0,0.35))",
					border: "1px solid var(--go-border, #444)",
					fontSize: 12,
					lineHeight: 1.45,
					whiteSpace: "normal",
					wordBreak: "break-word",
					pointerEvents: "auto",
				}}
			>
				{tooltipContent}
			</div>,
			document.body
		);

	return (
		<div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
			<span
				ref={triggerRef}
				onClick={() => setOpen((v) => !v)}
				style={{
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: 4,
					maxWidth: "100%",
				}}
			>
				{icon}
				<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
			</span>
			{popover}
		</div>
	);
};
