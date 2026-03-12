import type { VoteOption, LLMModel, SessionMode } from "../types";

const API_BASE = "/api";

export async function createSession(params: {
  question: string;
  models: string[];
  options: VoteOption[];
  mode?: SessionMode;
  consensusThreshold?: number;
  maxRounds?: number;
  contextRounds?: number;
}): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchModels(): Promise<LLMModel[]> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
