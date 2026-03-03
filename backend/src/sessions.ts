import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import type { RoundtableSession, VoteOption, RoundtableEvent } from "./types.js";

export const sessionStore = new Map<string, RoundtableSession>();
export const sessionEmitters = new Map<string, EventEmitter>();

export function createSession(params: {
  question: string;
  models: string[];
  options: VoteOption[];
  consensusThreshold?: number;
  maxRounds?: number;
  contextRounds?: number;
}): RoundtableSession {
  const id = uuidv4();
  const modelCount = params.models.length;

  const session: RoundtableSession = {
    id,
    question: params.question,
    options: params.options,
    models: params.models,
    consensusThreshold:
      params.consensusThreshold ?? modelCount,
    maxRounds: params.maxRounds ?? 6,
    contextRounds: params.contextRounds,
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
