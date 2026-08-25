/* eslint-disable react-refresh/only-export-components */
import type { ContentLevel, ContentTag } from '../../content/vocabulary'
import { contentLevelLabels } from '../../content/vocabulary'
import type { ContentType } from '../../content/types'

export type FilterState = {
  type: 'all' | ContentType
  tag: 'all' | ContentTag
  level: 'all' | ContentLevel
}

export const emptyFilters: FilterState = { type: 'all', tag: 'all', level: 'all' }

export default function ContentFilters({ value, onChange, resultCount, types, tags, showLevel = true }: {
  value: FilterState
  onChange: (value: FilterState) => void
  resultCount: number
  types?: readonly { value: ContentType; label: string }[]
  tags: readonly { value: ContentTag; label: string }[]
  showLevel?: boolean
}) {
  return (
    <div className='content-filters'>
      {types?.length ? <fieldset><legend>内容类型</legend><div className='content-type-switch'><button type='button' className={value.type === 'all' ? 'is-active' : ''} aria-pressed={value.type === 'all'} onClick={() => onChange({ ...value, type: 'all' })}>全部</button>{types.map((item) => <button type='button' key={item.value} className={value.type === item.value ? 'is-active' : ''} aria-pressed={value.type === item.value} onClick={() => onChange({ ...value, type: item.value })}>{item.label}</button>)}</div></fieldset> : null}
      <label>主题<select value={value.tag} onChange={(event) => onChange({ ...value, tag: event.target.value as FilterState['tag'] })}><option value='all'>全部主题</option>{tags.map((tag) => <option key={tag.value} value={tag.value}>{tag.label}</option>)}</select></label>
      {showLevel ? <label>学习层级<select value={value.level} onChange={(event) => onChange({ ...value, level: event.target.value as FilterState['level'] })}><option value='all'>全部层级</option>{Object.entries(contentLevelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label> : null}
      <p role='status' aria-live='polite'>当前显示 {resultCount} 项</p>
    </div>
  )
}
