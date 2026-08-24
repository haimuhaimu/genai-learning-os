import { useCallback, useEffect, useState } from 'react'
import { applyFeedbackNudge, type FeedbackNudgeSignal } from '../../feedback/nudgePolicy'
import { PROGRESS_CHANGE_EVENT, type ProgressChangeDetail } from '../../progress'
import { STRATEGY_EVIDENCE_EVENT, type StrategyEvidenceChangeDetail } from '../../strategyEvidence'

let nudgeShownThisPageSession = false

function progressSignal(event: Event): FeedbackNudgeSignal | null {
  const detail = (event as CustomEvent<ProgressChangeDetail>).detail
  return detail?.reason === 'mark' && typeof detail.stage === 'number'
    ? { kind: 'progress', stage: detail.stage }
    : null
}

function strategySignal(event: Event): FeedbackNudgeSignal | null {
  const detail = (event as CustomEvent<StrategyEvidenceChangeDetail>).detail
  return detail && typeof detail.level === 'number'
    ? { kind: 'strategy', level: detail.level, summarySaved: detail.summarySaved === true }
    : null
}

export default function useFeedbackNudge() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consider = (signal: FeedbackNudgeSignal | null) => {
      if (!signal) return
      const decision = applyFeedbackNudge({ shown: nudgeShownThisPageSession }, signal)
      nudgeShownThisPageSession = decision.shown
      if (decision.shouldShow) setVisible(true)
    }
    const onProgress = (event: Event) => consider(progressSignal(event))
    const onStrategy = (event: Event) => consider(strategySignal(event))
    window.addEventListener(PROGRESS_CHANGE_EVENT, onProgress)
    window.addEventListener(STRATEGY_EVIDENCE_EVENT, onStrategy)
    return () => {
      window.removeEventListener(PROGRESS_CHANGE_EVENT, onProgress)
      window.removeEventListener(STRATEGY_EVIDENCE_EVENT, onStrategy)
    }
  }, [])

  const dismiss = useCallback(() => setVisible(false), [])
  return { nudgeVisible: visible, dismissNudge: dismiss }
}
