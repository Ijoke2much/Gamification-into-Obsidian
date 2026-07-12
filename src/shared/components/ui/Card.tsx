import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  onClick,
}) => {
  return (
    <div
      className={`obs-card bg-base-200 border border-base-300 rounded-lg shadow-sm p-4 min-w-0 w-full ${className}`}
      style={{
        background: "var(--go-card-soft, var(--background-secondary, transparent))",
        borderColor: "var(--go-border, var(--background-modifier-border, currentColor))",
        borderRadius: "var(--go-radius, 0.5rem)",
        boxShadow: "var(--go-shadow-soft, 0 1px 2px rgba(0, 0, 0, 0.08))",
        color: "var(--go-text, inherit)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}; 