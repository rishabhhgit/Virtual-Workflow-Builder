/**
 * Marketing Kit Generator template: parallel branches (image + video) converging into final LLM.
 * Branch A: Upload Image → Crop → Text → LLM #1
 * Branch B: Upload Video → Extract Frame
 * Final: LLM #2 (waits for LLM #1, cropped image, extracted frame)
 */

export const MARKETING_KIT_TEMPLATE_NAME = "Marketing Kit Generator";

export const marketingKitNodes = [
  {
    id: "text_1",
    type: "text" as const,
    position: { x: 120, y: 120 },
    data: {
      inputs: { text: "Generate a marketing kit for this product." },
      outputs: {},
    },
  },
  {
    id: "upload_image_1",
    type: "upload_image" as const,
    position: { x: 120, y: 260 },
    data: { inputs: {}, outputs: {} },
  },
  {
    id: "crop_image_1",
    type: "crop_image" as const,
    position: { x: 420, y: 260 },
    data: {
      inputs: { xPct: 10, yPct: 10, widthPct: 80, heightPct: 80 },
      outputs: {},
    },
  },
  {
    id: "llm_1",
    type: "llm" as const,
    position: { x: 420, y: 120 },
    data: {
      inputs: {
        system_prompt: "You are a senior marketing copywriter.",
        user_message: "Write ad copy and a short product description.",
      },
      outputs: {},
    },
  },
  {
    id: "upload_video_1",
    type: "upload_video" as const,
    position: { x: 120, y: 420 },
    data: { inputs: {}, outputs: {} },
  },
  {
    id: "extract_frame_1",
    type: "extract_frame" as const,
    position: { x: 420, y: 420 },
    data: { inputs: { timestampSeconds: 1 }, outputs: {} },
  },
  {
    id: "llm_2",
    type: "llm" as const,
    position: { x: 760, y: 240 },
    data: {
      inputs: {
        system_prompt: "Return output as JSON with keys: headline, bullets, caption.",
        user_message:
          "Use the cropped image, extracted frame, and prior copy to produce a complete marketing kit.",
      },
      outputs: {},
    },
  },
];

export const marketingKitEdges = [
  { id: "e1", source: "upload_image_1", target: "crop_image_1", type: "rizz" as const },
  { id: "e2", source: "text_1", target: "llm_1", type: "rizz" as const },
  { id: "e3", source: "crop_image_1", target: "llm_2", type: "rizz" as const },
  { id: "e4", source: "extract_frame_1", target: "llm_2", type: "rizz" as const },
  { id: "e5", source: "llm_1", target: "llm_2", type: "rizz" as const },
  { id: "e6", source: "upload_video_1", target: "extract_frame_1", type: "rizz" as const },
];
