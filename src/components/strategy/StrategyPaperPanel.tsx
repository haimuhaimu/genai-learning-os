import { ArrowRight } from 'lucide-react'
import type { PaperResource } from '../../resources/paperCatalog'
import PaperResourceCard from '../resources/PaperResourceCard'

type Props = {
  papers: readonly PaperResource[]
  onOpen: (paper: PaperResource) => void
  onOpenLab: (paper: PaperResource) => void
  onViewAll: () => void
}

export default function StrategyPaperPanel({ papers, onOpen, onOpenLab, onViewAll }: Props) {
  if (!papers.length) return null
  return (
    <details className='strategy-paper-panel' open>
      <summary>关联论文（可选）</summary>
      <div className='strategy-paper-panel-content'>
        <header><span>从机制验证判断</span><h2>阅读论文解释，或亲手操作机制复现。</h2><p>只有主动点击打开时才记录“已触达”，不会推断阅读完成度。</p></header>
        <div className='paper-card-grid'>{papers.map((paper) => <PaperResourceCard key={paper.id} paper={paper} onOpen={() => onOpen(paper)} onOpenLab={() => onOpenLab(paper)} />)}</div>
        <button type='button' className='strategy-paper-more' onClick={onViewAll}>去论文库查看全部 <ArrowRight aria-hidden='true' /></button>
      </div>
    </details>
  )
}
