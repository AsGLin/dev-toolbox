<script setup>
import { ref, onMounted, nextTick } from 'vue'

const bcValue = ref('1234567890')
const bcFormat = ref('CODE128')
const bcWidth = ref(2)
const bcHeight = ref(80)
const bcFg = ref('#000000')
const bcBg = ref('#ffffff')
const bcText = ref(true)
const bcFontSize = ref(16)
const bcMsg = ref('')
const bcMsgClass = ref('msg')
const bcLabel = ref('1234567890')

function showMsg(text, ok) { bcMsg.value = text; bcMsgClass.value = 'msg ' + (ok ? 'success' : 'error') }

function generate() {
  try {
    const val = bcValue.value.trim()
    if (!val) { showMsg('', false); return }
    const format = bcFormat.value

    if (format === 'EAN13' && !/^\d{12,13}$/.test(val)) { showMsg('⚠ EAN-13 需要 12-13 位数字', false); return }
    if (format === 'EAN8' && !/^\d{7,8}$/.test(val)) { showMsg('⚠ EAN-8 需要 7-8 位数字', false); return }
    if (format === 'UPC' && !/^\d{11,12}$/.test(val)) { showMsg('⚠ UPC-A 需要 11-12 位数字', false); return }

    nextTick(() => {
      JsBarcode('#bcCanvas', val, {
        format, width: bcWidth.value, height: bcHeight.value,
        lineColor: bcFg.value, background: bcBg.value,
        displayValue: bcText.value, fontSize: bcFontSize.value, margin: 10,
        valid: function(valid) { if (!valid) showMsg('⚠ 该内容不适用于 ' + format + ' 格式', false) }
      })
      bcLabel.value = val
      showMsg('✓ ' + format + ' 条码已生成', true)
    })
  } catch (e) { showMsg('✗ 生成失败: ' + e.message, false) }
}

function download() {
  const svg = document.querySelector('#bcCanvas svg')
  if (!svg) { showMsg('⚠ 没有可下载的条码', false); return }
  const data = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'barcode-' + (bcValue.value.trim() || 'output') + '.svg'; a.click()
  URL.revokeObjectURL(url)
  showMsg('✓ 条码已下载为 SVG', true)
}

onMounted(() => { nextTick(generate) })
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2><span class="icon">📊</span> 条码生成器</h2>
      <div style="display:flex;gap:6px;">
        <button class="btn-sm btn-success" @click="download">💾 下载</button>
      </div>
    </div>
    <div class="card-body">
      <div class="barcode-layout">
        <div class="barcode-settings">
          <div class="fld"><label>条码内容</label>
            <input v-model="bcValue" type="text" placeholder="输入条码内容…" @input="generate" />
          </div>
          <div class="fld"><label>条码格式</label>
            <select v-model="bcFormat" @change="generate">
              <option value="CODE128">CODE128（通用）</option>
              <option value="CODE128A">CODE128A</option>
              <option value="CODE128B">CODE128B</option>
              <option value="CODE128C">CODE128C</option>
              <option value="CODE39">CODE39</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPC">UPC-A</option>
              <option value="ITF">ITF-14</option>
              <option value="MSI">MSI</option>
              <option value="codabar">Codabar</option>
              <option value="pharmacode">Pharmacode</option>
            </select>
          </div>
          <div class="fld-row">
            <div class="fld"><label>宽度</label>
              <input v-model.number="bcWidth" type="number" min="1" max="5" step="0.5" @input="generate" />
            </div>
            <div class="fld"><label>高度 (px)</label>
              <input v-model.number="bcHeight" type="number" min="20" max="200" @input="generate" />
            </div>
          </div>
          <div class="fld-row">
            <div class="fld"><label>线条颜色</label>
              <input v-model="bcFg" type="color" @input="generate" />
            </div>
            <div class="fld"><label>背景颜色</label>
              <input v-model="bcBg" type="color" @input="generate" />
            </div>
          </div>
          <div class="fld-row">
            <div class="fld"><label><input v-model="bcText" type="checkbox" @change="generate" /> 显示文字</label></div>
            <div class="fld"><label>字号 (px)</label>
              <input v-model.number="bcFontSize" type="number" min="8" max="28" @input="generate" />
            </div>
          </div>
        </div>
        <div class="barcode-preview">
          <div id="bcCanvas" style="display:inline-block;"></div>
          <div class="barcode-label">{{ bcLabel }}</div>
        </div>
      </div>
      <div :class="bcMsgClass">{{ bcMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.barcode-layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
.barcode-settings { display: grid; gap: 12px; }
.fld { display: grid; gap: 4px; }
.fld label { font-size: 12px; color: #6b7280; font-weight: 500; }
.fld input[type="text"], .fld select, .fld input[type="number"] { width: 100%; }
.fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.barcode-preview {
  text-align: center; background: #fafafa; border: 1px solid #e0e0e0;
  border-radius: 8px; padding: 24px; min-height: 260px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
}
.barcode-label { font-family: "Fira Code", "Consolas", monospace; font-size: 13px; color: #555; margin-top: 6px; }
#bcCanvas :deep(svg) { max-width: 100%; height: auto; }
@media (max-width: 768px) { .barcode-layout { grid-template-columns: 1fr; } }
</style>
