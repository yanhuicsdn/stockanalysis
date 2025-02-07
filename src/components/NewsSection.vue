<template>
  <div class="news-section">
    <el-card class="news-card">
      <template #header>
        <div class="card-header">
          <span>公司资讯</span>
          <el-button @click="refreshNews" :loading="loading" circle>
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>

      <div v-if="news && news.length > 0" class="news-list">
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in parseNewsContent(news)"
            :key="index"
            :timestamp="formatTime(item.time)"
            type="primary"
          >
            <div class="news-item">
              <h4 class="news-title">{{ item.title }}</h4>
              <p class="news-content">{{ item.content }}</p>
              <div class="news-meta">
                <el-tag size="small" type="info">{{ item.category }}</el-tag>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div v-else-if="loading" class="loading-placeholder">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else class="no-data">
        <el-empty description="暂无资讯" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import perplexityApiService from '../services/perplexityApi'

const props = defineProps({
  symbol: {
    type: String,
    required: true
  }
})

const news = ref([])
const loading = ref(false)
const lastUpdateTime = ref(null)

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // 24小时内显示相对时间
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes} 分钟前`
    }
    return `${hours} 小时前`
  }
  
  // 超过24小时显示具体日期
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 解析新闻内容
const parseNewsContent = (content) => {
  if (!content || typeof content !== 'string') return []
  
  const newsItems = []
  const lines = content.split('\n')
  let currentItem = null

  lines.forEach(line => {
    line = line.trim()
    if (!line) return

    // 检查是否是新的条目（数字开头）
    if (/^\d+\./.test(line)) {
      if (currentItem) {
        newsItems.push(currentItem)
      }
      currentItem = {
        title: line,
        content: '',
        category: '公司动态',
        time: new Date().toISOString()
      }
    } else if (currentItem) {
      currentItem.content += line + ' '
    }
  })

  // 添加最后一个条目
  if (currentItem) {
    newsItems.push(currentItem)
  }

  return newsItems
}

// 检查是否需要更新（10分钟更新一次）
const shouldUpdate = () => {
  if (!lastUpdateTime.value) return true
  const now = new Date()
  const diff = now - new Date(lastUpdateTime.value)
  return diff > 10 * 60 * 1000 // 10分钟
}

// 刷新新闻
const refreshNews = async (force = false) => {
  if (!props.symbol) return
  if (!force && !shouldUpdate()) {
    console.log('新闻数据在10分钟内已更新，跳过刷新')
    return
  }
  
  loading.value = true
  try {
    const result = await perplexityApiService.getCompanyNews(props.symbol)
    news.value = result.news
    lastUpdateTime.value = result.timestamp
  } catch (error) {
    console.error('News fetch error:', error)
    ElMessage.error('获取公司资讯失败')
  } finally {
    loading.value = false
  }
}

// 监听股票代码变化
watch(() => props.symbol, (newSymbol) => {
  if (newSymbol) {
    refreshNews()
  } else {
    news.value = []
  }
})

// 初始化
onMounted(() => {
  if (props.symbol) {
    refreshNews(true) // 首次加载强制刷新
  }
})
</script>

<style scoped>
.news-section {
  margin: 20px 0;
}

.news-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.news-list {
  padding: 10px;
}

.news-item {
  padding: 10px;
  border-radius: 4px;
  background-color: #f8f9fa;
  margin-bottom: 10px;
}

.news-title {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.news-title a {
  color: #2c3e50;
  text-decoration: none;
  transition: color 0.2s;
}

.news-title a:hover {
  color: #409EFF;
}

.news-content {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 10px 0;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.loading-placeholder {
  padding: 20px;
}

.no-data {
  padding: 40px 0;
}
</style>
