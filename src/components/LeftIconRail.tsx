import React from 'react';
import { Scan, AlertOctagon, Wrench, Layers, Network, Gauge, ShieldCheck, FileCheck } from 'lucide-react';
import { ActiveTab } from './BottomTabBar';

interface LeftIconRailProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  findingsCount?: number;
}

export const LeftIconRail: React.FC<LeftIconRailProps> = ({
  activeTab,
  onSelectTab,
  findingsCount = 0,
}) => {
  const navItems = [
    { id: 'scan' as ActiveTab, label: 'Scan Console', icon: Scan, shortcut: '1' },
    { id: 'findings' as ActiveTab, label: 'Findings', icon: AlertOctagon, badge: findingsCount, shortcut: '2' },
    { id: 'fix' as ActiveTab, label: 'Fixer Hero', icon: Wrench, shortcut: '3' },
    { id: 'timeline' as ActiveTab, label: 'Timeline Strip', icon: Layers, shortcut: '4' },
    { id: 'evidence' as ActiveTab, label: 'Evidence Graph', icon: Network, shortcut: '5' },
    { id: 'bench' as ActiveTab, label: 'ET-Bench', icon: Gauge, shortcut: '6' },
    { id: 'audit' as ActiveTab, label: 'Self-Audit', icon: ShieldCheck, shortcut: '7' },
    { id: 'verify' as ActiveTab, label: 'Verify Receipt', icon: FileCheck, shortcut: '8' },
  ];

  return (
    <aside className="hidden lg:flex flex-col items-center justify-between w-16 border-r border-beige-hairline bg-beige-card/90 backdrop-blur-sm py-4 shrink-0 select-none">
      <div className="flex flex-col items-center gap-2 w-full px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isActive
                  ? 'bg-forest text-lime shadow-panel'
                  : 'text-forest-muted hover:bg-beige-sunken hover:text-forest-ink'
              }`}
              title={`${item.label} (Key ${item.shortcut})`}
            >
              <Icon className="h-5 w-5" />

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brick px-1 font-mono text-[9px] font-bold text-cream">
                  {item.badge}
                </span>
              )}

              {/* Tooltip on hover */}
              <div className="absolute left-14 z-40 hidden whitespace-nowrap rounded-lg border border-beige-hairline bg-beige-card px-2.5 py-1 text-xs font-semibold text-forest-ink shadow-elevated group-hover:block">
                <span>{item.label}</span>
                <span className="ml-1.5 rounded bg-beige-sunken px-1 font-mono text-[10px] text-forest-muted">
                  {item.shortcut}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] font-mono text-forest-muted text-center">
        V3
      </div>
    </aside>
  );
};
