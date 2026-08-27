import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, Clipboard, Download, LockKeyhole, Sparkles, SlidersHorizontal } from 'lucide-react';
import { markProgress, type ProgressMap } from '../../progress';
import {
  applyK3Guide,
  K3_STEP_IDS,
  readK3Draft,
  saveK3Draft,
  validateK3Step,
  type K3Device,
  type K3Draft,
  type K3Focus,
  type K3GuideChoices,
  type K3Scenario,
  type K3StepId,
} from './k3BuildLearning';

interface Field {
  key: string;
  label: string;
  kind?: 'select' | 'number';
  options?: string[];
  hint?: string;
}
interface Lesson {
  id: K3StepId;
  title: string;
  outcome: string;
  help: string;
  fields: Field[];
}

const lessons: Lesson[] = [
  {
    id: 'goal',
    title: '选一个模型任务',
    outcome: '明确模型要解决什么问题',
    help: '系统会根据你选择的场景，补好输入、输出和失败标准。',
    fields: [
      { key: 'task', label: '模型任务' },
      { key: 'input', label: '输入' },
      { key: 'output', label: '输出' },
      { key: 'failure', label: '失败标准' },
    ],
  },
  {
    id: 'runtime',
    title: '确认运行方式',
    outcome: '得到适合当前设备的工具建议',
    help: '不用研究框架差异，系统先为你的设备匹配一条容易跑通的路线。',
    fields: [
      { key: 'system', label: '操作系统', kind: 'select', options: ['macOS', 'Windows', 'Linux'] },
      { key: 'stack', label: '推理工具', kind: 'select', options: ['Ollama', 'llama.cpp', 'Transformers', 'vLLM'] },
      { key: 'evidence', label: '环境说明' },
    ],
  },
  {
    id: 'model',
    title: '选择模型大小',
    outcome: '获得设备能装下的模型方案',
    help: '系统会自动预留运行空间，避免一开始就选到跑不动的模型。',
    fields: [
      { key: 'parameters', label: '参数量（B）', kind: 'select', options: ['0.5', '1.5', '3', '7'] },
      { key: 'bits', label: '量化位宽', kind: 'select', options: ['4', '8', '16'] },
      { key: 'capacity', label: '可用内存或显存（GiB）', kind: 'number' },
    ],
  },
  {
    id: 'infer',
    title: '体验第一次推理',
    outcome: '看懂一次模型运行记录',
    help: '先用教学示例认识命令、输出、耗时和内存，之后再替换成真实记录。',
    fields: [
      { key: 'command', label: '推理命令' },
      { key: 'output', label: '模型输出' },
      { key: 'latency', label: '耗时（毫秒）', kind: 'number' },
      { key: 'memory', label: '峰值内存（GiB）', kind: 'number' },
    ],
  },
  {
    id: 'api',
    title: '看懂模型接口',
    outcome: '认识请求、响应和异常约定',
    help: '系统会生成一组最小示例，你只需看懂数据是怎么进出模型的。',
    fields: [
      { key: 'request', label: '请求 JSON' },
      { key: 'response', label: '响应 JSON' },
      { key: 'contract', label: '接口约定' },
    ],
  },
  {
    id: 'evaluate',
    title: '生成第一版评测',
    outcome: '知道如何判断模型是否好用',
    help: '系统会生成十条教学样本，并根据你的关注点给出复盘方向。',
    fields: [
      { key: 'samples', label: '评测样本' },
      { key: 'review', label: '评测复盘' },
    ],
  },
];

const fieldStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', marginTop: 7, padding: '11px 12px',
  border: '1px solid #ffffff38', borderRadius: 8, color: '#f7f9fd',
  background: '#ffffff0c', font: 'inherit',
};

const resultText = (id: K3StepId, draft: K3Draft): string => {
  const value = draft[id];
  if (id === 'goal') return value.task || '等待生成任务方案';
  if (id === 'runtime') return value.system ? `${value.system} + ${value.stack}` : '等待匹配运行工具';
  if (id === 'model') return value.parameters ? `${value.parameters}B 模型，${value.bits}-bit 量化` : '等待计算模型大小';
  if (id === 'infer') return value.command || '等待生成教学推理记录';
  if (id === 'api') return value.request ? '请求、响应和异常约定已准备' : '等待生成接口示例';
  return value.samples ? '十条教学样本和复盘方向已准备' : '等待生成评测样本';
};

