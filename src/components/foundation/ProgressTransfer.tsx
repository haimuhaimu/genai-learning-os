import { useRef, useState } from 'react'
import { Clipboard, Download, FileUp, Upload } from 'lucide-react'
import { exportLearningData, importLearningData } from '../../progress'

function fallbackCopy(text: string) {
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

export default function ProgressTransfer() {
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const announce = (nextMessage: string, nextError = '') => {
    setMessage(nextMessage)
    setError(nextError)
  }

  const download = () => {
    const content = exportLearningData()
    const blob = new Blob([content], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `genai-learning-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    announce('备份 JSON 已下载')
  }

  const copy = async () => {
    const content = exportLearningData()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(content)
      else if (!fallbackCopy(content)) throw new Error('copy unavailable')
      announce('备份 JSON 已复制，可粘贴到另一台设备')
    } catch {
      setText(content)
      announce('剪贴板不可用，已把 JSON 放入下方文本框，请手动复制', '无法自动复制')
    }
  }

  const runImport = (content: string) => {
    const result = importLearningData(content)
    if (!result.ok) {
      announce('', result.error)
      return
    }
    announce(`导入完成：读取 ${result.imported} 条，推进 ${result.advanced} 条，保持 ${result.unchanged} 条${result.personaImported ? '，并恢复学习身份' : ''}。`)
    setError('')
  }

  const chooseFile = async (file?: File) => {
    if (!file) return
    if (file.size > 1_000_000) {
      announce('', '文件过大：备份 JSON 不能超过 1 MB。')
      return
    }
    try {
      const content = await file.text()
      setText(content)
      runImport(content)
    } catch {
      announce('', '无法读取这个文件，请确认它是文本格式的 JSON。')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className='lo-progress-transfer' aria-labelledby='lo-transfer-title'>
      <header><div><span>备份与迁移</span><h2 id='lo-transfer-title'>把本机进度带到另一台设备</h2><p>导入采用只前进不后退的合并策略：同一记录保留更高阶段，不会覆盖你已完成的学习。</p></div><FileUp aria-hidden='true' /></header>
      <div className='lo-transfer-export'>
        <button type='button' onClick={download}><Download aria-hidden='true' />下载 JSON</button>
        <button type='button' onClick={copy}><Clipboard aria-hidden='true' />复制 JSON</button>
      </div>
      <label htmlFor='lo-transfer-json'>粘贴备份 JSON</label>
      <textarea id='lo-transfer-json' value={text} onChange={(event) => setText(event.target.value)} placeholder='在这里粘贴由 GenAI Learning OS 导出的 JSON…' spellCheck={false} />
      <div className='lo-transfer-import'>
        <button type='button' onClick={() => runImport(text)} disabled={!text.trim()}><Upload aria-hidden='true' />合并导入</button>
        <label><input ref={fileRef} type='file' accept='application/json,.json' onChange={(event) => void chooseFile(event.target.files?.[0])} />选择本地 JSON</label>
      </div>
      <div className={`lo-transfer-message ${error ? 'is-error' : ''}`} role='status' aria-live='polite'>{error || message || '导出不包含账号信息；数据只在浏览器本地处理。'}</div>
    </section>
  )
}
