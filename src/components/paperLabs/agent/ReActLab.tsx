import { useMemo, useState } from 'react'
import { reactCompute, type ReactMode } from './compute'
import { ComparisonGrid, ComparisonMetric, TeachingScaffold, TrajectoryStatus } from '../shared/TeachingScaffold'
import { becauseTherefore } from '../shared/teaching'

const baselineInput = { mode: 'react' as const, conflict: true, toolsAvailable: true, budget: 6 }

const modeLabels: Record<ReactMode, string> = {
  direct: '直接回答（不查证）',
  cot: '只在内部推理（不调用系统）',
  react: '边推理边查证',
}

function missingStep(result: ReturnType<typeof reactCompute>) {
  if (result.success) return '关键步骤已齐：可按安全规则输出。'
  if (result.failureAt.includes('外部观察')) return '还差：先查订单系统，再允许回答。'
  if (result.failureAt.includes('CoT-only')) return '还差：调用订单系统取得外部证据。'
  if (result.failureAt.includes('查询能力')) return '还差：恢复工具，或保持停止并转人工。'
  if (result.failureAt.includes('观察返回')) return '还差：等待并读取工具观察。'
  if (result.failureAt.includes('核验后')) return '还差：冲突后执行保守转人工。'
  if (result.failureAt.includes('冲突')) return '还差：调用支付核验，再做保守决定。'
  return '还差：在预算内形成有证据的最终动作。'
}

export default function ReActLab() {
  const [mode, setMode] = useState<ReactMode>(baselineInput.mode)
  const [conflict, setConflict] = useState(baselineInput.conflict)
  const [toolsAvailable, setToolsAvailable] = useState(baselineInput.toolsAvailable)
  const [budget, setBudget] = useState(baselineInput.budget)
  const baseline = useMemo(() => reactCompute(baselineInput), [])
  const result = useMemo(() => reactCompute({ mode, conflict, toolsAvailable, budget }), [mode, conflict, toolsAvailable, budget])
  const changed = mode !== baselineInput.mode || conflict !== baselineInput.conflict || toolsAvailable !== baselineInput.toolsAvailable || budget !== baselineInput.budget
  const observations = result.steps.filter((step) => step.kind === 'observation').length
  const baselineObservations = baseline.steps.filter((step) => step.kind === 'observation').length
  const branchIndex = result.steps.findIndex((step) => step.text.includes('冲突') || step.kind === 'stop')
  const explanation = becauseTherefore(
    `${modeLabels[mode]}${toolsAvailable ? '且系统可调用' : '但系统不可调用'}，最多只能走 ${budget} 步，${conflict ? '订单与支付记录出现冲突' : '外部记录一致'}`,
    `${result.success ? '轨迹没有猜测副作用动作，而是到达安全结果' : `轨迹在“${result.failureAt || '预算耗尽'}”处停下`}；${missingStep(result)}`,
  )

  return (
    <TeachingScaffold
      story={{
        actor: '退款自动化负责人要避免智能代理（Agent）“自信地错”',
        challenge: '模型凭经验说“可以退款”很快，但订单系统与支付系统可能冲突；一旦直接执行，就会造成重复退款。',
        question: '这条轨迹是否真的查证过，若不能安全退款，还差哪一步？',
      }}
      tasks={['先保留“边推理边查证 + 有工具 + 有冲突 + 6 步预算”的安全基线。', '只改模式、预算、工具或冲突中的一个条件。', '沿轨迹找到关键分叉，再读“还差哪一步”，不要只看最终成功/失败。']}
      taskState={{ baselineReady: true, changedKnob: changed }}
      terms={[
        { term: 'Mode（是否查证）', meaning: '决定直接回答、只在内部推理，还是边推理边调用系统。' },
        { term: 'Budget（最多可走几步）', meaning: '一次任务允许的轨迹长度上限。', direction: '太小会在观察或核验前被迫停止；更大也不保证正确。' },
        { term: 'Tools（能否调用系统）', meaning: '是否能读取订单、支付等外部事实。' },
        { term: 'Conflict（是否出现冲突）', meaning: '不同系统返回的事实是否互相矛盾。', direction: '出现冲突时必须核验或转人工，不能任选一个相信。' },
        { term: 'ReAct（推理—行动—观察）', meaning: '让思考、工具动作和外部观察交替出现，留下可检查轨迹。' },
      ]}
      controls={
        <fieldset className='paper-lab-controls'><legend>本轮旋钮</legend>
          <label>Mode（是否查证）<select value={mode} onChange={(event) => setMode(event.target.value as ReactMode)}><option value='direct'>直接回答 · 不查证</option><option value='cot'>只内部推理 · 不调用系统</option><option value='react'>边推理边查证</option></select></label>
          <label>Budget（最多可走几步）<output>{budget} 步</output><input type='range' min='1' max='6' value={budget} onChange={(event) => setBudget(Number(event.target.value))} /><small>调小可观察轨迹会在哪一步被截断。</small></label>
          <label className='paper-lab-check'><input type='checkbox' checked={toolsAvailable} onChange={(event) => setToolsAvailable(event.target.checked)} /><span>Tools · 允许调用系统<br /><small>关闭后不能获得订单事实</small></span></label>
          <label className='paper-lab-check'><input type='checkbox' checked={conflict} onChange={(event) => setConflict(event.target.checked)} /><span>Conflict · 注入冲突<br /><small>订单与支付记录互相矛盾</small></span></label>
        </fieldset>
      }
      results={
        <>
          <ComparisonGrid>
            <ComparisonMetric label='安全结果' baseline={baseline.success ? '达到' : '未达到'} current={result.success ? '达到' : '未达到'} delta={result.success === baseline.success ? '与基线一致' : '相对基线已改变'} hint='“安全”可能是有确认门地执行，也可能是在冲突时停止并转人工。' />
            <ComparisonMetric label='外部观察数' baseline={String(baselineObservations)} current={String(observations)} delta={`${observations - baselineObservations >= 0 ? '+' : ''}${observations - baselineObservations}`} hint='内部推理不是外部证据；没有 Observation 就没有查证。' />
            <ComparisonMetric label='实际轨迹长度' baseline={`${baseline.steps.length} 步`} current={`${result.steps.length} 步`} delta={`预算上限 ${budget} 步`} hint='步数更长不自动更可靠，关键是是否跨过查询与冲突核验分叉。' />
          </ComparisonGrid>
          <ol className='react-trajectory' aria-label='退款自动化行动轨迹'>{result.steps.map((step, index) => {
            const keyBranch = index === branchIndex || step.text.includes('payment.verify') || (step.kind === 'answer' && conflict)
            return <li className={keyBranch ? 'is-key-branch' : ''} key={`${step.kind}-${index}`}><span>{step.kind}</span><p>{step.text}</p>{keyBranch ? <b>关键分叉</b> : null}</li>
          })}</ol>
          <TrajectoryStatus><p><b>{result.success ? '安全闭环' : '尚未闭环'}</b>{missingStep(result)}</p></TrajectoryStatus>
        </>
      }
      explanation={<p className='paper-dynamic-explanation'>{explanation}</p>}
      transfer={{
        metric: '安全完成率 + 重复退款率 + 人工转接率，分开报告。',
        guardrail: '冲突订单必须禁止自动退款；轨迹必须包含查询参数、观察与停止原因。',
        action: '先对白名单低金额订单灰度；缺观察、超预算或冲突未核验时立即停自动化并转人工。',
      }}
      boundary='固定退款环境与规则表，不调用语言模型或真实工具；轨迹只用于说明控制流与停止条件。'
    />
  )
}
