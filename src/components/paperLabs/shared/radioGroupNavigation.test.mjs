import assert from 'node:assert/strict'
import test from 'node:test'
import { getRadioTabIndex, getRadioTargetIndex } from './radioGroupNavigation.ts'

test('radio 方向键循环切换，Home 和 End 跳到首尾', () => {
  assert.equal(getRadioTargetIndex('ArrowLeft', 0, 4), 3)
  assert.equal(getRadioTargetIndex('ArrowUp', 2, 4), 1)
  assert.equal(getRadioTargetIndex('ArrowRight', 3, 4), 0)
  assert.equal(getRadioTargetIndex('ArrowDown', 1, 4), 2)
  assert.equal(getRadioTargetIndex('Home', 2, 4), 0)
  assert.equal(getRadioTargetIndex('End', 1, 4), 3)
})

test('radio 忽略无关按键与空选项', () => {
  assert.equal(getRadioTargetIndex('Enter', 1, 3), null)
  assert.equal(getRadioTargetIndex('ArrowRight', 0, 0), null)
})

test('radio 仅让当前选项进入 Tab 顺序，未选择时以首项为起点', () => {
  assert.deepEqual([0, 1, 2].map((index) => getRadioTabIndex(index, -1)), [0, -1, -1])
  assert.deepEqual([0, 1, 2].map((index) => getRadioTabIndex(index, 1)), [-1, 0, -1])
})
