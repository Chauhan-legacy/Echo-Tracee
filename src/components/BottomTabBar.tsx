import React from 'react';
import { Scan, AlertOctagon, Wrench, Share2, Award, ShieldCheck, GitBranch, Clock } from 'lucide-react';

export type ActiveTab = 'scan' | 'findings' | 'fix' | 'share' | 'bench' | 'audit' | 'evidence' | 'timeline';

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
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#0D121F]/95 backdrop-blur-md px-2 py-1 shadow-2xl">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {/* Tab 1: Scan */}
        <button
          onClick={() => onSelectTab('scan')}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl p-1 font-mono text-[10px] transition ${
            activeTab === 'scan' ? 'text-cyan font-bold' : 'text-term-dim hover:text-white'
          }`}
        >
          <Scan className={`h-5 w-5 ${activeTab === 'scan' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Scan</span>
        </button>

        {/* Tab 2: Findings */}
        <button
          onClick={() => onSelectTab('findings')}
          className={`relative flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl p-1 font-mono text-[10px] transition ${
            activeTab === 'findings' ? 'text-cyan font-bold' : 'text-term-dim hover:text-white'
          }`}
        >
          <AlertOctagon className={`h-5 w-5 ${activeTab === 'findings' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Findings</span>
          {findingCount > 0 && (
            <span className="absolute right-2 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF3366] px-1 font-mono text-[9px] font-bold text-white shadow-glow-red">
              {findingCount}
            </span>
          )}
        </button>

        {/* Tab 3: Fix */}
        <button
          onClick={() => onSelectTab('fix')}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl p-1 font-mono text-[10px] transition ${
            activeTab === 'fix' ? 'text-cyan font-bold' : 'text-term-dim hover:text-white'
          }`}
        >
          <Wrench className={`h-5 w-5 ${activeTab === 'fix' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Fix</span>
        </button>

        {/* Tab 4: Share */}
        <button
          onClick={() => onSelectTab('share')}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl p-1 font-mono text-[10px] transition ${
            activeTab === 'share' ? 'text-cyan font-bold' : 'text-term-dim hover:text-white'
          }`}
        >
          <Share2 className={`h-5 w-5 ${activeTab === 'share' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Share</span>
        </button>

        {/* Tab 5: ET-Bench */}
        <button
          onClick={() => onSelectTab('bench')}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl p-1 font-mono text-[10px] transition ${
            activeTab === 'bench' ? 'text-cyan font-bold' : 'text-term-dim hover:text-white'
          }`}
        >
          <Award className={`h-5 w-5 ${activeTab === 'bench' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Bench</span>
        </button>

        {/* Tab 6: Self-Audit */}
        <button
          onClick={() => onSelectTab('audit')}
          className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl p-1 font-mono text-[10px] transition ${
            activeTab === 'audit' ? 'text-cyan font-bold' : 'text-term-dim hover:text-white'
          }`}
        >
          <ShieldCheck className={`h-5 w-5 ${activeTab === 'audit' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Audit</span>
        </button>
      </div>
    </nav>
  );
};
