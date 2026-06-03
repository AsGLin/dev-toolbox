<script setup>
import { ref, reactive, nextTick, computed } from 'vue'

const jsonText = ref('')
const jsonMsg = ref('')
const jsonMsgOk = ref(true)
const parsedData = ref(null)
const parseError = ref('')

let nodeId = 0

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function show(text, ok) { jsonMsg.value = text; jsonMsgOk.value = ok }

// ── Parse & Render ─────────────────────────
function autoParse() {
  const v = jsonText.value.trim()
  if (!v) { parsedData.value = null; parseError.value = ''; jsonMsg.value = ''; itemCount.value = 0; return }
  try {
    parsedData.value = JSON.parse(v)
    parseError.value = ''
    jsonMsg.value = ''
    itemCount.value = Array.isArray(parsedData.value) ? parsedData.value.length : Object.keys(parsedData.value).length
    return
  } catch (e1) {
    const fixed = tryFixJson(v)
    if (fixed && fixed !== v) {
      try { parsedData.value = JSON.parse(fixed); parseError.value = ''; jsonMsg.value = '⚠ 已自动修正格式问题'; jsonMsgOk.value = true; itemCount.value = Array.isArray(parsedData.value) ? parsedData.value.length : Object.keys(parsedData.value).length; return } catch (e2) {}
    }
  }
  parsedData.value = null
  itemCount.value = 0
  parseError.value = '格式错误'
  jsonMsg.value = '⚠ JSON 格式错误'
  jsonMsgOk.value = false
}

function formatJson() {
  const v = jsonText.value.trim()
  if (!v) return
  // Try direct parse
  try {
    parsedData.value = JSON.parse(v)
    jsonText.value = JSON.stringify(parsedData.value, null, 2)
    itemCount.value = Array.isArray(parsedData.value) ? parsedData.value.length : Object.keys(parsedData.value).length
    show('✓ 格式化成功', true)
    return
  } catch (e) {
    // Try fix
    const fixed = tryFixJson(v)
    if (fixed && fixed !== v) {
      try {
        parsedData.value = JSON.parse(fixed)
        jsonText.value = JSON.stringify(parsedData.value, null, 2)
        show('✓ 已自动修复并格式化', true)
        return
      } catch (e2) {}
    }
  }
  parsedData.value = null
  show('✗ JSON 解析错误', false)
}

function compressJson() {
  const v = jsonText.value.trim()
  if (!v) return
  try {
    parsedData.value = JSON.parse(v)
    jsonText.value = JSON.stringify(parsedData.value)
    show('✓ 压缩成功', true)
  } catch (e) {
    const fixed = tryFixJson(v)
    if (fixed && fixed !== v) {
      try {
        parsedData.value = JSON.parse(fixed)
        jsonText.value = JSON.stringify(parsedData.value)
        show('✓ 压缩成功', true)
        return
      } catch (e2) {}
    }
    show('✗ JSON 解析错误', false)
  }
}

function fixJson() {
  const v = jsonText.value.trim()
  if (!v) return
  try {
    parsedData.value = JSON.parse(v)
    jsonText.value = JSON.stringify(parsedData.value, null, 2)
    show('✓ JSON 格式正确，无需修复', true)
    return
  } catch (e) {
    const fixed = tryFixJson(v)
    if (!fixed || fixed === v) { show('✗ 自动修复失败', false); return }
    try {
      parsedData.value = JSON.parse(fixed)
      jsonText.value = JSON.stringify(parsedData.value, null, 2)
      show('✓ 已修复并格式化', true)
    } catch (e2) { show('✗ 修复后仍有错误', false) }
  }
}

function clearAll() {
  jsonText.value = ''
  parsedData.value = null
  parseError.value = ''
  jsonMsg.value = ''
}

