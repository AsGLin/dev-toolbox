import { createRouter, createWebHashHistory } from 'vue-router'
import JsonTool from './tools/JsonTool.vue'
import UrlTool from './tools/UrlTool.vue'
import Base64Tool from './tools/Base64Tool.vue'
import ImageTool from './tools/ImageTool.vue'
import BarcodeTool from './tools/BarcodeTool.vue'
import GzipTool from './tools/GzipTool.vue'

const routes = [
  { path: '/', redirect: '/json' },
  { path: '/json', component: JsonTool },
  { path: '/url', component: UrlTool },
  { path: '/base64', component: Base64Tool },
  { path: '/image', component: ImageTool },
  { path: '/barcode', component: BarcodeTool },
  { path: '/gzip', component: GzipTool },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.onError((error) => {
  if (error?.message?.includes('Failed to fetch dynamically imported module')) {
    window.location.reload()
  }
})

export default router
