import { useEffect, useId, useRef, useState } from 'react'
import type { LearningReceipt } from '../../learningJourney'

type Props<T extends { record: unknown }, R> = {
  practice?: { receipt: LearningReceipt }; reflection?: R; pending: boolean
  title: string; filename: string; recordDescription: string
  prepare: (input: { receipt?: LearningReceipt; reflection?: R }) => Promise<T>
  renderPrompt: (pack: T) => string
}
type Artifact<T> = { key: string; pack: T }
type Notice = { key: string; text: string; error: boolean }

export default function CoachTaskPanel<T extends { record: unknown }, R>({ practice, reflection, pending, title, filename, recordDescription, prepare, renderPrompt }: Props<T, R>) {
  const id = useId()
  const [sharedSource, setSharedSource] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<Artifact<T> | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)
  const generation = useRef(0)
  const activeGeneration = useRef<{ key: string; token: number } | null>(null)
  const activeCopy = useRef<number | null>(null)
  const copySequence = useRef(0)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const downloads = useRef(new Set<string>())
  // Opt-in belongs to this exact saved source, including the recap. A replacement
  // becomes unchecked on its first render, before any effect can run.
  const sourceKey = JSON.stringify([practice ?? null, reflection ?? null])
  const include = Boolean(practice) && !pending && sharedSource === sourceKey
  const contextKey = JSON.stringify([sourceKey, include, pending])
  const current = artifact?.key === contextKey ? artifact : null
  const currentNotice = notice?.key === contextKey ? notice : null
  const busy = working === contextKey
  const copyBusy = copying === contextKey
  const prompt = current ? renderPrompt(current.pack) : ''

  useEffect(() => {
    // Invalidation must clear presentation state too. If the parent cancels a
    // preview and returns to the same key, an abandoned request cannot stay busy.
    setWorking(null)
    setCopying(null)
    return () => {
      generation.current += 1
      copySequence.current += 1
      activeGeneration.current = null
      activeCopy.current = null
    }
  }, [contextKey, prepare])

  useEffect(() => () => {
    for (const url of downloads.current) URL.revokeObjectURL(url)
    downloads.current.clear()
  }, [])

  useEffect(() => {
    if (!current) return
    resultRef.current?.focus({ preventScroll: true })
    resultRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [current])

  function changeSharing(checked: boolean) {
    generation.current += 1
    copySequence.current += 1
    activeGeneration.current = null
    activeCopy.current = null
    setSharedSource(checked ? sourceKey : null)
    setArtifact(null); setNotice(null); setWorking(null); setCopying(null)
  }

  async function generate() {
    if (activeGeneration.current?.key === contextKey) return
    const token = ++generation.current
    const key = contextKey
    activeGeneration.current = { key, token }
    copySequence.current += 1; activeCopy.current = null
    setWorking(key); setCopying(null); setArtifact(null)
    setNotice({ key, text: include ? '正在重放这份实操，并核对前后证据……' : '正在整理课程说明；不读取或加入实操结果……', error: false })
    const input = include && practice ? { receipt: practice.receipt, reflection } : {}
    try {
      const pack = await prepare(input)
      if (generation.current !== token) return
      setArtifact({ key, pack })
      setNotice({ key, text: include ? '任务包已生成，包含本次固定练习的操作、核对结果和复盘选择。尚未发送给任何 AI。' : '课程任务包已生成，不含你的实操或复盘。尚未发送给任何 AI。', error: false })
    } catch (error) {
      if (generation.current === token) setNotice({ key, text: (error instanceof Error ? error.message : '暂时没能生成任务包，请重试。') + ' 已保存的实操和复盘没有改变。', error: true })
    } finally {
      if (generation.current === token) {
        activeGeneration.current = null
        setWorking(null)
      }
    }
  }

  async function copy() {
    if (!current || busy || activeCopy.current !== null) return
    const token = ++copySequence.current
    const version = generation.current
    const key = contextKey
    activeCopy.current = token
    setCopying(key)
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable')
      await navigator.clipboard.writeText(prompt)
      if (copySequence.current === token && generation.current === version) setNotice({ key, text: '已复制。请主动粘贴给自己的 AI；对话后再回本页，用真实结果核对理解。', error: false })
    } catch {
      if (copySequence.current !== token || generation.current !== version) return
      textRef.current?.focus(); textRef.current?.select()
      setNotice({ key, text: '浏览器没有允许自动复制。任务包仍在下面，请手动全选、复制；没有发送给任何 AI。', error: true })
    } finally {
      if (copySequence.current === token) { activeCopy.current = null; setCopying(null) }
    }
  }

  function download() {
    if (!current || busy) return
    let url: string | undefined
    let link: HTMLAnchorElement | undefined
    try {
      url = URL.createObjectURL(new Blob([JSON.stringify(current.pack, null, 2)], { type: 'application/json' }))
      downloads.current.add(url)
      link = document.createElement('a')
      link.href = url; link.download = filename
      document.body.append(link); link.click()
      setNotice({ key: contextKey, text: '已发起 JSON 下载。文件是否保存成功由浏览器决定；本页没有上传。', error: false })
    } catch {
      setNotice({ key: contextKey, text: '浏览器暂时无法下载。任务包仍保留，可以从下面手动复制。', error: true })
    } finally {
      link?.remove()
      if (url) {
        const created = url
        setTimeout(() => { URL.revokeObjectURL(created); downloads.current.delete(created) }, 0)
      }
    }
  }

  return <section className='journey-import' aria-labelledby={`${id}-title`}>
    <span className='journey-kicker'>本地提示 ＋ 你自己的 AI</span>
    <h3 id={`${id}-title`}>{title}</h3>
    <p>这里没有接通任何 AI 服务，也不会自动发送。你决定分享什么，再把任务包交给自己的 AI；它能读懂这关的目标、操作和证据。</p>
    <p><strong>先去亲手试</strong> → <strong>交给自己的 AI</strong> → <strong>回本页核对理解</strong>。让它一次问一个问题，按你看到的变化提示，不替你选择答案；对话和 AI 代跑都不是你的通关凭证。</p>
    <label htmlFor={`${id}-share`}><input id={`${id}-share`} type='checkbox' checked={include} disabled={!practice || pending} onChange={event => changeSharing(event.target.checked)} />加入这次已保存的实操和复盘</label>
    <p>{pending ? '先保存或取消新记录预览，再选择分享哪次实操。现在仍可只生成课程说明。' : practice ? `默认只包含课程说明。勾选后，加入${recordDescription}；不加入自由画布、草稿或其他学习记录。` : '还没有已保存的实操，先生成不含个人结果的课程说明也可以。完成后再带回记录。'}</p>
    <button type='button' className='is-primary' disabled={busy} onClick={() => void generate()}>{busy ? '正在生成……' : '生成陪练任务包'}</button>
    {currentNotice && <p className='journey-message' role='status' aria-live='polite' data-error={currentNotice.error}>{currentNotice.text}</p>}
    {current && <div>
      <h4 ref={resultRef} tabIndex={-1}>{current.pack.record ? '含实操证据的陪练任务包' : '只有课程说明的陪练任务包'}</h4>
      <p>先看清下面的内容。复制后才会离开本页；接收方 AI 不能只凭这份说明声称已验证或你已掌握。</p>
      <button type='button' disabled={busy || copyBusy} onClick={() => void copy()}>{copyBusy ? '正在复制……' : '复制给我的 AI'}</button>{' '}
      <button type='button' disabled={busy} onClick={download}>下载 JSON 任务包</button>
      <label htmlFor={`${id}-text`}>可复制的任务说明与结构化记录</label>
      <textarea id={`${id}-text`} ref={textRef} aria-label='AI 陪练任务包内容' rows={7} value={prompt} readOnly spellCheck={false} />
    </div>}
  </section>
}
