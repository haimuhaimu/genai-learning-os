import { useCallback } from 'react'
import type { JourneyReflection, JourneyState, LearningReceipt } from '../../learningJourney'
import { buildCoachPrompt, prepareModelCoachPackage, type ModelCoachRuntime } from '../../modelCoach'
import { loadModelCoachRuntime } from '../../playgroundReplay'
import CoachTaskPanel from './CoachTaskPanel'

type Props = { practice?: JourneyState['practice']; reflection?: JourneyReflection; pending: boolean; runtime?: ModelCoachRuntime }

export default function ModelCoachPanel({ runtime, ...props }: Props) {
  const prepare = useCallback((input: { receipt?: LearningReceipt; reflection?: JourneyReflection }) => {
    // Deferred loading stays inside the verifier's existing timeout.
    let loaded: Promise<ModelCoachRuntime> | undefined
    const getRuntime = () => loaded ??= loadModelCoachRuntime()
    return prepareModelCoachPackage(input, runtime ?? {
      replay: receipt => getRuntime().then(engine => engine.replay(receipt)),
      inspect: receipt => getRuntime().then(engine => engine.inspect(receipt)),
    })
  }, [runtime])
  return <CoachTaskPanel {...props} prepare={prepare} renderPrompt={buildCoachPrompt}
    title='模型学习路线 · AI 陪练任务包' filename='model-learning-coach-task-v1.json'
    recordDescription='固定案例的操作、原始猜测、重试对照和已提交的复盘' />
}
