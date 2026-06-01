import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './style.css'

console.debug('[DevToolbox] v1.0.1 mount')
createApp(App).use(router).mount('#app')
