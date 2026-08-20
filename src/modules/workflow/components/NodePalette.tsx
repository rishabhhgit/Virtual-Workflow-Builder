"use client";

import { Search, FileText, Image, Video, MessageSquareText, Scissors, Crop, GripVertical } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import { TestingGuide } from "@/modules/workflow/components/TestingGuide";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import type { WorkflowNodeType } from "@/modules/workflow/types";

type NodeItem = {
  type: WorkflowNodeType;
  label: string;
  icon: typeof FileText;
  category: string;
  color: string;
};

const NODE_ITEMS: NodeItem[] = [
  { type: "text", label: "Text", icon: FileText, category: "Input", color: "bg-blue-500" },
  { type: "upload_image", label: "Upload Image", icon: Image, category: "Input", color: "bg-emerald-500" },
  { type: "upload_video", label: "Upload Video", icon: Video, category: "Input", color: "bg-orange-500" },
  { type: "llm", label: "LLM (Gemini)", icon: MessageSquareText, category: "AI", color: "bg-purple-500" },
  { type: "crop_image", label: "Crop Image", icon: Crop, category: "Transform", color: "bg-rose-500" },
  { type: "extract_frame", label: "Extract Frame", icon: Scissors, category: "Transform", color: "bg-amber-500" },
];

const CATEGORIES = ["Input", "AI", "Transform"];

export function NodePalette() {
  const addNode = useWorkflowBuilderStore((s) => s.addNode);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORIES)
  );

  const filteredNodes = useMemo(() => {
    if (!search) return NODE_ITEMS;
    const q = search.toLowerCase();
    return NODE_ITEMS.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const groupedNodes = useMemo(() => {
    const groups: Record<string, NodeItem[]> = {};
    for (const cat of CATEGORIES) {
      const items = filteredNodes.filter((n) => n.category === cat);
      if (items.length > 0) {
        groups[cat] = items;
      }
    }
    return groups;
  }, [filteredNodes]);

  const onDragStart = useCallback(
    (e: React.DragEvent, nodeType: WorkflowNodeType) => {
      e.dataTransfer.setData("application/reactflow", nodeType);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Nodes
          </span>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-4">
        {Object.entries(groupedNodes).map(([category, items]) => (
          <div key={category} className="mb-2">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg
                className={`h-3 w-3 transition-transform ${expandedCategories.has(category) ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {category}
            </button>

            {expandedCategories.has(category) && (
              <div className="space-y-0.5">
                {items.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    onClick={() => addNode(node.type)}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left cursor-grab active:cursor-grabbing hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ backgroundColor: node.color }}>
                      <node.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-500">
                        {node.type}
                      </div>
                    </div>
                    <GripVertical className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 dark:text-zinc-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
        <TestingGuide />
      </div>
    </aside>
  );
}
