'use client';

interface XpProgressProps {
  value: number; // 0-100
  className?: string;
  label?: string;
}

export function XpProgress({ value, className = '', label }: XpProgressProps) {
  return (
    <div className={className}>
      {label && (
        <div className="text-[11px] text-[#222] mb-1">{label}</div>
      )}
      <div className="xp-progress">
        <div
          className="xp-progress-bar"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
