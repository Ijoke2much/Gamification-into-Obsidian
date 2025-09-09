import React, { useState } from 'react';

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
  
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setOpen((v) => !v)}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {icon}
        <span>{label}</span>
      </span>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            left: "0",
            background: "#222",
            color: "#fff",
            padding: "8px",
            borderRadius: "4px",
            zIndex: 100,
            minWidth: "120px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
}; 