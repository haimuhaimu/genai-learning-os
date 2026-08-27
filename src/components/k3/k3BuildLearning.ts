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

export function saveK3Draft(draft: K3Draft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeK3Draft(draft)));
    return true;
  } catch {
    return false;
  }
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

export function estimateWeightMemory(parameters: string, bits: string) {
  return ((Number(parameters) * 1e9 * Number(bits)) / 8 / 1024 ** 3) * 1.15;
}

export function validateK3Step(id: K3StepId, draft: K3Draft): string[] {
  const value = draft[id];
  if (id === 'goal') {
    const errors = [];
    if (!enough(value.task, 12)) {
      errors.push('请用至少 12 个字写清模型要完成的任务。');
    }
    if (!enough(value.input, 8) || !enough(value.output, 8)) {
      errors.push('请分别描述输入和输出格式。');
    }
    if (value.failure.split('\n').filter((line) => line.trim()).length < 2) {
      errors.push('请逐行写出至少 2 条失败标准。');
    }
    return errors;
  }
  if (id === 'runtime') {
    const errors = [];
    if (!value.system || !value.stack) {
      errors.push('请选择运行系统和推理工具。');
    }
    if (!enough(value.evidence, 20)) {
      errors.push('请记录安装命令或环境检查结果。');
    }
    return errors;
  }
  if (id === 'model') {
    const memory = estimateWeightMemory(value.parameters, value.bits);
    if (!positive(value.capacity)) {
      return ['请输入可用内存或显存。'];
    }
    if (!positive(value.parameters) || !positive(value.bits)) {
      return ['请选择模型参数量和量化精度。'];
    }
    return memory <= Number(value.capacity) * 0.85
      ? []
      : [
          `预计需要 ${memory.toFixed(1)} GiB，请选择更小模型或更低位宽，并预留 15% 空间。`,
        ];
  }
  if (id === 'infer') {
    const errors = [];
    if (!enough(value.command, 12)) {
      errors.push('请粘贴实际运行过的推理命令。');
    }
    if (!enough(value.output, 30)) {
      errors.push('请记录一段真实模型输出。');
    }
    if (!positive(value.latency) || !positive(value.memory)) {
      errors.push('耗时和峰值内存必须大于 0。');
    }
    return errors;
  }
  if (id === 'api') {
    const errors = [];
    if (!jsonObject(value.request, ['prompt', 'messages'])) {
      errors.push('请求必须是包含 prompt 或 messages 的 JSON 对象。');
    }
    if (!jsonObject(value.response, ['text', 'choices'])) {
      errors.push('响应必须是包含 text 或 choices 的 JSON 对象。');
    }
    if (!enough(value.contract, 20)) {
      errors.push('请写清超时、长度或错误处理约定。');
    }
    return errors;
  }
  const samples = value.samples.split('\n').filter((line) => line.trim());
  const errors = [];
  if (samples.length < 10) {
    errors.push(`还需要 ${10 - samples.length} 条评测样本。`);
  }
  if (!enough(value.review, 30)) {
    errors.push('请用至少 30 个字复盘准确性、格式、拒答或成本。');
  }
  return errors;
}
