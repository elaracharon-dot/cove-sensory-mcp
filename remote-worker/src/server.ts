import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { analyzeWithGemini } from "./gemini.js";
import { loadPublicMedia, type MediaKind } from "./media.js";

interface SensoryEnvironment {
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
  MAX_MEDIA_BYTES?: string;
}

const mediaInput = z.object({
  source: z.string().url().describe("可直接下载媒体内容的公开 HTTPS 网址"),
  question: z.string().trim().max(2000).optional().describe("希望重点观察或回答的问题"),
  language: z.string().trim().min(2).max(20).default("zh-CN")
}).strict();

const toolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
};

function maxMediaBytes(env: SensoryEnvironment): number {
  const parsed = Number(env.MAX_MEDIA_BYTES ?? "8388608");
  return Number.isFinite(parsed) && parsed >= 1024 && parsed <= 20 * 1024 * 1024
    ? Math.floor(parsed)
    : 8 * 1024 * 1024;
}

function instructionFor(kind: MediaKind | "music", question: string | undefined, language: string): string {
  const focus = question?.trim() || {
    image: "准确描述画面、可见文字、重要对象、空间关系和可能需要注意的细节。",
    video: "按时间顺序描述主要画面、动作、可听内容和关键变化。",
    audio: "描述语音内容、说话者变化、环境声、情绪线索和关键时间点。",
    music: "分析音乐结构、节奏、配器、情绪变化、段落与关键时间点；除非用户明确要求，否则不要逐字转录歌词。"
  }[kind];
  return `你是谨慎、客观的多模态分析助手。请使用 ${language} 回答。用户关注：${focus}\n不要猜测无法从媒体确认的身份或事实；不确定时明确说明。`;
}

async function runAnalysis(
  env: SensoryEnvironment,
  kind: MediaKind | "music",
  input: z.infer<typeof mediaInput>
) {
  const mediaKind: MediaKind = kind === "music" ? "audio" : kind;
  const media = await loadPublicMedia(input.source, mediaKind, maxMediaBytes(env));
  const text = await analyzeWithGemini({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || "gemini-2.5-flash",
    media,
    instruction: instructionFor(kind, input.question, input.language)
  });
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: {
      kind,
      mimeType: media.mimeType,
      byteLength: media.byteLength,
      analysis: text
    }
  };
}

export function createSensoryServer(env: SensoryEnvironment): McpServer {
  const server = new McpServer({ name: "cove-sensory-mcp", version: "0.1.0-remote" });

  server.registerTool(
    "sensory_status",
    {
      title: "检查感官 MCP 状态",
      description: "检查远程感官服务是否已配置，不会显示任何密钥。",
      inputSchema: z.object({}).strict(),
      annotations: { ...toolAnnotations, idempotentHint: true, openWorldHint: false }
    },
    async () => ({
      content: [{
        type: "text",
        text: env.GEMINI_API_KEY
          ? "云端感官服务已配置，可分析公开 HTTPS 图片、音频、音乐和小型视频。"
          : "尚未配置 GEMINI_API_KEY。"
      }],
      structuredContent: {
        configured: Boolean(env.GEMINI_API_KEY),
        provider: "gemini",
        model: env.GEMINI_MODEL || "gemini-2.5-flash",
        maxMediaBytes: maxMediaBytes(env),
        acceptedSources: ["public_https_url"]
      }
    })
  );

  server.registerTool(
    "sensory_setup_guide",
    {
      title: "查看感官 MCP 使用方法",
      description: "说明云端版本支持的媒体来源、限制和安全边界。",
      inputSchema: z.object({}).strict(),
      annotations: { ...toolAnnotations, idempotentHint: true, openWorldHint: false }
    },
    async () => ({
      content: [{
        type: "text",
        text: "请提供可直接下载内容的公开 HTTPS 媒体网址。云端版本不读取手机或电脑本地路径，不跟随跳转，默认单个媒体不超过 8 MB。API 密钥只保存在 Cloudflare Secret 中。"
      }]
    })
  );

  const tools: ReadonlyArray<{
    name: string;
    title: string;
    description: string;
    kind: MediaKind | "music";
  }> = [
    { name: "sense_image", title: "观察图片", description: "读取公开 HTTPS 图片并回答视觉问题，包括画面和可见文字。", kind: "image" },
    { name: "sense_video", title: "观察视频", description: "读取小型公开 HTTPS 视频并分析画面、动作与可听内容。", kind: "video" },
    { name: "sense_audio", title: "聆听音频", description: "读取公开 HTTPS 音频并分析语音和环境声。", kind: "audio" },
    { name: "sense_music", title: "聆听音乐", description: "读取公开 HTTPS 音乐并分析结构、节奏、配器与情绪变化。", kind: "music" }
  ];

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: mediaInput,
        annotations: toolAnnotations
      },
      async (input) => {
        try {
          return await runAnalysis(env, tool.kind, input);
        } catch (error) {
          const message = error instanceof Error ? error.message : "媒体分析失败。";
          return {
            isError: true,
            content: [{ type: "text" as const, text: message }],
            structuredContent: { error: message }
          };
        }
      }
    );
  }

  return server;
}
