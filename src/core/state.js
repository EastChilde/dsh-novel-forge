/**
 * 权威状态：04-追踪/state.json。
 *
 * 约定：章节提交后由 novel_write_commit 写入，其他代码只读。
 * 派生视图（进度/伏笔表/时间线/人物快照/章节摘要）由 derive.js 生成，
 * 不参与判断，删掉可重建。
 */
import { join } from 'node:path'
import { FILES } from './paths.js'
import { initialState } from './project.js'
import { readJson, writeJsonAtomic } from './project.js'

export async function loadState(dir) {
  const state = await readJson(join(dir, FILES.state), null)
  return { ...initialState(), ...(state ?? {}) }
}

export async function saveState(dir, state) {
  const next = { ...state, version: 1, updatedAt: new Date().toISOString() }
  await writeJsonAtomic(join(dir, FILES.state), next)
  return next
}

/**
 * 合并模型提交的状态补丁。
 * 只接受白名单字段，避免模型把结构写坏；未知字段直接忽略。
 */
export function applyStatePatch(state, patch) {
  if (!patch || typeof patch !== 'object') return state
  const next = { ...state }

  if (typeof patch.timeAnchor === 'string') next.timeAnchor = patch.timeAnchor

  if (patch.characters && typeof patch.characters === 'object') {
    next.characters = { ...next.characters }
    for (const [name, value] of Object.entries(patch.characters)) {
      if (!value || typeof value !== 'object') continue
      next.characters[name] = { ...(next.characters[name] ?? {}), ...value }
    }
  }

  if (patch.abilities && typeof patch.abilities === 'object') {
    next.abilities = { ...next.abilities, ...patch.abilities }
  }

  if (Array.isArray(patch.items)) {
    const byName = new Map(next.items.map((item) => [item.name, item]))
    for (const item of patch.items) {
      if (!item || typeof item !== 'object' || !item.name) continue
      byName.set(item.name, { ...(byName.get(item.name) ?? {}), ...item })
    }
    next.items = [...byName.values()]
  }

  if (Array.isArray(patch.openQuestions)) next.openQuestions = patch.openQuestions.filter((q) => typeof q === 'string')

  if (patch.nextEntry && typeof patch.nextEntry === 'object') next.nextEntry = patch.nextEntry

  return next
}

/** 合并伏笔：同一 id 覆盖，新 id 追加。只增不删，回收用 status 标记。 */
export function mergeForeshadow(state, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return state
  const byId = new Map((state.foreshadow ?? []).map((f) => [f.id, f]))
  for (const item of incoming) {
    if (!item || typeof item !== 'object' || !item.id) continue
    byId.set(item.id, { ...(byId.get(item.id) ?? {}), ...item })
  }
  return { ...state, foreshadow: [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id))) }
}

/** 标记某个伏笔在本章回收。 */
export function closeForeshadow(state, ids, chapterNo) {
  if (!Array.isArray(ids) || ids.length === 0) return state
  const set = new Set(ids)
  return {
    ...state,
    foreshadow: (state.foreshadow ?? []).map((f) => (set.has(f.id)
      ? { ...f, status: 'closed', closedAt: chapterNo }
      : f)),
  }
}

/** 记录一章摘要与字数，写回 chapters 列表。 */
export function recordChapter(state, chapter) {
  const others = (state.chapters ?? []).filter((c) => c.no !== chapter.no)
  const chapters = [...others, chapter].sort((a, b) => a.no - b.no)
  return { ...state, chapters, lastChapter: Math.max(state.lastChapter ?? 0, chapter.no) }
}
