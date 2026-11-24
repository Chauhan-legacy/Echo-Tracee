/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Upload, Wrench, Share2, ShieldCheck, Play, X, Compass, Activity } from 'lucide-react';
import { ActiveTab } from './BottomTabBar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onLoadIncident001: () => void;
  onUploadClick: () => void;
  onFixClick: () => void;
  onShareClick: () => void;
  onStartTour: () => void;
  onOpenAudit: () => void;
  onNextFinding: () => void;
  onPrevFinding: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onLoadIncident001,
  onUploadClick,
  onFixClick,
  onShareClick,
  onStartTour,
  onOpenAudit,
  onNextFinding,
  onPrevFinding,
}) => {
  const [query, setQuery] = useState('');

  // Global keyboard shortcuts (Ctrl/Cmd+K, J, K, F, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger letter shortcuts if user is typing in an input
      const isInput = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (!isInput && !isOpen) {
        if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          onNextFinding();
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          onPrevFinding();
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          onFixClick();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          onShareClick();
        }
      } else if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNextFinding, onPrevFinding, onFixClick, onShareClick]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'incident',
      label: 'Load INCIDENT-001 (Hostel Reel)',
      shortcut: 'I',
      icon: Sparkles,
      run: () => { onLoadIncident001(); onClose(); },
    },
    {
      id: 'upload',
      label: 'Scan My Own File...',
      shortcut: 'U',
      icon: Upload,
      run: () => { onUploadClick(); onClose(); },
    },
    {
      id: 'fix',
      label: 'Fix Leaks in 1 Tap (Sanitize)',
      shortcut: 'F',
      icon: Wrench,
      run: () => { onFixClick(); onClose(); },
    },
    {
      id: 'share',
      label: 'Generate Cryptographic Share Card',
      shortcut: 'S',
      icon: Share2,
      run: () => { onShareClick(); onClose(); },
    },
    {
      id: 'tour',
      label: 'Start 60s Hands-Free Auto-Tour',
      shortcut: 'T',
      icon: Play,
      run: () => { onStartTour(); onClose(); },
    },
    {
      id: 'audit',
      label: 'Prove It: Network Call Interceptor Audit',
      shortcut: 'P',
      icon: ShieldCheck,
      run: () => { onOpenAudit(); onClose(); },
    },
    {
      id: 'tab-findings',
      label: 'Switch to Findings Tab',
      shortcut: '2',
      icon: Activity,
      run: () => { onSelectTab('findings'); onClose(); },
    },
    {
      id: 'tab-bench',
      label: 'Switch to ET-Bench Performance Profiler',
      shortcut: 'B',
      icon: Compass,
      run: () => { onSelectTab('bench'); onClose(); },
    },
  ];

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-forest-ink/60 backdrop-blur-sm pt-20 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-beige-hairline bg-beige-card shadow-elevated overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-beige-hairline px-4 py-3 bg-cream">
          <Search className="h-5 w-5 text-forest-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or shortcut (J/K next, F fix, S share)..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-forest-ink placeholder-forest-muted/70 focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="rounded p-1 text-forest-muted hover:bg-beige-sunken hover:text-forest-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-forest-muted">
              No matching commands found.
            </div>
          ) : (
            filtered.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.run}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-forest-ink hover:bg-beige-sunken/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-forest" />
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <kbd className="rounded border border-beige-hairline bg-beige-sunken px-2 py-0.5 font-mono text-[11px] font-bold text-forest-muted">
                    {action.shortcut}
                  </kbd>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="border-t border-beige-hairline bg-beige-sunken/40 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-forest-muted">
          <span>Shortcuts: <kbd className="font-bold">J</kbd>/<kbd className="font-bold">K</kbd> findings, <kbd className="font-bold">F</kbd> fix, <kbd className="font-bold">S</kbd> share</span>
          <span><kbd className="font-bold">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
