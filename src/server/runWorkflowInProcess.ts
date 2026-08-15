import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Edge, Node } from "@xyflow/react";
import type { PrismaClient } from "@prisma/client";

type NodeData = {
  label?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
};
type NodeType =
  | "text"
  | "upload_image"
  | "upload_video"
  | "llm"
  | "crop_image"
  | "extract_frame";

function buildDependencyMap(
  nodes: Node[],
  edges: Edge[],
): Map<string, string[]> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const map = new Map<string, string[]>();
  for (const id of nodeIds) map.set(id, []);
  for (const edge of edges) {
    const { source, target } = edge;
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target))
      continue;
    const upstream = map.get(target) ?? [];
    if (!upstream.includes(source)) upstream.push(source);
    map.set(target, upstream);
  }
  return map;
}

async function runLlmInProcess(payload: {
  systemPrompt: string;
  userMessage: string;
  images?: string[];
}): Promise<{ text: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { text: `System: ${payload.systemPrompt}\n\nUser: ${payload.userMessage}` },
  ];
  if (payload.images?.length) {
    for (const url of payload.images) {
      try {
        let base64: string;
        let mime = "image/png";
        if (url.startsWith("data:")) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mime = match[1];
            base64 = match[2];
          } else {
            continue;
          }
        } else {
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          base64 = Buffer.from(buf).toString("base64");
          mime = res.headers.get("content-type") ?? "image/png";
        }
        parts.push({ inlineData: { mimeType: mime, data: base64 } });
      } catch {
        // skip failed image
      }
    }
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  } as Parameters<typeof model.generateContent>[0]);
  const text = result.response.text() ?? "";
  return { text };
}

/**
 * Runs the workflow orchestrator in-process (no Trigger.dev).
 * Use when TRIGGER_SECRET_KEY is not set or when Trigger trigger fails.
 */
export async function runWorkflowInProcess(
  prisma: PrismaClient,
  workflowRunId: string,
): Promise<void> {
  const run = await prisma.workflowRun.findUnique({
    where: { id: workflowRunId },
    include: { workflow: true, nodeRuns: true },
  });
  if (!run) throw new Error(`WorkflowRun not found: ${workflowRunId}`);
  if (run.status !== "running") return;

  const nodes = run.workflow.nodes as unknown as Node<NodeData, NodeType>[];
  const edges = run.workflow.edges as unknown as Edge[];
  const dependencyMap = buildDependencyMap(nodes, edges);
  const nodeRunByNodeId = new Map(run.nodeRuns.map((nr) => [nr.nodeId, nr]));

  const completed = new Set<string>();
  for (const nr of run.nodeRuns) {
    if (nr.status === "skipped") completed.add(nr.nodeId);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const ready: string[] = [];
    for (const node of nodes) {
      if (completed.has(node.id)) continue;
      const nr = nodeRunByNodeId.get(node.id);
      if (nr?.status === "skipped") continue;
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
          if (out && typeof out.default !== "undefined")
            resolvedInputs.default = out.default;
        }

        const nodeRun = run.nodeRuns.find((nr) => nr.nodeId === nodeId);
        if (!nodeRun) return;

        await prisma.nodeRun.update({
          where: { id: nodeRun.id },
          data: { status: "running", inputs: resolvedInputs as object },
        });

        let outputs: Record<string, unknown> = {};
        try {
          if (
            type === "text" ||
            type === "upload_image" ||
            type === "upload_video"
          ) {
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
            if (
              type === "upload_video" &&
              typeof (data.outputs as Record<string, unknown>)?.videoUrl === "string"
            ) {
              outputs.default = (data.outputs as Record<string, unknown>).videoUrl;
            }
          } else if (type === "llm") {
            const result = await runLlmInProcess({
              systemPrompt: String(
                resolvedInputs.system_prompt ?? data.inputs?.system_prompt ?? "",
              ),
              userMessage: String(
                resolvedInputs.user_message ??
                  data.inputs?.user_message ??
                  resolvedInputs.default ??
                  "",
              ),
              images: Array.isArray(resolvedInputs.images)
                ? (resolvedInputs.images as string[])
                : undefined,
            });
            outputs = { text: result.text, default: result.text };
          } else if (type === "crop_image") {
            const imageUrl = String(resolvedInputs.image_url ?? resolvedInputs.default ?? "").trim();
            if (!imageUrl) {
              throw new Error(
                "No image URL: connect an Upload Image or Extract Frame node to this node's input.",
              );
            }
            outputs = { default: imageUrl, imageUrl };
          } else if (type === "extract_frame") {
            const videoUrl = String(resolvedInputs.video_url ?? resolvedInputs.default ?? "").trim();
            if (!videoUrl) {
              throw new Error("No video URL: connect an Upload Video node to this node's input.");
            }
            outputs = { default: videoUrl, imageUrl: videoUrl };
          }
        } catch (err) {
          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "failed",
              error: String(err),
              completedAt: new Date(),
            },
          });
          completed.add(nodeId);
          changed = true;
          return;
        }

        const completedAt = new Date();
        await prisma.nodeRun.update({
          where: { id: nodeRun.id },
          data: {
            status: "succeeded",
            outputs: outputs as object,
            completedAt,
          },
        });
        Object.assign(nodeRun, {
          status: "succeeded",
          outputs: outputs as object,
          completedAt,
        });
        completed.add(nodeId);
        changed = true;
      }),
    );
  }

  const allNodeRuns = await prisma.nodeRun.findMany({
    where: { workflowRunId },
  });
  const anyFailed = allNodeRuns.some((nr) => nr.status === "failed");
  const allDone = allNodeRuns.every(
    (nr) =>
      nr.status === "succeeded" || nr.status === "failed" || nr.status === "skipped",
  );

  if (allDone) {
    const completedAt = new Date();
    const durationMs = run.startedAt
      ? Math.round(completedAt.getTime() - run.startedAt.getTime())
      : null;
    await prisma.workflowRun.update({
      where: { id: workflowRunId },
      data: {
        status: anyFailed ? "failed" : "succeeded",
        completedAt,
        durationMs,
      },
    });
  }
}
