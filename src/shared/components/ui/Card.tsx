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
      onClick={onClick}
    >
      {children}
    </div>
  );
}; 