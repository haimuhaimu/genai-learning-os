export type FeedbackNudgeSignal =
  | { kind: 'progress'; stage: number }
  | { kind: 'strategy'; level: number; summarySaved: boolean }

export type FeedbackNudgeState = { shown: boolean }
export type FeedbackNudgeDecision = FeedbackNudgeState & { shouldShow: boolean }

export const REVIEW_STAGE_THRESHOLD = 4
export const STRATEGY_LEVEL_THRESHOLD = 2

export function isFeedbackNudgeEligible(signal: FeedbackNudgeSignal) {
  if (signal.kind === 'progress') return signal.stage >= REVIEW_STAGE_THRESHOLD
  return signal.summarySaved && signal.level >= STRATEGY_LEVEL_THRESHOLD
}

export function applyFeedbackNudge(state: FeedbackNudgeState, signal: FeedbackNudgeSignal): FeedbackNudgeDecision {
  const shouldShow = !state.shown && isFeedbackNudgeEligible(signal)
  return { shown: state.shown || shouldShow, shouldShow }
}
