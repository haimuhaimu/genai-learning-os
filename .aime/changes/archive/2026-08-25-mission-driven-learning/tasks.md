## 1. 基线冻结与兼容夹具

- [x] 1.1 在实现前运行 `pnpm ci:check`、`pnpm check:bundle` 与 `pnpm check:route-chunks`，记录入口 JS/首屏 CSS/总 JS/总 CSS/总 bundle/最大 chunk 精确字节，确认不得放宽 `scripts/check-bundle.mjs` 的上一轮冻结上限。
- [x] 1.2 更新 `src/compatibility.fixture.ts` 与 `src/compatibility.test.mjs` 的断言夹具，冻结五个主导航、当前 33 个 canonical pages、`map` 别名、8 类深链参数、旧进度/证据/资源闭环 ID 与 storage key；不得新增 mission page。
- [x] 1.3 保存变更前无 mission 案例的 runner 顺序、计算、摘要和存储行为测试夹具，确保后续可验证完全兼容。

## 2. Mission schema 与纯函数内核

- [x] 2.1 修改 `src/components/strategy/types.ts`，定义可选 `MissionSpec`、2–3 个门槛、确定性 preset、5 维受控能力标签、快照和压力结果类型，且不改变旧 `StrategyCaseSpec` 必填字段。
- [x] 2.2 修改 `src/components/strategy/defineStrategyCase.ts`，校验 mission ID、门槛数量、metric/control 引用、比较符、preset control 值域与能力词表，并输出案例 ID 和字段路径。
- [x] 2.3 新增 `src/components/strategy/missionEngine.ts`，实现无 DOM 的门槛判定、按门槛方向解释 delta、缺失指标降级、任务阶段推导和确定性压力执行。
- [x] 2.4 在 `missionEngine.ts` 实现稳定复盘文本生成，覆盖锁定预测、最终 controls、关键 delta、最近压力结果和迁移问题，并明确缺失证据。
- [x] 2.5 新增/扩展 `defineStrategyCase.test.mjs` 与 `missionEngine.test.mjs`，覆盖合法 schema、无 mission fallback、坏引用/值域、边界比较、方向解释、重复压力一致性、阶段与复盘文本。

## 3. 两个完整示范案例

- [x] 3.1 修改 `src/components/strategy/mechanismCases.ts`，为 `context-window-budget` 配置角色、目标、coverage/truncation/cost 门槛、8k 窗口压力 preset、返回旋钮、迁移问题和能力标签，不暴露推荐参数。
- [x] 3.2 修改 `src/components/strategy/mechanismCases.ts`，为 `rag-chunking` 配置角色、目标、answerable/noise/contextTokens 门槛、topK=10 且 contextCap=2000 的压力 preset、返回旋钮、迁移问题和能力标签。
- [x] 3.3 扩展 `src/components/strategy/mechanismCases.test.mjs`，冻结两个示范的默认/压力 raw 指标、门槛两侧、失败原因/返回旋钮，并断言不使用随机或网络服务。

## 4. 预测、快照与压力证据持久化

- [x] 4.1 修改 `src/resourceLoop.ts`，在原 `genai-resource-loop-v1` schema 中向后兼容地清洗/读取可选 `missionAttempt`，并保持损坏新增字段不牵连旧预测、复盘和资源记录。
- [x] 4.2 将 `saveInitialJudgment` 改为已有非空预测时幂等不覆盖，并继续支持 localStorage 写入失败时的会话锁定回退。
- [x] 4.3 在 `resourceLoop.ts` 实现每案例单个快照替换、最近压力结果保存，以及仅清预测和本轮比较状态的 `reopenMissionAttempt`；保留资源触达、旧复盘判断、策略证据和其他案例。
- [x] 4.4 修改 `src/strategyEvidence.ts`，在原 `genai-strategy-evidence-v2` 中兼容清洗并去重合并已通过 preset ID；失败不计覆盖，level 与历史通过证据不倒退。
- [x] 4.5 扩展 `resourceLoop.test.mjs` 与 `strategyEvidence.test.mjs`，覆盖预测锁定、重开范围、取消无副作用、单快照替换、通过证据并集、旧记录兼容、坏字段清洗和写失败回退。

## 5. 通用任务 UI 与状态流

