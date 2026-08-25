## 1. 失败基线与纯判定契约

- [x] 1.1 在 `missionEngine.test.mjs` 加入当前可失败的关系测试：旧压力结果与新 controls 组合不得进入 `debrief`，未预测或无新鲜压力不得满足完成门槛。
- [x] 1.2 为 schema 键顺序无关、非法 controls、旧未绑定压力记录和匹配的失败压力补齐新鲜度/完成门槛边界测试。
- [x] 1.3 在 `types.ts` 与 `missionEngine.ts` 定义并实现基础/有效 controls 绑定、`StressFreshness` 和统一 `MissionCompletionGate` 纯函数。

## 2. 当前尝试压力证据

- [x] 2.1 修改 `MissionStressPanel.tsx`，运行 preset 时保存完整 `baseControls` 与 `effectiveControls`，并停止在压力通过时提前写入未绑定的跨尝试能力证据。
- [x] 2.2 修改 `resourceLoop.ts` 清洗新增压力字段；旧记录继续可读但被判为 `legacy-unbound`，不得猜测被测策略。
- [x] 2.3 扩展 `resourceLoop.test.mjs`，覆盖新记录往返、未知/非法 control 清洗、旧记录降级和其他旧字段不受影响。

## 3. 完成门槛与原子证据

- [x] 3.1 修改 `StrategyCaseRunner.tsx`，让阶段、摘要提交与复盘解锁共享同一完成门槛；controls 改变时清除当前形成态并把旧压力显示为过期。
- [x] 3.2 为 `DecisionSummaryPanel.tsx` 增加可选门槛与逐项缺失说明；保存回调再次校验，未配置 mission 的调用保持原行为。
- [x] 3.3 修改 `strategyEvidence.ts`，清洗和合并原子 `missionCompletion`；仅在形成摘要时绑定预测、最终 controls 与本次压力结果，失败压力不写入通过集合。
- [x] 3.4 扩展 `strategyEvidence.test.mjs`，证明不同尝试/不同 controls 的摘要和压力不能被合并为完整证据，写入失败不派发完成事件。

## 4. 能力覆盖与兼容

- [x] 4.1 修改 `missionCapabilities.ts`，带 mission 的能力覆盖仅消费合法 `missionCompletion`；旧独立 `level: 2` 与 passed preset 记录不自动拼成新证据。
- [x] 4.2 扩展 `missionCapabilities.test.mjs`，覆盖完整通过、完整失败、旧记录、controls 不一致和非 Mission 兼容。
- [x] 4.3 更新 `missionUi.test.mjs` 并尽可能增加交互行为测试，覆盖无预测、无压力、压力后调参、失败压力完成、通过压力完成五条路径；源码存在性断言不得替代行为门槛测试。

## 5. 自动化与人工验证

- [x] 5.1 重跑任务开始前的最小复现，确认旧行为测试先失败；实现后确认相同复现不再得到 `debrief`，也不再产生跨策略绑定记录。
- [x] 5.2 运行 Mission、resourceLoop、strategyEvidence、能力矩阵定向测试，再运行 `pnpm test`、`pnpm lint`、`pnpm build`、`pnpm check:a11y`、`pnpm check:bundle` 与 `pnpm check:route-chunks`；不得提高冻结预算。
- [x] 5.3 **[需手动验证]** 在本地桌面和窄屏分别验证 `context-window-budget` 与 `rag-chunking`：无预测、无压力、压力后调参均不能形成完成态；匹配的失败/通过压力均可形成语义正确的复盘。
- [x] 5.4 **[需手动验证]** 刷新页面并注入一条旧格式压力记录，确认历史结果可见且提示需重跑，进度页不会把旧摘要与旧通过记录拼成新的 Mission 能力覆盖。
- [x] 5.5 按 daily adversarial harness 记录角色、六件套证据、选中切片、原复现转绿、相邻回归与遗留候选；用户确认后再归档 change，本任务不自动提交代码。

## 6. 实施边界

- [x] 6.1 确认没有新增依赖、路由、案例、评分或判断变化表单，未配置 mission 的案例摘要和进度语义保持不变。
- [x] 6.2 准备建议提交信息 `fix(mission): bind completion evidence to tested strategy`，但仅在用户另行授权后提交。
