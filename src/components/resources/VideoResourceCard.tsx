import ExternalLink from '../shell/ExternalLink'
import type { VideoResource } from '../../resources/videoCatalog'

const sourceLabels: Record<VideoResource['sourceType'], string> = {
  youtube: 'YouTube 视频',
  bilibili: 'B站视频',
  course: '课程',
  paper: '论文',
  blog: '博客',
  report: '深度报道',
}

const actionLabels: Record<VideoResource['sourceType'], string> = {
  youtube: '在 YouTube 打开 ↗',
  bilibili: '在 B 站打开 ↗',
  course: '打开课程 ↗',
  paper: '查看论文 ↗',
  blog: '打开博客 ↗',
  report: '打开报道 ↗',
}

export default function VideoResourceCard({ resource }: { resource: VideoResource }) {
  const actionLabel = actionLabels[resource.sourceType]

  return (
    <article className='video-resource-card'>
      <header>
        <span>{resource.level}</span>
        <div aria-label='资源信息'>
          <small className={`video-origin-badge origin-${resource.contentOrigin}`}>{resource.contentOrigin}</small>
          <small>{resource.language === 'zh' ? '中文' : '英文'}</small>
          <small>{sourceLabels[resource.sourceType]}</small>
          {resource.durationLabel ? <small>{resource.durationLabel}</small> : null}
        </div>
      </header>
      <h3>{resource.title}</h3>
      {resource.speaker ? <p className='video-resource-speaker'>讲者 · {resource.speaker}</p> : null}
      <p className='video-resource-org'>来源 · {resource.org}</p>
      <dl>
        <div><dt>为什么值得看</dt><dd>{resource.whyWorthWatching}</dd></div>
        <div className='video-return-question'><dt>看完回来想一想</dt><dd>{resource.returnQuestion}</dd></div>
      </dl>
      <div className='video-resource-actions'>
        <ExternalLink href={resource.url} accessibleName={`${actionLabel.replace(' ↗', '')}：${resource.title}`}>
          {actionLabel}
        </ExternalLink>
        {resource.contentOrigin === '中文译制' && resource.originalSourceUrl ? (
          <ExternalLink className='video-original-link' href={resource.originalSourceUrl} accessibleName={`查看原始来源：${resource.title}`}>
            查看原始来源 ↗
          </ExternalLink>
        ) : null}
      </div>
    </article>
  )
}
