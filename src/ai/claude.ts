import type AnthropicNS from "@anthropic-ai/sdk";
import type { LlmBackend } from "./types";

/**
 * Claude backend — runs the Anthropic SDK directly in the browser with the
 * user's own API key (stored only in their browser). Model id follows the
 * claude-api skill guidance; thinking is disabled to keep JSON extraction fast
 * and to leave the whole token budget for the answer. The SDK is lazy-loaded so
 * it isn't shipped to visitors who don't use the Claude engine.
 */
export const DEFAULT_CLAUDE_MODEL = "claude-opus-5";

function dataUrlToSource(dataUrl: string):
  | { type: "base64"; media_type: string; data: string }
  | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  return { type: "base64", media_type: m[1], data: m[2] };
}

export function createClaudeBackend(getConfig: () => { apiKey: string; model: string }): LlmBackend {
  return {
    id: "claude",
    label: "Claude (your key)",
    needsKey: true,
    supportsVision: true,
    isReady: () => getConfig().apiKey.trim().length > 0,
    async chat({ system, user, images, maxTokens }) {
      const { apiKey, model } = getConfig();
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

      const content: AnthropicNS.MessageParam["content"] = [];
      for (const img of images ?? []) {
        const source = dataUrlToSource(img);
        if (source) content.push({ type: "image", source: source as never });
      }
      content.push({ type: "text", text: user });

      const res = await client.messages.create({
        model: model || DEFAULT_CLAUDE_MODEL,
        max_tokens: maxTokens ?? 1500,
        thinking: { type: "disabled" },
        system,
        messages: [{ role: "user", content }],
      });
      return res.content
        .filter((b): b is AnthropicNS.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    },
  };
}
