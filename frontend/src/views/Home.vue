<template>
  <!-- 首页 - 项目介绍入口 -->
  <div class="home-page">
    <!-- Hero 区域 -->
    <div class="hero-section">
      <div class="hero-icon">
        <el-icon :size="80"><MagicStick /></el-icon>
      </div>
      <h1 class="hero-title">AI 求职助手</h1>
      <p class="hero-subtitle">
        上传简历，粘贴岗位 JD，AI 帮你快速判断岗位匹配度
      </p>
      <div class="hero-features">
        <el-tag type="success" size="large" effect="plain">简历智能解析</el-tag>
        <el-tag type="primary" size="large" effect="plain">岗位匹配分析</el-tag>
        <el-tag type="warning" size="large" effect="plain">简历优化建议</el-tag>
        <el-tag type="danger" size="large" effect="plain">面试题库生成</el-tag>
      </div>
      <div class="hero-actions">
        <el-button type="primary" size="large" round @click="$router.push('/upload')">
          <el-icon><Upload /></el-icon> 开始分析
        </el-button>
        <el-button size="large" round @click="$router.push('/history')">
          <el-icon><Clock /></el-icon> 查看历史记录
        </el-button>
      </div>
    </div>

    <!-- 使用流程 -->
    <el-row :gutter="24" class="steps-section">
      <el-col :span="6" v-for="(step, index) in steps" :key="index">
        <el-card shadow="hover" class="step-card">
          <div class="step-number">{{ index + 1 }}</div>
          <el-icon :size="40" :color="step.color">
            <component :is="step.icon" />
          </el-icon>
          <h3>{{ step.title }}</h3>
          <p>{{ step.desc }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
const steps = [
  {
    icon: 'Upload',
    color: '#409EFF',
    title: '上传简历',
    desc: '支持 PDF 和 Word 格式，自动解析文本',
  },
  {
    icon: 'Document',
    color: '#67C23A',
    title: '粘贴 JD',
    desc: '输入岗位名称，粘贴岗位描述',
  },
  {
    icon: 'Cpu',
    color: '#E6A23C',
    title: 'AI 分析',
    desc: '大模型分析简历与岗位匹配度',
  },
  {
    icon: 'DataAnalysis',
    color: '#F56C6C',
    title: '查看结果',
    desc: '获取评分、建议和面试题库',
  },
]
</script>

<style scoped>
.home-page {
  padding: 20px 0;
}

.hero-section {
  text-align: center;
  padding: 60px 20px 50px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  border-radius: 16px;
  margin-bottom: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.hero-icon {
  margin-bottom: 20px;
  color: #667eea;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
}

.hero-subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 28px;
  line-height: 1.6;
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 36px;
  flex-wrap: wrap;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.hero-actions .el-button {
  padding: 14px 36px;
  font-size: 16px;
}

.steps-section {
  max-width: 1000px;
  margin: 0 auto;
}

.step-card {
  text-align: center;
  border-radius: 12px;
  transition: transform 0.2s;
}

.step-card:hover {
  transform: translateY(-4px);
}

.step-number {
  width: 32px;
  height: 32px;
  line-height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: bold;
  margin: 0 auto 12px;
  font-size: 14px;
}

.step-card h3 {
  margin: 12px 0 8px;
  font-size: 16px;
  color: #333;
}

.step-card p {
  color: #999;
  font-size: 13px;
  line-height: 1.5;
}
</style>
