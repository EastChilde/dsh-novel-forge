/**
 * novel_resume：冷启动恢复。
 * 新会话、隔了几天、换台机器，先跑这个，再决定写什么。
 */
import { buildResume } from '../core/resume.js'
import { loadState } from '../core/state.js'
import { textTool, pickBook } from './shared.js'

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_resume',
    description:
      '冷启动恢复：返回上一章结尾原文、人物当前状态、未闭合问题、下一章细纲要害与必须/禁止事项、未回收伏笔。'
      + '新会话开始写之前先调用；不要凭记忆重新规划已经确认的内容。',
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
    },
    async run(args, exec) {
      const { dir, project } = await pickBook(config, ctx, exec, args.book)
      const state = await loadState(dir)
      return buildResume({ dir, project, state })
    },
  }))
}
