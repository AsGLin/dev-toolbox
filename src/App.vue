<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { TOOLS } from './tools.js'

const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)

const currentTool = computed(() => {
  return TOOLS.find(t => '/' + t.id === route.path) || TOOLS[0]
})

function navigate(id) {
  const tool = TOOLS.find(t => t.id === id)
  if (tool) { router.push(tool.route); sidebarOpen.value = false }
}

function toggleSidebar(force) {
  sidebarOpen.value = force !== undefined ? force : !sidebarOpen.value
}
</script>

<template>
  <div class="app-layout">

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">🛠 开发者工具箱</div>
        <div class="subtitle">Developer Utilities</div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">常用工具</div>
        <nav>
          <a
            v-for="tool in TOOLS"
            :key="tool.id"
            class="nav-item"
            :class="{ active: currentTool.id === tool.id }"
            @click.prevent="navigate(tool.id)"
            :href="'#' + tool.route"
          >
            <span class="nav-icon">{{ tool.icon }}</span>
            <span>{{ tool.name }}</span>
          </a>
        </nav>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="content-area">
      <!-- Topbar -->
      <header class="topbar">
        <button class="hamburger-btn" @click="toggleSidebar()" aria-label="菜单">☰</button>
        <span class="topbar-title">{{ currentTool.name }}</span>
      </header>

      <!-- Tool Panels -->
      <div class="tool-panels">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </main>

  </div>

  <!-- Mobile overlay -->
  <div
    class="mobile-overlay"
    :class="{ visible: sidebarOpen }"
    @click="toggleSidebar(false)"
  ></div>
</template>
