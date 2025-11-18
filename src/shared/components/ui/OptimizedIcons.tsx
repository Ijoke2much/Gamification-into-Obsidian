import React, { memo } from 'react';

// Base icon interface for consistent styling
interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Memoized icon wrapper for better performance
const IconWrapper = memo<{ 
  children: React.ReactNode; 
  size?: number; 
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}>(({ children, size = 20, className = '', style = {}, 'aria-label': ariaLabel }) => (
  <span 
    className={`gamify-icon ${className}`}
    style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: size,
      height: size,
      flexShrink: 0,
      ...style 
    }}
    aria-label={ariaLabel}
    role="img"
  >
    {children}
  </span>
));

IconWrapper.displayName = 'IconWrapper';

// Performance-optimized SVG icons using React.memo
export const AddIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Add">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  </IconWrapper>
));

export const EditIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Edit">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  </IconWrapper>
));

export const DeleteIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Delete">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
    </svg>
  </IconWrapper>
));

export const CloseIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Close">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </IconWrapper>
));

export const SaveIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Save">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17,21 17,13 7,13 7,21" />
      <polyline points="7,3 7,8 15,8" />
    </svg>
  </IconWrapper>
));

export const CheckIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Check">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  </IconWrapper>
));

export const CoinIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Coin">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  </IconWrapper>
));

export const XPIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Experience Points">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
    </svg>
  </IconWrapper>
));

export const LockIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Locked">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  </IconWrapper>
));

export const LoadingIcon = memo<IconProps>(({ size = 16, className = '', style = {} }) => (
  <IconWrapper size={size} className={className} style={style} aria-label="Loading">
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  </IconWrapper>
));

// Icon mapping for easy access
export const OPTIMIZED_ICON_MAP = {
  add: AddIcon,
  edit: EditIcon,
  delete: DeleteIcon,
  close: CloseIcon,
  save: SaveIcon,
  check: CheckIcon,
  coin: CoinIcon,
  xp: XPIcon,
  lock: LockIcon,
  loading: LoadingIcon,
} as const;

// Dynamic icon component with memoization
export interface DynamicIconProps extends IconProps {
  name: keyof typeof OPTIMIZED_ICON_MAP;
}

export const DynamicIcon = memo<DynamicIconProps>(({ name, ...props }) => {
  const IconComponent = OPTIMIZED_ICON_MAP[name];
  return IconComponent ? <IconComponent {...props} /> : null;
});

DynamicIcon.displayName = 'DynamicIcon';

// Add the global spin animation
if (typeof document !== 'undefined' && !document.querySelector('#gamify-icon-styles')) {
  const style = document.createElement('style');
  style.id = 'gamify-icon-styles';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
