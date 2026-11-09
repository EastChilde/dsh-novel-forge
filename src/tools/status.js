/**
 * novel_status：项目体检 + 下一步建议。
 * 裸调用 /novel 时先跑它，不要直接开写。
 */
import { textTool, pickBook } from './shared.js'
import { loadState } from '../core/state.js'
import { loadOutline } from '../core/outline.js'

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_status',
    description:
      '查看一本书的当前状态：进度、最近章节、未回收伏笔、下一章细纲是否就绪。'
      + '在用户问「写到哪了」「接下来写什么」或裸调用 /novel 时先调用它，再给选项，不要直接开写。',
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
    },
    async run(args, exec) {
      const { dir, project } = await pickBook(config, ctx, exec, args.book)
      const state = await loadState(dir)
      const done = (state.chapters ?? []).filter((c) => c.no > 0)
      const words = done.reduce((sum, c) => sum + (c.words ?? 0), 0)
      const open = (state.foreshadow ?? []).filter((f) => f.status !== 'closed')
      const nextNo = (state.lastChapter ?? 0) + 1
      const outline = await loadOutline(dir, nextNo)

      const lines = [
        `《${project.title}》· ${project.mode}${project.genre ? ` · ${project.genre}` : ''}`,
        `进度：${done.length}/${project.totalChapters} 章，累计 ${words} 字，单章目标 ${project.targetWords} 字`,
        `当前时间锚：${state.timeAnchor || '未记录'}`,
        `未回收伏笔：${open.length} 条${open.length > 0 ? `（${open.slice(0, 5).map((f) => `${f.id}${f.due ? `→第${f.due}章` : ''}`).join('、')}${open.length > 5 ? '…' : ''}）` : ''}`,
        '',
      ]

      if (done.length > 0) {
        lines.push('最近三章：')
        for (const c of done.slice(-3)) {
          lines.push(`- 第${c.no}章 ${c.title}：${c.summary || '（无摘要）'}`)
        }
        lines.push('')
      }

      if (outline) {
        lines.push(`下一章（第 ${nextNo} 章）细纲已就绪：《${outline.data.title}》，${outline.data.scenes.length} 个场景，目标 ${outline.data.targetWords} 字`)
      } else {
        lines.push(`下一章（第 ${nextNo} 章）还没有细纲——先补纲再写正文。`)
      }

      lines.push('')
      lines.push('可做：')
      lines.push(`- 写第 ${nextNo} 章${outline ? '' : '（需先补细纲）'}`)
      lines.push('- 看/改第 ' + nextNo + ' 章细纲')
      lines.push('- 继续下一卷规划')
      lines.push('- 导出 Markdown 合集')

      return lines.join('\n')
    },
  }))
}
