# 设计方案: 修复 RAG 切块空洞

## 背景
RAG 句子切块逻辑为了保持对齐，可能会导致步长超过块大小，从而产生空洞。

## 修改点
1. 修改 `src/components/strategy/mechanismCases.ts` 中的 `makeDocumentChunks` 函数。
2. 引入 `alignedStep` 变量并使用 `Math.min(rawStep, alignedStep)` 限制。

## 性能影响
无。逻辑变更仅涉及少量标量计算，产物体积波动极小（约 +16 字节）。
