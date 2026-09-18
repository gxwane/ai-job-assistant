<template>
  <el-dialog
    v-model="dialogVisible"
    title="⚙️ 大模型设置与连接中心"
    width="620px"
    :close-on-click-modal="false"
    :append-to-body="false"
    destroy-on-close
    class="settings-modal"
  >
    <!-- 状态指示条 -->
    <div class="status-banner">
      <el-alert
        v-if="currentSettings.active_mock_mode"
        type="warning"
        :closable="false"
        show-icon
        title="当前处于离线演示模式 (Mock Mode)"
        description="系统使用本地预置样本评估匹配度，不消耗任何 Token，适合无 Key 试用。配置 API Key 并测试保存后，将无缝升级为真实大模型实时推理！"
      />
      <el-alert
        v-else
        type="success"
        :closable="false"
        show-icon
        title="已连接真实大模型服务"
        :description="`当前正在使用 ${currentSettings.model} 进行深度匹配与面试题实时生成。`"
      />
    </div>

    <!-- 表单内容 -->
    <el-form :model="form" label-width="110px" class="settings-form" v-loading="loading">
      <!-- 厂商预设快捷选 -->
      <el-form-item label="服务商预设">
        <el-select v-model="form.provider" placeholder="选择服务商" @change="handleProviderChange" style="width: 100%">
          <el-option
            v-for="p in providerPresets"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          >
            <div class="provider-option">
              <span class="provider-name">{{ p.name }}</span>
              <span class="provider-desc">{{ p.desc }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- API Base URL -->
      <el-form-item label="API 端点 URL">
        <el-input
          v-model="form.base_url"
          placeholder="https://api.deepseek.com"
          clearable
        />
        <div class="field-tip">兼容 OpenAI /v1 接口规范，系统会自动规范化处理路径。</div>
      </el-form-item>

      <!-- 模型名称 -->
      <el-form-item label="模型名称">
        <el-select
          v-model="form.model"
          filterable
          allow-create
          default-first-option
          placeholder="选择或直接输入模型名称"
          style="width: 100%"
        >
          <el-option
            v-for="m in currentModelOptions"
            :key="m"
            :label="m"
            :value="m"
          />
        </el-select>
      </el-form-item>

      <!-- API Key 密钥 -->
      <el-form-item label="API Key 密钥">
        <el-input
          v-model="form.api_key"
          type="password"
          show-password
          :placeholder="apiKeyPlaceholder"
          clearable
        />
        <div class="field-tip">
          <span v-if="currentPreset?.keyUrl">
            还没有 Key？直达
            <el-link type="primary" :href="currentPreset.keyUrl" target="_blank" underline="never">
              {{ currentPreset.keyName }} ↗
            </el-link>
            获取。
          </span>
          <span v-else-if="form.provider === 'ollama'">
            💡 本地 Ollama 离线运行无需 API Key，请确保本机 11434 端口已开启。
          </span>
          <span v-else>
            密钥仅持久化存储在您本机的 SQLite 数据库中，绝不上报外部第三方。
          </span>
        </div>
      </el-form-item>

      <!-- 高级模式切换 -->
      <el-form-item label="运行模式">
        <el-radio-group v-model="form.modeSelection">
          <el-radio value="auto">智能模式 (有Key走真实AI，无Key走Mock)</el-radio>
          <el-radio value="force_mock">强制离线 Mock (节省额度)</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <!-- 连通性测试反馈区域 -->
    <div v-if="testResult" class="test-feedback-box">
      <el-alert
        :type="testResult.success ? 'success' : 'error'"
        :closable="false"
        show-icon
        :title="testResult.success ? '连接成功' : '连接探测失败'"
        :description="testResult.message"
      />
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button
          type="warning"
          plain
          :loading="testing"
          @click="handleTestConnection"
        >
          ⚡ 测试连通性
        </el-button>
        <div class="right-buttons">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">
            保存并立即生效
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getSettings, updateSettings, testConnection } from '../api/request'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'saved'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)

const currentSettings = reactive({
  provider: 'deepseek',
  base_url: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  masked_api_key: '',
  has_api_key: false,
  active_mock_mode: true,
})

const form = reactive({
  provider: 'deepseek',
  base_url: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  api_key: '',
  modeSelection: 'auto',
})

