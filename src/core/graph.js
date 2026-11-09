/**
 * 关系图数据：给面板画思维图用。
 *
 * 数据来源都是人写的 Markdown，不引入第二套真相：
 * - 人物节点：01-设定/人物-*.md
 * - 地点 / 势力：世界观.md 的「## 地点」「## 势力」下的 `- 名称：说明`
 * - 边：关系网.md 的表格行 + 人物卡「## 关系」下的 `- 对方：关系`
 */
import { join } from 'node:path'
import { FILES, characterRel } from './paths.js'
import { readText } from './project.js'

/** 取某个二级标题下的一级列表项。 */
export function parseSectionBullets(markdown, heading) {
  const out = []
  let inside = false
  for (const raw of String(markdown ?? '').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      inside = line.slice(3).trim().includes(heading)
      continue
    }
    if (!inside || !line) continue
    const match = /^[-*]\s+(?:\*\*)?([^：:*]+?)(?:\*\*)?\s*[：:]\s*(.*)$/.exec(line)
    if (match) out.push({ name: match[1].trim(), desc: match[2].trim() })
  }
  return out
}

/** 解析关系网表格：| 甲 | 乙 | 关系 | 张力 | */
export function parseRelationTable(markdown) {
  const rows = []
  for (const raw of String(markdown ?? '').split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 3) continue
    if (cells[0] === '甲' || /^:?-{2,}:?$/.test(cells[0])) continue
    if (!cells[0] || !cells[1]) continue
    rows.push({ from: cells[0], to: cells[1], label: cells[2] || '' })
  }
  return rows
}

/** 解析人物卡里的「## 关系」小节。 */
export function parseCardRelations(markdown) {
  const out = []
  let inside = false
  for (const raw of String(markdown ?? '').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      inside = line.slice(3).trim() === '关系'
      continue
    }
    if (!inside || !line) continue
    const match = /^[-*]\s+([^：:]+)[：:]\s*(.*)$/.exec(line)
    if (match) out.push({ to: match[1].trim(), label: match[2].trim() })
  }
  return out
}

/**
 * @param {string} dir 书目录
 * @param {string[]} characterNames 人物名（来自目录扫描）
 * @returns {Promise<{ nodes: object[], edges: object[] }>}
 */
export async function buildGraph(dir, characterNames) {
  const world = await readText(join(dir, FILES.world), '')
  const relationsDoc = await readText(join(dir, FILES.relations), '')

  const places = parseSectionBullets(world, '地点')
  const factions = parseSectionBullets(world, '势力')

  const nodes = [
    ...characterNames.map((name) => ({
      id: `p:${name}`,
      label: name,
      type: 'character',
      path: join(dir, characterRel(name)),
    })),
    ...places.map((place) => ({
      id: `l:${place.name}`,
      label: place.name,
      type: 'place',
      path: join(dir, FILES.world),
    })),
    ...factions.map((faction) => ({
      id: `f:${faction.name}`,
      label: faction.name,
      type: 'faction',
      path: join(dir, FILES.world),
    })),
  ]

  const byLabel = new Map(nodes.map((node) => [node.label, node]))
  // 同一对人只画一条线；两个方向的关系合并成「甲 / 乙」，避免虚线重叠。
  const byPair = new Map()
  // 关系描述经常带一串解释，图上只需要短标签。
  const shortLabel = (value) => String(value ?? '').split(/[，,；;。]/)[0].trim().slice(0, 14)
  const push = (fromLabel, toLabel, label) => {
    const from = byLabel.get(fromLabel)
    const to = byLabel.get(toLabel)
    if (!from || !to || from.id === to.id) return
    const short = shortLabel(label)
    const key = [from.id, to.id].sort().join('|')
    const existing = byPair.get(key)
    if (!existing) {
      byPair.set(key, { from: from.id, to: to.id, label: short })
      return
    }
    if (short && !existing.label.split(' / ').includes(short)) {
      existing.label = existing.label ? `${existing.label} / ${short}` : short
    }
  }

  for (const row of parseRelationTable(relationsDoc)) push(row.from, row.to, row.label)

  for (const name of characterNames) {
    const card = await readText(join(dir, characterRel(name)), '')
    for (const relation of parseCardRelations(card)) push(name, relation.to, relation.label)
  }

  return { nodes, edges: [...byPair.values()] }
}
