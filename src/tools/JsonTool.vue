<script setup>
import { ref, nextTick } from 'vue'

const jsonIn = ref('')
const jsonMsg = ref('')
const jsonMsgClass = ref('msg')
const jsonTree = ref(null)
const jsonTreeVisible = ref(false)
const jsonData = ref(null)
let nodeId = 0

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function showJsonMsg(text, ok) {
  jsonMsg.value = text; jsonMsgClass.value = 'msg ' + (ok ? 'success' : 'error')
}

function hideTree() { jsonTreeVisible.value = false }

function renderJsonTree(data) {
  nodeId = 0
  jsonTreeVisible.value = true
  nextTick(() => { if (jsonTree.value) jsonTree.value.innerHTML = buildTree(data, 0, true) })
}

function buildTree(val, depth, expanded) {
  if (val === null) return '<span class="json-null">null</span>'
  if (typeof val === 'boolean') return '<span class="json-boolean">' + val + '</span>'
  if (typeof val === 'number') return '<span class="json-number">' + val + '</span>'
  if (typeof val === 'string') return '<span class="json-string">"' + esc(val) + '"</span>'
  const isArr = Array.isArray(val)
  const keys = Object.keys(val); const len = keys.length
  const id = 'jn_' + nodeId++; const cls = depth === 0 ? 'json-node root' : 'json-node'
  if (len === 0) return '<span class="json-bracket">' + (isArr ? '[]' : '{}') + '</span>'
  const arrow = expanded ? '▼' : '▶'
  const cvDisplay = expanded ? 'none' : 'inline'
  const evDisplay = expanded ? 'inline' : 'none'
  const cv = '<span class="json-cv" style="display:' + cvDisplay + '">'
    + ' <span class="json-ellipsis">…</span>'
    + '<span class="json-bracket">' + (isArr ? ']' : '}') + '</span>'
    + '</span>'
  let ev = '<span class="json-ev" style="display:' + evDisplay + '">'
  ev += '<ul class="' + cls + '" style="display:' + (expanded ? 'block' : 'none') + '">'
  keys.forEach((k, i) => {
    ev += '<li>'
    if (!isArr) ev += '<span class="json-key">"' + esc(k) + '"</span>'
    ev += buildTree(val[k], depth + 1, expanded)
    if (i < len - 1) ev += ','
    ev += '</li>'
  })
  ev += '</ul>'
  ev += '<span class="json-bracket">' + (isArr ? ']' : '}') + '</span>'
  ev += '</span>'
  return '<span class="json-compound">'
    + '<span class="json-toggle" data-id="' + id + '">' + arrow + '</span>'
    + '<span class="json-bracket">' + (isArr ? '[' : '{') + '</span>'
    + '<span class="json-count">' + len + '</span>'
    + cv + ev
    + '</span>'
}

function toggleNode(e) {
  const toggle = e.target.closest('.json-toggle')
  if (!toggle) return
  const container = toggle.parentNode
  const cv = container.querySelector('.json-cv')
  const ev = container.querySelector('.json-ev')
  const ul = ev ? ev.querySelector('ul') : null
  const isExpanded = ev && ev.style.display !== 'none'
  if (isExpanded) {
    toggle.textContent = '▶'
    if (cv) cv.style.display = 'inline'
    if (ev) ev.style.display = 'none'
    if (ul) ul.style.display = 'none'
  } else {
    toggle.textContent = '▼'
    if (cv) cv.style.display = 'none'
    if (ev) ev.style.display = 'inline'
    if (ul) ul.style.display = 'block'
  }
}

function jsonExpandAll() {
  if (!jsonTree.value) return
  jsonTree.value.querySelectorAll('.json-toggle').forEach(t => t.textContent = '▼')
  jsonTree.value.querySelectorAll('.json-cv').forEach(e => e.style.display = 'none')
  jsonTree.value.querySelectorAll('.json-ev').forEach(e => e.style.display = 'inline')
  jsonTree.value.querySelectorAll('.json-ev ul').forEach(e => e.style.display = 'block')
}
function jsonCollapseAll() {
  if (!jsonTree.value) return
  jsonTree.value.querySelectorAll('.json-toggle').forEach(t => t.textContent = '▶')
  jsonTree.value.querySelectorAll('.json-cv').forEach(e => e.style.display = 'inline')
  jsonTree.value.querySelectorAll('.json-ev').forEach(e => e.style.display = 'none')
  jsonTree.value.querySelectorAll('.json-ev ul').forEach(e => e.style.display = 'none')
}

