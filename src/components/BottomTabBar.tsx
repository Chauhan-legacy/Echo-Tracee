import React from 'react';
import { Scan, AlertOctagon, Wrench, Share2 } from 'lucide-react';

export type ActiveTab = 'scan' | 'findings' | 'fix' | 'share' | 'bench' | 'audit' | 'evidence' | 'timeline' | 'verify';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  findingCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  findingCount = 0,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-beige-hairline bg-beige-card/95 backdrop-blur-md px-2 py-1 shadow-elevated"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {/* Step 1: Scan */}
        <button
          onClick={() => onSelectTab('scan')}
          className={`flex min-h-[48px] min-w-[70px] flex-col items-center justify-center rounded-xl p-1 font-sans text-xs transition ${
            activeTab === 'scan'
              ? 'text-forest font-bold'
              : 'text-forest-muted hover:text-forest-ink'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'scan' ? 'bg-forest/15 text-forest' : ''}`}>
            <Scan className="h-5 w-5" />
          </div>
          <span className="mt-0.5">Scan</span>
        </button>

        {/* Step 2: Findings */}
        <button
          onClick={() => onSelectTab('findings')}
          className={`relative flex min-h-[48px] min-w-[70px] flex-col items-center justify-center rounded-xl p-1 font-sans text-xs transition ${
            activeTab === 'findings'
              ? 'text-forest font-bold'
              : 'text-forest-muted hover:text-forest-ink'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'findings' ? 'bg-forest/15 text-forest' : ''}`}>
            <AlertOctagon className="h-5 w-5" />
          </div>
          <span className="mt-0.5">Findings</span>
          {findingCount > 0 && (
            <span className="absolute right-3 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brick px-1 font-mono text-[9px] font-bold text-cream">
              {findingCount}
            </span>
          )}
        </button>

        {/* Step 3: Fix */}
        <button
          onClick={() => onSelectTab('fix')}
          className={`flex min-h-[48px] min-w-[70px] flex-col items-center justify-center rounded-xl p-1 font-sans text-xs transition ${
            activeTab === 'fix'
              ? 'text-forest font-bold'
              : 'text-forest-muted hover:text-forest-ink'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'fix' ? 'bg-forest/15 text-forest' : ''}`}>
            <Wrench className="h-5 w-5" />
          </div>
          <span className="mt-0.5">Fix</span>
        </button>

        {/* Step 4: Share */}
        <button
          onClick={() => onSelectTab('share')}
          className={`flex min-h-[48px] min-w-[70px] flex-col items-center justify-center rounded-xl p-1 font-sans text-xs transition ${
            activeTab === 'share'
              ? 'text-forest font-bold'
              : 'text-forest-muted hover:text-forest-ink'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'share' ? 'bg-forest/15 text-forest' : ''}`}>
            <Share2 className="h-5 w-5" />
          </div>
          <span className="mt-0.5">Share</span>
        </button>
      </div>
    </nav>
  );
};
