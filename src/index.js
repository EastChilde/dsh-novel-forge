/**
 * 墨匣（dsh-novel-forge）host 入口。
 *
 * 设计原则：插件只负责「状态、装配、校验、落盘」，写作本身交给模型。
 * 每个工具都很小，复杂的规则放在 src/core 里，可以脱离宿主单测。
 */
import z from '@deepseek-ai/schemastery'
import * as initTool from './tools/init.js'
import * as statusTool from './tools/status.js'
import * as outlineTool from './tools/outline.js'
import * as contextTool from './tools/context.js'
import * as writeTool from './tools/write.js'
import * as checkTool from './tools/check.js'
import * as guideTool from './tools/guide.js'
import * as exportTool from './tools/export.js'
import * as resumeTool from './tools/resume.js'
import { createApiRoute } from './http/api-route.js'

/** Cordis 插件名，必须与 package.json 的 name、cordis.patch.yml 的 name 一致。 */
export const name = 'dsh-novel-forge'

/** 依赖：工具注册表 + 工作区服务（取会话当前目录）。 */
export const inject = ['tools', 'workingDirectory', 'webServer', 'sessions']

/** 插件配置；所有可调项都在这里，不写死在源码里。 */
export const Config = z.object({
  /** 书目录相对工作区的位置，或绝对路径。 */
  booksRoot: z.string().default('books'),
  /** 显式指定工作区根；留空则按会话推断。 */
  workspaceRoot: z.string().default(''),
  /** 单章默认目标字数。 */
  defaultTargetWords: z.number().default(2500),
  /** 字数允许偏差（0.15 = ±15%）。 */
  wordTolerance: z.number().default(0.15),
  /** 额外/自定义的 AI 味词表；留空用内置表。 */
  aiFlavorWords: z.array(z.string()).default([]),
  /** 每千字允许的 AI 味词数量。 */
  aiDensityLimit: z.number().default(8),
  /** 对话占比合理区间下限。 */
  dialogueMin: z.number().default(0.15),
  /** 对话占比合理区间上限。 */
  dialogueMax: z.number().default(0.55),
})

export function apply(ctx, config) {
  const raw = config ?? {}
  const resolved = {
    booksRoot: raw.booksRoot ?? 'books',
    workspaceRoot: raw.workspaceRoot ?? '',
    defaultTargetWords: raw.defaultTargetWords ?? 2500,
    wordTolerance: raw.wordTolerance ?? 0.15,
    aiFlavorWords: Array.isArray(raw.aiFlavorWords) && raw.aiFlavorWords.length > 0 ? raw.aiFlavorWords : undefined,
    aiDensityLimit: raw.aiDensityLimit ?? 8,
    dialogueRange: [raw.dialogueMin ?? 0.15, raw.dialogueMax ?? 0.55],
  }

  // 最近一次工作区：面板没有 session 信息时的兜底（进程内有效）。
  const runtime = { lastCwd: '' }
  resolved.runtime = runtime

  for (const mod of [initTool, statusTool, outlineTool, contextTool, writeTool, checkTool, guideTool, exportTool, resumeTool]) {
    mod.register(ctx, resolved)
  }

  // 侧边栏标签页读取的只读快照接口。前缀路由随 fiber 一起释放。
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/novel/api',
    handler: createApiRoute({ ctx, config: resolved, runtime }),
  }), 'novel-forge: snapshot route')
}
