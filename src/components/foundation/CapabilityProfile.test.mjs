import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const { default: CapabilityProfile } = await tsImport('./CapabilityProfile.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
})

test('画像展示固定分子分母及记录边界，不把学习记录声称为能力认证', () => {
  const html = renderToStaticMarkup(createElement(CapabilityProfile, {
    progress: { 'paper-lab:attention-is-all-you-need': 4, 'k3:concept:goal': 4, 'k3:build:goal': 4 },
    go: () => {},
  }))
  assert.match(html, /学习记录覆盖/)
  assert.match(html, /0 \/ 25 节点/)
  assert.match(html, /0 \/ 31 节点/)
  assert.match(html, /0 \/ 30 节点/)
  assert.match(html, /0 \/ 21 节点/)
  assert.match(html, /0 \/ 4 路线/)
  assert.match(html, /K3 与论文记录保留，但暂未纳入此覆盖率/)
  assert.match(html, /不等于能力认证/)
  assert.match(html, /尚无达到记录门槛的课程节点/)
})
