import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBook, writeTextAtomic } from '../src/core/project.js'
import { loadState, saveState } from '../src/core/state.js'
import { saveOutline } from '../src/core/outline.js'
import { exportMarkdown } from '../src/core/export.js'
import { buildResume } from '../src/core/resume.js'

const OUTLINE = `# 第002章 夜路

- 视角：沈砚
- 目标字数：2500
- 时间锚：第四日·夜
- 地点：北门
- 出场：沈砚、阿七
- 章末钩子：悬念-马蹄印朝北
- 伏笔埋设：
- 伏笔回收：

## 场景 1
- 目标：看清褚九往哪走
- 冲突：北门夜里不开
- 转折：门房说拿着镇北司的牌票
`

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'export-'))
  const { dir, project } = await createBook(root, { title: '北境无神', targetWords: 2500 })
  await writeTextAtomic(join(dir, '03-正文', '第001章-半句话.md'), '# 第1章 半句话\n\n雨下了三天。\n')
  await writeTextAtomic(join(dir, '03-正文', '第002章-夜路.md'), '# 第2章 夜路\n\n北门开着。\n')
  const state = await loadState(dir)
  await saveState(dir, {
    ...state,
    lastChapter: 2,
    timeAnchor: '第四日·夜',
    characters: { 沈砚: { location: '北门', goal: '查签押簿' } },
    openQuestions: ['褚九去见谁'],
    foreshadow: [{ id: 'F001', text: '铜钱刻字', planted: 1, status: 'open', due: 8 }],
    chapters: [
      { no: 1, title: '半句话', words: 2273, summary: '义庄验尸。' },
      { no: 2, title: '夜路', words: 2454, summary: '褚九连夜出城。' },
    ],
    nextEntry: { chapter: 3, must: ['裴无咎到县'], forbid: ['揭晓父亲死因'] },
  })
  await saveOutline(dir, 3, OUTLINE.replace('002', '003').replace('第002章', '第003章'))
  return { dir, project }
}

test('导出按章号排序、剥掉原 H1、生成合集', async () => {
  const { dir, project } = await setup()
  const result = await exportMarkdown({ dir, project, state: await loadState(dir) })

  assert.equal(result.chapters, 2)
  assert.equal(result.words, 4727)
  assert.deepEqual(result.missing, [])

  const text = await readFile(join(dir, result.rel), 'utf8')
  assert.match(text, /^# 北境无神/m)
  assert.match(text, /## 第1章 半句话/)
  assert.match(text, /## 第2章 夜路/)
  assert.ok(text.indexOf('## 第1章') < text.indexOf('## 第2章'))
  assert.equal((text.match(/^# 第1章 半句话$/gm) ?? []).length, 0, '原 H1 应被剥掉')
})

test('缺正文的章节被跳过并列出', async () => {
  const { dir, project } = await setup()
  const state = await loadState(dir)
  await saveState(dir, {
    ...state,
    chapters: [...state.chapters, { no: 3, title: '镇北司', words: 100, summary: '' }],
  })
  const result = await exportMarkdown({ dir, project, state: await loadState(dir) })
  assert.deepEqual(result.missing, [3])
  assert.equal(result.chapters, 2)
})

test('恢复卡包含上一章结尾、人物状态、下一章要害与伏笔', async () => {
  const { dir, project } = await setup()
  const text = await buildResume({ dir, project, state: await loadState(dir) })
  assert.match(text, /北门开着/)
  assert.match(text, /沈砚：北门/)
  assert.match(text, /第 3 章/)
  assert.match(text, /必须发生：裴无咎到县/)
  assert.match(text, /禁止发生：揭晓父亲死因/)
  assert.match(text, /F001/)
  assert.match(text, /不要重新规划/)
})
