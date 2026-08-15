import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger, task } from "@trigger.dev/sdk/v3";

export const llmTask = task({
  id: "llm",
  run: async (payload: {
    systemPrompt: string;
    userMessage: string;
    images?: string[];
  }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
      { text: `System: ${payload.systemPrompt}\n\nUser: ${payload.userMessage}` },
    ];
    if (payload.images?.length) {
      for (const url of payload.images) {
        try {
          let base64: string;
          let mime = "image/png";
          if (url.startsWith("data:")) {
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mime = match[1];
              base64 = match[2];
            } else continue;
          } else {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            base64 = Buffer.from(buf).toString("base64");
            mime = res.headers.get("content-type") ?? "image/png";
          }
          parts.push({ inlineData: { mimeType: mime, data: base64 } });
        } catch (e) {
          logger.warn("Failed to fetch image for LLM", { url: url.slice(0, 50), error: String(e) });
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.generateContent({ contents: [{ role: "user", parts }] } as any);
    const text = result.response.text() ?? "";
    return { text };
  },
});
