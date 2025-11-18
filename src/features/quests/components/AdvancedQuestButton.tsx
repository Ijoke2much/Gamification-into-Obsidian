// Advanced Quest Button Component
// Simple button to access the advanced quest dashboard

import React from 'react';

interface AdvancedQuestButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const AdvancedQuestButton: React.FC<AdvancedQuestButtonProps> = ({
  onClick,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`advanced-quest-button ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#4a9eff',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#3a8eef';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#4a9eff';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
    >
      <span style={{ fontSize: '16px' }}>🎯</span>
      <span>Advanced Dashboard</span>
    </button>
  );
};
