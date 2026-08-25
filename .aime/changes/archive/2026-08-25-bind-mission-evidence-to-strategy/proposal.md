## Why

当前 Mission 可把一次旧压力测试的通过结果与之后修改过的策略合并，并允许在未锁定预测、未运行压力测试时保存 `level: 2`“已形成策略”。这使进度与能力矩阵能够被点击动作假完成，也无法证明压力测试验证的是最终策略，直接违背项目“可验证学习证据”目标。

## What Changes

- 将 Mission 压力结果绑定到执行时的完整 controls 快照，并用确定性比较判断结果对当前策略是否仍然新鲜。
- Mission controls 改变后，旧压力结果保留为历史可见记录，但不再推进当前阶段、解锁复盘或支撑当前策略完成态。
- 为 Mission 的“形成策略摘要”增加统一完成门槛：已锁定预测、已执行与当前策略匹配的压力测试；门槛不要求压力必须通过，但必须显式保留通过/失败证据。
- 只有满足完成门槛的 Mission 摘要才能写入 `level: 2`，并将该次预测、最终 controls、压力结果作为同一证据包持久化；非 Mission 案例保持原行为。
- 能力矩阵仅把通过结构与来源一致性校验的 Mission 完成证据计为“策略形成”，旧记录继续可读但不得被升级为新完成证据。
- 新增可复用的 daily adversarial harness 协议，固定角色轮换、证据要求、问题门槛、单切片选择、修复与验证闭环；今日只应用“算法怀疑者”角色完成上述小切片规范。

## Capabilities

### New Capabilities

- `daily-adversarial-review`: 定义每日对抗式审查的角色轮换、可复现证据、问题准入、单切片决策和验证闭环协议。

### Modified Capabilities

- `mission-driven-strategy-cases`: 将 Mission 完成态与同一次尝试、当前最终策略及新鲜压力结果绑定，阻止缺失或陈旧证据产生完成状态。

## Impact

- 预计修改 `src/components/strategy/types.ts`、`missionEngine.ts`、`StrategyCaseRunner.tsx`、`DecisionSummaryPanel.tsx`、`MissionStressPanel.tsx`、`resourceLoop.ts`、`strategyEvidence.ts` 及对应测试；实现阶段以最小文件集为准。
- `genai-resource-loop-v1` 与 `genai-strategy-evidence-v2` 键保持不变，仅新增可选、可清洗字段；不要求清库或迁移。
- 不新增依赖、路由、案例、后端接口或视觉功能；未配置 mission 的案例行为不变。
- 需要回归任务阶段、存储合并、能力矩阵、33 个 canonical 页面、可访问性和既有 bundle/chunk 门禁。
