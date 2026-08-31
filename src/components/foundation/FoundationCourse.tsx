import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Beaker, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Lightbulb, ShieldCheck, Sigma, Stethoscope, Target } from 'lucide-react'
import { foundationNodes } from '../../foundationData'
import ShareButton from '../shell/ShareButton'
import { ActivationExperiment, CrossEntropyExperiment, GradientDescentExperiment, MlpWidthExperiment, SoftmaxTemperatureExperiment } from '../course/ConceptExperiments'
import { markProgress, readProgress, stageLabels, type LearningStage, type ProgressMap } from '../../progress'

type Go = (page: string, options?: Record<string, string>) => void

export default function FoundationCourse({ initialNode, initialSection, go }: { initialNode?: string; initialSection?: string; go: Go }) {
  const initialIndex = Math.max(0, foundationNodes.findIndex((node) => node.id === initialNode))
  const [index, setIndex] = useState(initialIndex)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState<'idle' | 'pass' | 'fail'>('idle')
  const [hint, setHint] = useState(false)
  const [rubric, setRubric] = useState([false, false, false, false, false])
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress())
  const node = foundationNodes[index]
  const hasInlineExperiment = ['softmax', 'cross-entropy', 'gradient-descent', 'activation', 'mlp'].includes(node.id)
  const stage = (progress[node.id] ?? 0) as LearningStage
  const sectionId = initialSection === 'hand-calc' ? 'foundation-hand-calc' : undefined

  useEffect(() => {
    const requested = foundationNodes.findIndex((item) => item.id === initialNode)
    if (requested >= 0) setIndex(requested)
  }, [initialNode])
  useEffect(() => {
    setAnswer(''); setChecked('idle'); setHint(false); setRubric([false, false, false, false, false])
    setProgress(markProgress(node.id, 1))
    requestAnimationFrame(() => document.getElementById(sectionId ?? '')?.scrollIntoView({ behavior: 'smooth' }))
  }, [node.id, sectionId])

  const goNode = (next: number) => {
    const safe = Math.max(0, Math.min(foundationNodes.length - 1, next))
    setIndex(safe)
    go('foundation', { node: foundationNodes[safe].id })
  }
  const checkAnswer = () => {
    const pass = Math.abs(Number(answer) - node.handCalc.answer) <= node.handCalc.tolerance
    setChecked(pass ? 'pass' : 'fail')
    if (pass) setProgress(markProgress(node.id, 2))
  }
  const reviewDone = useMemo(() => rubric.slice(0, 3).every(Boolean), [rubric])
  const toggleRubric = (itemIndex: number) => {
    const next = rubric.map((item, i) => i === itemIndex ? !item : item)
    setRubric(next)
    if (next.slice(0, 3).every(Boolean)) setProgress(markProgress(node.id, 4))
  }
  const openExperiment = () => {
    setProgress(markProgress(node.id, 3))
    go('foundation-lab', { experiment: node.experiment, node: node.id })
  }

  const nodeUrl = (section?: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', 'foundation')
    url.searchParams.set('node', node.id)
    if (section) url.searchParams.set('section', section)
    else url.searchParams.delete('section')
    return url.toString()
  }

  return <section className='foundation-course'>
    <aside className='foundation-rail'><header><span>ALGORITHM FOUNDATION</span><h2>算法能力路线</h2><p>硬先修 · 11 节点</p></header>{foundationNodes.map((item, itemIndex) => <button key={item.id} className={itemIndex === index ? 'active' : ''} onClick={() => goNode(itemIndex)}><i>{item.code}</i><span><b>{item.title}</b><small>{stageLabels[(progress[item.id] ?? 0) as LearningStage]}</small></span></button>)}</aside>
    <main className='foundation-lesson'>
      <header className='foundation-title'><div><span>{node.code} · PHASE {node.phase}</span><h1>{node.title}</h1><p>当前状态：<b>{stageLabels[stage]}</b></p><div className='foundation-share-actions'><button type='button' className='strategy-route-entry' onClick={() => go('foundation-lab', { experiment: 'case-overconfident' })}><Target />该路线策略案例</button><ShareButton label='复制本节点' url={() => nodeUrl()} /><ShareButton label='复制手算题' url={() => nodeUrl('hand-calc')} /></div></div><div className={`stage-orbit stage-${stage}`}><strong>{stage}/4</strong><small>学习阶段</small></div></header>
      <div className='foundation-six-grid'>
        <article className='foundation-card intuition-card'><header><Lightbulb />01 · 一句话直觉与决策价值</header><h2>{node.intuition}</h2><p><b>产品价值：</b>{node.decision}</p></article>
        {hasInlineExperiment ? <article className='foundation-card experiment-card'><header><Beaker />02 · 先做实验，再解释</header>{node.id === 'softmax' ? <SoftmaxTemperatureExperiment onRun={() => setProgress(markProgress(node.id, 3))} /> : node.id === 'cross-entropy' ? <CrossEntropyExperiment onRun={() => setProgress(markProgress(node.id, 3))} /> : node.id === 'activation' ? <ActivationExperiment onRun={() => setProgress(markProgress(node.id, 3))} /> : node.id === 'mlp' ? <MlpWidthExperiment onRun={() => setProgress(markProgress(node.id, 3))} /> : <GradientDescentExperiment onRun={() => setProgress(markProgress(node.id, 3))} />}{node.distillModule ? <button className='secondary' onClick={() => go('distill-course', { module: node.distillModule ?? 'why-distill' })}>连接蒸馏模块</button> : null}</article> : null}
        <article className='foundation-card formula-foundation'><header><Sigma />{hasInlineExperiment ? '03 · 解释实现与数学' : '02 · 公式逐项拆解'}</header>{hasInlineExperiment ? <details><summary>展开公式、变量与常见误区</summary><code>{node.formula}</code><ul>{node.variables.map((item) => <li key={item}>{item}</li>)}</ul><div className='misconception'><CircleAlert />常见误区：{node.misconception}</div></details> : <><code>{node.formula}</code><ul>{node.variables.map((item) => <li key={item}>{item}</li>)}</ul><div className='misconception'><CircleAlert />常见误区：{node.misconception}</div></>}</article>
        <article id='foundation-hand-calc' className='foundation-card hand-card'><header><CheckCircle2 />{hasInlineExperiment ? '04 · 手算一下' : '03 · 互动手算题'}</header><h3>{node.handCalc.question}</h3><div className='answer-row'><input type='number' step='any' value={answer} onChange={(event) => { setAnswer(event.target.value); setChecked('idle') }} placeholder='填写数值答案' /><button onClick={checkAnswer}>逐步校验</button></div><button className='text-button' onClick={() => setHint(!hint)}>{hint ? '收起提示' : '需要提示？'}</button>{hint ? <p className='hint'>{node.handCalc.hint}</p> : null}{checked !== 'idle' ? <div className={`answer-feedback ${checked}`}><b>{checked === 'pass' ? '通过：进入标准步骤' : '暂未通过：检查代入与运算'}</b>{checked === 'pass' ? <ol>{node.handCalc.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}</div> : null}</article>
        {!hasInlineExperiment ? <article className='foundation-card experiment-card'><header><Beaker />04 · 参数实验</header><h3>{node.experiment}</h3><p>预期现象：{node.expected}</p><button onClick={openExperiment}>打开确定性实验<ArrowRight /></button>{node.distillModule ? <button className='secondary' onClick={() => go('distill-course', { module: node.distillModule ?? 'why-distill' })}>连接蒸馏模块</button> : null}</article> : null}
        <article className='foundation-card diagnosis-card'><header><Stethoscope />05 · 异常诊断树</header><dl><div><dt>症状</dt><dd>{node.diagnosis.symptom}</dd></div><div><dt>可能原因</dt><dd>{node.diagnosis.cause}</dd></div><div><dt>排查</dt><dd>{node.diagnosis.inspect}</dd></div><div><dt>修复验证</dt><dd>{node.diagnosis.verify}</dd></div></dl></article>
        <article className='foundation-card rubric-card'><header><ShieldCheck />06 · 策略产品评审题</header><h3>{node.review}</h3><p>完成前三项自检即可标记“已评审”：</p>{node.rubric.map((item, rubricIndex) => <label key={item}><input type='checkbox' checked={rubric[rubricIndex]} onChange={() => toggleRubric(rubricIndex)} />{item}</label>)}{reviewDone ? <div className='review-pass'><CheckCircle2 />评审自检通过</div> : null}</article>
      </div>
      <footer className='foundation-relations'><div><span>硬先修</span><b>{node.prerequisite ? foundationNodes.find((item) => item.id === node.prerequisite)?.title : '无 · 起点'}</b></div><div><span>后续节点</span><b>{node.next ? foundationNodes.find((item) => item.id === node.next)?.title : '进入蒸馏项目路线'}</b></div><div><span>关联专题</span><b>{node.related.join(' / ')}</b></div></footer>
      <div className='lesson-pagination'><button disabled={index === 0} onClick={() => goNode(index - 1)}><ChevronLeft />上一节点</button><span>机制级教学仿真 · 同参数可复现</span><button disabled={index === foundationNodes.length - 1} onClick={() => goNode(index + 1)}>下一节点<ChevronRight /></button></div>
    </main>
  </section>
}