export default function K3BuildWorkshop({
  progress,
  onProgress,
}: {
  progress: ProgressMap;
  onProgress: (next: ProgressMap) => void;
}) {
  const [draft, setDraft] = useState<K3Draft>(() => readK3Draft());
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState('');
  const [custom, setCustom] = useState<K3StepId | null>(null);
  const [choices, setChoices] = useState<K3GuideChoices>({ scenario: 'summary', device: 'mac', focus: 'format' });
  const [activeStep, setActiveStep] = useState<K3StepId>(() =>
    K3_STEP_IDS.find((id) => (progress[`k3:build:${id}`] ?? 0) < 4) ?? 'evaluate',
  );
  const completed = useMemo(
    () => K3_STEP_IDS.filter((id) => (progress[`k3:build:${id}`] ?? 0) >= 4).length,
    [progress],
  );

  const store = (next: K3Draft) => {
    setDraft(next);
    saveK3Draft(next);
  };
  const update = (id: K3StepId, field: string, value: string) => {
    store({ ...draft, [id]: { ...draft[id], [field]: value } });
    setErrors((current) => ({ ...current, [id]: [] }));
  };
  const advance = (id: K3StepId, next: K3Draft) => {
    const nextErrors = validateK3Step(id, next);
    setErrors((current) => ({ ...current, [id]: nextErrors }));
    if (nextErrors.length) return;
    store(next);
    onProgress(markProgress(`k3:build:${id}`, 4));
    const nextIndex = K3_STEP_IDS.indexOf(id) + 1;
    if (nextIndex < K3_STEP_IDS.length) setActiveStep(K3_STEP_IDS[nextIndex]);
    setCustom(null);
    setNotice(`${lessons.find((item) => item.id === id)?.title}已完成，下一项已为你准备好。`);
  };
  const applyGuide = (id: K3StepId) => advance(id, applyK3Guide(id, draft, choices));
  const artifact = JSON.stringify({ title: '我的 K3 模型搭建成果', completedAt: new Date().toISOString(), choices, draft }, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(artifact);
      setNotice('成果 JSON 已复制。');
    } catch {
      setNotice('复制失败，请使用下载成果。');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([artifact], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'k3-build-result.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="k3-workshop">
    <div style={{ padding: 18, border: '1px solid #ffffff30', borderRadius: 14, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={20} /><div><h3 style={{ margin: 0 }}>不用从空白开始</h3><p style={{ margin: '4px 0 0', color: '#c5d0e0' }}>选三个偏好，后面每一步都由系统生成建议，你只需要确认或微调。</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 16 }}>
        <label>我想体验<select style={fieldStyle} value={choices.scenario} onChange={(event) => setChoices({ ...choices, scenario: event.target.value as K3Scenario })}><option value="summary">长文总结</option><option value="qa">资料问答</option><option value="rewrite">文案改写</option></select></label>
        <label>我的设备<select style={fieldStyle} value={choices.device} onChange={(event) => setChoices({ ...choices, device: event.target.value as K3Device })}><option value="mac">Mac 或苹果电脑</option><option value="windows">Windows 普通电脑</option><option value="gpu">有独立显卡的电脑</option></select></label>
        <label>我更关注<select style={fieldStyle} value={choices.focus} onChange={(event) => setChoices({ ...choices, focus: event.target.value as K3Focus })}><option value="format">输出格式稳定</option><option value="safety">事实和拒答边界</option><option value="cost">速度和运行成本</option></select></label>
      </div>
    </div>
    {notice ? <p role="status" style={{ color: '#dbe6ff' }}>{notice}</p> : null}
    <div className="k3-steps">
      {lessons.map((lesson, index) => {
        const done = (progress[`k3:build:${lesson.id}`] ?? 0) >= 4;
        const unlocked = index === 0 || (progress[`k3:build:${lessons[index - 1].id}`] ?? 0) >= 4;
        const open = unlocked && activeStep === lesson.id;
        return <article key={lesson.id} style={{ display: 'block', padding: '20px 0', opacity: unlocked ? 1 : 0.48 }}>
          <header style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', alignItems: 'center', gap: 12 }}>
            <button type="button" disabled={!unlocked} aria-expanded={open} aria-label={lesson.title} onClick={() => setActiveStep(lesson.id)}>{done ? <Check size={17} /> : unlocked ? index + 1 : <LockKeyhole size={15} />}</button>
            <div><h3>{lesson.title}</h3><p>{lesson.outcome}</p></div>
            <span>{done ? '已完成' : unlocked ? '现在做' : '稍后解锁'}</span>
          </header>
          {open ? <div style={{ margin: '16px 0 0 48px' }}>
            <p style={{ color: '#dbe4f5', margin: '0 0 12px' }}>{lesson.help}</p>
            <div style={{ padding: 14, borderRadius: 10, background: '#ffffff0b', color: '#c5d0e0' }}><b style={{ color: '#f7f9fd' }}>这一步的结果</b><br />{resultText(lesson.id, draft)}</div>
            {custom === lesson.id ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 14 }}>
              {lesson.fields.map((field) => <label key={field.key} style={{ color: '#dbe4f5', fontSize: 12 }}>{field.label}{field.kind === 'select' ? <select value={draft[lesson.id][field.key]} onChange={(event) => update(lesson.id, field.key, event.target.value)} style={fieldStyle}><option value="">请选择</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.kind === 'number' ? <input type="number" min="0" value={draft[lesson.id][field.key]} onChange={(event) => update(lesson.id, field.key, event.target.value)} style={fieldStyle} /> : <textarea rows={3} value={draft[lesson.id][field.key]} placeholder={field.hint} onChange={(event) => update(lesson.id, field.key, event.target.value)} style={fieldStyle} />}</label>)}
            </div> : null}
            {(errors[lesson.id] ?? []).map((error) => <p key={error} role="alert" style={{ color: '#ffb7aa', margin: '8px 0' }}>{error}</p>)}
            <div className="k3-actions" style={{ marginTop: 14 }}>
              <button type="button" onClick={() => custom === lesson.id ? advance(lesson.id, draft) : applyGuide(lesson.id)}>{custom === lesson.id ? '保存并继续' : done ? '重新生成建议' : '用推荐方案继续'} <ArrowRight size={16} /></button>
              <button type="button" className="secondary" onClick={() => setCustom(custom === lesson.id ? null : lesson.id)}><SlidersHorizontal size={16} />{custom === lesson.id ? '收起调整' : '我想自己调整'}</button>
            </div>
          </div> : null}
        </article>;
      })}
    </div>
    {completed === K3_STEP_IDS.length ? <section aria-label="K3 搭建成果" style={{ marginTop: 28, padding: 24, border: '1px solid #ffffff38', borderRadius: 14 }}><h3>你的 K3 学习档案已生成</h3><p>六个关键决策已经串成一条完整路线，你可以先下载保存，再逐步替换成真实运行记录。</p><div className="k3-actions"><button type="button" onClick={copy}><Clipboard size={16} />复制成果</button><button type="button" className="secondary" onClick={download}><Download size={16} />下载成果</button></div></section> : null}
  </div>;
}
