import type { LoadedMedia } from "./media.js";

interface GeminiTextPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiTextPart[] } }>;
  error?: { message?: string };
}

export async function analyzeWithGemini(options: {
  apiKey: string;
  model: string;
  media: LoadedMedia;
  instruction: string;
}): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": options.apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: options.instruction },
            {
              inline_data: {
                mime_type: options.media.mimeType,
                data: options.media.base64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    })
  });
  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    const safeMessage = response.status === 401 || response.status === 403
      ? "Gemini API 密钥无效或没有使用权限。"
      : `Gemini 分析请求失败（HTTP ${response.status}）。`;
    throw new Error(safeMessage);
  }
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini 没有返回可读的分析结果。");
  return text;
}
