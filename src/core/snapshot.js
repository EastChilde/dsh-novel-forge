/**
 * 给侧边栏用的只读快照。
 *
 * 只读已知文件（project/state/目录清单），不读任意路径内容，
 * 避免路由被当成任意文件读取器。
 */
import { readdir, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { DIRS, FILES } from './paths.js'
import { readJson } from './project.js'
import { loadState } from './state.js'
import { buildGraph } from './graph.js'

async function listMarkdown(dir) {
  try {
    const names = await readdir(dir)
    return names.filter((n) => n.endsWith('.md')).sort()
  } catch {
    return []
  }
}

/**
 * @param {string} cwd 会话工作区绝对路径
 * @param {string} booksRoot 相对 cwd 的书目录，或绝对路径
 */
export async function buildSnapshot(cwd, booksRoot = 'books') {
  if (!isAbsolute(cwd)) throw new Error('cwd 必须是绝对路径')
  const root = isAbsolute(booksRoot) ? booksRoot : resolve(cwd, booksRoot)
  // 越界检查：书根必须落在工作区内（绝对配置除外，那是显式选择）。
  if (!isAbsolute(booksRoot) && !root.startsWith(resolve(cwd))) {
    throw new Error('booksRoot 越出工作区')
  }

  let names = []
  try {
    names = await readdir(root)
  } catch {
    return { cwd, booksRoot: root, books: [] }
  }

  const books = []
  for (const slug of names.sort()) {
    const dir = join(root, slug)
    const project = await readJson(join(dir, FILES.project), null)
    if (!project) continue

    const state = await loadState(dir)
    const chapters = (state.chapters ?? [])
      .filter((c) => c.no > 0)
      .sort((a, b) => a.no - b.no)
      .map((c) => ({
        no: c.no,
        title: c.title ?? '',
        words: c.words ?? 0,
        summary: c.summary ?? '',
        path: c.file ? join(dir, c.file) : null,
      }))

    const outlineNames = await listMarkdown(join(dir, DIRS.outline))
    const bibleNames = await listMarkdown(join(dir, DIRS.bible))
    const characterNames = bibleNames
      .filter((name) => name.startsWith('人物-'))
      .map((name) => name.replace(/^人物-/, '').replace(/\.md$/, ''))
    const graph = await buildGraph(dir, characterNames)
    const info = await stat(dir).catch(() => null)
    const updatedAt = Math.max(info ? info.mtimeMs : 0, Date.parse(project.updatedAt ?? '') || 0)

    books.push({
      slug,
      dir,
      title: project.title,
      genre: project.genre ?? '',
      platform: project.platform ?? '',
      mode: project.mode ?? '',
      pov: project.pov ?? '',
      targetWords: project.targetWords ?? 2500,
      totalChapters: project.totalChapters ?? 0,
      status: project.status ?? '',
      lastChapter: state.lastChapter ?? 0,
      words: chapters.reduce((sum, c) => sum + c.words, 0),
      timeAnchor: state.timeAnchor ?? '',
      chapters,
      outlines: outlineNames.map((name) => ({ name, path: join(dir, DIRS.outline, name) })),
      bible: bibleNames.map((name) => ({ name, path: join(dir, DIRS.bible, name) })),
      characters: bibleNames
        .filter((name) => name.startsWith('人物-'))
        .map((name) => ({
          name: name.replace(/^人物-/, '').replace(/\.md$/, ''),
          path: join(dir, DIRS.bible, name),
        })),
      foreshadow: (state.foreshadow ?? []).map((f) => ({
        id: f.id,
        text: f.text ?? '',
        planted: f.planted ?? null,
        due: f.due ?? null,
        status: f.status ?? 'open',
      })),
      graph,
      updatedAt,
      nextEntry: state.nextEntry ?? {},
      openQuestions: state.openQuestions ?? [],
    })
  }

  books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  return { cwd, booksRoot: root, books }
}
