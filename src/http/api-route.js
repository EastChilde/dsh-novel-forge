/**
 * /novel/api/*
 *
 * GET  /novel/api/snapshot  只读快照（书架 + 单本详情）
 * POST /novel/api/book      新建一本书的骨架
 *
 * 工作区解析顺序：显式 cwd → 指定 session → 最近会话的 cwd → 最近一次工具调用的工作区。
 * 会话对象来自 `ctx.sessions.list()`，cwd 要经 `ctx.workingDirectory.get(session)` 取。
 */
import { mkdir, readFile, rename, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { buildSnapshot } from '../core/snapshot.js'
import { createBook, loadBook, updateProject, writeTextAtomic } from '../core/project.js'
import { loadState, saveState } from '../core/state.js'
import { deriveAll } from '../core/derive.js'
import { exportMarkdown, exportPlainText } from '../core/export.js'
import { readJson as readJsonFile } from '../core/project.js'

const BODY_LIMIT = 64 * 1024

function send(res, code, body) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > BODY_LIMIT) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

function cwdOfSession(ctx, sessionId) {
  try {
    const session = ctx?.sessions?.get?.(sessionId)
    if (!session) return ''
    try {
      const cwd = ctx?.workingDirectory?.get?.(session)
      if (typeof cwd === 'string' && cwd) return cwd
    } catch {
      /* 会话可能还没挂上工作区 */
    }
    return session?.header?.cwd ?? ''
  } catch {
    return ''
  }
}

function latestSessionCwd(ctx) {
  try {
    const service = ctx?.sessions
    const listed = typeof service?.list === 'function' ? service.list() : undefined
    const items = Array.isArray(listed) ? listed : (listed?.sessions ?? listed?.items ?? [])
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index]
      let cwd
      try {
        cwd = ctx?.workingDirectory?.get?.(item)
      } catch {
        cwd = undefined
      }
      if (typeof cwd !== 'string' || !cwd) cwd = item?.header?.cwd ?? item?.cwd
      if (typeof cwd === 'string' && cwd) return cwd
    }
  } catch {
    /* 会话列表不可用时退回其它来源 */
  }
  return ''
}

export function resolveRequestCwd(ctx, runtime, explicit, sessionId) {
  if (explicit && isAbsolute(explicit)) return explicit
  if (sessionId) {
    const cwd = cwdOfSession(ctx, sessionId)
    if (cwd) return cwd
  }
  const latest = latestSessionCwd(ctx)
  if (latest) return latest
  return runtime?.lastCwd ?? ''
}

const FILE_LIMIT = 2 * 1024 * 1024

/** 目标必须落在根目录内，避免这个接口变成任意文件读取器。 */
export function isInside(root, target) {
  const base = resolve(root)
  const full = resolve(target)
  return full === base || full.startsWith(base + sep)
}

/**
 * 保存的是「03-正文/第NNN章-*.md」时，重算字数并同步 state。
 * 只更新已有记录，不凭空往章节表里加条目。
 */
async function recountChapter(target, text) {
  if (!target.includes(`${sep}03-正文${sep}`)) return {}
  const match = /^第(\d{3,})章/.exec(basename(target))
  if (!match) return {}

  const chapterNo = Number(match[1])
  const bookDir = dirname(dirname(target))
  const project = await readJsonFile(join(bookDir, 'project.json'), null)
  if (!project) return {}

  const words = String(text).replace(/\s/g, '').length
  const state = await loadState(bookDir)
  const record = (state.chapters ?? []).find((item) => item.no === chapterNo)
  if (!record) return { words, chapter: chapterNo, tracked: false }

  record.words = words
  const saved = await saveState(bookDir, state)
  await deriveAll(bookDir, project, saved)
  return { words, chapter: chapterNo, tracked: true }
}

/** slug 只能是单层目录名：不含分隔符，也不含 `..`。 */
function isSafeSlug(value) {
  const backslash = String.fromCharCode(92)
  return typeof value === 'string'
    && value.length > 0
    && !value.includes('..')
    && !value.includes('/')
    && !value.includes(backslash)
}

function booksRootOf(config, cwd) {
  const root = config.booksRoot ?? 'books'
  return isAbsolute(root) ? root : join(cwd, root)
}

