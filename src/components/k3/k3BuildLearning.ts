export const K3_STEP_IDS = [
  'goal',
  'runtime',
  'model',
  'infer',
  'api',
  'evaluate',
] as const;
export type K3StepId = (typeof K3_STEP_IDS)[number];
export type K3Draft = Record<K3StepId, Record<string, string>>;
export type K3Scenario = 'summary' | 'qa' | 'rewrite';
export type K3Device = 'windows' | 'mac' | 'gpu';
export type K3Focus = 'format' | 'safety' | 'cost';

export interface K3GuideChoices {
  scenario: K3Scenario;
  device: K3Device;
  focus: K3Focus;
}

const STORAGE_KEY = 'genai-k3-build-lab-v1';
const MAX_VALUE_LENGTH = 12_000;
const fields: Record<K3StepId, readonly string[]> = {
  goal: ['task', 'input', 'output', 'failure'],
  runtime: ['system', 'stack', 'evidence'],
  model: ['parameters', 'bits', 'capacity'],
  infer: ['command', 'output', 'latency', 'memory'],
  api: ['request', 'response', 'contract'],
  evaluate: ['samples', 'review'],
};

const scenarios: Record<K3Scenario, Record<string, string>> = {
  summary: {
    task: '为运营同学总结一篇长文，提取结论、风险和待办事项',
    input: '一篇中文业务长文或会议纪要',
    output: '包含摘要、风险和待办的结构化 JSON',
    failure: '遗漏核心结论\n输出不是约定的 JSON 格式',
  },
  qa: {
    task: '根据给定资料回答用户问题，并在资料不足时明确说明',
    input: '参考资料和一个用户问题',
    output: '带依据的简洁回答或资料不足提示',
    failure: '编造资料中不存在的信息\n没有回答用户提出的问题',
  },
  rewrite: {
    task: '把复杂产品说明改写成普通用户容易理解的短文案',
    input: '一段产品功能说明和目标用户信息',
    output: '一段不超过两百字的清晰中文文案',
    failure: '改变原文事实\n使用目标用户难以理解的术语',
  },
};

const devices: Record<K3Device, { system: string; stack: string; parameters: string; bits: string; capacity: string }> = {
  windows: { system: 'Windows', stack: 'Ollama', parameters: '1.5', bits: '4', capacity: '8' },
  mac: { system: 'macOS', stack: 'Ollama', parameters: '3', bits: '4', capacity: '8' },
  gpu: { system: 'Linux', stack: 'vLLM', parameters: '7', bits: '8', capacity: '24' },
};

export const emptyK3Draft = (): K3Draft =>
  Object.fromEntries(
    K3_STEP_IDS.map((id) => [
      id,
      Object.fromEntries(fields[id].map((field) => [field, ''])),
    ]),
  ) as K3Draft;

export function sanitizeK3Draft(value: unknown): K3Draft {
  const result = emptyK3Draft();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result;
  }
  const source = value as Record<string, unknown>;
  for (const id of K3_STEP_IDS) {
    const step = source[id];
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      continue;
    }
    for (const field of fields[id]) {
      const raw = (step as Record<string, unknown>)[field];
      if (typeof raw === 'string') {
        result[id][field] = raw.slice(0, MAX_VALUE_LENGTH);
      }
    }
  }
  return result;
}

export function readK3Draft(): K3Draft {
  try {
    return sanitizeK3Draft(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
    );
  } catch {
    return emptyK3Draft();
  }
}

export function saveK3Draft(draft: K3Draft): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeK3Draft(draft)));
    return true;
  } catch {
    return false;
  }
}

