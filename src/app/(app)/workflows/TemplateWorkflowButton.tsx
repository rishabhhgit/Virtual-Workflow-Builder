"use client";

import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { createWorkflowFromTemplate } from "@/app/(app)/workflows/[workflowId]/actions";

export function TemplateWorkflowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createWorkflowFromTemplate();
      if (result.ok) {
        router.push(`/workflows/${result.workflowId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-2 rounded-full border border-violet-600 px-4 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500 dark:text-violet-400 dark:hover:bg-violet-950/30"
      title="Marketing Kit Generator: image + video → LLM"
    >
      <LayoutTemplate className="h-4 w-4" />
      {loading ? "Creating…" : "From template"}
    </button>
  );
}
