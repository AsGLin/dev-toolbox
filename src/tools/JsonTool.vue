<script setup>
import { ref, reactive, computed } from 'vue'

const jsonText = ref('')
const jsonMsg = ref('')
const jsonMsgOk = ref(true)
const parsedData = ref(null)
const parseError = ref('')

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function show(text, ok) { jsonMsg.value = text; jsonMsgOk.value = ok }

const itemCount = ref(0)
const isArray = computed(() => parsedData.value && Array.isArray(parsedData.value))

// ── Parse ───────────────────────────────────
function autoParse() {
  const v = jsonText.value.trim()
  if (!v) { parsedData.value = null; parseError.value = ''; jsonMsg.value = ''; itemCount.value = 0; return }
  try {
    parsedData.value = JSON.parse(v)
    parseError.value = ''; jsonMsg.value = ''
    itemCount.value = Array.isArray(parsedData.value) ? parsedData.value.length : Object.keys(parsedData.value).length
  } catch (e1) {
    const fixed = tryFixJson(v)
    if (fixed && fixed !== v) {
      try { parsedData.value = JSON.parse(fixed); parseError.value = ''; jsonMsg.value = '⚠ 已自动修正'; jsonMsgOk.value = true
        itemCount.value = Array.isArray(parsedData.value) ? parsedData.value.length : Object.keys(parsedData.value).length; return
      } catch (e2) {}
    }
    parsedData.value = null; itemCount.value = 0; parseError.value = '格式错误'; jsonMsg.value = '⚠ JSON 格式错误'; jsonMsgOk.value = false
  }
}

function formatJson() {
  const v = jsonText.value.trim(); if (!v) return
  try { parsedData.value = JSON.parse(v); jsonText.value = JSON.stringify(parsedData.value, null, 2); itemCount.value = Array.isArray(parsedData.value) ? parsedData.value.length : Object.keys(parsedData.value).length; show('✓ 格式化成功', true) }
  catch (e) {
    const fixed = tryFixJson(v)
    if (fixed && fixed !== v) { try { parsedData.value = JSON.parse(fixed); jsonText.value = JSON.stringify(parsedData.value, null, 2); show('✓ 已修复并格式化', true) } catch (e2) { show('✗ 解析错误', false) } }
    else { parsedData.value = null; show('✗ JSON 解析错误', false) }
  }
}

function compressJson() {
  const v = jsonText.value.trim(); if (!v) return
  try { parsedData.value = JSON.parse(v); jsonText.value = JSON.stringify(parsedData.value); show('✓ 压缩成功', true) } catch (e) {
    const fixed = tryFixJson(v)
    if (fixed) { try { parsedData.value = JSON.parse(fixed); jsonText.value = JSON.stringify(parsedData.value); show('✓ 压缩成功', true) } catch (e2) { show('✗ 错误', false) } }
    else show('✗ 错误', false)
  }
}

function fixJson() {
  const v = jsonText.value.trim(); if (!v) return
  try { parsedData.value = JSON.parse(v); jsonText.value = JSON.stringify(parsedData.value, null, 2); show('✓ 格式正确，无需修复', true); return } catch (e) {}
  const fixed = tryFixJson(v); if (!fixed || fixed === v) { show('✗ 修复失败', false); return }
  try { parsedData.value = JSON.parse(fixed); jsonText.value = JSON.stringify(parsedData.value, null, 2); show('✓ 已修复并格式化', true) } catch (e2) { show('✗ 修复失败', false) }
}

function clearAll() { jsonText.value = ''; parsedData.value = null; parseError.value = ''; jsonMsg.value = '' }

