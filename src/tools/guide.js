/**
 * novel_guide：按当前阶段取方法论。
 * 参考文件随包分发，不整包塞进上下文，用哪个取哪个。
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { textTool } from './shared.js'

const REF_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'references')

const TOPICS = {
  开书: '网文规则.md',
  网文: '网文规则.md',
  网文规则: '网文规则.md',
  结构: '结构模板.md',
  大纲: '结构模板.md',
  卷纲: '结构模板.md',
  细纲: '结构模板.md',
  钩子: '钩子库.md',
  去味: '去AI味.md',
  去ai味: '去AI味.md',
  文风: '去AI味.md',
}

const ALL = [...new Set(Object.values(TOPICS))]

export function register(ctx) {
  ctx.tools.register(textTool({
    name: 'novel_guide',
    description:
      '取写作方法论（随插件分发）：开书/网文规则、结构/大纲/卷纲/细纲、钩子库、去 AI 味。'
      + '在规划阶段或正文自检阶段按需调用，不需要一次全读。topic 省略时返回目录。',
    parameters: {
      topic: { type: 'string', description: '开书｜结构｜钩子｜去味；省略则列出可用主题' },
    },
    async run(args) {
      const topic = String(args.topic ?? '').trim()
      if (!topic) {
        return [
          '可用主题：',
          '- 开书：黄金三章、爽点四拍、冲突升级、代入感、金手指纪律',
          '- 结构：三层结构、全书骨架、卷纲与细纲模板、场景卡三问',
          '- 钩子：章末 13 式、章首 7 式、自查',
          '- 去味：高危词表、句式四病灶、改写四步',
        ].join('\n')
      }
      const file = TOPICS[topic] ?? TOPICS[topic.toLowerCase()]
      if (!file) throw new Error(`没有这个主题「${topic}」。可用：${Object.keys(TOPICS).join('、')}`)
      const text = await readFile(join(REF_DIR, file), 'utf8')
      return `${text.trim()}\n\n---\n（来源：src/references/${file}）`
    },
  }))
}

export { ALL as GUIDE_FILES }
