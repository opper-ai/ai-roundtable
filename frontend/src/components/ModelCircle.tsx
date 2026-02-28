import { motion } from "framer-motion";
import { getVoteColor } from "./VoteChip";
import type { ModelResponse } from "../types";

interface ModelCircleProps {
  modelId: string;
  label: string;
  latestResponse?: ModelResponse;
  isThinking: boolean;
  x: number;
  y: number;
  size?: number;
}

export function ModelCircle({
  label,
  latestResponse,
  isThinking,
  x,
  y,
  size = 80,
}: ModelCircleProps) {
  const vote = latestResponse?.vote;
  const borderColor = vote ? getVoteColor(vote) : "#475569";
  const fontSize = size >= 64 ? "text-2xl" : size >= 48 ? "text-lg" : "text-base";
  const labelMaxW = size + 20;

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-slate-800"
        style={{
          width: size,
          height: size,
          border: `3px solid ${borderColor}`,
        }}
        animate={
          isThinking
            ? {
                boxShadow: [
                  `0 0 0 0 ${borderColor}40`,
                  `0 0 0 12px ${borderColor}00`,
                ],
              }
            : { boxShadow: `0 0 0 0 ${borderColor}00` }
        }
        transition={
          isThinking
            ? { duration: 1.2, repeat: Infinity, ease: "easeOut" }
            : {}
        }
      >
        {vote && (
          <motion.span
            className={`${fontSize} font-bold`}
            style={{ color: getVoteColor(vote) }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={vote}
          >
            {vote}
          </motion.span>
        )}
        {!vote && (
          <span className="text-sm text-slate-500">?</span>
        )}

      </motion.div>

      <span
        className="mt-1.5 truncate text-center text-xs text-slate-400"
        style={{ maxWidth: labelMaxW }}
      >
        {label}
      </span>
    </motion.div>
  );
}
