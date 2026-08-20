"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  TestTube,
  Check,
  X,
  Loader2,
  ExternalLink,
  Copy,
} from "lucide-react";
import {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  type AIProviderConfig,
} from "./actions";

type FormData = {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string;
};

const PRESETS: { name: string; baseUrl: string; placeholder: string }[] = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", placeholder: "sk-..." },
  { name: "Together AI", baseUrl: "https://api.together.xyz/v1", placeholder: "..." },
  { name: "Groq", baseUrl: "https://api.groq.com/openai/v1", placeholder: "gsk_..." },
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", placeholder: "sk-or-..." },
  { name: "Fireworks", baseUrl: "https://api.fireworks.ai/inference/v1", placeholder: "fw_..." },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", placeholder: "sk-..." },
  { name: "Custom", baseUrl: "", placeholder: "API key" },
];

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", baseUrl: "", apiKey: "", models: "" });
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const loadProviders = useCallback(async () => {
    const data = await getProviders();
    setProviders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const resetForm = () => {
    setForm({ name: "", baseUrl: "", apiKey: "", models: "" });
    setEditingId(null);
    setShowForm(false);
    setSelectedPreset("");
  };

  const handlePreset = (presetName: string) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setSelectedPreset(presetName);
    setForm((f) => ({
      ...f,
      name: f.name || preset.name,
      baseUrl: preset.baseUrl,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const models = form.models
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);

    if (editingId) {
      const result = await updateProvider(editingId, {
        name: form.name,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        models,
      });
      if (result.ok && result.provider) {
        setProviders((prev) => prev.map((p) => (p.id === editingId ? result.provider! : p)));
        resetForm();
      }
    } else {
      const result = await createProvider({
        name: form.name,
        type: "openai-compatible",
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        models,
      });
      if (result.ok && result.provider) {
        setProviders((prev) => [...prev, result.provider!]);
        resetForm();
      }
    }
    setSaving(false);
  };

  const handleEdit = (provider: AIProviderConfig) => {
    setForm({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      models: provider.models.join("\n"),
    });
    setEditingId(provider.id);
    setShowForm(true);
    setSelectedPreset("");
  };

  const handleDelete = async (id: string) => {
    const result = await deleteProvider(id);
    if (result.ok) {
      setProviders((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    const result = await testProvider(id);
    setTestResult({
      id,
      ok: result.ok,
      message: result.ok ? result.response! : result.error!,
    });
    setTesting(null);
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          AI Providers
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Configure custom OpenAI-compatible API endpoints and models for LLM nodes.
        </p>
      </div>

      {!showForm && (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="mb-6 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {editingId ? "Edit Provider" : "Add Provider"}
          </h3>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Quick Start
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePreset(preset.name)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedPreset === preset.name
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="My OpenAI API"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Base URL <span className="text-zinc-400">(OpenAI-compatible endpoint)</span>
              </label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                API Key
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder={
                  selectedPreset
                    ? PRESETS.find((p) => p.name === selectedPreset)?.placeholder
                    : "API key"
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Models <span className="text-zinc-400">(one per line)</span>
              </label>
              <textarea
                value={form.models}
                onChange={(e) => setForm((f) => ({ ...f, models: e.target.value }))}
                placeholder={"gpt-4o\ngpt-4o-mini\ngpt-3.5-turbo"}
                rows={4}
                className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name || !form.baseUrl || !form.apiKey}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : providers.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No AI providers configured yet.
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Add a provider to use custom models in your LLM nodes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {provider.name}
                    </h3>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {provider.type}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="truncate">{provider.baseUrl}</span>
                    <a
                      href={provider.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400">Key:</span>
                    <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      {provider.apiKey.slice(0, 8)}...{provider.apiKey.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyApiKey(provider.apiKey)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      title="Copy API key"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  {provider.models.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {provider.models.map((model) => (
                        <span
                          key={model}
                          className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTest(provider.id)}
                    disabled={testing === provider.id}
                    className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="Test connection"
                  >
                    {testing === provider.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <TestTube className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(provider)}
                    className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(provider.id)}
                    className="rounded-lg border border-zinc-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950/20"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {testResult?.id === provider.id && (
                <div
                  className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    testResult.ok
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  }`}
                >
                  {testResult.ok ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{testResult.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
