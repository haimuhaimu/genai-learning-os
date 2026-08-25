# resource-learning-loop Specification

## Purpose
TBD - created by archiving change p0-learning-loop-paper-labs. Update Purpose after archive.
## Requirements
### Requirement: 首次判断
系统 SHALL 在每个 Strategy Case 中允许学习者针对案例核心问题保存一份首次判断，并 SHALL 将记录按 caseId 隔离保存在本机；首次判断保存后 MUST 立即锁定为只读，任何后续调参、快照或压力结果不得覆盖该预测。系统 SHALL 沿用 `genai-resource-loop-v1` 存储键，并在持久化不可用时保持当前会话内的锁定与比较能力。

#### Scenario: 保存并锁定首次判断
- **WHEN** 学习者输入非空内容并选择保存
- **THEN** 系统保存首次判断及更新时间并将输入切换为只读锁定状态
- **AND** 刷新页面后仍展示同一判断且不能直接编辑或再次覆盖

#### Scenario: 锁定后继续实验
- **WHEN** 学习者已保存首次判断并调整 controls、保存快照或运行压力测试
- **THEN** 系统始终使用锁定预测参与对比和复盘
- **AND** 任一实验操作不得修改首次判断文本或时间

#### Scenario: 本地存储不可用
- **WHEN** 浏览器拒绝或无法写入 localStorage
- **THEN** 系统继续提供当前会话内的预测锁定与比较能力
- **AND** 页面不得崩溃或错误推进其他学习进度

### Requirement: 资源触达记录
系统 SHALL 在学习者主动打开案例关联的视频或论文时记录资源类型、资源 ID 和触达时间，但 MUST NOT 将触达等同于完成学习。

#### Scenario: 打开关联资源
- **WHEN** 学习者从案例页打开一个视频或论文
- **THEN** 系统记录该资源已被触达
- **AND** 外链仍以安全的新窗口方式打开

#### Scenario: 重复打开资源
- **WHEN** 学习者重复打开同一资源
- **THEN** 系统仅保留一条资源记录并更新最近触达时间

### Requirement: 复盘判断与前后对比
系统 SHALL 在首次判断存在后允许学习者保存复盘判断，并 SHALL 并排展示两次回答与变化提示。

#### Scenario: 完成一轮闭环
- **WHEN** 学习者已保存首次判断、触达至少一个资源并保存复盘判断
- **THEN** 系统展示首次判断和复盘判断的并排对比
- **AND** 标记本案例已完成一次资源学习闭环

#### Scenario: 尚未触达资源
- **WHEN** 学习者尝试在未触达任何资源时保存复盘判断
- **THEN** 系统允许保存但明确提示尚未形成完整资源闭环

### Requirement: 隐私与清除
系统 SHALL 明确说明闭环回答仅保存在当前浏览器，并 SHALL 允许学习者清除当前案例记录。

#### Scenario: 清除当前案例记录
- **WHEN** 学习者确认清除当前案例记录
- **THEN** 系统仅删除当前 caseId 的首次判断、复盘判断和资源触达记录
- **AND** 不影响其他案例或现有学习进度

### Requirement: 经确认重开当前任务
系统 SHALL 为已锁定预测的案例提供明确的“重开任务”操作，并 MUST 在执行前要求确认。确认后系统 MUST 仅清除当前 caseId 的首次预测和 mission 本轮比较状态（自定义快照、最近压力结果及临时复盘聚合），同时保留该案例的资源触达、既有复盘判断、已形成策略证据、其他进度以及其他案例记录；取消确认 MUST 不改变任何状态。

#### Scenario: 确认重开任务
- **WHEN** 学习者选择“重开任务”并完成确认
- **THEN** 当前案例恢复到可输入新预测的任务状态，且自定义快照、最近压力结果和临时复盘被清除
- **AND** 当前案例的资源触达/旧复盘判断、已形成策略证据及其他案例数据保持不变

#### Scenario: 取消重开任务
- **WHEN** 学习者进入重开确认后选择取消或关闭确认界面
- **THEN** 锁定预测和全部当前比较状态保持不变
- **AND** 焦点返回“重开任务”触发器

### Requirement: 旧资源闭环存储向后兼容
系统 MUST 在不重命名 `genai-resource-loop-v1`、不删除既有字段且不要求用户迁移的情况下读取变更前记录；新增 mission 任务状态 SHALL 使用可选字段并经过长度、类型、caseId、control/metric ID 与日期清洗。旧记录缺少新增字段时 MUST 视为尚无 mission 比较状态，而不是损坏数据。

#### Scenario: 读取变更前记录
- **WHEN** `genai-resource-loop-v1` 中存在只包含首次判断、复盘判断、资源触达和时间字段的合法旧记录
- **THEN** 系统原样恢复这些既有字段
- **AND** mission 快照和压力状态初始化为空且无需迁移提示

#### Scenario: 新增任务字段损坏
- **WHEN** 某案例的可选 mission 状态包含未知 control、非有限 metric、非法日期或超长文本
- **THEN** 系统丢弃或截断无效的新增字段并保留合法旧资源闭环字段
- **AND** 不影响其他案例记录或导致页面崩溃

