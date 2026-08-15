"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

export function RizzNode(props: NodeProps<WorkflowFlowNode>) {
  const data = props.data as WorkflowNodeData | undefined;
  const label = String(data?.label ?? props.type ?? "node");

  return (
    <div className="min-w-[220px] rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </div>
          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{String(props.type)}</div>
        </div>
        <div className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-300">
          node
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="default"
        className="!h-3 !w-3 !border-2 !border-white !bg-violet-500 dark:!border-black"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        className="!h-3 !w-3 !border-2 !border-white !bg-violet-500 dark:!border-black"
      />
    </div>
  );
}

