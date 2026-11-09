/**
 * 一本书的建立、读取与原子写入。
 *
 * 设计约束（来自需求文档 3.5）：
 * - 状态只有一个权威文件（04-追踪/state.json），其余是派生视图；
 * - 所有元信息可读、可 git、可手改；
 * - 写入必须原子，避免中途失败留下半个文件。
 */
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { DIRS, FILES, bookDir } from './paths.js'

/** 把标题变成可用的目录名；中文保留，空格与非法字符折叠。 */
export function slugify(title) {
  return String(title ?? '')
    .replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'untitled'
}

/** 是否为已存在的书目录（有 project.json）。 */
export async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** 原子写文本：先写同目录临时文件，再 rename 覆盖。 */
export async function writeTextAtomic(file, text) {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, text, 'utf8')
  try {
    await rename(tmp, file)
  } catch (error) {
    await unlink(tmp).catch(() => {})
    throw error
  }
}

/** 原子写 JSON，两空格缩进，保证 diff 可读。 */
export async function writeJsonAtomic(file, value) {
  await writeTextAtomic(file, `${JSON.stringify(value, null, 2)}\n`)
}

/** 读 JSON；不存在或损坏时返回 fallback，并保留损坏文件供排查。 */
export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

export async function readText(file, fallback = '') {
  try {
    return await readFile(file, 'utf8')
  } catch {
    return fallback
  }
}

/** 新建一本书的骨架：目录、project.json、创意页、空状态、设定占位。 */
export async function createBook(root, input) {
  const slug = input.slug ? slugify(input.slug) : slugify(input.title)
  const dir = bookDir(root, slug)
  if (await exists(join(dir, FILES.project))) {
    throw new Error(`书「${slug}」已存在：${dir}。换一个 slug，或直接用现有书继续。`)
  }

  for (const name of Object.values(DIRS)) {
    await mkdir(join(dir, name), { recursive: true })
  }

  const project = {
    version: 1,
    slug,
    title: input.title,
    genre: input.genre ?? '',
    platform: input.platform ?? '',
    mode: input.mode ?? '网文',
    pov: input.pov ?? '第三人称贴身限知',
    targetWords: Number(input.targetWords) || 2500,
    totalChapters: Number(input.totalChapters) || 100,
    premise: input.premise ?? '',
    status: 'idea',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await writeJsonAtomic(join(dir, FILES.project), project)
  await writeTextAtomic(join(dir, FILES.idea), ideaPage(project))
  await writeJsonAtomic(join(dir, FILES.state), initialState())
  await writeTextAtomic(join(dir, FILES.style), styleTemplate(project))
  await writeTextAtomic(join(dir, FILES.world), worldTemplate(project))
  await writeTextAtomic(join(dir, FILES.rules), rulesTemplate(project))
  await mkdir(join(dir, DIRS.cache), { recursive: true })

  return { slug, dir, project }
}

export function ideaPage(project) {
  return `# ${project.title}

- 题材：${project.genre || '待定'}
- 平台：${project.platform || '待定'}
- 模式：${project.mode}
- 视角：${project.pov}
- 单章目标：${project.targetWords} 字
- 计划章数：${project.totalChapters}

## 想法原文

${project.premise || '（待补充）'}

## 定位

- 一句话故事：
- 主角欲望：
- 主角恐惧：
- 核心冲突：
- 三个卖点：
  1.
  2.
  3.
- 结局走向：
- 参考对标：

## 风险

- 
`
}

function styleTemplate(project) {
  return `# 文风锚点 · ${project.title}

> 用途：每次写正文前注入。这里的话优先于任何通用建议。

## 三句定调

1. （写一句最能代表本书语感的句子）
2. 
3. 

## 叙述规则

- 视角：${project.pov}
- 句长偏好：短句为主，长句最多连续两句
- 心理描写：只写主角当下能感知到的
- 禁止：总结式旁白、每段都解释、成语堆砌

## 禁忌词表

仿佛、宛如、不禁、顿时、一丝、不易察觉、意味深长
`
}

function worldTemplate(project) {
  return `# 世界观 · ${project.title}

## 一句话

## 三条硬规则

1. 
2. 
3. 

## 势力

- 

## 地点

- 
`
}

function rulesTemplate(project) {
  return `# 规则与力量体系 · ${project.title}

## 金手指 / 核心机制

- 能力：
- 限制：
- 代价：
- 首次登场章：
- 升级节点：

## 禁止事项

- 不解释原理，只展示效果
- 每次升级都要付出代价
`
}

/** 状态文件初始值。所有字段都在这里一次写清，避免读到 undefined。 */
export function initialState() {
  return {
    version: 1,
    lastChapter: 0,
    timeAnchor: '',
    chapters: [],
    characters: {},
    abilities: {},
    items: [],
    foreshadow: [],
    openQuestions: [],
    nextEntry: {},
    updatedAt: new Date().toISOString(),
  }
}

/** 列出根目录下的所有书（有 project.json 的目录）。 */
export async function listBooks(root) {
  let names = []
  try {
    names = await readdir(root)
  } catch {
    return []
  }
  const books = []
  for (const name of names) {
    const project = await readJson(join(root, name, FILES.project), null)
    if (project) books.push(project)
  }
  return books.sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
}

/** 载入一本书；不存在时抛出可读错误。 */
export async function loadBook(root, slug) {
  const dir = bookDir(root, slug)
  const project = await readJson(join(dir, FILES.project), null)
  if (!project) throw new Error(`找不到书「${slug}」（${dir}）。先运行 novel_init 建书，或检查 booksRoot。`)
  return { dir, project }
}

/**
 * 解析 booksRoot。
 *
 * 顺序：显式绝对路径 > 显式 workspaceRoot > 会话工作区 > 进程 cwd。
 * 会话工作区通过 `ctx.workingDirectory.ensure(exec.agent)` 取——
 * 这是工具执行时唯一可靠的当前目录来源，不要用 process.cwd() 猜。
 */
export async function resolveBooksRoot(config = {}, ctx, exec) {
  const booksRoot = String(config.booksRoot ?? 'books')
  if (isAbsolute(booksRoot)) return booksRoot

  const explicit = String(config.workspaceRoot ?? '').trim()
  if (explicit) return join(explicit, booksRoot)

  let base
  const service = ctx?.workingDirectory
  if (service && typeof service.ensure === 'function' && exec?.agent !== undefined) {
    try {
      base = await service.ensure(exec.agent, exec.signal)
    } catch {
      base = undefined
    }
  }
  return join(base ?? process.cwd(), booksRoot)
}

/** 更新 project.json 的 updatedAt 与任意字段。 */
export async function updateProject(dir, patch) {
  const file = join(dir, FILES.project)
  const project = await readJson(file, null)
  if (!project) throw new Error(`project.json 缺失：${file}`)
  const next = { ...project, ...patch, updatedAt: new Date().toISOString() }
  await writeJsonAtomic(file, next)
  return next
}
