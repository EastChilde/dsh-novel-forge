/**
 * novel_check：对已提交（或即将提交）的一章跑质量检查。
 */
import { join } from 'node:path'
import { readText } from '../core/project.js'
import { loadState } from '../core/state.js'
import { loadOutline } from '../core/outline.js'
import { runChecks } from '../core/checks.js'
import { textTool, pickBook, findProse } from './shared.js'

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_check',
    description:
      '对某一章跑确定性的质量检查：字数区间、AI 味词密度、对话占比、句首重复、段落长度、章末钩子、伏笔逾期。'
      + '返回分「必须修」和「提醒」两级。只检查已落盘的正文；要检查还没提交的草稿，请先提交。',
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
      chapter: { type: 'number', description: '章号；省略时检查最近一章' },
    },
    async run(args, exec) {
      const { dir, project } = await pickBook(config, ctx, exec, args.book)
      const state = await loadState(dir)
      const chapterNo = Number(args.chapter ?? state.lastChapter ?? 0)
      if (!Number.isInteger(chapterNo) || chapterNo < 1) throw new Error('还没有可检查的章节')

      const file = await findProse(dir, chapterNo)
      if (!file) throw new Error(`找不到第 ${chapterNo} 章正文（03-正文/第${String(chapterNo).padStart(3, '0')}章-*.md）`)

      const text = await readText(file, '')
      const outline = await loadOutline(dir, chapterNo)
      const checks = runChecks({ text, outline: outline?.data ?? null, state, project, options: config })

      const lines = [
        `第 ${chapterNo} 章检查 · ${checks.stats.chars} 字（目标 ${checks.target}）`,
        `段落 ${checks.stats.paragraphs}｜句均 ${checks.stats.avgSentence} 字｜对话占比 ${(checks.stats.dialogueRatio * 100).toFixed(1)}%`,
        '',
      ]
      if (checks.blocking.length === 0) lines.push('必须修：无')
      else {
        lines.push(`必须修（${checks.blocking.length} 项）：`)
        for (const item of checks.blocking) lines.push(`- ${item.message}`)
      }
      if (checks.warnings.length === 0) lines.push('提醒：无')
      else {
        lines.push('', `提醒（${checks.warnings.length} 项）：`)
        for (const item of checks.warnings) lines.push(`- ${item.message}`)
      }
      return lines.join('\n')
    },
  }))
}
