/**
 * 细纲的解析与校验。
 *
 * 细纲是「写这一章之前必须存在的东西」。为了让它既好写又好查，
 * 用固定模板 + `- 键：值` 的 Markdown，而不是自由文本。
 */
import { join } from 'node:path'
import { outlineRel } from './paths.js'
import { parseDocument, pick, splitList } from './markdown.js'
import { readText, writeTextAtomic } from './project.js'

export const OUTLINE_TEMPLATE = `# 第001章 标题

- 视角：主角名
- 目标字数：2500
- 时间锚：第几日·时段
- 地点：
- 出场：甲、乙
- 情绪：期待 → 紧张
- 章末钩子：悬念-具体是什么
- 伏笔埋设：
- 伏笔回收：

## 场景 1
- 目标：这一场谁想要什么
- 冲突：谁挡着
- 转折：结果与预期相反的地方

## 场景 2
- 目标：
- 冲突：
- 转折：
`

const REQUIRED_FIELDS = [
  ['视角', ['视角', 'pov']],
  ['目标字数', ['目标字数', '字数']],
  ['章末钩子', ['章末钩子', '钩子']],
]

/**
 * 把细纲文档解析成结构化对象（不写盘）。
 * @returns {{ data: object, errors: string[], warnings: string[] }}
 */
export function parseOutline(markdown, chapterNo) {
  const doc = parseDocument(markdown)
  const errors = []
  const warnings = []

  const data = {
    no: Number(chapterNo),
    title: doc.title.replace(/^第\s*\d+\s*章\s*/, '').trim() || doc.title,
    pov: pick(doc.fields, ['视角', 'pov']),
    targetWords: Number(pick(doc.fields, ['目标字数', '字数'], 0)) || 0,
    timeAnchor: pick(doc.fields, ['时间锚', '时间']),
    location: pick(doc.fields, ['地点']),
    characters: splitList(pick(doc.fields, ['出场', '人物'])),
    emotion: pick(doc.fields, ['情绪']),
    hook: pick(doc.fields, ['章末钩子', '钩子']),
    foreshadowIn: splitList(pick(doc.fields, ['伏笔埋设', '埋设伏笔'])),
    foreshadowOut: splitList(pick(doc.fields, ['伏笔回收', '回收伏笔'])),
    scenes: doc.scenes.map((s) => ({
      heading: s.heading,
      goal: s.fields['目标'] ?? '',
      conflict: s.fields['冲突'] ?? '',
      turn: s.fields['转折'] ?? '',
      notes: s.fields['备注'] ?? '',
    })),
    raw: markdown,
  }

  for (const [label, names] of REQUIRED_FIELDS) {
    if (!pick(doc.fields, names)) errors.push(`缺少必填字段「${label}」`)
  }

  if (data.targetWords && (data.targetWords < 800 || data.targetWords > 8000)) {
    warnings.push(`目标字数 ${data.targetWords} 不在合理区间（800–8000）`)
  }

  if (data.scenes.length === 0) {
    errors.push('至少需要一个「## 场景 N」块')
  }

  data.scenes.forEach((scene, i) => {
    if (!scene.goal && !scene.conflict && !scene.turn) {
      errors.push(`${scene.heading || `场景 ${i + 1}`} 三个字段全空`)
    }
  })

  if (!data.characters.length) warnings.push('没有填写出场人物，写作时容易凭空加人')

  return { data, errors, warnings }
}

/** 读取某章细纲文件并解析；不存在时返回 null。 */
export async function loadOutline(dir, chapterNo) {
  const rel = outlineRel(chapterNo)
  const raw = await readText(join(dir, rel), '')
  if (!raw.trim()) return null
  return { rel, ...parseOutline(raw, chapterNo) }
}

/** 校验通过后写盘；有错就抛，避免把坏细纲留在项目里。 */
export async function saveOutline(dir, chapterNo, markdown) {
  const { data, errors, warnings } = parseOutline(markdown, chapterNo)
  if (errors.length > 0) {
    throw new Error(`细纲第 ${chapterNo} 章不合法：\n- ${errors.join('\n- ')}`)
  }
  const rel = outlineRel(chapterNo)
  await writeTextAtomic(join(dir, rel), markdown.endsWith('\n') ? markdown : `${markdown}\n`)
  return { rel, data, warnings }
}
