import { useCallback } from 'react'
import type { LearningReceipt, ReceiptVerifier } from '../../learningJourney'
import type { BayesJourneyState, BayesReflection } from '../../bayesJourney'
import { buildBayesCoachPrompt, prepareBayesCoachPackage } from '../../bayesCoach'
import { replayPlaygroundReceipt } from '../../playgroundReplay'
import CoachTaskPanel from './CoachTaskPanel'

export default function BayesCoachPanel({ verify = replayPlaygroundReceipt, ...props }: {
  practice?: BayesJourneyState['practice']; reflection?: BayesReflection; pending: boolean; verify?: ReceiptVerifier
}) {
  const prepare = useCallback((input: { receipt?: LearningReceipt; reflection?: BayesReflection }) => prepareBayesCoachPackage(input, { replay: verify }), [verify])
  return <CoachTaskPanel {...props} prepare={prepare} renderPrompt={buildBayesCoachPrompt}
    title='贝叶斯学习路线 · AI 陪练任务包' filename='bayes-learning-coach-task-v1.json'
    recordDescription='这次固定小课的猜测、空手前后对照、纠错选择和已提交的复盘' />
}
