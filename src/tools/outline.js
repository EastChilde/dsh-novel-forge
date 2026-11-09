/**
 * novel_outline_put：写入一章的细纲（先补纲，再写正文）。
 */
import { saveOutline } from '../core/outline.js'
import { textTool, pickBook } from './shared.js'

const TEMPLATE_HINT = [
  '格式（固定模板，字段用「- 键：值」）：',
  '# 第007章 标题',
  '- 视角：',
  '- 目标字数：2500',
  '- 时间锚：',
  '- 地点：',
  '- 出场：甲、乙',
  '- 情绪：',
  '- 章末钩子：',
  '- 伏笔埋设：',
  '- 伏笔回收：',
  '## 场景 1',
  '- 目标：',
  '- 冲突：',
  '- 转折：',
].join('\n')

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_outline_put',
    description:
      '写入或替换某一章的细纲。细纲是写正文的前置条件：必须有视角、目标字数、章末钩子，'
      + '以及至少一个「## 场景」块（含目标/冲突/转折）。校验不通过会报错且不写盘。\n\n'
      + TEMPLATE_HINT,
    parameters: {
      book: { type: 'string', description: '书的 slug；只有一本时可省略' },
      chapter: { type: 'number', required: true, description: '章号，从 1 开始' },
      content: { type: 'string', required: true, description: '完整细纲 Markdown，按上面的模板' },
    },
    async run(args, exec) {
      const { dir } = await pickBook(config, ctx, exec, args.book)
      const chapterNo = Number(args.chapter)
      if (!Number.isInteger(chapterNo) || chapterNo < 1) throw new Error('chapter 必须是 ≥1 的整数')

      const { rel, data, warnings } = await saveOutline(dir, chapterNo, args.content)

      const lines = [
        `已写入细纲：${rel}`,
        `第${data.no}章《${data.title}》｜${data.scenes.length} 个场景｜目标 ${data.targetWords} 字｜视角 ${data.pov}`,
        `钩子：${data.hook}`,
      ]
      if (data.characters.length > 0) lines.push(`出场：${data.characters.join('、')}`)
      if (warnings.length > 0) lines.push('', '提醒：', ...warnings.map((w) => `- ${w}`))
      lines.push('', `下一步：调用 novel_context 取第 ${chapterNo} 章写作上下文，然后写正文。`)
      return lines.join('\n')
    },
  }))
}
