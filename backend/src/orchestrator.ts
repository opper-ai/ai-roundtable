import type { LLMClient } from "./llm-client.js";
import type {
  RoundtableSession,
  ModelResponse,
  Round,
  RoundtableEvent,
} from "./types.js";
import { modelRoundOutputJsonSchema } from "./schemas.js";
import { checkConsensus } from "./consensus.js";
import { logModelCall, logSessionSummary } from "./run-logger.js";
import { generateRoundSummary, generateFinalSummary } from "./summarizer.js";

type EventCallback = (event: RoundtableEvent) => void;

export async function runRoundtable(
  session: RoundtableSession,
  client: LLMClient,
  emit: EventCallback
): Promise<void> {
  const optionIds = session.options.map((o) => o.id);
  const outputSchema = modelRoundOutputJsonSchema(optionIds);

  // Create a trace for the whole session if the client supports it
  let traceId: string | undefined;
  if (client.createTrace) {
    const trace = await client.createTrace(`roundtable/${session.id}`, {
      question: session.question,
      models: session.models,
      options: session.options,
    });
    traceId = trace.id;
    session.traceId = traceId;
  }

  session.status = "running";
  emit({ type: "session_created", session });

  for (let roundNum = 1; roundNum <= session.maxRounds; roundNum++) {
    emit({ type: "round_started", roundNumber: roundNum });

    // Create a round-level span nested under the session trace
    let roundSpanId: string | undefined;
    if (client.createTrace && traceId) {
      const roundTrace = await client.createTrace(
        `round-${roundNum}`,
        { round: roundNum },
        traceId
      );
      roundSpanId = roundTrace.id;
    }

    const round: Round = {
      roundNumber: roundNum,
      responses: [],
      startedAt: new Date().toISOString(),
      voteDistribution: {},
    };

    // Call all models in parallel
    const modelCalls = session.models.map(async (modelId) => {
      const instructions = buildInstructions(session, roundNum, modelId);
      try {
        const result = await client.call({
          name: "roundtable",
          model: modelId,
          instructions,
          input: {
            question: session.question,
            options: session.options,
            round: roundNum,
          },
          outputSchema: outputSchema as Record<string, unknown>,
          traceContext: (roundSpanId || traceId)
            ? {
                parentId: roundSpanId ?? traceId!,
                name: modelId.replace(/\//g, "-"),
                tags: {
                  session: session.id,
                  round: String(roundNum),
                  model: modelId,
                },
              }
            : undefined,
        });

        const output = result.result as {
          vote: string;
          reasoning: string;
          attributedTo: string | null;
        };

        logModelCall(session.id, roundNum, modelId, instructions, {
          question: session.question,
          options: session.options,
          round: roundNum,
        }, output);

        const previousVote = findPreviousVote(session, modelId);

        const response: ModelResponse = {
          modelId,
          modelLabel: modelId.split("/").pop() ?? modelId,
          vote: output.vote,
          reasoning: output.reasoning,
          attributedTo: output.attributedTo ?? undefined,
          voteChanged: previousVote !== null && previousVote !== output.vote,
          spanId: result.spanId,
          completedAt: new Date().toISOString(),
        };

        round.responses.push(response);
        emit({ type: "model_response", roundNumber: roundNum, response });

        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        console.error(`Model ${modelId} failed in round ${roundNum}:`, errorMsg);
        logModelCall(session.id, roundNum, modelId, instructions, {
          question: session.question,
          options: session.options,
          round: roundNum,
        }, null, errorMsg);

        const response: ModelResponse = {
          modelId,
          modelLabel: modelId.split("/").pop() ?? modelId,
          vote: "ERROR",
          reasoning: `Failed to respond: ${errorMsg}`,
          voteChanged: false,
          completedAt: new Date().toISOString(),
        };

        round.responses.push(response);
        emit({ type: "model_response", roundNumber: roundNum, response });

        return response;
      }
    });

    await Promise.allSettled(modelCalls);

    // Compute vote distribution
    for (const r of round.responses) {
      if (r.vote !== "ERROR") {
        round.voteDistribution[r.vote] =
          (round.voteDistribution[r.vote] ?? 0) + 1;
      }
    }
    round.completedAt = new Date().toISOString();
    session.rounds.push(round);
    session.updatedAt = new Date().toISOString();

    // Check consensus
    const winner = checkConsensus(round, session.consensusThreshold);

    // Close the round span with vote distribution
    if (client.closeTrace && roundSpanId) {
      await client.closeTrace(roundSpanId, {
        voteDistribution: round.voteDistribution,
        ...(winner ? { winner } : {}),
      });
    }

    emit({ type: "round_completed", round });

    // Fire-and-forget round summary
    generateRoundSummary(session, round, client, roundSpanId ?? traceId)
      .then((summary) => {
        emit({ type: "round_summary", roundNumber: roundNum, summary });
      })
      .catch((err) => {
        console.error(`Round ${roundNum} summary failed:`, err);
      });
    if (winner) {
      session.status = "consensus";
      session.winningOption = winner;
      logSessionSummary(session.id, session);
      emit({ type: "consensus", session });

      // Await final summary before closing trace
      let finalSummary;
      try {
        finalSummary = await generateFinalSummary(session, client, traceId);
        emit({ type: "final_summary", summary: finalSummary });
      } catch (err) {
        console.error("Final summary failed:", err);
      }

      if (client.closeTrace && traceId) {
        await client.closeTrace(traceId, {
          winner,
          rounds: roundNum,
          ...(finalSummary ? { summary: finalSummary } : {}),
        });
      }
      return;
    }

  }

  // Max rounds reached without consensus
  session.status = "max_rounds";
  logSessionSummary(session.id, session);
  emit({ type: "max_rounds", session });

  // Await final summary before closing trace
  let finalSummary;
  try {
    finalSummary = await generateFinalSummary(session, client, traceId);
    emit({ type: "final_summary", summary: finalSummary });
  } catch (err) {
    console.error("Final summary failed:", err);
  }

  if (client.closeTrace && traceId) {
    await client.closeTrace(traceId, {
      result: "no_consensus",
      rounds: session.maxRounds,
      ...(finalSummary ? { summary: finalSummary } : {}),
    });
  }
}

function buildInstructions(
  session: RoundtableSession,
  roundNum: number,
  modelId: string
): string {
  const optionList = session.options
    .map((o) => `${o.id}: ${o.label}`)
    .join("\n");

  const modelLabel = modelId.split("/").pop() ?? modelId;
  const otherModels = session.models
    .filter((m) => m !== modelId)
    .map((m) => m.split("/").pop() ?? m)
    .join(", ");

  const identity = `You are ${modelLabel}, participating in an AI roundtable deliberation with ${otherModels}.`;

  if (roundNum === 1) {
    return `${identity} You must vote on the following question and provide your reasoning.

Question: ${session.question}

The available options are:
${optionList}

Provide your vote (must be exactly one of the option IDs) and a compelling argument. This is round 1, so set attributedTo to null.`;
  }

  // Build history of prior rounds (sliding window if contextRounds is set)
  const allRounds = session.rounds;
  const relevantRounds = session.contextRounds
    ? allRounds.slice(-session.contextRounds)
    : allRounds;
  const omittedCount = allRounds.length - relevantRounds.length;

  const historyParts: string[] = [];
  if (omittedCount > 0) {
    historyParts.push(`*(Earlier ${omittedCount} round${omittedCount > 1 ? "s" : ""} omitted — showing last ${relevantRounds.length} of ${allRounds.length})*`);
  }
  for (const round of relevantRounds) {
    const roundArgs = round.responses
      .map((r) => {
        const who = r.modelId === modelId ? `${r.modelId} (you)` : r.modelId;
        return `[${who}] voted "${r.vote}":\n${r.reasoning}`;
      })
      .join("\n\n---\n\n");
    historyParts.push(`### Round ${round.roundNumber}\n\n${roundArgs}`);
  }

  // Find this model's own vote history
  const ownVotes = session.rounds
    .map((round) => {
      const resp = round.responses.find((r) => r.modelId === modelId);
      return resp ? `Round ${round.roundNumber}: ${resp.vote}` : null;
    })
    .filter(Boolean)
    .join(", ");

  return `${identity} This is round ${roundNum}.

Question: ${session.question}

The available options are:
${optionList}

Your vote history: ${ownVotes}

Deliberation so far:
${historyParts.join("\n\n")}

Reconsider your position carefully. You may change your vote if you find another model's argument more compelling. If you change your vote, set attributedTo to the model ID that convinced you. Be persuasive in your own argument — try to change other models' minds.`;
}

function findPreviousVote(
  session: RoundtableSession,
  modelId: string
): string | null {
  for (let i = session.rounds.length - 1; i >= 0; i--) {
    const r = session.rounds[i].responses.find((r) => r.modelId === modelId);
    if (r) return r.vote;
  }
  return null;
}
