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

/**
 * Top-level dispatcher — routes to the right runner based on session mode.
 */
export async function runSession(
  session: RoundtableSession,
  client: LLMClient,
  emit: EventCallback
): Promise<void> {
  if (session.mode === "expert_panel") {
    return runExpertPanel(session, client, emit);
  }
  return runRoundtable(session, client, emit);
}

/**
 * Expert Panel: single round, minimal prompt, no deliberation.
 */
async function runExpertPanel(
  session: RoundtableSession,
  client: LLMClient,
  emit: EventCallback
): Promise<void> {
  const optionIds = session.options.map((o) => o.id);
  const outputSchema = modelRoundOutputJsonSchema(optionIds);

  let traceId: string | undefined;
  if (client.createTrace) {
    const trace = await client.createTrace(`expert-panel/${session.id}`, {
      question: session.question,
      models: session.models,
      options: session.options,
    });
    traceId = trace.id;
    session.traceId = traceId;
  }

  session.status = "running";
  emit({ type: "session_created", session });
  emit({ type: "round_started", roundNumber: 1 });

  const round: Round = {
    roundNumber: 1,
    responses: [],
    startedAt: new Date().toISOString(),
    voteDistribution: {},
  };

  const modelCalls = session.models.map(async (modelId) => {
    const instructions = buildExpertPanelInstructions(session, modelId);
    try {
      const result = await client.call({
        name: "expert-panel",
        model: modelId,
        instructions,
        input: {
          question: session.question,
          options: session.options,
        },
        outputSchema: outputSchema as Record<string, unknown>,
        traceContext: traceId
          ? {
              parentId: traceId,
              name: modelId.replace(/\//g, "-"),
              tags: { session: session.id, round: "1", model: modelId },
            }
          : undefined,
      });

      const output = result.result as {
        vote: string;
        reasoning: string;
        attributedTo: string | null;
      };

      logModelCall(session.id, 1, modelId, instructions, {
        question: session.question,
        options: session.options,
      }, output);

      const response: ModelResponse = {
        modelId,
        modelLabel: modelId.split("/").pop() ?? modelId,
        vote: output.vote,
        reasoning: output.reasoning,
        voteChanged: false,
        spanId: result.spanId,
        completedAt: new Date().toISOString(),
      };

      round.responses.push(response);
      emit({ type: "model_response", roundNumber: 1, response });
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Model ${modelId} failed:`, errorMsg);
      logModelCall(session.id, 1, modelId, instructions, {
        question: session.question,
        options: session.options,
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
      emit({ type: "model_response", roundNumber: 1, response });
      return response;
    }
  });

  await Promise.allSettled(modelCalls);

  for (const r of round.responses) {
    if (r.vote !== "ERROR") {
      round.voteDistribution[r.vote] = (round.voteDistribution[r.vote] ?? 0) + 1;
    }
  }
  round.completedAt = new Date().toISOString();
  session.rounds.push(round);
  session.updatedAt = new Date().toISOString();

  emit({ type: "round_completed", round });

  // Expert panel: always max_rounds (1 round done)
  session.status = "max_rounds";
  logSessionSummary(session.id, session);
  emit({ type: "max_rounds", session });

  let finalSummary;
  try {
    finalSummary = await generateFinalSummary(session, client, traceId);
    emit({ type: "final_summary", summary: finalSummary });
  } catch (err) {
    console.error("Final summary failed:", err);
  }

  if (client.closeTrace && traceId) {
    await client.closeTrace(traceId, {
      result: "expert_panel_complete",
      ...(finalSummary ? { summary: finalSummary } : {}),
    });
  }
}

/**
 * Roundtable Discussion: multi-round deliberation with blind first round.
 */
async function runRoundtable(
  session: RoundtableSession,
  client: LLMClient,
  emit: EventCallback
): Promise<void> {
  const optionIds = session.options.map((o) => o.id);
  const outputSchema = modelRoundOutputJsonSchema(optionIds);

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

    const modelCalls = session.models.map(async (modelId) => {
      const instructions = buildRoundtableInstructions(session, roundNum, modelId);
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

    for (const r of round.responses) {
      if (r.vote !== "ERROR") {
        round.voteDistribution[r.vote] =
          (round.voteDistribution[r.vote] ?? 0) + 1;
      }
    }
    round.completedAt = new Date().toISOString();
    session.rounds.push(round);
    session.updatedAt = new Date().toISOString();

    const winner = checkConsensus(round, session.consensusThreshold);

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

// --- Prompt builders ---

/**
 * Expert Panel: minimal prompt, no mention of other models or panels.
 */
function buildExpertPanelInstructions(
  session: RoundtableSession,
  _modelId: string
): string {
  const optionList = session.options
    .map((o) => `${o.id}: ${o.label}`)
    .join("\n");

  return `Answer the following question. Provide your vote and a clear, well-reasoned argument for your position.

Question: ${session.question}

The available options are:
${optionList}

Provide your vote (must be exactly one of the option IDs) and your reasoning. Set attributedTo to null.`;
}

/**
 * Roundtable Round 1: blind — no mention of roundtable, other models, or deliberation.
 */
function buildRound1Instructions(
  session: RoundtableSession
): string {
  const optionList = session.options
    .map((o) => `${o.id}: ${o.label}`)
    .join("\n");

  return `Answer the following question. Provide your vote and a compelling argument with strong arguments for your position.

Question: ${session.question}

The available options are:
${optionList}

Provide your vote (must be exactly one of the option IDs) and your reasoning. Set attributedTo to null.`;
}

/**
 * Roundtable Round 2: informed — models see all prior responses and can change their mind.
 */
function buildRound2Instructions(
  session: RoundtableSession,
  roundNum: number,
  modelId: string
): string {
  const optionList = session.options
    .map((o) => `${o.id}: ${o.label}`)
    .join("\n");

  const modelLabel = modelId.split("/").pop() ?? modelId;

  // Find this model's own previous response
  const ownPreviousResponse = findPreviousResponse(session, modelId);
  const ownVoteHistory = session.rounds
    .map((round) => {
      const resp = round.responses.find((r) => r.modelId === modelId);
      return resp ? `Round ${round.roundNumber}: ${resp.vote}` : null;
    })
    .filter(Boolean)
    .join(", ");

  // Build history of all prior responses
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
        const who = r.modelId === modelId ? `${r.modelLabel} (you)` : r.modelLabel;
        return `[${who}] voted "${r.vote}":\n${r.reasoning}`;
      })
      .join("\n\n---\n\n");
    historyParts.push(`### Round ${round.roundNumber}\n\n${roundArgs}`);
  }

  const isLastRound = roundNum >= session.maxRounds;
  const finalRoundNote = isLastRound
    ? "\n\nThis is the FINAL round. Make your last case. This is your last opportunity to present your arguments."
    : "\n\nYou have one last chance to put your final arguments — address other models by name if you want to convince them about specifics.";

  return `You are ${modelLabel}. You previously answered the following question:

Question: ${session.question}

The available options are:
${optionList}

Your vote history: ${ownVoteHistory}
${ownPreviousResponse ? `Your previous argument: ${ownPreviousResponse.reasoning.slice(0, 500)}` : ""}

Here is what all models responded in the deliberation so far:
${historyParts.join("\n\n")}

Did any of the other models' arguments convince you to change your position? If you changed your mind, explain what arguments convinced you and which model influenced you. If you maintained your position, explain why the other arguments were not compelling enough.${finalRoundNote}

If you change your vote, set attributedTo to the model ID that convinced you. Otherwise set it to null.`;
}

function buildRoundtableInstructions(
  session: RoundtableSession,
  roundNum: number,
  modelId: string
): string {
  if (roundNum === 1) {
    return buildRound1Instructions(session);
  }
  return buildRound2Instructions(session, roundNum, modelId);
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

function findPreviousResponse(
  session: RoundtableSession,
  modelId: string
): ModelResponse | null {
  for (let i = session.rounds.length - 1; i >= 0; i--) {
    const r = session.rounds[i].responses.find((r) => r.modelId === modelId);
    if (r) return r;
  }
  return null;
}
