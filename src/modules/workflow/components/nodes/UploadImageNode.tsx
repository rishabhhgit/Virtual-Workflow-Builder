"use client";

import { type NodeProps } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

import { BaseNodeWrapper } from "./BaseNodeWrapper";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowFlowNode, WorkflowNodeData } from "@/modules/workflow/types";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

export function UploadImageNode(props: NodeProps<WorkflowFlowNode>) {
  const updateNodeData = useWorkflowBuilderStore((s) => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const data = (props.data ?? {}) as WorkflowNodeData;
  const imageUrl = typeof data.outputs?.imageUrl === "string" ? data.outputs.imageUrl : "";

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      e.target.value = "";

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        setError(`Image too large (max ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB).`);
        return;
      }

      if (file.size <= MAX_IMAGE_SIZE_BYTES) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          updateNodeData(props.id, {
            outputs: { ...data.outputs, imageUrl: dataUrl },
            inputs: { ...data.inputs, fileName: file.name },
          });
        };
        reader.onerror = () => setError("Failed to read image.");
        reader.readAsDataURL(file);
        return;
      }

      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/upload/image", { method: "POST", body: formData });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          setError(json.error ?? "Upload failed");
          return;
        }
        if (json.url) {
          updateNodeData(props.id, {
            outputs: { ...data.outputs, imageUrl: json.url },
            inputs: { ...data.inputs, fileName: file.name },
          });
        } else {
          setError("No URL returned");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [props.id, data.outputs, data.inputs, updateNodeData],
  );

  return (
    <BaseNodeWrapper
      title="Upload Image"
      nodeType="upload_image"
      subtitle="Output: image URL"
      isRunning={Boolean((data as Record<string, unknown>)?.isRunning)}
    >
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs font-medium text-zinc-600 hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-violet-500 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
        >
          Choose image (max 5MB inline, up to 50MB)
        </button>
        {error && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
        )}
        {imageUrl && (
          <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <img
              src={imageUrl}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          </div>
        )}
      </div>
    </BaseNodeWrapper>
  );
}
