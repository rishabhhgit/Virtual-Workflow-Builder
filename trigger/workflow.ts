import { logger, task } from "@trigger.dev/sdk/v3";
import type { Edge, Node } from "@xyflow/react";

import { getPrisma } from "./db";
import { cropImageTask } from "./cropImage";
import { extractFrameTask } from "./extractFrame";
import { llmTask } from "./llm";

function buildDependencyMap(
  nodes: Node[],
  edges: Edge[],
): Map<string, string[]> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const map = new Map<string, string[]>();
  for (const id of nodeIds) map.set(id, []);
  for (const edge of edges) {
    const { source, target } = edge;
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) continue;
    const upstream = map.get(target) ?? [];
    if (!upstream.includes(source)) upstream.push(source);
    map.set(target, upstream);
  }
  return map;
}

type NodeData = { label?: string; inputs?: Record<string, unknown>; outputs?: Record<string, unknown> };
type NodeType = "text" | "upload_image" | "upload_video" | "llm" | "crop_image" | "extract_frame";

export const workflowOrchestratorTask = task({
  id: "workflow-orchestrator",
  run: async (payload: { workflowRunId: string; runnableNodeIds?: string[] }) => {
    const prisma = getPrisma();
    const { workflowRunId } = payload;

    const run = await prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      include: { workflow: true, nodeRuns: true },
    });
    if (!run) throw new Error(`WorkflowRun not found: ${workflowRunId}`);
    if (run.status !== "running") {
      logger.info("Run already finished", { status: run.status });
      return { status: run.status };
    }

    const nodes = run.workflow.nodes as unknown as Node<NodeData, NodeType>[];
    const edges = run.workflow.edges as unknown as Edge[];
    const dependencyMap = buildDependencyMap(nodes, edges);
    const runnableSet = payload.runnableNodeIds?.length ? new Set(payload.runnableNodeIds) : null;

    const completed = new Set<string>();
    for (const nr of run.nodeRuns) {
      if (nr.status === "skipped") completed.add(nr.nodeId);
    }

    let changed = true;
    while (changed) {
      changed = false;
      const freshNodeRuns = await prisma.nodeRun.findMany({
        where: { workflowRunId },
        orderBy: { startedAt: "asc" },
      });
      const nodeRunByNodeId = new Map(freshNodeRuns.map((nr) => [nr.nodeId, nr]));

      const ready: string[] = [];
      for (const node of nodes) {
        if (completed.has(node.id)) continue;
        const nr = nodeRunByNodeId.get(node.id);
        if (nr?.status === "skipped") continue;
        if (runnableSet && !runnableSet.has(node.id)) continue;
        const upstream = dependencyMap.get(node.id) ?? [];
        const allUpstreamDone = upstream.every((id) => completed.has(id));
        if (allUpstreamDone) ready.push(node.id);
      }

      if (ready.length === 0) break;

      await Promise.all(
        ready.map(async (nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (!node) return;
          const type = (node.type ?? "text") as NodeType;
          const data = (node.data ?? {}) as NodeData;
          const upstream = dependencyMap.get(nodeId) ?? [];
          const resolvedInputs: Record<string, unknown> = { ...data.inputs };
          for (const upId of upstream) {
            const nr = nodeRunByNodeId.get(upId);
            const out = nr?.outputs as Record<string, unknown> | null;
            if (out && typeof out.default !== "undefined") {
              resolvedInputs.default = out.default;
            } else {
              const upNode = nodes.find((n) => n.id === upId);
              const upData = (upNode?.data ?? {}) as NodeData;
              const upType = (upNode?.type ?? "") as NodeType;
              if (upType === "upload_image") {
                const url = (upData.outputs as Record<string, unknown>)?.imageUrl;
                if (typeof url === "string" && url.trim()) resolvedInputs.default = url;
              } else if (upType === "upload_video") {
                const url = (upData.outputs as Record<string, unknown>)?.videoUrl;
                if (typeof url === "string" && url.trim()) resolvedInputs.default = url;
              }
            }
          }

          const nodeRun = freshNodeRuns.find((nr) => nr.nodeId === nodeId);
          if (!nodeRun) return;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: { status: "running", inputs: resolvedInputs as object },
          });

          let outputs: Record<string, unknown> = {};
          try {
            if (type === "text" || type === "upload_image" || type === "upload_video") {
              outputs = (data.outputs ?? {}) as Record<string, unknown>;
              if (type === "text" && typeof resolvedInputs.text === "string") {
                outputs.default = resolvedInputs.text;
              }
              if (type === "upload_image") {
                const imageUrl = (data.outputs as Record<string, unknown>)?.imageUrl;
                if (typeof imageUrl === "string" && imageUrl.trim()) {
                  if (imageUrl.startsWith("blob:")) {
                    throw new Error(
                      "This image is a local preview (blob URL). Re-upload the image so the server can use it.",
                    );
                  }
                  outputs.default = imageUrl;
                }
              }
              if (type === "upload_video" && typeof (data.outputs as Record<string, unknown>)?.videoUrl === "string") {
                outputs.default = (data.outputs as Record<string, unknown>).videoUrl;
              }
            } else if (type === "llm") {
              const result = await llmTask.triggerAndWait({
                systemPrompt: String(resolvedInputs.system_prompt ?? data.inputs?.system_prompt ?? ""),
                userMessage: String(resolvedInputs.user_message ?? data.inputs?.user_message ?? resolvedInputs.default ?? ""),
                images: Array.isArray(resolvedInputs.images) ? resolvedInputs.images as string[] : undefined,
              });
              outputs = result.ok ? { text: result.output.text, default: result.output.text } : { error: "LLM failed" };
            } else if (type === "crop_image") {
              const imageUrl = String(resolvedInputs.image_url ?? resolvedInputs.default ?? "").trim();
              if (!imageUrl) {
                throw new Error("No image URL: connect an Upload Image or Extract Frame node to this node's input.");
              }
              const result = await cropImageTask.triggerAndWait({
                imageUrl,
                xPct: Number(resolvedInputs.xPct ?? data.inputs?.xPct ?? 10),
                yPct: Number(resolvedInputs.yPct ?? data.inputs?.yPct ?? 10),
                widthPct: Number(resolvedInputs.widthPct ?? data.inputs?.widthPct ?? 80),
                heightPct: Number(resolvedInputs.heightPct ?? data.inputs?.heightPct ?? 80),
              });
              outputs = result.ok ? { default: result.output.imageUrl, imageUrl: result.output.imageUrl } : { error: "Crop failed" };
            } else if (type === "extract_frame") {
              const videoUrl = String(resolvedInputs.video_url ?? resolvedInputs.default ?? "").trim();
              if (!videoUrl) {
                throw new Error("No video URL: connect an Upload Video node to this node's input.");
              }
              const result = await extractFrameTask.triggerAndWait({
                videoUrl,
                timestampSeconds: Number(resolvedInputs.timestampSeconds ?? data.inputs?.timestampSeconds ?? 1),
              });
              outputs = result.ok ? { default: result.output.imageUrl, imageUrl: result.output.imageUrl } : { error: "Extract failed" };
            }
          } catch (err) {
            logger.error("Node run failed", { nodeId, type, error: String(err) });
            await prisma.nodeRun.update({
              where: { id: nodeRun.id },
              data: { status: "failed", error: String(err), completedAt: new Date() },
            });
            completed.add(nodeId);
            changed = true;
            return;
          }

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: { status: "succeeded", outputs: outputs as object, completedAt: new Date() },
          });
          completed.add(nodeId);
          changed = true;
        }),
      );
    }

    const allNodeRuns = await prisma.nodeRun.findMany({ where: { workflowRunId } });
    const anyFailed = allNodeRuns.some((nr) => nr.status === "failed");
    const allDone = allNodeRuns.every((nr) => nr.status === "succeeded" || nr.status === "failed" || nr.status === "skipped");

    if (allDone) {
      const completedAt = new Date();
      const durationMs = run.startedAt ? Math.round(completedAt.getTime() - run.startedAt.getTime()) : null;
      await prisma.workflowRun.update({
        where: { id: workflowRunId },
        data: {
          status: anyFailed ? "failed" : "succeeded",
          completedAt,
          durationMs,
        },
      });
    }

    return { status: anyFailed ? "failed" : "succeeded", completed: completed.size };
  },
});
