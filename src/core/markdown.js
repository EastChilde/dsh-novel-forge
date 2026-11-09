/**
 * 轻量 Markdown 结构解析。
 *
 * 选择 Markdown + `- 键：值` 而不是 YAML front-matter，原因有两个：
 * 1. 人和模型都能直接读写，不需要额外依赖；
 * 2. 解析规则只有一条，出错时容易定位到具体行。
 *
 * 约定：
 *   # 第7章 借刀           → 标题
 *   - 视角：沈砚            → 字段
 *   ## 场景 1              → 场景块（块内的 `- 键：值` 归属该场景）
 */

/** 把一行 `- 键：值` 拆开；不是这种行就返回 null。中英文冒号都接受。 */
export function parseFieldLine(line) {
  const m = /^[-*]\s*([^：:]{1,30})[：:]\s*(.*)$/.exec(line.trim())
  if (!m) return null
  return { key: m[1].trim(), value: m[2].trim() }
}

/** 把「沈砚、老周, 褚九」拆成数组，去空去重。 */
export function splitList(value) {
  if (!value) return []
  return [...new Set(
    String(value)
      .split(/[、,，/|]/)
      .map((s) => s.trim())
      .filter(Boolean),
  )]
}

/**
 * 解析细纲/设定文档。
 * @param {string} markdown
 * @returns {{ title: string, fields: Record<string,string>, scenes: Array<{ heading: string, fields: Record<string,string> }>, loose: string[] }}
 */
export function parseDocument(markdown) {
  const result = { title: '', fields: {}, scenes: [], loose: [] }
  let scene = null

  for (const raw of String(markdown ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('# ')) {
      if (!result.title) result.title = line.slice(2).trim()
      continue
    }

    if (/^#{2,6}\s*场景/.test(line)) {
      scene = { heading: line.replace(/^#+\s*/, '').trim(), fields: {} }
      result.scenes.push(scene)
      continue
    }

    if (/^#{2,6}\s*/.test(line)) {
      scene = null
      continue
    }

    const field = parseFieldLine(line)
    if (field) {
      if (scene) scene.fields[field.key] = field.value
      else result.fields[field.key] = field.value
      continue
    }

    result.loose.push(line)
  }

  return result
}

/** 取字段，支持若干别名（例如「目标字数」也可以写成「字数」）。 */
export function pick(fields, names, fallback = '') {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== '') return fields[name]
  }
  return fallback
}

/** 按字符数截断，超出时补省略标记。 */
export function clip(text, max) {
  const s = String(text ?? '')
  return s.length <= max ? s : `${s.slice(0, max)}\n…（已截断）`
}
