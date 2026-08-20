"use server";

import { prisma } from "@/lib/db";
import { requireDbUser } from "@/server/auth";

export type AIProviderConfig = {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function getProviders(): Promise<AIProviderConfig[]> {
  const user = await requireDbUser();
  const providers = await prisma.aIProvider.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    models: (p.models as string[]) ?? [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function createProvider(data: {
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
}): Promise<{ ok: boolean; provider?: AIProviderConfig; error?: string }> {
  try {
    const user = await requireDbUser();
    const provider = await prisma.aIProvider.create({
      data: {
        userId: user.id,
        name: data.name,
        type: data.type,
        baseUrl: data.baseUrl.replace(/\/+$/, ""),
        apiKey: data.apiKey,
        models: data.models,
      },
    });
    return {
      ok: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        models: (provider.models as string[]) ?? [],
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create provider" };
  }
}

export async function updateProvider(
  id: string,
  data: {
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
  },
): Promise<{ ok: boolean; provider?: AIProviderConfig; error?: string }> {
  try {
    const user = await requireDbUser();
    const existing = await prisma.aIProvider.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { ok: false, error: "Provider not found" };

    const provider = await prisma.aIProvider.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl.replace(/\/+$/, "") }),
        ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
        ...(data.models !== undefined && { models: data.models }),
      },
    });
    return {
      ok: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        models: (provider.models as string[]) ?? [],
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update provider" };
  }
}

export async function deleteProvider(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireDbUser();
    const existing = await prisma.aIProvider.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { ok: false, error: "Provider not found" };

    await prisma.aIProvider.delete({ where: { id } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete provider" };
  }
}

export async function testProvider(
  id: string,
): Promise<{ ok: boolean; response?: string; error?: string }> {
  try {
    const user = await requireDbUser();
    const provider = await prisma.aIProvider.findFirst({ where: { id, userId: user.id } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const models = (provider.models as string[]) ?? [];
    const model = models[0];
    if (!model) return { ok: false, error: "No models configured" };

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'ok' in one word." }],
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "No response";
    return { ok: true, response: text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
