import type { MLCEngine } from "@mlc-ai/web-llm";
import type { LlmBackend } from "./types";

/**
 * WebLLM backend — runs a small instruct model FULLY in the browser via WebGPU.
 * No API key, no server. The model (~1GB) is downloaded on first load and cached
 * by the browser, so it is lazy-loaded only when the user opts in.
 */
export const DEFAULT_WEBLLM_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export type WebLLMStatus = "idle" | "loading" | "ready" | "error";

class WebLLMBackend implements LlmBackend {
  id = "webllm" as const;
  label = "In-browser AI (no key)";
  needsKey = false;
  supportsVision = false;

  private engine: MLCEngine | null = null;
  private modelId = DEFAULT_WEBLLM_MODEL;
  status: WebLLMStatus = "idle";
  progress = 0;
  progressText = "";
  error = "";

  static webgpuAvailable(): boolean {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  isReady(): boolean {
    return this.status === "ready" && this.engine != null;
  }

  async load(onUpdate?: () => void, modelId?: string): Promise<void> {
    if (this.status === "loading") return;
    if (!WebLLMBackend.webgpuAvailable()) {
      this.status = "error";
      this.error = "WebGPU is not available in this browser. Try Chrome/Edge, or use a Claude key / sample mode.";
      onUpdate?.();
      throw new Error(this.error);
    }
    this.modelId = modelId ?? this.modelId;
    this.status = "loading";
    this.error = "";
    onUpdate?.();
    try {
      // Lazy-load the ~6MB WebLLM runtime only when the user opts in.
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: (r) => {
          this.progress = r.progress ?? 0;
          this.progressText = r.text ?? "";
          onUpdate?.();
        },
      });
      this.status = "ready";
      onUpdate?.();
    } catch (e) {
      this.status = "error";
      this.error = e instanceof Error ? e.message : String(e);
      onUpdate?.();
      throw e;
    }
  }

  async chat({
    system,
    user,
    maxTokens,
  }: {
    system: string;
    user: string;
    images?: string[];
    maxTokens?: number;
  }): Promise<string> {
    if (!this.engine) throw new Error("In-browser model is not loaded yet.");
    const res = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens ?? 1200,
      temperature: 0.2,
    });
    return res.choices[0]?.message?.content ?? "";
  }
}

/** Single shared instance so the model is loaded once per session. */
export const webllmBackend = new WebLLMBackend();
export { WebLLMBackend };
