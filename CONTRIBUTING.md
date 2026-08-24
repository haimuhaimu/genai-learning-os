# 参与贡献

感谢你帮助改进 GenAI Learning OS。提交代码或内容即表示你同意按本仓库的 Apache License 2.0 提供贡献，并遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 从学习者共建中心开始

不确定从哪里开始时，先打开[学习者共建中心](https://haimuhaimu.github.io/genai-learning-os/?page=co-build)，按可投入时间选择路径：

- **1 分钟反馈**：使用站内反馈，或提交 [内容建议](.github/ISSUE_TEMPLATE/content_suggestion.yml) / [Bug 报告](.github/ISSUE_TEMPLATE/bug_report.yml)。
- **30 分钟内容贡献**：推荐[参考视频](.github/ISSUE_TEMPLATE/video_resource.yml)、修正文案或提议[工程维护](.github/ISSUE_TEMPLATE/maintenance.yml)。
- **深度共建**：通过 [Strategy Case 表单](.github/ISSUE_TEMPLATE/strategy_case.yml)先提案，再按作者指南实现。

首次贡献建议先从带有 [`good first issue`](https://github.com/haimuhaimu/genai-learning-os/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22) 标签、验收标准明确的任务开始。认领前可在 Issue 留言说明计划；若任务边界不清楚，先提问，不需要直接提交完整实现。

## 优先贡献：Strategy Case

Strategy Case 从业务目标和产品决策出发，让学习者权衡固定证据、业务代价与反馈闭环，再形成下一轮训练动作。

1. 阅读 [Strategy Case 作者指南](docs/CASE_AUTHORING.md)，确认问题符合七段协议。
2. 复制可类型检查但未注册的 [`examples/strategy-case`](examples/strategy-case/)；实现纯函数 `compute()`、`summarize()` 与测试。
3. 只在 `caseCatalog.ts` 增加案例入口；`CaseId`、route mapping、证据白名单与搜索索引会由 catalog 推导或消费。

不确定是否适合实现时，可先使用 [Strategy Case Issue 表单](.github/ISSUE_TEMPLATE/strategy_case.yml) 说明业务目标、变量、固定数据、代价、反馈和教学边界。

## 贡献参考视频

视频只作为策略摘要之后的可选补充。推荐资源前请阅读 [参考视频贡献与维护指南](docs/VIDEO_CONTRIBUTING.md)，并使用 [参考视频 Issue 表单](.github/ISSUE_TEMPLATE/video_resource.yml) 说明“为什么值得看”和“看完回到哪个决策问题”。

## Bug 与内容贡献

- **Bug**：提供可复现步骤、查询参数深链、预期与实际结果、浏览器信息；视觉问题建议附截图。
- **课程内容**：区分事实、经验规则、教学近似和观点；说明变量、单位、前提、边界与常见误区。
- **既有实验**：可改进默认值、范围、解释、重置、深链和学习进度，但不要让浏览器实验依赖私有服务或密钥。
- **来源**：引用或改编第三方内容时提供来源并确认许可，必要时更新 `THIRD_PARTY_NOTICES.md`。
- **公开边界**：不得加入真实账号数据、私有日志、访问凭据、内部域名或不能公开的数据样例。

## 本地环境

要求 Node.js 20+、pnpm 10+。

```bash
pnpm install
pnpm dev
```

## 分支与提交

1. 从最新 `main` 创建描述清晰的短分支，例如 `content/add-rag-case`。
2. 每个提交只解决一个相对完整的问题；提交信息保持简短、可读。
3. 不提交 `node_modules`、`dist`、日志、缓存、编辑器配置或任何 `.env*` 文件。
4. Pull Request 说明动机、用户可见变化和验证方式；视觉变化附真实页面截图。

## 贡献者署名

Pull Request 请填写希望公开展示的**贡献者显示名**；若留空，默认使用 GitHub 用户名。可以选择提供 GitHub Profile 或其他公开**个人主页**，主页留空不影响评审。合并后，维护者可在相关内容或发布记录中保留这组署名；如需更正，请在对应 PR 中说明。

## 视觉与可访问性

- 保持清晰的信息层级，避免无意义装饰和大面积空白。
- 使用语义化 HTML；交互元素可键盘访问并提供可见焦点状态。
- 图标不能成为唯一信息载体；不能只用颜色表达状态。
- 检查桌面与 320px 窄屏，避免页面级横向溢出、遮挡或不可点击区域。

## 提交前检查

```bash
pnpm ci:check
git diff --check
```

`ci:check` 会统一执行 lint、测试、静态无障碍检查、构建与产物体积检查。手动打开受影响的查询参数深链，检查控制台、关键交互与 320px 布局。Strategy Case 还必须验证默认值、边界、确定性、有限非负输出和核心教学关系。
