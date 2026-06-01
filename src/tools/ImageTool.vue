<script setup>
import { ref, reactive, computed } from 'vue'

const fileInput = ref(null)
const targetKb = ref(200)
const maxWidth = ref('1080')
const imgStatus = ref('请选择图片。')
const compressDisabled = ref(false)

const tasks = reactive([])
const downloadAllDisabled = computed(() => tasks.filter(t => t.resultBlob && !t.error).length === 0)

function prettySize(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function imgSummary() {
  const total = tasks.length
  const done = tasks.filter(t => t.resultBlob).length
  const ok = tasks.filter(t => t.resultBlob && !t.error).length
  const before = tasks.reduce((s, t) => s + (t.file?.size || 0), 0)
  const after = tasks.reduce((s, t) => s + (t.resultBlob?.size || 0), 0)
  const reduced = before > 0 && after > 0 ? ((1 - after / before) * 100).toFixed(1) : '0.0'
  return `当前 ${total} 张，已压缩 ${done} 张（成功 ${ok} 张）。原 ${prettySize(before)} → 压缩后 ${prettySize(after)}，减少 ${reduced}%。`
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')) }
    img.src = url
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('转码失败')), type, quality)
  })
}

function drawToCanvas(img, mw) {
  let w = img.naturalWidth, h = img.naturalHeight
  if (mw > 0 && w > mw) { const r = mw / w; w = Math.round(w * r); h = Math.round(h * r) }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return { canvas, width: w, height: h }
}

async function compressToTarget(canvas, targetBytes) {
  const mime = 'image/jpeg'
  let low = 0.2, high = 0.95
  let best = await canvasToBlob(canvas, mime, high)
  if (best.size <= targetBytes) return { blob: best, quality: high }
  for (let i = 0; i < 9; i++) {
    const q = (low + high) / 2
    const blob = await canvasToBlob(canvas, mime, q)
    blob.size > targetBytes ? (high = q) : (low = q, best = blob)
  }
  if (best.size > targetBytes) { best = await canvasToBlob(canvas, mime, 0.18); return { blob: best, quality: 0.18 } }
  return { blob: best, quality: low }
}

async function onFilesSelected(e) {
  const files = Array.from(e.target.files || [])
  clearTasks(false)
  if (!files.length) return
  imgStatus.value = '正在读取图片信息...'
  for (const file of files) {
    try {
      const { img, url } = await loadImage(file)
      tasks.push({ file, width: img.naturalWidth, height: img.naturalHeight, previewUrl: url, resultBlob: null, resultUrl: '', resultText: '待压缩', error: '' })
    } catch (err) { imgStatus.value = '有图片读取失败：' + file.name }
  }
  imgStatus.value = '已选择 ' + tasks.length + ' 张图片，可开始批量压缩。'
}

async function compressAll() {
  if (!tasks.length) { imgStatus.value = '请先选择图片。'; return }
  const kb = Number(targetKb.value)
  if (!Number.isFinite(kb) || kb < 10) { imgStatus.value = '目标大小至少 10KB。'; return }
  const tBytes = Math.round(kb * 1024)
  const mw = Number(maxWidth.value)
  compressDisabled.value = true
  let done = 0
  for (const task of tasks) {
    done++
    task.resultText = '压缩中 (' + done + '/' + tasks.length + ')...'
    imgStatus.value = '正在压缩第 ' + done + '/' + tasks.length + ' 张：' + task.file.name
    try {
      const { img } = await loadImage(task.file)
      const { canvas, width, height } = drawToCanvas(img, mw)
      const { blob, quality } = await compressToTarget(canvas, tBytes)
      if (task.resultUrl) URL.revokeObjectURL(task.resultUrl)
      task.resultBlob = blob
      task.resultUrl = URL.createObjectURL(blob)
      const ratio = ((1 - blob.size / task.file.size) * 100).toFixed(1)
      task.resultText = width + ' x ' + height + ' | ' + prettySize(blob.size) + ' | Q' + (quality * 100).toFixed(0) + '% | -' + ratio + '%'
    } catch (err) {
      task.error = err.message || '压缩失败'
      task.resultText = '失败：' + task.error
    }
  }
  const ok = tasks.filter(t => t.resultBlob && !t.error).length
  imgStatus.value = '批量压缩完成。成功 ' + ok + '/' + tasks.length + ' 张。'
  compressDisabled.value = false
}

