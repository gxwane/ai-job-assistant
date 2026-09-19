import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Selective icon imports: only the 33 icons actually used across the app.
// IMPORTANT: Home.vue uses <component :is="step.icon" /> with string names
// ('Upload', 'Document', 'Cpu', 'DataAnalysis') — those icons MUST remain in
// this list or they will silently disappear at runtime.
import {
  Aim, ArrowLeft, ArrowRight, Back, Briefcase,
  ChatDotRound, ChatLineSquare, CircleCheckFilled, CircleCloseFilled,
  Clock, Connection, Cpu, DataAnalysis, Delete, Document, Download,
  Edit, Guide, Hide, InfoFilled, Loading, MagicStick,
  Plus, Reading, Refresh, Search, Setting, Star,
  Trophy, Upload, UploadFilled, View, WarningFilled,
} from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册 Element Plus
app.use(ElementPlus)
// 注册 Pinia 状态管理
app.use(createPinia())
// 注册路由
app.use(router)

// 按需注册图标（仅注册项目中实际用到的 33 个图标）
const icons = {
  Aim, ArrowLeft, ArrowRight, Back, Briefcase,
  ChatDotRound, ChatLineSquare, CircleCheckFilled, CircleCloseFilled,
  Clock, Connection, Cpu, DataAnalysis, Delete, Document, Download,
  Edit, Guide, Hide, InfoFilled, Loading, MagicStick,
  Plus, Reading, Refresh, Search, Setting, Star,
  Trophy, Upload, UploadFilled, View, WarningFilled,
}
for (const [key, component] of Object.entries(icons)) {
  app.component(key, component)
}

app.mount('#app')

