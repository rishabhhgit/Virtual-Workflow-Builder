import { notFound } from "next/navigation";

import { getWorkflowRuns } from "@/app/(app)/workflows/[workflowId]/actions";
import { WorkflowErrorBoundary } from "@/components/WorkflowErrorBoundary";
import { prisma } from "@/lib/db";
import { WorkflowBuilder } from "@/modules/workflow/builder/WorkflowBuilder";
import { requireDbUser } from "@/server/auth";

export default async function WorkflowBuilderPage(props: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await props.params;
  const user = await requireDbUser();

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId: user.id },
    select: { id: true, name: true, nodes: true, edges: true },
  });

  if (!workflow) notFound();

  const initialRuns = await getWorkflowRuns(workflowId);

  return (
    <WorkflowErrorBoundary>
      <WorkflowBuilder
        workflowId={workflowId}
        workflowName={workflow.name}
        initialNodes={workflow.nodes as unknown as any[]}
        initialEdges={workflow.edges as unknown as any[]}
        initialRuns={initialRuns}
      />
    </WorkflowErrorBoundary>
  );
}