function downloadOne(task) {
  if (!task.resultUrl) return
  const a = document.createElement('a')
  a.href = task.resultUrl; a.download = task.file.name.replace(/\.[^.]+$/, '') + '-compressed.jpg'; a.click()
}
async function downloadAll() {
  const ready = tasks.filter(t => t.resultUrl)
  if (!ready.length) return
  imgStatus.value = '准备下载 ' + ready.length + ' 张图片...'
  for (const task of ready) {
    const a = document.createElement('a')
    a.href = task.resultUrl; a.download = task.file.name.replace(/\.[^.]+$/, '') + '-compressed.jpg'; a.click()
    await new Promise(r => setTimeout(r, 140))
  }
  imgStatus.value = '已触发 ' + ready.length + ' 张下载。'
}

function clearTasks(resetPicker = true) {
  tasks.forEach(t => {
    if (t.previewUrl) URL.revokeObjectURL(t.previewUrl)
    if (t.resultUrl) URL.revokeObjectURL(t.resultUrl)
  })
  tasks.length = 0
  if (resetPicker && fileInput.value) fileInput.value.value = ''
  imgStatus.value = '请选择图片。'
}
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2><span class="icon">🖼️</span> 图片批量压缩</h2>
    </div>
    <div class="card-body">
      <div class="img-controls">
        <div class="fld"><label>选择图片（可多选）</label>
          <input ref="fileInput" type="file" accept="image/*" multiple @change="onFilesSelected" />
        </div>
        <div class="fld"><label>每张目标大小（KB）</label>
          <input v-model.number="targetKb" type="number" min="10" step="1" />
        </div>
        <div class="fld"><label>最大宽度</label>
          <select v-model="maxWidth">
            <option value="720">720px</option>
            <option value="1080">1080px（推荐）</option>
            <option value="1440">1440px</option>
            <option value="0">不限制</option>
          </select>
        </div>
        <button class="btn-primary" :disabled="compressDisabled" @click="compressAll">批量压缩</button>
      </div>
      <div class="btn-row">
        <button class="btn-ghost" :disabled="downloadAllDisabled" @click="downloadAll">下载全部</button>
        <button class="btn-danger" @click="clearTasks(true)">清空</button>
      </div>
      <div class="img-status">{{ imgStatus }}</div>
      <div class="img-summary">{{ imgSummary() }}</div>
      <div class="img-list">
        <div class="img-row head"><div>预览</div><div>文件名</div><div>原图</div><div>压缩结果</div><div>下载</div></div>
        <div class="img-row" v-for="(t, i) in tasks" :key="i">
          <img class="img-thumb" :src="t.previewUrl" alt="预览" />
          <div class="img-name">{{ t.file.name }}</div>
          <div class="img-meta">{{ t.width }} x {{ t.height }} | {{ prettySize(t.file.size) }}</div>
          <div class="img-result">{{ t.resultText }}</div>
          <button class="btn-ghost" :disabled="!t.resultUrl" @click="downloadOne(t)">下载</button>
        </div>
      </div>
      <div class="img-hint">提示：输出为 JPEG，Canvas 纯前端压缩，不上传服务器。</div>
    </div>
  </div>
</template>

<style scoped>
.img-controls { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; align-items: end; margin-bottom: 12px; }
.img-controls .fld { display: grid; gap: 4px; }
.img-controls label { font-size: 12px; color: #6b7280; }
.img-controls input, .img-controls select {
  width: 100%; border: 1px solid #e0e0e0; border-radius: 6px;
  padding: 8px 10px; font-size: 13px; font-family: inherit; background: #fff;
}
.img-controls input:focus, .img-controls select:focus { border-color: #4f46e5; outline: none; box-shadow: 0 0 0 2px rgba(79,70,229,0.12); }
.img-status { font-size: 12px; color: #6b7280; min-height: 20px; margin-bottom: 8px; }
.img-summary { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; background: #f8fafc; font-size: 12px; color: #475569; margin-bottom: 10px; }
.img-list { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
.img-row { display: grid; grid-template-columns: 56px 2fr 1.2fr 1fr 100px; gap: 8px; align-items: center; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
.img-row:last-child { border-bottom: none; }
.img-row.head { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 11px; }
.img-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #e0e0e0; background: #f1f5f9; }
.img-name { color: #334155; word-break: break-all; }
.img-meta { color: #64748b; font-size: 11px; }
.img-result { color: #64748b; font-size: 11px; }
.img-row button { padding: 5px 10px; font-size: 11px; border-radius: 6px; }
.img-hint { margin-top: 12px; font-size: 11px; color: #6b7280; }
@media (max-width: 768px) {
  .img-controls { grid-template-columns: 1fr 1fr; }
  .img-row { grid-template-columns: 44px 1fr; }
  .img-row.head { display: none; }
  .img-meta, .img-result { grid-column: 1 / -1; }
  .img-row button { grid-column: 1 / -1; }
}
</style>
