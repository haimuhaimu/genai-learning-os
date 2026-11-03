import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getCapabilityLearningPlan } from '../../capabilityLearningPlan'
import { calculateLearningCapabilities, stageLabels, type LearningCapabilityId, type ProgressMap } from '../../progress'

type Go = (page: string, options?: Record<string, string>) => void

export default function CapabilityProfile({ progress, go }: { progress: ProgressMap; go: Go }) {
  const capabilities = calculateLearningCapabilities(progress)
  const initial = [...capabilities].sort((left, right) => left.score - right.score)[0]
  const [selectedId, setSelectedId] = useState<LearningCapabilityId>(initial.id)
  const selected = capabilities.find((item) => item.id === selectedId) ?? initial
  const plan = useMemo(() => getCapabilityLearningPlan(progress, selected.id), [progress, selected.id])
  const visibleEvidence = plan.evidence.slice(0, 4)

  return <section aria-labelledby='capability-profile-title' style={styles.shell}>
    <header style={styles.header}>
      <div><span style={styles.eyebrow}>GENAI LEARNING RECORDS</span><h2 id='capability-profile-title' style={styles.title}>学习记录覆盖</h2><p style={styles.muted}>统计算法基础、LLM、图像与 Agent 四条课程路线的阶段记录，不等于能力认证。K3 与论文记录保留，但暂未纳入此覆盖率。</p></div>
      {plan.nextSteps[0] ? <button type='button' onClick={() => go(plan.nextSteps[0].page, plan.nextSteps[0].options)} style={styles.primary}>继续学习：{selected.label}<ArrowRight size={16} /></button> : <span style={styles.complete}><CheckCircle2 size={17} />此范围记录已覆盖</span>}
    </header>

    <div style={styles.cards}>{capabilities.map((capability) => <button key={capability.id} type='button' aria-pressed={capability.id === selected.id} onClick={() => setSelectedId(capability.id)} style={{ ...styles.card, ...(capability.id === selected.id ? styles.cardActive : {}) }}><span style={styles.cardTitle}><b>{capability.label}</b><strong style={styles.score}>{capability.score}%</strong></span><i aria-hidden='true' style={styles.track}><em style={{ ...styles.fill, width: `${capability.score}%` }} /></i><small style={styles.cardCopy}>{`${capability.covered} / ${capability.total} ${capability.unit}`} · {capability.description}</small><span style={styles.detailHint}>{capability.id === selected.id ? '正在查看记录' : '查看记录与下一步'}</span></button>)}</div>

    <div style={styles.detail}>
      <div style={styles.detailHeading}><div><span style={styles.detailLabel}>覆盖 {selected.covered} / {selected.total} {selected.unit} · {selected.score}%</span><h3 style={styles.detailTitle}>{selected.label} · 学习记录</h3></div><p style={styles.basis}>{plan.basis}</p></div>
      <div style={styles.columns}>
        <article style={styles.panel}>
          <h4 style={styles.panelTitle}><CheckCircle2 size={18} />已计入的课程记录</h4>
          {visibleEvidence.length ? <div style={styles.list}>{visibleEvidence.map((item) => <button key={item.id} type='button' onClick={() => go(item.page, item.options)} style={styles.row}><span><b>{item.title}</b><small style={styles.rowCopy}>{item.reason}</small></span><span style={styles.stage}>{stageLabels[item.stage]}</span></button>)}</div> : <p style={styles.empty}>尚无达到记录门槛的课程节点。完成下方第一步后，这里会出现对应的学习记录。</p>}
          {plan.evidence.length > visibleEvidence.length ? <small style={styles.more}>另有 {plan.evidence.length - visibleEvidence.length} 条课程记录已计入覆盖率</small> : null}
        </article>
        <article style={styles.panel}>
          <h4 style={styles.panelTitle}><Sparkles size={18} />下一步课程建议</h4>
          {plan.nextSteps.length ? <ol style={styles.steps}>{plan.nextSteps.map((item, index) => <li key={item.id}><button type='button' onClick={() => go(item.page, item.options)} style={styles.step}><span style={styles.stepNo}>{index + 1}</span><span><b>{item.title}</b><small style={styles.rowCopy}>{item.stage ? `从“${stageLabels[item.stage]}”继续，目标到“${stageLabels[item.target]}”` : item.reason}</small></span><ArrowRight size={16} /></button></li>)}</ol> : <p style={styles.empty}><CheckCircle2 size={17} />此统计范围的记录已覆盖；这不表示能力已认证，可到路线页选择进阶主题。</p>}
        </article>
      </div>
    </div>
  </section>
}

