"use client";

import { type NodeProps } from "@xyflow/react";
import { useCallback } from "react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

export function ExtractFrameNode(props: NodeProps<WorkflowFlowNode>) {
  const updateNodeData = useWorkflowBuilderStore((s) => s.updateNodeData);
  const data = (props.data ?? {}) as WorkflowNodeData & { runOutputs?: Record<string, unknown> };
  const inputs = data.inputs ?? {};
  const timestampSeconds = num(inputs.timestampSeconds) || 1;
  const runOutputs = data.runOutputs;
  const resultUrl =
    (typeof runOutputs?.imageUrl === "string" ? runOutputs.imageUrl : null) ??
    (typeof runOutputs?.default === "string" ? runOutputs.default : null);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.valueAsNumber;
      updateNodeData(props.id, {
        inputs: { ...data.inputs, timestampSeconds: Number.isNaN(val) ? 0 : val },
      });
    },
    [props.id, data.inputs, updateNodeData],
  );

  return (
    <BaseNodeWrapper
      title="Extract Frame"
      subtitle="Input: video → Output: image URL (FFmpeg)"
      isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}
    >
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Connect video. Extract frame at timestamp (seconds):
        </p>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">Timestamp (s)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={timestampSeconds}
            onChange={onChange}
            className="rounded border border-zinc-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-black/20 dark:text-zinc-100"
          />
        </label>
        {resultUrl && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Result (last run)</p>
            {resultUrl.startsWith("data:") || resultUrl.startsWith("http") ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-200 dark:border-white/10">
                <img src={resultUrl} alt="Extracted frame" className="h-full w-full object-contain" />
              </div>
            ) : (
              <p className="truncate rounded bg-zinc-100 px-2 py-1 text-[10px] text-zinc-600 dark:bg-black/20 dark:text-zinc-400">
                {resultUrl}
              </p>
            )}
          </div>
        )}
      </div>
    </BaseNodeWrapper>
  );
}
