import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBook } from '../src/core/project.js'
import { loadState, saveState } from '../src/core/state.js'
import { saveOutline } from '../src/core/outline.js'
import { commitChapter } from '../src/core/commit.js'
import { FILES } from '../src/core/paths.js'

const OUTLINE = `# 第001章 借刀

- 视角：沈砚
- 目标字数：2500
- 时间锚：第三日·黄昏
- 地点：城西旧宅
- 出场：沈砚、老周
- 章末钩子：悬念-门外传来脚步声
- 伏笔埋设：铜钱背面刻字
- 伏笔回收：F001

## 场景 1
- 目标：拿到把柄
- 冲突：被人反将一军
- 转折：把柄是假的
`

const BASE = '沈砚推开门，风灌进来，他抬手挡了一下眼睛。屋里有人咳嗽。「谁？」他问。那人没答，只把桌上的灯往旁边挪了挪，火苗歪了一下又立起来。'

function body(target = 2400) {
  let text = BASE
  while (text.length < target) text += BASE
  return `${text}\n\n门外忽然传来脚步声。`
}

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'commit-'))
  const { dir, project } = await createBook(root, { title: '北境无神', targetWords: 2500 })
  await saveOutline(dir, 1, OUTLINE)
  const state = await loadState(dir)
  await saveState(dir, {
    ...state,
    foreshadow: [{ id: 'F001', text: '那封北边来的信', planted: 0, status: 'open', due: 5 }],
  })
  return { dir, project }
}

test('提交一章：落盘、更新状态、重建派生、跑检查', async () => {
  const { dir, project } = await setup()
  const result = await commitChapter({
    dir, project, chapterNo: 1, content: body(), summary: '沈砚诈出把柄，反被点破。', updates: JSON.stringify({
      timeAnchor: '第三日·黄昏',
      characters: { 沈砚: { location: '城西旧宅', condition: '左臂刀伤' } },
      nextEntry: { chapter: 2, scene: '夜探县衙', must: ['发现第二封信'], forbid: ['揭晓内鬼'] },
    }),
  })

  assert.equal(result.title, '借刀')
  assert.ok(result.words >= 2125 && result.words <= 2875, `字数 ${result.words} 应在区间内`)
  assert.deepEqual(result.blocking, [])
  assert.ok(result.closed.includes('F001'), '细纲里要求回收的伏笔应关闭')
  assert.equal(result.added.length, 1, '细纲里新埋的伏笔应自动编号')

  const prose = await readFile(join(dir, result.rel), 'utf8')
  assert.match(prose, /门外忽然传来脚步声/)

  const state = await loadState(dir)
  assert.equal(state.lastChapter, 1)
  assert.equal(state.timeAnchor, '第三日·黄昏')
  assert.equal(state.characters['沈砚'].location, '城西旧宅')
  assert.equal(state.nextEntry.chapter, 2)
  assert.equal(state.foreshadow.find((f) => f.id === 'F001').status, 'closed')
  assert.equal(state.foreshadow.find((f) => f.id === result.added[0]).status, 'open')

  const progress = await readFile(join(dir, FILES.progress), 'utf8')
  assert.match(progress, /已完成：1 章/)
  const foreshadowDoc = await readFile(join(dir, FILES.foreshadow), 'utf8')
  assert.match(foreshadowDoc, /已回收/)
})

test('重复提交同一章会覆盖并留档', async () => {
  const { dir, project } = await setup()
  await commitChapter({ dir, project, chapterNo: 1, content: body(), summary: '第一版' })
  const second = await commitChapter({ dir, project, chapterNo: 1, content: body(), summary: '第二版' })
  assert.ok(second.archived, '旧版应存档')
  const state = await loadState(dir)
  assert.equal(state.chapters.length, 1, '同一章不应出现两条记录')
  assert.equal(state.chapters[0].summary, '第二版')
})

test('跳章提交会标记出来', async () => {
  const { dir, project } = await setup()
  await commitChapter({ dir, project, chapterNo: 1, content: body(), summary: '第一章' })
  const result = await commitChapter({ dir, project, chapterNo: 3, content: body(), summary: '第三章' })
  assert.equal(result.jumped, true)
  assert.equal(result.previousChapter, 1)
})

test('字数不足会给出必须修', async () => {
  const { dir, project } = await setup()
  const result = await commitChapter({ dir, project, chapterNo: 1, content: '# 第1章 借刀\n\n太短。', summary: '短' })
  assert.ok(result.blocking.some((b) => b.code === 'words-low'))
})

test('非法 updates 不会中断提交，只记一条提示', async () => {
  const { dir, project } = await setup()
  const result = await commitChapter({
    dir, project, chapterNo: 1, content: body(), summary: '带坏补丁', updates: '{不是 JSON',
  })
  assert.ok(result.patchError)
  const state = await loadState(dir)
  assert.equal(state.lastChapter, 1)
})