function copyData() {
  if (!parsedData.value) { show('⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(jsonText.value).then(() => show('✓ 已复制', true), () => show('✗ 复制失败', false))
}

// ── JSON Fixer Engine ──────────────────────
function tryFixJson(str) {
  let s = str
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  s = s.replace(/(?<!https?:)\/\/.*$/gm, '')
  s = s.replace(/,(\s*[}\]])/g, '$1')
  s = fixQuotes(s)
  s = s.replace(/(^|\n|\{|\[|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm, '$1"$2":')
  s = s.replace(/,\s*,+/g, ',')
  s = s.replace(/"\s+(?=")/g, '",')
  s = s.replace(/(\d)\s+(?=\d)/g, '$1,')
  s = s.replace(/(\d)\s+(?=")/g, '$1,')
  s = s.replace(/([}\]"\d])\s+(?=[\[{])/g, '$1,')
  s = s.replace(/":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}\]\n])/g, (m, w, sep) => {
    if (w === 'true' || w === 'false' || w === 'null') return '": ' + w + sep
    if (/^-?\d/.test(w)) return '": ' + w + sep
    return '": "' + w + '"' + sep
  })
  s = s.replace(/\[\s*,/g, '[')
  s = s.replace(/,\s*,/g, ',')
  s = s.replace(/,\s*\]/g, ']')
  s = s.replace(/\n\s*\n/g, '\n')
  s = s.trim()
  if (!/^\s*[\[{]/.test(s)) {
    if (/^\s*"[^"]+"\s*:/.test(s) || /^\s*[a-zA-Z_$][\w$]*\s*:/.test(s)) s = '{' + s + '}'
  }
  s = s.replace(/,(\s*\})/g, '$1')
  s = s.replace(/,(\s*\])/g, '$1')
  return s
}

function fixQuotes(s) {
  let result = ''; let inD = false; let inS = false; let i = 0
  while (i < s.length) {
    const c = s[i]
    if (inD) { if (c === '\\' && i + 1 < s.length) { result += c + s[i + 1]; i += 2; continue } if (c === '"') inD = false; result += c; i++; continue }
    if (inS) {
      if (c === '\\' && i + 1 < s.length) { if (s[i + 1] === "'") { result += "'"; i += 2; continue } result += c + s[i + 1]; i += 2; continue }
      if (c === "'") { inS = false; result += '"'; i++; continue }
      if (c === '"') { result += '\\"'; i++; continue }
      result += c; i++; continue
    }
    if (c === '"') { inD = true; result += c } else if (c === "'") { inS = true; result += '"' } else result += c
    i++
  }
  return result
}

// ── Tree State ─────────────────────────────
const treeState = reactive({})
function toggle(k) { treeState[k] = !treeState[k] }
function isOpen(k) { return treeState[k] !== false }

const rootLabel = computed(() => {
  if (!parsedData.value) return parseError.value ? '解析错误' : '等待输入…'
  return isArray.value ? `array [${itemCount.value}]` : `object {${itemCount.value}}`
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
        <textarea v-model="jsonText" placeholder="粘贴 JSON 数据..." @input="autoParse"></textarea>
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
            :isOpen="isOpen"
            :esc="esc"
          />
        </div>
        <div class="json-tree-placeholder" v-else>
          <template v-if="parseError"><span class="error-icon">⚠️</span><span>JSON 格式错误</span></template>
          <template v-else><span>左侧输入 JSON 后在此解析展示</span></template>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- ═══ JsonNode recursive ═══ -->
<script>
import { h, defineComponent } from 'vue'

export const JsonNode = defineComponent({
  name: 'JsonNode',
  props: ['val', 'depth', 'path', 'isLast', 'toggle', 'isOpen', 'esc'],
  setup(props) {
    function prim(v, comma) {
      if (v === null)      return h('span', { class: 'jn jn-null' }, 'null' + comma)
      if (typeof v === 'boolean') return h('span', { class: 'jn jn-bool' }, v + comma)
      if (typeof v === 'number')  return h('span', { class: 'jn jn-num' }, v + comma)
      if (typeof v === 'string')  return h('span', { class: 'jn jn-str' }, '"' + props.esc(v) + '"' + comma)
      return null
    }

    return () => {
      const { val, depth, path, isLast, toggle, isOpen, esc } = props
      const comma = isLast ? '' : ','

      // primitive
      if (typeof val !== 'object' || val === null) return prim(val, comma)

      const isArr = Array.isArray(val)
      const keys = Object.keys(val)
      const len = keys.length
      const expanded = isOpen(path)

      if (len === 0) return h('span', { class: 'jn jn-brace' }, (isArr ? '[]' : '{}') + comma)

      const label  = isArr ? `Array [${len}]` : `Object {${len}}`
      const braceL = isArr ? '[' : '{'
      const braceR = isArr ? ']' : '}'

      const children = []

      // ── Toggle row ──────────────────────
      children.push(h('div', {
        class: `jn-row ${depth < 12 ? 'jn-d' + Math.min(depth, 11) : ''}`,
        onClick: () => toggle(path),
        title: expanded ? '折叠' : '展开',
      }, [
        h('span', { class: 'jn-arr' }, expanded ? '▾' : '▸'),
        h('span', { class: 'jn-brace' }, braceL),
        h('span', { class: 'jn-tag' }, ` ${label} `),
        expanded ? null : h('span', { class: 'jn-prev' }, ` ${preview(val, esc, 90)} ${braceR}`),
      ]))

      // ── Children ────────────────────────
      if (expanded) {
        keys.forEach((k, i) => {
          const cp = path + (isArr ? `[${k}]` : `.${k}`)
          const cl = i === len - 1
          children.push(h('div', { class: `jn-row jn-d${Math.min(depth + 1, 11)}`, key: k }, [
            h('span', { class: 'jn-sp' }),
            isArr
              ? h('span', { class: 'jn-idx' }, k + ': ')
              : [h('span', { class: 'jn-key' }, '"' + esc(k) + '"'), h('span', { class: 'jn-colo' }, ': ')],
            h(JsonNode, { val: val[k], depth: depth + 1, path: cp, isLast: cl, toggle, isOpen, esc }),
          ]))
        })
        children.push(h('div', { class: `jn-row jn-d${Math.min(depth, 11)}` }, [
          h('span', { class: 'jn-sp' }),
          h('span', { class: 'jn jn-brace' }, braceR + comma),
        ]))
      }

      return h('div', null, children)
    }
  },
})

function preview(val, esc, max) {
  let s = ''
  if (Array.isArray(val)) {
    const p = val.slice(0, 4).map(v => {
      if (v === null) return 'null'
      if (typeof v === 'string') { const e = esc(v); return '"' + e.substring(0, 15) + (e.length > 15 ? '…' : '') + '"' }
      if (typeof v === 'object') return Array.isArray(v) ? '[...]' : '{...}'
      return String(v)
    })
    s = p.join(', ')
    if (val.length > 4) s += ', …'
  } else {
    const ks = Object.keys(val)
    const p = ks.slice(0, 3).map(k => {
      const v = val[k]; let vs = ''
      if (v === null) vs = 'null'
      else if (typeof v === 'string') { const e = esc(v); vs = '"' + e.substring(0, 12) + (e.length > 12 ? '…' : '') + '"' }
      else if (typeof v === 'object') vs = Array.isArray(v) ? '[...]' : '{...}'
      else vs = String(v)
      return '"' + esc(k) + '": ' + vs
    })
    s = p.join(', ')
    if (ks.length > 3) s += ', …'
  }
  if (s.length > max) s = s.substring(0, max) + '…'
  return s
}
</script>

<style scoped>
/* ===== Layout ========================= */
.json-card { max-height: none !important; }
.json-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0 !important;
  min-height: 480px;
  max-height: calc(100vh - 160px);
}
@media (max-width: 768px) {
  .json-body { grid-template-columns: 1fr; min-height: auto; max-height: none; }
}

/* ===== Left Panel ===================== */
.json-left {
  padding: 16px;
  border-right: 1px solid #e5e7eb;
  display: flex; flex-direction: column;
}
.json-left textarea {
  flex: 1;
  font-family: "Fira Code", "Cascadia Code", "Consolas", monospace;
  font-size: 13px; line-height: 1.6;
  border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 12px; resize: none; background: #fafbfc; outline: none;
}
.json-left textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.json-left .btn-row { margin-top: 10px; }
.json-left .msg { margin-top: 6px; min-height: auto; }

/* ===== Right Panel ==================== */
.json-right {
  background: #12121e;
  display: flex; flex-direction: column;
  min-height: 480px; overflow: hidden;
}
.json-tree-header {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 12px; color: #6b7094;
  flex-shrink: 0;
}
.tree-root-label { font-family: "Fira Code", "Consolas", monospace; font-size: 12px; color: #949cbb; }

.json-tree {
  flex: 1; overflow: auto;
  padding: 6px 0 16px;
  font-family: "Fira Code", "Cascadia Code", "Consolas", monospace;
  font-size: 13px; line-height: 1.65; color: #cdd6f4;
}

.json-tree-placeholder {
  flex: 1; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 6px; color: #45475a; font-size: 13px;
}
.json-tree-placeholder .error-icon { font-size: 28px; }

/* ===== Tree Rows ====================== */
.jn-row {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  cursor: default;
  user-select: none;
  transition: background 0.06s;
}
.jn-row:hover { background: rgba(255, 255, 255, 0.03); }

/* indent spacing via left padding */
.jn-d0  { padding-left:  12px; }
.jn-d1  { padding-left:  30px; }
.jn-d2  { padding-left:  48px; }
.jn-d3  { padding-left:  66px; }
.jn-d4  { padding-left:  84px; }
.jn-d5  { padding-left: 102px; }
.jn-d6  { padding-left: 120px; }
.jn-d7  { padding-left: 138px; }
.jn-d8  { padding-left: 156px; }
.jn-d9  { padding-left: 174px; }
.jn-d10 { padding-left: 192px; }
.jn-d11 { padding-left: 210px; }

.jn-arr {
  flex-shrink: 0; width: 14px;
  color: #6b7094; font-size: 12px;
  text-align: center;
}
.jn-sp {
  flex-shrink: 0; width: 14px;
}

.jn-tag {
  color: #949cbb;
  font-size: 11px;
  font-weight: 500;
  margin: 0 6px;
}

.jn-prev {
  color: #585b70;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== Syntax ========================= */
.jn       { }
.jn-key   { color: #82aaff; }
.jn-idx   { color: #6b7094; font-size: 12px; }
.jn-colo  { color: #6b7094; }
.jn-str   { color: #c3e88d; }
.jn-num   { color: #f78c6c; }
.jn-bool  { color: #c792ea; }
.jn-null  { color: #f07178; font-style: italic; }
.jn-brace { color: #ffcb6b; }
.jn-len   { color: #45475a; font-size: 10px; margin-left: 4px; }

/* ===== Header ========================= */
.header-actions { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
