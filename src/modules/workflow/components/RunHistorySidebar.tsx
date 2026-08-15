"use client";

import { ChevronDown, ChevronRight, Clock, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  getWorkflowRunDetails,
  getWorkflowRuns,
  type NodeRunDetail,
  type WorkflowRunDetail,
  type WorkflowRunListItem,
} from "@/app/(app)/workflows/[workflowId]/actions";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-zinc-200 text-zinc-700 dark:bg-white/20 dark:text-zinc-300",
  running: "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  succeeded: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  failed: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  cancelled: "bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-400",
  skipped: "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400",
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type RunHistorySidebarProps = {
  workflowId: string;
  initialRuns: WorkflowRunListItem[];
  runCountTrigger?: number;
};

export function RunHistorySidebar({
  workflowId,
  initialRuns,
  runCountTrigger = 0,
}: RunHistorySidebarProps) {
  const [runs, setRuns] = useState<WorkflowRunListItem[]>(initialRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRuns[0]?.id ?? null);
  const [runDetails, setRunDetails] = useState<WorkflowRunDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshRuns = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await getWorkflowRuns(workflowId);
      setRuns(list);
      return list;
    } finally {
      setRefreshing(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (runCountTrigger > 0) {
      refreshRuns().then((list) => {
        if (list?.length) setSelectedRunId(list[0].id);
      });
    }
  }, [runCountTrigger, refreshRuns]);

  const hasRunningRun = runs.some((r) => r.status === "running");
  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const selectedIsRunning = selectedRun?.status === "running";

  useEffect(() => {
    if (!hasRunningRun) return;
    const interval = setInterval(() => refreshRuns(), 2000);
    return () => clearInterval(interval);
  }, [hasRunningRun, refreshRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setRunDetails(null);
      setDetailsError(null);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    setDetailsError(null);
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadingDetails(false);
        setDetailsError("Request timed out. Click Retry or refresh the list.");
      }
    }, 15000);
    getWorkflowRunDetails(selectedRunId)
      .then((detail) => {
        if (!cancelled) {
          setRunDetails(detail ?? null);
          setDetailsError(detail ? null : "Run not found");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRunDetails(null);
          setDetailsError(err?.message ?? "Failed to load details");
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setLoadingDetails(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [selectedRunId]);

  useEffect(() => {
    if (!selectedIsRunning || !selectedRunId) return;
    const interval = setInterval(() => {
      getWorkflowRunDetails(selectedRunId)
        .then((detail) => {
          setRunDetails((prev) => (detail ? { ...detail } : prev));
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedIsRunning, selectedRunId]);

  return (
    <aside className="flex h-full w-[320px] flex-col border-l border-zinc-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">History</div>
        <button
          type="button"
          onClick={refreshRuns}
          disabled={refreshing}
          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-4">
        {runs.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-black/20 dark:text-zinc-400">
            No runs yet. Click Run to start.
          </div>
        ) : (
          <ul className="space-y-1 py-2">
            {runs.map((run) => (
              <li key={run.id} className="rounded-lg border border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedRunId(selectedRunId === run.id ? null : run.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5"
                >
                  {selectedRunId === run.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[run.status] ?? "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"}`}
                      >
                        {run.status}
                      </span>
                      <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTime(run.startedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDuration(run.durationMs)}
                      </span>
                      <span>{run.scope}</span>
                    </div>
                  </div>
                </button>
                {selectedRunId === run.id && (
                  <div className="border-t border-zinc-200 px-3 py-2 dark:border-white/10">
                    {loadingDetails ? (
                      <div className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Loading…
                      </div>
                    ) : detailsError ? (
                      <div className="py-3 text-center text-xs text-amber-600 dark:text-amber-400">
                        {detailsError}
                        <br />
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsError(null);
                            setLoadingDetails(true);
                            getWorkflowRunDetails(selectedRunId)
                              .then((d) => {
                                setRunDetails(d ?? null);
                                setDetailsError(d ? null : "Run not found");
                              })
                              .catch((e) => setDetailsError(e?.message ?? "Failed to load"))
                              .finally(() => setLoadingDetails(false));
                          }}
                          className="mt-2 text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Retry
                        </button>
                      </div>
                    ) : runDetails ? (
                      <NodeRunsList nodeRuns={runDetails.nodeRuns} />
                    ) : (
                      <div className="py-2 text-xs text-zinc-500 dark:text-zinc-400">
                        No details
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function formatOutputSummary(outputs: Record<string, unknown>): string | null {
  if (typeof outputs.text === "string" && outputs.text.trim()) {
    const t = outputs.text.trim();
    return t.length > 80 ? `${t.slice(0, 80)}…` : t;
  }
  if (typeof outputs.default === "string" && outputs.default.trim()) {
    const d = outputs.default;
    if (d.startsWith("data:")) return "[image/data URL]";
    if (d.startsWith("http")) return d.length > 50 ? `${d.slice(0, 50)}…` : d;
    return d.length > 60 ? `${d.slice(0, 60)}…` : d;
  }
  if (typeof outputs.imageUrl === "string") return "[image URL]";
  if (Object.keys(outputs).length > 0) return null;
  return null;
}

function NodeRunsList({ nodeRuns }: { nodeRuns: NodeRunDetail[] }) {
  return (
    <ul className="space-y-2">
      {nodeRuns.map((nr) => {
        const hasOutputs = Object.keys(nr.outputs).length > 0;
        const outputSummary = hasOutputs ? formatOutputSummary(nr.outputs) : null;
        return (
          <li
            key={nr.id}
            className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-white/10 dark:bg-black/20"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {nr.nodeId}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[nr.status] ?? "bg-zinc-100 text-zinc-600"}`}
              >
                {nr.status}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <Clock className="h-3 w-3" />
              {formatDuration(nr.durationMs)}
            </div>
            {nr.error && (
              <div className="mt-1.5 rounded bg-red-50 px-2 py-1 text-[10px] text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {nr.error}
              </div>
            )}
            {hasOutputs && (
              <details className="mt-1.5" open>
                <summary className="cursor-pointer text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                  Output {outputSummary != null ? `· ${outputSummary}` : ""}
                </summary>
                {outputSummary != null && (
                  <div className="mt-1 rounded bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-700 dark:bg-black/30 dark:text-zinc-300">
                    {typeof nr.outputs.text === "string" ? (
                      <div className="max-h-24 overflow-auto whitespace-pre-wrap">{nr.outputs.text}</div>
                    ) : typeof nr.outputs.default === "string" && !nr.outputs.default.startsWith("data:") && nr.outputs.default.length < 200 ? (
                      <div className="break-all">{nr.outputs.default}</div>
                    ) : (
                      <pre className="max-h-32 overflow-auto text-[9px]">
                        {JSON.stringify(nr.outputs, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
                {outputSummary == null && (
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-100 px-2 py-1 text-[10px] text-zinc-700 dark:bg-black/30 dark:text-zinc-300">
                    {JSON.stringify(nr.outputs, null, 2)}
                  </pre>
                )}
              </details>
            )}
            {!hasOutputs && nr.status === "succeeded" && (
              <div className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">No outputs</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
