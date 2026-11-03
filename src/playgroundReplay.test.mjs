import test from 'node:test'
import assert from 'node:assert/strict'
const api = await import('./playgroundReplay.ts').catch(() => ({}))

test('production module URLs stay on the owned public teaching root', () => {
  assert.equal(typeof api.modelCoachModuleURLs, 'function')
  assert.deepEqual(api.modelCoachModuleURLs(), {
    engine: 'https://haimuhaimu.github.io/algorithm-playground/learning-tool.mjs',
    trials: 'https://haimuhaimu.github.io/algorithm-playground/learning-route-trials.mjs',
  })
})
test('paired preview uses only an explicit loopback root and drops unrelated query data', () => {
  assert.equal(api.modelCoachModuleURLs('http://127.0.0.1:3103/?private=ignored#ignored').trials, 'http://127.0.0.1:3103/learning-route-trials.mjs')
  assert.equal(api.modelCoachModuleURLs('http://localhost:3103/').engine, 'http://localhost:3103/learning-tool.mjs')
})
test('an arbitrary remote module, credential URL or privileged local port is never imported', () => {
  assert.equal(typeof api.modelCoachModuleURLs, 'function')
  for (const base of ['https://evil.example/', 'https://haimuhaimu.github.io/other/', 'https://u:p@haimuhaimu.github.io/algorithm-playground/', 'http://127.0.0.1:80/', 'http://127.0.0.1:3103/private/', 'file:///tmp/engine/']) {
    assert.throws(() => api.modelCoachModuleURLs(base))
  }
})
