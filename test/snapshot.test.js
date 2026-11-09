import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBook, writeTextAtomic } from '../src/core/project.js'
import { loadState, saveState } from '../src/core/state.js'
import { buildSnapshot } from '../src/core/snapshot.js'

test('快照列出书、章节、细纲、人物与伏笔', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'snap-'))
  const { dir } = await createBook(join(cwd, 'books'), { title: '北境无神', genre: '志怪' })
  await writeTextAtomic(join(dir, '03-正文', '第001章-半句话.md'), '# 第1章 半句话\n\n雨。\n')
  await writeTextAtomic(join(dir, '01-设定', '人物-沈砚.md'), '# 沈砚\n')
  await writeTextAtomic(join(dir, '01-设定', '世界观.md'), '# 世界观\n')
  await writeTextAtomic(join(dir, '02-大纲', '细纲-001.md'), '# 第001章 半句话\n')

  const state = await loadState(dir)
  await saveState(dir, {
    ...state,
    lastChapter: 1,
    timeAnchor: '第三日·夜',
    chapters: [{ no: 1, title: '半句话', words: 2273, summary: '义庄验尸', file: '03-正文/第001章-半句话.md' }],
    foreshadow: [{ id: 'F001', text: '铜钱刻字', planted: 1, status: 'open' }],
    nextEntry: { chapter: 2 },
  })

  const snapshot = await buildSnapshot(cwd, 'books')
  assert.equal(snapshot.books.length, 1)
  const book = snapshot.books[0]
  assert.equal(book.title, '北境无神')
  assert.equal(book.lastChapter, 1)
  assert.equal(book.words, 2273)
  assert.equal(book.chapters[0].title, '半句话')
  assert.ok(book.chapters[0].path.endsWith('第001章-半句话.md'))
  assert.deepEqual(book.characters.map((c) => c.name), ['沈砚'])
  assert.ok(book.bible.some((b) => b.name === '世界观.md'), '设定文件应出现在快照里')
  assert.equal(book.outlines.length, 1)
  assert.equal(book.foreshadow[0].id, 'F001')
})

test('没有 books 目录时返回空列表而不是报错', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'snap2-'))
  const snapshot = await buildSnapshot(cwd, 'books')
  assert.deepEqual(snapshot.books, [])
})

test('cwd 必须是绝对路径', async () => {
  await assert.rejects(() => buildSnapshot('relative/path', 'books'), /绝对路径/)
})

import { resolveRequestCwd } from '../src/http/api-route.js'

test('工作区解析：显式 > 会话 > 最近工具调用', () => {
  const ctx = {
    sessions: { get: () => ({ header: { cwd: '/srv/book' } }) },
    workingDirectory: { get: () => '/srv/book' },
  }
  assert.equal(resolveRequestCwd(ctx, { lastCwd: '/runtime' }, '/explicit', 'sid'), '/explicit')
  assert.equal(resolveRequestCwd(ctx, { lastCwd: '/runtime' }, '', 'sid'), '/srv/book')
  assert.equal(resolveRequestCwd({}, { lastCwd: '/runtime' }, '', ''), '/runtime')
  assert.equal(resolveRequestCwd({}, { lastCwd: '' }, '', ''), '')
})

test('工作区解析：会话列表兜底（list() 返回会话对象）', () => {
  const ctx = {
    sessions: { list: () => [{ header: { cwd: '/from-list' } }] },
    workingDirectory: { get: () => undefined },
  }
  assert.equal(resolveRequestCwd(ctx, { lastCwd: '/runtime' }, '', ''), '/from-list')
})

test('工作区解析：优先用 workingDirectory.get(session)', () => {
  const ctx = {
    sessions: { list: () => [{ header: {} }, { header: {} }] },
    workingDirectory: { get: () => '/wd-of-session' },
  }
  assert.equal(resolveRequestCwd(ctx, { lastCwd: '' }, '', ''), '/wd-of-session')
})

test('多本书：快照返回全部书，互不干扰', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'multi-'))
  const a = await createBook(join(cwd, 'books'), { title: '北境无神', genre: '志怪' })
  const b = await createBook(join(cwd, 'books'), { title: '南渡', genre: '武侠' })
  const sa = await loadState(a.dir)
  await saveState(a.dir, { ...sa, lastChapter: 3, chapters: [{ no: 1, title: '甲', words: 100, summary: '' }] })

  const snapshot = await buildSnapshot(cwd, 'books')
  assert.equal(snapshot.books.length, 2)
  const north = snapshot.books.find((x) => x.title === '北境无神')
  const south = snapshot.books.find((x) => x.title === '南渡')
  assert.equal(north.lastChapter, 3)
  assert.equal(north.words, 100)
  assert.equal(south.lastChapter, 0)
  assert.equal(south.words, 0)
  assert.notEqual(north.slug, south.slug)
})

import { isInside } from '../src/http/api-route.js'

test('文件读取被限制在书目录内', () => {
  assert.equal(isInside('/a/books', '/a/books/x/y.md'), true)
  assert.equal(isInside('/a/books', '/a/books'), true)
  assert.equal(isInside('/a/books', '/a/books-evil/x.md'), false)
  assert.equal(isInside('/a/books', '/etc/passwd'), false)
  assert.equal(isInside('/a/books', '/a/books/../secret'), false)
})
