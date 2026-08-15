import type { Edge, Node } from "@xyflow/react";

/** Port types for connection validation. Only compatible types can connect. */
export type PortType = "text" | "image" | "video";

export type WorkflowNodeType =
  | "text"
  | "upload_image"
  | "upload_video"
  | "llm"
  | "crop_image"
  | "extract_frame";

/** Base node data: id, type, and typed inputs/outputs. */
export type WorkflowNodeData = {
  label?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
};

export type WorkflowFlowNode = Node<WorkflowNodeData, WorkflowNodeType>;
export type WorkflowFlowEdge = Edge;

/** Per-node-type definition of input and output port types (handle id → port type). */
export type NodePortDef = {
  inputs: Record<string, PortType>;
  outputs: Record<string, PortType>;
};

/** Type-safe node registry: each node type declares its input/output port types. */
export const NODE_REGISTRY: Record<WorkflowNodeType, NodePortDef> = {
  text: {
    inputs: {},
    outputs: { default: "text" },
  },
  upload_image: {
    inputs: {},
    outputs: { default: "image" },
  },
  upload_video: {
    inputs: {},
    outputs: { default: "video" },
  },
  llm: {
    inputs: { default: "text", system_prompt: "text", user_message: "text", images: "image" },
    outputs: { default: "text" },
  },
  crop_image: {
    inputs: { default: "image", image_url: "image" },
    outputs: { default: "image" },
  },
  extract_frame: {
    inputs: { default: "video", video_url: "video" },
    outputs: { default: "image" },
  },
};

const DEFAULT_HANDLE = "default";

export function getOutputPortType(
  nodeType: WorkflowNodeType,
  handleId: string | null | undefined,
): PortType | undefined {
  const def = NODE_REGISTRY[nodeType];
  if (!def) return undefined;
  const id = handleId ?? DEFAULT_HANDLE;
  return def.outputs[id];
}

export function getInputPortType(
  nodeType: WorkflowNodeType,
  handleId: string | null | undefined,
): PortType | undefined {
  const def = NODE_REGISTRY[nodeType];
  if (!def) return undefined;
  const id = handleId ?? DEFAULT_HANDLE;
  return def.inputs[id];
}

