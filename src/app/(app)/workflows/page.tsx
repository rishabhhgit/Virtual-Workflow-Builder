import Link from "next/link";

import { NewWorkflowButton } from "@/app/(app)/workflows/NewWorkflowButton";
import { TemplateWorkflowButton } from "@/app/(app)/workflows/TemplateWorkflowButton";
import { prisma } from "@/lib/db";
import { requireDbUser } from "@/server/auth";

export default async function WorkflowsPage() {
  const user = await requireDbUser();

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true },
  });

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Create a workflow or open one to edit and run it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NewWorkflowButton />
            <TemplateWorkflowButton />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          {workflows.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
              No workflows yet. Click &quot;New workflow&quot; or &quot;From template&quot; (Marketing Kit) to create one.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-white/10">
              {workflows.map((wf) => (
                <li key={wf.id} className="flex items-center justify-between py-3">
                  <Link
                    href={`/workflows/${wf.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {wf.name}
                  </Link>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {wf.updatedAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

