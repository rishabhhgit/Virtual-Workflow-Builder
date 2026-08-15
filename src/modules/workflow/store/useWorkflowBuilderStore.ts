import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type {
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeData,
  WorkflowNodeType,
} from "@/modules/workflow/types";

type FlowSnapshot = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
};

const MAX_HISTORY = 50;

const NODE_OFFSET_X = 280;
const NODE_OFFSET_Y = 180;

type WorkflowBuilderState = {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];

  past: FlowSnapshot[];
  future: FlowSnapshot[];

  initialize: (snapshot: FlowSnapshot) => void;
  addNode: (type: WorkflowNodeType, position?: { x: number; y: number }) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (params: Connection) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

function clampHistory(past: FlowSnapshot[]) {
  if (past.length <= MAX_HISTORY) return past;
  return past.slice(past.length - MAX_HISTORY);
}

const workflowBuilderImpl = (set: (partial: Partial<WorkflowBuilderState> | ((s: WorkflowBuilderState) => Partial<WorkflowBuilderState>)) => void, get: () => WorkflowBuilderState): WorkflowBuilderState => ({
  nodes: [],
  edges: [],
  past: [],
  future: [],

  initialize: (snapshot) => {
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      past: [],
      future: [],
    });
  },

  addNode: (type, position) => {
    const state = get();
    const count = state.nodes.length;
    const x = position?.x ?? 80 + (count % 4) * NODE_OFFSET_X;
    const y = position?.y ?? 80 + Math.floor(count / 4) * NODE_OFFSET_Y;
    const newNode: WorkflowFlowNode = {
      id: crypto.randomUUID(),
      type,
      position: { x, y },
      data: { inputs: {}, outputs: {} },
    };
    set((s) => {
      const prev: FlowSnapshot = { nodes: s.nodes, edges: s.edges };
      return {
        nodes: [...s.nodes, newNode],
        past: clampHistory([...s.past, prev]),
        future: [],
      };
    });
  },

  onNodesChange: (changes) => {
    set((state) => {
      const prev: FlowSnapshot = { nodes: state.nodes, edges: state.edges };
      const nextNodes = applyNodeChanges(changes, state.nodes) as WorkflowFlowNode[];

      const isMeaningful = changes.some((c) => c.type !== "select");
      if (!isMeaningful) return { nodes: nextNodes };

      return {
        nodes: nextNodes,
        past: clampHistory([...state.past, prev]),
        future: [],
      };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const prev: FlowSnapshot = { nodes: state.nodes, edges: state.edges };
      const nextEdges = applyEdgeChanges(changes, state.edges) as WorkflowFlowEdge[];

      const isMeaningful = changes.some((c) => c.type !== "select");
      if (!isMeaningful) return { edges: nextEdges };

      return {
        edges: nextEdges,
        past: clampHistory([...state.past, prev]),
        future: [],
      };
    });
  },

  onConnect: (params) => {
    set((state) => {
      const prev: FlowSnapshot = { nodes: state.nodes, edges: state.edges };

      const nextEdges = addEdge(
        {
          ...params,
          type: "rizz",
        },
        state.edges,
      );

      return {
        edges: nextEdges,
        past: clampHistory([...state.past, prev]),
        future: [],
      };
    });
  },

  updateNodeData: (nodeId, data) => {
    set((state) => {
      const prev: FlowSnapshot = { nodes: state.nodes, edges: state.edges };
      const nextNodes = state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, ...data } as WorkflowNodeData }
          : n,
      );
      return {
        nodes: nextNodes,
        past: clampHistory([...state.past, prev]),
        future: [],
      };
    });
  },

  undo: () => {
    set((state) => {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;

      const current: FlowSnapshot = { nodes: state.nodes, edges: state.edges };
      return {
        nodes: previous.nodes,
        edges: previous.edges,
        past: state.past.slice(0, -1),
        future: [current, ...state.future],
      };
    });
  },

  redo: () => {
    set((state) => {
      const next = state.future[0];
      if (!next) return state;

      const current: FlowSnapshot = { nodes: state.nodes, edges: state.edges };
      return {
        nodes: next.nodes,
        edges: next.edges,
        past: clampHistory([...state.past, current]),
        future: state.future.slice(1),
      };
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
});

export const useWorkflowBuilderStore = create<WorkflowBuilderState>()(
  devtools(workflowBuilderImpl, { name: "workflow-builder" }),
);

