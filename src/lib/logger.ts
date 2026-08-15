const PREFIX = "[rizzLerAI]";

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.info(PREFIX, msg, meta ?? "");
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(PREFIX, msg, meta ?? "");
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(PREFIX, msg, meta ?? "");
  },
};
