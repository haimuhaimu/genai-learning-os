import { useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  Check,
  Clipboard,
  Download,
  LockKeyhole,
} from 'lucide-react';
import { markProgress, type ProgressMap } from '../../progress';
import {
  emptyK3Draft,
  K3_STEP_IDS,
  readK3Draft,
  saveK3Draft,
  validateK3Step,
  type K3Draft,
  type K3StepId,
} from './k3BuildLearning';

interface Field {
  key: string;
  label: string;
  kind?: 'select' | 'number';
  options?: string[];
  hint?: string;
}
const lessons: {
  id: K3StepId;
  title: string;
  outcome: string;
  fields: Field[];
}[] = [
  {
    id: 'goal',
    title: '写清模型任务',
    outcome: '得到可验证的任务说明',
    fields: [
      {
        key: 'task',
        label: '模型要完成什么任务？',
        hint: '例如：为运营同学总结长文，并输出结构化结论',
      },
      { key: 'input', label: '输入是什么？' },
      { key: 'output', label: '输出是什么？' },
      { key: 'failure', label: '至少两条失败标准，每行一条' },
    ],
  },
  {
    id: 'runtime',
    title: '准备运行环境',
    outcome: '留下真实环境证据',
    fields: [
      {
        key: 'system',
        label: '操作系统',
        kind: 'select',
        options: ['macOS', 'Windows', 'Linux'],
      },
      {
        key: 'stack',
        label: '推理工具',
        kind: 'select',
        options: ['Ollama', 'llama.cpp', 'Transformers', 'vLLM'],
      },
      { key: 'evidence', label: '粘贴安装命令或环境检查结果' },
    ],
  },
  {
    id: 'model',
    title: '选择可承受模型',
    outcome: '算出设备能否装下模型',
    fields: [
      {
        key: 'parameters',
        label: '参数量（B）',
        kind: 'select',
        options: ['0.5', '1.5', '3', '7'],
      },
      {
        key: 'bits',
        label: '量化位宽',
        kind: 'select',
        options: ['4', '8', '16'],
      },
      { key: 'capacity', label: '可用内存或显存（GiB）', kind: 'number' },
    ],
  },
  {
    id: 'infer',
    title: '完成第一次推理',
    outcome: '获得可复现的运行记录',
    fields: [
      { key: 'command', label: '实际运行的命令' },
      { key: 'output', label: '一段真实模型输出' },
      { key: 'latency', label: '推理耗时（毫秒）', kind: 'number' },
      { key: 'memory', label: '峰值内存（GiB）', kind: 'number' },
    ],
  },
  {
    id: 'api',
    title: '封装最小 API',
    outcome: '建立清晰的调用合同',
    fields: [
      { key: 'request', label: '请求 JSON，包含 prompt 或 messages' },
      { key: 'response', label: '响应 JSON，包含 text 或 choices' },
      { key: 'contract', label: '超时、长度和错误处理约定' },
    ],
  },
  {
    id: 'evaluate',
    title: '建立 10 条评测集',
    outcome: '形成第一版质量基线',
    fields: [
      { key: 'samples', label: '每行一条：输入 + Tab + 预期' },
      { key: 'review', label: '复盘准确性、格式、拒答与成本' },
    ],
  },
];
const fieldStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 7,
  padding: '11px 12px',
  border: '1px solid #ffffff38',
  borderRadius: 8,
  color: '#f7f9fd',
  background: '#ffffff0c',
  font: 'inherit',
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
  const [activeStep, setActiveStep] = useState<K3StepId>(() =>
    K3_STEP_IDS.find((id) => (progress[`k3:build:${id}`] ?? 0) < 4) ?? 'evaluate',
  );
  const completed = useMemo(
    () =>
      K3_STEP_IDS.filter((id) => (progress[`k3:build:${id}`] ?? 0) >= 4).length,
    [progress],
  );

  const update = (id: K3StepId, field: string, value: string) => {
    const next = { ...draft, [id]: { ...draft[id], [field]: value } };
    setDraft(next);
    saveK3Draft(next);
    setErrors((current) => ({ ...current, [id]: [] }));
  };
  const validate = (id: K3StepId) => {
    const nextErrors = validateK3Step(id, draft);
    setErrors((current) => ({ ...current, [id]: nextErrors }));
    if (nextErrors.length) {
      return;
    }
    onProgress(markProgress(`k3:build:${id}`, 4));
    const nextIndex = K3_STEP_IDS.indexOf(id) + 1;
    if (nextIndex < K3_STEP_IDS.length) {
      setActiveStep(K3_STEP_IDS[nextIndex]);
    }
    setNotice(
      `“${lessons.find((item) => item.id === id)?.title}”验证通过，下一步已解锁。`,
    );
  };
  const artifact = JSON.stringify(
    {
      title: '我的 K3 模型搭建成果',
      completedAt: new Date().toISOString(),
      draft,
    },
    null,
    2,
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(artifact);
      setNotice('成果 JSON 已复制。');
    } catch {
      setNotice('复制失败，请使用下载成果。');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([artifact], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'k3-build-result.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const reset = () => {
    const next = emptyK3Draft();
    setDraft(next);
    saveK3Draft(next);
    setErrors({});
    setActiveStep('goal');
    setNotice('草稿已清空，已完成进度保留，可逐步重新编辑。');
  };

  return (
    <div className="k3-workshop">
      {notice ? (
        <p role="status" style={{ color: '#dbe6ff' }}>
          {notice}
        </p>
      ) : null}
      <div className="k3-steps">
        {lessons.map((lesson, index) => {
          const done = (progress[`k3:build:${lesson.id}`] ?? 0) >= 4;
          const unlocked =
            index === 0 ||
            (progress[`k3:build:${lessons[index - 1].id}`] ?? 0) >= 4;
          const open = unlocked && activeStep === lesson.id;
          return (
            <article
              key={lesson.id}
              style={{
                display: 'block',
                padding: '22px 0',
                opacity: unlocked ? 1 : 0.48,
              }}
            >
              <header
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  disabled={!unlocked}
                  aria-expanded={open}
                  aria-label={`${lesson.title}，${done ? '已通过' : unlocked ? '待验证' : '未解锁'}`}
                  onClick={() => setActiveStep(lesson.id)}
                >
                  {done ? (
                    <Check size={17} />
                  ) : unlocked ? (
                    index + 1
                  ) : (
                    <LockKeyhole size={15} />
                  )}
                </button>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.outcome}</p>
                </div>
                <span>{done ? '已通过' : unlocked ? '待验证' : '未解锁'}</span>
              </header>
              {open ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                    gap: 14,
                    margin: '18px 0 0 50px',
                  }}
                >
                  {lesson.fields.map((field) => (
                    <label
                      key={field.key}
                      style={{ color: '#dbe4f5', fontSize: 12 }}
                    >
                      {field.label}
                      {field.kind === 'select' ? (
                        <select
                          value={draft[lesson.id][field.key]}
                          onChange={(event) =>
                            update(lesson.id, field.key, event.target.value)
                          }
                          style={fieldStyle}
                        >
                          <option value="">请选择</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.kind === 'number' ? (
                        <input
                          type="number"
                          min="0"
                          value={draft[lesson.id][field.key]}
                          onChange={(event) =>
                            update(lesson.id, field.key, event.target.value)
                          }
                          style={fieldStyle}
                        />
                      ) : (
                        <textarea
                          rows={3}
                          value={draft[lesson.id][field.key]}
                          placeholder={field.hint}
                          onChange={(event) =>
                            update(lesson.id, field.key, event.target.value)
                          }
                          style={fieldStyle}
                        />
                      )}
                    </label>
                  ))}
                  <div style={{ gridColumn: '1/-1' }}>
                    {(errors[lesson.id] ?? []).map((error) => (
                      <p
                        key={error}
                        role="alert"
                        style={{ color: '#ffb7aa', margin: '4px 0' }}
                      >
                        {error}
                      </p>
                    ))}
                    <button
                      type="button"
                      onClick={() => validate(lesson.id)}
                      style={{ width: 'auto', padding: '10px 16px' }}
                    >
                      {done ? '重新验证并保存' : '验证并记录'} <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {completed === 6 ? (
        <section
          aria-label="K3 搭建成果"
          style={{
            marginTop: 28,
            padding: 24,
            border: '1px solid #ffffff38',
            borderRadius: 14,
          }}
        >
          <h3>你的 K3 六步搭建成果</h3>
          <p>
            任务、环境、模型选型、推理记录、API
            合同与评测基线已形成一份可继续迭代的模型档案。
          </p>
          <div className="k3-actions">
            <button type="button" onClick={copy}>
              <Clipboard size={16} />
              复制 JSON
            </button>
            <button type="button" className="secondary" onClick={download}>
              <Download size={16} />
              下载成果
            </button>
            <button type="button" className="secondary" onClick={reset}>
              清空草稿
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
