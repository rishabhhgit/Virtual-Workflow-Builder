# rizzLerAI

A **visual workflow builder** for AI and media pipelines. Create workflows with drag-and-drop nodes (text, images, video, LLM, crop, extract frame), connect them, and run—either in the browser or via background jobs.

---

## What it does

- **Canvas workflows** — Add nodes (Text, Upload Image/Video, LLM, Crop Image, Extract Frame), connect inputs/outputs, validate DAG.
- **Run & results** — Run the full workflow or selected nodes; see outputs in the History sidebar and on each node.
- **Auth & persistence** — Sign in with Clerk; workflows and runs stored in PostgreSQL.
- **Optional background runs** — Use [Trigger.dev](https://trigger.dev) for runs in a worker, or run in-process when not configured.

---

## Prerequisites

- **Node.js 20+**
- **PostgreSQL** (local or hosted, e.g. [Neon](https://neon.tech))
- **Clerk** account (auth)
- **Google AI** API key (Gemini, for LLM node)
- **Multer** handles image uploads (built-in, no external service needed)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd rizzLerAI
npm install
```

### 2. Environment

Copy the example env and fill in values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | From [Clerk](https://clerk.com) |
| `CLERK_SECRET_KEY` | Yes | From Clerk |
| `GEMINI_API_KEY` | Yes | For LLM node ([Google AI](https://aistudio.google.com/apikey)) |

| `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_REF` | Optional | For background runs ([Trigger.dev](https://cloud.trigger.dev)) |

Without Trigger, runs execute **in-process** in the Next.js server. With Trigger, start the worker (see below).

### 3. Database

```bash
npm run prisma:migrate
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, create or open a workflow, add nodes, connect them, and click **Run**.

---

## Background runs (optional)

To run workflows in a [Trigger.dev](https://trigger.dev) worker:

1. Create a project at [cloud.trigger.dev](https://cloud.trigger.dev) and add `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` to `.env`.
2. In a **second terminal**:

```bash
npm run dev:trigger
```

Keep this running while using **Run** so the worker can process jobs. If the worker isn’t running, the app falls back to in-process execution.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:trigger` | Start Trigger.dev worker (optional) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run prisma:migrate` | Apply DB migrations |
| `npm run typecheck` | TypeScript check |

---

## Tech stack

Next.js 16 · React 19 · Prisma · PostgreSQL · Clerk · React Flow · Trigger.dev · Google Gemini · Multer
