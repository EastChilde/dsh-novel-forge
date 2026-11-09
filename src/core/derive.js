/**
 * 派生视图：由 state.json 生成，给人看，也方便直接投喂给模型。
 * 这些文件永远可以删掉重建，不参与任何判断。
 */
import { join } from 'node:path'
import { FILES } from './paths.js'
import { writeTextAtomic } from './project.js'

export async function deriveAll(dir, project, state) {
  await Promise.all([
    writeTextAtomic(join(dir, FILES.progress), progressDoc(project, state)),
    writeTextAtomic(join(dir, FILES.foreshadow), foreshadowDoc(state)),
    writeTextAtomic(join(dir, FILES.timeline), timelineDoc(state)),
    writeTextAtomic(join(dir, FILES.characters), charactersDoc(state)),
    writeTextAtomic(join(dir, FILES.summaries), summariesDoc(state)),
  ])
}

export function progressDoc(project, state) {
  const done = (state.chapters ?? []).filter((c) => c.no > 0)
  const words = done.reduce((sum, c) => sum + (c.words ?? 0), 0)
  const open = (state.foreshadow ?? []).filter((f) => f.status !== 'closed')
  const lines = [
    `# 进度 · ${project.title}`,
    '',
    `- 已完成：${done.length} 章`,
    `- 累计字数：${words}`,
    `- 计划章数：${project.totalChapters}`,
    `- 当前时间锚：${state.timeAnchor || '未记录'}`,
    `- 未闭合伏笔：${open.length} 条`,
    `- 更新于：${state.updatedAt ?? ''}`,
    '',
    '## 最近三章',
    '',
    ...[...done].slice(-3).map((c) => `- 第${c.no}章 ${c.title}：${c.summary || '（无摘要）'}`),
    '',
    '## 下一步',
    '',
    state.nextEntry?.chapter
      ? `- 写第 ${state.nextEntry.chapter} 章：${state.nextEntry.scene ?? ''}\n- 必须发生：${(state.nextEntry.must ?? []).join('；') || '未指定'}\n- 禁止发生：${(state.nextEntry.forbid ?? []).join('；') || '无'}`
      : '- 尚未设置续写入口',
    '',
  ]
  return lines.join('\n')
}

export function foreshadowDoc(state) {
  const list = state.foreshadow ?? []
  const lines = ['# 伏笔账本', '', '| id | 内容 | 埋设章 | 状态 | 计划回收 | 已回收于 |', '|---|---|---|---|---|---|']
  if (list.length === 0) lines.push('| — | （暂无） | — | — | — | — |')
  for (const f of list) {
    lines.push(`| ${f.id} | ${f.text ?? ''} | ${f.planted ?? '—'} | ${f.status === 'closed' ? '已回收' : '未回收'} | ${f.due ?? '—'} | ${f.closedAt ?? '—'} |`)
  }
  lines.push('')
  return lines.join('\n')
}

export function timelineDoc(state) {
  const lines = ['# 时间线', '', `当前时间锚：${state.timeAnchor || '未记录'}`, '', '| 章 | 时间 | 地点 | 事件 |', '|---|---|---|---|']
  for (const c of (state.chapters ?? []).filter((c) => c.no > 0)) {
    lines.push(`| ${c.no} | ${c.timeAnchor ?? '—'} | ${c.location ?? '—'} | ${c.summary ?? ''} |`)
  }
  lines.push('')
  return lines.join('\n')
}

export function charactersDoc(state) {
  const entries = Object.entries(state.characters ?? {})
  const lines = ['# 人物快照', '']
  if (entries.length === 0) lines.push('（暂无）')
  for (const [name, info] of entries) {
    lines.push(`## ${name}`, '')
    if (info.location) lines.push(`- 位置：${info.location}`)
    if (info.condition) lines.push(`- 状态：${info.condition}`)
    if (info.goal) lines.push(`- 当前目标：${info.goal}`)
    if (Array.isArray(info.knows) && info.knows.length > 0) lines.push(`- 已知信息：${info.knows.join('；')}`)
    if (info.lastSeen) lines.push(`- 最近出场：第 ${info.lastSeen} 章`)
    lines.push('')
  }
  return lines.join('\n')
}

export function summariesDoc(state) {
  const lines = ['# 章节摘要链', '']
  for (const c of (state.chapters ?? []).filter((c) => c.no > 0)) {
    lines.push(`## 第${c.no}章 ${c.title}`, '', c.summary || '（无摘要）', '')
  }
  return lines.join('\n')
}
