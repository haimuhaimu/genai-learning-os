# Daily Adversarial Harness 验证记录

## 审查元数据

- 日期：2026-08-26
- 角色：算法怀疑者
- 角色来源：用户指定
- 范围：Mission 压力结果、摘要完成门槛、策略证据持久化、能力矩阵聚合
- 选中切片：将 Mission 完成证据绑定到同一次尝试和最终受测策略

## 六件套证据

1. 代码位置：`missionEngine.ts` 的阶段推导、`MissionStressPanel.tsx` 的压力写入、`StrategyCaseRunner.tsx` 的摘要保存、`missionCapabilities.ts` 的覆盖聚合。
2. 固定输入与步骤：策略 A 运行压力 preset，随后修改任一 control 得到策略 B，再点击“形成策略摘要”。另测未锁定预测、未运行压力和旧格式未绑定压力记录。
3. 变更前实际结果：旧实现仅以“存在压力记录 + 点击形成摘要”进入 `debrief`，并把策略 B 的摘要与策略 A 的通过 preset 合并。
4. 被违反的承诺：Mission 状态必须由可见且一致的行为证据推进，压力结果必须证明测试的是最终策略，旧记录不得自动升级为新证据。
5. 用户影响：学习者可在没有锁定预测、没有测试当前策略时获得“已形成策略”与能力覆盖，产生错误成功状态。
6. 既有测试缺口：测试只检查组件和字段存在，未覆盖“压力后调参”“不同尝试合并”“失败压力可复盘但不算通过”等关系。

## 原复现转绿

- 失败基线：新增测试首先因 `compareStressToCurrent` 和 `getMissionCompletionGate` 尚不存在而失败。
- 修复后：旧压力与新 controls 的组合返回 `fresh-stress` 缺失，阶段保持 `exploring`，不会进入 `debrief`。
- 跨策略绑定：压力面板不再提前写 `passedStressPresetIds`；只有摘要形成时写入内部一致的 `missionCompletion`。

## 自动回归

- 定向测试：48/48 通过。
- 全量测试：243/243 通过，49 个测试文件。
- `pnpm ci:check`：lint、测试、静态 a11y、TypeScript、Vite 构建、bundle 与 route chunk 门禁全部通过。
- Bundle：JS 1,052,890 B，CSS 315,872 B，JS + CSS 1,368,762 B，入口 JS 38,460 B，首屏 CSS 22,085 B，最大 chunk 143,046 B。
- 路由 chunk：6 个关键路由保持异步，4 组页面 CSS 未汇入入口。
- `git diff --check`：通过。

## 浏览器路径

Playwright 在 1440x1000 与 390x844 两种视口验证 `context-window-budget` 和 `rag-chunking`：

- 无预测：摘要按钮禁用并显示缺失条件。
- 已预测但无压力：摘要按钮仍禁用。
- 匹配失败压力：允许形成复盘，复盘明确显示 `No-Go / 待调整`。
- 压力后调参：历史结果显示过期，阶段回到探索，摘要与复盘重新锁定。
- 匹配通过压力：允许形成复盘，复盘显示 Go 结论。
- 注入旧格式压力和旧独立摘要/通过记录后刷新：历史结果可见且要求重跑，能力矩阵不产生 Mission 覆盖。

浏览器自动化结果：5/5 通过。`html_vision` 同时确认初始 Mission 页面无白屏、无布局重叠、无控制台错误，缺失条件与禁用状态可见。

## 相邻回归与边界

- `genai-resource-loop-v1` 与 `genai-strategy-evidence-v2` 键未变化。
- 旧记录继续可清洗、展示和读取，但不会被猜测绑定。
- 非 Mission 摘要仍沿用原有保存行为。
- 未新增依赖、路由、案例、评分或判断变化表单。

## 遗留候选

- 后续可单独评估“判断如何变化，以及由哪条证据触发”的显式学习者输入。本切片不增加该表单或自动文本评分。
