# 参考视频贡献与维护指南

参考视频是 Strategy Case 之后的可选补充，不是课程主流程，也不是完成进度。资源必须帮助学习者解决一个明确的决策卡点，并把注意力带回案例。

## 筛选标准

仅收录同时满足以下条件的资源：

1. 对应“决策、证据、代价或反馈闭环”中的至少一个具体问题；
2. 来自课程官方页面、机构官方频道或长期可信的教育创作者；
3. 能明确写出“为什么值得看”和“看完回到哪个决策问题”；
4. 不以播放量、热度或泛泛的入门推荐代替教学判断；
5. 标题、机构、URL、语言、内容来源和可选时长均可由公开来源人工确认。

不收录只做行业宣传、无法落到案例决策、来源不明、链接不稳定或需要在本站嵌入第三方脚本的内容。

## Catalog schema

资源维护在 `src/resources/videoCatalog.ts`，真实字段如下：

```ts
type VideoResource = {
  id: string
  title: string
  org: string
  speaker?: string
  language: 'zh' | 'en'
  sourceType: 'youtube' | 'bilibili' | 'course' | 'paper' | 'blog' | 'report'
  contentOrigin: '中文原创' | '中文译制' | '海外原版'
  durationLabel?: string
  url: string
  originalSourceUrl?: string
  relatedCaseIds: CaseId[]
  relatedRouteIds: RouteId[]
  whyWorthWatching: string
  returnQuestion: string
  level: '入门' | '进阶'
  casePriority?: number
}
```

`id` 使用 kebab-case；`url` 和 `originalSourceUrl` 必须是 HTTPS 并命中可信域名白名单（除已有域名外，还包含 `arxiv.org`、`openreview.net`、`deepmind.google`、`ai.meta.com`、`technologyreview.com`、`hub.baai.ac.cn`、`nature.com`、`sakana.ai`、`lilianweng.github.io`、`worldmodels.github.io`、`github.com`、`statquest.org`、`zh.d2l.ai`、`speech.ee.ntu.edu.tw`、`openbmb.cn`、`practical-diffusion.org`、`stanford.edu`、`cmu.edu`、`developers.google.com`，`www` 与其他子域也允许）。只有来源明确时才填写 `durationLabel`，不要估算或虚构时长、播放量与评分。`sourceType` 为 `paper`、`blog`、`report` 时禁止填写 `durationLabel`。`casePriority` 数值越小，越优先出现在 Case 面板；应按决策贴合度显式填写，不依赖 Catalog 数组顺序。

## 前沿方向的额外纪律

- 前沿方向禁止使用营销性 SEO 文章：只收录可长期访问的机构页面、论文或严肃报道；
- 禁止把博客称为 paper：`sourceType` 必须与页面本身的形态一致；
- 禁止把中文译制或字幕版本称为中文原创：`contentOrigin` 只在原始作者或团队使用中文时才可标 `中文原创`；
- 前沿路线的资源仍需按"回到哪一步决策"回答 `returnQuestion`，避免变成论文清单。

## 内容来源与译制标注

- `中文原创`：课程或视频原始内容由中文讲者/团队创作，不等于“页面有中文字幕”。
- `中文译制`：海外内容的字幕、配音或转载版本。必须填写原作者或讲者 `speaker`，能确认原始页面时填写 `originalSourceUrl`。
- `海外原版`：原作者、机构或官方课程发布的原始版本。
- 禁止把译制、字幕版或转载标成 `中文原创`；`org` 应如实描述当前承载页面或译制来源，不能用译制账号冒充原作者。
- `sourceType` 描述打开方式：YouTube 用 `youtube`，B 站用 `bilibili`，独立课程页用 `course`。

## 关联 case 与 route

- `relatedCaseIds` 使用 `caseCatalog.ts` 导出的真实 `CaseId`。
- `relatedRouteIds` 使用 Strategy Case 类型中的真实 `RouteId`。
- 至少关联一个 case 或 route；通常应同时关联最直接的案例与路线。
- 不要为了提高曝光把资源挂到不相关的路线，也不要新增第二份 ID 白名单。
- Case 面板最多展示 3 条；超出部分通过“去视频库查看全部”访问。

## 为什么不嵌入或自动播放

本站只提供安全外链，不使用 iframe、不自动播放、不下载视频，也不加载第三方视频脚本。这样能让学习者先完成策略推理，主动决定是否补机制，同时减少追踪、性能和可访问性问题。点击或观看视频不会写入 progress/evidence。

## 校验

```bash
pnpm run check:videos
pnpm run lint
pnpm run build
node --test
git diff --check
```

静态校验覆盖 id 与主 URL 唯一性、kebab-case、HTTPS、允许域名、来源类型、可选原始来源 URL、必填字段和 case/route 引用。CI 不依赖外网 HEAD 请求。

## 人工确认 checklist

提交前逐条确认：

- [ ] 页面显示的标题与来源页面一致；
- [ ] `contentOrigin` 准确，译制/转载没有标成原创；
- [ ] 中文译制填写原作者或讲者，能确认时填写原始来源 URL；
- [ ] URL 能落到具体视频或课程官方页面；
- [ ] 语言标记准确；英文资源只标“英文”，不承诺中文字幕；
- [ ] 只有来源明确时才填写时长，且单位和“单元/课程”口径清楚；
- [ ] `whyWorthWatching` 说明它补足的机制，而非泛泛称赞；
- [ ] `returnQuestion` 把学习者带回一个可回答的策略决策；
- [ ] case、route、优先级与级别关联合理；
- [ ] 页面仍默认折叠，外链明确提示会打开新窗口。
