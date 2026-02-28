import { useEffect, useState } from "react";
import { fetchModels, createSession } from "../api/client";
import type { LLMModel, VoteOption } from "../types";

interface SetupFormProps {
  onSessionCreated: (sessionId: string) => void;
}

export function SetupForm({ onSessionCreated }: SetupFormProps) {
  const [question, setQuestion] = useState("");
  const [availableModels, setAvailableModels] = useState<LLMModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<VoteOption[]>([
    { id: "A", label: "A" },
    { id: "B", label: "B" },
  ]);
  const [consensusPreset, setConsensusPreset] = useState<"half" | "supermajority" | "unanimous">("supermajority");
  const [maxRounds, setMaxRounds] = useState(6);
  const [contextRounds, setContextRounds] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const nextId = String.fromCharCode(65 + options.length); // A, B, C, ...
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

      const { sessionId } = await createSession({
        question: question.trim(),
        models: Array.from(selectedModels),
        options,
        consensusThreshold: threshold,
        maxRounds,
        contextRounds,
      });

      onSessionCreated(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setLoading(false);
    }
  };

  // Group models by provider
  const modelsByProvider = availableModels.reduce(
    (acc, m) => {
      (acc[m.provider] ??= []).push(m);
      return acc;
    },
    {} as Record<string, LLMModel[]>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-3xl font-bold text-white">DeliberAIt</h1>
      <p className="text-sm text-slate-400">
        Pose a question and let multiple AI models deliberate until they reach consensus.
      </p>

      {/* Question */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">
          Question / Topic
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          rows={3}
          placeholder="e.g., I want to wash my car. The car wash is 50 meters away. Should I walk or drive?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      {/* Vote Options */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">
          Vote Options
        </label>
        <div className="flex flex-wrap gap-2">
          {options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400">{opt.id}:</span>
              <input
                className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                value={opt.label}
                onChange={(e) => updateOptionLabel(idx, e.target.value)}
              />
              {options.length > 2 && (
                <button
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => removeOption(idx)}
                >
                  x
                </button>
              )}
            </div>
          ))}
          <button
            className="rounded border border-dashed border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-400"
            onClick={addOption}
          >
            + Add option
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">
          Select Models (at least 2)
        </label>
        {modelsLoading ? (
          <p className="text-sm text-slate-500">Loading models...</p>
        ) : (
          <div className="max-h-60 space-y-3 overflow-y-auto rounded-lg border border-slate-700 p-3">
            {Object.entries(modelsByProvider)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([provider, models]) => (
                <div key={provider}>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {provider}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        className={`rounded-full px-3 py-1 text-xs transition-colors ${
                          selectedModels.has(m.id)
                            ? "bg-blue-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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
        <p className="mt-1 text-xs text-slate-500">
          {selectedModels.size} model{selectedModels.size !== 1 && "s"} selected
        </p>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Consensus Threshold
          </label>
          <select
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            value={consensusPreset}
            onChange={(e) => setConsensusPreset(e.target.value as "half" | "supermajority" | "unanimous")}
          >
            <option value="half">50%</option>
            <option value="supermajority">Supermajority (67%)</option>
            <option value="unanimous">100% (Unanimous)</option>
          </select>
          {selectedModels.size >= 2 && (
            <p className="mt-1 text-[10px] text-slate-500">
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
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Max Rounds
          </label>
          <select
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            value={maxRounds}
            onChange={(e) => setMaxRounds(parseInt(e.target.value))}
          >
            {[2, 3, 4, 5, 6, 8, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Context Window
          </label>
          <select
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            value={contextRounds ?? "all"}
            onChange={(e) => setContextRounds(e.target.value === "all" ? undefined : parseInt(e.target.value))}
          >
            <option value="all">All rounds</option>
            <option value="1">Last 1 round</option>
            <option value="2">Last 2 rounds</option>
            <option value="3">Last 3 rounds</option>
          </select>
          <p className="mt-1 text-[10px] text-slate-500">
            How many prior rounds models see
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-900/30 p-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        disabled={!question.trim() || selectedModels.size < 2 || loading}
        onClick={handleSubmit}
      >
        {loading ? "Starting..." : "Start Roundtable"}
      </button>

      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-slate-500">
        <span>Powered by</span>
        <img src="/opper-logo.png" alt="Opper" className="h-4 w-4" />
        <span className="font-medium text-slate-400">Opper AI</span>
      </div>
    </div>
  );
}
