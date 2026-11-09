/**
 * 项目内的固定路径约定。所有落盘位置只在这里定义一次，
 * 其他模块一律通过本文件取路径，避免各写一套。
 */
import { join } from 'node:path'

/** 一本书的顶层目录名。数字前缀保证在文件管理器里的阅读顺序。 */
export const DIRS = {
  bible: '01-设定',
  outline: '02-大纲',
  prose: '03-正文',
  tracking: '04-追踪',
  export: '05-导出',
  cache: '.novel',
}

/** 关键文件相对书目录的路径。 */
export const FILES = {
  project: 'project.json',
  idea: '00-创意.md',
  state: '04-追踪/state.json',
  progress: '04-追踪/进度.md',
  foreshadow: '04-追踪/伏笔表.md',
  timeline: '04-追踪/时间线.md',
  characters: '04-追踪/人物快照.md',
  summaries: '04-追踪/章节摘要.md',
  style: '01-设定/文风锚点.md',
  world: '01-设定/世界观.md',
  rules: '01-设定/规则与力量体系.md',
  relations: '01-设定/关系网.md',
}

/** 章号统一三位，保证字典序 = 时间序。 */
export function pad3(n) {
  return String(n).padStart(3, '0')
}

/** 去掉文件系统不接受的字符，并截断到可读长度。 */
export function safeName(s) {
  const cleaned = String(s ?? '')
    .replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, 40) || '未命名'
}

export function bookDir(root, slug) {
  return join(root, slug)
}

/** 正文文件：03-正文/第007章-借刀.md */
export function chapterRel(n, title) {
  return join(DIRS.prose, `第${pad3(n)}章-${safeName(title)}.md`)
}

/** 细纲文件：02-大纲/细纲-007.md */
export function outlineRel(n) {
  return join(DIRS.outline, `细纲-${pad3(n)}.md`)
}

/** 人物卡：01-设定/人物-沈砚.md */
export function characterRel(name) {
  return join(DIRS.bible, `人物-${safeName(name)}.md`)
}
