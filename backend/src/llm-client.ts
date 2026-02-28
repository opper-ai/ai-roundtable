export interface LLMCallParams {
  name?: string;
  model: string;
  instructions: string;
  input: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  traceContext?: {
    parentId: string;
    name: string;
    tags?: Record<string, string>;
  };
}

export interface LLMCallResult {
  result: Record<string, unknown>;
  spanId?: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
}

export interface LLMClient {
  call(params: LLMCallParams): Promise<LLMCallResult>;
  listModels(): Promise<LLMModel[]>;
  createTrace?(
    name: string,
    input: Record<string, unknown>,
    parentId?: string
  ): Promise<{ id: string }>;
  closeTrace?(id: string, output: Record<string, unknown>): Promise<void>;
}