export function applyK3Guide(
  id: K3StepId,
  draft: K3Draft,
  choices: K3GuideChoices,
): K3Draft {
  const next = sanitizeK3Draft(draft);
  const device = devices[choices.device];
  if (id === 'goal') {
    next.goal = { ...scenarios[choices.scenario] };
  } else if (id === 'runtime') {
    next.runtime = {
      system: device.system,
      stack: device.stack,
      evidence: `教学推荐：在 ${device.system} 使用 ${device.stack}。正式运行时，页面会引导你复制安装命令并检查版本。`,
    };
  } else if (id === 'model') {
    next.model = {
      parameters: device.parameters,
      bits: device.bits,
      capacity: device.capacity,
    };
  } else if (id === 'infer') {
    next.infer = {
      command: device.stack === 'Ollama' ? 'ollama run qwen2.5:1.5b' : 'vllm serve Qwen/Qwen2.5-7B-Instruct',
      output: '教学模拟输出：已根据输入生成结构化结果。正式实践时可用真实输出替换本段记录。',
      latency: device.stack === 'Ollama' ? '1800' : '620',
      memory: device.capacity === '24' ? '9.2' : '2.1',
    };
  } else if (id === 'api') {
    next.api = {
      request: JSON.stringify({ prompt: next.goal.input || '请总结这段内容' }),
      response: JSON.stringify({ text: next.goal.output || '模型生成结果' }),
      contract: '请求超时为 30 秒，最大输出 800 字；失败时返回明确错误信息，并允许重试一次。',
    };
  } else {
    const samplePrefix = choices.scenario === 'summary' ? '长文样本' : choices.scenario === 'qa' ? '问答样本' : '改写样本';
    next.evaluate = {
      samples: Array.from({ length: 10 }, (_, index) => `${samplePrefix}${index + 1}\t符合任务要求的预期结果`).join('\n'),
      review: `首轮教学评测已覆盖 10 条样本。下一轮优先优化${choices.focus === 'format' ? '输出格式稳定性' : choices.focus === 'safety' ? '拒答和事实边界' : '响应速度与运行成本'}，并用真实模型结果替换模拟记录。`,
    };
  }
  return next;
}

const enough = (value: string, length: number) => value.trim().length >= length;
const positive = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0;
const jsonObject = (value: string, keys: string[]) => {
  try {
    const parsed = JSON.parse(value);
    return (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      keys.some((key) => key in parsed)
    );
  } catch {
    return false;
  }
};

export function estimateWeightMemory(parameters: string, bits: string): number {
  return ((Number(parameters) * 1e9 * Number(bits)) / 8 / 1024 ** 3) * 1.15;
}

export function validateK3Step(id: K3StepId, draft: K3Draft): string[] {
  const value = draft[id];
  if (id === 'goal') {
    const errors = [];
    if (!enough(value.task, 12)) errors.push('请写清模型要完成的任务。');
    if (!enough(value.input, 8) || !enough(value.output, 8)) errors.push('请分别描述输入和输出。');
    if (value.failure.split('\n').filter((line) => line.trim()).length < 2) errors.push('请写出至少 2 条失败标准。');
    return errors;
  }
  if (id === 'runtime') {
    const errors = [];
    if (!value.system || !value.stack) errors.push('请选择运行系统和推理工具。');
    if (!enough(value.evidence, 20)) errors.push('请记录环境准备说明。');
    return errors;
  }
  if (id === 'model') {
    if (!positive(value.capacity)) return ['请输入可用内存或显存。'];
    if (!positive(value.parameters) || !positive(value.bits)) return ['请选择模型参数量和量化精度。'];
    const memory = estimateWeightMemory(value.parameters, value.bits);
    return memory <= Number(value.capacity) * 0.85 ? [] : [`预计需要 ${memory.toFixed(1)} GiB，请选择更小模型。`];
  }
  if (id === 'infer') {
    const errors = [];
    if (!enough(value.command, 12)) errors.push('请记录推理命令。');
    if (!enough(value.output, 30)) errors.push('请记录一段模型输出。');
    if (!positive(value.latency) || !positive(value.memory)) errors.push('耗时和峰值内存必须大于 0。');
    return errors;
  }
  if (id === 'api') {
    const errors = [];
    if (!jsonObject(value.request, ['prompt', 'messages'])) errors.push('请求需要包含 prompt 或 messages。');
    if (!jsonObject(value.response, ['text', 'choices'])) errors.push('响应需要包含 text 或 choices。');
    if (!enough(value.contract, 20)) errors.push('请写清接口约定。');
    return errors;
  }
  const samples = value.samples.split('\n').filter((line) => line.trim());
  const errors = [];
  if (samples.length < 10) errors.push(`还需要 ${10 - samples.length} 条评测样本。`);
  if (!enough(value.review, 30)) errors.push('请补充本轮复盘。');
  return errors;
}

export interface K3LearningCard {
  id: K3StepId;
  title: string;
  question: string;
  options: { id: string; label: string }[];
  answer: string;
  observation: string;
  explanation: string;
  learned: string;
  evidence: string;
}

