import { useMemo, useState } from 'react'
import { ArrowRight, Filter, Sparkles, Video } from 'lucide-react'
import { strategyCaseCatalog } from '../strategy/caseCatalog'
import type { RouteId } from '../strategy/types'
import { videoResources, type ContentOrigin, type VideoResource } from '../../resources/videoCatalog'
import VideoResourceCard from './VideoResourceCard'

type FilterValue<T extends string> = 'all' | T
type FilterOption<T extends string> = { id: FilterValue<T>; label: string }

const languageOptions: Array<FilterOption<VideoResource['language']>> = [
  { id: 'all', label: '全部语言' }, { id: 'zh', label: '中文' }, { id: 'en', label: '英文' },
]
const levelOptions: Array<FilterOption<VideoResource['level']>> = [
  { id: 'all', label: '全部级别' }, { id: '入门', label: '入门' }, { id: '进阶', label: '进阶' },
]
const originOptions: Array<FilterOption<ContentOrigin>> = [
  { id: 'all', label: '全部来源' }, { id: '中文原创', label: '中文原创' }, { id: '中文译制', label: '中文译制' }, { id: '海外原版', label: '海外原版' },
]
const routeOptions: Array<FilterOption<RouteId>> = [
  { id: 'all', label: '全部路线' },
  ...strategyCaseCatalog.map(({ routeId, routeLabel }) => ({ id: routeId, label: routeLabel })),
]
const karpathyFeaturedIds = [
  'karpathy-zero-to-hero-official',
  'karpathy-zero-to-hero-bilibili',
  'karpathy-reproduce-gpt2-bilibili',
]
const karpathyFeatured = karpathyFeaturedIds.map((id) => videoResources.find((video) => video.id === id)).filter((video): video is VideoResource => Boolean(video))

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

export default function VideoLibrary() {
  const [route, setRoute] = useState<FilterValue<RouteId>>('all')
  const [language, setLanguage] = useState<FilterValue<VideoResource['language']>>('all')
  const [level, setLevel] = useState<FilterValue<VideoResource['level']>>('all')
  const [origin, setOrigin] = useState<FilterValue<ContentOrigin>>('all')
  const [karpathyOnly, setKarpathyOnly] = useState(false)
  const visible = useMemo(() => videoResources.filter((video) => (
    (route === 'all' || video.relatedRouteIds.includes(route))
    && (language === 'all' || video.language === language)
    && (level === 'all' || video.level === level)
    && (origin === 'all' || video.contentOrigin === origin)
    && (!karpathyOnly || video.speaker === 'Andrej Karpathy')
  )), [route, language, level, origin, karpathyOnly])

  const showKarpathy = () => {
    setRoute('all')
    setLanguage('all')
    setLevel('all')
    setOrigin('all')
    setKarpathyOnly(true)
    window.requestAnimationFrame(() => document.querySelector('.video-library-count')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <section className='video-library-page'>
      <header className='video-library-hero'>
        <span><Video aria-hidden='true' />OPTIONAL REFERENCES</span>
        <h1>参考视频库</h1>
        <p>视频不是主线。先做一次策略决策，再按卡点补机制。</p>
        <aside>这里只收录能对应“决策、证据、代价或反馈闭环”的资源；观看不会写入学习进度。</aside>
      </header>

      <section className='karpathy-feature' aria-labelledby='karpathy-feature-title'>
        <header>
          <span><Sparkles aria-hidden='true' />机制学习精选</span>
          <h2 id='karpathy-feature-title'>Karpathy 从零构建路线</h2>
          <p>从反向传播一路手写到 GPT，适合想真正理解底层机制的人。</p>
        </header>
        <div className='video-card-grid karpathy-feature-grid'>
          {karpathyFeatured.map((video) => <VideoResourceCard key={video.id} resource={video} />)}
        </div>
        <button type='button' className='karpathy-filter-cta' onClick={showKarpathy}>查看全部 Karpathy 资源 <ArrowRight aria-hidden='true' /></button>
      </section>

      <section className='video-library-filters' aria-label='筛选参考视频'>
        <header><Filter aria-hidden='true' /><b>按当前决策卡点缩小范围</b>{karpathyOnly ? <button type='button' className='clear-karpathy-filter' onClick={() => setKarpathyOnly(false)}>清除 Karpathy 筛选</button> : null}</header>
        <FilterGroup label='路线' value={route} options={routeOptions} onChange={setRoute} />
        <FilterGroup label='语言' value={language} options={languageOptions} onChange={setLanguage} />
        <FilterGroup label='级别' value={level} options={levelOptions} onChange={setLevel} />
        <FilterGroup label='来源' value={origin} options={originOptions} onChange={setOrigin} />
      </section>
      <p className='video-library-count' aria-live='polite'>{karpathyOnly ? 'Karpathy 精选 · ' : ''}找到 {visible.length} 条参考资源</p>
      {visible.length ? (
        <div className='video-card-grid'>{visible.map((video) => <VideoResourceCard key={video.id} resource={video} />)}</div>
      ) : (
        <div className='video-library-empty'><Video aria-hidden='true' /><h2>没有符合当前组合的资源</h2><p>放宽一个筛选条件，再从真实决策卡点出发选择。</p></div>
      )}
    </section>
  )
}
