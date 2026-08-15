import { logger, task } from "@trigger.dev/sdk/v3";

/**
 * Crop Image task (FFmpeg stub). Real crop (e.g. FFmpeg/Sharp) is not implemented;
 * the task returns the input imageUrl unchanged so the pipeline can still run.
 */
export const cropImageTask = task({
  id: "crop-image",
  run: async (payload: {
    imageUrl: string;
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  }) => {
    logger.info("Crop image (FFmpeg stub)", { imageUrl: payload.imageUrl });
    return {
      imageUrl: payload.imageUrl,
      message: "FFmpeg crop not implemented; returning original URL",
    };
  },
});