const styles = {
  shell: { margin: '18px 0', padding: '24px', border: '1px solid rgba(72, 99, 160, .18)', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(241,246,255,.96), rgba(255,255,255,.98))' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'end', flexWrap: 'wrap' },
  eyebrow: { color: '#5169a8', fontSize: '12px', fontWeight: 800, letterSpacing: '.08em' },
  title: { margin: '6px 0' }, muted: { margin: 0, color: '#5c6477' },
  primary: { display: 'inline-flex', alignItems: 'center', gap: '8px', border: 0, borderRadius: 'var(--lo-control-radius)', padding: '10px 14px', background: 'var(--lo-accent)', color: '#fff', fontWeight: 750, cursor: 'pointer' },
  complete: { display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#24745a', fontWeight: 700 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px' },
  card: { border: '1px solid rgba(72, 99, 160, .16)', borderRadius: '16px', padding: '16px', background: '#fff', textAlign: 'left' as const, cursor: 'pointer' },
  cardActive: { borderColor: '#315fd8', boxShadow: '0 0 0 2px rgba(49,95,216,.1)' },
  cardTitle: { display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline' }, score: { color: 'var(--lo-accent)', fontSize: '22px' },
  track: { display: 'block', height: '7px', margin: '12px 0', borderRadius: '99px', background: 'var(--lo-line)', overflow: 'hidden' }, fill: { display: 'block', height: '100%', borderRadius: 'inherit', background: 'var(--lo-accent)' },
  cardCopy: { display: 'block', color: '#687084', lineHeight: 1.5 }, detailHint: { display: 'block', marginTop: '12px', color: '#315fd8', fontSize: '12px', fontWeight: 700 },
  detail: { marginTop: '16px', padding: '18px', borderRadius: '16px', background: '#fff', border: '1px solid rgba(72,99,160,.14)' },
  detailHeading: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '18px', alignItems: 'end', marginBottom: '14px' },
  detailLabel: { color: '#647197', fontSize: '12px', fontWeight: 700 }, detailTitle: { margin: '5px 0 0', fontSize: '20px' }, basis: { margin: 0, color: '#5c6477', lineHeight: 1.65 },
  columns: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '12px' }, panel: { padding: '16px', borderRadius: '14px', background: '#f7f9fd' },
  panelTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px', fontSize: '15px' }, list: { display: 'grid', gap: '8px' },
  row: { display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '11px', border: '1px solid #e2e7f1', borderRadius: '11px', background: '#fff', textAlign: 'left' as const, cursor: 'pointer' },
  rowCopy: { display: 'block', marginTop: '4px', color: '#697287', lineHeight: 1.45 }, stage: { flex: '0 0 auto', color: '#24745a', fontSize: '12px', fontWeight: 700 },
  empty: { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#697287', lineHeight: 1.6 }, more: { display: 'block', marginTop: '10px', color: '#697287' },
  steps: { display: 'grid', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }, step: { display: 'grid', width: '100%', gridTemplateColumns: '28px 1fr 16px', alignItems: 'center', gap: '10px', padding: '10px', border: 0, borderRadius: '11px', background: '#fff', textAlign: 'left' as const, cursor: 'pointer' },
  stepNo: { display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#e8eefc', color: '#315fd8', fontWeight: 800 },
} as const
