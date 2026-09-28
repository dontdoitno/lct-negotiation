/**
 * The whole route map in one place, as the spec requires.
 *
 * Flow order:
 *   / → /quiz → /signup → /rules → /cases → /brief/:levelId → /call/:sessionId
 *     → /session/:id/ended (only when the AI left or turns ran out)
 *     → /session/:id/debrief → back to /cases
 */
export const ROUTES = {
  landing: "/",
  quiz: "/quiz",
  signup: "/signup",
  login: "/login",
  rules: "/rules",
  cases: "/cases",
  brief: (levelId: string) => `/brief/${levelId}`,
  call: (sessionId: string) => `/call/${sessionId}`,
  ended: (sessionId: string) => `/session/${sessionId}/ended`,
  debrief: (sessionId: string) => `/session/${sessionId}/debrief`,
  learn: "/learn",
} as const;

/** Routes that require the quiz to have been answered at least once. */
export const QUIZ_GATED: string[] = [ROUTES.cases];
