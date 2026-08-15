"use client";

import { type NodeProps } from "@xyflow/react";
import { useCallback } from "react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

export function TextNode(props: NodeProps<WorkflowFlowNode>) {
  const updateNodeData = useWorkflowBuilderStore((s) => s.updateNodeData);
  const data = (props.data ?? {}) as WorkflowNodeData;
  const text = typeof data.inputs?.text === "string" ? data.inputs.text : "";

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(props.id, {
        inputs: { ...data.inputs, text: e.target.value },
      });
    },
    [props.id, data.inputs, updateNodeData],
  );

  return (
    <BaseNodeWrapper title="Text" subtitle="Output: text" isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}>
      <textarea
        value={text}
        onChange={onChange}
        placeholder="Enter text..."
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
    </BaseNodeWrapper>
  );
}
