"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function AnimatedEdge(props: EdgeProps) {
  const [edgePath] = getBezierPath(props);

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={props.markerEnd}
      style={props.style}
      className="rizz-edge-path rizz-edge-path--animated"
    />
  );
}

