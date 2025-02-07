<template>
  <div class="stock-price">
    <el-card class="price-card" :class="priceChangeClass">
      <template #header>
        <div class="card-header">
          <span>实时价格</span>
          <el-button @click="refreshPrice" :loading="loading" circle>
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>
      
      <div class="price-info">
        <div class="current-price">
          <span class="label">当前价格：</span>
          <span class="value">${{ formatPrice(price) }}</span>
        </div>
        
        <div class="price-change">
          <span class="label">涨跌幅：</span>
          <span class="value" :class="priceChangeClass">
            {{ formatPriceChange(priceChange) }}
          </span>
        </div>
        
        <div class="volume">
          <span class="label">成交量：</span>
          <span class="value">{{ formatVolume(volume) }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import tigerApiService from '../services/tigerApi'

const props = defineProps({
  symbol: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:quote'])

const price = ref(0)
const priceChange = ref(0)
const volume = ref(0)
const loading = ref(false)
let priceUpdateTimer = null

// 刷新价格
const refreshPrice = async () => {
  if (!props.symbol) return
  
  loading.value = true
  try {
    const quote = await tigerApiService.getRealtimeQuote(props.symbol)
    
    price.value = quote.price
    priceChange.value = quote.changePercent
    volume.value = quote.volume
    
    emit('update:quote', {
      price: price.value,
      priceChange: priceChange.value,
      volume: volume.value,
      timestamp: quote.timestamp
    })
  } catch (error) {
    console.error('Failed to refresh price:', error)
    ElMessage.error('获取实时价格失败')
  } finally {
    loading.value = false
  }
}

// 计算价格变化的样式类
const priceChangeClass = computed(() => {
  if (priceChange.value > 0) return 'price-up'
  if (priceChange.value < 0) return 'price-down'
  return ''
})

// 格式化函数
const formatPrice = (value) => {
  return Number(value).toFixed(2)
}

const formatPriceChange = (value) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(2)}%`
}

const formatVolume = (value) => {
  return Number(value).toLocaleString()
}

// 自动刷新价格（每5秒）
const startAutoRefresh = () => {
  stopAutoRefresh()
  refreshPrice()
  priceUpdateTimer = setInterval(refreshPrice, 5000)
}

const stopAutoRefresh = () => {
  if (priceUpdateTimer) {
    clearInterval(priceUpdateTimer)
    priceUpdateTimer = null
  }
}

// 监听股票代码变化
watch(() => props.symbol, (newSymbol) => {
  if (newSymbol) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

// 组件挂载和卸载
onMounted(() => {
  if (props.symbol) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.stock-price {
  margin: 20px 0;
}

.price-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.current-price,
.price-change,
.volume {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #666;
  font-size: 14px;
}

.value {
  font-size: 16px;
  font-weight: bold;
}

.price-up {
  color: #67c23a;
}

.price-down {
  color: #f56c6c;
}
</style>
