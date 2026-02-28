import { motion } from "framer-motion";

const VOTE_COLORS: Record<string, string> = {
  A: "#3b82f6",
  B: "#f97316",
  C: "#10b981",
  D: "#a855f7",
  E: "#ef4444",
  ERROR: "#6b7280",
};

export function getVoteColor(vote: string): string {
  return VOTE_COLORS[vote] ?? "#8b5cf6";
}

export function VoteChip({ vote }: { vote: string }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: getVoteColor(vote) }}
    >
      {vote}
    </motion.span>
  );
}
