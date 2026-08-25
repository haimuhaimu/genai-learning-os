import { useMemo, useState } from 'react'
import { attentionCompute } from './compute'
import { ComparisonGrid, ComparisonMetric, MechanismChain, TeachingScaffold } from '../shared/TeachingScaffold'
import { becauseTherefore } from '../shared/teaching'

const baselineInput = { queryPosition: 2, scaleDivisor: Math.sqrt(3), causal: true }
const keyEvidenceIndex = 1

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

export default function TransformerLab() {
  const [queryPosition, setQueryPosition] = useState(baselineInput.queryPosition)
  const [scaleDivisor, setScaleDivisor] = useState(baselineInput.scaleDivisor)
  const [causal, setCausal] = useState(baselineInput.causal)
  const baseline = useMemo(() => attentionCompute(baselineInput), [])
  const result = useMemo(() => attentionCompute({ queryPosition, scaleDivisor, causal }), [queryPosition, scaleDivisor, causal])
  const changed = queryPosition !== baselineInput.queryPosition || Math.abs(scaleDivisor - baselineInput.scaleDivisor) > 0.01 || causal !== baselineInput.causal
  const futureWeight = result.weights.reduce((sum, weight, index) => sum + (index > result.queryPosition ? weight : 0), 0)
  const baselineFutureWeight = baseline.weights.reduce((sum, weight, index) => sum + (index > baseline.queryPosition ? weight : 0), 0)
  const strongestIndex = result.weights.indexOf(Math.max(...result.weights))
  const scaleMeaning = scaleDivisor < baselineInput.scaleDivisor ? '注意力更集中' : scaleDivisor > baselineInput.scaleDivisor ? '注意力更平均' : '保持基线集中度'
  const explanation = becauseTherefore(
    `${causal ? '因果遮罩挡住了未来信息' : '关闭遮罩让未来信息也参与'}，且当前缩放除数使${scaleMeaning}`,
    `“${result.tokens[strongestIndex]}”获得最高权重 ${percent(result.weights[strongestIndex])}，关键证据“${result.tokens[keyEvidenceIndex]}”获得 ${percent(result.weights[keyEvidenceIndex])}${futureWeight > 0 ? `，同时有 ${percent(futureWeight)} 权重泄漏到未来 token` : '，未来 token 权重为 0'}`,
  )

  return (
    <TeachingScaffold
      story={{
        actor: '退款客服负责人正在检查自动生成的会话总结',
        challenge: '摘要写得很流畅，却漏掉“扣款未到账”这条关键证据，客服可能据此拒绝本应处理的退款。',
        question: '模型回答“该退款吗”时，关键证据到底拿到了多少注意力？',
      }}
      tasks={['先保留基线：问题 token 在第 3 位、开启因果遮罩。', '只改“注意力集中度”或遮罩，其他设置先不动。', '看关键证据权重、未来信息权重与输出向量如何一起变化。']}
      taskState={{ baselineReady: true, changedKnob: changed }}
      terms={[
        { term: 'Query（查询）', meaning: '当前位置“要回答的问题”，不是搜索框。', direction: '换位置 = 换一个问题视角。' },
        { term: 'Scale（缩放除数）', meaning: '控制注意力分配的集中度。', direction: '调小更集中；调大更平均。' },
        { term: 'Causal mask（因果遮罩）', meaning: '禁止当前位置偷看未来 token。', direction: '开启更符合逐字生成；关闭可观察未来信息泄漏。' },
        { term: 'Softmax（归一化）', meaning: '把分数转换为总和等于 100% 的权重。' },
      ]}
      controls={
        <fieldset className='paper-lab-controls'><legend>本轮旋钮</legend>
          <label>Query（当前要回答的问题）<select value={queryPosition} onChange={(event) => setQueryPosition(Number(event.target.value))}>{result.tokens.map((token, index) => <option key={`${token}-${index}`} value={index}>{index + 1} · {token}</option>)}</select><small>当前之后的 token 会被标成“未来”。</small></label>
          <label>Scale（注意力集中度）<output>{scaleDivisor.toFixed(2)} · {scaleMeaning}</output><input type='range' min='0.5' max='3' step='0.1' value={scaleDivisor} onChange={(event) => setScaleDivisor(Number(event.target.value))} /><small>调小更偏向高分证据；调大更平均。</small></label>
          <label className='paper-lab-check'><input type='checkbox' checked={causal} onChange={(event) => setCausal(event.target.checked)} /><span>开启 Causal mask<br /><small>不能偷看未来 token</small></span></label>
        </fieldset>
      }
      results={
        <>
          <ComparisonGrid>
            <ComparisonMetric label='关键证据权重 · 扣款未到账' baseline={percent(baseline.weights[keyEvidenceIndex])} current={percent(result.weights[keyEvidenceIndex])} delta={`${((result.weights[keyEvidenceIndex] - baseline.weights[keyEvidenceIndex]) * 100).toFixed(1)} 个百分点`} hint='越高表示该证据对当前输出影响越大，但注意力权重不等于因果解释。' />
            <ComparisonMetric label='未来 token 总权重' baseline={percent(baselineFutureWeight)} current={percent(futureWeight)} delta={`${((futureWeight - baselineFutureWeight) * 100).toFixed(1)} 个百分点`} hint='开启因果遮罩时应为 0；否则可能偷看生成时尚不存在的信息。' />
            <ComparisonMetric label='输出向量' baseline={`[${baseline.output.join(', ')}]`} current={`[${result.output.join(', ')}]`} hint='权重改变后，对 Value（信息内容）的加权汇总也会改变。' />
          </ComparisonGrid>
          <div className='attention-token-map' aria-label='token 角色与注意力权重'>{result.tokens.map((token, index) => <article className={index === keyEvidenceIndex ? 'is-evidence' : index > result.queryPosition ? 'is-future' : index === result.queryPosition ? 'is-query' : ''} key={`${token}-${index}`}><span>#{index + 1} {index === keyEvidenceIndex ? '关键证据' : index > result.queryPosition ? '未来 token' : index === result.queryPosition ? '当前 Query' : '上下文'}</span><b>{token}</b><i style={{ width: `${Math.max(2, result.weights[index] * 100)}%` }} /><strong>{percent(result.weights[index])}</strong></article>)}</div>
          <MechanismChain steps={[
            { label: 'Scores · 相关性分数', value: result.scores.map((score) => score ?? '遮罩').join(' / ') },
            { label: 'Softmax weights · 信息份额', value: result.weights.map(percent).join(' / ') },
            { label: 'Output · 汇总结果', value: `[${result.output.join(', ')}]` },
          ]} />
        </>
      }
      explanation={<p className='paper-dynamic-explanation'>{explanation}</p>}
      transfer={{
        metric: '关键证据召回率 + 摘要事实一致率，而不只看摘要流畅度。',
        guardrail: '按“扣款未到账 / 已退款 / 重复扣款”切片；未来 token 权重必须为 0。',
        action: '先灰度 5% 退款会话；关键证据漏写率上升即回退，并抽样检查证据—结论链。',
      }}
      boundary='固定 4 个 token、单头和小矩阵，不含位置编码、残差、前馈网络、训练或真实模型行为。'
    />
  )
}
