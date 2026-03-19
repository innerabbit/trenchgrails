'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface XpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'link';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export function XpButton({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  ...props
}: XpButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-[2px] text-[11px]',
    md: 'px-4 py-[3px] text-[11px]',
    lg: 'px-6 py-[5px] text-[12px]',
  };

  if (variant === 'link') {
    return (
      <button
        className={`text-[#0066cc] hover:text-[#0044aa] underline text-[11px] bg-transparent border-none cursor-pointer ${className}`}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </button>
    );
  }

  return (
    <button
      className={`
        xp-button
        ${variant === 'primary' ? 'xp-button-primary' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </button>
  );
}
