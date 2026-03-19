'use client';

import type { ReactNode } from 'react';

interface XpGroupBoxProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function XpGroupBox({ label, children, className = '' }: XpGroupBoxProps) {
  return (
    <fieldset className={`xp-groupbox ${className}`}>
      <legend className="xp-groupbox-legend">{label}</legend>
      {children}
    </fieldset>
  );
}
