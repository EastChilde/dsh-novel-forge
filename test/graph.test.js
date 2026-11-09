import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildGraph, parseRelationTable, parseSectionBullets } from '../src/core/graph.js'
import { createBook, writeTextAtomic } from '../src/core/project.js'

test('解析世界观的小节列表', () => {
  const md = `# 世界观

## 地点

- **落雁县**：北境最南的县城
- 断龙山：山脊上有旧关墙

## 势力

- 镇北司：朝廷监察
`
  assert.deepEqual(parseSectionBullets(md, '地点').map((x) => x.name), ['落雁县', '断龙山'])
  assert.deepEqual(parseSectionBullets(md, '势力').map((x) => x.name), ['镇北司'])
})

test('解析关系网表格', () => {
  const md = `| 甲 | 乙 | 关系 | 张力 |
|---|---|---|---|
| 沈砚 | 褚九 | 下属 / 杀父嫌疑人 | 互相利用 |
`
  const rows = parseRelationTable(md)
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0], { from: '沈砚', to: '褚九', label: '下属 / 杀父嫌疑人' })
})

test('关系图合并人物、地点、势力与边，且不重复', async () => {
  const root = await mkdtemp(join(tmpdir(), 'graph-'))
  const { dir } = await createBook(root, { title: '北境无神' })
  await writeTextAtomic(join(dir, '01-设定', '人物-沈砚.md'), '# 沈砚\n\n## 关系\n\n- 褚九：杀父嫌疑人\n- 老周：父亲旧友\n')
  await writeTextAtomic(join(dir, '01-设定', '人物-褚九.md'), '# 褚九\n\n## 关系\n\n- 沈砚：下属\n')
  await writeTextAtomic(join(dir, '01-设定', '世界观.md'), '# 世界观\n\n## 地点\n\n- 落雁县：县城\n\n## 势力\n\n- 镇北司：监察\n')
  await writeTextAtomic(join(dir, '01-设定', '关系网.md'), '| 甲 | 乙 | 关系 |\n|---|---|---|\n| 沈砚 | 褚九 | 杀父嫌疑人 |\n| 沈砚 | 老周 | 故人之子 |\n| 沈砚 | 镇北司 | 被监察 |\n')

  const graph = await buildGraph(dir, ['沈砚', '褚九'])
  const labels = graph.nodes.map((node) => node.label)
  assert.ok(labels.includes('沈砚'))
  assert.ok(labels.includes('落雁县'))
  assert.ok(labels.includes('镇北司'))
  // 老周 没有人物卡，关系表里的这条边应被忽略（不凭空造节点）。
  assert.equal(labels.includes('老周'), false)

  const pairs = graph.edges.map((edge) => [edge.from, edge.to].sort().join('|'))
  assert.equal(new Set(pairs).size, pairs.length, '不应有重复边')
  assert.ok(graph.edges.some((edge) => edge.label.includes('杀父嫌疑人')))
  assert.ok(graph.edges.some((edge) => edge.label.includes('被监察')))
})
