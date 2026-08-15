import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="w-full max-w-2xl px-6 py-20">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-8 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h1 className="text-3xl font-semibold tracking-tight">rizzLerAI</h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Workflow builder for multimodal AI pipelines.
          </p>
          <div className="mt-6">
            <Link
              href="/workflows"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Open Workflows
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
