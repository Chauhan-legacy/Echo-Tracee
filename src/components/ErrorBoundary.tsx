/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-term-border bg-term-card/90 p-5 text-center text-term-dim">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-white">
            {this.props.fallbackTitle || 'Could not run this check'}
          </h4>
          <p className="mt-1 text-xs text-term-dim">
            An isolated failure occurred while executing this analysis module. Other checks remain unaffected.
          </p>
          {this.state.error && (
            <p className="mt-2 font-mono text-[11px] text-amber-400/80">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-term-border bg-term-hover px-3 py-1.5 text-xs font-medium text-cyan-400 transition hover:border-cyan-400/50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
