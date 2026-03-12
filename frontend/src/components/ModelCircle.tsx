import { motion } from "framer-motion";
import { getVoteColor } from "./VoteChip";
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
  const borderColor = vote ? getVoteColor(vote) : "#D1D5DB";
  const provider = getProviderInfo(modelId);
  const labelMaxW = size + 20;

  // Scale sizes based on circle size
  const logoSize = size >= 64 ? 20 : size >= 48 ? 16 : 14;
  const voteSize = size >= 64 ? "text-lg" : size >= 48 ? "text-base" : "text-sm";

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <motion.div
        className="relative flex flex-col items-center justify-center gap-0.5 rounded-full bg-white shadow-sm"
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
        {/* Provider initial badge */}
        <div
          className="flex items-center justify-center rounded-full font-bold"
          style={{
            width: logoSize,
            height: logoSize,
            backgroundColor: provider.bgColor,
            color: provider.color,
            fontSize: logoSize * 0.55,
          }}
        >
          {provider.initial}
        </div>

        {/* Vote letter */}
        {vote && (
          <motion.span
            className={`${voteSize} font-bold leading-none`}
            style={{ color: getVoteColor(vote) }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={vote}
          >
            {vote}
          </motion.span>
        )}
        {!vote && !isThinking && (
          <span className="text-[10px] text-gray-400">?</span>
        )}
        {!vote && isThinking && (
          <span className="text-[10px] text-gray-400">...</span>
        )}
      </motion.div>

      <span
        className="mt-1.5 truncate text-center text-xs text-gray-500"
        style={{ maxWidth: labelMaxW }}
      >
        {label}
      </span>
    </motion.div>
  );
}
