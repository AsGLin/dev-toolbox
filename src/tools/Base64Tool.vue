<script setup>
import { ref, computed } from 'vue'

const mode = ref('image') // 'text' | 'image'

// ── text mode ──────────────────────────────
const txtRaw = ref('')
const txtEncoded = ref('')
const txtMsg = ref('')
const txtMsgOk = ref(true)

function showTxtMsg(text, ok) { txtMsg.value = text; txtMsgOk.value = ok }

function encodeText() {
  try { txtEncoded.value = btoa(unescape(encodeURIComponent(txtRaw.value))); showTxtMsg('✓ 编码成功', true) }
  catch (e) { showTxtMsg('✗ 编码错误: ' + e.message, false) }
}
function decodeText() {
  try { txtRaw.value = decodeURIComponent(escape(atob(txtEncoded.value.trim()))); showTxtMsg('✓ 解码成功', true) }
  catch (e) { showTxtMsg('✗ 解码错误: ' + e.message, false) }
}
function autoTextEncode() {
  if (!txtRaw.value) { txtEncoded.value = ''; txtMsg.value = ''; return }
  try { txtEncoded.value = btoa(unescape(encodeURIComponent(txtRaw.value))); txtMsg.value = '' }
  catch (e) { showTxtMsg('⚠ ' + e.message, false) }
}
function autoTextDecode() {
  if (!txtEncoded.value.trim()) { txtRaw.value = ''; txtMsg.value = ''; return }
  try { txtRaw.value = decodeURIComponent(escape(atob(txtEncoded.value.trim()))); txtMsg.value = '' }
  catch (e) { showTxtMsg('⚠ ' + e.message, false) }
}
function clearText() { txtRaw.value = ''; txtEncoded.value = ''; txtMsg.value = '' }

// ── image mode ──────────────────────────────
const imgPreview = ref('')
const imgB64 = ref('')
const imgInfo = ref({ type: '', size: '', w: 0, h: 0, b64len: 0 })
const imgB64Input = ref('')
const imgPreview2 = ref('')
const imgInfo2 = ref({ type: '', size: '', w: 0, h: 0, rawLen: 0 })
const imgMsg = ref('')
const imgMsgOk = ref(true)

function showImgMsg(text, ok) { imgMsg.value = text; imgMsgOk.value = ok }

function imgPrettySize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// Image → Base64
function onImageFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  showImgMsg('正在读取...', true)
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result
    imgB64.value = dataUrl.replace(/^data:[^;]+;base64,/, '') // raw base64
    imgPreview.value = dataUrl // full data URL for preview
    // Parse image info
    const img = new Image()
    img.onload = () => {
      imgInfo.value = {
        type: file.type,
        size: imgPrettySize(file.size),
        w: img.naturalWidth,
        h: img.naturalHeight,
        b64len: dataUrl.length
      }
      showImgMsg('✓ 已转换 (Base64 长度: ' + (dataUrl.length - dataUrl.indexOf(',') - 1).toLocaleString() + ' 字符)', true)
    }
    img.src = dataUrl
  }
  reader.onerror = () => showImgMsg('✗ 读取失败', false)
  reader.readAsDataURL(file)
}

function copyB64() {
  // Copy full data URL
  const full = imgPreview.value
  if (!full) { showImgMsg('⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(full).then(
    () => showImgMsg('✓ 已复制 Base64 Data URL', true),
    () => showImgMsg('✗ 复制失败', false)
  )
}

function copyRawB64() {
  const raw = imgB64.value
  if (!raw) { showImgMsg('⚠ 没有可复制的内容', false); return }
  navigator.clipboard.writeText(raw).then(
    () => showImgMsg('✓ 已复制纯 Base64 字符串', true),
    () => showImgMsg('✗ 复制失败', false)
  )
}

// Base64 → Image
function decodeImage() {
  const input = imgB64Input.value.trim()
  if (!input) { imgPreview2.value = ''; imgInfo2.value = { type: '', size: '', w: 0, h: 0, rawLen: 0 }; imgMsg.value = ''; return }

  // Accept both raw base64 and data URLs
  let dataUrl = input
  let rawB64 = input

  if (input.startsWith('data:')) {
    // Already a data URL — extract the base64 part
    const match = input.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) { showImgMsg('✗ 无效的 Data URL 格式', false); return }
    rawB64 = match[1] ? input.split(',')[1] : input // use the base64 payload
    rawB64 = input.substring(input.indexOf(',') + 1)
  } else {
    // Raw base64 — try to detect MIME type from magic bytes
    const mime = detectMime(rawB64)
    dataUrl = 'data:' + mime + ';base64,' + rawB64
  }

  try {
    // Validate base64
    atob(rawB64)
  } catch (e) {
    showImgMsg('✗ Base64 解码失败: ' + e.message, false)
    return
  }

  imgPreview2.value = dataUrl
  const img = new Image()
  img.onload = () => {
    const byteLen = rawB64.length * 3 / 4
    imgInfo2.value = {
      type: dataUrl.match(/data:([^;]+)/)?.[1] || 'unknown',
      size: imgPrettySize(Math.round(byteLen)),
      w: img.naturalWidth,
      h: img.naturalHeight,
      rawLen: input.length
    }
    showImgMsg('✓ 解码成功 (' + img.naturalWidth + '×' + img.naturalHeight + ')', true)
  }
  img.onerror = () => {
    imgPreview2.value = ''
    showImgMsg('✗ Base64 不是有效的图片', false)
  }
  img.src = dataUrl
}

