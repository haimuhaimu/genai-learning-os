# AimeSpec（归档）- 2026-08-27 / 角色：算法怀疑者

## 只修 1 个根因问题
**`docs/VIDEO_CONTRIBUTING.md` 的校验命令给错（写成 `node --test`），导致贡献者按文档操作会直接失败或得到不可靠的校验结果。**

这会让“补充学习资源”的贡献路径更难闭环，也会降低学习内容维护质量（贡献者更可能跳过本应执行的全量门禁）。

## 可复现失败证据
在仓库根目录执行（文档当前建议的命令之一）：

```bash
node --test src/compatibility.test.mjs
```

会报错：
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../src/strategyEvidenceEvent imported from .../src/strategyEvidence.ts`

原因是：项目测试依赖 `tsx` loader（见 `scripts/run-tests.mjs` 用 `node --import tsx --test ...`），而 `node --test` 不带该 loader，同时 Node 的 ESM 解析也不支持无扩展名去找 `.ts` 文件。

## 根因分析
- 项目标准测试入口是 `pnpm test`（走 `scripts/run-tests.mjs`），而不是裸 `node --test`。
- `VIDEO_CONTRIBUTING.md` 的校验段落把命令写成了 `node --test`，与仓库真实约束不一致。

## 修复方案
1. **失败优先测试**：新增一个文档校验测试，禁止 `docs/VIDEO_CONTRIBUTING.md` 出现 `node --test`，并要求给出正确的替代命令（`pnpm test` 或 `pnpm ci:check`）。
2. **修正文档**：将 `node --test` 替换为 `pnpm test`（或直接建议 `pnpm ci:check`）。

## 验证清单（必须闭环）
- [x] 新增测试：修复前失败、修复后通过
- [x] `pnpm ci:check` 全绿
- [x] `git diff --check` 通过
- [x] 移动端 / 键盘 / reduced-motion：本次不改 UI；既有 reduced-motion / keyboard 相关测试继续通过；并完成部署静态检查
- [x] 部署预览可访问

## 约束确认
- 不引入课程/积分/签到/徽章/排名来掩盖问题
- 不放宽性能预算
- 不破坏旧路由、旧 storage keys 与历史记录


## 实施结果
- 修复：`docs/VIDEO_CONTRIBUTING.md` 将 `node --test` 更正为 `pnpm test`
- 新增：`docs/video-contributing-validation.test.mjs`，防止文档回退到不可执行的校验命令
- 验证：本分支已通过 `pnpm ci:check`、`git diff --check`
- 部署预览：https://e3e62aab48bc.aime-app.bytedance.net
- 提交：9e0aff0
