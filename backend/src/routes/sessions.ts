import { Router } from "express";
import type { LLMClient } from "../llm-client.js";
import {
  createSession,
  sessionStore,
  emitSessionEvent,
} from "../sessions.js";
import { runSession } from "../orchestrator.js";

export function createSessionsRouter(client: LLMClient): Router {
  const router = Router();

  router.post("/api/sessions", (req, res) => {
    const { question, models, options, mode, consensusThreshold, maxRounds, contextRounds } =
      req.body;

    if (!question || !models?.length || !options?.length) {
      res.status(400).json({
        error: "question, models, and options are required",
      });
      return;
    }

    const session = createSession({
      question,
      models,
      options,
      mode,
      consensusThreshold,
      maxRounds,
      contextRounds,
    });

    // Start the session loop async
    runSession(session, client, (event) => {
      emitSessionEvent(session.id, event);
    }).catch((err) => {
      session.status = "error";
      emitSessionEvent(session.id, {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    });

    res.json({ sessionId: session.id });
  });

  router.get("/api/sessions/:id", (req, res) => {
    const session = sessionStore.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  });

  router.get("/api/models", async (_req, res) => {
    try {
      const models = await client.listModels();
      res.json(models);
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to list models",
      });
    }
  });

  return router;
}