function copyData() {
  if (!parsedData.value) { show('⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(jsonText.value).then(
    () => show('✓ 已复制', true),
    () => show('✗ 复制失败', false)
  )
}

// ── JSON Fixer Engine ──────────────────────
function tryFixJson(str) {
  let s = str

  // Pass 0: normalize line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Pass 1: strip comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')          // block /* ... */
  s = s.replace(/(?<!https?:)\/\/.*$/gm, '')       // line // ... (skip https://)

  // Pass 2: trailing commas before ] or }
  s = s.replace(/,(\s*[}\]])/g, '$1')

  // Pass 3: fix single-quoted strings → double
  s = fixQuotes(s)

  // Pass 4: quote unquoted keys — need to handle keys after line breaks too
  // Matches: start of line or after { [ , followed by key:
  s = s.replace(/(^|\n|\{|\[|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm, '$1"$2":')

  // Pass 5: consecutive commas
  s = s.replace(/,\s*,+/g, ',')

  // Pass 6: missing commas between values (string-string, number-number, value-brace)
  s = s.replace(/"\s+(?=")/g, '",')
  s = s.replace(/(\d)\s+(?=\d)/g, '$1,')
  s = s.replace(/(\d)\s+(?=")/g, '$1,')
  s = s.replace(/([}\]"\d])\s+(?=[\[{])/g, '$1,')

  // Pass 7: unquoted string values (skip true/false/null, numbers)
  s = s.replace(/":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}\]\n])/g, (m, w, sep) => {
    if (w === 'true' || w === 'false' || w === 'null') return '": ' + w + sep
    if (/^-?\d/.test(w)) return '": ' + w + sep
    return '": "' + w + '"' + sep
  })

  // Pass 8: empty array slots
  s = s.replace(/\[\s*,/g, '[')
  s = s.replace(/,\s*,/g, ',')
  s = s.replace(/,\s*\]/g, ']')

  // Pass 9: clean up blank lines / excess whitespace
  s = s.replace(/\n\s*\n/g, '\n')

  // Pass 10: auto-wrap — if input doesn't start with { or [ but looks like key:value
  s = s.trim()
  if (!/^\s*[\[{]/.test(s)) {
    if (/^\s*"[^"]+"\s*:/.test(s) || /^\s*[a-zA-Z_$][\w$]*\s*:/.test(s)) {
      s = '{' + s + '}'
    }
  }

  // Pass 11: final trailing comma cleanup
  s = s.replace(/,(\s*\})/g, '$1')
  s = s.replace(/,(\s*\])/g, '$1')

  return s
}

function fixQuotes(s) {
  let result = ''; let inDouble = false; let inSingle = false; let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (inDouble) { if (ch === '\\' && i + 1 < s.length) { result += ch + s[i + 1]; i += 2; continue } if (ch === '"') inDouble = false; result += ch; i++; continue }
    if (inSingle) {
      if (ch === '\\' && i + 1 < s.length) { if (s[i + 1] === "'") { result += "'"; i += 2; continue } result += ch + s[i + 1]; i += 2; continue }
      if (ch === "'") { inSingle = false; result += '"'; i++; continue }
      if (ch === '"') { result += '\\"'; i++; continue }
      result += ch; i++; continue
    }
    if (ch === '"') { inDouble = true; result += ch }
    else if (ch === "'") { inSingle = true; result += '"' }
    else result += ch
    i++
  }
  return result
}

// ── Tree Render ────────────────────────────
const treeNodeStates = reactive({})
const itemCount = ref(0)
const isArray = computed(() => parsedData.value && Array.isArray(parsedData.value))

function renderTree() {
  if (!parsedData.value) return
  nodeId = 0
  // reset all node states to expanded
  Object.keys(treeNodeStates).forEach(k => delete treeNodeStates[k])
  const data = parsedData.value
  itemCount.value = Array.isArray(data) ? data.length : Object.keys(data).length
}

function toggle(key) {
  treeNodeStates[key] = !treeNodeStates[key]
}

function isExpanded(key) {
  return treeNodeStates[key] !== false // default expanded
}

const rootLabel = computed(() => {
  if (!parsedData.value) return parseError.value ? '解析错误' : '等待输入…'
  return isArray.value ? 'Array [' + itemCount.value + ']' : 'Object {' + itemCount.value + '}'
})

autoParse()
</script>

<template>
  <div class="card json-card">
    <div class="card-header">
      <h2><span class="icon">📋</span> JSON 数据解析</h2>
      <div class="header-actions">
        <button class="btn-sm btn-primary" @click="fixJson">🔧 修复</button>
        <button class="btn-sm btn-secondary" @click="compressJson">压缩</button>
        <button class="btn-sm btn-danger" @click="clearAll">清空</button>
      </div>
    </div>
    <div class="card-body json-body">
      <!-- Left: Input -->
      <div class="json-left">
        <textarea
          v-model="jsonText"
          placeholder="粘贴 JSON 数据..."
          @input="autoParse"
        ></textarea>
        <div class="btn-row">
          <button class="btn-primary" @click="formatJson">格式化</button>
          <button class="btn-success" @click="copyData">📋 复制</button>
        </div>
        <div :class="['msg', jsonMsgOk ? 'success' : 'error']" v-if="jsonMsg">{{ jsonMsg }}</div>
      </div>

      <!-- Right: Tree -->
      <div class="json-right">
        <div class="json-tree-header">
          <span class="tree-root-label">{{ rootLabel }}</span>
        </div>
        <div class="json-tree" v-if="parsedData">
          <JsonNode
            :val="parsedData"
            :depth="0"
            :path="'$'"
            :isLast="true"
            :toggle="toggle"
            :isExpanded="isExpanded"
            :esc="esc"
          />
        </div>
        <div class="json-tree-placeholder" v-else>
          <template v-if="parseError">
            <span class="error-icon">⚠️</span>
            <span>{{ parseError }}</span>
          </template>
          <template v-else>
            <span>左侧输入 JSON 后在此解析展示</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- ═══ JsonNode recursive component ═══ -->
<script>
import { h, defineComponent } from 'vue'

export const JsonNode = defineComponent({
  name: 'JsonNode',
  props: ['val', 'depth', 'path', 'isLast', 'toggle', 'isExpanded', 'esc'],
  setup(props) {
    return () => {
      const { val, depth, path, isLast, toggle, isExpanded, esc } = props
      const comma = !isLast ? ',' : ''

      if (val === null) return h('span', { class: 'jn-null' }, 'null' + comma)
      if (typeof val === 'boolean') return h('span', { class: 'jn-bool' }, val + '' + comma)
      if (typeof val === 'number') return h('span', { class: 'jn-num' }, val + '' + comma)
      if (typeof val === 'string') return h('span', { class: 'jn-str' }, `"${esc(val)}"` + comma)

      const isArr = Array.isArray(val)
      const keys = Object.keys(val)
      const len = keys.length
      const nodeKey = path
      const expanded = isExpanded(nodeKey)
      const bracket = isArr ? ['[', ']'] : ['{', '}']

      if (len === 0) {
        return h('span', { class: 'jn-bracket' }, bracket[0] + bracket[1] + comma)
      }

      const children = []

      // clickable row
      children.push(h('div', {
        class: 'jn-row',
        onClick: () => toggle(nodeKey),
      }, [
        h('span', { class: 'jn-arrow' }, expanded ? '▼' : '▶'),
        h('span', { class: 'jn-bracket' }, bracket[0]),
        h('span', { class: 'jn-count' }, ` ${len} `),
        expanded
          ? h('span', { class: 'jn-dots' })
          : h('span', { class: 'jn-dots' }, '…' + bracket[1] + comma),
      ]))

      if (expanded) {
        const list = h('div', { class: 'jn-children' },
          keys.map((k, i) => {
            const childPath = path + (isArr ? `[${k}]` : `.${k}`)
            return h('div', { class: 'jn-child-row', key: k }, [
              !isArr ? h('span', { class: 'jn-key' }, `"${esc(k)}"`) : h('span', { class: 'jn-idx' }, `${k}`),
              h('span', { class: 'jn-colon' }, ': '),
              h(JsonNode, {
                val: val[k],
                depth: depth + 1,
                path: childPath,
                isLast: i === len - 1,
                toggle,
                isExpanded,
                esc,
              }),
            ])
          })
        )
        children.push(list)
        children.push(h('div', { class: 'jn-row jn-close' }, [
          h('span', { class: 'jn-arrow' }, ''),
          h('span', { class: 'jn-bracket' }, bracket[1] + comma),
        ]))
      }

      return h('div', { class: 'jn-node' }, children)
    }
  },
})
</script>

<style scoped>
/* ── Layout ──────────────────────────── */
.json-card { max-height: none !important; }
.json-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 0 !important;
  min-height: 480px;
  max-height: calc(100vh - 160px);
}
@media (max-width: 768px) {
  .json-body { grid-template-columns: 1fr; min-height: auto; }
}

