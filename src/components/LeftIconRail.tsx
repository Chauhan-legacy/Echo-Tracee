/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import {
  Scan,
  AlertOctagon,
  Wrench,
  Layers,
  Network,
  Gauge,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { ActiveTab } from './BottomTabBar';

interface LeftIconRailProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  findingsCount?: number;
}

interface NavSection {
  title: string;
  items: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    shortcut: string;
  }[];
}

export const LeftIconRail: React.FC<LeftIconRailProps> = ({
  activeTab,
  onSelectTab,
  findingsCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sections: NavSection[] = [
    {
      title: 'Analyse',
      items: [
        { id: 'scan', label: 'Scan Console', icon: Scan, shortcut: '1' },
        { id: 'findings', label: 'Findings', icon: AlertOctagon, badge: findingsCount, shortcut: '2' },
        { id: 'timeline', label: 'Timeline Strip', icon: Layers, shortcut: '3' },
      ],
    },
    {
      title: 'Fixer',
      items: [
        { id: 'fix', label: 'Fixer Hero', icon: Wrench, shortcut: '4' },
      ],
    },
    {
      title: 'Evidence',
      items: [
        { id: 'evidence', label: 'Evidence Graph', icon: Network, shortcut: '5' },
        { id: 'verify', label: 'Verify Receipt', icon: FileCheck, shortcut: '6' },
      ],
    },
    {
      title: 'Audit',
      items: [
        { id: 'bench', label: 'ET-Bench', icon: Gauge, shortcut: '7' },
        { id: 'audit', label: 'Self-Audit', icon: ShieldCheck, shortcut: '8' },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between border-r border-beige-hairline bg-beige-card/95 backdrop-blur-sm py-3 transition-all duration-200 ease-in-out shrink-0 select-none z-20 ${
        isExpanded ? 'w-[220px]' : 'w-16'
      }`}
    >
      <div className="flex flex-col gap-4 w-full px-2">
        {sections.map((section, sIdx) => (
          <div key={section.title} className="flex flex-col gap-1 w-full">
            {isExpanded && (
              <span className="px-2 text-[10px] font-mono font-bold text-forest-muted uppercase tracking-wider">
                {section.title}
              </span>
            )}
            {!isExpanded && sIdx > 0 && (
              <div className="mx-auto w-6 border-t border-beige-hairline/80 my-1" />
            )}

            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  aria-label={`${item.label} (Shortcut ${item.shortcut})`}
                  className={`group relative flex items-center rounded-xl transition font-sans ${
                    isExpanded ? 'h-10 px-3 gap-3 w-full justify-start' : 'h-11 w-11 justify-center mx-auto'
                  } ${
                    isActive
                      ? 'bg-forest text-lime shadow-panel font-bold border-l-4 border-lime'
                      : 'text-forest-muted hover:bg-beige-sunken hover:text-forest-ink focus:ring-2 focus:ring-lime focus:outline-none'
                  }`}
                  title={!isExpanded ? `${item.label} (Key ${item.shortcut})` : undefined}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />

                  {isExpanded && (
                    <span className="text-xs truncate text-left flex-1 font-medium">
                      {item.label}
                    </span>
                  )}

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brick px-1 font-mono text-[9px] font-bold text-cream ${
                        isExpanded ? 'ml-auto' : 'absolute -top-1 -right-1'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip when collapsed */}
                  {!isExpanded && (
                    <div className="absolute left-14 z-40 hidden whitespace-nowrap rounded-lg border border-beige-hairline bg-beige-card px-2.5 py-1 text-xs font-semibold text-forest-ink shadow-elevated group-hover:block">
                      <span>{item.label}</span>
                      <span className="ml-1.5 rounded bg-beige-sunken px-1 font-mono text-[10px] text-forest-muted">
                        {item.shortcut}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Rail Controls: Expand/Collapse toggle */}
      <div className="flex flex-col items-center gap-2 px-2 pt-2 border-t border-beige-hairline/80">
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          className={`flex items-center justify-center rounded-lg text-forest-muted hover:bg-beige-sunken hover:text-forest-ink transition ${
            isExpanded ? 'h-8 px-2 w-full gap-2 text-xs font-mono' : 'h-8 w-8'
          }`}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <span className="font-mono text-[9px] text-forest-muted font-bold tracking-widest uppercase">
          {isExpanded ? 'ECHO//TRACE V4.2' : 'V4'}
        </span>
      </div>
    </aside>
  );
};
