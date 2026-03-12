import { useEffect, useState } from "react";
import { fetchModels, createSession } from "../api/client";
import { saveQuestion, getHistory, clearHistory, type QuestionHistoryEntry } from "../utils/questionHistory";
import { MethodologyModal, useMethodologyModal } from "./MethodologyPage";
import type { LLMModel, VoteOption, SessionMode } from "../types";

interface SetupFormProps {
  onSessionCreated: (sessionId: string) => void;
}

export function SetupForm({ onSessionCreated }: SetupFormProps) {
  const [mode, setMode] = useState<SessionMode>("roundtable");
  const [question, setQuestion] = useState("");
  const [availableModels, setAvailableModels] = useState<LLMModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<VoteOption[]>([
    { id: "A", label: "A" },
    { id: "B", label: "B" },
  ]);
  const [consensusPreset, setConsensusPreset] = useState<"half" | "supermajority" | "unanimous">("unanimous");
  const [maxRounds, setMaxRounds] = useState(2);
  const [contextRounds, setContextRounds] = useState<number | undefined>(undefined);
  const [showOtherModels, setShowOtherModels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QuestionHistoryEntry[]>(() => getHistory());
  const [showHistory, setShowHistory] = useState(false);
  const methodology = useMethodologyModal();

  useEffect(() => {
    fetchModels()
      .then((models) => {
        setAvailableModels(models);
        setModelsLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load models: ${err.message}`);
        setModelsLoading(false);
      });
  }, []);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addOption = () => {
    const nextId = String.fromCharCode(65 + options.length);
    setOptions([...options, { id: nextId, label: nextId }]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOptionLabel = (idx: number, label: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], label };
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (!question.trim() || selectedModels.size < 2) return;

    setLoading(true);
    setError(null);

    try {
      const n = selectedModels.size;
      const threshold =
        consensusPreset === "half"
          ? Math.ceil((n + 1) / 2)
          : consensusPreset === "unanimous"
            ? n
            : Math.ceil(n * (2 / 3));

      const effectiveMaxRounds = mode === "expert_panel" ? 1 : maxRounds;

      const trimmedQuestion = question.trim();

      const { sessionId } = await createSession({
        question: trimmedQuestion,
        models: Array.from(selectedModels),
        options,
        mode,
        consensusThreshold: mode === "expert_panel" ? n : threshold,
        maxRounds: effectiveMaxRounds,
        contextRounds: mode === "roundtable" ? contextRounds : undefined,
      });

      saveQuestion(trimmedQuestion, mode, options);
      setHistory(getHistory());
      onSessionCreated(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setLoading(false);
    }
  };

  const shortlistedModels = availableModels.filter((m) => m.shortlisted);
  const otherModels = availableModels.filter((m) => !m.shortlisted);

  const groupByProvider = (models: LLMModel[]) =>
    models.reduce(
      (acc, m) => {
        (acc[m.provider] ??= []).push(m);
        return acc;
      },
      {} as Record<string, LLMModel[]>
    );

  const shortlistedByProvider = groupByProvider(shortlistedModels);
  const otherByProvider = groupByProvider(otherModels);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-[#1B2E40]">AI Roundtable</h1>
          <button
            className="text-xs text-[#3C3CAF] underline decoration-[#3C3CAF]/30 hover:decoration-[#3C3CAF] hover:text-[#2E2E8F] transition-colors"
            onClick={methodology.show}
          >
            How it works
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Pose a question and let multiple AI models deliberate, debate, or give independent answers.
        </p>
      </div>
      <MethodologyModal open={methodology.open} onClose={methodology.close} />

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            mode === "roundtable"
              ? "border-[#8CECF2] bg-gradient-to-br from-[#8CECF2]/10 to-[#FFB186]/10"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
          onClick={() => setMode("roundtable")}
        >
          <div className="mb-1 text-sm font-semibold text-[#1B2E40]">Roundtable Discussion</div>
          <p className="text-xs text-gray-500">
            Models deliberate across 2-3 rounds, trying to reach consensus. They can change their minds based on others' arguments.
          </p>
        </button>
        <button
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            mode === "expert_panel"
              ? "border-[#8CECF2] bg-gradient-to-br from-[#8CECF2]/10 to-[#FFB186]/10"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
          onClick={() => setMode("expert_panel")}
        >
          <div className="mb-1 text-sm font-semibold text-[#1B2E40]">Expert Panel</div>
          <p className="text-xs text-gray-500">
            Each model gives an independent answer in a single round. No deliberation, just expert opinions.
          </p>
        </button>
      </div>

      {/* Question */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#1B2E40]">
          Question / Topic
        </label>
        <textarea
          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-[#1B2E40] placeholder-gray-400 focus:border-[#8CECF2] focus:outline-none focus:ring-1 focus:ring-[#8CECF2] transition-colors"
          rows={3}
          placeholder="e.g., I want to wash my car. The car wash is 50 meters away. Should I walk or drive?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        {history.length > 0 && (
          <div className="mt-1.5">
            <button
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? "Hide" : "Show"} recent questions ({history.length})
            </button>
            {showHistory && (
              <div className="mt-1 rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {history.map((entry, i) => (
                  <button
                    key={i}
                    className="w-full px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setQuestion(entry.question);
                      setMode(entry.mode);
                      if (entry.options?.length >= 2) {
                        setOptions(entry.options);
                      }
                      setShowHistory(false);
                    }}
                  >
                    <span className="line-clamp-1">{entry.question}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {entry.mode === "expert_panel" ? "Expert Panel" : "Roundtable"}
                      {" · "}
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
                <button
                  className="w-full px-3 py-1.5 text-[10px] text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                    setShowHistory(false);
                  }}
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vote Options */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#1B2E40]">
          Vote Options
        </label>
        <div className="flex flex-wrap gap-2">
          {options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-400">{opt.id}:</span>
              <input
                className="w-32 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-[#1B2E40] focus:border-[#8CECF2] focus:outline-none focus:ring-1 focus:ring-[#8CECF2] transition-colors"
                value={opt.label}
                onChange={(e) => updateOptionLabel(idx, e.target.value)}
              />
              {options.length > 2 && (
                <button
                  className="text-xs text-red-400 hover:text-red-500"
                  onClick={() => removeOption(idx)}
                >
                  x
                </button>
              )}
            </div>
          ))}
          <button
            className="rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
            onClick={addOption}
          >
            + Add option
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#1B2E40]">
          Select Models (at least 2)
        </label>
        {selectedModels.size > 6 && (
          <p className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-700">
            Consider selecting 6 or fewer models for faster deliberation.
          </p>
        )}
        {modelsLoading ? (
          <p className="text-sm text-gray-400">Loading models...</p>
        ) : (
          <div className="flex gap-3">
            {/* Model picker */}
            <div className="max-h-72 min-w-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
              {Object.entries(shortlistedByProvider)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([provider, models]) => (
                  <div key={provider}>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {provider}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {models.map((m) => (
                        <button
                          key={m.id}
                          className={`rounded-full px-3 py-1 text-xs transition-colors ${
                            selectedModels.has(m.id)
                              ? "bg-gradient-to-r from-[#8CECF2] to-[#FFB186] text-[#1B2E40] font-semibold"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          onClick={() => toggleModel(m.id)}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Other models - collapsible */}
              {otherModels.length > 0 && (
                <div className="border-t border-gray-200 pt-2">
                  <button
                    className="mb-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowOtherModels(!showOtherModels)}
                  >
                    {showOtherModels ? "Hide" : "Show"} other models ({otherModels.length})
                  </button>
                  {showOtherModels &&
                    Object.entries(otherByProvider)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([provider, models]) => (
                        <div key={provider} className="mb-2">
                          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {provider}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {models.map((m) => (
                              <button
                                key={m.id}
                                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                  selectedModels.has(m.id)
                                    ? "bg-gradient-to-r from-[#8CECF2] to-[#FFB186] text-[#1B2E40] font-semibold"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                                onClick={() => toggleModel(m.id)}
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                </div>
              )}
            </div>

            {/* Selected models sidebar */}
            {selectedModels.size > 0 && (
              <div className="sticky top-0 w-44 shrink-0 self-start rounded-xl border border-gray-200 bg-white p-2">
                <h4 className="mb-2 text-xs font-semibold text-[#1B2E40]">
                  Selected ({selectedModels.size})
                </h4>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {Array.from(selectedModels).map((id) => (
                    <li key={id} className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] text-gray-500" title={id}>
                        {id.split("/").pop()}
                      </span>
                      <button
                        className="shrink-0 text-[10px] text-red-400 hover:text-red-500"
                        onClick={() => toggleModel(id)}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {selectedModels.size} model{selectedModels.size !== 1 && "s"} selected
        </p>
      </div>

      {/* Settings — only show for roundtable mode */}
      {mode === "roundtable" && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1B2E40]">
              Consensus Threshold
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1B2E40] focus:border-[#8CECF2] focus:outline-none focus:ring-1 focus:ring-[#8CECF2]"
              value={consensusPreset}
              onChange={(e) => setConsensusPreset(e.target.value as "half" | "supermajority" | "unanimous")}
            >
              <option value="half">50%</option>
              <option value="supermajority">Supermajority (67%)</option>
              <option value="unanimous">100% (Unanimous)</option>
            </select>
            {selectedModels.size >= 2 && (
              <p className="mt-1 text-[10px] text-gray-400">
                {consensusPreset === "half"
                  ? Math.ceil((selectedModels.size + 1) / 2)
                  : consensusPreset === "unanimous"
                    ? selectedModels.size
                    : Math.ceil(selectedModels.size * (2 / 3))}{" "}
                of {selectedModels.size} models must agree
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1B2E40]">
              Rounds
            </label>
            <div className="flex gap-2">
              <button
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  maxRounds === 2
                    ? "border-[#8CECF2] bg-[#8CECF2]/10 text-[#1B2E40]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
                onClick={() => setMaxRounds(2)}
              >
                2 rounds
              </button>
              <button
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  maxRounds === 3
                    ? "border-[#8CECF2] bg-[#8CECF2]/10 text-[#1B2E40]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
                onClick={() => setMaxRounds(3)}
              >
                3 rounds
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1B2E40]">
              Context Window
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1B2E40] focus:border-[#8CECF2] focus:outline-none focus:ring-1 focus:ring-[#8CECF2]"
              value={contextRounds ?? "all"}
              onChange={(e) => setContextRounds(e.target.value === "all" ? undefined : parseInt(e.target.value))}
            >
              <option value="all">All rounds</option>
              <option value="1">Last 1 round</option>
              <option value="2">Last 2 rounds</option>
              <option value="3">Last 3 rounds</option>
            </select>
            <p className="mt-1 text-[10px] text-gray-400">
              How many prior rounds models see
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        className="w-full rounded-xl bg-gradient-to-r from-[#8CECF2] to-[#FFB186] py-3 text-sm font-semibold text-[#1B2E40] transition-opacity hover:opacity-90 disabled:opacity-50"
        disabled={!question.trim() || selectedModels.size < 2 || loading}
        onClick={handleSubmit}
      >
        {loading
          ? "Starting..."
          : mode === "expert_panel"
            ? "Start Expert Panel"
            : "Start Roundtable"}
      </button>

      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-gray-400">
        <span>Powered by</span>
        <img src="/opper-logo.png" alt="Opper" className="h-4 w-4" />
        <span className="font-medium text-[#1B2E40]">Opper AI</span>
      </div>
    </div>
  );
}
