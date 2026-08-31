import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Bot, MessageSquare, Play, RefreshCw, Sparkles } from 'lucide-react';
import {
  answerWithContext,
  buildChatMessages,
  predictNextToken,
  routeK3Token,
  tokenizeForLearning,
  trainingPrediction,
  type ChatTone,
  type K3StepId,
  type TokenCandidate,
} from './k3BuildLearning';
import { experimentStyles as styles } from './k3ExperimentStyles.mts';

function Compare({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <div style={styles.compare} aria-label="操作前后对比">
      <section style={styles.compareCard}><small style={styles.compareLabel}>操作前</small>{before}</section>
      <ArrowRight aria-hidden="true" style={styles.compareArrow} />
      <section style={{ ...styles.compareCard, ...styles.afterCard }}><small style={styles.compareLabel}>操作后</small>{after}</section>
    </div>
  );
}

function Bars({ items }: { items: TokenCandidate[] }) {
  return <div style={styles.bars}>{items.map((item) => (
    <div key={item.token} style={styles.barRow}>
      <span style={styles.barToken}>{item.token}</span>
      <i style={styles.barTrack}><b style={{ ...styles.barFill, width: `${item.score}%` }} /></i>
      <strong style={styles.barScore}>{item.score}%</strong>
    </div>
  ))}</div>;
}

function RunButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button className="k3-run" style={styles.run} type="button" disabled={disabled} onClick={onClick}>{children}</button>;
}

function TokenLab({ onRun }: { onRun: () => void }) {
  const [text, setText] = useState('AI 很有趣！');
  const [tokens, setTokens] = useState<string[]>([]);
  const tokenItems = useMemo(() => tokens.map((token, index) => ({
    key: `${tokens.slice(0, index + 1).join('')}-${token}`,
    number: index + 1,
    token,
  })), [tokens]);
  const run = () => {
    setTokens(tokenizeForLearning(text));
    onRun();
  };
  return <>
    <label className="k3-field" style={styles.field}>输入一句话
      <input style={styles.input} value={text} maxLength={40} onChange={(event) => { setText(event.target.value); setTokens([]); }} />
    </label>
    <RunButton disabled={!text.trim()} onClick={run}><Play size={16} />切成 Token</RunButton>
    <Compare
      before={<div style={styles.largeText}>{text || '等待输入'}</div>}
      after={tokenItems.length ? <div style={styles.tokenRow}>{tokenItems.map((item) => <span style={styles.token} key={item.key}><b style={styles.tokenIndex}>{item.number}</b>{item.token}</span>)}</div> : <p style={styles.wait}>点击按钮，看看一句话怎样变成小块</p>}
    />
  </>;
}

function PredictLab({ onRun }: { onRun: () => void }) {
  const [context, setContext] = useState('今天的天气很');
  const [result, setResult] = useState<TokenCandidate[]>([]);
  const run = () => { setResult(predictNextToken(context)); onRun(); };
  return <>
    <label className="k3-field" style={styles.field}>写一句没说完的话
      <input style={styles.input} value={context} maxLength={40} onChange={(event) => { setContext(event.target.value); setResult([]); }} />
    </label>
    <RunButton disabled={!context.trim()} onClick={run}><Sparkles size={16} />预测下一块</RunButton>
    <Compare
      before={<p style={styles.largeText}>{context}<span style={styles.cursor} /></p>}
      after={result.length ? <><Bars items={result} /><p style={styles.picked}>这次选中：{result[0].token}</p></> : <p style={styles.wait}>几个候选词正在等候排队</p>}
    />
  </>;
}

function TrainingLab({ onRun }: { onRun: () => void }) {
  const [rounds, setRounds] = useState(0);
  const before = useMemo(() => trainingPrediction(0), []);
  const after = trainingPrediction(rounds);
  const train = () => { setRounds((value) => Math.min(30, value + 10)); onRun(); };
  return <>
    <p style={styles.problem}>练习题：<b style={styles.problemValue}>2 + 3 = ?</b><span style={styles.muted}>正确答案告诉模型：5</span></p>
    <RunButton onClick={train}><RefreshCw size={16} />训练 10 轮</RunButton>
    <Compare before={<><b>还没训练</b><Bars items={before} /></>} after={<><b>已经训练 {rounds} 轮</b><Bars items={after} /></>} />
  </>;
}

