import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBook, writeTextAtomic } from '../src/core/project.js'
import { loadState, saveState } from '../src/core/state.js'
import { saveOutline } from '../src/core/outline.js'
import { buildContext } from '../src/core/context.js'

const OUTLINE = `# 第002章 夜探

- 视角：沈砚
- 目标字数：2500
- 时间锚：第三日·夜
- 地点：县衙
- 出场：沈砚
- 章末钩子：悬念-看见第二个影子
- 伏笔埋设：墙上的第二道影子
- 伏笔回收：

## 场景 1
- 目标：找到卷宗
- 冲突：巡夜人经过
- 转折：卷宗被人先一步取走
`

test('上下文包含细纲、状态、伏笔、人物卡与文风锚点', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ctx-'))
  const { dir, project } = await createBook(root, { title: '北境无神', targetWords: 2500 })
  await saveOutline(dir, 2, OUTLINE)
  await writeTextAtomic(join(dir, '01-设定', '人物-沈砚.md'), '# 沈砚\n\n- 欲望：查清父亲死因\n- 恐惧：变成父亲那样的人\n- 说话习惯：短句、爱反问\n')

  const state = await loadState(dir)
  await saveState(dir, {
    ...state,
    lastChapter: 1,
    timeAnchor: '第三日·黄昏',
    characters: { 沈砚: { location: '城西旧宅', condition: '左臂刀伤' } },
    foreshadow: [{ id: 'F001', text: '那封北边来的信', planted: 0, status: 'open', due: 3 }],
    chapters: [{ no: 1, title: '借刀', summary: '沈砚诈出把柄，反被点破。', words: 2500 }],
  })

  const ctx = await buildContext({ dir, project, state: await loadState(dir), chapterNo: 2 })
  assert.match(ctx, /本章细纲/)
  assert.match(ctx, /夜探/)
  assert.match(ctx, /当前状态/)
  assert.match(ctx, /左臂刀伤/)
  assert.match(ctx, /F001/)
  assert.match(ctx, /沈砚诈出把柄/)
  assert.match(ctx, /查清父亲死因/)
  assert.match(ctx, /文风锚点/)
  assert.match(ctx, /写作要求/)
})

test('细纲缺失时上下文明确提示先补纲', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ctx2-'))
  const { dir, project } = await createBook(root, { title: '北境无神' })
  const ctx = await buildContext({ dir, project, state: await loadState(dir), chapterNo: 1 })
  assert.match(ctx, /细纲缺失|还没有细纲/)
})
