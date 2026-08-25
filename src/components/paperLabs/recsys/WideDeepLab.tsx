import { useMemo, useState } from 'react'
import { wideDeepCompute, type WideDeepMode } from './compute'
import { ComparisonGrid, ComparisonMetric, TeachingScaffold } from '../shared/TeachingScaffold'
import { becauseTherefore } from '../shared/teaching'

const baselineInput = { mode: 'joint' as const, deepWeight: 1 }

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

export default function WideDeepLab() {
  const [mode, setMode] = useState<WideDeepMode>(baselineInput.mode)
  const [deepWeight, setDeepWeight] = useState(baselineInput.deepWeight)
  const baseline = useMemo(() => wideDeepCompute(baselineInput), [])
  const result = useMemo(() => wideDeepCompute({ mode, deepWeight }), [mode, deepWeight])
  const changed = mode !== baselineInput.mode || deepWeight !== baselineInput.deepWeight
  const passing = result.rows.filter((row) => row.probability >= 0.5)
  const leader = [...result.rows].sort((left, right) => right.probability - left.probability)[0]
  const cold = result.rows.find((row) => row.id === 'cold')!
  const baselineCold = baseline.rows.find((row) => row.id === 'cold')!
  const explanation = becauseTherefore(
    `${mode === 'wide' ? '只启用记忆规则，系统偏爱见过的组合' : mode === 'deep' ? '只启用相似性泛化，系统不再依赖历史组合规则' : `记忆规则与相似性泛化共同打分，且泛化权重为 ${deepWeight.toFixed(1)}`}`,
    `${leader.slice}样本以 ${percent(leader.probability)} 最先跨过 50% 门槛；当前共 ${passing.length} 个切片过门槛，代价是${mode === 'wide' || deepWeight < 0.7 ? '新商家与长尾曝光不足' : mode === 'deep' ? '热门历史规则被弱化，且相似但不相关的内容可能误入' : '泛化越强，误推荐与探索流量成本也越需要守护'}`,
  )

  return (
    <TeachingScaffold
      story={{
        actor: '推荐产品经理要给新内容和新商家分配首批曝光',
        challenge: '历史热门组合很容易继续赢，但没有历史行为的新商家可能永远进不了候选；只靠相似性又可能把“不相关但看起来像”的内容推给用户。',
        question: '记忆规则和相似性泛化，谁帮助哪个切片先跨过推荐门槛，代价是什么？',
      }}
      tasks={['先看联合基线：记忆规则与相似性泛化各占当前默认权重。', '只切换推荐方式，或只改“泛化影响力”一个旋钮。', '对比热门、冷启动、长尾谁跨过 50% 门槛，以及谁被牺牲。']}
      taskState={{ baselineReady: true, changedKnob: changed }}
      terms={[
        { term: 'Wide（记忆规则）', meaning: '记住历史上出现过的特征组合。', direction: '更强 = 热门旧组合更容易胜出，但新组合吃亏。' },
        { term: 'Deep（相似性泛化）', meaning: '根据连续表示，把经验迁移给相似的新内容。', direction: '更强 = 冷启动与长尾更易被发现，也可能增加误推荐。' },
        { term: 'Logit（门槛前分数）', meaning: '两路贡献相加后的原始分，经转换后得到推荐概率。' },
      ]}
      controls={
        <fieldset className='paper-lab-controls'><legend>本轮旋钮</legend>
          <label>推荐方式<select value={mode} onChange={(event) => setMode(event.target.value as WideDeepMode)}><option value='wide'>只用记忆规则</option><option value='deep'>只用相似性泛化</option><option value='joint'>记忆 + 泛化联合</option></select><small>切换后先看哪个切片失去门槛资格。</small></label>
          <label>Deep（泛化影响力）<output>{deepWeight.toFixed(1)}</output><input type='range' min='0' max='2' step='0.1' value={deepWeight} onChange={(event) => setDeepWeight(Number(event.target.value))} /><small>调大更照顾相似的新内容；调小更依赖历史记忆。</small></label>
        </fieldset>
      }
      results={
        <>
          <ComparisonGrid>{result.rows.map((row) => {
            const base = baseline.rows.find((item) => item.id === row.id)!
            const delta = (row.probability - base.probability) * 100
            return <ComparisonMetric key={row.id} label={`${row.slice} · ${row.label}`} baseline={percent(base.probability)} current={percent(row.probability)} delta={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)} 个百分点`} hint={`记忆规则 ${row.wideContribution.toFixed(2)} · 相似性泛化 ${row.deepContribution.toFixed(2)} · ${row.probability >= 0.5 ? '已跨过 50% 门槛' : '仍在 50% 门槛下'}`} />
          })}</ComparisonGrid>
          <div className='paper-threshold-board'>{result.rows.map((row) => <article className={row.probability >= 0.5 ? 'is-passing' : ''} key={row.id}><div><b>{row.slice}</b><span>{row.probability >= 0.5 ? '已过门槛' : '未过门槛'}</span></div><div className='threshold-track'><i style={{ width: `${row.probability * 100}%` }} /><em>50%</em></div><small>规则 {row.wideContribution.toFixed(2)} + 泛化 {row.deepContribution.toFixed(2)}</small></article>)}</div>
        </>
      }
      explanation={<p className='paper-dynamic-explanation'>{explanation} 冷启动相对基线变化为 {((cold.probability - baselineCold.probability) * 100).toFixed(1)} 个百分点。</p>}
      transfer={{
        metric: '新内容 7 日有效互动率，同时报告热门、冷启动、长尾的过门槛率。',
        guardrail: '冷启动曝光设下限；热门 CTR 与“不感兴趣”率设守护线，禁止只看总 CTR。',
        action: '先给新商家 5% 探索流量；误推荐率超线就降低泛化权重并回到联合基线。',
      }}
      boundary='仅有 3 个固定样本和固定参数，不含训练、Embedding 学习、负样本、校准或线上竞价。'
    />
  )
}
