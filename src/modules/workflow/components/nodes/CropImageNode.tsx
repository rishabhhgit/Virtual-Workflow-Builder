"use client";

import { type NodeProps } from "@xyflow/react";
import { useCallback } from "react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

const DEFAULT_X = 10;
const DEFAULT_Y = 10;
const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 80;

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

export function CropImageNode(props: NodeProps<WorkflowFlowNode>) {
  const updateNodeData = useWorkflowBuilderStore((s) => s.updateNodeData);
  const data = (props.data ?? {}) as WorkflowNodeData & { runOutputs?: Record<string, unknown> };
  const inputs = data.inputs ?? {};
  const xPct = num(inputs.xPct) || DEFAULT_X;
  const yPct = num(inputs.yPct) || DEFAULT_Y;
  const widthPct = num(inputs.widthPct) || DEFAULT_WIDTH;
  const heightPct = num(inputs.heightPct) || DEFAULT_HEIGHT;
  const runOutputs = data.runOutputs;
  const resultUrl =
    (typeof runOutputs?.imageUrl === "string" ? runOutputs.imageUrl : null) ??
    (typeof runOutputs?.default === "string" ? runOutputs.default : null);

  const update = useCallback(
    (key: string, value: number) => {
      updateNodeData(props.id, {
        inputs: { ...data.inputs, [key]: value },
      });
    },
    [props.id, data.inputs, updateNodeData],
  );

  return (
    <BaseNodeWrapper
      title="Crop Image"
      subtitle="Input: image → Output: cropped image URL (FFmpeg)"
      isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}
    >
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Connect an <strong>Upload Image</strong> or <strong>Extract Frame</strong> node to the left input. Crop region (%):
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">X %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={xPct}
              onChange={(e) => update("xPct", e.target.valueAsNumber || 0)}
              className="rounded border border-zinc-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-black/20 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Y %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={yPct}
              onChange={(e) => update("yPct", e.target.valueAsNumber || 0)}
              className="rounded border border-zinc-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-black/20 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Width %</span>
            <input
              type="number"
              min={1}
              max={100}
              value={widthPct}
              onChange={(e) => update("widthPct", e.target.valueAsNumber || 0)}
              className="rounded border border-zinc-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-black/20 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Height %</span>
            <input
              type="number"
              min={1}
              max={100}
              value={heightPct}
              onChange={(e) => update("heightPct", e.target.valueAsNumber || 0)}
              className="rounded border border-zinc-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-black/20 dark:text-zinc-100"
            />
          </label>
        </div>
        {resultUrl && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Result (last run)</p>
            {resultUrl.startsWith("data:") || resultUrl.startsWith("http") ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-200 dark:border-white/10">
                <img
                  src={resultUrl}
                  alt="Crop result"
                  className="h-full w-full object-contain"
                />
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
