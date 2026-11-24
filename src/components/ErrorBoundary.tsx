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
        <div className="rounded-2xl border-2 border-beige-hairline bg-beige-card p-5 text-center text-forest-ink shadow-panel">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brick/15 text-brick">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h4 className="font-display text-base font-bold text-forest-ink">
            {this.props.fallbackTitle || 'Could not run this check'}
          </h4>
          <p className="mt-1 text-xs text-forest font-medium">
            An isolated failure occurred while executing this analysis module. Other checks remain unaffected.
          </p>
          {this.state.error && (
            <p className="mt-2 font-mono text-xs text-brick font-semibold">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-forest bg-forest text-lime px-3 py-1.5 text-xs font-bold hover:bg-forest-deep transition shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
