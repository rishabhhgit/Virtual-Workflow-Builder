import { z } from "zod";

export const workflowIdSchema = z.string().min(1, "Workflow ID is required").max(128);
export const workflowNameSchema = z.string().max(256).optional().default("Untitled workflow");

const nodePositionSchema = z.object({ x: z.number(), y: z.number() });
const nodeDataSchema = z.record(z.string(), z.unknown()).optional().default({});
export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: nodePositionSchema,
  data: nodeDataSchema,
});
export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

export const saveWorkflowSchema = z.object({
  workflowId: workflowIdSchema,
  name: z.string().max(256),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export const startWorkflowRunSchema = z.object({
  workflowId: workflowIdSchema,
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;
export type StartWorkflowRunInput = z.infer<typeof startWorkflowRunSchema>;
