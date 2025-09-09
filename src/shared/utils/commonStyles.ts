import React from "react";

// Common gradient backgrounds
export const GRADIENTS = {
    primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    secondary: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
    danger: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)",
    success: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    warning: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    card: "rgba(255, 255, 255, 0.05)",
    cardHover: "rgba(255, 255, 255, 0.1)",
} as const;

// Common border styles
export const BORDERS = {
    default: "1px solid rgba(255, 255, 255, 0.1)",
    input: "1px solid rgba(255, 255, 255, 0.2)",
    focus: "2px solid rgba(102, 126, 234, 0.5)",
    error: "1px solid var(--text-error)",
} as const;

// Common shadow styles
export const SHADOWS = {
    card: "0 4px 12px rgba(0, 0, 0, 0.3)",
    modal: "0 8px 32px rgba(0, 0, 0, 0.5)",
    button: "0 2px 8px rgba(0, 0, 0, 0.2)",
    glow: "0 0 15px rgba(102, 126, 234, 0.4)",
} as const;

// Common spacing values
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

// Common border radius values
export const RADIUS = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: "50%",
} as const;

// Typography styles
export const TYPOGRAPHY = {
    heading1: {
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1.2,
        color: "#ffffff",
    },
    heading2: {
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.3,
        color: "#ffffff",
    },
    heading3: {
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.4,
        color: "#ffffff",
    },
    body: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.5,
        color: "var(--text-normal)",
    },
    caption: {
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 1.4,
        color: "var(--text-muted)",
    },
    label: {
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-normal)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
    },
} as const;

// Common layout styles
export const LAYOUTS = {
    flexCenter: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    flexBetween: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    flexColumn: {
        display: "flex",
        flexDirection: "column" as const,
    },
    grid2: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: SPACING.md,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: SPACING.md,
    },
} as const;

// Component-specific style generators
export const createCardStyle = (variant: "default" | "hover" | "selected" = "default") => ({
    background: variant === "selected" ? GRADIENTS.cardHover : GRADIENTS.card,
    border: BORDERS.default,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    transition: "all 0.2s ease",
    ...(variant === "hover" && {
        cursor: "pointer",
        "&:hover": {
            background: GRADIENTS.cardHover,
            transform: "translateY(-2px)",
            boxShadow: SHADOWS.card,
        },
    }),
});

export const createButtonStyle = (
    variant: "primary" | "secondary" | "danger" = "primary",
    size: "sm" | "md" | "lg" = "md"
) => {
    const baseStyle = {
        border: "none",
        borderRadius: RADIUS.md,
        cursor: "pointer",
        fontWeight: 600,
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: SPACING.sm,
    };

    const sizeStyles = {
        sm: { padding: `${SPACING.sm}px ${SPACING.md}px`, fontSize: 12 },
        md: { padding: `${SPACING.md}px ${SPACING.lg}px`, fontSize: 14 },
        lg: { padding: `${SPACING.lg}px ${SPACING.xl}px`, fontSize: 16 },
    };

    const variantStyles = {
        primary: {
            background: GRADIENTS.primary,
            color: "#ffffff",
            boxShadow: SHADOWS.button,
        },
        secondary: {
            background: GRADIENTS.card,
            color: "#ffffff",
            border: BORDERS.input,
        },
        danger: {
            background: GRADIENTS.danger,
            color: "#ffffff",
            boxShadow: SHADOWS.button,
        },
    };

    return {
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
    };
};

export const createInputStyle = (hasError = false) => ({
    width: "100%",
    padding: `${SPACING.md}px`,
    borderRadius: RADIUS.md,
    border: hasError ? BORDERS.error : BORDERS.input,
    background: "rgba(0, 0, 0, 0.4)",
    color: "#ffffff",
    fontSize: 14,
    transition: "all 0.2s ease",
    "&:focus": {
        outline: "none",
        border: BORDERS.focus,
        boxShadow: SHADOWS.glow,
    },
});

// Priority and difficulty color schemes
export const PRIORITY_COLORS = {
    low: { color: "#4caf50", bg: "rgba(76, 175, 80, 0.1)" },
    medium: { color: "#ff9800", bg: "rgba(255, 152, 0, 0.1)" },
    high: { color: "#f44336", bg: "rgba(244, 67, 54, 0.1)" },
} as const;

export const DIFFICULTY_COLORS = {
    easy: { color: "#4caf50", bg: "rgba(76, 175, 80, 0.1)" },
    medium: { color: "#ff9800", bg: "rgba(255, 152, 0, 0.1)" },
    hard: { color: "#f44336", bg: "rgba(244, 67, 54, 0.1)" },
} as const;

// Utility function to merge styles
export const mergeStyles = (...styles: Array<React.CSSProperties | undefined>): React.CSSProperties => {
    return Object.assign({}, ...styles.filter(Boolean));
};

// Animation keyframes (for use with CSS-in-JS)
export const ANIMATIONS = {
    fadeIn: {
        from: { opacity: 0 },
        to: { opacity: 1 },
    },
    slideUp: {
        from: { transform: "translateY(20px)", opacity: 0 },
        to: { transform: "translateY(0)", opacity: 1 },
    },
    pulse: {
        "0%": { transform: "scale(1)" },
        "50%": { transform: "scale(1.05)" },
        "100%": { transform: "scale(1)" },
    },
    glow: {
        "0%": { boxShadow: "0 0 5px rgba(102, 126, 234, 0.2)" },
        "50%": { boxShadow: "0 0 20px rgba(102, 126, 234, 0.6)" },
        "100%": { boxShadow: "0 0 5px rgba(102, 126, 234, 0.2)" },
    },
} as const; 