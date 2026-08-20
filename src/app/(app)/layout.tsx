import Link from "next/link";

export default function AppLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="sticky top-0 z-20 h-14 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/workflows" className="text-sm font-semibold tracking-tight">
              Virtual Workflow Builder
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/workflows"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Workflows
              </Link>
              <Link
                href="/ai-providers"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                AI Providers
              </Link>
            </nav>
          </div>
          <span className="text-xs text-zinc-500">Local mode</span>
        </div>
      </header>

      {props.children}
    </div>
  );
}
