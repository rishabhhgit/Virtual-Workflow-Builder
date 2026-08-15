"use client";

import { type NodeProps } from "@xyflow/react";
import { useCallback } from "react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

export function LLMNode(props: NodeProps<WorkflowFlowNode>) {
  const updateNodeData = useWorkflowBuilderStore((s) => s.updateNodeData);
  const data = (props.data ?? {}) as WorkflowNodeData & { runOutputs?: Record<string, unknown> };
  const systemPrompt =
    typeof data.inputs?.system_prompt === "string" ? data.inputs.system_prompt : "";
  const userMessage =
    typeof data.inputs?.user_message === "string" ? data.inputs.user_message : "";
  const outputText =
    (typeof data.runOutputs?.text === "string" ? data.runOutputs.text : null) ??
    (typeof data.outputs?.text === "string" ? data.outputs.text : "") ??
    "";

  const onSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(props.id, {
        inputs: { ...data.inputs, system_prompt: e.target.value },
      });
    },
    [props.id, data.inputs, updateNodeData],
  );

  const onUserMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(props.id, {
        inputs: { ...data.inputs, user_message: e.target.value },
      });
    },
    [props.id, data.inputs, updateNodeData],
  );

  return (
    <BaseNodeWrapper
      title="LLM (Gemini)"
      subtitle="Inputs: system_prompt, user_message, images[] → Output: text"
      isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}
    >
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          System prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={onSystemPromptChange}
          placeholder="System instructions..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          User message
        </label>
        <textarea
          value={userMessage}
          onChange={onUserMessageChange}
          placeholder="User message (or connect text node)..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-black/20 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {outputText && (
          <>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Output {data.runOutputs ? "(last run)" : ""}
            </label>
            <div className="max-h-24 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300">
              {outputText}
            </div>
          </>
        )}
      </div>
    </BaseNodeWrapper>
  );
}
