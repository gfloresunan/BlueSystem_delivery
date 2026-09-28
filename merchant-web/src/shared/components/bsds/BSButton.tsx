import React from 'react';

export type BSButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success';

interface BSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BSButtonVariant;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * 🔘 BSButton - Botón oficial oficial de BSDS v1.0 (ADR-005)
 * Altura estándar: 56px (h-14) | Radio de borde: 16px (rounded-bs-btn)
 */
export const BSButton: React.FC<BSButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  fullWidth = true,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'h-14 px-6 rounded-bs-btn font-semibold text-[15px] transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  
  const variantStyles: Record<BSButtonVariant, string> = {
    primary: 'bg-bsPrimary-700 hover:bg-bsPrimary-800 text-white shadow-bs-low hover:shadow-bs-md',
    secondary: 'border-2 border-bsPrimary-700 text-bsPrimary-700 dark:text-bsPrimary-500 hover:bg-bsPrimary-700/10',
    tertiary: 'text-bsPrimary-700 dark:text-bsPrimary-400 hover:bg-bsPrimary-700/10',
    danger: 'bg-bsStatus-error hover:bg-red-700 text-white shadow-bs-low',
    success: 'bg-bsStatus-success hover:bg-green-600 text-white shadow-bs-low'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${fullWidth ? 'w-full' : 'w-auto'} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export interface BSFloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
}

/**
 * 🔘 BSFloatingActionButton - Botón flotante circular 64px
 */
export const BSFloatingActionButton: React.FC<BSFloatingActionButtonProps> = ({
  icon,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`w-16 h-16 rounded-full bg-bsPrimary-700 hover:bg-bsPrimary-800 text-white shadow-bs-high flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${className}`}
      {...props}
    >
      <span className="w-7 h-7 flex items-center justify-center">{icon}</span>
    </button>
  );
};
