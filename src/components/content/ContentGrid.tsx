import { ArrowRight, Beaker, BookOpen, FileText, Target, Video } from 'lucide-react'
import type { ContentEntry } from '../../content/types'
import { contentLevelLabels, contentTypeLabels } from '../../content/vocabulary'
import PaperResourceCard from '../resources/PaperResourceCard'
import VideoResourceCard from '../resources/VideoResourceCard'

type Go = (page: string, options?: Record<string, string>) => void
const icons = { course: BookOpen, case: Target, lab: Beaker, video: Video, paper: FileText }

export default function ContentGrid({ entries, go, variant = 'default' }: { entries: readonly ContentEntry[]; go: Go; variant?: 'default' | 'resources' }) {
  return (
    <div className={`content-grid content-grid-${variant}`} role='list'>
      {entries.map((entry) => {
        if (entry.type === 'video') return <div role='listitem' key={entry.id}><VideoResourceCard resource={entry.resource} /></div>
        if (entry.type === 'paper') return <div role='listitem' key={entry.id}><PaperResourceCard paper={entry.resource} onOpenLab={() => go('paper-lab', { paper: entry.resource.id })} /></div>
        const Icon = icons[entry.type]
        return (
          <article role='listitem' className={`content-card is-${entry.type}`} key={entry.id}>
            <header><Icon aria-hidden='true' /><span>{contentTypeLabels[entry.type]} / {contentLevelLabels[entry.level]}</span></header>
            <h2>{entry.title}</h2><p>{entry.summary}</p>
            {entry.type === 'course' ? <dl><div><dt>适合谁</dt><dd>{entry.audience}</dd></div><div><dt>学习结果</dt><dd>{entry.outcome}</dd></div></dl> : null}
            <footer><button type='button' onClick={() => go(entry.route.page, entry.route.options)}>打开{contentTypeLabels[entry.type]}<ArrowRight aria-hidden='true' /></button>{entry.type === 'course' && entry.labRoute ? <button type='button' className='is-quiet' onClick={() => go(entry.labRoute!.page, entry.labRoute!.options)}>进入关联实验</button> : null}</footer>
          </article>
        )
      })}
    </div>
  )
}
