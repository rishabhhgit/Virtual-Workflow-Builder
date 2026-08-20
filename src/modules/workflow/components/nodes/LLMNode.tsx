"use client";

import { useCallback, useEffect, useState } from "react";
import { type NodeProps } from "@xyflow/react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData, LLMProviderConfig } from "@/modules/workflow/types";
import { getProviders, type AIProviderConfig } from "@/app/(app)/ai-providers/actions";

type ProviderOption = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
};

const GEMINI_OPTION: ProviderOption = {
  id: "gemini",
  name: "Google Gemini (built-in)",
  baseUrl: "",
  apiKey: "",
  models: ["gemini-3.6-flash"],
};

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

  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const llmConfig: LLMProviderConfig = data.llmProvider ?? {};
  const selectedProviderId = llmConfig.providerId ?? "gemini";
  const selectedModel = llmConfig.model ?? "";

  useEffect(() => {
    let cancelled = false;
    getProviders().then((list) => {
      if (cancelled) return;
      const options: ProviderOption[] = [
        GEMINI_OPTION,
        ...list.map((p) => ({
          id: p.id,
          name: p.name,
          baseUrl: p.baseUrl,
          apiKey: p.apiKey,
          models: p.models,
        })),
      ];
      setProviders(options);
      setLoadingProviders(false);
    });
    return () => { cancelled = true; };
  }, []);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId) ?? GEMINI_OPTION;

  const updateProviderConfig = useCallback(
    (providerId: string) => {
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) return;
      updateNodeData(props.id, {
        llmProvider: {
          providerId: provider.id,
          providerName: provider.name,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.models[0] ?? "",
        },
      });
    },
    [props.id, providers, updateNodeData],
  );

  const updateModel = useCallback(
    (model: string) => {
      updateNodeData(props.id, {
        llmProvider: {
          ...llmConfig,
          model,
        },
      });
    },
    [props.id, llmConfig, updateNodeData],
  );

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
      title="LLM"
      nodeType="llm"
      subtitle="Inputs: system_prompt, user_message, images[] -> Output: text"
      isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}
    >
      <div className="space-y-2">
        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          Provider
        </label>
        <select
          value={selectedProviderId}
          onChange={(e) => updateProviderConfig(e.target.value)}
          disabled={loadingProviders}
          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {selectedProvider.models.length > 1 && (
          <>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => updateModel(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {selectedProvider.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </>
        )}

        {selectedProvider.models.length === 1 && (
          <div className="rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Model: {selectedProvider.models[0]}
          </div>
        )}

        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          System prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={onSystemPromptChange}
          placeholder="System instructions..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          User message
        </label>
        <textarea
          value={userMessage}
          onChange={onUserMessageChange}
          placeholder="User message (or connect text node)..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {outputText && (
          <>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Output {data.runOutputs ? "(last run)" : ""}
            </label>
            <div className="max-h-24 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {outputText}
            </div>
          </>
        )}
      </div>
    </BaseNodeWrapper>
  );
}
