/**
 * 上下文装配：每章开写前，只给模型「不知道就会写错」的那一小份东西。
 *
 * 顺序即优先级。超预算时从低优先级开始截断，保证细纲、状态、伏笔永远完整。
 */
import { join } from 'node:path'
import { FILES, characterRel } from './paths.js'
import { clip } from './markdown.js'
import { readText } from './project.js'
import { loadOutline } from './outline.js'

const DEFAULTS = {
  outline: 2200,
  state: 1600,
  foreshadow: 900,
  recap: 1200,
  bible: 1800,
  style: 1000,
}

function stateBrief(state) {
  const lines = []
  lines.push(`- 时间锚：${state.timeAnchor || '未记录'}`)
  lines.push(`- 上一章：第 ${state.lastChapter || 0} 章`)
  const chars = Object.entries(state.characters ?? {})
  if (chars.length > 0) {
    lines.push('')
    lines.push('### 人物当前位置 / 状态')
    for (const [name, info] of chars) {
      const bits = [info.location, info.condition, info.goal].filter(Boolean)
      if (bits.length > 0) lines.push(`- ${name}：${bits.join('｜')}`)
    }
  }
  const abilities = Object.entries(state.abilities ?? {})
  if (abilities.length > 0) {
    lines.push('')
    lines.push('### 能力状态')
    for (const [name, info] of abilities) {
      lines.push(`- ${name}：${[info.level && `第${info.level}层`, info.limits, info.cost].filter(Boolean).join('｜')}`)
    }
  }
  if ((state.openQuestions ?? []).length > 0) {
    lines.push('')
    lines.push('### 未闭合问题')
    for (const q of state.openQuestions) lines.push(`- ${q}`)
  }
  return lines.join('\n')
}

function foreshadowBrief(state, currentNo) {
  const open = (state.foreshadow ?? []).filter((f) => f.status !== 'closed')
  if (open.length === 0) return '（暂无未回收伏笔）'
  return open
    .sort((a, b) => Number(a.due ?? 9999) - Number(b.due ?? 9999))
    .map((f) => {
      const overdue = f.due && currentNo > Number(f.due) ? `，已逾期 ${currentNo - Number(f.due)} 章` : ''
      const due = f.due ? `计划第 ${f.due} 章回收` : '回收章未定'
      const planted = f.planted === undefined ? '埋设章未记' : `埋于第 ${f.planted} 章`
      return `- ${f.id}「${f.text ?? ''}」${planted}，${due}${overdue}`
    })
    .join('\n')
}

function recap(state, count = 2) {
  const chapters = (state.chapters ?? []).filter((c) => c.no > 0).slice(-count)
  if (chapters.length === 0) return '（这是第一章）'
  return chapters
    .map((c) => `第${c.no}章 ${c.title}：${c.summary || '（无摘要）'}`)
    .join('\n')
}

async function bibleBrief(dir, names) {
  if (!names.length) return ''
  const parts = []
  for (const name of names) {
    const text = await readText(join(dir, characterRel(name)), '')
    if (text.trim()) parts.push(clip(text.trim(), 700))
  }
  return parts.join('\n\n')
}

/**
 * @param {object} input
 * @param {string} input.dir 书目录
 * @param {object} input.project
 * @param {object} input.state
 * @param {number} input.chapterNo
 * @param {object} [input.budget]
 */
export async function buildContext({ dir, project, state, chapterNo, budget = DEFAULTS }) {
  const outline = await loadOutline(dir, chapterNo)
  const world = await readText(join(dir, FILES.world), '')
  const rules = await readText(join(dir, FILES.rules), '')
  const style = await readText(join(dir, FILES.style), '')
  const target = Number(outline?.data?.targetWords || project.targetWords || 2500)

  const sections = []
  sections.push(`# 第 ${chapterNo} 章 · 写作上下文`)
  sections.push(`目标字数：${target}｜视角：${outline?.data?.pov || project.pov}`)

  if (outline) {
    sections.push(`## 本章细纲（必须逐条落实）\n\n${clip(outline.data.raw, budget.outline)}`)
  } else {
    sections.push(`## 本章细纲\n\n（缺失：第 ${chapterNo} 章还没有细纲，请先补纲再写正文）`)
  }

  sections.push(`## 当前状态（截至第 ${state.lastChapter || 0} 章）\n\n${clip(stateBrief(state), budget.state)}`)
  sections.push(`## 未回收伏笔（本章该收的必须收）\n\n${clip(foreshadowBrief(state, chapterNo), budget.foreshadow)}`)
  sections.push(`## 前情\n\n${clip(recap(state), budget.recap)}`)

  const characters = outline?.data?.characters ?? []
  const bible = await bibleBrief(dir, characters)
  if (bible) sections.push(`## 本章出场人物卡\n\n${clip(bible, budget.bible)}`)

  const setting = [world, rules].filter((s) => s.trim()).join('\n\n')
  if (setting.trim()) sections.push(`## 设定（只取硬规则）\n\n${clip(setting, Math.round(budget.bible * 0.8))}`)

  if (style.trim()) sections.push(`## 文风锚点（优先级最高）\n\n${clip(style, budget.style)}`)

  sections.push([
    '## 写作要求',
    '',
    '- 只写本章，不提前写下一章的内容。',
    '- 视角人物不知道的信息不要写进来。',
    '- 章末必须落地细纲声明的钩子。',
    '- 写完调用 novel_write_commit 提交，不要自己改追踪文件。',
  ].join('\n'))

  return sections.join('\n\n---\n\n')
}
