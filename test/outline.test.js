import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseOutline, saveOutline, loadOutline } from '../src/core/outline.js'

const VALID = `# 第007章 借刀

- 视角：沈砚
- 目标字数：2500
- 时间锚：第三日·黄昏
- 地点：城西旧宅
- 出场：沈砚、老周、褚九
- 情绪：紧张 → 痛快
- 章末钩子：悬念-老周在门外听见
- 伏笔埋设：铜钱背面刻字
- 伏笔回收：F004

## 场景 1
- 目标：拿到褚九的把柄
- 冲突：褚九反将一军
- 转折：把柄是假的

## 场景 2
- 目标：脱身
- 冲突：老周堵门
- 转折：老周其实是来送信
`

test('合法细纲解析出全部字段', () => {
  const { data, errors, warnings } = parseOutline(VALID, 7)
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
  assert.equal(data.title, '借刀')
  assert.equal(data.pov, '沈砚')
  assert.equal(data.targetWords, 2500)
  assert.equal(data.timeAnchor, '第三日·黄昏')
  assert.deepEqual(data.characters, ['沈砚', '老周', '褚九'])
  assert.deepEqual(data.foreshadowIn, ['铜钱背面刻字'])
  assert.deepEqual(data.foreshadowOut, ['F004'])
  assert.equal(data.scenes.length, 2)
  assert.equal(data.scenes[0].goal, '拿到褚九的把柄')
  assert.equal(data.scenes[1].turn, '老周其实是来送信')
})

test('缺字段/缺场景会报错', () => {
  const { errors } = parseOutline('# 第1章 空\n\n- 视角：甲\n', 1)
  assert.ok(errors.some((e) => e.includes('目标字数')))
  assert.ok(errors.some((e) => e.includes('章末钩子')))
  assert.ok(errors.some((e) => e.includes('场景')))
})

test('场景三字段全空也算错', () => {
  const doc = VALID.replace('- 目标：拿到褚九的把柄', '').replace('- 冲突：褚九反将一军', '').replace('- 转折：把柄是假的', '')
  const { errors } = parseOutline(doc, 7)
  assert.ok(errors.some((e) => e.includes('三个字段全空')))
})

test('saveOutline 校验通过才写盘，loadOutline 能读回', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'outline-'))
  const saved = await saveOutline(dir, 7, VALID)
  assert.equal(saved.data.title, '借刀')

  const loaded = await loadOutline(dir, 7)
  assert.equal(loaded.data.no, 7)
  assert.equal(loaded.data.scenes.length, 2)

  await assert.rejects(() => saveOutline(dir, 8, '# 第8章 缺字段'), /不合法/)
  assert.equal(await loadOutline(dir, 8), null)
})
