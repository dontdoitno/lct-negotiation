function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const JUDGE_CONFIG = {
  step: num("JUDGE_STEP", 5),
  maxDeltaPerTurn: num("JUDGE_MAX_DELTA_PER_TURN", 10),
  turnLimit: num("JUDGE_TURN_LIMIT", 12),
  commitmentSuccessThreshold: num("JUDGE_COMMITMENT_SUCCESS", 80),
  trustFailThreshold: num("JUDGE_TRUST_FAIL", 15),
  llmTimeoutMs: num("JUDGE_LLM_TIMEOUT_MS", 20000),
};
