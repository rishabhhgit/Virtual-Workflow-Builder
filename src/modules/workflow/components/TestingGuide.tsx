"use client";

import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { useState } from "react";

export function TestingGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-zinc-200 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <HelpCircle className="h-4 w-4 shrink-0 text-violet-500" />
        How to test nodes
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4 text-xs text-zinc-600 dark:text-zinc-400">
          <section>
            <div className="font-medium text-zinc-800 dark:text-zinc-200">1. Text → LLM (easiest)</div>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Add <strong>Text</strong> and <strong>LLM (Gemini)</strong>.</li>
              <li>Connect Text output (right handle) → LLM &quot;default&quot; (left handle).</li>
              <li>In Text node, type e.g. &quot;What is 2+2?&quot;</li>
              <li>In LLM, set System prompt (optional) and User message (or leave blank to use Text).</li>
              <li>Click <strong>Validate DAG</strong>, then <strong>Run</strong>. Check history for LLM output.</li>
            </ul>
            <p className="mt-1 text-zinc-500 dark:text-zinc-500">Requires: GEMINI_API_KEY, Trigger.dev.</p>
          </section>
          <section>
            <div className="font-medium text-zinc-800 dark:text-zinc-200">2. Upload Image → Crop Image</div>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Add <strong>Upload Image</strong> and <strong>Crop Image</strong>.</li>
              <li>Connect Upload Image output → Crop Image input.</li>
              <li>In Upload Image, choose an image (preview works in UI).</li>
              <li>In Crop Image, set X%, Y%, Width%, Height% (default 10,10,80,80).</li>
              <li>Run: Crop runs on Trigger.dev; Upload uses a blob URL that only works in-browser, so Crop may fail unless you use a public image URL later (e.g. Transloadit).</li>
            </ul>
          </section>
          <section>
            <div className="font-medium text-zinc-800 dark:text-zinc-200">3. Upload Video → Extract Frame</div>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Add <strong>Upload Video</strong> and <strong>Extract Frame</strong>.</li>
              <li>Connect Upload Video output → Extract Frame input.</li>
              <li>In Upload Video, choose a video. In Extract Frame, set timestamp (seconds).</li>
              <li>Run: same blob-URL note as above for server-side execution.</li>
            </ul>
          </section>
          <section>
            <div className="font-medium text-zinc-800 dark:text-zinc-200">4. LLM with image (multi-input)</div>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Connect an image source (Upload Image or Crop Image output) to LLM &quot;images&quot; input when that port is available.</li>
              <li>LLM accepts: system_prompt, user_message, default (text), images (image URLs).</li>
            </ul>
          </section>
          <p className="text-zinc-500 dark:text-zinc-500">
            Port types: text ↔ text, image ↔ image, video ↔ video. Use <strong>Validate DAG</strong> before Run to ensure no cycles.
          </p>
        </div>
      )}
    </div>
  );
}
