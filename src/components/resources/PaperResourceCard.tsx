import ExternalLink from '../shell/ExternalLink'
import { hasPaperLab } from '../paperLabs/paperLabsRegistry'
import type { PaperResource } from '../../resources/paperCatalog'

type Props = {
  paper: PaperResource
  onOpen?: () => void
  onOpenLab?: () => void
}

export default function PaperResourceCard({ paper, onOpen, onOpenLab }: Props) {
  const labAvailable = hasPaperLab(paper.id)
  return (
    <article className='paper-resource-card'>
      <header>
        <div><span>{paper.area}</span><span>{paper.level}</span><span>{paper.kind}</span></div>
        <small>{paper.year} · 约 {paper.readingMinutes} 分钟</small>
      </header>
      <h3>{paper.title}</h3>
      <p className='paper-authors'>{paper.authors}</p>
      <dl>
        <div className='paper-glance'><dt>30 秒看懂</dt><dd><b>{paper.oneLine}</b><span>{paper.problem}</span></dd></div>
        <div><dt>关键机制</dt><dd>{paper.mechanism}</dd></div>
        <div><dt>产品视角</dt><dd>{paper.productLens}</dd></div>
        <div className='paper-read-question'><dt>带回课程的问题</dt><dd>{paper.readQuestion}</dd></div>
      </dl>
      <div className='paper-resource-actions'>
        <ExternalLink href={paper.url} onClick={onOpen} accessibleName={`阅读原论文：${paper.title}`}>阅读原论文 ↗</ExternalLink>
        {labAvailable && onOpenLab ? <button type='button' onClick={onOpenLab}>交互复现 →</button> : null}
      </div>
    </article>
  )
}
