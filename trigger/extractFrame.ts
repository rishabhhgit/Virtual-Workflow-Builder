import { logger, task } from "@trigger.dev/sdk/v3";

/**
 * Extract Frame task (FFmpeg stub). Real frame extraction (e.g. FFmpeg) is not implemented;
 * the task returns the input videoUrl as a placeholder imageUrl so the pipeline can still run.
 */
export const extractFrameTask = task({
  id: "extract-frame",
  run: async (payload: { videoUrl: string; timestampSeconds: number }) => {
    logger.info("Extract frame (FFmpeg stub)", {
      videoUrl: payload.videoUrl,
      timestamp: payload.timestampSeconds,
    });
    return {
      imageUrl: payload.videoUrl,
      message: "FFmpeg extract frame not implemented; returning video URL as placeholder",
    };
  },
});
