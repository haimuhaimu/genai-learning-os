# stable-information-architecture Specification

## Purpose
TBD - created by archiving change consolidate-content-performance. Update Purpose after archive.
## Requirements
### Requirement: 五个稳定顶层入口
系统 SHALL 将主导航限制为且仅为五个稳定入口，按“首页、学堂、案例、实验室、工具箱”的顺序呈现；入口目标分别 SHALL 为 `unified-map`、`routes`、`strategy-cases`、`labs` 和新的工具箱聚合页。搜索、反馈、分享和进度可以保留为工具操作，但 MUST NOT 被计入顶层 IA 入口。

#### Scenario: 桌面导航入口稳定
- **WHEN** 用户在桌面视口打开任意站内页面
- **THEN** 主导航只显示五个 IA 入口且顺序为首页、学堂、案例、实验室、工具箱
- **AND** 搜索、反馈、分享和进度若显示则位于导航入口之外

#### Scenario: 深层页面高亮所属分区
- **WHEN** 用户通过课程、案例、实验、视频、论文或其他旧页面深链进入站点
- **THEN** 导航兼容映射 SHALL 高亮该页面所属的五个顶层分区之一
- **AND** 不因页面未直接出现在主导航中而错误高亮首页

### Requirement: 聚合页职责与重复入口收口
系统 SHALL 将 `UnifiedMap` 定义为全站总览、推荐与继续学习起点，将 `LearningRoutesHub` 定义为课程和结构化学习路径聚合页；系统 SHALL 将视频与论文合并到工具箱资源区，将所有实验发现入口统一到 `LabsHub`，并保留案例中心作为案例发现入口。

#### Scenario: 首页与学堂角色不重复
- **WHEN** 用户访问首页和学堂
- **THEN** 首页优先展示跨类型总览、个性化推荐和继续学习
- **AND** 学堂优先展示课程层级、路线与学习顺序

#### Scenario: 从工具箱发现视频和论文
- **WHEN** 用户进入工具箱资源区
- **THEN** 同一聚合页提供视频和论文内容的发现与筛选入口
- **AND** 选择资源后可到达其既有详情或资源目标

#### Scenario: 从统一实验室发现实验
- **WHEN** 用户从主导航选择实验室
- **THEN** `LabsHub` 展示 registry 中所有可见实验的统一目录
- **AND** 任一实验入口导航到该实验既有 page 与深链参数

### Requirement: 旧路由和进度完全兼容
系统 MUST 保留当前 33 个 canonical pages、五个顶层导航入口、`map` 别名以及 `module`、`experiment`、`node`、`section`、`chapter`、`card`、`case`、`paper` 深链参数的可用性；系统 MUST NOT 删除、增加、重命名或重新解释已有 page、内容 ID、进度 ID、存储键及其已保存值。mission 能力 MUST 嵌入现有案例详情和首页/进度页，不得创建新课程、顶层入口或 canonical page。

#### Scenario: 五入口与 33 页面保持稳定
- **WHEN** mission-driven-learning 变更完成
- **THEN** 主导航仍且仅显示首页、学堂、案例、实验室、工具箱五个入口
- **AND** `canonicalPages` 与变更前 33 项逐项一致且没有新增 mission 页面

#### Scenario: 旧顶层直达 URL 继续可用
- **WHEN** 用户打开 `page=videos`、`page=papers`、`page=reviews`、`page=progress`、`page=handbook` 或 `page=co-build` 等不位于主导航的旧 URL
- **THEN** 系统直接渲染原目标内容或无损兼容目标
- **AND** URL 中仍保留可分享和可前进后退的有效页面状态

#### Scenario: 参数化深链继续定位内容
- **WHEN** 用户打开带既有 `case`、`paper`、`experiment`、`module`、`node`、`section`、`chapter` 或 `card` 参数的合法 URL
- **THEN** 系统定位到与变更前相同的内容对象和内部状态
- **AND** `context-window-budget` 与 `rag-chunking` 继续使用既有 `page=strategy-case&case=<id>` 深链而不新增参数

#### Scenario: 已有进度和证据无迁移损失
- **WHEN** 浏览器中存在变更前写入的学习进度、策略证据或资源闭环记录
- **THEN** 首页、进度页、聚合页和案例详情读取相同 ID、存储键与既有值
- **AND** 用户无需清空或手工迁移数据即可继续学习并逐步产生可选 mission 证据

#### Scenario: 未知路由安全回退
- **WHEN** URL 包含未知 page 或失效的可选深链参数
- **THEN** 系统使用既有安全默认页或该页面定义的可用默认内容
- **AND** 页面不得崩溃或显示空白主内容

### Requirement: 响应式且键盘可达的导航
系统 SHALL 在空间足够时让五个入口保持单行；空间不足时 SHALL 折叠为具有明确展开状态的移动导航。所有入口、菜单控制与关闭操作 MUST 可通过键盘完成，焦点 MUST 可见且在关闭后返回触发器；动效和滚动 SHALL 尊重 `prefers-reduced-motion`。

#### Scenario: 移动端导航折叠
- **WHEN** 视口不足以在一行容纳品牌、五个入口和必要工具
- **THEN** 主导航折叠为带 `aria-expanded` 状态的菜单按钮
- **AND** 展开内容不产生水平溢出

#### Scenario: 键盘操作移动菜单
- **WHEN** 键盘用户展开菜单、移动到任一入口并激活，或按 Escape 关闭菜单
- **THEN** 导航动作可完成且焦点顺序符合视觉顺序
- **AND** 关闭菜单后焦点回到菜单触发器

#### Scenario: 减少动态效果
- **WHEN** 操作系统设置 `prefers-reduced-motion: reduce`
- **THEN** 页面切换滚动和导航过渡使用无动画或最小动画模式
