export default function PageLoading() {
  return (
    <div className='lo-page-loading' role='status' aria-live='polite'>
      <span className='lo-loading-mark' aria-hidden='true' />
      <div>
        <b>正在打开学习空间</b>
        <small>载入课程、实验与本地学习状态…</small>
      </div>
      <div className='lo-loading-lines' aria-hidden='true'><i /><i /><i /></div>
    </div>
  )
}
