import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const checkerPath = fileURLToPath(new URL('./check-a11y-static.mjs', import.meta.url))
const checkerSource = readFileSync(checkerPath, 'utf8')

function writeFixture(root, path, source) {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, source, 'utf8')
}

function runChecker(anchor) {
  const root = mkdtempSync(join(tmpdir(), 'genai-a11y-check-'))
  try {
    writeFixture(root, 'scripts/check-a11y-static.mjs', checkerSource)
    writeFixture(root, 'index.html', '<!doctype html><html><body></body></html>')
    writeFixture(root, 'src/example.tsx', anchor)
    writeFixture(
      root,
      'src/business.tsx',
      "<a className='lo-skip-link' href='#main-content'>skip</a><main id='main-content'></main>",
    )
    writeFixture(
      root,
      'src/components/strategy/StrategyPredictionPanel.tsx',
      "<div role='alertdialog' aria-live='polite'>确认重开 取消</div>\ntriggerRef.current?.focus\ninputRef.current?.focus",
    )
    writeFixture(
      root,
      'src/components/strategy/StrategyControlsPanel.tsx',
      '<label>control</label><fieldset><legend>controls</legend></fieldset>',
    )
    writeFixture(
      root,
      'src/components/strategy/MissionStressPanel.tsx',
      "document.getElementById(`strategy-${id}`)\n<div aria-live='polite'>通过</div>",
    )
    writeFixture(
      root,
      'src/components/strategy/MissionDebriefCard.tsx',
      "<div aria-live='polite'>debrief</div>",
    )
    writeFixture(
      root,
      'src/components/strategy/strategyCases.css',
      '@media(prefers-reduced-motion:reduce){}',
    )
    writeFixture(root, 'src/styles/progress.css', '@media(prefers-reduced-motion:reduce){}')

    return spawnSync(process.execPath, [join(root, 'scripts/check-a11y-static.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('rejects a new-window link when noreferrer is missing', () => {
  const result = runChecker(
    '<a href="https://example.com" target="_blank" rel="noopener">example</a>',
  )

  assert.equal(result.status, 1)
  assert.match(result.stderr, /src\/example\.tsx:1.*noreferrer/)
})

test('accepts both required rel tokens in any order with additional tokens', () => {
  const result = runChecker(
    '<a href="https://example.com" target="_blank" rel="external noreferrer noopener">example</a>',
  )

  assert.equal(result.status, 0, result.stderr)
})
