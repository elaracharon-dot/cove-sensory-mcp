import { Buffer } from "node:buffer";
import { validatePublicMediaUrl } from "./security.js";

export type MediaKind = "image" | "audio" | "video";

const ACCEPTED_MIME_PREFIX: Record<MediaKind, string> = {
  image: "image/",
  audio: "audio/",
  video: "video/"
};

export interface LoadedMedia {
  mimeType: string;
  base64: string;
  byteLength: number;
}

export async function loadPublicMedia(
  source: string,
  kind: MediaKind,
  maxBytes: number
): Promise<LoadedMedia> {
  const url = validatePublicMediaUrl(source);
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { accept: `${ACCEPTED_MIME_PREFIX[kind]}*` }
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("媒体网址发生跳转；请提供最终的直接下载网址。");
  }
  if (!response.ok || !response.body) {
    throw new Error(`无法读取媒体，远端返回 HTTP ${response.status}。`);
  }
  const mimeType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (!mimeType?.startsWith(ACCEPTED_MIME_PREFIX[kind])) {
    throw new Error(`媒体类型不匹配：需要 ${kind}，实际为 ${mimeType || "未知类型"}。`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`媒体超过云端版本的 ${Math.floor(maxBytes / 1024 / 1024)} MB 限制。`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`媒体超过云端版本的 ${Math.floor(maxBytes / 1024 / 1024)} MB 限制。`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { mimeType, base64: Buffer.from(bytes).toString("base64"), byteLength: total };
}
