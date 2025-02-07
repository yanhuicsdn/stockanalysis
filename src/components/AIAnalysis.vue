<template>
  <div class="ai-analysis">
    <el-card class="analysis-card">
      <template #header>
        <div class="card-header">
          <span>AI 分析报告</span>
          <el-button @click="refreshAnalysis" :loading="loading" circle>
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>

      <div v-if="analysis" class="analysis-content">
        <div class="correlation-section">
          <h3>价格变动相关性分析</h3>
          <el-progress
            :percentage="correlationScore"
            :color="correlationColor"
            :format="formatCorrelation"
            :stroke-width="15"
          />
          <div class="correlation-explanation">
            相关性得分：{{ correlationScore.toFixed(0) }}%
            <el-tooltip
              content="此得分表示AI分析结果与价格变动的相关程度。得分越高，表示新闻事件与价格变动的关联越强。"
              placement="top"
            >
              <el-icon class="info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>

        <div class="analysis-text">
          <div class="timestamp">
            分析时间：{{ formatTime(analysis.timestamp) }}
          </div>
          <div class="content" v-html="formatAnalysis(analysis.analysis)"></div>
        </div>
      </div>

      <div v-else class="no-data">
        <el-empty description="暂无分析数据" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, InfoFilled } from '@element-plus/icons-vue'
import perplexityApiService from '../services/perplexityApi'

const props = defineProps({
  stockData: {
    type: Object,
    required: true
  }
})

const analysis = ref(null)
const loading = ref(false)
const correlationScore = ref(0)
const lastUpdateTime = ref(null)

// 计算相关性颜色
const correlationColor = computed(() => {
  const score = correlationScore.value
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  return '#F56C6C'
})

// 格式化相关性显示
const formatCorrelation = (percentage) => {
  if (percentage >= 80) return '强相关'
  if (percentage >= 60) return '中等相关'
  return '弱相关'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化分析文本
const formatAnalysis = (text) => {
  if (!text) return ''
  return text.split('\n').map(line => {
    if (line.trim().startsWith('1.') || 
        line.trim().startsWith('2.') || 
        line.trim().startsWith('3.') || 
        line.trim().startsWith('4.')) {
      return `<p class="analysis-point">${line}</p>`
    }
    return `<p>${line}</p>`
  }).join('')
}

// 检查是否需要更新（10分钟更新一次）
const shouldUpdate = () => {
  if (!lastUpdateTime.value) return true
  const now = new Date()
  const diff = now - new Date(lastUpdateTime.value)
  return diff > 10 * 60 * 1000 // 10分钟
}

// 刷新分析
const refreshAnalysis = async (force = false) => {
  if (!props.stockData?.symbol) return
  if (!force && !shouldUpdate()) {
    console.log('分析数据在10分钟内已更新，跳过刷新')
    return
  }
  
  loading.value = true
  try {
    const result = await perplexityApiService.analyzeStockCorrelation(
      props.stockData.symbol,
      props.stockData,
      props.stockData.priceChange
    )
    
    analysis.value = result
    correlationScore.value = result.correlationScore * 100
    lastUpdateTime.value = new Date().toISOString()
  } catch (error) {
    console.error('Analysis error:', error)
    ElMessage.error('获取分析数据失败')
  } finally {
    loading.value = false
  }
}

// 监听股票数据变化
watch(() => props.stockData, (newData) => {
  if (newData?.symbol) {
    refreshAnalysis()
  }
}, { deep: true })

// 初始化
onMounted(() => {
  if (props.stockData?.symbol) {
    refreshAnalysis(true) // 首次加载强制刷新
  }
})
</script>

<style scoped>
.ai-analysis {
  margin: 20px 0;
}

.analysis-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.correlation-section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.correlation-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.correlation-explanation {
  margin-top: 10px;
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.info-icon {
  color: #909399;
  cursor: help;
}

.analysis-text {
  margin-top: 20px;
}

.timestamp {
  color: #909399;
  font-size: 12px;
  margin-bottom: 10px;
}

.content {
  line-height: 1.6;
}

.analysis-point {
  margin: 10px 0;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.no-data {
  padding: 40px 0;
}

:deep(.el-progress-bar__inner) {
  transition: all 0.5s ease;
}
</style>
