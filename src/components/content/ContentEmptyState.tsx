import { SearchX } from 'lucide-react'

export default function ContentEmptyState({ onClear }: { onClear: () => void }) {
  return <div className='content-empty' role='status'><SearchX aria-hidden='true' /><h2>没有匹配内容</h2><p>当前筛选组合没有结果，可以清除筛选查看全部内容。</p><button type='button' onClick={onClear}>清除筛选</button></div>
}
