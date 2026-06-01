<script setup>
import { ref, nextTick } from 'vue'
import pako from 'pako'

const raw = ref('')
const compressed = ref('')
const msg = ref('')
const msgOk = ref(true)
const decompressMsg = ref('')
const decompressMsgOk = ref(true)
const decompressOutput = ref('')
const decompressRaw = ref('')

function show(msgRef, msgOkRef, text, ok) { msgRef.value = text; msgOkRef.value = ok }

// ── Compress ──────────────────────────────
function compress() {
  try {
    let input = raw.value
    if (!input) { show(msg, msgOk, '', true); compressed.value = ''; return }
    // Try parse JSON first, same as util.zip
    let str = input
    try { str = JSON.stringify(JSON.parse(input)) } catch (e) { /* not JSON, use raw */ }
    // Convert to Uint8Array first, then manually build binary string for btoa
    const gzipBytes = pako.gzip(str)
    let binary = ''
    for (let i = 0; i < gzipBytes.length; i++) binary += String.fromCharCode(gzipBytes[i])
    const result = btoa(binary)
    compressed.value = result
    const ratio = raw.value.length > 0 ? ((1 - result.length / raw.value.length) * 100).toFixed(1) : '0'
    show(msg, msgOk, '✓ 压缩成功 (' + raw.value.length + ' → ' + result.length + ' 字符, ' + (ratio > 0 ? '-' : '') + ratio + '%)', true)
  } catch (e) { show(msg, msgOk, '✗ 压缩失败: ' + e.message, false) }
}

function autoCompress() {
  if (!raw.value) { compressed.value = ''; msg.value = ''; return }
  compress()
}

// ── Decompress ────────────────────────────
async function decompress() {
  try {
    let b64Data = decompressRaw.value.trim()
    if (!b64Data) { decompressOutput.value = ''; decompressMsg.value = ''; return }
    // Remove data URL prefix if present
    if (b64Data.includes(',')) b64Data = b64Data.split(',')[1]

    const strData = atob(b64Data)
    const charData = strData.split('').map(x => x.charCodeAt(0))
    const binData = new Uint8Array(charData)
    const inflated = pako.ungzip(binData, { to: 'string' })

    // Try pretty-print if it's JSON
    try { decompressOutput.value = JSON.stringify(JSON.parse(inflated), null, 2) }
    catch (e) { decompressOutput.value = inflated }

    show(decompressMsg, decompressMsgOk, '✓ 解压成功 (' + decompressOutput.value.length + ' 字符)', true)
  } catch (e) { show(decompressMsg, decompressMsgOk, '✗ 解压失败: ' + e.message, false); decompressOutput.value = '' }
}

function autoDecompress() {
  if (!decompressRaw.value.trim()) { decompressOutput.value = ''; decompressMsg.value = ''; return }
  decompress()
}

function copyCompressed() {
  if (!compressed.value) { show(msg, msgOk, '⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(compressed.value).then(
    () => show(msg, msgOk, '✓ 已复制', true),
    () => show(msg, msgOk, '✗ 复制失败', false)
  )
}

function copyDecompressed() {
  if (!decompressOutput.value) { show(decompressMsg, decompressMsgOk, '⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(decompressOutput.value).then(
    () => show(decompressMsg, decompressMsgOk, '✓ 已复制', true),
    () => show(decompressMsg, decompressMsgOk, '✗ 复制失败', false)
  )
}
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2><span class="icon">🗜️</span> GZip 压缩/解压</h2>
      <span style="font-size:11px;color:#6b7280;">基于 pako (zlib port)</span>
    </div>
    <div class="card-body">

      <!-- 压缩区 -->
      <div class="gzip-section">
        <div class="label">📦 压缩</div>
        <textarea v-model="raw" placeholder="输入文本或 JSON..." @input="autoCompress" rows="4"></textarea>
        <div class="btn-row">
          <button class="btn-primary" @click="compress">压缩 ↓</button>
          <button class="btn-secondary" @click="copyCompressed" :disabled="!compressed">📋 复制结果</button>
        </div>
        <textarea
          v-if="compressed"
          readonly
          class="gzip-result"
          :value="compressed"
          rows="3"
          placeholder="压缩结果（Base64）…"
        ></textarea>
        <div :class="['msg', msgOk ? 'success' : 'error']" v-if="msg">{{ msg }}</div>
      </div>

      <!-- 解压区 -->
      <div class="gzip-section">
        <div class="label">📂 解压</div>
        <textarea v-model="decompressRaw" placeholder="粘贴 Base64 压缩数据…" @input="autoDecompress" rows="4"></textarea>
        <div class="btn-row">
          <button class="btn-primary" @click="decompress">解压 ↑</button>
          <button class="btn-secondary" @click="copyDecompressed" :disabled="!decompressOutput">📋 复制结果</button>
        </div>
        <textarea
          v-if="decompressOutput"
          readonly
          class="gzip-result"
          :value="decompressOutput"
          rows="6"
          placeholder="解压结果…"
        ></textarea>
        <div :class="['msg', decompressMsgOk ? 'success' : 'error']" v-if="decompressMsg">{{ decompressMsg }}</div>
      </div>

      <div class="gzip-note">
        💡 使用 gzip 算法，输出为 Base64 编码。支持压缩任意文本/JSON，自动检测 JSON 并美化输出。
      </div>
    </div>
  </div>
</template>

<style scoped>
.gzip-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  background: #fafafa;
  margin-bottom: 16px;
}
.gzip-section:last-of-type { margin-bottom: 0; }
.gzip-section .label { margin-bottom: 8px; font-size: 13px; }
.gzip-section textarea { min-height: 90px; }
.gzip-result {
  margin-top: 10px;
  background: #f0fdf4;
  border-color: #bbf7d0 !important;
  font-size: 12px;
  word-break: break-all;
}
.gzip-note {
  margin-top: 14px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
</style>
