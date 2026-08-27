import { useMemo, useState } from 'react';
import { ArrowRight, Check, Clipboard, Download, Lightbulb, LockKeyhole, RotateCcw } from 'lucide-react';
import { markProgress, type ProgressMap } from '../../progress';
import { checkK3Answer, K3_LEARNING_CARDS, K3_STEP_IDS, type K3StepId } from './k3BuildLearning';

const progressKey = (id: K3StepId): string => `k3:concept:${id}`;

export default function K3BuildWorkshop({
  progress,
  onProgress,
}: {
  progress: ProgressMap;
  onProgress: (next: ProgressMap) => void;
}) {
  const [answers, setAnswers] = useState<Partial<Record<K3StepId, string>>>({});
  const [activeStep, setActiveStep] = useState<K3StepId>(() =>
    K3_STEP_IDS.find((id) => (progress[progressKey(id)] ?? 0) < 4) ?? 'evaluate',
  );
  const [notice, setNotice] = useState('');
  const completed = useMemo(
    () => K3_STEP_IDS.filter((id) => (progress[progressKey(id)] ?? 0) >= 4).length,
    [progress],
  );

  const finish = (id: K3StepId) => {
    let nextProgress = markProgress(progressKey(id), 4);
    nextProgress = markProgress(`k3:build:${id}`, 4);
    onProgress(nextProgress);
    const nextIndex = K3_STEP_IDS.indexOf(id) + 1;
    if (nextIndex < K3_STEP_IDS.length) setActiveStep(K3_STEP_IDS[nextIndex]);
    setNotice(`${K3_LEARNING_CARDS.find((card) => card.id === id)?.learned} 下一关已解锁。`);
  };
  const summary = K3_LEARNING_CARDS.map((card) => card.learned).join('\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setNotice('六条学习结论已复制。');
    } catch {
      setNotice('复制失败，请使用下载总结。');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([summary], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'k3-learning-summary.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="k3-workshop">
    <div style={{ padding: 18, border: '1px solid #ffffff30', borderRadius: 14, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Lightbulb size={21} /><div><h3 style={{ margin: 0 }}>这一轮不搭环境，只学会六个判断</h3><p style={{ margin: '5px 0 0', color: '#c5d0e0' }}>每关只回答一个问题，然后看现象、解释和你真正掌握的能力。全程约 18 分钟。</p></div></div>
    </div>
    {notice ? <p role="status" style={{ color: '#dbe6ff' }}>{notice}</p> : null}
    <div className="k3-steps">
      {K3_LEARNING_CARDS.map((card, index) => {
        const done = (progress[progressKey(card.id)] ?? 0) >= 4;
        const unlocked = index === 0 || (progress[progressKey(K3_LEARNING_CARDS[index - 1].id)] ?? 0) >= 4;
        const open = unlocked && activeStep === card.id;
        const answer = answers[card.id];
        const correct = answer ? checkK3Answer(card.id, answer) : false;
        return <article key={card.id} style={{ display: 'block', padding: '20px 0', opacity: unlocked ? 1 : 0.48 }}>
          <header style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', alignItems: 'center', gap: 12 }}>
            <button type="button" disabled={!unlocked} aria-expanded={open} aria-label={card.title} onClick={() => setActiveStep(card.id)}>{done ? <Check size={17} /> : unlocked ? index + 1 : <LockKeyhole size={15} />}</button>
            <div><h3>{card.title}</h3><p>{done ? card.learned : `学完后：${card.learned}`}</p></div>
            <span>{done ? '已学会' : unlocked ? '3 分钟' : '未解锁'}</span>
          </header>
          {open ? <div style={{ margin: '18px 0 0 48px' }}>
            <p style={{ fontSize: 18, color: '#f7f9fd', fontWeight: 700 }}>{card.question}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {card.options.map((option) => <button key={option.id} type="button" onClick={() => setAnswers({ ...answers, [card.id]: option.id })} style={{ padding: '13px 15px', textAlign: 'left', borderRadius: 9, border: `1px solid ${answer === option.id ? '#79a8ff' : '#ffffff30'}`, background: answer === option.id ? '#316bd433' : '#ffffff08', color: '#f7f9fd' }}>{option.label}</button>)}
            </div>
            {answer ? <div style={{ marginTop: 16, padding: 18, borderRadius: 12, background: correct ? '#2b795733' : '#a96b2033', border: `1px solid ${correct ? '#68d5a3' : '#efb36a'}` }}>
              <b>{correct ? '判断正确' : '这个选项很常见，但需要修正'}</b>
              <p>{card.observation}</p>
              <p><b>为什么：</b>{card.explanation}</p>
              <p><b>K3 里的证据：</b>{card.evidence}</p>
              <p style={{ color: '#dbe6ff' }}><b>这一关学会：</b>{card.learned}</p>
              <div className="k3-actions"><button type="button" onClick={() => finish(card.id)}>{done ? '复习完成' : index === K3_LEARNING_CARDS.length - 1 ? '完成学习' : '我明白了，下一关'} <ArrowRight size={16} /></button><button type="button" className="secondary" onClick={() => setAnswers({ ...answers, [card.id]: undefined })}><RotateCcw size={15} />重新选择</button></div>
            </div> : null}
          </div> : null}
        </article>;
      })}
    </div>
    {completed === K3_STEP_IDS.length ? <section aria-label="K3 学习总结" style={{ marginTop: 28, padding: 24, border: '1px solid #ffffff38', borderRadius: 14 }}><h3>你学会的不是六个按钮，而是六个判断</h3>{K3_LEARNING_CARDS.map((card) => <p key={card.id}><Check size={15} /> {card.learned}</p>)}<div className="k3-actions"><button type="button" onClick={copy}><Clipboard size={16} />复制总结</button><button type="button" className="secondary" onClick={download}><Download size={16} />下载总结</button></div></section> : null}
  </div>;
}
