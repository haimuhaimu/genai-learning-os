import { useEffect, useState } from 'react'
import { Beaker, Calculator, Database, Gauge, Layers3, Scale, Server, Thermometer } from 'lucide-react'
import { distillExperiments } from '../../distillData'
import { BlackboxApiLab, LaunchGate, StackLab, TeacherBudgetLab } from './DistillLabsB'
import { DataRecipeLab, LossMixLab, SeqVsTokenLab, TemperatureLab } from './DistillLabsA'

const icons = [Thermometer, Scale, Database, Layers3, Calculator, Server, Gauge, Beaker]
type Go = (page: string, options?: Record<string, string>) => void

export default function DistillLabs({ initialExperiment, go }: { initialExperiment?: string; go: Go }) {
  const [active, setActive] = useState(initialExperiment && distillExperiments.some((item) => item[0] === initialExperiment) ? initialExperiment : 'temperature-lab')
  useEffect(() => { if (initialExperiment && distillExperiments.some((item) => item[0] === initialExperiment)) setActive(initialExperiment) }, [initialExperiment])
  const meta = distillExperiments.find((item) => item[0] === active) ?? distillExperiments[0]
  const select = (id: string) => { setActive(id); go('distill-lab', { experiment: id }) }
  return <section className='distill-scope'><header className='distill-page-head'><span>DISTILLATION LAB · 8 EXPERIMENTS</span><h1>蒸馏实验室：把公式变成旋钮</h1><p>8 个实验全部并入同一 SPA；确定性机制计算、边界 clamp、重置/运行、状态诊断和评审提示。</p><div>机制级教学仿真 · 不代表任何商业模型内部实现</div></header><nav className='distill-lab-nav'>{distillExperiments.map((item,index)=>{const Icon=icons[index];return <button key={item[0]} className={active===item[0]?'active':''} onClick={()=>select(item[0])}><Icon/><span><small>{item[1]}</small><b>{item[2]}</b></span></button>})}</nav><div className='distill-lab-shell'><header><span>{meta[1]} · {meta[0]}</span><h2>{meta[2]}</h2></header>{active==='temperature-lab'&&<TemperatureLab/>}{active==='loss-mix-lab'&&<LossMixLab/>}{active==='data-recipe-lab'&&<DataRecipeLab/>}{active==='seq-vs-token-lab'&&<SeqVsTokenLab/>}{active==='teacher-budget-lab'&&<TeacherBudgetLab/>}{active==='blackbox-api-lab'&&<BlackboxApiLab/>}{active==='stack-lab'&&<StackLab/>}{active==='launch-gate'&&<LaunchGate/>}</div></section>
}
