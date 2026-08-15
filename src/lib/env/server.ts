import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1),
  // Trigger.dev (optional until we initialize Trigger in this repo)
  TRIGGER_API_KEY: z.string().min(1).optional(),
  TRIGGER_API_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("`serverEnv` must not be imported on the client.");
  }
}

export const serverEnv: ServerEnv = (() => {
  assertServerOnly();

  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    TRIGGER_API_KEY: process.env.TRIGGER_API_KEY,
    TRIGGER_API_URL: process.env.TRIGGER_API_URL,
  });
})();

