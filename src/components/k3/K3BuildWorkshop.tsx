import { useMemo, useState } from 'react';
import { ArrowRight, Check, Clipboard, Download, FlaskConical, LockKeyhole } from 'lucide-react';
import { markProgress, type ProgressMap } from '../../progress';
import K3ExperimentStage from './K3ExperimentStage';
import { K3_EXPERIMENTS, K3_STEP_IDS, type K3StepId } from './k3BuildLearning';
import { K3_INTERACTION_CSS, workshopStyles as styles } from './k3ExperimentStyles.mts';

const progressKey = (id: K3StepId): string => `k3:concept:${id}`;

export default function K3BuildWorkshop({
  progress,
  onProgress,
}: {
  progress: ProgressMap;
  onProgress: (next: ProgressMap) => void;
}) {
  const [activeStep, setActiveStep] = useState<K3StepId>(() =>
    K3_STEP_IDS.find((id) => (progress[progressKey(id)] ?? 0) < 4) ?? 'evaluate',
  );
  const [operated, setOperated] = useState<Partial<Record<K3StepId, boolean>>>({});
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
    const experiment = K3_EXPERIMENTS.find((item) => item.id === id);
    if (nextIndex < K3_STEP_IDS.length) {
      setActiveStep(K3_STEP_IDS[nextIndex]);
      setNotice(`已完成「${experiment?.title}」，下一关已解锁。`);
    } else {
      setNotice('六关已完成。你已经亲手走过一个模型从文字到 K3 的完整路径。');
    }
  };

  const summary = K3_EXPERIMENTS.map((item, index) => `${index + 1}. ${item.title}：${item.conclusion}`).join('\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setNotice('六条实验结论已复制。');
    } catch {
      setNotice('复制失败，请使用下载总结。');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([summary], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'k3-karpathy-lab-summary.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="k3-workshop" style={styles.root}>
    <style>{K3_INTERACTION_CSS}</style>
    <div style={styles.intro}>
      <FlaskConical aria-hidden="true" style={styles.introIcon} />
      <div><h3 style={styles.introTitle}>别先背术语，先把现象做出来</h3><p style={styles.introText}>六个小实验，每关只动一个关键开关。先看前后变化，再打开解释。</p></div>
      <strong style={styles.introProgress}>{completed}/6</strong>
    </div>
    {notice ? <p style={styles.notice} role="status">{notice}</p> : null}
    <div className="k3-steps">
      {K3_EXPERIMENTS.map((experiment, index) => {
        const done = (progress[progressKey(experiment.id)] ?? 0) >= 4;
        const unlocked = index === 0 || (progress[progressKey(K3_EXPERIMENTS[index - 1].id)] ?? 0) >= 4;
        const open = unlocked && activeStep === experiment.id;
        return <article key={experiment.id} style={styles.step}>
          <header style={styles.stepHeader}>
            <button
              className="k3-step-button"
              type="button"
              disabled={!unlocked}
              aria-expanded={open}
              aria-controls={`k3-experiment-${experiment.id}`}
              aria-label={`第 ${index + 1} 关：${experiment.title}`}
              style={{ ...styles.stepButton, ...(open ? styles.activeStepButton : null), cursor: unlocked ? 'pointer' : 'not-allowed' }}
              onClick={() => setActiveStep(experiment.id)}
            >
              {done ? <Check size={17} /> : unlocked ? index + 1 : <LockKeyhole size={15} />}
            </button>
            <div><small style={styles.stepLabel}>实验 {index + 1}</small><h3 style={styles.stepTitle}>{experiment.title}</h3><p style={styles.stepLead}>{experiment.lead}</p></div>
            <span style={styles.stepStatus}>{done ? '已完成' : unlocked ? '可操作' : '未解锁'}</span>
          </header>
          {open ? <div id={`k3-experiment-${experiment.id}`} style={styles.experiment}>
            <K3ExperimentStage id={experiment.id} onRun={() => setOperated((value) => ({ ...value, [experiment.id]: true }))} />
            <div style={styles.conclusion}><Check size={18} style={styles.conclusionIcon} /><p style={styles.conclusionText}><b style={styles.conclusionLabel}>一句话带走</b>{experiment.conclusion}</p></div>
            <details style={styles.details}><summary style={styles.summaryToggle}>为什么会这样？查看解释、代码与数学</summary><p style={styles.explanation}>{experiment.explanation}</p><pre style={styles.code}><code>{experiment.details}</code></pre></details>
            <div className="k3-actions" style={styles.actions}>
              <button type="button" disabled={!operated[experiment.id]} onClick={() => finish(experiment.id)}>
                {done ? '完成复习' : index === K3_EXPERIMENTS.length - 1 ? '完成六关' : '完成这关，继续'} <ArrowRight size={16} />
              </button>
              {!operated[experiment.id] ? <small style={styles.actionHint}>先完成上面的核心操作</small> : null}
            </div>
          </div> : null}
        </article>;
      })}
    </div>
    {completed === K3_STEP_IDS.length ? <section style={styles.summary} aria-label="K3 实验总结">
      <span style={styles.summaryLabel}>实验记录 / 6 OF 6</span><h3 style={styles.summaryTitle}>你不是“听懂”了，而是亲手看见了</h3>
      {K3_EXPERIMENTS.map((item) => <p key={item.id} style={styles.summaryItem}><Check size={15} style={styles.summaryIcon} /> <b>{item.title}</b>：{item.conclusion}</p>)}
      <div className="k3-actions"><button type="button" onClick={copy}><Clipboard size={16} />复制总结</button><button type="button" className="secondary" onClick={download}><Download size={16} />下载总结</button></div>
    </section> : null}
  </div>;
}
