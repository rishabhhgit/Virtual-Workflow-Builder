"use client";

import { type NodeProps } from "@xyflow/react";
import { useCallback, useRef } from "react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

export function UploadVideoNode(props: NodeProps<WorkflowFlowNode>) {
  const updateNodeData = useWorkflowBuilderStore((s) => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);
  const data = (props.data ?? {}) as WorkflowNodeData;
  const videoUrl = typeof data.outputs?.videoUrl === "string" ? data.outputs.videoUrl : "";

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      updateNodeData(props.id, {
        outputs: { ...data.outputs, videoUrl: url },
        inputs: { ...data.inputs, fileName: file.name },
      });
      e.target.value = "";
    },
    [props.id, data.outputs, data.inputs, updateNodeData],
  );

  return (
    <BaseNodeWrapper
      title="Upload Video"
      nodeType="upload_video"
      subtitle="Output: video URL"
      isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}
    >
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={onFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs font-medium text-zinc-600 hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-violet-500 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
        >
          Choose video (Transloadit later)
        </button>
        {videoUrl && (
          <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <video
              src={videoUrl}
              controls
              className="h-full w-full object-contain"
            />
          </div>
        )}
      </div>
    </BaseNodeWrapper>
  );
}
