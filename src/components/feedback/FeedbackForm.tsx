import type { FeedbackDraft } from '../../feedback/githubIssue'

const gainOptions = [
  { value: '1', label: '1 · 几乎没有' },
  { value: '2', label: '2 · 较少' },
  { value: '3', label: '3 · 有一些' },
  { value: '4', label: '4 · 很有收获' },
  { value: '5', label: '5 · 非常有收获' },
] as const

export default function FeedbackForm({ value, onChange }: {
  value: FeedbackDraft
  onChange: (next: FeedbackDraft) => void
}) {
  const update = <Key extends keyof FeedbackDraft>(key: Key, next: FeedbackDraft[Key]) => onChange({ ...value, [key]: next })

  return (
    <form className='lo-feedback-form' onSubmit={(event) => event.preventDefault()}>
      <div className='lo-feedback-fields'>
        <label htmlFor='lo-feedback-gain'>
          <span>收获程度</span>
          <select id='lo-feedback-gain' value={value.learningGain} onChange={(event) => update('learningGain', event.target.value as FeedbackDraft['learningGain'])}>
            <option value=''>请选择</option>
            {gainOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label htmlFor='lo-feedback-depth'>
          <span>难度 / 深度</span>
          <select id='lo-feedback-depth' value={value.depth} onChange={(event) => update('depth', event.target.value as FeedbackDraft['depth'])}>
            <option value=''>请选择</option>
            <option value='too-shallow'>偏浅</option>
            <option value='right'>合适</option>
            <option value='too-deep'>偏深</option>
          </select>
        </label>
        <label htmlFor='lo-feedback-transfer'>
          <span>能否迁移到工作</span>
          <select id='lo-feedback-transfer' value={value.workTransfer} onChange={(event) => update('workTransfer', event.target.value as FeedbackDraft['workTransfer'])}>
            <option value=''>请选择</option>
            <option value='yes'>可以</option>
            <option value='unsure'>还不确定</option>
            <option value='no'>暂时不能</option>
          </select>
        </label>
      </div>
      <label htmlFor='lo-feedback-blocker'>
        <span>最大的卡点是什么？</span>
        <textarea id='lo-feedback-blocker' maxLength={1200} rows={3} value={value.blocker} onChange={(event) => update('blocker', event.target.value)} placeholder='例如：概念跳跃太快，不知道该用哪个指标判断。' />
      </label>
      <label htmlFor='lo-feedback-suggestion'>
        <span>你希望我们怎么改？</span>
        <textarea id='lo-feedback-suggestion' maxLength={1200} rows={3} value={value.suggestion} onChange={(event) => update('suggestion', event.target.value)} placeholder='例如：增加一个来自真实工作的短例子。' />
      </label>
    </form>
  )
}
