import { Opper } from "opperai";
import type { LLMClient, LLMCallParams, LLMCallResult, LLMModel } from "../llm-client.js";

const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class OpperClient implements LLMClient {
  private opper: Opper;
  private modelsCache: LLMModel[] | null = null;
  private modelsCacheTime = 0;

  constructor(apiKey: string) {
    this.opper = new Opper({ httpBearer: apiKey });
  }

  async call(params: LLMCallParams): Promise<LLMCallResult> {
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
  }

  async listModels(): Promise<LLMModel[]> {
    if (
      this.modelsCache &&
      Date.now() - this.modelsCacheTime < MODEL_CACHE_TTL_MS
    ) {
      return this.modelsCache;
    }

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
    }));
    this.modelsCacheTime = Date.now();
    return this.modelsCache;
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
