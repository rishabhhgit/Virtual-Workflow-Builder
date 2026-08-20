"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeTypes,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Download, FolderInput, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getWorkflowRunDetails,
  saveWorkflow,
  startWorkflowRun,
  type WorkflowRunListItem,
  type WorkflowRunDetail,
} from "@/app/(app)/workflows/[workflowId]/actions";
import { AnimatedEdge } from "@/modules/workflow/components/AnimatedEdge";
import { getRunnableNodeIds, validateDAG, type DAGValidationResult } from "@/modules/execution";
import {
  CropImageNode,
  ExtractFrameNode,
  LLMNode,
  TextNode,
  UploadImageNode,
  UploadVideoNode,
} from "@/modules/workflow/components/nodes";
import { NodePalette } from "@/modules/workflow/components/NodePalette";
import { RunHistorySidebar } from "@/modules/workflow/components/RunHistorySidebar";
import { useWorkflowBuilderStore } from "@/modules/workflow/store/useWorkflowBuilderStore";
import {
  getInputPortType,
  getOutputPortType,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
  type WorkflowNodeType,
} from "@/modules/workflow/types";

function normalizeEdges(edges: WorkflowFlowEdge[]): WorkflowFlowEdge[] {
  return edges.map((e) => ({
    ...e,
    type: e.type ?? "rizz",
  }));
}

function normalizeNodes(nodes: WorkflowFlowNode[]): WorkflowFlowNode[] {
  return nodes.map((n) => ({
    ...n,
    type: (n.type ?? "text") as WorkflowNodeType,
  }));
}