- [x] 5.1 新增 `MissionBrief.tsx`，显示角色、一句话任务、2–3 个门槛、预算/目标当前状态与总状态，不显示推荐 controls 或 preset 隐藏答案。
- [x] 5.2 修改 `StrategyPredictionPanel.tsx`，保存后渲染只读锁定预测；增加可取消的“重开任务”二次确认、正确焦点返回和简短状态播报。
- [x] 5.3 新增 `MissionComparisonPanel.tsx`，比较默认基线/当前策略并保存或明确替换一个自定义快照；显示 signed delta 和文本含义，不使用 Recharts。
- [x] 5.4 新增 `MissionStressPanel.tsx`，按 spec preset 执行确定性测试，展示总通过/失败、逐门槛当前值/目标/原因，并可将焦点送回 `StrategyControlsPanel.tsx` 的稳定 control id。
- [x] 5.5 修改 `DecisionSummaryPanel.tsx` 并新增 `MissionDebriefCard.tsx`，仅在点击“形成策略摘要”后生成复盘卡；实现 Clipboard API 与只读文本选中降级，不调用后端。
- [x] 5.6 修改 `StrategyCaseRunner.tsx`，按“待预测→锁定→探索/比较→压力→摘要/复盘”编排 mission 组件；只从显式行为推进证据，未配置 mission 时保持旧 JSX 与行为路径。
- [x] 5.7 修改 `strategyCases.css`，实现任务简报、delta、压力、确认和复盘的轻量桌面/移动布局、可见焦点、非颜色文本状态与 `prefers-reduced-motion`；不得新增依赖或图表库。

## 6. 能力证据覆盖矩阵

- [x] 6.1 新增 `missionCapabilities.ts` 与测试，从 `level >= 2` 的策略摘要和已通过压力 preset 推导固定 5 维证据，覆盖空态、仅策略、策略+压力、来源去重及不生成分数。
- [x] 6.2 新增 `CapabilityEvidenceMatrix.tsx` 并接入 `ProgressPage.tsx` 的策略证据区域，显示证据类型、来源案例、待补动作和“证据覆盖不等于能力认证”，不显示总分、排名、等级、签到或徽章。
- [x] 6.3 修改 `src/styles/progress.css` 并让 `src/pageRegistry.tsx` 仅在 `progress` lazy route 加载该样式，保证矩阵键盘可达、移动端无横向溢出且不进入应用入口。

## 7. 自动化、可访问性与性能门禁

- [x] 7.1 增加 runner/组件级测试，覆盖预测保存后锁定、重开确认/取消、默认与单快照 A/B、压力通过/失败、复盘解锁/缺失证据/复制降级及无 mission fallback。
- [x] 7.2 扩展进度页测试，验证能力矩阵只使用已形成策略/通过压力的可见行为，来源案例深链正确，且不存在虚荣分数或认证措辞。
- [x] 7.3 扩展 `scripts/check-a11y-static.mjs` 或等价测试，验证原生键盘语义、label/fieldset、焦点目标、颜色非唯一反馈、克制 live region 与 reduced-motion 契约。
- [x] 7.4 扩展 `scripts/check-route-chunks.mjs`，断言 mission 代码仅随案例详情/进度页加载、无关聚合页与入口不加载它，并保持 Recharts 独立；确认 `package.json` 无新增依赖。
- [x] 7.5 运行 storage、mission schema/engine、案例、runner、能力矩阵及 33 页面兼容测试，修复全部 TypeScript strict、ESLint 和 Node test runner 问题。

## 8. 完整验证与手动视觉验收

- [x] 8.1 运行完整 `pnpm ci:check`，再单独复核 bundle/chunk 报告；入口 JS、首屏 CSS、总 bundle、最大 chunk 及总 JS/总 CSS 均不得超过适用冻结值或实施前快照，预算常量不得提高。
- [x] 8.2 **手动视觉验证（html_vision）**：桌面检查案例中心及 `?page=strategy-case&case=context-window-budget`，覆盖初始、预测锁定、基线/快照 delta、压力失败/通过、复盘卡状态，确认简报不泄漏答案。
- [x] 8.3 **手动视觉验证（html_vision）**：桌面检查 `?page=strategy-case&case=rag-chunking` 与 `?page=progress`，确认确定性结果、文本解释、能力证据来源/待补状态和“非能力认证”文案完整。
- [x] 8.4 **手动视觉验证（html_vision）**：在移动端及 `prefers-reduced-motion: reduce` 下复查案例中心、两个 mission 案例和进度页；再用键盘完成保存预测、重开确认/取消、快照替换、压力测试、返回旋钮、形成/复制复盘，并确认无横向溢出、焦点丢失或过度播报。
