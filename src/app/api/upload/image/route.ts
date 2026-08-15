import { auth } from "@clerk/nextjs/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") ?? formData.get("image");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const filename = `rizz-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;
    return Response.json({ url });
  } catch (err) {
    console.error("Upload image API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
