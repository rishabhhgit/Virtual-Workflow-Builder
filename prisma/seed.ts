import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Prisma seed.");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_CLERK_ID = "demo_clerk_user";
const DEMO_WORKFLOW_NAME = "Marketing Kit Generator (Demo)";

function buildDemoWorkflow() {
  const nodes = [
    {
      id: "text_1",
      type: "text",
      position: { x: 120, y: 120 },
      data: {
        label: "Text",
        inputs: { text: "Generate a marketing kit for this product." },
        outputs: {},
      },
    },
    {
      id: "upload_image_1",
      type: "upload_image",
      position: { x: 120, y: 260 },
      data: { label: "Upload Image", inputs: {}, outputs: {} },
    },
    {
      id: "crop_image_1",
      type: "crop_image",
      position: { x: 420, y: 260 },
      data: {
        label: "Crop Image",
        inputs: { xPct: 10, yPct: 10, widthPct: 80, heightPct: 80 },
        outputs: {},
      },
    },
    {
      id: "llm_1",
      type: "llm",
      position: { x: 420, y: 120 },
      data: {
        label: "LLM (Gemini)",
        inputs: {
          system_prompt: "You are a senior marketing copywriter.",
          user_message: "Write ad copy and a short product description.",
        },
        outputs: {},
      },
    },
    {
      id: "upload_video_1",
      type: "upload_video",
      position: { x: 120, y: 420 },
      data: { label: "Upload Video", inputs: {}, outputs: {} },
    },
    {
      id: "extract_frame_1",
      type: "extract_frame",
      position: { x: 420, y: 420 },
      data: { label: "Extract Frame", inputs: { timestampSeconds: 1 }, outputs: {} },
    },
    {
      id: "llm_2",
      type: "llm",
      position: { x: 760, y: 240 },
      data: {
        label: "LLM (Final)",
        inputs: {
          system_prompt: "Return output as JSON with keys: headline, bullets, caption.",
          user_message:
            "Use the cropped image, extracted frame, and prior copy to produce a complete marketing kit.",
        },
        outputs: {},
      },
    },
  ];

  const edges = [
    { id: "e1", source: "upload_image_1", target: "crop_image_1" },
    { id: "e2", source: "text_1", target: "llm_1" },
    { id: "e3", source: "crop_image_1", target: "llm_2" },
    { id: "e4", source: "extract_frame_1", target: "llm_2" },
    { id: "e5", source: "llm_1", target: "llm_2" },
    { id: "e6", source: "upload_video_1", target: "extract_frame_1" },
  ];

  return { nodes, edges };
}

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: DEMO_CLERK_ID },
    update: {},
    create: { clerkId: DEMO_CLERK_ID },
  });

  const demoWorkflow = buildDemoWorkflow();

  await prisma.workflow.upsert({
    where: { id: `${user.id}_demo_workflow` },
    update: {
      name: DEMO_WORKFLOW_NAME,
      nodes: demoWorkflow.nodes,
      edges: demoWorkflow.edges,
    },
    create: {
      id: `${user.id}_demo_workflow`,
      userId: user.id,
      name: DEMO_WORKFLOW_NAME,
      nodes: demoWorkflow.nodes,
      edges: demoWorkflow.edges,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

