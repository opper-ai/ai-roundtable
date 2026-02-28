import { useEffect, useReducer, useState } from "react";
import type {
  RoundtableSession,
  RoundtableEvent,
  ModelResponse,
  Round,
  RoundSummary,
  FinalSummary,
} from "../types";

type Action =
  | { type: "SESSION_CREATED"; session: RoundtableSession }
  | { type: "ROUND_STARTED"; roundNumber: number }
  | { type: "MODEL_RESPONSE"; roundNumber: number; response: ModelResponse }
  | { type: "ROUND_COMPLETED"; round: Round }
  | { type: "ROUND_SUMMARY"; roundNumber: number; summary: RoundSummary }
  | { type: "FINAL_SUMMARY"; summary: FinalSummary }
  | { type: "CONSENSUS"; session: RoundtableSession }
  | { type: "MAX_ROUNDS"; session: RoundtableSession }
  | { type: "ERROR"; message: string };

function reducer(
  state: RoundtableSession | null,
  action: Action
): RoundtableSession | null {
  switch (action.type) {
    case "SESSION_CREATED":
      return { ...action.session };

    case "ROUND_STARTED": {
      if (!state) return state;
      return {
        ...state,
        status: "running",
      };
    }

    case "MODEL_RESPONSE": {
      if (!state) return state;
      const rounds = [...state.rounds];
      const currentRoundIdx = rounds.findIndex(
        (r) => r.roundNumber === action.roundNumber
      );
      if (currentRoundIdx >= 0) {
        const round = { ...rounds[currentRoundIdx] };
        round.responses = [...round.responses, action.response];
        rounds[currentRoundIdx] = round;
      } else {
        rounds.push({
          roundNumber: action.roundNumber,
          responses: [action.response],
          startedAt: new Date().toISOString(),
          voteDistribution: {},
        });
      }
      return { ...state, rounds };
    }

    case "ROUND_COMPLETED": {
      if (!state) return state;
      const rounds = [...state.rounds];
      const idx = rounds.findIndex(
        (r) => r.roundNumber === action.round.roundNumber
      );
      if (idx >= 0) {
        rounds[idx] = action.round;
      } else {
        rounds.push(action.round);
      }
      return { ...state, rounds };
    }

    case "ROUND_SUMMARY": {
      if (!state) return state;
      return {
        ...state,
        roundSummaries: {
          ...state.roundSummaries,
          [action.roundNumber]: action.summary,
        },
      };
    }

    case "FINAL_SUMMARY": {
      if (!state) return state;
      return {
        ...state,
        finalSummary: action.summary,
      };
    }

    case "CONSENSUS":
      return {
        ...action.session,
        roundSummaries: state?.roundSummaries,
        finalSummary: state?.finalSummary,
      };

    case "MAX_ROUNDS":
      return {
        ...action.session,
        roundSummaries: state?.roundSummaries,
        finalSummary: state?.finalSummary,
      };

    case "ERROR":
      if (!state) return state;
      return { ...state, status: "error" };

    default:
      return state;
  }
}

export function useSession(sessionId: string | null) {
  const [session, dispatch] = useReducer(reducer, null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/sessions/${sessionId}/events`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as RoundtableEvent;
        switch (event.type) {
          case "session_created":
            dispatch({ type: "SESSION_CREATED", session: event.session });
            break;
          case "round_started":
            dispatch({
              type: "ROUND_STARTED",
              roundNumber: event.roundNumber,
            });
            break;
          case "model_response":
            dispatch({
              type: "MODEL_RESPONSE",
              roundNumber: event.roundNumber,
              response: event.response,
            });
            break;
          case "round_completed":
            dispatch({ type: "ROUND_COMPLETED", round: event.round });
            break;
          case "round_summary":
            dispatch({
              type: "ROUND_SUMMARY",
              roundNumber: event.roundNumber,
              summary: event.summary,
            });
            break;
          case "final_summary":
            dispatch({ type: "FINAL_SUMMARY", summary: event.summary });
            break;
          case "consensus":
            dispatch({ type: "CONSENSUS", session: event.session });
            break;
          case "max_rounds":
            dispatch({ type: "MAX_ROUNDS", session: event.session });
            break;
          case "error":
            dispatch({ type: "ERROR", message: event.message });
            setError(event.message);
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError("Connection lost");
      es.close();
    };

    return () => es.close();
  }, [sessionId]);

  return { session, error };
}
