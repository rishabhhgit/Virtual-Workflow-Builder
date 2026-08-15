"use client";

import { Image, MessageSquareText, Scissors, Upload, Video } from "lucide-react";

import { TestingGuide } from "@/modules/workflow/components/TestingGuide";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowNodeType } from "@/modules/workflow/types";

const NODE_TYPES: { type: WorkflowNodeType; label: string; icon: typeof MessageSquareText }[] = [
  { type: "text", label: "Text", icon: MessageSquareText },
  { type: "upload_image", label: "Upload Image", icon: Image },
  { type: "upload_video", label: "Upload Video", icon: Video },
  { type: "llm", label: "LLM (Gemini)", icon: MessageSquareText },
  { type: "crop_image", label: "Crop Image", icon: Scissors },
  { type: "extract_frame", label: "Extract Frame", icon: Upload },
];

export function NodePalette() {
  const addNode = useWorkflowBuilderStore((s) => s.addNode);

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-zinc-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nodes</div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Click a node to add it to the canvas.
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-4">
        <div className="space-y-1">
          {NODE_TYPES.map((n) => (
            <button
              key={n.type}
              type="button"
              onClick={() => addNode(n.type)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-white/10"
            >
              <n.icon className="h-4 w-4 shrink-0 text-violet-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {n.label}
                </div>
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{n.type}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <TestingGuide />
    </aside>
  );
}

