import { useMemo, useState } from 'react'
import { dreamerCompute } from './compute'
import { ComparisonGrid, ComparisonMetric, TeachingScaffold } from '../shared/TeachingScaffold'
import { becauseTherefore } from '../shared/teaching'

const baselineInput = { accuracy: 0.8, imaginationLength: 8, discount: 0.95 }

export default function DreamerLab() {
  const [accuracy, setAccuracy] = useState(baselineInput.accuracy)
  const [imaginationLength, setImaginationLength] = useState(baselineInput.imaginationLength)
  const baseline = useMemo(() => dreamerCompute(baselineInput), [])
  const result = useMemo(() => dreamerCompute({ ...baselineInput, accuracy, imaginationLength }), [accuracy, imaginationLength])
  const changed = accuracy !== baselineInput.accuracy || imaginationLength !== baselineInput.imaginationLength
  const cumulativeErrors = result.stepErrors.map((_, index) => result.stepErrors.slice(0, index + 1).reduce((sum, value) => sum + value, 0))
  const explanation = becauseTherefore(
    `模拟器可信度是 ${Math.round(accuracy * 100)}%，每一步的小偏差在向未来推演 ${imaginationLength} 步时继续叠加`,
    `累计误差到达 ${result.accumulatedError}，想象回报相对真实回报偏差 ${result.returnBias >= 0 ? '+' : ''}${result.returnBias}；${result.needsRealValidation ? '此时必须回到真实小流量做对照验证，不能继续只信仿真 ROI' : '当前仍可做短推演观察，但上线前仍需真实验证'}`,
  )

  return (
    <TeachingScaffold
      story={{
        actor: '策略团队在仿真中看到极高投入产出比（ROI），准备扩大线上流量',
        challenge: '模拟器每一步只错一点，长时间推演后却可能把回报高估；仿真看似省样本，线上一放量就出现回撤。',
        question: '误差从哪一步开始累积到不可忽略，什么时候必须回真实小流量验证？',
      }}
      tasks={['先看 80% 模拟器可信度、向未来推演 8 步的基线。', '只改“模拟器可信度”或“推演步数”，观察单步小错如何累积。', '对比真实与想象回报偏差，并确认是否触发真实小流量验证。']}
      taskState={{ baselineReady: true, changedKnob: changed }}
      terms={[
        { term: 'Accuracy（模拟器可信度）', meaning: '教学中表示模拟器预测接近真实环境的程度。', direction: '调低 = 每一步预测偏差更大；100% 仅是理想对照。' },
        { term: 'Rollout length（向未来推演几步）', meaning: '策略在模拟世界里连续预测多远。', direction: '调大 = 节省更多真实交互，但误差有更多机会累积。' },
        { term: 'Return bias（回报偏差）', meaning: '想象回报减去真实回报。', direction: '正值表示仿真偏乐观，负值表示偏悲观。' },
      ]}
      controls={
        <fieldset className='paper-lab-controls'><legend>本轮旋钮</legend>
          <label>Accuracy（模拟器可信度）<output>{Math.round(accuracy * 100)}%</output><input type='range' min='0.5' max='1' step='0.05' value={accuracy} onChange={(event) => setAccuracy(Number(event.target.value))} /><small>调低代表线上环境更难被仿真准确预测。</small></label>
          <label>Rollout length（向未来推演几步）<output>{imaginationLength} 步</output><input type='range' min='1' max='12' value={imaginationLength} onChange={(event) => setImaginationLength(Number(event.target.value))} /><small>调长后重点看累计误差，而非只看想象回报。</small></label>
        </fieldset>
      }
      results={
        <>
          <ComparisonGrid>
            <ComparisonMetric label='真实折扣回报' baseline={String(baseline.realReturn)} current={String(result.realReturn)} delta={`观察 ${result.length} 步`} hint='教学中作为对照真值；真实业务里只能通过实际流量估计。' />
            <ComparisonMetric label='想象回报偏差' baseline={`${baseline.returnBias >= 0 ? '+' : ''}${baseline.returnBias}`} current={`${result.returnBias >= 0 ? '+' : ''}${result.returnBias}`} delta={result.returnBias > 0 ? '模拟器偏乐观' : result.returnBias < 0 ? '模拟器偏悲观' : '无偏差'} hint='ROI 看起来更高，不代表线上也会同样增长。' />
            <ComparisonMetric label='累计模型误差' baseline={String(baseline.accumulatedError)} current={String(result.accumulatedError)} delta={result.needsRealValidation ? '已触发真实验证' : '未触发长度规则'} hint='当前教学规则：模型不完美且推演达到 6 步，就必须回真实环境。' />
          </ComparisonGrid>
          <div className='dreamer-error-table' role='table' aria-label='逐步累积的模拟误差'>
            <div role='row'><b role='columnheader'>步</b><b role='columnheader'>真实奖励</b><b role='columnheader'>想象奖励</b><b role='columnheader'>本步误差</b><b role='columnheader'>累计误差</b></div>
            {result.stepErrors.map((error, index) => <div role='row' className={index >= 5 && accuracy < 1 ? 'needs-validation' : ''} key={index}><span role='cell'>{index + 1}</span><span role='cell'>{result.realRewards[index]}</span><span role='cell'>{result.imaginedRewards[index]}</span><span role='cell'>+{error}</span><span role='cell'><i style={{ width: `${Math.min(100, cumulativeErrors[index] / Math.max(result.accumulatedError, 0.01) * 100)}%` }} />{cumulativeErrors[index].toFixed(3)}{index === 5 && accuracy < 1 ? <em>从这里必须回真实验证</em> : null}</span></div>)}
          </div>
        </>
      }
      explanation={<p className='paper-dynamic-explanation'>{explanation}</p>}
      transfer={{
        metric: '真实小流量 ROI 为主指标；同时报告想象回报偏差与累计模型误差。',
        guardrail: '按新用户、极端状态、分布漂移切片；推演 ≥ 6 步且模拟器非完美时强制真实验证。',
        action: '仿真先筛方案，再用 1% 真实流量校验；真实 ROI 回撤或偏差超线就回退策略并缩短推演。',
      }}
      boundary='固定奖励序列与显式误差函数，不含潜变量、Actor-Critic、训练、多环境泛化或真实线上 ROI。'
    />
  )
}