function formatJson() {
  try {
    jsonData.value = JSON.parse(jsonIn.value)
    jsonIn.value = JSON.stringify(jsonData.value, null, 2)
    renderJsonTree(jsonData.value)
    showJsonMsg('✓ 格式化成功', true)
  } catch (e) { jsonData.value = null; hideTree(); showJsonMsg('✗ JSON 解析错误: ' + e.message, false) }
}
function compressJson() {
  try {
    jsonData.value = JSON.parse(jsonIn.value)
    jsonIn.value = JSON.stringify(jsonData.value)
    renderJsonTree(jsonData.value)
    showJsonMsg('✓ 压缩成功', true)
  } catch (e) { jsonData.value = null; hideTree(); showJsonMsg('✗ JSON 解析错误: ' + e.message, false) }
}
function autoFormatJson() {
  const v = jsonIn.value.trim()
  if (!v) { jsonData.value = null; hideTree(); jsonMsg.value = ''; return }
  try { jsonData.value = JSON.parse(v); jsonMsg.value = ''; renderJsonTree(jsonData.value); return } catch (e1) {
    const fixed = tryFixJson(v)
    if (fixed && fixed !== v) {
      try { jsonData.value = JSON.parse(fixed); jsonMsg.value = '⚠ 检测到格式问题，已自动修正'; jsonMsgClass.value = 'msg success'; renderJsonTree(jsonData.value); return } catch (e2) {}
    }
  }
  jsonData.value = null; hideTree(); showJsonMsg('⚠ JSON 格式错误（可点击 🔧 修复按钮尝试自动修正）', false)
}
function clearJson() { jsonIn.value = ''; jsonData.value = null; hideTree(); jsonMsg.value = '' }
function copyJsonTree() {
  if (!jsonTreeVisible.value || !jsonData.value) { showJsonMsg('⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(jsonTree.value.innerText).then(
    () => showJsonMsg('✓ 已复制到剪贴板', true),
    () => showJsonMsg('✗ 复制失败', false)
  )
}

// ── JSON Fixer ────────────────────────────
function fixJson() {
  const raw = jsonIn.value.trim()
  if (!raw) return
  try { jsonData.value = JSON.parse(raw); jsonIn.value = JSON.stringify(jsonData.value, null, 2); renderJsonTree(jsonData.value); showJsonMsg('✓ JSON 格式正确，无需修复', true); return } catch (e) {}
  const fixed = tryFixJson(raw)
  if (!fixed || fixed === raw) { showJsonMsg('✗ 自动修复失败，请手动检查 JSON 语法', false); return }
  try { jsonData.value = JSON.parse(fixed); jsonIn.value = JSON.stringify(jsonData.value, null, 2); renderJsonTree(jsonData.value); showJsonMsg('✓ 已修复并格式化', true) } catch (e) { showJsonMsg('✗ 修复后仍有错误: ' + e.message, false) }
}

function tryFixJson(str) {
  let s = str
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  s = s.replace(/\/\/.*$/gm, '')
  s = s.replace(/,(\s*[}\]])/g, '$1')
  s = fixQuotes(s)
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g, '$1"$2":')
  s = s.replace(/,\s*,+/g, ',')
  s = s.replace(/"\s+(?=")/g, '",')
  s = s.replace(/(\d)\s+(?=\d)/g, '$1,')
  s = s.replace(/(\d)\s+(?=")/g, '$1,')
  s = s.replace(/([}\]"])\s+(?=[\[{])/g, '$1,')
  s = s.replace(/":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}\]])/g, (m, w, sep) => {
    if (w === 'true' || w === 'false' || w === 'null') return '": ' + w + sep
    return '": "' + w + '"' + sep
  })
  s = s.replace(/\[\s*,/g, '[')
  s = s.replace(/,\s*,/g, ',')
  s = s.replace(/,\s*\]/g, ']')
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
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2><span class="icon">📋</span> JSON 格式化</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-sm" style="background:#fef3c7;color:#92400e" @click="fixJson">🔧 修复</button>
        <button class="btn-sm btn-secondary" @click="jsonExpandAll">全部展开</button>
        <button class="btn-sm btn-secondary" @click="jsonCollapseAll">全部折叠</button>
      </div>
    </div>
    <div class="card-body">
      <textarea v-model="jsonIn" placeholder="输入 JSON 后自动格式化…" @input="autoFormatJson"></textarea>
      <div class="btn-row">
        <button class="btn-primary" @click="formatJson">格式化</button>
        <button class="btn-secondary" @click="compressJson">压缩</button>
        <button class="btn-success" @click="copyJsonTree">📋 复制</button>
        <button class="btn-danger" @click="clearJson">清空</button>
      </div>
      <div
        ref="jsonTree"
        class="json-tree"
        :class="{ visible: jsonTreeVisible }"
        @click="toggleNode"
      ></div>
      <div :class="jsonMsgClass">{{ jsonMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.json-tree {
  margin-top: 12px; background: #1e1e2e; color: #cdd6f4;
  border-radius: 8px; padding: 14px 16px;
  font-family: "Fira Code", "Cascadia Code", "Consolas", monospace;
  font-size: 13px; line-height: 1.7; max-height: 500px;
  overflow: auto; white-space: nowrap; display: none;
}
.json-tree.visible { display: block; }
.json-node { list-style: none; padding-left: 20px; margin: 0; }
.json-node.root { padding-left: 0; }
.json-toggle {
  cursor: pointer; user-select: none; display: inline-block;
  width: 16px; color: #6c7086; font-size: 12px; vertical-align: middle;
}
.json-toggle:hover { color: #cdd6f4; }
.json-key { color: #89b4fa; }
.json-key::after { content: ': '; color: #bac2de; }
.json-string { color: #a6e3a1; }
.json-number { color: #fab387; }
.json-boolean { color: #cba6f7; }
.json-null { color: #f38ba8; }
.json-bracket { color: #f9e2af; }
.json-ellipsis { color: #6c7086; font-style: italic; }
.json-count { color: #6c7086; font-size: 11px; margin-left: 4px; }
.json-compound { display: inline; }
</style>
