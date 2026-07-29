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
  /** Clay theme — analytic donut ring with matte claymorphism */
  clayUi?: boolean;
}

// Timer mode presets
const TIMER_MODES = {
  classic: { work: 25 * 60, break: 5 * 60 },
  extended: { work: 45 * 60, break: 10 * 60 },
  short: { work: 15 * 60, break: 5 * 60 },
};

type ModeKey = keyof typeof TIMER_MODES;

const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R; // 339.292…
/** Clay: roomy viewBox so thick stroke + soft shadow never clip */
const CLAY_VB = 140;
const CLAY_C = CLAY_VB / 2; // 70
const CLAY_R = 50;
const CLAY_STROKE = 14;
const CLAY_CIRC = 2 * Math.PI * CLAY_R;

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  duration,
  onComplete,
  onStart,
  onAbort,
  mode = 'custom',
  autoStart = false,
  clayUi = false,
}) => {
  const claySvgIdRef = useRef(`clayRing-${Math.random().toString(36).slice(2, 9)}`);
  const clayGradId = `clayAnalyticRing-${claySvgIdRef.current}`;
  const clayBreakGradId = `clayAnalyticBreak-${claySvgIdRef.current}`;
  const clayDepthId = `clayRingDepth-${claySvgIdRef.current}`;

  const ringR = clayUi ? CLAY_R : RING_R;
  const ringCirc = clayUi ? CLAY_CIRC : RING_CIRC;
  const ringStroke = clayUi ? CLAY_STROKE : 8;
  const ringCx = clayUi ? CLAY_C : 60;
  const ringCy = clayUi ? CLAY_C : 60;

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
    return (1 - secondsLeft / totalDuration) * ringCirc;
  };

  const dashOffset = progress();

  return (
    <div
      className={`${styles.timerCard} ${clayUi ? styles.timerCardClay : ''}`}
      data-phase={isBreak ? "break" : "work"}
    >
      {/* Phase Title */}
      <div className={styles.timerTitle}>
        {isBreak ? "🌿 Break Time" : "⚡ Work Time"}
      </div>

      {/* Timer Circle Progress */}
      <div className={`${styles.circleWrapper} ${clayUi ? styles.circleWrapperClay : ''}`}>
        <svg
          className={styles.progressRing}
          viewBox={clayUi ? `0 0 ${CLAY_VB} ${CLAY_VB}` : "0 0 120 120"}
          overflow="visible"
        >
          {clayUi && (
            <defs>
              {/*
                Analytic palette: cyan → blue → purple → magenta → orange.
                Defined top→bottom in SVG space because .progressRing is CSS-rotated -90deg,
                which maps that axis to left→right on screen (matching the reference donut).
              */}
              <linearGradient
                id={clayGradId}
                gradientUnits="userSpaceOnUse"
                x1={ringCx}
                y1={ringCy - ringR}
                x2={ringCx}
                y2={ringCy + ringR}
              >
                <stop offset="0%" stopColor="#00D4FF" />
                <stop offset="22%" stopColor="#3B82F6" />
                <stop offset="48%" stopColor="#8B5CF6" />
                <stop offset="72%" stopColor="#D946EF" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
              <linearGradient
                id={clayBreakGradId}
                gradientUnits="userSpaceOnUse"
                x1={ringCx}
                y1={ringCy - ringR}
                x2={ringCx}
                y2={ringCy + ringR}
              >
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="55%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter
                id={clayDepthId}
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="2.2"
                  floodColor="rgba(59, 130, 246, 0.22)"
                />
                <feDropShadow
                  dx="0"
                  dy="1"
                  stdDeviation="1"
                  floodColor="rgba(139, 92, 246, 0.18)"
                />
              </filter>
            </defs>
          )}
          {/* Soft recess under the track */}
          {clayUi && (
            <circle
              stroke="rgba(46, 42, 63, 0.08)"
              strokeWidth={ringStroke + 6}
              fill="transparent"
              r={ringR}
              cx={ringCx}
              cy={ringCy}
            />
          )}
          <circle
            className={styles.ringBackground}
            stroke={clayUi ? "#C5C2CE" : "#e0e0e0"}
            strokeWidth={ringStroke}
            fill="transparent"
            r={ringR}
            cx={ringCx}
            cy={ringCy}
            strokeLinecap={clayUi ? "round" : undefined}
          />
          {clayUi && (
            <circle
              className={styles.ringProgressDepth}
              stroke="rgba(46, 42, 63, 0.16)"
              strokeWidth={ringStroke}
              fill="transparent"
              r={ringR}
              cx={ringCx + 0.9}
              cy={ringCy + 1.2}
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={dashOffset}
            />
          )}
          <circle
            className={styles.ringProgress}
            stroke={
              clayUi
                ? isBreak
                  ? `url(#${clayBreakGradId})`
                  : `url(#${clayGradId})`
                : isBreak
                  ? "#81C784"
                  : "#4fc3f7"
            }
            strokeWidth={ringStroke}
            fill="transparent"
            r={ringR}
            cx={ringCx}
            cy={ringCy}
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            strokeDashoffset={dashOffset}
            filter={clayUi ? `url(#${clayDepthId})` : undefined}
          />
        </svg>
        <div className={`${styles.timerOverlay} ${clayUi ? styles.timerOverlayClay : ''}`}>
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
