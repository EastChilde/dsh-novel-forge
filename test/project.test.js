import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBook, listBooks, loadBook, resolveBooksRoot, slugify } from '../src/core/project.js'
import { FILES } from '../src/core/paths.js'

async function tempRoot() {
  return mkdtemp(join(tmpdir(), 'novel-'))
}

test('slugify 保留中文，折叠非法字符', () => {
  assert.equal(slugify('北境 无神'), '北境-无神')
  assert.equal(slugify('a/b:c'), 'a-b-c')
  assert.equal(slugify('   '), 'untitled')
})

test('createBook 生成完整目录与初始状态', async () => {
  const root = await tempRoot()
  const { dir, project } = await createBook(root, { title: '北境无神', premise: '边陲小吏查父仇' })

  assert.equal(project.slug, '北境无神')
  assert.equal(project.targetWords, 2500)
  assert.equal(project.status, 'idea')

  for (const rel of ['01-设定', '02-大纲', '03-正文', '04-追踪', '05-导出']) {
    assert.ok((await stat(join(dir, rel))).isDirectory(), `${rel} 应存在`)
  }

  const state = JSON.parse(await readFile(join(dir, FILES.state), 'utf8'))
  assert.equal(state.lastChapter, 0)
  assert.deepEqual(state.chapters, [])

  const idea = await readFile(join(dir, FILES.idea), 'utf8')
  assert.match(idea, /边陲小吏查父仇/)

  const books = await listBooks(root)
  assert.equal(books.length, 1)
})

test('重复建书会报错', async () => {
  const root = await tempRoot()
  await createBook(root, { title: '同名书' })
  await assert.rejects(() => createBook(root, { title: '同名书' }), /已存在/)
})

test('loadBook 找不到时给出可读错误', async () => {
  const root = await tempRoot()
  await assert.rejects(() => loadBook(root, '不存在'), /找不到书/)
})

test('resolveBooksRoot 优先使用显式 workspaceRoot / 绝对路径', async () => {
  assert.equal(await resolveBooksRoot({ workspaceRoot: '/tmp/ws', booksRoot: 'books' }, undefined, {}), '/tmp/ws/books')
  assert.equal(await resolveBooksRoot({ booksRoot: '/abs/books' }, undefined, {}), '/abs/books')
})

test('resolveBooksRoot 在没有 ctx 时退回进程目录', async () => {
  const root = await resolveBooksRoot({ booksRoot: 'books' }, undefined, undefined)
  assert.equal(root, join(process.cwd(), 'books'))
})
