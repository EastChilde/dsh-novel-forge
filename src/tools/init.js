/**
 * novel_init：把「一个想法」变成一本书的目录骨架。
 */
import { mkdir } from 'node:fs/promises'
import { createBook } from '../core/project.js'
import { deriveAll } from '../core/derive.js'
import { loadState } from '../core/state.js'
import { textTool, rootOf } from './shared.js'

export function register(ctx, config) {
  ctx.tools.register(textTool({
    name: 'novel_init',
    description:
      '新建一本小说项目：创建目录、project.json、创意页、空状态与设定占位。'
      + '在用户给出想法、决定开书时调用。不会写正文，也不会生成设定内容——只落文件骨架。'
      + '同一书名重复调用会报错，需换 slug。',
    parameters: {
      title: { type: 'string', required: true, description: '书名' },
      premise: { type: 'string', description: '用户原始想法/梗概，原样记录到 00-创意.md' },
      genre: { type: 'string', description: '题材，如「玄幻」「都市异能」「悬疑」' },
      platform: { type: 'string', description: '目标平台，如「番茄」「起点」' },
      mode: { type: 'string', description: '创作模式：网文（默认）或文学' },
      pov: { type: 'string', description: '叙述视角，默认「第三人称贴身限知」' },
      target_words: { type: 'number', description: '单章目标字数，默认取配置 2500' },
      total_chapters: { type: 'number', description: '计划章数，默认 100' },
      slug: { type: 'string', description: '目录名，默认由书名生成' },
    },
    async run(args, exec) {
      const root = await rootOf(config, ctx, exec)
      await mkdir(root, { recursive: true })

      const { slug, dir, project } = await createBook(root, {
        title: args.title,
        premise: args.premise,
        genre: args.genre,
        platform: args.platform,
        mode: args.mode,
        pov: args.pov,
        targetWords: args.target_words ?? config.defaultTargetWords,
        totalChapters: args.total_chapters,
        slug: args.slug,
      })

      const state = await loadState(dir)
      await deriveAll(dir, project, state)

      return [
        `已建书《${project.title}》`,
        `slug：${slug}`,
        `目录：${dir}`,
        '',
        '已创建：',
        '- 00-创意.md（把你的想法记在这里）',
        '- 01-设定/（世界观、规则、文风锚点占位）',
        '- 02-大纲/、03-正文/、04-追踪/、05-导出/',
        '',
        '下一步：先出 3 个方向不同的故事提案，用户选定后再写设定与细纲。',
      ].join('\n')
    },
  }))
}
