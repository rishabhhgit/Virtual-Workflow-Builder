"use client";

import { Handle, Position } from "@xyflow/react";

const HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-white !bg-violet-500 dark:!border-black";
const NODE_CLASS =
  "min-w-[220px] rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5";
const NODE_CLASS_RUNNING =
  "min-w-[220px] rounded-2xl border-2 border-violet-400 bg-white/90 px-4 py-3 shadow-lg shadow-violet-200/50 backdrop-blur dark:border-violet-500 dark:bg-white/10 dark:shadow-violet-900/30 animate-pulse";

type BaseNodeWrapperProps = {
  title: string;
  subtitle?: string;
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
  children,
  hasTarget = true,
  hasSource = true,
  targetHandleId = "default",
  sourceHandleId = "default",
  isRunning = false,
}: BaseNodeWrapperProps) {
  return (
    <div className={isRunning ? NODE_CLASS_RUNNING : NODE_CLASS}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </div>
          {subtitle && (
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {children}
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