export function WorkflowBuilder(props: {
  workflowId: string;
  workflowName: string;
  initialNodes: WorkflowFlowNode[];
  initialEdges: WorkflowFlowEdge[];
  initialRuns: WorkflowRunListItem[];
}) {
  const { nodes, edges, initialize, onNodesChange, onEdgesChange, onConnect, undo, redo, canUndo, canRedo, addNode } =
    useWorkflowBuilderStore();
  const [workflowName, setWorkflowName] = useState(props.workflowName);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);
  const [dagValidation, setDagValidation] = useState<DAGValidationResult | null>(null);
  const [runState, setRunState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runningNodeIds, setRunningNodeIds] = useState<string[]>([]);
  const [lastRunDetails, setLastRunDetails] = useState<WorkflowRunDetail | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  useEffect(() => {
    setWorkflowName(props.workflowName);
  }, [props.workflowName]);

  useEffect(() => {
    const latest = props.initialRuns[0];
    if (!latest || latest.status === "running") return;
    let cancelled = false;
    getWorkflowRunDetails(latest.id).then((detail) => {
      if (!cancelled && detail) setLastRunDetails(detail);
    });
    return () => {
      cancelled = true;
    };
  }, [props.workflowId, props.initialRuns[0]?.id]);

  const performSave = useCallback(async () => {
    setSaveStatus("saving");
    setSaveError(null);
    const result = await saveWorkflow(props.workflowId, workflowName, nodes, edges);
    if (result.ok) {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveError(result.error);
      setSaveStatus("error");
    }
  }, [props.workflowId, workflowName, nodes, edges]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      performSave();
      autoSaveTimeoutRef.current = null;
    }, 2000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [nodes, edges, workflowName, performSave]);

  const handleExport = useCallback(() => {
    const payload = {
      name: workflowName,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data ?? {},
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-${workflowName.replace(/\s+/g, "-") || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflowName, nodes, edges]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = reader.result as string;
          const data = JSON.parse(raw) as { name?: string; nodes?: unknown[]; edges?: unknown[] };
          const importedNodes = Array.isArray(data.nodes) ? normalizeNodes(data.nodes as WorkflowFlowNode[]) : [];
          const importedEdges = Array.isArray(data.edges) ? normalizeEdges(data.edges as WorkflowFlowEdge[]) : [];
          if (typeof data.name === "string") setWorkflowName(data.name);
          initialize({ nodes: importedNodes, edges: importedEdges });
        } catch {
          setSaveError("Invalid JSON");
          setSaveStatus("error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [initialize]);

  const runDagValidation = useCallback(() => {
    setDagValidation(validateDAG(nodes, edges));
  }, [nodes, edges]);

  const runWorkflow = useCallback(async () => {
    const validation = validateDAG(nodes, edges);
    if (!validation.valid) {
      setRunError("Workflow has a cycle. Remove circular connections.");
      setRunState("error");
      return;
    }
    setRunState("running");
    setRunError(null);
    setCurrentRunId(null);
    setRunningNodeIds([]);
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    const runnableNodeIds =
      selectedIds.length > 0
        ? Array.from(getRunnableNodeIds(selectedIds, nodes, edges))
        : undefined;
    const result = await startWorkflowRun(props.workflowId, nodes, edges, {
      runnableNodeIds,
    });
    if (result.ok) {
      setCurrentRunId(result.workflowRunId);
      setRunCount((c) => c + 1);
      setRunningNodeIds(runnableNodeIds ?? nodes.map((n) => n.id));
    } else {
      setRunError(result.error);
      setRunState("error");
    }
  }, [nodes, edges, props.workflowId]);

  const RUN_POLL_INTERVAL_MS = 1500;
  const RUN_POLL_MAX_DURATION_MS = 10 * 60 * 1000;

  useEffect(() => {
    if (!currentRunId) return;
    const startedAt = Date.now();
    const intervalId = setInterval(async () => {
      if (Date.now() - startedAt > RUN_POLL_MAX_DURATION_MS) {
        clearInterval(intervalId);
        setCurrentRunId(null);
        setRunningNodeIds([]);
        setRunState("done");
        return;
      }
      const detail = await getWorkflowRunDetails(currentRunId);
      if (detail) {
        const running = detail.nodeRuns.filter((nr) => nr.status === "running").map((nr) => nr.nodeId);
        setRunningNodeIds(running);
        if (detail.status !== "running") {
          setLastRunDetails(detail);
          setCurrentRunId(null);
          setRunningNodeIds([]);
          setRunState("done");
        }
      }
    }, RUN_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [currentRunId]);

  const isValidConnection = useCallback(
    (edgeOrConnection: Connection | WorkflowFlowEdge): boolean => {
      if ("id" in edgeOrConnection) return true;
      const connection = edgeOrConnection as Connection;
      const { source, sourceHandle, target, targetHandle } = connection;
      if (!source || !target) return false;

      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return false;

      const sourceType = sourceNode.type as WorkflowNodeType;
      const targetType = targetNode.type as WorkflowNodeType;

      const outPort = getOutputPortType(sourceType, sourceHandle ?? undefined);
      const inPort = getInputPortType(targetType, targetHandle ?? undefined);

      if (outPort == null || inPort == null) return false;
      return outPort === inPort;
    },
    [nodes],
  );

  const DRAFT_STORAGE_KEY_PREFIX = "rizz-draft-";

  useEffect(() => {
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${props.workflowId}`;
    let snapshot: { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] };
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw) as { nodes?: unknown[]; edges?: unknown[] };
          if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
            snapshot = {
              nodes: normalizeNodes(data.nodes as WorkflowFlowNode[]),
              edges: normalizeEdges(data.edges as WorkflowFlowEdge[]),
            };
            initialize(snapshot);
            return;
          }
        }
      } catch {
        // invalid draft: fall through to server data
      }
    }
    snapshot = {
      nodes: normalizeNodes(props.initialNodes),
      edges: normalizeEdges(props.initialEdges),
    };
    initialize(snapshot);
  }, [props.workflowId]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: init per workflow only

  useEffect(() => {
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${props.workflowId}`;
    const t = setTimeout(() => {
      if (typeof window !== "undefined" && nodes.length >= 0) {
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              nodes: nodes.map((n) => ({ ...n, data: n.data ?? {} })),
              edges: edges.map((e) => ({ ...e })),
            }),
          );
        } catch {
          // ignore quota or parse errors
        }
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [nodes, edges, props.workflowId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const nodeTypes = useMemo(() => {
    const types: NodeTypes = {
      text: TextNode,
      upload_image: UploadImageNode,
      upload_video: UploadVideoNode,
      llm: LLMNode,
      crop_image: CropImageNode,
      extract_frame: ExtractFrameNode,
    };
    return types;
  }, []);

  const edgeTypes = useMemo(() => {
    const types: EdgeTypes = {
      rizz: AnimatedEdge,
    };
    return types;
  }, []);

  const runOutputsByNodeId = useMemo(() => {
    if (!lastRunDetails?.nodeRuns?.length) return new Map<string, Record<string, unknown>>();
    const map = new Map<string, Record<string, unknown>>();
    for (const nr of lastRunDetails.nodeRuns) {
      if (nr.outputs && Object.keys(nr.outputs).length > 0) {
        map.set(nr.nodeId, nr.outputs);
      }
    }
    return map;
  }, [lastRunDetails]);

  const nodesWithRunningState = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isRunning: runningNodeIds.includes(n.id),
          runOutputs: runOutputsByNodeId.get(n.id),
        },
      })),
    [nodes, runningNodeIds, runOutputsByNodeId],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as WorkflowNodeType;
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode],
  );

  return (
    <div className="flex h-[calc(100vh-56px)] w-full">
      <NodePalette />

      <div className="relative flex-1">
        <div className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full max-w-[240px] truncate rounded border-0 bg-transparent text-sm font-semibold text-zinc-900 outline-none focus:ring-1 focus:ring-violet-500 dark:text-zinc-100"
              placeholder="Workflow name"
            />
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Cmd/Ctrl+Z undo / Shift+Cmd/Ctrl+Z redo / Auto-saves</div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={performSave}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
              title="Save"
            >
              <Save className="h-3.5 w-3.5" />
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
            </button>
            {saveError && (
              <span className="text-xs text-amber-600 dark:text-amber-400" title={saveError}>
                Save failed
              </span>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              title="Export JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              title="Import JSON"
            >
              <FolderInput className="h-4 w-4" />
            </button>
            <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
            <button
              type="button"
              onClick={runWorkflow}
              disabled={runState === "running" || !!currentRunId}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-600"
            >
              {runState === "running" || currentRunId ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Running...
                </>
              ) : (
                "Run"
              )}
            </button>
            {runState === "done" && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Done</span>
            )}
            {runState === "error" && runError && (
              <>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400" title={runError}>
                  {runError}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRunError(null);
                    runWorkflow();
                  }}
                  className="rounded-lg border border-amber-400 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  Retry
                </button>
              </>
            )}
            <button
              type="button"
              onClick={runDagValidation}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Validate DAG
            </button>
            {dagValidation !== null &&
              (dagValidation.valid ? (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Valid
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Cycle detected
                </span>
              ))}
            <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo()}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo()}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
            >
              Redo
            </button>
          </div>
        </div>

        <div ref={reactFlowWrapper} className="absolute inset-x-0 bottom-0 top-12">
          <ReactFlow
            nodes={nodesWithRunningState}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDragOver={onDragOver}
            onDrop={onDrop}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-zinc-50 dark:bg-zinc-950"
          >
            <Background variant={BackgroundVariant.Cross} gap={20} size={1} color="#e5e7eb" />
            <MiniMap pannable zoomable className="!bg-zinc-100 dark:!bg-zinc-800" />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      <RunHistorySidebar
        workflowId={props.workflowId}
        initialRuns={props.initialRuns}
        runCountTrigger={runCount}
      />
    </div>
  );
}
