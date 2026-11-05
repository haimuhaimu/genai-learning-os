import type { LearningReceipt } from './learningJourney'
import type { ModelCoachRuntime } from './modelCoach'

// Load the owner's public pure engine; never send a receipt in a request.
// The Playground code remains in its own licensed repository, not vendored here.
export function modelCoachModuleURLs(configuredBase = 'https://haimuhaimu.github.io/algorithm-playground/') {
  const base = new URL(configuredBase)
  const official = base.protocol === 'https:' && base.hostname === 'haimuhaimu.github.io' && !base.port && base.pathname === '/algorithm-playground/'
  const local = base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname) && Number(base.port) >= 1024 && base.pathname === '/'
  if (base.username || base.password || (!official && !local)) throw Error('核对模块地址不在受支持的教学站点范围内。')
  base.search = ''; base.hash = ''
  return { engine: new URL('learning-tool.mjs', base).href, trials: new URL('learning-route-trials.mjs', base).href }
}
const moduleURLs = () => modelCoachModuleURLs(import.meta.env?.VITE_PLAYGROUND_BASE_URL)

export function playgroundReplayURL(experimentId: string, configuredBase?: string) {
  const url = new URL(modelCoachModuleURLs(configuredBase).engine)
  // Existing visitors may still cache the pre-Bayes engine at the model URL.
  // Preserve that released model URL and version only the new tool dependency.
  if (experimentId === 'bayes-update') url.searchParams.set('v', 'bayes-journey-v1')
  if (experimentId === 'agent-tool-loop') url.searchParams.set('v', 'agent-tool-loop-v1')
  if (experimentId === 'agent-reroute') url.searchParams.set('v', 'agent-reroute-v1')
  return url.href
}

export async function loadModelCoachRuntime(): Promise<ModelCoachRuntime> {
  const urls = moduleURLs()
  try {
    const [engine, inspector] = await Promise.all([import(/* @vite-ignore */ urls.engine), import(/* @vite-ignore */ urls.trials)])
    if (typeof engine.replayLearningReceipt !== 'function' || typeof inspector.inspectLearningRouteTrials !== 'function') throw Error('incompatible')
    return { replay: engine.replayLearningReceipt, inspect: inspector.inspectLearningRouteTrials }
  } catch {
    throw Error('暂时无法载入陪练核对模块。可以先生成不含实操的课程任务包；原有记录没有改变，也没有上传。')
  }
}
export async function replayPlaygroundReceipt(receipt: LearningReceipt): Promise<unknown> {
  let module: { replayLearningReceipt?: (value: unknown) => unknown }
  try { module = await import(/* @vite-ignore */ playgroundReplayURL(String(receipt.experimentId), import.meta.env?.VITE_PLAYGROUND_BASE_URL)) } catch {
    throw Error('暂时无法载入游乐场的公开核对模块。记录仍在这里；联网后可重试，没有上传或推进进度。')
  }
  if (typeof module.replayLearningReceipt !== 'function') throw Error('公开核对模块暂不兼容，原记录没有改变。')
  try { return module.replayLearningReceipt(receipt) } catch {
    throw Error('这份记录与重新计算的结果不一致。请回到实验重新带回；原有记录没有改变。')
  }
}
