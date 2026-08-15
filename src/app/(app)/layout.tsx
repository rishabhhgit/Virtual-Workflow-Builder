import Link from "next/link";

export default function AppLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="sticky top-0 z-20 h-14 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-4">
          <Link href="/workflows" className="text-sm font-semibold tracking-tight">
            rizzLerAI
          </Link>
          <span className="text-xs text-zinc-500">Local mode</span>
        </div>
      </header>

      {props.children}
    </div>
  );
}
