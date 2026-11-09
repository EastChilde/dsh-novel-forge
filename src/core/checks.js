/**
 * 质量闸门：能用规则判断的，就别让模型自己说「我检查过了」。
 *
 * 分两级：
 * - blocking：这章不该进入「已完成」，模型应改完再交；
 * - warning：可以交，但要在汇报里说明。
 *
 * 注意：这里只做机械判断，判断不了的一律不假装能判断。
 */

/** 中文里最容易暴露「AI 写的」的一批词。可由配置覆盖。 */
export const DEFAULT_AI_FLAVOR = [
  '仿佛', '宛如', '犹如', '不禁', '顿时', '瞬间', '一丝', '一抹',
  '不易察觉', '意味深长', '下意识', '不由自主', '眼中闪过', '嘴角微微',
  '空气仿佛', '心中一沉', '心中一凛', '缓缓开口', '淡淡说道', '沉默片刻',
  '不知为何', '莫名', '深深地', '微微',
]

/** 章末钩子的粗略特征：问句、感叹、未完成的动作、突然出现的东西。 */
const HOOK_MARKERS = [
  '？', '！', '忽然', '突然', '竟然', '没想到', '却见', '门外', '脚步声',
  '敲门', '响了', '亮起', '出现', '走进', '盯', '低声', '与此同时', '然而',
]

export function countChars(text) {
  return String(text ?? '').replace(/\s/g, '').length
}

/** 对话占比：引号内字符数 / 全文字符数。 */
export function dialogueRatio(text) {
  const total = countChars(text)
  if (total === 0) return 0
  let quoted = 0
  const re = /[「“"]([^」”"]*)[」”"]/g
  let m
  while ((m = re.exec(String(text))) !== null) {
    quoted += countChars(m[1])
  }
  return quoted / total
}

export function splitSentences(text) {
  return String(text ?? '')
    .split(/[。！？…]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function analyze(text) {
  const source = String(text ?? '')
  const chars = countChars(source)
  const paragraphs = source.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const sentences = splitSentences(source)
  const dialogue = dialogueRatio(source)
  const avgSentence = sentences.length === 0
    ? 0
    : Math.round(sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length)

  return {
    chars,
    paragraphs: paragraphs.length,
    sentences: sentences.length,
    avgSentence,
    dialogueRatio: Number(dialogue.toFixed(3)),
    longestParagraph: paragraphs.reduce((max, p) => Math.max(max, countChars(p)), 0),
  }
}

export function aiFlavorHits(text, words = DEFAULT_AI_FLAVOR) {
  const hits = {}
  for (const word of words) {
    const count = String(text).split(word).length - 1
    if (count > 0) hits[word] = count
  }
  return hits
}

/**
 * 连续三段以上以相同两个字开头，基本就是模具句。
 * 只看「连续」，不看总数——整章里同一个名字出现七次很正常，
 * 连着三句都用同一个开头才是毛病。
 */
export function repeatedOpenings(text, threshold = 3) {
  const maxRun = new Map()
  let prev = null
  let run = 0

  for (const raw of splitSentences(text)) {
    // 去掉开头的引号、省略号和空白，否则一句对白会被算成「」开头。
    const sentence = raw.replace(/^[「」“”"'‘’\s…—、]+/, '')
    const key = sentence.slice(0, 2)
    if (key.length < 2) {
      prev = null
      run = 0
      continue
    }
    if (key === prev) run += 1
    else {
      prev = key
      run = 1
    }
    maxRun.set(key, Math.max(maxRun.get(key) ?? 0, run))
  }

  return [...maxRun.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ opening: key, count }))
}

/** 末段是否留下钩子；返回可解释的结论，而不是一个分数。 */
export function hookCheck(text, declaredHook = '') {
  const tail = String(text ?? '').slice(-220)
  if (!tail) return { ok: false, reason: '正文为空' }
  const marker = HOOK_MARKERS.find((m) => tail.includes(m))
  if (!marker) return { ok: false, reason: '最后 200 字没有悬念/动作/新信息特征' }
  if (declaredHook) {
    // 用二元组重合度判断「写的是不是同一个钩子」，比整串包含宽容得多。
    const core = declaredHook.replace(/^[^：:\-]*[：:\-]/, '')
    const grams = (s) => {
      const set = new Set()
      for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2))
      return set
    }
    const declared = grams(core)
    const actual = grams(tail)
    const hit = [...declared].filter((g) => actual.has(g)).length
    const overlap = declared.size === 0 ? 1 : hit / declared.size
    if (overlap < 0.2) {
      return { ok: true, reason: `末段有钩子特征（${marker}），但与细纲声明的钩子「${declaredHook}」重合度低，请确认是否写偏` }
    }
  }
  return { ok: true, reason: `末段命中钩子特征「${marker}」` }
}

