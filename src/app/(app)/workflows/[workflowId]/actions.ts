"use server";

import { tasks } from "@trigger.dev/sdk/v3";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  MARKETING_KIT_TEMPLATE_NAME,
  marketingKitEdges,
  marketingKitNodes,
} from "@/lib/templates/marketingKit";
import { saveWorkflowSchema, startWorkflowRunSchema } from "@/lib/validation/workflow";
import { validateDAG, getRunnableNodeIds } from "@/modules/execution";
import { requireDbUser } from "@/server/auth";
import { workflowOrchestratorTask } from "../../../../../trigger/workflow";
import type { WorkflowFlowEdge, WorkflowFlowNode } from "@/modules/workflow/types";

const RUN_RATE_LIMIT_PER_MINUTE = 10;

export type CreateWorkflowResult =
  | { ok: true; workflowId: string }
  | { ok: false; error: string };

export type SaveWorkflowResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveWorkflow(
  workflowId: string,
  name: string,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): Promise<SaveWorkflowResult> {
  try {
    const parsed = saveWorkflowSchema.safeParse({
      workflowId,
      name: name?.trim() ?? "",
      nodes,
      edges,
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "Invalid workflow data";
      return { ok: false, error: msg };
    }
    const user = await requireDbUser();
    const workflow = await prisma.workflow.findFirst({
      where: { id: parsed.data.workflowId, userId: user.id },
    });
    if (!workflow) return { ok: false, error: "Workflow not found" };
    await prisma.workflow.update({
      where: { id: parsed.data.workflowId },
      data: {
        name: parsed.data.name.trim() || workflow.name,
        nodes: parsed.data.nodes as unknown as object[],
        edges: parsed.data.edges as unknown as object[],
      },
    });
    return { ok: true };
  } catch (err) {
    logger.error("saveWorkflow failed", { error: String(err) });
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function createWorkflow(
  name: string = "Untitled workflow",
): Promise<CreateWorkflowResult> {
  const user = await requireDbUser();
  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name: name.trim() || "Untitled workflow",
      nodes: [],
      edges: [],
    },
  });
  return { ok: true, workflowId: workflow.id };
}

export async function createWorkflowFromTemplate(): Promise<CreateWorkflowResult> {
  const user = await requireDbUser();
  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name: MARKETING_KIT_TEMPLATE_NAME,
      nodes: marketingKitNodes as unknown as object[],
      edges: marketingKitEdges as unknown as object[],
    },
  });
  return { ok: true, workflowId: workflow.id };
}

export type StartRunResult =
  | { ok: true; workflowRunId: string }
  | { ok: false; error: string };