export function createApiRoute({ ctx, config, runtime }) {
  return async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://dsh.internal')

      if (url.pathname === '/novel/api/snapshot') {
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })
        const cwd = resolveRequestCwd(ctx, runtime, url.searchParams.get('cwd'), url.searchParams.get('session'))
        if (!cwd) {
          return send(res, 409, {
            error: '还没确定工作区：先让我跑一次小说工具，或在有会话的工作区里打开这个面板。',
            books: [],
          })
        }
        const snapshot = await buildSnapshot(cwd, config.booksRoot ?? 'books')
        return send(res, 200, snapshot)
      }

      if (url.pathname === '/novel/api/file') {
        if (req.method === 'PUT') {
          const body = await readJson(req)
          const cwd = resolveRequestCwd(ctx, runtime, body.cwd, body.session)
          if (!cwd) return send(res, 409, { error: '还没确定工作区。' })

          const target = String(body.path ?? '')
          if (!target || !isAbsolute(target)) return send(res, 400, { error: 'path 必须是绝对路径' })

          const root = booksRootOf(config, cwd)
          if (!isInside(root, target)) return send(res, 403, { error: '只能修改书目录里的文件' })

          const text = String(body.text ?? '')
          if (Buffer.byteLength(text, 'utf8') > FILE_LIMIT) return send(res, 413, { error: '内容超过 2MB，建议用编辑器改' })

          try {
            const info = await stat(target)
            if (!info.isFile()) return send(res, 400, { error: '不是文件' })
            await writeTextAtomic(target, text)
          } catch {
            return send(res, 404, { error: '文件不存在，无法保存' })
          }

          // 手动改正文后，把这一章的字数对齐到 state，避免进度和实际内容脱节。
          const recounted = await recountChapter(target, text)
          return send(res, 200, { ok: true, ...recounted })
        }

        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })
        const cwd = resolveRequestCwd(ctx, runtime, url.searchParams.get('cwd'), url.searchParams.get('session'))
        if (!cwd) return send(res, 409, { error: '还没确定工作区。' })

        const target = url.searchParams.get('path') ?? ''
        if (!target || !isAbsolute(target)) return send(res, 400, { error: 'path 必须是绝对路径' })

        const root = booksRootOf(config, cwd)
        if (!isInside(root, target)) return send(res, 403, { error: '只能读取书目录里的文件' })

        try {
          const info = await stat(target)
          if (!info.isFile()) return send(res, 400, { error: '不是文件' })
          if (info.size > FILE_LIMIT) return send(res, 413, { error: '文件太大，无法在面板里预览' })
          const text = await readFile(target, 'utf8')
          return send(res, 200, { path: target, text })
        } catch {
          return send(res, 404, { error: '文件不存在' })
        }
      }

      if (url.pathname === '/novel/api/export') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
        const body = await readJson(req)
        const cwd = resolveRequestCwd(ctx, runtime, body.cwd, body.session)
        if (!cwd) return send(res, 409, { error: '还没确定工作区。' })
        if (!body.slug) return send(res, 400, { error: 'slug 必填' })

        const root = booksRootOf(config, cwd)
        try {
          const { dir, project } = await loadBook(root, body.slug)
          const state = await loadState(dir)
          const result = body.format === 'txt'
            ? await exportPlainText({ dir, project, state })
            : await exportMarkdown({ dir, project, state, withFrontMatter: true })
          return send(res, 200, { ...result, path: join(dir, result.rel) })
        } catch (error) {
          return send(res, 500, { error: String((error && error.message) || error) })
        }
      }

      if (url.pathname === '/novel/api/rename') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
        const body = await readJson(req)
        const cwd = resolveRequestCwd(ctx, runtime, body.cwd, body.session)
        if (!cwd) return send(res, 409, { error: '还没确定工作区。' })
        const title = String(body.title ?? '').trim()
        if (!body.slug) return send(res, 400, { error: 'slug 必填' })
        if (!title) return send(res, 400, { error: '书名不能为空' })

        try {
          const { dir } = await loadBook(booksRootOf(config, cwd), body.slug)
          const project = await updateProject(dir, { title })
          return send(res, 200, { ok: true, title: project.title })
        } catch (error) {
          return send(res, 404, { error: String((error && error.message) || error) })
        }
      }

      if (url.pathname === '/novel/api/delete') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
        const body = await readJson(req)
        const cwd = resolveRequestCwd(ctx, runtime, body.cwd, body.session)
        if (!cwd) return send(res, 409, { error: '还没确定工作区。' })
        const slug = String(body.slug ?? '')
        if (!isSafeSlug(slug)) {
          return send(res, 400, { error: 'slug 不合法' })
        }

        const root = booksRootOf(config, cwd)
        const dir = join(root, slug)
        if (!isInside(root, dir)) return send(res, 403, { error: '只能删除书目录里的书' })

        try {
          await stat(dir)
        } catch {
          return send(res, 404, { error: '书不存在' })
        }

        // 不直接删：移进 books/.trash，随时可以捞回来。
        const trash = join(root, '.trash')
        await mkdir(trash, { recursive: true })
        const target = join(trash, `${slug}-${Date.now()}`)
        try {
          await rename(dir, target)
        } catch (error) {
          return send(res, 500, { error: String((error && error.message) || error) })
        }
        return send(res, 200, { ok: true, trashed: target })
      }

      if (url.pathname === '/novel/api/book') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
        const body = await readJson(req)
        const title = String(body.title ?? '').trim()
        if (!title) return send(res, 400, { error: '书名必填' })

        const cwd = resolveRequestCwd(ctx, runtime, body.cwd, body.session)
        if (!cwd) return send(res, 409, { error: '还没确定工作区，无法建书。' })

        const root = booksRootOf(config, cwd)
        await mkdir(root, { recursive: true })

        try {
          const { slug, dir, project } = await createBook(root, {
            title,
            premise: body.premise,
            genre: body.genre,
            platform: body.platform,
            mode: body.mode,
            slug: body.slug,
            targetWords: body.targetWords,
            totalChapters: body.totalChapters,
          })
          const state = await loadState(dir)
          await deriveAll(dir, project, state)
          if (runtime) runtime.lastCwd = root
          return send(res, 200, { slug, title: project.title })
        } catch (error) {
          const message = String(error?.message ?? error)
          return send(res, message.includes('已存在') ? 409 : 500, { error: message })
        }
      }

      return send(res, 404, { error: 'not found' })
    } catch (error) {
      return send(res, 500, { error: String(error?.message ?? error) })
    }
  }
}
