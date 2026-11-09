/**
 * novel_export：导出 Markdown 合集。
 */
import { exportMarkdown } from '../core/export.js'
import { loadState } from '../core/state.js'
import { textTool, pickBook } from './shared.js'

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_export',
    description:
      '把已提交的章节按顺序合并成一份 Markdown 合集，写到 05-导出/<书名>-合集.md。'
      + '只做合并与标题规范化，不改正文。缺少正文文件的章节会被跳过并在结果里列出。',
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
      with_front_matter: { type: 'boolean', description: '开头是否附题材/平台/视角信息，默认 true' },
    },
    async run(args, exec) {
      const { dir, project } = await pickBook(config, ctx, exec, args.book)
      const state = await loadState(dir)
      const result = await exportMarkdown({
        dir,
        project,
        state,
        withFrontMatter: args.with_front_matter !== false,
      })

      const lines = [
        `已导出：${result.rel}`,
        `${result.chapters} 章，共 ${result.words} 字`,
      ]
      if (result.missing.length > 0) {
        lines.push('', `跳过（缺正文文件）：第 ${result.missing.join('、')} 章`)
      }
      return lines.join('\n')
    },
  }))
}
