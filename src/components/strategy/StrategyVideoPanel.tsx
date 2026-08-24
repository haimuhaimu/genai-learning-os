import { ArrowRight } from 'lucide-react'
import type { VideoResource } from '../../resources/videoCatalog'
import VideoResourceCard from '../resources/VideoResourceCard'

type Props = {
  videos: readonly VideoResource[]
  remaining?: number
  onViewAll?: () => void
  onOpen?: (video: VideoResource) => void
}

export default function StrategyVideoPanel({ videos, remaining = 0, onViewAll, onOpen }: Props) {
  if (!videos.length) return null

  return (
    <details className='strategy-video-panel'>
      <summary>参考视频库（可选）</summary>
      <div className='strategy-video-panel-content'>
        <header>
          <span>策略摘要之后</span>
          <h2>先形成自己的策略摘要，再用视频补足机制。</h2>
          <p>观看不是完成进度。请带着当前案例的决策问题选择资源。</p>
        </header>
        <div className='video-card-grid'>
          {videos.map((video) => <VideoResourceCard key={video.id} resource={video} onOpen={() => onOpen?.(video)} />)}
        </div>
        {remaining > 0 && onViewAll ? (
          <div className='strategy-video-more'>
            <span>还有 {remaining} 条相关资源</span>
            <button type='button' onClick={onViewAll}>去视频库查看全部 <ArrowRight aria-hidden='true' /></button>
          </div>
        ) : null}
      </div>
    </details>
  )
}
