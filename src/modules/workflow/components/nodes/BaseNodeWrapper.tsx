"use client";

import { Handle, Position } from "@xyflow/react";
import type { WorkflowNodeType } from "@/modules/workflow/types";
import {
  FileText,
  Image,
  Video,
  MessageSquareText,
  Scissors,
  Crop,
  type LucideIcon,
} from "lucide-react";

const HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-white !bg-violet-500 dark:!border-black";

const NODE_TYPE_CONFIG: Record<
  WorkflowNodeType,
  { color: string; darkColor: string; icon: LucideIcon; category: string }
> = {
  text: {
    color: "bg-blue-500",
    darkColor: "dark:bg-blue-600",
    icon: FileText,
    category: "Input",
  },
  upload_image: {
    color: "bg-emerald-500",
    darkColor: "dark:bg-emerald-600",
    icon: Image,
    category: "Input",
  },
  upload_video: {
    color: "bg-orange-500",
    darkColor: "dark:bg-orange-600",
    icon: Video,
    category: "Input",
  },
  llm: {
    color: "bg-purple-500",
    darkColor: "dark:bg-purple-600",
    icon: MessageSquareText,
    category: "AI",
  },
  crop_image: {
    color: "bg-rose-500",
    darkColor: "dark:bg-rose-600",
    icon: Crop,
    category: "Transform",
  },
  extract_frame: {
    color: "bg-amber-500",
    darkColor: "dark:bg-amber-600",
    icon: Scissors,
    category: "Transform",
  },
};

type BaseNodeWrapperProps = {
  title: string;
  subtitle?: string;
  nodeType: WorkflowNodeType;
  children: React.ReactNode;
  hasTarget?: boolean;
  hasSource?: boolean;
  targetHandleId?: string;
  sourceHandleId?: string;
  isRunning?: boolean;
};

export function BaseNodeWrapper({
  title,
  subtitle,
  nodeType,
  children,
  hasTarget = true,
  hasSource = true,
  targetHandleId = "default",
  sourceHandleId = "default",
  isRunning = false,
}: BaseNodeWrapperProps) {
  const config = NODE_TYPE_CONFIG[nodeType] ?? NODE_TYPE_CONFIG.text;
  const Icon = config.icon;

  return (
    <div
      className={`min-w-[240px] overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-zinc-900 ${
        isRunning
          ? "border-violet-400 shadow-lg shadow-violet-200/50 dark:border-violet-500 dark:shadow-violet-900/30"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 ${config.color} ${config.darkColor}`}
      >
        <Icon className="h-4 w-4 text-white" />
        <span className="text-sm font-medium text-white">{title}</span>
        {isRunning && (
          <div className="ml-auto flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] text-white/80">Running</span>
          </div>
        )}
      </div>

      <div className="px-3 py-2">
        {subtitle && (
          <div className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </div>
        )}
        {children}
      </div>

      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          id={targetHandleId}
          className={HANDLE_CLASS}
        />
      )}
      {hasSource && (
        <Handle
          type="source"
          position={Position.Right}
          id={sourceHandleId}
          className={HANDLE_CLASS}
        />
      )}
    </div>
  );
}

export { NODE_TYPE_CONFIG };
