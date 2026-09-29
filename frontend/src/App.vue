<template>
  <!-- AI求职助手 - 根组件 -->
  <div id="app-container">
    <!-- 顶部现代化半透明毛玻璃导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <router-link to="/" class="brand-logo">
          <div class="logo-icon-box">
            <el-icon :size="18"><Briefcase /></el-icon>
          </div>
          <div class="logo-text-wrap">
            <span class="logo-title">AI求职助手</span>
            <span class="logo-badge">PRO</span>
          </div>
        </router-link>

        <nav class="nav-links">
          <router-link to="/" class="nav-item">首页</router-link>
          <router-link to="/history" class="nav-item">历史记录</router-link>
          <router-link to="/plugin-jobs" class="nav-item">插件岗位</router-link>
          <router-link to="/resumes" class="nav-item">简历管理</router-link>
          <router-link to="/dashboard" class="nav-item">数据统计</router-link>

          <!-- 大模型连接状态胶囊与设置按钮 -->
          <div class="header-settings-action">
            <div
              class="model-status-chip model-status-tag"
              :class="{ 'chip-mock': activeMockMode, 'chip-live': !activeMockMode }"
              @click="settingsVisible = true"
              :title="activeMockMode ? '当前处于 Mock 演示模式，点击配置真实大模型' : '当前连接：' + currentModelName"
            >
              <span class="status-pulse-dot" :class="{ 'pulse-live': !activeMockMode }"></span>
              <span class="model-name-text">{{ activeMockMode ? 'Mock 演示模式' : currentModelName }}</span>
            </div>
            <button
              class="settings-trigger-btn settings-btn"
              @click="settingsVisible = true"
              title="大模型与服务接口配置"
            >
              <el-icon :size="15"><Setting /></el-icon>
              <span>配置</span>
            </button>
          </div>
        </nav>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 全局配置弹窗 -->
    <SettingsModal
      v-model:visible="settingsVisible"
      @saved="onSettingsSaved"
    />

    <!-- 极简现代底部 -->
    <footer class="app-footer">
      <div class="footer-content">
        <p>AI求职助手 · 智能伴侣 &nbsp;|&nbsp; 专注于为职场人打造的本地化深度匹配与求职赋能引擎</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import SettingsModal from './components/SettingsModal.vue'
import { getSettings } from './api/request'

const settingsVisible = ref(false)
const activeMockMode = ref(true)
const currentModelName = ref('AI 模型未就绪')

async function fetchStatus() {
  try {
    const data = await getSettings()
    activeMockMode.value = data.active_mock_mode
    currentModelName.value = data.model || 'DeepSeek'
  } catch (e) {
    // 静默降级
  }
}

function onSettingsSaved(newSettings) {
  activeMockMode.value = newSettings.active_mock_mode
  currentModelName.value = newSettings.model || 'DeepSeek'
}

onMounted(() => {
  fetchStatus()
})
</script>

<style>
/* 全局样式基准 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f8fafc;
  background-image:
    radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.04) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.04) 0px, transparent 50%);
  background-attachment: fixed;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
}

#app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部半透明毛玻璃导航 */
.app-header {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.header-content {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 品牌 Logo */
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  cursor: pointer;
}

.logo-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.28);
}

.logo-text-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #0f172a;
}

.logo-badge {
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  padding: 1px 6px;
  border-radius: 10px;
  letter-spacing: 0.5px;
}

/* 导航链接 */
.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-item {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  padding: 6px 14px;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-item:hover {
  color: #0f172a;
  background: rgba(0, 0, 0, 0.04);
}

.nav-item.router-link-exact-active,
.nav-item.router-link-active {
  color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}

/* 右侧设置与模型状态 */
.header-settings-action {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #e2e8f0;
}

.model-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.model-status-chip.chip-mock {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #b45309;
}

.model-status-chip.chip-mock:hover {
  background: #fef3c7;
}

.model-status-chip.chip-live {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.model-status-chip.chip-live:hover {
  background: #dcfce7;
}

.status-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f59e0b;
}

.status-pulse-dot.pulse-live {
  background-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.settings-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.settings-trigger-btn:hover {
  border-color: #cbd5e1;
  color: #0f172a;
  background: #f1f5f9;
}

/* 主内容容器 */
.app-main {
  flex: 1;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px;
}

/* 底部 */
.app-footer {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 24px 20px;
  border-top: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
}
</style>
