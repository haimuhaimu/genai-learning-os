# RAG 句子切块的文本覆盖空洞

发现日期：2026-09-11。复核日期：2026-09-13。

## 问题与影响

RAG 教学模拟器在“句子”切块、`overlap=0` 时，部分参数会让相邻块之间出现未覆盖的 token 区间。例如，980 token 的固定退款规则样例在 `chunkSize=800` 时被切成 `0-800` 和 `816-980`，中间遗漏了 16 token。

该结果仍然是确定性的，但不满足切块应覆盖原文的要求，可能误导学习者对检索证据丢失原因的理解。这是教学模拟器的区间计算缺陷，不涉及真实业务文档或线上用户数据。默认配置 `256 / 20% / 句子` 不受影响。

## 根因与修复

`src/components/strategy/mechanismCases.ts` 的 `makeDocumentChunks` 将句子模式步长对齐到 48 token。旧实现的向上舍入可能让步长超过块长：800 会舍入为 816，而块长仍为 800。

修复将对齐步长限制在原始步长之内。在模拟器支持的范围内（块长 128–800、重叠率 0–0.5），这保证步长不超过块长：

```ts
const alignedStep = Math.round(rawStep / 48) * 48
const step = splitter === '句子' ? Math.max(48, Math.min(rawStep, alignedStep)) : rawStep
```

修复后，上述样例的区间为 `0-800` 和 `800-980`。

## 本地复现与验证

安装依赖后，运行现有回归测试：

```bash
node --import tsx --test src/components/strategy/mechanismCases.test.mjs
```

测试“句子切块在 overlap=0 时不应产生 token 覆盖空洞”检查相邻区间是否连续；旧实现会报 `空洞: 800-816`。

仓库完整验证：

```bash
pnpm ci:check
git diff --check
```

2026-09-13 复核覆盖现有 53 个测试文件、273 项测试，以及 lint、静态无障碍、类型、构建、包体预算与路由分块检查。另对块长 128–800 的每个整数、重叠率 0–0.5（步进 0.1）、两种切块模式和三篇固定样例检查首尾及连续覆盖。

## 审阅边界

- 实现与回归测试分别位于 `mechanismCases.ts` 和 `mechanismCases.test.mjs`。
- PR 的最终差异仅保留这两个文件及本说明，不纳入本地规划归档或内部预览地址。
- 修复不改变界面、路由、本机进度存储或性能预算；本次复核不声称重新完成浏览器视觉检查。
