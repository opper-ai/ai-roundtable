import { useState } from "react";

interface MethodologyModalProps {
  open: boolean;
  onClose: () => void;
}

export function MethodologyModal({ open, onClose }: MethodologyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={onClose}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-6 text-2xl font-bold text-[#1B2E40]">How It Works</h2>

        {/* Roundtable Discussion */}
        <div className="mb-6 rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8CECF2] to-[#FFB186]">
              <svg className="h-4 w-4 text-[#1B2E40]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1B2E40]">Roundtable Discussion</h3>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            A structured deliberation where AI models debate a question across multiple rounds, attempting to reach consensus through argumentation.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8CECF2]/20 text-xs font-bold text-[#1B2E40]">1</div>
              <div>
                <h4 className="text-sm font-semibold text-[#1B2E40]">Blind Round</h4>
                <p className="text-xs text-gray-500">
                  Each model answers the question independently. They don't know they're part of a roundtable — they simply provide their vote and strongest arguments for their position.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFB186]/20 text-xs font-bold text-[#1B2E40]">2</div>
              <div>
                <h4 className="text-sm font-semibold text-[#1B2E40]">Informed Debate</h4>
                <p className="text-xs text-gray-500">
                  Models see all responses from Round 1. They can change their mind if convinced, explain what arguments swayed them, and make their final case — addressing other models by name.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3C3CAF]/10 text-xs font-bold text-[#1B2E40]">3</div>
              <div>
                <h4 className="text-sm font-semibold text-[#1B2E40]">Final Round (Optional)</h4>
                <p className="text-xs text-gray-500">
                  A third round gives models one last opportunity to present their arguments and try to convince the remaining holdouts. This is their final chance to sway the panel.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <h4 className="mb-1 text-xs font-semibold text-gray-500">Consensus</h4>
            <p className="text-xs text-gray-500">
              Consensus is reached when enough models agree on the same option. You can configure the threshold: 50% majority, 67% supermajority, or 100% unanimous agreement.
            </p>
          </div>
        </div>

        {/* Expert Panel */}
        <div className="mb-6 rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
              <svg className="h-4 w-4 text-[#1B2E40]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1B2E40]">Expert Panel</h3>
          </div>

          <p className="mb-3 text-sm text-gray-600">
            Each model gives an independent answer in a single round. No deliberation, no knowledge of other models — just straightforward expert opinions side by side.
          </p>

          <p className="text-xs text-gray-500">
            Best for gathering diverse perspectives on a question without the models influencing each other. Useful when you want to see how different AI models independently approach the same problem.
          </p>
        </div>

        {/* How models are called */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="mb-2 text-sm font-semibold text-[#1B2E40]">Under the Hood</h3>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex gap-2">
              <span className="text-[#8CECF2]">•</span>
              All models are called in parallel each round via the Opper AI platform.
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFB186]">•</span>
              Responses use structured output (JSON schema) to ensure consistent vote + reasoning format.
            </li>
            <li className="flex gap-2">
              <span className="text-[#3C3CAF]">•</span>
              Round summaries and the final summary are generated by a separate model analyzing the full debate.
            </li>
            <li className="flex gap-2">
              <span className="text-[#8CF0DC]">•</span>
              AI Roundtable is fully open source. You can run it locally with your own API keys.
            </li>
          </ul>
          <a
            href="https://github.com/opper-ai/ai-roundtable"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#3C3CAF] underline decoration-[#3C3CAF]/30 hover:decoration-[#3C3CAF] transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View source on GitHub
          </a>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-xl bg-gradient-to-r from-[#8CECF2] to-[#FFB186] px-5 py-2 text-sm font-semibold text-[#1B2E40] hover:opacity-90 transition-opacity"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function useMethodologyModal() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), close: () => setOpen(false) };
}
