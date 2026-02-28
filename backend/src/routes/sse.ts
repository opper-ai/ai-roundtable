import { Router } from "express";
import { sessionStore, sessionEmitters } from "../sessions.js";
import type { RoundtableEvent } from "../types.js";

export function createSSERouter(): Router {
  const router = Router();

  router.get("/api/sessions/:id/events", (req, res) => {
    const sessionId = req.params.id;
    const session = sessionStore.get(sessionId);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send current state immediately (for reconnections)
    res.write(
      `data: ${JSON.stringify({ type: "session_created", session })}\n\n`
    );

    // Also replay any existing rounds
    for (const round of session.rounds) {
      res.write(
        `data: ${JSON.stringify({ type: "round_completed", round })}\n\n`
      );
    }

    const emitter = sessionEmitters.get(sessionId);
    if (!emitter) {
      res.end();
      return;
    }

    const onEvent = (event: RoundtableEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    emitter.on("event", onEvent);

    req.on("close", () => {
      emitter.off("event", onEvent);
    });
  });

  return router;
}
