// Estimated one-rep max via the Epley formula — one of the two most
// widely used and cross-validated estimation formulas in strength
// training (the other being Brzycki). Shared here rather than duplicated
// in both strength-log.tsx (live 1RM display) and progressiveOverload.ts
// (plateau/decline scoring), so both always agree on the same number for
// the same set.
export function estimatedOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}