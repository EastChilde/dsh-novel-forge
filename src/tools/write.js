/**
 * novel_write_commit：提交一章正文。
 * 逻辑在 core/commit.js，这里只做参数校验与给模型看的汇报排版。
 */
import { commitChapter } from '../core/commit.js'
import { textTool, pickBook } from './shared.js'

const DESCRIPTION = [
  '提交一章正文并落库：写 03-正文 文件、更新 state.json、重建进度/伏笔/时间线等派生文件、跑质量检查。',
  '模型写完正文后必须调用它，不要自己写追踪文件。同一章重复提交会覆盖，旧版自动存档到 .novel/archive/。',
  'updates 可选，是 JSON 字符串，用于补充状态：',
  '{"timeAnchor":"","characters":{"沈砚":{"location":"","condition":"","goal":"","knows":[]}},',
  '"abilities":{},"items":[],"openQuestions":[],"nextEntry":{"chapter":8,"pov":"","scene":"","must":[],"forbid":[]}}。',
  '伏笔的埋设/回收优先从细纲读取，不必在 updates 里重复。',
].join('')

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_write_commit',
    description: DESCRIPTION,
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
      chapter: { type: 'number', required: true, description: '章号' },
      content: { type: 'string', required: true, description: '本章正文全文（Markdown，第一行是 # 第N章 标题）' },
      summary: { type: 'string', required: true, description: '本章摘要，2–3 句，写清发生了什么、停在哪里' },
      updates: { type: 'string', description: '可选的状态补丁 JSON 字符串' },
    },
    async run(args, exec) {
      const { dir, project } = await pickBook(config, ctx, exec, args.book)
      const chapterNo = Number(args.chapter)
      if (!Number.isInteger(chapterNo) || chapterNo < 1) throw new Error('chapter 必须是 ≥1 的整数')

      const result = await commitChapter({
        dir,
        project,
        chapterNo,
        content: args.content,
        summary: args.summary,
        updates: args.updates,
        options: config,
      })

      const lines = [
        `第 ${result.chapterNo} 章《${result.title}》已提交 · ${result.words} 字（目标 ${result.target}）`,
        `文件：${result.rel}`,
      ]
      if (result.archived) lines.push(`旧版已存档：${result.archived}`)
      if (result.jumped) {
        lines.push(`注意：上一章是第 ${result.previousChapter} 章，本次提交第 ${result.chapterNo} 章，属于跳章/回填。`)
      }
      if (!result.hasOutline) lines.push('注意：这一章没有细纲，质量与一致性无法对照检查。')

      lines.push('', `发生了什么：${result.summary || '（未填写摘要）'}`)

      if (result.blocking.length > 0) {
        lines.push('', `⚠ 必须修（${result.blocking.length} 项）：`)
        for (const item of result.blocking) lines.push(`- ${item.message}`)
      }
      if (result.warnings.length > 0) {
        lines.push('', `提醒（${result.warnings.length} 项）：`)
        for (const item of result.warnings) lines.push(`- ${item.message}`)
      }
      if (result.blocking.length === 0 && result.warnings.length === 0) lines.push('', '检查：全部通过')

      if (result.added.length || result.closed.length) {
        const bits = []
        if (result.added.length) bits.push(`新增 ${result.added.join('、')}`)
        if (result.closed.length) bits.push(`回收 ${result.closed.join('、')}`)
        lines.push('', `伏笔：${bits.join('；')}`)
      }
      if (result.patchError) lines.push('', result.patchError)

      lines.push('', result.blocking.length > 0
        ? `下一步：按上面的问题改完，重新调用 novel_write_commit 提交第 ${result.chapterNo} 章（会覆盖并留档）。`
        : `下一步：写第 ${result.chapterNo + 1} 章（先确认细纲是否就绪）／回头修这一章／查看 status。`)

      return lines.join('\n')
    },
  }))
}