/* ── Left Panel ──────────────────────── */
.json-left {
  padding: 16px;
  border-right: 1px solid #e5e7eb;
  display: flex; flex-direction: column;
}
.json-left textarea {
  flex: 1;
  font-family: "Fira Code", "Cascadia Code", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  resize: none;
  background: #fafbfc;
}
.json-left textarea:focus {
  border-color: #4f46e5;
  outline: none;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}
.json-left .btn-row { margin-top: 10px; }
.json-left .msg { margin-top: 6px; min-height: auto; }

/* ── Right Panel ─────────────────────── */
.json-right {
  background: #1e1e2e;
  display: flex; flex-direction: column;
  min-height: 480px;
  overflow: hidden;
}
.json-tree-header {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-size: 12px;
  color: #6c7086;
  flex-shrink: 0;
}
.tree-root-label {
  font-family: "Fira Code", "Consolas", monospace;
  font-size: 12px;
}

.json-tree {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  font-family: "Fira Code", "Cascadia Code", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.8;
  color: #cdd6f4;
}
.json-tree-placeholder {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 6px;
  color: #585b70;
  font-size: 13px;
}
.json-tree-placeholder .error-icon { font-size: 28px; }
.json-tree-placeholder span { color: #585b70; }

/* ── Tree Nodes ──────────────────────── */
.jn-node { }
.jn-row {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  padding: 1px 0;
  border-radius: 3px;
}
.jn-row:hover { background: rgba(255,255,255,0.04); }
.jn-row.jn-close { cursor: default; }
.jn-row.jn-close:hover { background: transparent; }

.jn-arrow {
  display: inline-block; width: 16px;
  color: #6c7086; font-size: 10px;
  text-align: center; vertical-align: middle;
  flex-shrink: 0;
}

.jn-children {
  padding-left: 20px;
  border-left: 1px solid rgba(206,210,236,0.12);
  margin-left: 8px;
}

.jn-child-row {
  white-space: nowrap;
}

/* ── Syntax Colors ───────────────────── */
.jn-key    { color: #89b4fa; }
.jn-idx    { color: #6c7086; font-size: 11px; }
.jn-colon  { color: #bac2de; }
.jn-str    { color: #a6e3a1; }
.jn-num    { color: #fab387; }
.jn-bool   { color: #cba6f7; }
.jn-null   { color: #f38ba8; }
.jn-bracket{ color: #f9e2af; }
.jn-dots   { color: #6c7086; }
.jn-count  { color: #6c7086; font-size: 11px; }

/* ── Header ──────────────────────────── */
.header-actions {
  display: flex; gap: 6px; flex-wrap: wrap;
}
</style>
