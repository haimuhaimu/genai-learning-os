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

export interface K3Experiment {
  id: K3StepId;
  title: string;
  lead: string;
  action: string;
  conclusion: string;
  explanation: string;
  details: string;
}

export const K3_EXPERIMENTS: K3Experiment[] = [
  {
    id: 'goal',
    title: 'Token 化',
    lead: '先输入一句话，亲手把它拆成模型能接收的小块。',
    action: '切成 Token',
    conclusion: '模型先看到的不是整句话，而是一串可以编号的小块。',
    explanation: '你改一个字，切分结果就可能变化。真实模型使用更大的词表；这里用简化切分，只展示过程。',
    details: `const tokens = text.match(/[A-Za-z]+|\\d+|[\\u3400-\\u9fff]|[^\\s]/gu)\n// “AI 很有趣！” → [“AI”, “很”, “有”, “趣”, “！”]`,
  },
  {
    id: 'runtime',
    title: '预测下一个 Token',
    lead: '给模型一句没说完的话，看它怎样给几个下一步排队。',
    action: '预测下一块',
    conclusion: '一次生成只选下一块，完整回答是这个动作不断重复。',
    explanation: '条越长，表示这一块此刻更可能被选中；它不是在资料库里复制整句答案。',
    details: `candidates = score(context, vocabulary)\nnextToken = candidates.sort(byScore)[0]\n// 教学分数相加为 100%，不代表 K3 的真实输出。`,
  },
  {
    id: 'model',
    title: '训练前后对比',
    lead: '让一个只会乱猜的小模型看几轮正确答案，观察它的选择怎样移动。',
    action: '训练 10 轮',
    conclusion: '训练就是反复看答案，再把下次猜对的机会往上推。',
    explanation: '每轮都会把“5”的位置抬高、其他答案压低；真实训练规模更大，但反馈方向相同。',
    details: `guess = model("2 + 3 =")\nloss = distance(guess, "5")\nmodel.adjust(loss)\n// 重复后，“5”的分数逐步升高。`,
  },
  {
    id: 'infer',
    title: '上下文影响',
    lead: '同一个问题，只加一小段上文，看看回答会不会改变。',
    action: '加入上文',
    conclusion: '模型此刻能看到的上文，会直接改变它接下来怎么答。',
    explanation: '模型没有自动知道你的私事；把相关信息放进上下文，它才有材料继续预测。',
    details: `answer = generate(context + question)\n// 无上文：我不知道。\n// 有上文：钥匙在蓝色抽屉。`,
  },
  {
    id: 'api',
    title: '续写变聊天',
    lead: '把一段普通续写，装进“谁说了什么”的消息结构里。',
    action: '组装聊天消息',
    conclusion: '聊天模型仍在续写，只是消息角色让它知道该用什么身份接话。',
    explanation: '产品把系统要求、用户输入和助手位置排好，模型就在“助手”后面继续生成。',
    details: `messages = [\n  { role: "system", content: "回答简洁" },\n  { role: "user", content: "推荐周末活动" }\n]\n// 下一段从 assistant 角色开始续写。`,
  },
  {
    id: 'evaluate',
    title: '回看 K3',
    lead: '把一个 Token 送进 K3 的“专家团队”，看它如何只叫一小组人上场。',
    action: '让 K3 分工',
    conclusion: 'K3 很大，但处理每个 Token 时只激活一部分专家。',
    explanation: 'K3 有 896 个路由专家，每个 Token 选择 16 个，另有 2 个共享专家一直参与；这就是稀疏工作。',
    details: `active = route(token, experts=896, topK=16)\nshared = 2\n// K3：2.8T 总参数，约 104B 激活参数，1M 上下文。`,
  },
];

export function tokenizeForLearning(input: string): string[] {
  return input.trim().match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[\u3400-\u9fff]|[^\s]/gu) ?? [];
}

export interface TokenCandidate {
  token: string;
  score: number;
}

export function predictNextToken(context: string): TokenCandidate[] {
  if (context.includes('天气')) {
    return [
      { token: '好', score: 46 },
      { token: '冷', score: 26 },
      { token: '热', score: 18 },
      { token: '？', score: 10 },
    ];
  }
  return [
    { token: '学习', score: 42 },
    { token: '工作', score: 28 },
    { token: '帮忙', score: 19 },
    { token: '思考', score: 11 },
  ];
}

const asPercentages = (scores: number[]): number[] => {
  const total = scores.reduce((sum, score) => sum + score, 0);
  const values = scores.map((score) => Math.round((score / total) * 100));
  values[0] += 100 - values.reduce((sum, value) => sum + value, 0);
  return values;
};

export function trainingPrediction(rounds: number): TokenCandidate[] {
  const safeRounds = Math.max(0, Math.min(30, Math.floor(rounds)));
  const scores = asPercentages([
    12 + safeRounds * 2.6,
    Math.max(4, 34 - safeRounds * 0.7),
    Math.max(3, 30 - safeRounds * 0.6),
    Math.max(2, 24 - safeRounds * 0.5),
  ]);
  return ['5', '4', '6', '8'].map((token, index) => ({ token, score: scores[index] }));
}

export function answerWithContext(hasContext: boolean): string {
  return hasContext ? '钥匙在蓝色抽屉。' : '我不知道钥匙放在哪里。';
}

export type ChatTone = 'brief' | 'friendly';
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildChatMessages(tone: ChatTone): ChatMessage[] {
  return [
    { role: 'system', content: tone === 'brief' ? '回答简洁，只给一个建议。' : '像朋友一样温和回答，并说明理由。' },
    { role: 'user', content: '推荐一个周末活动。' },
    { role: 'assistant', content: tone === 'brief' ? '去附近公园散步。' : '去附近公园散步吧，能换换环境，也不需要复杂准备。' },
  ];
}

export function routeK3Token(token: string, turn = 0): number[] {
  const seed = Array.from(token).reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), turn * 97);
  const experts = new Set<number>();
  let cursor = seed % 896;
  while (experts.size < 16) {
    experts.add(cursor + 1);
    cursor = (cursor + 53 + experts.size * 17) % 896;
  }
  return [...experts];
}
