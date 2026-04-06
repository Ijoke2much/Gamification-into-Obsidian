/**
 * Pomodoro Timer component with mode switcher and work/break cycle.
 *
 * Modes:
 * - classic: 25/5
 * - extended: 45/10
 * - short: 15/5
 *
 * Props:
 * - duration (unused in favor of mode-based durations)
 * - onComplete: called after each session (work or break)
 * - onStart: optional callback when timer starts
 * - onAbort: optional callback when timer resets/aborts
 */

import React, { useEffect, useState, useRef } from "react";
import styles from "./PomodoroTimer.module.css";
import { showGameNotice } from "../../../shared/utils/noticeUtils";

interface PomodoroTimerProps {
  duration: number;
  onComplete: () => void;
  onStart?: () => void;
  onAbort?: () => void;
  attachedQuest?: Request;
  onSubtaskClick?: (index: number) => void;
  mode?: 'classic' | 'extended' | 'short' | 'custom' | 'deepWork' | 'quickFocus';
  autoStart?: boolean;
}

// Timer mode presets
const TIMER_MODES = {
  classic: { work: 25 * 60, break: 5 * 60 },
  extended: { work: 45 * 60, break: 10 * 60 },
  short: { work: 15 * 60, break: 5 * 60 },
};

type ModeKey = keyof typeof TIMER_MODES;

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  duration,
  onComplete,
  onStart,
  onAbort,
  mode = 'custom',
  autoStart = false,
}) => {
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStarted = useRef(false);
  const endTimeRef = useRef<number | null>(null);
  const lastMilestoneMinutesRef = useRef<number>(0);
  const secondsLeftRef = useRef(secondsLeft);
  secondsLeftRef.current = secondsLeft;

  // Update timer when duration, mode, or phase (work/break) changes
  useEffect(() => {
    if (mode !== 'custom' && TIMER_MODES[mode as ModeKey]) {
      const modeDuration = isBreak
        ? TIMER_MODES[mode as ModeKey].break
        : TIMER_MODES[mode as ModeKey].work;
      setSecondsLeft(modeDuration);
    } else {
      // For custom mode, use the provided duration for work, and 5 minutes for break
      const customBreakDuration = 5 * 60; // 5 minutes break for custom timers
      setSecondsLeft(isBreak ? customBreakDuration : duration);
    }
    setIsRunning(false);
    endTimeRef.current = null;
    lastMilestoneMinutesRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    hasAutoStarted.current = false; // Reset auto-start flag when duration changes
  }, [duration, mode, isBreak]);

  // Auto-start timer if autoStart prop is true
  useEffect(() => {
    if (autoStart && !isRunning && !hasAutoStarted.current && !isBreak) {
      window.console.log('🎬 Auto-starting timer...');
      hasAutoStarted.current = true;
      setIsRunning(true);
    }
  }, [autoStart, isRunning, isBreak]);

  // Timer logic - time-based to avoid drift from setInterval inaccuracy
  useEffect(() => {
    if (isRunning) {
      onStart?.();

      // Store end timestamp so remaining time is computed from real elapsed time
      const initialSeconds = secondsLeftRef.current;
      endTimeRef.current = Date.now() + initialSeconds * 1000;
      lastMilestoneMinutesRef.current = 0;

      intervalRef.current = setInterval(() => {
        const endTime = endTimeRef.current;
        if (!endTime) return;

        const remaining = Math.ceil((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          endTimeRef.current = null;
          setIsRunning(false);
          onComplete();
          setIsBreak((prev) => !prev);
          setSecondsLeft(0);
          return;
        }

        // Every 10 mins: show notice "10 mins - X mins left"
        const elapsedSeconds = initialSeconds - remaining;
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        const milestoneMinutes = Math.floor(elapsedMinutes / 10) * 10;
        if (milestoneMinutes > 0 && milestoneMinutes > lastMilestoneMinutesRef.current) {
          lastMilestoneMinutesRef.current = milestoneMinutes;
          const minsLeft = Math.floor(remaining / 60);
          showGameNotice(
            `⏱️ ${milestoneMinutes} mins elapsed – ${minsLeft} mins left`,
            4000
          );
        }

        setSecondsLeft(remaining);
      }, 100); // 100ms ticks for smooth display; accuracy comes from Date.now()
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      endTimeRef.current = null;
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const reset = () => {
    let resetDuration;
    if (mode !== 'custom' && TIMER_MODES[mode as ModeKey]) {
      resetDuration = isBreak
        ? TIMER_MODES[mode as ModeKey].break
        : TIMER_MODES[mode as ModeKey].work;
    } else {
      const customBreakDuration = 5 * 60;
      resetDuration = isBreak ? customBreakDuration : duration;
    }
    setSecondsLeft(resetDuration);
    setIsRunning(false);
    endTimeRef.current = null;
    lastMilestoneMinutesRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    onAbort?.();
  };

  const pause = () => {
    setIsRunning(false);
    onAbort?.();
  };

  const skip = () => {
    setSecondsLeft(0);
    setIsRunning(false);
    onComplete();
    onAbort?.();
  };

  const progress = () => {
    let totalDuration;
    if (mode !== 'custom' && TIMER_MODES[mode as ModeKey]) {
      totalDuration = isBreak
        ? TIMER_MODES[mode as ModeKey].break
        : TIMER_MODES[mode as ModeKey].work;
    } else {
      const customBreakDuration = 5 * 60;
      totalDuration = isBreak ? customBreakDuration : duration;
    }
    return (1 - secondsLeft / totalDuration) * 339.292;
  };

  return (
    <div className={styles.timerCard}>
      {/* Phase Title */}
      <div className={styles.timerTitle}>
        {isBreak ? "🌿 Break Time" : "⚡ Work Time"}
      </div>

      {/* Timer Circle Progress */}
      <div className={styles.circleWrapper}>
        <svg className={styles.progressRing} viewBox="0 0 120 120">
          <circle
            className={styles.ringBackground}
            stroke="#e0e0e0"
            strokeWidth="8"
            fill="transparent"
            r="54"
            cx="60"
            cy="60"
          />
          <circle
            className={styles.ringProgress}
            stroke={isBreak ? "#81C784" : "#4fc3f7"}
            strokeWidth="8"
            fill="transparent"
            r="54"
            cx="60"
            cy="60"
            strokeDasharray={339.292}
            strokeDashoffset={progress()}
          />
        </svg>
        <div className={styles.timerOverlay}>
          <div className={styles.timeCircle}>{formatTime(secondsLeft)}</div>
        </div>
      </div>

      {/* Timer Controls */}
      <div className={styles.controls}>
        <button onClick={() => setIsRunning(true)} className={styles.btnStart}>
          ▶ Start
        </button>
        <button onClick={pause} className={styles.btnPause}>
          ⏸ Pause
        </button>
        <button onClick={reset} className={styles.btnReset}>
          ⟲ Reset
        </button>
        <button onClick={skip} className={styles.btnSkip}>
          ⏭ Skip
        </button>
      </div>
    </div>
  );
};
