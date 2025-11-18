import React, { useState, useRef, useEffect } from 'react';
import styles from './InlineEditors.module.css';

// Inline Editor for Priority
interface PriorityEditorProps {
  currentValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

export const PriorityEditor: React.FC<PriorityEditorProps> = ({ currentValue, onSave, onCancel }) => {
  const [value, setValue] = useState(currentValue);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      className={styles.inlineSelect}
    >
      <option value="lowest">⏬ Lowest</option>
      <option value="low">🔽 Low</option>
      <option value="medium">🔼 Medium</option>
      <option value="high">⏫ High</option>
      <option value="highest">🔺 Highest</option>
    </select>
  );
};

// Inline Editor for Difficulty
interface DifficultyEditorProps {
  currentValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

export const DifficultyEditor: React.FC<DifficultyEditorProps> = ({ currentValue, onSave, onCancel }) => {
  const [value, setValue] = useState(currentValue);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      className={styles.inlineSelect}
    >
      <option value="easy">★☆☆ Easy</option>
      <option value="medium">★★☆ Medium</option>
      <option value="hard">★★★ Hard</option>
    </select>
  );
};

// Inline Editor for Time Duration
interface TimeEditorProps {
  currentValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

export const TimeEditor: React.FC<TimeEditorProps> = ({ currentValue, onSave, onCancel }) => {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      placeholder="e.g., 30m, 2h, 1h30m"
      className={styles.inlineInput}
    />
  );
};

// Inline Editor for Recurrence
interface RecurrenceEditorProps {
  currentValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

export const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({ currentValue, onSave, onCancel }) => {
  const [value, setValue] = useState(currentValue);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      className={styles.inlineSelect}
    >
      <option value="">No Recurrence</option>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>
  );
};

// Inline Editor for Numeric Values (XP, CP, Coins)
interface NumericEditorProps {
  currentValue: number;
  onSave: (newValue: number) => void;
  onCancel: () => void;
  placeholder?: string;
}

export const NumericEditor: React.FC<NumericEditorProps> = ({ currentValue, onSave, onCancel, placeholder }) => {
  const [value, setValue] = useState(currentValue.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const numValue = parseInt(value) || 0;
      onSave(numValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const numValue = parseInt(value) || 0;
        onSave(numValue);
      }}
      placeholder={placeholder}
      className={styles.inlineInput}
      min="0"
    />
  );
};

// Inline Editor for Subtask Text
interface SubtaskEditorProps {
  currentValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export const SubtaskEditor: React.FC<SubtaskEditorProps> = ({ currentValue, onSave, onCancel, placeholder }) => {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      placeholder={placeholder || "Enter subtask..."}
      className={styles.inlineInput}
    />
  );
};
