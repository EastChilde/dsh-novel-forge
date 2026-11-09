window.__ModuleLoader__.load({
  id: 'dsh-novel-forge',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useRef, useState } = React

    const PANEL_ID = 'novel'

    const S = {
      page: {
        height: '100%',
        overflow: 'auto',
        padding: '20px 24px 48px',
        boxSizing: 'border-box',
        color: 'inherit',
        fontSize: '13px',
      },
      inner: { maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' },
      topbar: { display: 'flex', alignItems: 'center', gap: '10px' },
      brand: { fontSize: '17px', fontWeight: 600, letterSpacing: '.02em' },
      grow: { flex: '1 1 auto' },
      dim: { opacity: 0.55 },
      button: {
        fontSize: '12px',
        padding: '4px 10px',
        background: 'transparent',
        color: 'inherit',
        border: '1px solid rgba(128,128,128,.45)',
        borderRadius: '6px',
        cursor: 'pointer',
      },
      primary: {
        fontSize: '12px',
        padding: '5px 12px',
        background: 'currentColor',
        color: 'Canvas',
        border: '1px solid transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        opacity: 0.9,
      },
      layout: { display: 'grid', gridTemplateColumns: 'minmax(200px, 248px) minmax(0, 1fr)', gap: '16px', alignItems: 'start' },
      card: {
        border: '1px solid rgba(128,128,128,.25)',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      },
      shelf: { border: '1px solid rgba(128,128,128,.25)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
      shelfHead: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        padding: '10px 12px',
        borderBottom: '1px solid rgba(128,128,128,.18)',
      },
      shelfBody: { padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' },
      bookRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '7px 9px',
        borderRadius: '7px',
        cursor: 'pointer',
        border: '1px solid transparent',
      },
      bookTitle: { fontWeight: 580, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' },
      stat: { display: 'flex', flexDirection: 'column', gap: '2px' },
      statValue: { fontSize: '18px', fontWeight: 600 },
      bar: { height: '5px', background: 'rgba(128,128,128,.22)', borderRadius: '3px', overflow: 'hidden' },
      columns: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' },
      section: { border: '1px solid rgba(128,128,128,.25)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
      sectionHead: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(128,128,128,.18)',
      },
      sectionTitle: { fontWeight: 600, fontSize: '13px' },
      sectionBody: { padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' },
      row: { display: 'flex', alignItems: 'baseline', gap: '10px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' },
      rowMain: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
      label: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      sub: { fontSize: '11px', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      meta: { flex: '0 0 auto', fontSize: '11px', opacity: 0.55 },
      empty: { opacity: 0.55, padding: '10px 8px', lineHeight: 1.6 },
      error: { color: '#e5534b', lineHeight: 1.7, wordBreak: 'break-all' },
      chip: { fontSize: '10px', padding: '0 5px', lineHeight: '16px', borderRadius: '4px', border: '1px solid rgba(128,128,128,.4)', opacity: 0.75 },
      form: { display: 'flex', flexDirection: 'column', gap: '7px', padding: '10px 12px', borderTop: '1px solid rgba(128,128,128,.18)' },
      input: {
        fontSize: '12px',
        padding: '5px 8px',
        background: 'transparent',
        color: 'inherit',
        border: '1px solid rgba(128,128,128,.45)',
        borderRadius: '6px',
        width: '100%',
        boxSizing: 'border-box',
      },
    }

    function useSnapshot() {
      const [state, setState] = useState({ loading: true, error: null, data: null })
      const load = useCallback(() => {
        setState((prev) => ({ ...prev, loading: true }))
        fetch('/novel/api/snapshot', { cache: 'no-store' })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '请求失败')
            setState({ loading: false, error: null, data: body })
          })
          .catch((error) => setState({ loading: false, error: String((error && error.message) || error), data: null }))
      }, [])
      useEffect(() => { load() }, [load])
      return { loading: state.loading, error: state.error, data: state.data, reload: load }
    }

    function Row({ label, sub, meta, hint, onClick }) {
      return h('div', {
        style: S.row,
        title: hint || undefined,
        onClick,
        onMouseEnter: (event) => { event.currentTarget.style.background = 'rgba(128,128,128,.1)' },
        onMouseLeave: (event) => { event.currentTarget.style.background = 'transparent' },
      },
        h('div', { style: S.rowMain },
          h('span', { style: S.label }, label),
          sub ? h('span', { style: S.sub }, sub) : null),
        meta ? h('span', { style: S.meta }, meta) : null,
      )
    }

    function Section({ title, count, children, extra }) {
      return h('div', { style: S.section },
        h('div', { style: S.sectionHead },
          h('span', { style: S.sectionTitle }, title),
          h('span', { style: S.meta }, String(count == null ? '' : count)),
          h('span', { style: S.grow }),
          extra || null),
        h('div', { style: S.sectionBody }, children))
    }

    function CreateForm({ cwd, onCreated, onCancel }) {
      const [title, setTitle] = useState('')
      const [genre, setGenre] = useState('')
      const [premise, setPremise] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')

      const submit = () => {
        if (!title.trim() || busy) return
        setBusy(true)
        setError('')
        fetch('/novel/api/book', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cwd, title: title.trim(), genre: genre.trim(), premise: premise.trim() }),
        })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '建书失败')
            onCreated(body.slug)
          })
          .catch((err) => { setError(String((err && err.message) || err)); setBusy(false) })
      }

      return h('div', { style: S.form },
        h('input', { style: S.input, placeholder: '书名（必填）', value: title, onChange: (e) => setTitle(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') submit() } }),
        h('input', { style: S.input, placeholder: '题材，如 东方志怪·权谋', value: genre, onChange: (e) => setGenre(e.target.value) }),
        h('input', { style: S.input, placeholder: '一句话想法（可选）', value: premise, onChange: (e) => setPremise(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') submit() } }),
        error ? h('div', { style: { ...S.error, fontSize: '11px' } }, error) : null,
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('button', { style: S.primary, onClick: submit, disabled: busy }, busy ? '创建中…' : '创建'),
          h('button', { style: S.button, onClick: onCancel, disabled: busy }, '取消')),
      )
    }

    function renderLines(text) {
      return String(text).split('\n').map((line, index) => {
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = heading[1].length
          return h('div', {
            key: index,
            style: { fontWeight: 600, fontSize: level <= 1 ? '17px' : '14px', marginTop: level <= 1 ? '4px' : '14px' },
          }, heading[2])
        }
        if (!line.trim()) return h('div', { key: index, style: { height: '7px' } })
        return h('div', { key: index, style: { lineHeight: 1.95, whiteSpace: 'pre-wrap' } }, line)
      })
    }

    function Reader({ view, onClose, onSaved }) {
      const [editing, setEditing] = useState(false)
      const [draft, setDraft] = useState('')
      const [saving, setSaving] = useState(false)
      const [saveError, setSaveError] = useState('')
      const [note, setNote] = useState('')

      const begin = () => { setDraft(view.text || ''); setSaveError(''); setEditing(true) }
      const cancel = () => { setEditing(false); setSaveError('') }
      const save = () => {
        if (saving) return
        setSaving(true)
        setSaveError('')
        fetch('/novel/api/file', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: view.path, text: draft }),
        })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '保存失败')
            setSaving(false)
            setEditing(false)
            setNote(body && body.words ? '已保存 · ' + body.words + ' 字' : '已保存')
            onSaved(draft)
          })
          .catch((error) => { setSaveError(String((error && error.message) || error)); setSaving(false) })
      }

      useEffect(() => {
        if (!editing) return undefined
        const onKey = (event) => {
          if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
            event.preventDefault()
            save()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      })

      const bar = h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        h('button', { style: S.button, onClick: onClose }, '← 返回'),
        h('span', { style: { fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, view.label),
        h('span', { style: S.grow }),
        note ? h('span', { style: S.meta }, note) : null,
        editing
          ? h(React.Fragment, null,
            h('button', { style: S.primary, onClick: save, disabled: saving }, saving ? '保存中…' : '保存'),
            h('button', { style: S.button, onClick: cancel, disabled: saving }, '取消'))
          : h('button', { style: S.button, onClick: begin }, '编辑'),
      )

      const body = view.loading
        ? h('div', { style: S.empty }, '读取中…')
        : view.error
          ? h('div', { style: S.error }, view.error)
          : editing
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              h('textarea', {
                style: {
                  width: '100%',
                  minHeight: '460px',
                  boxSizing: 'border-box',
                  padding: '14px 16px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '13px',
                  lineHeight: 1.8,
                  color: 'inherit',
                  background: 'transparent',
                  border: '1px solid rgba(128,128,128,.35)',
                  borderRadius: '10px',
                  resize: 'vertical',
                },
                value: draft,
                onChange: (event) => setDraft(event.target.value),
              }),
              saveError ? h('div', { style: S.error }, saveError) : null,
              h('div', { style: { ...S.sub, opacity: 0.5 } }, '⌘S / Ctrl+S 保存。改正文只会重算这一章字数；人物状态与伏笔需要让我重新提交一次。'))
            : h('div', {
              style: {
                border: '1px solid rgba(128,128,128,.25)',
                borderRadius: '10px',
                padding: '22px 26px',
                maxWidth: '760px',
                fontSize: '14px',
              },
            }, renderLines(view.text))

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, bar, body)
    }

    function GraphView({ graph, onOpen }) {
      const width = 880
      const height = 560
      const [scale, setScale] = useState(1)
      const [offset, setOffset] = useState({ x: 0, y: 0 })
      const drag = useRef(null)
      const boxRef = useRef(null)

      useEffect(() => {
        const element = boxRef.current
        if (!element) return undefined
        const onWheel = (event) => {
          event.preventDefault()
          setScale((prev) => Math.min(2.6, Math.max(0.45, prev * (event.deltaY > 0 ? 0.92 : 1.08))))
        }
        element.addEventListener('wheel', onWheel, { passive: false })
        return () => element.removeEventListener('wheel', onWheel)
      }, [])
      const nodes = (graph && graph.nodes) || []
      const edges = (graph && graph.edges) || []
      const byType = { character: [], place: [], faction: [] }
      for (const node of nodes) (byType[node.type] || (byType[node.type] = [])).push(node)

      const branches = [
        { type: 'character', label: '人物', angle: -Math.PI / 2 },
        { type: 'place', label: '地点', angle: Math.PI / 6 },
        { type: 'faction', label: '势力', angle: (Math.PI * 5) / 6 },
      ].filter((branch) => (byType[branch.type] || []).length > 0)

      const cx = width / 2
      const cy = height / 2
      const R1 = 118
      const R2 = 248
      const positions = {}
      const branchPoints = {}
      const leaves = []

      for (const branch of branches) {
        const bx = cx + Math.cos(branch.angle) * R1
        const by = cy + Math.sin(branch.angle) * R1
        branchPoints[branch.type] = { x: bx, y: by }
        const list = byType[branch.type] || []
        const spread = Math.min(Math.PI * 0.85, 0.34 * Math.max(list.length - 1, 1))
        list.forEach((node, index) => {
          const t = list.length === 1 ? 0 : index / (list.length - 1) - 0.5
          const angle = branch.angle + t * spread
          const x = cx + Math.cos(angle) * R2
          const y = cy + Math.sin(angle) * R2
          positions[node.id] = { x, y }
          leaves.push({ node, x, y })
        })
      }

      const elements = []
      let key = 0

      for (const edge of edges) {
        const from = positions[edge.from]
        const to = positions[edge.to]
        if (!from || !to) continue
        elements.push(h('line', {
          key: 'e' + key++,
          x1: from.x, y1: from.y, x2: to.x, y2: to.y,
          stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.28, strokeDasharray: '3 4',
        }))
      }

      for (const branch of branches) {
        const point = branchPoints[branch.type]
        elements.push(h('line', {
          key: 'b' + key++,
          x1: cx, y1: cy, x2: point.x, y2: point.y,
          stroke: 'currentColor', strokeWidth: 1.4, strokeOpacity: 0.5,
        }))
        for (const leaf of leaves.filter((item) => item.node.type === branch.type)) {
          elements.push(h('line', {
            key: 'l' + key++,
            x1: point.x, y1: point.y, x2: leaf.x, y2: leaf.y,
            stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.35,
          }))
        }
      }

      for (const branch of branches) {
        const point = branchPoints[branch.type]
        elements.push(h('g', { key: 'bp' + key++ },
          h('circle', { cx: point.x, cy: point.y, r: 5, fill: 'currentColor', fillOpacity: 0.75 }),
          h('text', {
            x: point.x, y: point.y - 12,
            textAnchor: 'middle', fontSize: 12, fontWeight: 600, fill: 'currentColor',
          }, branch.label)))
      }

      for (const leaf of leaves) {
        const clickable = Boolean(leaf.node.path)
        elements.push(h('g', {
          key: 'lp' + key++,
          style: { cursor: clickable ? 'pointer' : 'default' },
          onClick: clickable ? () => onOpen(leaf.node.path, leaf.node.label) : undefined,
        },
          h('circle', { cx: leaf.x, cy: leaf.y, r: 4, fill: 'currentColor', fillOpacity: 0.55 }),
          h('text', {
            x: leaf.x,
            y: leaf.y + 18,
            textAnchor: 'middle', fontSize: 11, fill: 'currentColor', fillOpacity: 0.85,
          }, String(leaf.node.label).slice(0, 10)),
        ))
      }

      return h('div', {
        style: {
          border: '1px solid rgba(128,128,128,.25)',
          borderRadius: '10px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px' } },
          h('button', { style: S.button, onClick: () => setScale((prev) => Math.min(2.6, prev + 0.15)) }, '+'),
          h('button', { style: S.button, onClick: () => setScale((prev) => Math.max(0.45, prev - 0.15)) }, '−'),
          h('button', {
            style: S.button,
            onClick: () => { setScale(1); setOffset({ x: 0, y: 0 }) },
          }, '重置'),
          h('span', { style: { ...S.meta, marginLeft: '4px' } }, '拖拽平移 · 滚轮缩放'),
        ),
        h('div', { ref: boxRef, style: { overflow: 'hidden', borderRadius: '8px' } },
          h('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            width: '100%',
            height: 'auto',
            style: { display: 'block', minWidth: '620px', cursor: 'grab', userSelect: 'none', touchAction: 'none' },
            role: 'img',
            'aria-label': '人物、地点、势力关系图',
            onPointerDown: (event) => {
              drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
              try { event.currentTarget.setPointerCapture(event.pointerId) } catch (error) { /* 忽略 */ }
            },
            onPointerMove: (event) => {
              const start = drag.current
              if (!start) return
              setOffset({ x: start.ox + (event.clientX - start.x), y: start.oy + (event.clientY - start.y) })
            },
            onPointerUp: () => { drag.current = null },
            onPointerLeave: () => { drag.current = null },
          }, h('g', { transform: 'translate(' + offset.x + ' ' + offset.y + ') scale(' + scale + ')' }, ...elements))),
        h('div', { style: { ...S.sub, padding: '2px 4px 4px', opacity: 0.5 } },
          '人物 / 地点 / 势力来自设定文件；虚线是关系网与人物卡里写的关系。点节点可打开对应文件。'))
    }

    function NovelPage(props) {
      const snapshot = useSnapshot()
      const books = (snapshot.data && snapshot.data.books) || []
      const cwd = snapshot.data && snapshot.data.cwd
      const [activeSlug, setActiveSlug] = useState('')
      const [creating, setCreating] = useState(false)
      const [viewing, setViewing] = useState(null)
      const [mode, setMode] = useState('list')
      const [query, setQuery] = useState('')
      const [pageNote, setPageNote] = useState('')
      const [renaming, setRenaming] = useState(false)
      const [renameDraft, setRenameDraft] = useState('')
      const [confirmDelete, setConfirmDelete] = useState(false)

      const activeBook = books.find((b) => b.slug === activeSlug) || books[0] || null

      const open = (path, label) => {
        if (!path) return
        const name = label || String(path).split('/').pop()
        setViewing({ path, label: name, loading: true, text: '', error: '' })
        fetch('/novel/api/file?path=' + encodeURIComponent(path), { cache: 'no-store' })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '读取失败')
            setViewing({ path, label: name, loading: false, text: body.text || '', error: '' })
          })
          .catch((error) => setViewing({ path, label: name, loading: false, text: '', error: String((error && error.message) || error) }))
      }

      const created = (slug) => {
        setCreating(false)
        setActiveSlug(slug)
        snapshot.reload()
      }

      const topbar = h('div', { style: S.topbar },
        h('span', { style: S.brand }, '小说'),
        h('span', { style: S.meta }, books.length > 0 ? '共 ' + books.length + ' 本' : ''),
        h('span', { style: S.grow }),
        h('button', {
          style: S.button,
          onClick: () => {
            const ok = props.writeNext ? props.writeNext() : false
            setPageNote(ok ? '已在会话里准备好「继续写下一章」，按回车开始' : '先打开一个会话，再点写下一章')
          },
        }, '✍ 写下一章'),
        h('button', { style: S.button, onClick: snapshot.reload }, snapshot.loading ? '读取中…' : '刷新'),
      )

      if (snapshot.error) {
        return h('div', { style: S.page }, h('div', { style: S.inner }, topbar, h('div', { style: S.error }, snapshot.error)))
      }

      const shelf = h('div', { style: S.shelf },
        h('div', { style: S.shelfHead },
          h('span', { style: S.sectionTitle }, '书架'),
          h('span', { style: S.meta }, String(books.length))),
        h('div', { style: S.shelfBody },
          books.length === 0
            ? h('div', { style: S.empty }, '还没有书。新建一本，或者说一个想法让我来建。')
            : books.map((book) => {
              const selected = activeBook && book.slug === activeBook.slug
              const total = book.totalChapters || 0
              return h('div', {
                key: book.slug,
                style: {
                  ...S.bookRow,
                  borderColor: selected ? 'rgba(128,128,128,.55)' : 'transparent',
                  background: selected ? 'rgba(128,128,128,.12)' : 'transparent',
                },
                onClick: () => setActiveSlug(book.slug),
              },
                h('span', { style: S.bookTitle }, book.title),
                h('span', { style: S.sub },
                  (book.chapters.length + '/' + total + ' 章') + ' · ' + book.words + ' 字' + (book.genre ? ' · ' + book.genre : '')))
            }),
        ),
        creating
          ? h(CreateForm, { cwd, onCreated: created, onCancel: () => setCreating(false) })
          : h('div', { style: { padding: '8px' } },
            h('button', { style: { ...S.button, width: '100%' }, onClick: () => setCreating(true) }, '+ 新建小说')),
      )

      if (!activeBook) {
        return h('div', { style: S.page }, h('div', { style: S.inner }, topbar, h('div', { style: S.layout }, shelf,
          h('div', { style: S.empty }, snapshot.loading ? '读取中…' : '选一本，或者先新建一本。'))))
      }

      const done = activeBook.chapters.length
      const total = activeBook.totalChapters || 0
      const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
      const nextNo = activeBook.lastChapter + 1
      const hasNextOutline = activeBook.outlines.some((item) => item.name.indexOf(String(nextNo).padStart(3, '0')) >= 0)
      const openForeshadow = activeBook.foreshadow.filter((f) => f.status !== 'closed')
      const settings = activeBook.bible.filter((item) => item.name.indexOf('人物-') !== 0)
      const normalizedQuery = query.trim().toLowerCase()
      const filteredChapters = normalizedQuery
        ? activeBook.chapters.filter((chapter) => (chapter.title + ' ' + (chapter.summary || '')).toLowerCase().includes(normalizedQuery))
        : activeBook.chapters

      const jumpTo = (chapterNo) => {
        if (!chapterNo) { setPageNote('这条伏笔还没定回收章'); return }
        const chapter = activeBook.chapters.find((item) => item.no === Number(chapterNo))
        if (chapter && chapter.path) { open(chapter.path, '第' + chapter.no + '章 ' + chapter.title); return }
        const outline = activeBook.outlines.find((item) => item.name.indexOf(String(chapterNo).padStart(3, '0')) >= 0)
        if (outline) { open(outline.path, '细纲 ' + chapterNo); return }
        setPageNote('第 ' + chapterNo + ' 章还没有正文，也没有细纲')
      }

      const exportBook = (format) => {
        setPageNote('正在导出…')
        fetch('/novel/api/export', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cwd, slug: activeBook.slug, format: format || 'md' }),
        })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '导出失败')
            setPageNote('已导出 ' + body.rel + ' · ' + body.chapters + ' 章 · ' + body.words + ' 字')
          })
          .catch((error) => setPageNote('导出失败：' + String((error && error.message) || error)))
      }

      const submitRename = () => {
        const next = renameDraft.trim()
        if (!next) return
        fetch('/novel/api/rename', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cwd, slug: activeBook.slug, title: next }),
        })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '重命名失败')
            setRenaming(false)
            setPageNote('已改名为《' + body.title + '》')
            snapshot.reload()
          })
          .catch((error) => setPageNote('重命名失败：' + String((error && error.message) || error)))
      }

      const submitDelete = () => {
        fetch('/novel/api/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cwd, slug: activeBook.slug }),
        })
          .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body && body.error ? body.error : '删除失败')
            setConfirmDelete(false)
            setActiveSlug('')
            setPageNote('已移到回收站：' + body.trashed)
            snapshot.reload()
          })
          .catch((error) => setPageNote('删除失败：' + String((error && error.message) || error)))
      }

      const detail = viewing
        ? h(Reader, {
          view: viewing,
          onClose: () => setViewing(null),
          onSaved: (text) => setViewing({ ...viewing, text }),
        })
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        h('div', { style: S.card },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } },
            renaming
              ? h(React.Fragment, null,
                h('input', {
                  style: { ...S.input, width: '180px', fontSize: '14px' },
                  value: renameDraft,
                  autoFocus: true,
                  onChange: (event) => setRenameDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') submitRename()
                    if (event.key === 'Escape') setRenaming(false)
                  },
                }),
                h('button', { style: S.primary, onClick: submitRename }, '保存'),
                h('button', { style: S.button, onClick: () => setRenaming(false) }, '取消'))
              : h('span', { style: { fontSize: '15px', fontWeight: 600 } }, activeBook.title),
            h('span', { style: S.meta }, [activeBook.genre, activeBook.platform, activeBook.mode].filter(Boolean).join(' · ')),
            h('span', { style: S.grow }),
            h('div', { style: { display: 'flex', gap: '4px' } },
              h('button', { style: { ...S.button, opacity: mode === 'list' ? 1 : 0.5 }, onClick: () => setMode('list') }, '列表'),
              h('button', { style: { ...S.button, opacity: mode === 'graph' ? 1 : 0.5 }, onClick: () => setMode('graph') }, '关系图'),
              h('button', { style: S.button, onClick: () => exportBook('md') }, '导出 MD'),
              h('button', { style: S.button, onClick: () => exportBook('txt') }, '导出 TXT'),
              h('button', { style: S.button, onClick: () => { setRenameDraft(activeBook.title); setRenaming(true) } }, '重命名'),
              h('button', { style: { ...S.button, color: '#e5534b' }, onClick: () => setConfirmDelete(true) }, '删除'))),

          confirmDelete
            ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: '1px solid rgba(229,83,75,.5)', borderRadius: '8px' } },
              h('span', { style: { fontSize: '12px' } }, '把《' + activeBook.title + '》移到 books/.trash？以后再想找还能捞回来。'),
              h('button', { style: S.primary, onClick: submitDelete }, '确认移到回收站'),
              h('button', { style: S.button, onClick: () => setConfirmDelete(false) }, '算了'))
            : null,
          h('div', { style: S.stats },
            h('div', { style: S.stat }, h('span', { style: S.meta }, '已完成'), h('span', { style: S.statValue }, done + ' / ' + total + ' 章')),
            h('div', { style: S.stat }, h('span', { style: S.meta }, '累计字数'), h('span', { style: S.statValue }, String(activeBook.words))),
            h('div', { style: S.stat }, h('span', { style: S.meta }, '时间锚'), h('span', { style: { fontSize: '13px', paddingTop: '4px' } }, activeBook.timeAnchor || '未记录')),
            h('div', { style: S.stat }, h('span', { style: S.meta }, '下一章'),
              h('span', { style: { fontSize: '13px', paddingTop: '4px' } },
                '第 ' + nextNo + ' 章', h('span', { style: S.chip }, hasNextOutline ? '细纲就绪' : '缺细纲')))),
          h('div', { style: S.bar }, h('div', { style: { height: '100%', background: 'currentColor', opacity: 0.6, width: pct + '%' } })),
        ),

        mode === 'graph'
          ? h(GraphView, { graph: activeBook.graph, onOpen: open })
          : h('div', { style: S.columns },
          h(Section, {
            title: '章节',
            count: filteredChapters.length,
            extra: done > 0
              ? h('input', {
                style: { ...S.input, width: '150px', padding: '2px 8px', fontSize: '11px' },
                placeholder: '搜章节…',
                value: query,
                onChange: (event) => setQuery(event.target.value),
              })
              : null,
          },
            done === 0
              ? h('div', { style: S.empty }, '还没有正文。')
              : filteredChapters.length === 0
                ? h('div', { style: S.empty }, '没有匹配的章节。')
                : filteredChapters.map((chapter) => h(Row, {
                  key: 'ch-' + chapter.no,
                  label: '第' + chapter.no + '章 ' + chapter.title,
                  sub: chapter.summary,
                  meta: chapter.words + ' 字',
                  onClick: () => open(chapter.path, '第' + chapter.no + '章 ' + chapter.title),
                }))),

          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
            h(Section, { title: '细纲', count: activeBook.outlines.length },
              activeBook.outlines.length === 0
                ? h('div', { style: S.empty }, '还没有细纲。')
                : activeBook.outlines.map((item) => h(Row, {
                  key: item.name,
                  label: item.name.replace(/\.md$/, ''),
                  onClick: () => open(item.path),
                }))),

            h(Section, { title: '人物', count: activeBook.characters.length },
              activeBook.characters.length === 0
                ? h('div', { style: S.empty }, '还没有人物卡。')
                : activeBook.characters.map((item) => h(Row, {
                  key: item.name,
                  label: item.name,
                  onClick: () => open(item.path),
                }))),

            h(Section, { title: '设定', count: settings.length },
              settings.length === 0
                ? h('div', { style: S.empty }, '还没有设定文件。')
                : settings.map((item) => h(Row, {
                  key: item.name,
                  label: item.name.replace(/\.md$/, ''),
                  onClick: () => open(item.path),
                }))),

            h(Section, { title: '伏笔', count: openForeshadow.length },
              openForeshadow.length === 0
                ? h('div', { style: S.empty }, '没有未回收的伏笔。')
                : openForeshadow.map((item) => h(Row, {
                  key: item.id,
                  label: item.id + ' ' + item.text,
                  meta: item.due ? '→ 第' + item.due + '章' : '回收章未定',
                  hint: '点击跳到对应章节，没有正文就看细纲',
                  onClick: () => jumpTo(item.due || item.planted),
                }))),

            (activeBook.openQuestions || []).length > 0
              ? h(Section, { title: '未答问题', count: activeBook.openQuestions.length },
                activeBook.openQuestions.map((q, index) => h('div', { key: 'q-' + index, style: { ...S.row, cursor: 'default' } },
                  h('div', { style: S.rowMain }, h('span', { style: S.label }, q)))))
              : null,
          ),
        ),
      )

      return h('div', { style: S.page }, h('div', { style: S.inner }, topbar,
        pageNote ? h('div', { style: S.meta }, pageNote) : null,
        h('div', { style: S.layout }, shelf, detail)))
    }

    function NovelIcon({ size, active }) {
      const edge = size || 18
      return h('svg', {
        width: edge,
        height: edge,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: active ? 2 : 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      },
        h('path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21z' }),
        h('path', { d: 'M4 18.5A2.5 2.5 0 0 1 6.5 16H19' }),
        h('path', { d: 'M8 7.5h7' }),
        h('path', { d: 'M8 11h4' }),
      )
    }

    const inject = ['slots']

    function apply(ctx) {
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        inject: () => ({
          writeNext: () => {
            try {
              const workspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : ctx.uiWorkspace
              if (!workspace || typeof workspace.startSession !== 'function') return false
              workspace.startSession(undefined, { prompt: '继续写下一章', whenDraftExists: 'append' })
              return true
            } catch (error) {
              console.warn('[novel-forge] 无法发起写作', error)
              return false
            }
          },
        }),
      }, NovelPage))

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        label: () => '小说',
      }, NovelIcon))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
