import { createElement, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  BrainCircuit,
  Cpu,
  ExternalLink,
  Gauge,
  Layers3,
  Network,
  Route,
  ScanSearch,
  TestTube2,
} from 'lucide-react';
import K3BuildWorkshop from './K3BuildWorkshop';
import { K3_STEP_IDS } from './k3BuildLearning';
import type { Go } from '../../pageRegistry';
import type { RouteState } from '../../routeConfig';
import { PROGRESS_CHANGE_EVENT, readProgress } from '../../progress';
import kimiLogo from '../../assets/kimi-logo.png';

const facts = [
  ['2.8T', '总参数'],
  ['104B', '激活参数'],
  ['93', '模型层数'],
  ['1M', '上下文'],
];
const concepts = [
  {
    id: 'moe',
    icon: Boxes,
    label: 'Stable LatentMoE',
    title: '896 位专家，不必同时上场',
    body: '每个 token 路由到 16 个专家，另有 2 个共享专家。像一家拥有 896 位专家的公司，每个问题只召集最合适的一组人。',
    evidence: '896 路由专家 / 16 激活 / 2 共享',
  },
  {
    id: 'attention',
    icon: Network,
    label: 'KDA + Gated MLA',
    title: '局部效率与全局视野配合',
    body: '69 层 KDA 与 24 层 Gated MLA 组成混合注意力。长上下文架构会降低成本，但真实服务仍需压测。',
    evidence: '69 KDA / 24 Gated MLA / 7168 维',
  },
  {
    id: 'residual',
    icon: Layers3,
    label: 'AttnRes',
    title: '不只接住上一层的信息',
    body: 'Attention Residuals 让模型从更丰富的历史层状态中取回信息，像会议中可以直接翻阅前面的关键纪要。',
    evidence: '跨层聚合 / 深层信号路径',
  },
  {
    id: 'vision',
    icon: ScanSearch,
    label: '原生多模态',
    title: '文本与图像统一理解',
    body: 'MoonViT-V2 视觉编码器包含 401M 参数，让视觉信息进入统一推理流程。',
    evidence: 'MoonViT-V2 / 401M 视觉参数',
  },
];
interface LayerStyle extends CSSProperties {
  '--i': number;
}

const layerStyle = (index: number): LayerStyle => ({ '--i': index });

const stepKeys = K3_STEP_IDS.map((id) => `k3:concept:${id}`);
const presets = [0.5, 1.5, 3, 7];

function SectionNav({ go }: { go: Go }) {
  return (
    <nav className="k3-section-nav" aria-label="K3 学习章节">
      {[
        ['map', '学习地图'],
        ['anatomy', '架构拆解'],
        ['lab', '估算实验'],
        ['build', '搭建路线'],
      ].map(([id, label]) => (
        <button key={id} onClick={() => go('k3-build-lab', { section: id })}>
          {label}
        </button>
      ))}
    </nav>
  );
}

