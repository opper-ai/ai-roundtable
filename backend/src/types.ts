export interface VoteOption {
  id: string;
  label: string;
}

export interface ModelResponse {
  modelId: string;
  modelLabel: string;
  vote: string;
  reasoning: string;
  attributedTo?: string;
  voteChanged: boolean;
  spanId?: string;
  completedAt: string;
}

export interface Round {
  roundNumber: number;
  responses: ModelResponse[];
  startedAt: string;
  completedAt?: string;
  voteDistribution: Record<string, number>;
}

export type SessionStatus =
  | "pending"
  | "running"
  | "consensus"
  | "max_rounds"
  | "error";

export interface RoundSummary {
  keyArguments: string[];
  voteChanges: string[];
  tally: string;
  outlook: string;
}

export interface FinalSummary {
  narrative: string;
  strongestPerOption: Record<string, string>;
  result: string;
  keyTurningPoints: string[];
}

export interface RoundtableSession {
  id: string;
  question: string;
  options: VoteOption[];
  models: string[];
  consensusThreshold: number;
  maxRounds: number;
  contextRounds?: number;
  rounds: Round[];
  status: SessionStatus;
  winningOption?: string;
  traceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoundtableEvent =
  | { type: "session_created"; session: RoundtableSession }
  | { type: "round_started"; roundNumber: number }
  | { type: "model_response"; roundNumber: number; response: ModelResponse }
  | { type: "round_completed"; round: Round }
  | { type: "round_summary"; roundNumber: number; summary: RoundSummary }
  | { type: "final_summary"; summary: FinalSummary }
  | { type: "consensus"; session: RoundtableSession }
  | { type: "max_rounds"; session: RoundtableSession }
  | { type: "error"; message: string };