function detectMime(b64) {
  const head = b64.substring(0, 12)
  if (/^\/9j/.test(head)) return 'image/jpeg'
  if (/^iVBOR/.test(head)) return 'image/png'
  if (/^R0lG/.test(head)) return 'image/gif'
  if (/^UklGR/.test(head)) return 'image/webp'
  if (/^PD94bW/.test(head) || /^PHN2/.test(head)) return 'image/svg+xml'
  return 'image/png'
}

function downloadDecoded() {
  if (!imgPreview2.value) { showImgMsg('⚠ 没有可下载的图片', false); return }
  const ext = (imgInfo2.value.type || 'image/png').split('/')[1] || 'png'
  const a = document.createElement('a')
  a.href = imgPreview2.value
  a.download = 'decoded.' + ext
  a.click()
  showImgMsg('✓ 已下载', true)
}

function clearImage() {
  imgPreview.value = ''
  imgB64.value = ''
  imgInfo.value = { type: '', size: '', w: 0, h: 0, b64len: 0 }
  imgB64Input.value = ''
  imgPreview2.value = ''
  imgInfo2.value = { type: '', size: '', w: 0, h: 0, rawLen: 0 }
  imgMsg.value = ''
  // Reset file input
  const fi = document.getElementById('imgFile2B64')
  if (fi) fi.value = ''
}
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2><span class="icon">🔐</span> Base64 转换</h2>
      <div class="b64-tabs">
        <button :class="{ active: mode === 'image' }" @click="mode = 'image'">🖼️ 图片转换</button>
        <button :class="{ active: mode === 'text' }" @click="mode = 'text'">📝 文本转换</button>
      </div>
    </div>

    <!-- 文本模式 -->
    <div class="card-body" v-if="mode === 'text'">
      <div class="two-col">
        <div>
          <div class="label">原文</div>
          <textarea v-model="txtRaw" placeholder="输入要编码的文字..." @input="autoTextEncode"></textarea>
        </div>
        <div>
          <div class="label">Base64</div>
          <textarea v-model="txtEncoded" placeholder="输入 Base64 解码..." @input="autoTextDecode"></textarea>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-primary" @click="encodeText">编码 ↓</button>
        <button class="btn-primary" @click="decodeText">解码 ↑</button>
        <button class="btn-danger" @click="clearText">清空</button>
      </div>
      <div :class="['msg', txtMsgOk ? 'success' : 'error']">{{ txtMsg }}</div>
    </div>

    <!-- 图片模式 -->
    <div class="card-body" v-else>
      <div class="b64-img-grid">

        <!-- 左：图片 → Base64 -->
        <div class="b64-panel">
          <div class="label">图片 → Base64</div>
          <div class="b64-upload-zone" @click="$refs.imgFile.click()" @dragover.prevent @drop.prevent="onImageFile({ target: { files: $event.dataTransfer.files } })">
            <template v-if="imgPreview">
              <img :src="imgPreview" class="b64-upload-preview" />
              <div class="b64-upload-overlay">点击或拖拽更换</div>
            </template>
            <template v-else>
              <div class="b64-upload-placeholder">
                <span class="b64-upload-icon">📁</span>
                <span>点击选择图片或拖拽到此处</span>
              </div>
            </template>
            <input ref="imgFile" id="imgFile2B64" type="file" accept="image/*" @change="onImageFile" hidden />
          </div>
          <div class="b64-info" v-if="imgInfo.type">
            <span>{{ imgInfo.type }}</span>
            <span>{{ imgInfo.w }} × {{ imgInfo.h }}</span>
            <span>{{ imgInfo.size }}</span>
            <span>Base64 {{ imgInfo.b64len.toLocaleString() }} 字符</span>
          </div>
          <div class="btn-row">
            <button class="btn-primary btn-sm" @click="copyB64" :disabled="!imgB64">📋 复制 Data URL</button>
            <button class="btn-secondary btn-sm" @click="copyRawB64" :disabled="!imgB64">复制纯 Base64</button>
          </div>
          <details v-if="imgB64" class="b64-raw-toggle">
            <summary>查看 Base64 文本 ({{ (imgB64.length).toLocaleString() }} 字符)</summary>
            <textarea readonly class="b64-raw-text" :value="imgB64" rows="3"></textarea>
          </details>
        </div>

        <!-- 右：Base64 → 图片 -->
        <div class="b64-panel">
          <div class="label">Base64 → 图片</div>
          <textarea
            v-model="imgB64Input"
            placeholder="粘贴 Base64 Data URL 或纯 Base64 字符串..."
            @input="decodeImage"
          ></textarea>
          <div class="b64-preview-wrap" v-if="imgPreview2">
            <img :src="imgPreview2" class="b64-preview-img" />
          </div>
          <div class="b64-preview-wrap b64-placeholder" v-else>
            <span class="b64-upload-icon">🖼️</span>
            <span>解码后在此预览</span>
          </div>
          <div class="b64-info" v-if="imgInfo2.type">
            <span>{{ imgInfo2.type }}</span>
            <span>{{ imgInfo2.w }} × {{ imgInfo2.h }}</span>
            <span>{{ imgInfo2.size }}</span>
          </div>
          <div class="btn-row">
            <button class="btn-primary btn-sm" @click="downloadDecoded" :disabled="!imgPreview2">💾 下载图片</button>
          </div>
        </div>

      </div>
      <div :class="['msg', imgMsgOk ? 'success' : 'error']">{{ imgMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.b64-tabs { display: flex; gap: 2px; background: #e5e7eb; border-radius: 8px; padding: 2px; }
.b64-tabs button {
  padding: 5px 14px; font-size: 12px; border-radius: 6px;
  background: transparent; color: #6b7280; font-weight: 500;
  transition: all 0.15s;
}
.b64-tabs button.active { background: #fff; color: #4f46e5; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

.b64-img-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 768px) {
  .b64-img-grid { grid-template-columns: 1fr; }
}
.b64-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  background: #fafafa;
}
.b64-panel .label { margin-bottom: 8px; }
.b64-panel textarea {
  min-height: 100px;
  font-size: 12px;
}

/* upload zone */
.b64-upload-zone {
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s, background 0.2s;
  margin-bottom: 10px;
}
.b64-upload-zone:hover { border-color: #4f46e5; background: #eef2ff; }
.b64-upload-preview { max-width: 100%; max-height: 200px; object-fit: contain; }
.b64-upload-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; opacity: 0; transition: opacity 0.2s;
}
.b64-upload-zone:hover .b64-upload-overlay { opacity: 1; }
.b64-upload-placeholder {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; color: #9ca3af; font-size: 13px;
}
.b64-upload-icon { font-size: 32px; }

/* preview */
.b64-preview-wrap {
  margin-top: 10px; border: 1px solid #e5e7eb;
  border-radius: 8px; min-height: 140px;
  display: flex; align-items: center; justify-content: center;
  background: #fff; overflow: hidden;
}
.b64-preview-wrap.b64-placeholder { color: #ccc; font-size: 13px; flex-direction: column; gap: 4px; }
.b64-preview-img { max-width: 100%; max-height: 280px; object-fit: contain; }

.b64-info {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
  font-size: 11px; color: #6b7280;
}
.b64-info span {
  background: #e5e7eb; padding: 2px 8px; border-radius: 10px;
  font-family: monospace;
}

.b64-raw-toggle {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
.b64-raw-toggle summary { cursor: pointer; }
.b64-raw-text {
  width: 100%; margin-top: 6px;
  font-size: 11px; min-height: 60px; color: #374151;
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 8px; resize: vertical; font-family: monospace;
  word-break: break-all;
}

.msg { margin-top: 12px; }
</style>
