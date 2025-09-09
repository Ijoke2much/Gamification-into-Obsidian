import React from "react";

// Common form field wrapper
export const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}> = ({ label, children, error, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: "block",
      marginBottom: 8,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--text-normal)"
    }}>
      {label} {required && <span style={{ color: "var(--text-error)" }}>*</span>}
    </label>
    {children}
    {error && (
      <div style={{
        color: "var(--text-error)",
        fontSize: 12,
        marginTop: 4
      }}>
        {error}
      </div>
    )}
  </div>
);

// Reusable input component
export const FormInput: React.FC<{
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}> = ({ type = "text", value, onChange, placeholder, disabled, min, max }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    min={min}
    max={max}
    style={{
      width: "100%",
      padding: "12px 16px",
      borderRadius: 8,
      border: "1px solid rgba(255, 255, 255, 0.2)",
      background: "rgba(0, 0, 0, 0.4)",
      color: "#ffffff",
      fontSize: 14
    }}
  />
);

// Reusable select component
export const FormSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}> = ({ value, onChange, options, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: "100%",
      padding: "12px 16px",
      borderRadius: 8,
      border: "1px solid rgba(255, 255, 255, 0.2)",
      background: "rgba(0, 0, 0, 0.4)",
      color: "#ffffff",
      fontSize: 14
    }}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Reusable textarea component
export const FormTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, rows = 3, disabled }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    style={{
      width: "100%",
      padding: "12px 16px",
      borderRadius: 8,
      border: "1px solid rgba(255, 255, 255, 0.2)",
      background: "rgba(0, 0, 0, 0.4)",
      color: "#ffffff",
      fontSize: 14,
      resize: "vertical"
    }}
  />
);

// Reusable button component
export const FormButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}> = ({ 
  children, 
  onClick, 
  type = "button", 
  variant = "primary", 
  disabled, 
  size = "medium" 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#ffffff"
        };
      case "secondary":
        return {
          background: "rgba(255, 255, 255, 0.1)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        };
      case "danger":
        return {
          background: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)",
          color: "#ffffff"
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return { padding: "8px 16px", fontSize: 12 };
      case "large":
        return { padding: "16px 32px", fontSize: 16 };
      default:
        return { padding: "12px 24px", fontSize: 14 };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease",
        fontWeight: 600
      }}
    >
      {children}
    </button>
  );
};

// Modal wrapper component
export const ModalWrapper: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, title, children, maxWidth = "600px" }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
        borderRadius: 16,
        padding: 24,
        maxWidth,
        width: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        }}>
          <h2 style={{
            margin: 0,
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 700
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#ffffff",
              fontSize: 24,
              cursor: "pointer",
              padding: 8
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}; 