/**
 * 跑一章的全部检查。
 * @param {object} input
 * @param {string} input.text 正文
 * @param {object|null} input.outline 细纲解析结果
 * @param {object} input.state 权威状态
 * @param {object} input.project 项目元信息
 * @param {object} [input.options]
 */
export function runChecks({ text, outline, state, project, options = {} }) {
  const tolerance = Number(options.wordTolerance ?? 0.15)
  const aiWords = options.aiFlavorWords ?? DEFAULT_AI_FLAVOR
  const aiLimit = Number(options.aiDensityLimit ?? 8)
  const [dMin, dMax] = options.dialogueRange ?? [0.15, 0.55]

  const stats = analyze(text)
  const target = Number(outline?.targetWords || project?.targetWords || 2500)
  const blocking = []
  const warnings = []

  const low = Math.floor(target * (1 - tolerance))
  const high = Math.ceil(target * (1 + tolerance))
  if (stats.chars < low) {
    blocking.push({ code: 'words-low', message: `字数 ${stats.chars}，低于下限 ${low}（目标 ${target}）` })
  } else if (stats.chars > high) {
    blocking.push({ code: 'words-high', message: `字数 ${stats.chars}，超过上限 ${high}（目标 ${target}）` })
  }

  if (!String(text).trim()) blocking.push({ code: 'empty', message: '正文为空' })

  if (outline && !outline.title) blocking.push({ code: 'title', message: '细纲缺少章节标题' })

  const hits = aiFlavorHits(text, aiWords)
  const hitTotal = Object.values(hits).reduce((a, b) => a + b, 0)
  const density = stats.chars > 0 ? (hitTotal / stats.chars) * 1000 : 0
  if (density > aiLimit) {
    warnings.push({
      code: 'ai-flavor',
      message: `AI 味词每千字 ${density.toFixed(1)} 个（阈值 ${aiLimit}）：${Object.entries(hits).map(([w, c]) => `${w}×${c}`).join('、')}`,
    })
  }

  if (stats.dialogueRatio < dMin) {
    warnings.push({ code: 'dialogue-low', message: `对话占比 ${(stats.dialogueRatio * 100).toFixed(1)}%，偏低（${dMin * 100}%–${dMax * 100}%）` })
  } else if (stats.dialogueRatio > dMax) {
    warnings.push({ code: 'dialogue-high', message: `对话占比 ${(stats.dialogueRatio * 100).toFixed(1)}%，偏高（${dMin * 100}%–${dMax * 100}%）` })
  }

  const repeats = repeatedOpenings(text)
  if (repeats.length > 0) {
    warnings.push({
      code: 'repeat-opening',
      message: `句首重复：${repeats.map((r) => `「${r.opening}」×${r.count}`).join('、')}`,
    })
  }

  if (stats.longestParagraph > 300) {
    warnings.push({ code: 'long-paragraph', message: `最长段落 ${stats.longestParagraph} 字，手机阅读会累` })
  }

  if (outline?.hook) {
    const hook = hookCheck(text, outline.hook)
    if (!hook.ok) warnings.push({ code: 'hook-miss', message: `章末钩子：${hook.reason}` })
    else if (hook.reason.includes('重合度低')) warnings.push({ code: 'hook-drift', message: `章末钩子：${hook.reason}` })
  }

  // 伏笔逾期：以「计划回收章」为准，不猜剧情重要性。
  const currentNo = Number(outline?.no ?? (state?.lastChapter ?? 0) + 1)
  for (const f of state?.foreshadow ?? []) {
    if (f.status === 'closed' || !f.due) continue
    if (currentNo >= Number(f.due)) {
      warnings.push({
        code: 'foreshadow-overdue',
        message: `伏笔 ${f.id}「${f.text ?? ''}」计划第 ${f.due} 章回收，现在是第 ${currentNo} 章`,
      })
    }
  }

  return { blocking, warnings, stats, target }
}
