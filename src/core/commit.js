/**
 * 提交一章：写正文 → 更新权威状态 → 重建派生视图 → 跑检查。
 *
 * 全部逻辑放在 core，工具层只负责取参和排版，这样提交协议可以单测。
 */
import { join } from 'node:path'
import { chapterRel } from './paths.js'
import { writeTextAtomic } from './project.js'
import {
  loadState, saveState, recordChapter, closeForeshadow, applyStatePatch, mergeForeshadow,
} from './state.js'
import { loadOutline } from './outline.js'
import { runChecks, analyze } from './checks.js'
import { deriveAll } from './derive.js'
import { findProse, archiveChapter, nextForeshadowId } from './fs-utils.js'

function parseUpdates(raw) {
  if (!raw || !String(raw).trim()) return { patch: null, error: null }
  try {
    return { patch: JSON.parse(String(raw)), error: null }
  } catch (error) {
    return { patch: null, error: `updates 不是合法 JSON（${error.message}），本次已忽略状态补丁` }
  }
}

function titleFrom(content, outline) {
  if (outline?.data?.title) return outline.data.title
  const first = String(content).split('\n')[0] ?? ''
  return first.replace(/^#+\s*/, '').replace(/^第\s*\d+\s*章\s*/, '').trim() || '未命名'
}

/**
 * @param {object} input
 * @param {string} input.dir 书目录
 * @param {object} input.project
 * @param {number} input.chapterNo
 * @param {string} input.content 正文
 * @param {string} input.summary 摘要
 * @param {string} [input.updates] 状态补丁 JSON 字符串
 * @param {object} [input.options] 检查参数
 */
export async function commitChapter({ dir, project, chapterNo, content, summary, updates, options = {} }) {
  if (!String(content ?? '').trim()) throw new Error('content 为空，不能提交')

  const outline = await loadOutline(dir, chapterNo)
  const title = titleFrom(content, outline)
  const { patch, error: patchError } = parseUpdates(updates)

  let state = await loadState(dir)
  const beforeOpen = (state.foreshadow ?? []).filter((f) => f.status !== 'closed').map((f) => f.id)
  const beforeLast = state.lastChapter ?? 0

  const existing = await findProse(dir, chapterNo)
  const archived = await archiveChapter(dir, existing, chapterNo)

  const rel = chapterRel(chapterNo, title)
  const text = String(content).endsWith('\n') ? String(content) : `${String(content)}\n`
  await writeTextAtomic(join(dir, rel), text)

  const stats = analyze(text)
  state = recordChapter(state, {
    no: chapterNo,
    title,
    words: stats.chars,
    summary: String(summary ?? '').trim(),
    hook: outline?.data?.hook ?? '',
    timeAnchor: outline?.data?.timeAnchor ?? '',
    location: outline?.data?.location ?? '',
    file: rel,
    committedAt: new Date().toISOString(),
  })

  if (outline?.data?.timeAnchor) state.timeAnchor = outline.data.timeAnchor
  if (outline?.data?.foreshadowOut?.length) state = closeForeshadow(state, outline.data.foreshadowOut, chapterNo)

  const planted = outline?.data?.foreshadowIn ?? []
  if (planted.length > 0) {
    const created = []
    for (const item of planted) {
      const id = nextForeshadowId([...(state.foreshadow ?? []), ...created])
      created.push({ id, text: item, planted: chapterNo, status: 'open' })
    }
    state = mergeForeshadow(state, created)
  }

  if (patch) state = applyStatePatch(state, patch)
  state.nextEntry = patch?.nextEntry ?? { chapter: chapterNo + 1 }

  const saved = await saveState(dir, state)
  await deriveAll(dir, project, saved)

  const checks = runChecks({ text, outline: outline?.data ?? null, state: saved, project, options })
  const afterOpen = (saved.foreshadow ?? []).filter((f) => f.status !== 'closed').map((f) => f.id)

  return {
    chapterNo,
    title,
    rel,
    archived,
    words: stats.chars,
    target: checks.target,
    blocking: checks.blocking,
    warnings: checks.warnings,
    stats: checks.stats,
    added: afterOpen.filter((id) => !beforeOpen.includes(id)),
    closed: beforeOpen.filter((id) => !afterOpen.includes(id)),
    jumped: beforeLast > 0 && chapterNo !== beforeLast + 1,
    previousChapter: beforeLast,
    patchError,
    summary: String(summary ?? '').trim(),
    hasOutline: Boolean(outline),
  }
}
