/**
 * 冷启动恢复：新会话第一件事。
 *
 * 原则：只给「接得上」所必需的东西——上一章停在哪、人现在在哪、
 * 下一章必须发生什么、哪些坑必须记住。不重新规划已确认内容。
 */
import { readFile } from 'node:fs/promises'
import { loadOutline } from './outline.js'
import { findProse } from './fs-utils.js'

const TAIL_CHARS = 300

export async function buildResume({ dir, project, state }) {
  const lastNo = state.lastChapter ?? 0
  const nextNo = lastNo + 1
  const lastFile = lastNo > 0 ? await findProse(dir, lastNo) : null
  const tail = lastFile ? (await readFile(lastFile, 'utf8')).trim().slice(-TAIL_CHARS) : ''
  const outline = await loadOutline(dir, nextNo)
  const open = (state.foreshadow ?? []).filter((f) => f.status !== 'closed')
  const next = state.nextEntry ?? {}

  const lines = [
    `《${project.title}》· 已写 ${lastNo} 章`,
    '',
    '## 上一章停在哪',
    '',
    tail ? `……${tail}` : '（还没有正文）',
    '',
    '## 现在的人和事',
    '',
    `- 时间锚：${state.timeAnchor || '未记录'}`,
  ]

  for (const [name, info] of Object.entries(state.characters ?? {})) {
    const bits = [info.location, info.condition, info.goal].filter(Boolean)
    if (bits.length > 0) lines.push(`- ${name}：${bits.join('｜')}`)
  }

  if ((state.openQuestions ?? []).length > 0) {
    lines.push('', '## 还没有答案的问题', '')
    for (const q of state.openQuestions) lines.push(`- ${q}`)
  }

  lines.push('', `## 下一章：第 ${nextNo} 章`, '')
  if (outline) {
    lines.push(`细纲已就绪：《${outline.data.title}》，${outline.data.scenes.length} 个场景，目标 ${outline.data.targetWords} 字`)
    if (outline.data.hook) lines.push(`钩子：${outline.data.hook}`)
  } else {
    lines.push('细纲缺失——先补纲，再写正文。')
  }

  if ((next.must ?? []).length > 0 || (next.forbid ?? []).length > 0) {
    lines.push('')
    if ((next.must ?? []).length > 0) lines.push(`必须发生：${next.must.join('；')}`)
    if ((next.forbid ?? []).length > 0) lines.push(`禁止发生：${next.forbid.join('；')}`)
  }

  if (open.length > 0) {
    lines.push('', '## 不能忘的伏笔', '')
    for (const f of open.slice(0, 8)) {
      lines.push(`- ${f.id}「${f.text ?? ''}」${f.due ? `计划第 ${f.due} 章回收` : '回收章未定'}`)
    }
  }

  lines.push('', '---', '确认无误后直接写下一章；不要重新规划已经确认的设定与大纲。')
  return lines.join('\n')
}
