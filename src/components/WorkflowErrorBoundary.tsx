"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export class WorkflowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-8 dark:border-amber-800 dark:bg-amber-950/20">
          <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Something went wrong
          </h2>
          <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
            The workflow builder encountered an error. Refresh the page or try again.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
