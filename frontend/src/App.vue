<template>
  <!-- AI求职助手 - 根组件 -->
  <div id="app-container">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-content">
        <router-link to="/" class="logo">
          <el-icon :size="28"><Briefcase /></el-icon>
          <span class="logo-text">AI求职助手</span>
        </router-link>
        <nav class="nav-links">
          <router-link to="/">
            <el-button type="primary" text>首页</el-button>
          </router-link>
          <router-link to="/history">
            <el-button text>历史记录</el-button>
          </router-link>
          <router-link to="/plugin-jobs">
            <el-button text>插件岗位</el-button>
          </router-link>
          <router-link to="/resumes">
            <el-button text>简历管理</el-button>
          </router-link>
          <router-link to="/dashboard">
            <el-button text>数据统计</el-button>
          </router-link>

          <!-- 大模型连接状态胶囊与设置按钮 -->
          <div class="header-settings-action">
            <el-tag
              :type="activeMockMode ? 'warning' : 'success'"
              effect="dark"
              round
              size="small"
              class="model-status-tag"
              @click="settingsVisible = true"
            >
              <span class="status-dot" :class="{ 'dot-live': !activeMockMode }"></span>
              {{ activeMockMode ? 'Mock 演示模式' : currentModelName }}
            </el-tag>
            <el-button
              text
              class="settings-btn"
              @click="settingsVisible = true"
            >
              <el-icon :size="16"><Setting /></el-icon>
              <span>模型设置</span>
            </el-button>
          </div>
        </nav>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <router-view />
    </el-main>

    <!-- 全局配置弹窗 -->
    <SettingsModal
      v-model:visible="settingsVisible"
      @saved="onSettingsSaved"
    />

    <!-- 底部 -->
    <el-footer class="app-footer">
      <p>AI求职助手 MVP v1.0 - 仅用于求职辅助，分析结果仅供参考</p>
    </el-footer>
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
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f0f2f5;
  color: #333;
}

#app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 40px;
  height: 60px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: white;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
}

.nav-links a {
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-settings-action {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.25);
}

.model-status-tag {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  padding: 0 10px;
  transition: transform 0.2s;
}

.model-status-tag:hover {
  transform: scale(1.05);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #e6a23c;
  display: inline-block;
}

.status-dot.dot-live {
  background-color: #67c23a;
  box-shadow: 0 0 6px #67c23a;
}

.settings-btn {
  color: white !important;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.nav-links .el-button {
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
}

.nav-links .el-button--primary {
  color: white !important;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px;
}

.app-footer {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px;
  border-top: 1px solid #ebeef5;
  background: white;
}
</style>
