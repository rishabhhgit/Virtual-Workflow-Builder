"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";

import { createWorkflow } from "@/app/(app)/workflows/[workflowId]/actions";

export function NewWorkflowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createWorkflow("Untitled workflow");
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
      className="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-600"
    >
      <Plus className="h-4 w-4" />
      {loading ? "Creating…" : "New workflow"}
    </button>
  );
}