export async function startWorkflowRun(
  workflowId: string,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
  options?: { runnableNodeIds?: string[] },
): Promise<StartRunResult> {
  try {
    const parsed = startWorkflowRunSchema.safeParse({ workflowId, nodes, edges });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? "Invalid workflow data";
      return { ok: false, error: msg };
    }
    const { workflowId: wfId, nodes: parsedNodes, edges: parsedEdges } = parsed.data;

    const user = await requireDbUser();
    const workflow = await prisma.workflow.findFirst({
      where: { id: wfId, userId: user.id },
    });
    if (!workflow) return { ok: false, error: "Workflow not found" };

    const recentRuns = await prisma.workflowRun.count({
      where: {
        userId: user.id,
        startedAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentRuns >= RUN_RATE_LIMIT_PER_MINUTE) {
      return {
        ok: false,
        error: `Rate limit: max ${RUN_RATE_LIMIT_PER_MINUTE} runs per minute. Try again shortly.`,
      };
    }

    const validation = validateDAG(parsedNodes as WorkflowFlowNode[], parsedEdges as WorkflowFlowEdge[]);
    if (!validation.valid) {
      return { ok: false, error: "Workflow has a cycle. Remove circular connections." };
    }

    const runnableSet =
      options?.runnableNodeIds?.length &&
      options.runnableNodeIds.length < (parsedNodes as WorkflowFlowNode[]).length
        ? getRunnableNodeIds(options.runnableNodeIds, parsedNodes as WorkflowFlowNode[], parsedEdges as WorkflowFlowEdge[])
        : null;
    const runnableNodeIds = runnableSet ? Array.from(runnableSet) : null;

    await prisma.workflow.update({
      where: { id: wfId },
      data: { nodes: parsedNodes as unknown as object[], edges: parsedEdges as unknown as object[] },
    });

    const run = await prisma.workflowRun.create({
      data: {
        workflowId: wfId,
        userId: user.id,
        status: "running",
        scope: runnableNodeIds ? "partial" : "full",
      },
    });

    logger.info("workflow run started", {
      workflowRunId: run.id,
      workflowId: wfId,
      userId: user.id,
      scope: runnableNodeIds ? "partial" : "full",
    });

    const nodeRuns = (parsedNodes as WorkflowFlowNode[]).map((node) => {
      const status: "queued" | "skipped" =
        runnableNodeIds == null || runnableNodeIds.includes(node.id) ? "queued" : "skipped";
      return {
        workflowRunId: run.id,
        nodeId: node.id,
        status,
        inputs: (node.data?.inputs ?? {}) as object,
        outputs: {},
      };
    });
    await prisma.nodeRun.createMany({ data: nodeRuns });

    const useTrigger = Boolean(process.env.TRIGGER_SECRET_KEY?.trim());

    if (useTrigger) {
      try {
        await tasks.trigger<typeof workflowOrchestratorTask>(
          workflowOrchestratorTask.id,
          { workflowRunId: run.id, runnableNodeIds: runnableNodeIds ?? undefined },
        );
        return { ok: true, workflowRunId: run.id };
      } catch (triggerErr) {
        logger.warn("Trigger.dev failed, running workflow in-process", {
          error: String(triggerErr),
          workflowRunId: run.id,
        });
      }
    }

    const { runWorkflowInProcess } = await import("@/server/runWorkflowInProcess");
    await runWorkflowInProcess(prisma, run.id);
    return { ok: true, workflowRunId: run.id };
  } catch (err) {
    logger.error("startWorkflowRun failed", { error: String(err) });
    return { ok: false, error: err instanceof Error ? err.message : "Run failed" };
  }
}

export type WorkflowRunListItem = {
  id: string;
  status: string;
  scope: string;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
};

export async function getWorkflowRuns(
  workflowId: string,
): Promise<WorkflowRunListItem[]> {
  const user = await requireDbUser();
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId: user.id },
  });
  if (!workflow) return [];

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      scope: true,
      startedAt: true,
      completedAt: true,
      durationMs: true,
    },
  });
  return runs.map((r) => ({
    id: r.id,
    status: r.status,
    scope: r.scope,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    durationMs: r.durationMs,
  }));
}

export type NodeRunDetail = {
  id: string;
  nodeId: string;
  status: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  durationMs: number | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
};

export type WorkflowRunDetail = {
  id: string;
  status: string;
  scope: string;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  nodeRuns: NodeRunDetail[];
};

export async function getWorkflowRunDetails(
  workflowRunId: string,
): Promise<WorkflowRunDetail | null> {
  try {
    const user = await requireDbUser();
    const run = await prisma.workflowRun.findFirst({
      where: { id: workflowRunId, userId: user.id },
      include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
    });
    if (!run) return null;
    return {
      id: run.id,
      status: run.status,
      scope: run.scope,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      nodeRuns: run.nodeRuns.map((nr) => ({
        id: nr.id,
        nodeId: nr.nodeId,
        status: nr.status,
        inputs: (nr.inputs as Record<string, unknown>) ?? {},
        outputs: (nr.outputs as Record<string, unknown>) ?? {},
        durationMs: nr.durationMs,
        error: nr.error,
        startedAt: nr.startedAt,
        completedAt: nr.completedAt,
      })),
    };
  } catch (err) {
    logger.error("getWorkflowRunDetails failed", { workflowRunId, error: String(err) });
    return null;
  }
}
