/**
 * novel_context：装配某一章的写作上下文。
 * 写正文前先取这个，不要凭记忆写。
 */
import { textTool, pickBook } from './shared.js'
import { loadState } from '../core/state.js'
import { buildContext } from '../core/context.js'

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_context',
    description:
      '取某一章的完整写作上下文：细纲、当前人物/能力状态、待回收伏笔、前情摘要、出场人物卡、设定硬规则、文风锚点。'
      + '写正文前必须先调用；返回内容本身就是写作依据，不要再用别的方式猜设定。'
      + '如果返回里显示「细纲缺失」，先补细纲。',
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
      chapter: { type: 'number', required: true, description: '要写的章号' },
    },
    async run(args, exec) {
      const { dir, project } = await pickBook(config, ctx, exec, args.book)
      const chapterNo = Number(args.chapter)
      if (!Number.isInteger(chapterNo) || chapterNo < 1) throw new Error('chapter 必须是 ≥1 的整数')
      const state = await loadState(dir)
      return buildContext({ dir, project, state, chapterNo })
    },
  }))
}
