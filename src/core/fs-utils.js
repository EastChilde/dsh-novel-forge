/**
 * 文件层的小工具：按章号找正文、伏笔编号、旧版存档。
 * 放在 core 里，保证提交逻辑可以脱离宿主单测。
 */
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { DIRS, pad3 } from './paths.js'

/** 按章号找正文文件（标题可能被改过，所以按「第NNN章」前缀匹配）。 */
export async function findProse(dir, chapterNo) {
  let names = []
  try {
    names = await readdir(join(dir, DIRS.prose))
  } catch {
    return null
  }
  const prefix = `第${pad3(chapterNo)}章`
  const hit = names.find((n) => n.startsWith(prefix) && n.endsWith('.md'))
  return hit ? join(dir, DIRS.prose, hit) : null
}

/** 下一个伏笔编号，形如 F013。 */
export function nextForeshadowId(existing) {
  let max = 0
  for (const item of existing ?? []) {
    const m = /^F(\d+)$/.exec(String(item.id ?? ''))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `F${String(max + 1).padStart(3, '0')}`
}

/** 覆盖前把旧版复制到 .novel/archive/，返回存档路径。 */
export async function archiveChapter(dir, file, chapterNo) {
  if (!file) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = join(dir, DIRS.cache, 'archive')
  await mkdir(dest, { recursive: true })
  const target = join(dest, `第${pad3(chapterNo)}章-${stamp}.md`)
  await copyFile(file, target)
  return target
}
