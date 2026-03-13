import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import type { RoundtableSession, SessionMode, VoteOption, RoundtableEvent } from "./types.js";

export const sessionStore = new Map<string, RoundtableSession>();
export const sessionEmitters = new Map<string, EventEmitter>();

export function createSession(params: {
  question: string;
  models: string[];
  options: VoteOption[];
  mode?: SessionMode;
  consensusThreshold?: number;
  maxRounds?: number;

}): RoundtableSession {
  const id = uuidv4();
  const modelCount = params.models.length;
  const mode = params.mode ?? "roundtable";

  // Expert panel always 1 round; roundtable defaults to 2
  const defaultMaxRounds = mode === "expert_panel" ? 1 : 2;

  const session: RoundtableSession = {
    id,
    mode,
    question: params.question,
    options: params.options,
    models: params.models,
    consensusThreshold:
      params.consensusThreshold ?? modelCount,
    maxRounds: mode === "expert_panel" ? 1 : (params.maxRounds ?? defaultMaxRounds),
    rounds: [],
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sessionStore.set(id, session);
  sessionEmitters.set(id, new EventEmitter());

  return session;
}

export function emitSessionEvent(sessionId: string, event: RoundtableEvent) {
  const emitter = sessionEmitters.get(sessionId);
  if (emitter) {
    emitter.emit("event", event);
  }
}
