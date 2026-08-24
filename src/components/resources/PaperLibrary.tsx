import { useMemo, useState } from 'react'
import { BookMarked, Filter, Route, Sparkles } from 'lucide-react'
import { paperResources, type PaperArea, type PaperKind, type PaperLevel } from '../../resources/paperCatalog'
import PaperResourceCard from './PaperResourceCard'

type FilterValue<T extends string> = 'all' | T
type FilterOption<T extends string> = { id: FilterValue<T>; label: string }

const areaOptions: Array<FilterOption<PaperArea>> = [
  { id: 'all', label: '全部方向' },
  ...(['推荐系统', 'Transformer / LLM', '扩散 / 多模态', 'Agent / Harness', '自我改进 / 世界模型'] as const).map((id) => ({ id, label: id })),
]
const levelOptions: Array<FilterOption<PaperLevel>> = [
  { id: 'all', label: '全部难度' }, { id: '入门', label: '入门' }, { id: '进阶', label: '进阶' },
]
const kindOptions: Array<FilterOption<PaperKind>> = [
  { id: 'all', label: '全部类型' }, { id: '奠基论文', label: '奠基论文' }, { id: '方法论文', label: '方法论文' },
  { id: '系统论文', label: '系统论文' }, { id: '评估基准', label: '评估基准' },
]
const readingPaths: Array<{ title: string; description: string; paperIds: string[]; area: PaperArea }> = [
  { title: '从 Transformer 到高吞吐服务', description: '架构 → 对齐 → 注意力 IO → 解码 → KV cache', paperIds: ['attention-is-all-you-need', 'instructgpt', 'flashattention', 'speculative-decoding', 'pagedattention-vllm'], area: 'Transformer / LLM' },
  { title: '从去噪生成到可控多模态', description: 'DDPM → 潜空间 → 空间控制 → 图文对齐', paperIds: ['ddpm', 'latent-diffusion', 'controlnet', 'clip', 'blip-2'], area: '扩散 / 多模态' },
  { title: '从 Agent 行动到可验证改进', description: '推理行动 → 工具学习 → 轨迹评估 → 反思 → 世界模型', paperIds: ['react', 'toolformer', 'traject-bench', 'reflexion', 'dreamerv3'], area: 'Agent / Harness' },
]

function FilterGroup<T extends string>({ label, value, options, onChange }: {
  label: string
  value: FilterValue<T>
  options: Array<FilterOption<T>>
  onChange: (value: FilterValue<T>) => void
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div>{options.map((option) => <button key={option.id} type='button' aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>)}</div>
    </fieldset>
  )
}

export default function PaperLibrary({ go }: { go: (page: string, options?: Record<string, string>) => void }) {
  const [area, setArea] = useState<FilterValue<PaperArea>>('all')
  const [level, setLevel] = useState<FilterValue<PaperLevel>>('all')
  const [kind, setKind] = useState<FilterValue<PaperKind>>('all')
  const visible = useMemo(() => paperResources.filter((paper) => (
    (area === 'all' || paper.area === area)
    && (level === 'all' || paper.level === level)
    && (kind === 'all' || paper.kind === kind)
  )), [area, level, kind])

  const choosePath = (pathArea: PaperArea) => {
    setArea(pathArea)
    setLevel('all')
    setKind('all')
    window.requestAnimationFrame(() => document.querySelector('.paper-library-count')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <section className='paper-library-page'>
      <header className='paper-library-hero'>
        <span><BookMarked aria-hidden='true' />PAPER EXPLAINER LIBRARY</span>
        <h1>核心论文讲解库</h1>
        <p>不从摘要开始背。先看论文修复了什么失败，再把机制、工程取舍和验证问题带回课程。</p>
        <aside><b>{paperResources.length} 篇核心论文</b><span>每篇都有 30 秒讲解、产品视角与可检验问题；外链只打开原论文。</span></aside>
      </header>

      <section className='paper-reading-paths' aria-labelledby='paper-path-title'>
        <header><span><Sparkles aria-hidden='true' />精选阅读路线</span><h2 id='paper-path-title'>先沿一条问题链读，不必从头刷完</h2></header>
        <div>{readingPaths.map((path, index) => (
          <button key={path.title} type='button' onClick={() => choosePath(path.area)}>
            <small>路线 {index + 1} · {path.paperIds.length} 篇</small><b>{path.title}</b><span>{path.description}</span><em>查看这条路线 <Route aria-hidden='true' /></em>
          </button>
        ))}</div>
      </section>

      <section className='paper-library-filters' aria-label='筛选核心论文'>
        <header><Filter aria-hidden='true' /><b>按当前学习问题缩小范围</b></header>
        <FilterGroup label='方向' value={area} options={areaOptions} onChange={setArea} />
        <FilterGroup label='难度' value={level} options={levelOptions} onChange={setLevel} />
        <FilterGroup label='类型' value={kind} options={kindOptions} onChange={setKind} />
      </section>

      <p className='paper-library-count' aria-live='polite'>找到 {visible.length} 篇论文 · 预计精读 {visible.reduce((sum, paper) => sum + paper.readingMinutes, 0)} 分钟</p>
      {visible.length ? <div className='paper-card-grid'>{visible.map((paper) => <PaperResourceCard key={paper.id} paper={paper} onOpenLab={() => go('paper-lab', { paper: paper.id })} />)}</div> : (
        <div className='paper-library-empty'><BookMarked aria-hidden='true' /><h2>没有符合当前组合的论文</h2><p>放宽一个筛选条件，或从精选阅读路线重新开始。</p></div>
      )}
    </section>
  )
}
