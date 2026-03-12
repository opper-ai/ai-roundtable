import type { VoteOption, SessionMode } from "../types";

export interface QuestionHistoryEntry {
  question: string;
  mode: SessionMode;
  options: VoteOption[];
  timestamp: number;
}

const STORAGE_KEY = "ai-roundtable-history";
const MAX_ENTRIES = 20;

export function saveQuestion(question: string, mode: SessionMode, options: VoteOption[]): void {
  const history = getHistory();
  // Don't save duplicates of the exact same question
  const existing = history.findIndex((e) => e.question === question);
  if (existing >= 0) {
    history.splice(existing, 1);
  }
  history.unshift({ question, mode, options, timestamp: Date.now() });
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export function getHistory(): QuestionHistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuestionHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