export default function K3BuildLabPage({
  route,
  go,
}: {
  route: RouteState;
  go: Go;
}) {
  const [concept, setConcept] = useState(concepts[0]);
  const [preset, setPreset] = useState(2);
  const [bits, setBits] = useState(4);
  const [progress, setProgress] = useState(readProgress);
  const ConceptIcon = concept.icon;
  const memory = ((presets[preset] * 1e9 * bits) / 8 / 1024 ** 3) * 1.15;
  const completed = useMemo(
    () => stepKeys.filter((key) => (progress[key] ?? 0) >= 4).length,
    [progress],
  );

  useEffect(() => {
    if (route.section) {
      requestAnimationFrame(() =>
        document
          .getElementById(`k3-${route.section}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }, [route.section]);
  useEffect(() => {
    const refresh = () => setProgress(readProgress());
    window.addEventListener(PROGRESS_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_CHANGE_EVENT, refresh);
  }, []);

  return (
    <div className="k3-page">
      <SectionNav go={go} />
      <section className="k3-hero">
        <div>
          <p className="k3-eyebrow">OPEN-WEIGHT MODEL WORKSHOP</p>
          <h1>
            借 Kimi K3 的参数表，<em>搭出你的第一台模型</em>
          </h1>
          <p>不从 2.8T 开始烧卡，从看懂架构、算清显存到跑通最小闭环。</p>
          <div className="k3-actions">
            <button onClick={() => go('k3-build-lab', { section: 'map' })}>
              开始学习 <ArrowRight size={17} />
            </button>
            <button
              className="secondary"
              onClick={() => go('k3-build-lab', { section: 'lab' })}
            >
              先算设备 <Cpu size={17} />
            </button>
          </div>
        </div>
        <div className="k3-model-card">
          <img src={kimiLogo} alt="Kimi 标志" />
          <span>KIMI K3 / OPEN WEIGHTS</span>
          <div className="k3-layers">
            {Array.from({ length: 16 }, (_, index) => (
              <i
                key={index}
                className={index % 4 === 3 ? 'global' : ''}
                style={layerStyle(index)}
              />
            ))}
          </div>
          <footer>
            <b>69 KDA</b>
            <b>24 Gated MLA</b>
            <b>93 Layers</b>
          </footer>
        </div>
      </section>

      <section className="k3-facts">
        {facts.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
        <a
          href="https://github.com/MoonshotAI/Kimi-K3"
          target="_blank"
          rel="noopener noreferrer"
        >
          <BookOpen size={18} /> 官方 README <ExternalLink size={13} />
        </a>
      </section>

      <section className="k3-section" id="k3-map">
        <header>
          <span>01</span>
          <div>
            <h2>一条真正能走完的路线</h2>
            <p>浏览、手算、实验、评审，每一步都落到 K3 的真实参数。</p>
          </div>
        </header>
        <div className="k3-path">
          {[
            [BrainCircuit, '先看懂', '拆开 K3 架构'],
            [Gauge, '再算清', '估算你的模型'],
            [TestTube2, '动手做', '跑通最小闭环'],
            [Route, '最后迁移', '借鉴而非照搬'],
          ].map(([icon, label, title]) => (
            <article key={String(title)}>
              {createElement(icon, { size: 23 })}
              <small>{String(label)}</small>
              <h3>{String(title)}</h3>
              <p>从真实参数建立判断，再映射到你能承担的规模。</p>
            </article>
          ))}
        </div>
        <aside>
          <b>目标校准：</b>K3 仓库公开权重、README
          与技术报告，但不包含完整训练代码。个人学习应在小模型上复现闭环。
        </aside>
      </section>

      <section className="k3-section tinted" id="k3-anatomy">
        <header>
          <span>02</span>
          <div>
            <h2>点击拆解 K3</h2>
            <p>先用人话理解，再回到参数证据。</p>
          </div>
        </header>
        <div className="k3-anatomy">
          <div>
            {concepts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={concept.id === item.id ? 'active' : ''}
                  onClick={() => setConcept(item)}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <article>
            <ConceptIcon size={35} />
            <small>{concept.label}</small>
            <h3>{concept.title}</h3>
            <p>{concept.body}</p>
            <b>{concept.evidence}</b>
          </article>
        </div>
      </section>

      <section className="k3-section" id="k3-lab">
        <header>
          <span>03</span>
          <div>
            <h2>先算你真正能跑的体量</h2>
            <p>选择参数量与精度，建立权重显存的数量级直觉。</p>
          </div>
        </header>
        <div className="k3-sizer">
          <div>
            <label>
              模型参数量 <b>{presets[preset]}B</b>
            </label>
            <input
              type="range"
              min="0"
              max="3"
              value={preset}
              onChange={(event) => setPreset(Number(event.target.value))}
            />
            <div className="k3-range">
              {presets.map((item) => (
                <span key={item}>{item}B</span>
              ))}
            </div>
            <label>
              权重量化 <b>{bits}-bit</b>
            </label>
            <div className="k3-bits">
              {[4, 8, 16].map((value) => (
                <button
                  key={value}
                  className={bits === value ? 'active' : ''}
                  onClick={() => setBits(value)}
                >
                  {value}-bit
                </button>
              ))}
            </div>
            <p>
              只估算模型权重与 15% 加载余量，不含 KV Cache、激活和运行时占用。
            </p>
          </div>
          <article>
            <span>教学显存估算</span>
            <strong>
              {memory < 1
                ? `${Math.round(memory * 1024)} MiB`
                : `${memory.toFixed(1)} GiB`}
            </strong>
            <p>
              {memory < 6
                ? '多数电脑可尝试'
                : memory < 14
                  ? '建议 16GB 显存'
                  : memory < 22
                    ? '建议 24GB 显存'
                    : '需要多卡或更大内存'}
            </p>
            <code>参数量 × 位宽 ÷ 8 × 1.15</code>
          </article>
        </div>
        <aside>
          <b>K3 量级：</b>2.8T 权重按 4-bit 原始存储约 1.27 TiB，加加载余量约
          1.46 TiB。这还不是完整服务成本。
        </aside>
      </section>

      <section className="k3-section dark" id="k3-build">
        <header>
          <span>04</span>
          <div>
            <h2>六关看懂模型是怎么搭起来的</h2>
            <p>每关先做一个判断，再用现象和 K3 参数讲清背后的知识。</p>
          </div>
          <strong>{completed}/6</strong>
        </header>
        <K3BuildWorkshop progress={progress} onProgress={setProgress} />
      </section>
    </div>
  );
}
