import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyze, aiFlavorHits, repeatedOpenings, hookCheck, runChecks, countChars,
} from '../src/core/checks.js'

test('analyze 统计字数、段落、对话占比', () => {
  const text = '他推开门。\n\n屋里没人。「谁？」他问。'
  const stats = analyze(text)
  assert.equal(stats.chars, countChars(text))
  assert.equal(stats.paragraphs, 2)
  assert.ok(stats.dialogueRatio > 0 && stats.dialogueRatio < 0.5)
  assert.equal(stats.longestParagraph > 0, true)
})

test('aiFlavorHits 只统计实际出现的词', () => {
  const hits = aiFlavorHits('他仿佛看见了什么，不禁后退一步。')
  assert.equal(hits['仿佛'], 1)
  assert.equal(hits['不禁'], 1)
  assert.equal(hits['一丝'], undefined)
})

test('repeatedOpenings 抓到三次相同句首', () => {
  const repeats = repeatedOpenings('他知道。他知道。他知道。他走了。')
  assert.equal(repeats.length, 1)
  assert.equal(repeats[0].opening, '他知')
  assert.equal(repeats[0].count, 3)
})

test('hookCheck 对结尾是否有钩子给出可解释结论', () => {
  assert.equal(hookCheck('他转身离开。', '悬念-门外有人').ok, false)
  assert.equal(hookCheck('他转身离开。门外忽然传来脚步声。').ok, true)
  const drift = hookCheck('他转身离开。门外忽然传来脚步声。', '悬念-电话响起')
  assert.equal(drift.ok, true)
  assert.match(drift.reason, /重合度低/)
})

test('runChecks：字数过少是必须修', () => {
  const result = runChecks({
    text: '# 第1章\n\n太短了。',
    outline: { no: 1, title: '测试', targetWords: 2500, hook: '悬念' },
    state: { foreshadow: [] },
    project: { targetWords: 2500 },
  })
  assert.equal(result.blocking.some((b) => b.code === 'words-low'), true)
})

test('runChecks：超长、AI 味、伏笔逾期进入提醒', () => {
  const body = '他仿佛看见光，不禁停下。'.repeat(400)
  const result = runChecks({
    text: `${body}\n\n门外忽然传来脚步声。`,
    outline: { no: 20, title: '测试', targetWords: 2500, hook: '门外脚步' },
    state: { foreshadow: [{ id: 'F001', text: '那封信', planted: 2, status: 'open', due: 12 }] },
    project: { targetWords: 2500 },
  })
  assert.equal(result.blocking.some((b) => b.code === 'words-high'), true)
  assert.equal(result.warnings.some((w) => w.code === 'ai-flavor'), true)
  assert.equal(result.warnings.some((w) => w.code === 'foreshadow-overdue'), true)
})

test('已回收的伏笔不再报逾期', () => {
  const result = runChecks({
    text: `${'他向前走。'.repeat(700)}\n\n门外忽然传来脚步声。`,
    outline: { no: 30, title: '测试', targetWords: 2500, hook: '门外脚步' },
    state: { foreshadow: [{ id: 'F001', text: '那封信', planted: 2, status: 'closed', due: 12 }] },
    project: { targetWords: 2500 },
    options: { wordTolerance: 2 },
  })
  assert.equal(result.warnings.some((w) => w.code === 'foreshadow-overdue'), false)
})

test('repeatedOpenings 只算连续重复，不算总数', () => {
  assert.deepEqual(repeatedOpenings('他知道。他走了。他知道。他笑了。他知道。'), [])
})

test('对白开头的引号不算句首', () => {
  const repeats = repeatedOpenings('「走。」他说。「走。」他说。「走。」他说。')
  assert.equal(repeats.some((r) => r.opening.startsWith('「')), false)
})