export const K3_LEARNING_CARDS: K3LearningCard[] = [
  {
    id: 'goal',
    title: '先定义问题，不急着选模型',
    question: '如果想用大模型总结运营周报，第一件事应该做什么？',
    options: [
      { id: 'largest', label: '下载参数最大的模型' },
      { id: 'goal', label: '写清输入、输出和失败标准' },
      { id: 'code', label: '先学会写 Python' },
    ],
    answer: 'goal',
    observation: '模型大小不能替代任务定义。同一个模型，在目标模糊时也会输出一堆看似正确的废话。',
    explanation: '搭模型不是先选技术，而是先定义它要解决的问题，以及什么结果算失败。',
    learned: '我能先写清任务，再判断是否需要大模型。',
    evidence: 'K3 很强，但仍需要明确的任务和评测目标。',
  },
  {
    id: 'runtime',
    title: '分清模型和运行工具',
    question: '模型权重和 Ollama、vLLM 这类工具是什么关系？',
    options: [
      { id: 'same', label: '它们是同一个东西' },
      { id: 'runner', label: '权重是能力数据，工具负责加载和运行' },
      { id: 'cloud', label: '只有云端模型才需要运行工具' },
    ],
    answer: 'runner',
    observation: '同一份模型权重可以被不同推理工具加载，工具会影响安装难度、速度和并发能力。',
    explanation: '可以把权重理解成大脑里的知识，把推理工具理解成让大脑运转起来的身体。',
    learned: '我能区分模型权重、推理框架和运行环境。',
    evidence: '个人体验适合 Ollama，服务部署通常考虑 vLLM 等工具。',
  },
  {
    id: 'model',
    title: '用参数量估算设备压力',
    question: '一台只有 8 GiB 可用内存的电脑，适合直接运行 7B、16-bit 模型吗？',
    options: [
      { id: 'yes', label: '适合，7B 小于 8 GiB' },
      { id: 'no', label: '不适合，权重已约 14 GiB' },
      { id: 'context', label: '只和上下文长度有关' },
    ],
    answer: 'no',
    observation: '7B × 16 bit ÷ 8，权重就约 14 GB，还没有计算运行时开销。换成 4-bit 后约 3.5 GB。',
    explanation: '参数量决定要存多少数字，量化位宽决定每个数字占多少空间。',
    learned: '我能用“参数量 × 位宽 ÷ 8”粗估模型能否装下。',
    evidence: 'K3 有 2.8T 总参数，即使低比特量化也不是个人电脑规模。',
  },
  {
    id: 'infer',
    title: '看懂一次推理发生了什么',
    question: '模型回答很慢时，最先应该记录哪组信息？',
    options: [
      { id: 'color', label: '页面颜色和按钮数量' },
      { id: 'metric', label: '输入长度、生成速度和峰值内存' },
      { id: 'name', label: '模型名称是否好记' },
    ],
    answer: 'metric',
    observation: '模型逐个生成 token。输入越长、输出越多、模型越大，等待和资源占用通常越高。',
    explanation: '推理不是一次性吐出答案，而是把上下文读入后，一个 token 接一个 token 地生成。',
    learned: '我能用输入长度、生成速度和内存解释一次推理。',
    evidence: 'K3 支持 1M 上下文，但支持很长不等于使用成本为零。',
  },
  {
    id: 'api',
    title: '理解模型如何变成产品能力',
    question: '为什么跑通模型后，还需要封装 API？',
    options: [
      { id: 'pretty', label: '只是为了界面更好看' },
      { id: 'contract', label: '让其他产品按固定格式稳定调用' },
      { id: 'smart', label: 'API 会自动让模型更聪明' },
    ],
    answer: 'contract',
    observation: 'API 约定输入、输出、超时和错误，让网页、机器人或工作流不需要理解模型内部细节。',
    explanation: '模型是能力，API 是产品与这项能力之间的合同。',
    learned: '我能解释模型、API 和上层产品之间的关系。',
    evidence: '真正可用的模型服务还要处理并发、超时、鉴权和错误。',
  },
  {
    id: 'evaluate',
    title: '不用“感觉不错”判断模型',
    question: '固定保留 10 条测试问题，最重要的作用是什么？',
    options: [
      { id: 'demo', label: '让演示页面看起来更丰富' },
      { id: 'compare', label: '更换模型或提示词后可以稳定比较' },
      { id: 'train', label: '让模型自动完成训练' },
    ],
    answer: 'compare',
    observation: '固定样本能让前后结果可比较，避免只挑表现好的案例，也能暴露格式、事实和拒答问题。',
    explanation: '评测集像一把固定的尺子。没有它，每次优化都只能凭感觉。',
    learned: '我能用固定样本比较模型版本，而不是只看一次答案。',
    evidence: '模型规模不是唯一指标，任务质量必须通过具体样本验证。',
  },
];

export const checkK3Answer = (id: K3StepId, answer: string): boolean =>
  K3_LEARNING_CARDS.find((card) => card.id === id)?.answer === answer;
