import React from 'react';

// Player Icon
export const PlayerIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <circle cx="10" cy="6" r="4" fill="#8ecae6" />
    <ellipse cx="10" cy="15" rx="7" ry="4" fill="#219ebc" />
  </svg>
);

// Shop Icon
export const ShopIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="3" y="7" width="14" height="8" rx="2" fill="#ffb703" />
    <rect x="6" y="3" width="8" height="4" rx="1" fill="#fb8500" />
  </svg>
);

// Quest Icon
export const QuestIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="2" y="4" width="16" height="12" rx="2" fill="#023047" />
    <rect x="4" y="6" width="12" height="2" fill="#8ecae6" />
    <rect x="4" y="9" width="8" height="2" fill="#8ecae6" />
    <rect x="4" y="12" width="10" height="2" fill="#8ecae6" />
  </svg>
);

// Boss Icon
export const BossIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    {/* Boss head/shield */}
    <rect x="4" y="6" width="12" height="10" rx="2" fill="#8B0000" />
    {/* Boss eyes */}
    <circle cx="7" cy="10" r="1" fill="#FFD700" />
    <circle cx="13" cy="10" r="1" fill="#FFD700" />
    {/* Boss horns/spikes */}
    <polygon points="8,6 10,2 12,6" fill="#4B0082" />
    <polygon points="6,6 8,2 10,6" fill="#4B0082" />
    <polygon points="10,6 12,2 14,6" fill="#4B0082" />
    {/* Boss mouth */}
    <rect x="8" y="12" width="4" height="2" rx="1" fill="#FF4500" />
  </svg>
);

// Stats Icon
export const StatsIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <rect x="2" y="12" width="3" height="6" fill="#219ebc" />
    <rect x="6" y="8" width="3" height="10" fill="#8ecae6" />
    <rect x="10" y="4" width="3" height="14" fill="#023047" />
    <rect x="14" y="10" width="3" height="8" fill="#ffb703" />
  </svg>
);

// Achievements Icon
export const AchievementsIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    <circle cx="10" cy="8" r="6" fill="#ffb703" />
    <polygon points="10,2 11,6 15,6 12,9 13,13 10,11 7,13 8,9 5,6 9,6" fill="#fb8500" />
    <rect x="8" y="14" width="4" height="4" fill="#8ecae6" />
  </svg>
);

// Skill Tree Icon
export const SkillTreeIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle", marginRight: "6px" }}
  >
    {/* Tree trunk */}
    <rect x="9" y="14" width="2" height="4" fill="#8B4513" />
    
    {/* Tree canopy - main circle */}
    <circle cx="10" cy="10" r="6" fill="#228B22" />
    
    {/* Tree branches/nodes */}
    <circle cx="10" cy="10" r="1.5" fill="#32CD32" />
    <circle cx="7" cy="8" r="1" fill="#32CD32" />
    <circle cx="13" cy="8" r="1" fill="#32CD32" />
    <circle cx="6" cy="12" r="1" fill="#32CD32" />
    <circle cx="14" cy="12" r="1" fill="#32CD32" />
    <circle cx="10" cy="6" r="1" fill="#32CD32" />
    
    {/* Connection lines */}
    <line x1="10" y1="10" x2="7" y2="8" stroke="#90EE90" strokeWidth="1" />
    <line x1="10" y1="10" x2="13" y2="8" stroke="#90EE90" strokeWidth="1" />
    <line x1="10" y1="10" x2="6" y2="12" stroke="#90EE90" strokeWidth="1" />
    <line x1="10" y1="10" x2="14" y2="12" stroke="#90EE90" strokeWidth="1" />
    <line x1="10" y1="10" x2="10" y2="6" stroke="#90EE90" strokeWidth="1" />
  </svg>
);

// Inventory Icon
export const InventoryIcon = (
  <svg
    width="20"
    height="20"
    style={{ paddingRight: "2px" }}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Inventory</title>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M16 3v4M8 3v4" />
  </svg>
); 

// Timer Icon
export const FlameTimerIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    {/* Clock circle */}
    <circle cx="12" cy="12" r="10" />
    {/* Clock hands */}
    <polyline points="12 6 12 12 16 14" />
    {/* Flame shape inside */}
    <path d="M12 17c-2-1.5-2-3-1-4.5s2-2.5 1-4c1 0.5 2 1.5 2 3s-1 2.5-2 5.5z" fill="currentColor" />
  </svg>
);

// difficulty icons
export const EasyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#6bcf63" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2" fill="#a5d6a7" />
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">E</text>
  </svg>
);

export const MediumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#f4c542" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#FBC02D" strokeWidth="2" fill="#ffe082" />
    <text x="12" y="16" textAnchor="middle" fill="#333" fontSize="12" fontWeight="bold">M</text>
  </svg>
);

export const HardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef5350" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#e53935" strokeWidth="2" fill="#ef9a9a" />
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">H</text>
  </svg>
);

export const getDifficultyIcon = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return <EasyIcon />;
    case "medium":
      return <MediumIcon />;
    case "hard":
      return <HardIcon />;
    default:
      return null;
  }
};

// Habits Icon - this is the icon for the habits tab
export const HabitsIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    {/* Calendar background */}
    <rect x="2" y="4" width="16" height="14" rx="2" fill="#8ecae6" />
    
    {/* Calendar header */}
    <rect x="2" y="4" width="16" height="3" rx="2" fill="#219ebc" />
    
    {/* Calendar rings/holes */}
    <circle cx="6" cy="2" r="1" fill="#023047" />
    <circle cx="14" cy="2" r="1" fill="#023047" />
    
    {/* Habit check marks */}
    <path d="M5 10 L7 12 L10 9" stroke="#ffb703" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 13 L7 15 L10 12" stroke="#ffb703" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Streak flame */}
    <path d="M13 9 C14 8 15 9 15 10.5 C15 12 14 13 13 13 C12.5 12.5 12 11.5 12.5 10 C12.8 9.2 13 9 13 9 Z" fill="#fb8500" />
  </svg>
);

// Energy Icon - for the energy tab
export const EnergyIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ verticalAlign: "middle" }}
  >
    {/* Lightning bolt */}
    <path d="M12 2 L8 8 L10 8 L6 18 L10 12 L8 12 L12 2 Z" fill="#ffd700" stroke="#ffb300" strokeWidth="0.5" />
    {/* Energy particles */}
    <circle cx="14" cy="4" r="1" fill="#ffeb3b" opacity="0.8" />
    <circle cx="16" cy="6" r="0.8" fill="#ffeb3b" opacity="0.6" />
    <circle cx="15" cy="8" r="0.6" fill="#ffeb3b" opacity="0.4" />
  </svg>
);