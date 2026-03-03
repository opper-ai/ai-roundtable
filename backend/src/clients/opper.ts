import { Opper } from "opperai";
import type { LLMClient, LLMCallParams, LLMCallResult, LLMModel } from "../llm-client.js";

const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

const SHORTLISTED_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "xai",
  "evroc",
  "fireworks",
  "gcp",
]);

const SHORTLISTED_PATTERNS = [
  "gemini-3",
  "gemini-3.1",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.2",
  "glm-5",
  "kimi-k2.5",
  "claude-sonnet-4.6",
  "claude-opus-4.6",
  "grok-4-1",
];

function isShortlisted(modelId: string): boolean {
  const [provider, ...rest] = modelId.split("/");
  const name = rest.join("/") || modelId;
  if (!SHORTLISTED_PROVIDERS.has(provider)) return false;
  return SHORTLISTED_PATTERNS.some((p) => name.startsWith(p));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `[retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
          err instanceof Error ? err.message : err
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export class OpperClient implements LLMClient {
  private opper: Opper;
  private modelsCache: LLMModel[] | null = null;
  private modelsCacheTime = 0;

  constructor(apiKey: string) {
    this.opper = new Opper({ httpBearer: apiKey });
  }

  async call(params: LLMCallParams): Promise<LLMCallResult> {
    const label = params.model ?? params.name ?? "llm-call";
    return withRetry(async () => {
      const response = await this.opper.call({
        name: params.name ?? params.traceContext?.name ?? "roundtable-call",
        instructions: params.instructions,
        model: params.model,
        input: params.input,
        outputSchema: params.outputSchema,
        parentSpanId: params.traceContext?.parentId,
        tags: params.traceContext?.tags,
      });

      return {
        result: response.jsonPayload as Record<string, unknown>,
        spanId: response.spanId,
      };
    }, label);
  }

  async listModels(): Promise<LLMModel[]> {
    if (
      this.modelsCache &&
      Date.now() - this.modelsCacheTime < MODEL_CACHE_TTL_MS
    ) {
      return this.modelsCache;
    }

    return withRetry(async () => {
      const res = await fetch(
        "https://api.opper.ai/static/data/language_models.json"
      );
      if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
      const data = (await res.json()) as Array<{
        hosting_provider: string;
        name: string;
        location: string;
      }>;
      this.modelsCache = data.map((m) => ({
        id: m.name,
        name: m.name.split("/").pop() ?? m.name,
        provider: m.hosting_provider,
        shortlisted: isShortlisted(m.name),
      }));
      this.modelsCacheTime = Date.now();
      return this.modelsCache;
    }, "listModels");
  }

  async createTrace(
    name: string,
    input: Record<string, unknown>,
    parentId?: string
  ): Promise<{ id: string }> {
    const span = await this.opper.spans.create({
      name,
      startTime: new Date(),
      input,
      ...(parentId ? { parentId } : {}),
    });
    return { id: span.id };
  }

  async closeTrace(
    id: string,
    output: Record<string, unknown>
  ): Promise<void> {
    await this.opper.spans.update(id, {
      endTime: new Date(),
      output: JSON.stringify(output),
    });
  }
}
