import React from 'react';
import styles from './FilterDropdown.module.css';

interface FilterDropdownProps {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, value, options, isOpen, onToggle, onChange }) => (
    <div className={styles.dropdownCard}>
        <label className={styles.label}>{label}</label>
        <div onClick={onToggle} className={styles.dropdown}>
            <span style={{ fontWeight: 800, color: '#fff' }}>{options.find(o => o.value === value)?.label || value}</span>
            <span className={styles.arrow}>▼</span>
        </div>
        {isOpen && (
            <div className={styles.dropdownMenu}>
                {options.map((option, index, arr) => (
                    <div
                        key={option.value}
                        onClick={() => { onChange(option.value); onToggle(); }}
                        style={{
                            padding: '12px 16px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            backgroundColor: value === option.value ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            borderRadius: index === 0 ? '8px 8px 0 0' : index === arr.length - 1 ? '0 0 8px 8px' : '0',
                            fontWeight: value === option.value ? 800 : 500
                        }}
                        onMouseEnter={e => value !== option.value && ((e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                        onMouseLeave={e => value !== option.value && ((e.target as HTMLElement).style.backgroundColor = 'transparent')}
                    >
                        {option.label}
                    </div>
                ))}
            </div>
        )}
    </div>
); 