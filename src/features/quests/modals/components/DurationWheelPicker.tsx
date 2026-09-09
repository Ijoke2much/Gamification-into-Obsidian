import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import styles from "../QuestModal.module.css";

const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;
const PAD_ITEMS = (VISIBLE_COUNT - 1) / 2;
const MAX_HOURS = 12;

function parseTotalMinutes(value: string): number {
    if (!value) return 0;
    const str = String(value).trim().toLowerCase();
    const combo = str.match(/^(\d+)\s*h\s*(\d+)?\s*m?$/i);
    if (combo) {
        const h = parseInt(combo[1], 10);
        const m = combo[2] ? parseInt(combo[2], 10) : 0;
        return h * 60 + m;
    }
    const single = str.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/i);
    if (single) {
        const val = parseInt(single[1], 10);
        const unit = (single[2] || "m").toLowerCase();
        return unit.startsWith("h") ? val * 60 : val;
    }
    const digits = str.replace(/[^0-9]/g, "");
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : 0;
}

function formatDurationPreview(totalMinutes: number): string {
    if (totalMinutes <= 0) return "No estimate";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
    if (minutes > 0) parts.push(`${minutes} min`);
    return parts.join(" ");
}

interface WheelColumnProps {
    values: number[];
    selected: number;
    onChange: (value: number) => void;
    ariaLabel: string;
    formatLabel: (value: number) => string;
    unit: string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
    values,
    selected,
    onChange,
    ariaLabel,
    formatLabel,
    unit,
}) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number | null>(null);
    const skipScrollHandler = useRef(false);
    const selectedFromScroll = useRef(false);

    const suppressCommitRef = useRef(true);

    const scrollToValue = useCallback((value: number, behavior: ScrollBehavior = "auto") => {
        const el = scrollerRef.current;
        if (!el) return;
        const idx = Math.max(0, values.indexOf(value));
        const top = idx * ITEM_HEIGHT;
        if (Math.abs(el.scrollTop - top) <= 1) return;
        skipScrollHandler.current = true;
        el.scrollTo({ top, behavior });
        requestAnimationFrame(() => {
            skipScrollHandler.current = false;
        });
    }, [values]);

    useLayoutEffect(() => {
        suppressCommitRef.current = true;
        if (selectedFromScroll.current) {
            selectedFromScroll.current = false;
            suppressCommitRef.current = false;
            return;
        }
        scrollToValue(selected, "auto");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                suppressCommitRef.current = false;
            });
        });
    }, [selected, scrollToValue]);

    const commitFromScroll = useCallback(() => {
        const el = scrollerRef.current;
        if (!el || skipScrollHandler.current || suppressCommitRef.current) return;
        const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(values.length - 1, idx));
        const next = values[clamped];
        if (next !== selected) {
            selectedFromScroll.current = true;
            onChange(next);
        }
    }, [onChange, selected, values]);

    const handleScroll = () => {
        if (skipScrollHandler.current) return;
        if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(commitFromScroll);
    };

    useEffect(() => {
        return () => {
            if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const idx = Math.max(0, values.indexOf(selected));
        if (event.key === "ArrowUp" && idx > 0) {
            event.preventDefault();
            onChange(values[idx - 1]);
        } else if (event.key === "ArrowDown" && idx < values.length - 1) {
            event.preventDefault();
            onChange(values[idx + 1]);
        } else if (event.key === "Home") {
            event.preventDefault();
            onChange(values[0]);
        } else if (event.key === "End") {
            event.preventDefault();
            onChange(values[values.length - 1]);
        }
    };

    return (
        <div className={styles.durationWheelColumn}>
            <div
                ref={scrollerRef}
                className={styles.durationWheelScroller}
                role="listbox"
                aria-label={ariaLabel}
                tabIndex={0}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                style={{
                    height: ITEM_HEIGHT * VISIBLE_COUNT,
                    paddingTop: ITEM_HEIGHT * PAD_ITEMS,
                    paddingBottom: ITEM_HEIGHT * PAD_ITEMS,
                }}
            >
                {values.map((value) => (
                    <div
                        key={value}
                        role="option"
                        aria-selected={value === selected}
                        className={`${styles.durationWheelItem} ${value === selected ? styles.durationWheelItemSelected : ""}`}
                        style={{ height: ITEM_HEIGHT }}
                        onClick={() => onChange(value)}
                    >
                        {formatLabel(value)}
                    </div>
                ))}
            </div>
            <span className={styles.durationWheelUnit} aria-hidden="true">{unit}</span>
        </div>
    );
};

interface DurationWheelPickerProps {
    value: string;
    onChange: (minutes: string) => void;
}

export const DurationWheelPicker: React.FC<DurationWheelPickerProps> = ({
    value,
    onChange,
}) => {
    const totalMinutes = Math.min(MAX_HOURS * 60 + 59, parseTotalMinutes(value));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const hourValues = useMemo(
        () => Array.from({ length: MAX_HOURS + 1 }, (_, i) => i),
        []
    );
    const minuteValues = useMemo(
        () => Array.from({ length: 60 }, (_, i) => i),
        []
    );

    const emit = (nextHours: number, nextMinutes: number) => {
        const total = nextHours * 60 + nextMinutes;
        onChange(total > 0 ? String(total) : "");
    };

    return (
        <div className={styles.durationWheelPicker}>
            <div
                className={styles.durationWheelFrame}
                aria-label="Estimated duration"
                style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
            >
                <div className={styles.durationWheelTrack}>
                    <div className={styles.durationWheelHighlight} aria-hidden="true" />
                    <WheelColumn
                        values={hourValues}
                        selected={hours}
                        onChange={(nextHours) => emit(nextHours, minutes)}
                        ariaLabel="Hours"
                        formatLabel={(h) => String(h)}
                        unit={hours === 1 ? "hour" : "hours"}
                    />
                    <WheelColumn
                        values={minuteValues}
                        selected={minutes}
                        onChange={(nextMinutes) => emit(hours, nextMinutes)}
                        ariaLabel="Minutes"
                        formatLabel={(m) => String(m).padStart(2, "0")}
                        unit="min"
                    />
                </div>
                <div className={styles.durationWheelFadeTop} aria-hidden="true" />
                <div className={styles.durationWheelFadeBottom} aria-hidden="true" />
            </div>
            <div className={styles.durationWheelFooter}>
                <span className={styles.durationWheelPreview}>
                    {formatDurationPreview(totalMinutes)}
                </span>
                {totalMinutes > 0 && (
                    <button
                        type="button"
                        className={styles.durationWheelClear}
                        onClick={() => onChange("")}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
};
