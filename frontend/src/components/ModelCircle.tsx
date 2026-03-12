import { motion } from "framer-motion";
import { getVoteBgColor, getVoteColor, getVoteTextColor } from "./VoteChip";
import { getProviderInfo } from "../utils/modelLogos";
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
  modelId,
  label,
  latestResponse,
  isThinking,
  x,
  y,
  size = 80,
}: ModelCircleProps) {
  const vote = latestResponse?.vote;
  const borderColor = vote ? getVoteColor(vote) : "#E5E7EB";
  const provider = getProviderInfo(modelId);
  const labelMaxW = size + 30;

  // Scale sizes based on circle size
  const providerSize = size >= 64 ? 24 : size >= 48 ? 20 : 16;
  const voteBadgeSize = size >= 64 ? 22 : size >= 48 ? 18 : 16;

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-white"
        style={{
          width: size,
          height: size,
          border: `3px solid ${borderColor}`,
          boxShadow: vote ? `0 0 0 1px ${borderColor}20` : "0 1px 3px rgba(0,0,0,0.06)",
        }}
        animate={
          isThinking
            ? {
                boxShadow: [
                  `0 0 0 0 ${borderColor}40`,
                  `0 0 0 12px ${borderColor}00`,
                ],
              }
            : {}
        }
        transition={
          isThinking
            ? { duration: 1.2, repeat: Infinity, ease: "easeOut" }
            : {}
        }
      >
        {/* Provider initial — centered in circle */}
        <div
          className="flex items-center justify-center rounded-full font-bold"
          style={{
            width: providerSize,
            height: providerSize,
            backgroundColor: provider.bgColor,
            color: provider.color,
            fontSize: providerSize * 0.5,
          }}
        >
          {provider.initial}
        </div>

        {/* Vote badge — positioned bottom-right */}
        {vote && (
          <motion.div
            className="absolute flex items-center justify-center rounded-full font-bold"
            style={{
              width: voteBadgeSize,
              height: voteBadgeSize,
              bottom: -2,
              right: -2,
              backgroundColor: getVoteBgColor(vote),
              color: getVoteTextColor(vote),
              fontSize: voteBadgeSize * 0.55,
              border: "2px solid white",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={vote}
          >
            {vote}
          </motion.div>
        )}

        {/* Thinking state */}
        {!vote && isThinking && (
          <motion.div
            className="absolute bottom-0 right-0 flex items-center justify-center"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-[10px] text-gray-400">...</span>
          </motion.div>
        )}
      </motion.div>

      <span
        className="mt-1.5 truncate text-center text-[11px] text-gray-500 font-medium"
        style={{ maxWidth: labelMaxW }}
        title={label}
      >
        {label}
      </span>
    </motion.div>
  );
}
