# 每日对抗审查报告 - 2026-09-11 / 角色：零基础学习者

## 今日只修 1 个根因问题
**RAG 切块模拟器在「句子切块 + overlap=0」时会静默产生 token 覆盖空洞（silent data loss），学习者拖动控件后看到无法解释的证据丢失，容易形成「RAG 检索本来就会随机漏证据」的错误直觉。**

- 根因位置：`src/components/strategy/mechanismCases.ts` 的 `makeDocumentChunks`。
- 页面承诺「固定文档与 query 让每次切块、排序和装箱结果完全可复现」，但旧逻辑给出的切块区间本身不连续，违反了这条学习承诺。

## 可复现失败证据
复现输入均为控件可选值：`chunkSize=800`、`overlap=0`、`splitter='句子'`，文档为 980 token 的《企业退款规则》。

```bash
node --import tsx --test src/components/strategy/mechanismCases.test.mjs
```

把修复还原到 `origin/main` 后，新增测试「句子切块在 overlap=0 时不应产生 token 覆盖空洞」失败，实际报错：

```
not ok 8 - 句子切块在 overlap=0 时不应产生 token 覆盖空洞
  error: '空洞: 800-816'
```

相邻 chunk 为 `0-800` 与 `816-980`，800-816 共 16 个 token 没有任何 chunk 覆盖。

影响面（对 4×6×2 = 48 个 UI 可达参数组合穷举）：旧逻辑下 `chunkSize ∈ {128, 512, 800}` × `overlap=0` × 句子切块共 **3 组**产生空洞，每个边界稳定丢失 16 token；`chunkSize=128` 时 policy 文档出现 6 处空洞（约 96/980 token、接近一成内容未被索引）。默认预设（256 / 20% / 句子）不受影响，故定级 **P1**（学习正确性受损、参数学习者可达，但非默认路径、无崩溃与数据破坏）。

## 根因分析
句子模式把步长对齐到 48 token：

```ts
const step = splitter === '句子' ? Math.max(48, Math.round(rawStep / 48) * 48) : rawStep
```

`Math.round` 可能把步长向上取整到超过 `chunkSize`（如 rawStep=800 → alignedStep=816）。而循环用 `start += step`、chunk 宽度仍是 `chunkSize`，`step > chunkSize` 时相邻 chunk 必然留出空洞。overlap=0 时 rawStep 最大，最容易触发。

## 修复方案
对齐后的步长不得超过未对齐步长（也就不可能超过 chunkSize）：

```ts
const alignedStep = Math.round(rawStep / 48) * 48
const step = splitter === '句子' ? Math.max(48, Math.min(rawStep, alignedStep)) : rawStep
```

失败优先测试在修复前失败、修复后通过；另做参数网格扫描（chunkSize 128-800 全整数 × overlap 0-0.5），修复后零空洞。

## 验证清单（实际执行结果）
- [x] 失败基线：还原 `origin/main` 代码后新测试失败（`空洞: 800-816`），修复后通过
- [x] `pnpm ci:check` 全绿：eslint 0 问题；测试 **273 通过 / 0 失败**；静态 a11y、`pnpm build`、bundle、路由 chunk 门禁全部通过
- [x] `git diff --check` 通过
- [x] Bundle 门禁：JS 总量 1,166,292 B → 1,166,308 B（**+16 B，+0.0014%**，全部位于 caseCatalog chunk），距预算上限仍有大量余量；最大 chunk、入口 JS/CSS 无变化
- [x] 路由 chunk：6 个关键路由保持独立异步产物，4 组页面 CSS 未汇入入口
- [x] 移动端 / 键盘 / reduced-motion：本次仅改动纯计算函数与测试，无任何 JSX/CSS 文件变更；`check-a11y-static`（键盘语义、noopener、skip link）与 reduced-motion 契约检查继续通过
- [x] 旧路由 / 旧 storage keys / 历史记录：差异仅含 `mechanismCases.ts`、其测试与 `.aime`/`docs` 文档，未触碰导航、storage 与进度代码
- [x] 部署预览可访问，首页渲染正常、控制台零报错：https://16e31cd88c30.aime-app.bytedance.net

## 约束确认
- 未新增课程、积分、签到、徽章或排名来掩盖问题
- 未放宽任何性能预算（budget 脚本与阈值未改）
- 未破坏旧路由、旧 storage keys 与历史记录

## 实施结果
- 修复：`src/components/strategy/mechanismCases.ts`，对齐步长增加上限约束
- 新增：`src/components/strategy/mechanismCases.test.mjs` 空洞回归测试
- 归档：`.aime/changes/archive/2026-09-11-daily-adversarial-harness/`
- 提交：4381ed0（修复）、1601686（归档 AimeSpec）、329050e（任务状态）及当日报告提交
- 分支：`aime/1789092163-daily-adversarial-harness`（基于最新 `origin/main` f9f385d）
- PR：P1 满足创建门槛，推送后创建 PR，**不自动合并 main**