function ContextLab({ onRun }: { onRun: () => void }) {
  const [included, setIncluded] = useState(false);
  const run = () => { setIncluded((value) => !value); onRun(); };
  return <>
    <div style={styles.context}><small style={styles.muted}>可加入的上文</small><p style={styles.contextText}>出门前，小林把钥匙放进了蓝色抽屉。</p></div>
    <RunButton onClick={run}>{included ? '拿掉上文' : '加入上文'}</RunButton>
    <Compare
      before={<><small>问题</small><p>我的钥匙在哪里？</p><strong style={styles.result}>{answerWithContext(false)}</strong></>}
      after={<><small>{included ? '上文 + 同一个问题' : '还没有上文'}</small><p>我的钥匙在哪里？</p><strong style={styles.result}>{included ? answerWithContext(true) : '等待加入上文'}</strong></>}
    />
  </>;
}

function ChatLab({ onRun }: { onRun: () => void }) {
  const [tone, setTone] = useState<ChatTone>('brief');
  const [messages, setMessages] = useState<ReturnType<typeof buildChatMessages>>([]);
  const run = () => { setMessages(buildChatMessages(tone)); onRun(); };
  return <>
    <div style={styles.choices} aria-label="选择助手说话方式">
      {([['brief', '一句话说完'], ['friendly', '像朋友一样']] as const).map(([value, label]) => <button type="button" key={value} style={{ ...styles.choice, ...(tone === value ? styles.activeChoice : null) }} onClick={() => { setTone(value); setMessages([]); }}>{label}</button>)}
    </div>
    <RunButton onClick={run}><MessageSquare size={16} />组装聊天消息</RunButton>
    <Compare
      before={<div style={styles.largeText}>推荐一个周末活动……</div>}
      after={messages.length ? <div style={styles.messages}>{messages.map((message) => <p key={message.role} style={styles.message}><b style={message.role === 'assistant' ? styles.assistantRole : styles.userRole}>{message.role === 'system' ? '规则' : message.role === 'user' ? '用户' : '助手'}</b>{message.content}</p>)}</div> : <p style={styles.wait}>规则、用户和助手还没排好位置</p>}
    />
  </>;
}

function K3Lab({ onRun }: { onRun: () => void }) {
  const [turn, setTurn] = useState(-1);
  const samples = ['图像', '代码', '长文'];
  const token = samples[Math.max(0, turn) % samples.length];
  const experts = turn < 0 ? [] : routeK3Token(token, turn);
  const run = () => { setTurn((value) => value + 1); onRun(); };
  return <>
    <RunButton onClick={run}><Bot size={16} />让 K3 分工</RunButton>
    <Compare
      before={<div><b style={styles.modelSize}>2.8T 总参数</b><p style={styles.modelMyth}>误解：每次回答都让全部参数同时工作</p></div>}
      after={experts.length ? <div><p style={styles.routingTitle}>Token「{token}」→ 16 位路由专家</p><div style={styles.experts}>{experts.map((expert) => <span style={styles.expert} key={expert}>#{expert}</span>)}</div><small style={styles.routingNote}>还有 2 位共享专家一直参与</small></div> : <p style={styles.wait}>送入一个 Token，看看谁会被叫来</p>}
    />
  </>;
}

export default function K3ExperimentStage({ id, onRun }: { id: K3StepId; onRun: () => void }) {
  if (id === 'goal') return <TokenLab onRun={onRun} />;
  if (id === 'runtime') return <PredictLab onRun={onRun} />;
  if (id === 'model') return <TrainingLab onRun={onRun} />;
  if (id === 'infer') return <ContextLab onRun={onRun} />;
  if (id === 'api') return <ChatLab onRun={onRun} />;
  return <K3Lab onRun={onRun} />;
}
