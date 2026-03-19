'use client';

import type { ReactNode } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

interface XpTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export function XpTabs({ tabs, activeTab, onTabChange, children }: XpTabsProps) {
  return (
    <div>
      <div className="flex items-end gap-[2px] pl-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-3 py-[3px] text-[11px] rounded-t border border-b-0
                ${isActive
                  ? 'bg-[#ece9d8] border-[#919b9c] text-black font-bold relative z-10 -mb-[1px] pb-[4px]'
                  : 'bg-[#d6d0c4] border-[#919b9c] text-[#222] hover:bg-[#e0dad0] cursor-pointer'
                }
              `}
            >
              {tab.icon && <span className="mr-1">{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="border border-[#919b9c] bg-[#ece9d8] p-3">
        {children}
      </div>
    </div>
  );
}
