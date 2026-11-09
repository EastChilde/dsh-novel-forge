/**
 * 导出：把所有已提交章节按顺序拼成一份可直接投稿的 Markdown 合集。
 * 只做合并与标题规范化，不改正文一个字。
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DIRS } from './paths.js'
import { writeTextAtomic } from './project.js'
import { findProse } from './fs-utils.js'

/**
 * @param {object} input
 * @param {string} input.dir 书目录
 * @param {object} input.project
 * @param {object} input.state
 * @param {boolean} [input.withFrontMatter] 是否附上简介与设定摘要
 */
export async function exportMarkdown({ dir, project, state, withFrontMatter = true }) {
  const chapters = (state.chapters ?? []).filter((c) => c.no > 0).sort((a, b) => a.no - b.no)
  const parts = [`# ${project.title}`, '']
  const missing = []
  let words = 0

  if (withFrontMatter) {
    const meta = [
      `- 题材：${project.genre || '未定'}`,
      `- 平台：${project.platform || '未定'}`,
      `- 视角：${project.pov}`,
      `- 单章目标：${project.targetWords} 字`,
    ]
    parts.push(...meta, '')
  }

  for (const chapter of chapters) {
    const file = await findProse(dir, chapter.no)
    if (!file) {
      missing.push(chapter.no)
      continue
    }
    const raw = await readFile(file, 'utf8')
    // 正文文件首行是「# 第N章 标题」，合集里统一成二级标题，避免和书名撞级。
    const body = raw.replace(/^#\s+[^\n]*\n+/, '').trim()
    parts.push(`## 第${chapter.no}章 ${chapter.title}`, '', body, '')
    words += chapter.words ?? 0
  }

  const rel = join(DIRS.export, `${project.title}-合集.md`)
  await writeTextAtomic(join(dir, rel), parts.join('\n'))

  return { rel, chapters: chapters.length - missing.length, words, missing }
}

/**
 * 纯文本导出：平台投稿常用，去掉 Markdown 标记，一章一段。
 */
export async function exportPlainText({ dir, project, state }) {
  const chapters = (state.chapters ?? []).filter((c) => c.no > 0).sort((a, b) => a.no - b.no)
  const parts = []
  const missing = []
  let words = 0

  for (const chapter of chapters) {
    const file = await findProse(dir, chapter.no)
    if (!file) {
      missing.push(chapter.no)
      continue
    }
    const raw = await readFile(file, 'utf8')
    const body = raw
      .replace(/^#\s+[^\n]*\n+/, '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*/g, '')
      .trim()
    parts.push(`第${chapter.no}章 ${chapter.title}`, '', body, '')
    words += chapter.words ?? 0
  }

  const rel = join(DIRS.export, `${project.title}-合集.txt`)
  await writeTextAtomic(join(dir, rel), parts.join('\n'))
  return { rel, chapters: chapters.length - missing.length, words, missing }
}
