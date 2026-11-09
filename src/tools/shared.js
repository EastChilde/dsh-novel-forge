/**
 * 工具层共用的解析与包装。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { listBooks, loadBook, resolveBooksRoot } from '../core/project.js'
import { findProse, nextForeshadowId } from '../core/fs-utils.js'

export { findProse, nextForeshadowId }

/**
 * 把「查询型」工具统一包装成 { text } 输出，避免每个工具各写一套 schema。
 * 所有工具都只返回给模型看的紧凑文本，结构化数据留在文件里。
 */
export function textTool({ name, description, parameters, run }) {
  return defineTool({
    name,
    description,
    parameters,
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args, exec) {
      return { text: await run(args ?? {}, exec) }
    },
  })
}

/** 解析书根目录（异步：要问 workingDirectory 服务）。 */
export async function rootOf(config, ctx, exec) {
  return resolveBooksRoot(config, ctx, exec)
}

/**
 * 定位一本书：给了 slug 就用它；没给时只在「恰好一本」的情况下自动选中，
 * 多本时明确报错并列出候选，绝不替用户猜。
 */
export async function pickBook(config, ctx, exec, slug) {
  const root = await rootOf(config, ctx, exec)
  // 记下最近工作区，供侧边栏/顶部面板在拿不到 session 时兜底。
  if (config && config.runtime) config.runtime.lastCwd = root
  if (slug) {
    const book = await loadBook(root, slug)
    return { root, ...book }
  }
  const books = await listBooks(root)
  if (books.length === 0) {
    throw new Error(`还没有任何书（${root}）。先用 novel_init 建一本。`)
  }
  if (books.length > 1) {
    throw new Error(`当前有 ${books.length} 本书，请用 book 参数指定：《${books.map((b) => b.title).join('》《')}》→ ${books.map((b) => b.slug).join('、')}`)
  }
  const book = await loadBook(root, books[0].slug)
  return { root, ...book }
}