// 厂商预设配置库
const providerPresets = [
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    desc: '官方正版 API，极高性价比',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyName: 'DeepSeek 开放平台',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'siliconflow',
    name: '硅基流动 (SiliconFlow)',
    desc: '国内稳定加速，免费赠送14元体验额度',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Pro/deepseek-ai/DeepSeek-V3'],
    keyName: '硅基流动控制台',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  {
    id: 'dashscope',
    name: '阿里百炼 (通义千问/DeepSeek)',
    desc: '阿里云企业级高可用 SLA',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-max', 'deepseek-v3', 'deepseek-r1'],
    keyName: '阿里云百炼控制台',
    keyUrl: 'https://bailian.console.aliyun.com/',
  },
  {
    id: 'ollama',
    name: '本地 Ollama (完全离线/免Key)',
    desc: '本机部署，完全私有化与免费',
    baseUrl: 'http://localhost:11434/v1',
    models: ['deepseek-r1:8b', 'deepseek-r1:14b', 'qwen2.5:7b', 'llama3.1:8b'],
    keyName: '',
    keyUrl: '',
  },
  {
    id: 'openai',
    name: 'OpenAI 官方 / 代理',
    desc: '标准 GPT-4o / GPT-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o'],
    keyName: 'OpenAI Platform',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'custom',
    name: '自定义 OpenAI 兼容接口',
    desc: '支持中转站、vLLM、One-API 等任何兼容端点',
    baseUrl: '',
    models: [],
    keyName: '',
    keyUrl: '',
  },
]

const currentPreset = computed(() => {
  return providerPresets.find((p) => p.id === form.provider) || null
})

const currentModelOptions = computed(() => {
  return currentPreset.value?.models || ['deepseek-chat', 'gpt-4o-mini']
})

const apiKeyPlaceholder = computed(() => {
  if (currentSettings.has_api_key) {
    return `已配置密钥 (${currentSettings.masked_api_key})，留空保持不变`
  }
  return '请输入 API Key (例如 sk-...)'
})

// 切换服务商时自动带出推荐端点与模型
function handleProviderChange(val) {
  const preset = providerPresets.find((p) => p.id === val)
  if (preset) {
    if (preset.baseUrl) {
      form.base_url = preset.baseUrl
    }
    if (preset.models && preset.models.length > 0) {
      form.model = preset.models[0]
    }
  }
  testResult.value = null
}

// 加载当前最新配置
async function loadConfig() {
  loading.value = true
  testResult.value = null
  try {
    const data = await getSettings()
    Object.assign(currentSettings, data)
    form.provider = data.provider || 'deepseek'
    form.base_url = data.base_url || 'https://api.deepseek.com'
    form.model = data.model || 'deepseek-chat'
    form.api_key = ''
    form.modeSelection = data.is_mock_mode === true ? 'force_mock' : 'auto'
  } catch (err) {
    ElMessage.error('加载系统配置失败')
  } finally {
    loading.value = false
  }
}

// 连通性测试
async function handleTestConnection() {
  if (!form.base_url) {
    ElMessage.warning('请填写 API 端点 URL')
    return
  }
  if (!form.model) {
    ElMessage.warning('请选择或填写模型名称')
    return
  }

  testing.value = true
  testResult.value = null

  try {
    const res = await testConnection({
      provider: form.provider,
      base_url: form.base_url,
      model: form.model,
      api_key: form.api_key || (currentSettings.has_api_key ? currentSettings.masked_api_key : ''),
    })
    testResult.value = res
    if (res.success) {
      ElMessage.success(`连通测试通过！延迟 ${res.latency_ms}ms`)
    } else {
      ElMessage.warning(res.message || '连通性测试未通过')
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: err.message || '请求探测端点发生异常',
    }
  } finally {
    testing.value = false
  }
}

// 保存配置
async function handleSave() {
  if (!form.base_url) {
    ElMessage.warning('API 端点 URL 不能为空')
    return
  }
  if (!form.model) {
    ElMessage.warning('模型名称不能为空')
    return
  }

  saving.value = true
  try {
    const payload = {
      provider: form.provider,
      base_url: form.base_url,
      model: form.model,
      api_key: form.api_key || null,
      is_mock_mode: form.modeSelection === 'force_mock' ? true : null,
    }

    const updated = await updateSettings(payload)
    Object.assign(currentSettings, updated)
    form.api_key = ''
    ElMessage.success('配置已保存并立即热生效！')
    emit('saved', updated)
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadConfig()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.status-banner {
  margin-bottom: 16px;
}

.settings-form {
  padding-right: 12px;
}

.field-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}

.provider-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.provider-name {
  font-weight: 500;
  color: #303133;
}

.provider-desc {
  font-size: 11px;
  color: #909399;
}

.test-feedback-box {
  margin-top: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.right-buttons {
  display: flex;
  gap: 10px;
}
</style>
