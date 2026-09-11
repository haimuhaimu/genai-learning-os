# AimeSpec: 修复 RAG 句子切块在 overlap=0 时的 token 空洞问题

## 问题描述 (Problem)
在 RAG 切块模拟器中，当使用“句子”切块模式且 `overlap` 为 0 时，由于步长（step）的对齐逻辑使用了四舍五入且未对齐后的步长进行上限约束，可能导致 `step > chunkSize`。这会造成文档中相邻两个 chunk 之间出现未被索引覆盖的 token 空洞（Silent Data Loss）。

## 影响 (Impact)
- **学习正确性**：学习者在模拟大块切块时，会遇到无法解释的证据丢失，误以为是 RAG 机制的随机性，而实际上是索引逻辑的 Bug。
- **完成质量**：违反了“统一学习协议”中关于“固定证据”和“可复现机制”的承诺。
- **影响面（UI 可达参数穷举，48 组合）**：旧逻辑下 `chunkSize ∈ {128, 512, 800}` 且 `overlap=0`、`splitter='句子'` 共 3 组产生空洞，每个边界稳定丢失 16 token；`chunkSize=128` 时 policy 文档出现 6 处空洞（96/980 token 未被索引）。默认预设（256 / 20% / 句子）不受影响，因此定级 P1 而非 P0。

## 失败证据 (Evidence)
- 失败优先测试：`src/components/strategy/mechanismCases.test.mjs` 中“句子切块在 overlap=0 时不应产生 token 覆盖空洞”。
- 复现条件：`chunkSize=800`、`overlap=0`、`splitter='句子'`（均为控件可选值），对 980 token 的 policy 文档切块。
- 修复前实际报错：`空洞: 800-816`（相邻 chunk 为 `0-800` 与 `816-980`，800-816 共 16 token 无任何 chunk 覆盖）。
- 修复后该测试通过，且 chunkSize 128-800 全整数 × overlap 0-0.5 扫描零空洞。

## 修复方案 (Solution)
在 `makeDocumentChunks` 函数中，对对齐后的 `step` 增加 `Math.min(rawStep, alignedStep)` 约束，确保步长永远不会超过原始步长（从而不超过 `chunkSize`），消除空洞。

## 验证计划 (Verification)
1. 运行失败优先测试 `adversarial-harness.test.mjs`。
2. 运行全量 `pnpm ci:check`。
3. 验证无障碍、性能预算及部署预览。
