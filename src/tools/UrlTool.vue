<script setup>
import { ref } from 'vue'

const urlRaw = ref('')
const urlEncoded = ref('')
const urlMsg = ref('')
const urlMsgClass = ref('msg')

function showMsg(text, ok) { urlMsg.value = text; urlMsgClass.value = 'msg ' + (ok ? 'success' : 'error') }

function encodeUrl() {
  try { urlEncoded.value = encodeURIComponent(urlRaw.value); showMsg('✓ 编码成功', true) }
  catch (e) { showMsg('✗ 编码错误: ' + e.message, false) }
}
function decodeUrl() {
  try { urlRaw.value = decodeURIComponent(urlEncoded.value); showMsg('✓ 解码成功', true) }
  catch (e) { showMsg('✗ 解码错误: ' + e.message, false) }
}
function autoUrlEncode() {
  urlEncoded.value = urlRaw.value ? encodeURIComponent(urlRaw.value) : ''
  urlMsg.value = ''
}
function autoUrlDecode() {
  if (!urlEncoded.value) { urlRaw.value = ''; urlMsg.value = ''; return }
  try { urlRaw.value = decodeURIComponent(urlEncoded.value); urlMsg.value = '' }
  catch (e) { showMsg('⚠ ' + e.message, false) }
}
function clearUrl() { urlRaw.value = ''; urlEncoded.value = ''; urlMsg.value = '' }
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2><span class="icon">🔗</span> URL 编解码</h2>
    </div>
    <div class="card-body">
      <div class="two-col">
        <div>
          <div class="label">原文</div>
          <textarea v-model="urlRaw" placeholder="输入要编码的文字或 URL..." @input="autoUrlEncode"></textarea>
        </div>
        <div>
          <div class="label">编码结果</div>
          <textarea v-model="urlEncoded" placeholder="编码后的结果..." @input="autoUrlDecode"></textarea>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-primary" @click="encodeUrl">编码 ↓</button>
        <button class="btn-primary" @click="decodeUrl">解码 ↑</button>
        <button class="btn-danger" @click="clearUrl">清空</button>
      </div>
      <div :class="urlMsgClass">{{ urlMsg }}</div>
    </div>
  </div>
</template>
