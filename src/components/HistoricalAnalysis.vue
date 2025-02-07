<template>
  <div class="historical-analysis">
    <el-card class="analysis-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>历史数据分析</span>
          <el-select v-model="selectedPeriod" size="small" @change="fetchData">
            <el-option label="最近30天" value="1d" />
            <el-option label="最近3个月" value="1w" />
            <el-option label="最近1年" value="1M" />
          </el-select>
        </div>
      </template>

      <div v-if="historicalData" class="analysis-content">
        <div class="technical-indicators">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="indicator-card">
                <h4>RSI</h4>
                <div class="value" :class="getRSIClass">
                  {{ rsiValue }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="indicator-card">
                <h4>MACD</h4>
                <div class="value" :class="getMACDClass">
                  {{ macdValue }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="indicator-card">
                <h4>布林带</h4>
                <div class="value">
                  {{ bollingerBandStatus }}
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="technical-summary">
          <h4>技术分析总结</h4>
          <ul>
            <li v-for="(point, index) in technicalSummary" 
                :key="index">
              {{ point }}
            </li>
          </ul>
        </div>

        <div class="price-stats">
          <h4>价格统计</h4>
          <el-row :gutter="20">
            <el-col :span="8" v-for="(stat, index) in priceStats" :key="index">
              <div class="stat-card">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-value">{{ stat.value }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      
      <div v-else-if="!loading" class="no-data">
        暂无历史数据
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import tigerApiService from '../services/tigerApi'

const props = defineProps({
  symbol: {
    type: String,
    required: true
  }
})

const loading = ref(false)
const historicalData = ref(null)
const selectedPeriod = ref('1d')

// 获取历史数据
const fetchData = async () => {
  if (!props.symbol) return
  
  loading.value = true
  try {
    const data = await tigerApiService.getHistoricalData(props.symbol, selectedPeriod.value)
    historicalData.value = data
  } catch (error) {
    console.error('Fetch historical data error:', error)
    ElMessage.error('获取历史数据失败')
  } finally {
    loading.value = false
  }
}

// 计算技术指标
const calculateIndicators = (data) => {
  if (!data || data.length < 14) return null

  // 计算RSI
  const rsi = calculateRSI(data.slice(-14))
  
  // 计算MACD
  const macd = calculateMACD(data)
  
  // 计算布林带
  const bb = calculateBollingerBands(data.slice(-20))
  
  return { rsi, macd, bb }
}

// 计算RSI
const calculateRSI = (data) => {
  let gains = 0
  let losses = 0
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i-1].close
    if (change >= 0) {
      gains += change
    } else {
      losses -= change
    }
  }
  
  const avgGain = gains / 14
  const avgLoss = losses / 14
  
  return 100 - (100 / (1 + avgGain / avgLoss))
}

// 计算MACD
const calculateMACD = (data) => {
  const closes = data.map(d => d.close)
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  const macdLine = ema12 - ema26
  const signalLine = calculateEMA([macdLine], 9)
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine
  }
}

// 计算EMA
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1)
  let ema = data[0]
  
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }
  
  return ema
}

// 计算布林带
const calculateBollingerBands = (data) => {
  const closes = data.map(d => d.close)
  const sma = closes.reduce((a, b) => a + b) / closes.length
  const stdDev = Math.sqrt(
    closes.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / closes.length
  )
  
  return {
    middle: sma,
    upper: sma + stdDev * 2,
    lower: sma - stdDev * 2
  }
}

// 计算技术分析总结
const technicalSummary = computed(() => {
  if (!historicalData.value) return []
  
  const indicators = calculateIndicators(historicalData.value)
  if (!indicators) return []
  
  const summary = []
  const lastPrice = historicalData.value[historicalData.value.length - 1].close
  
  // RSI分析
  if (indicators.rsi > 70) {
    summary.push('RSI显示超买状态，可能面临回调风险')
  } else if (indicators.rsi < 30) {
    summary.push('RSI显示超卖状态，可能出现反弹机会')
  }
  
  // MACD分析
  if (indicators.macd.histogram > 0) {
    summary.push('MACD显示上升趋势，建议持有或买入')
  } else {
    summary.push('MACD显示下降趋势，建议谨慎操作')
  }
  
  // 布林带分析
  if (lastPrice > indicators.bb.upper) {
    summary.push('价格突破布林带上轨，可能出现超买')
  } else if (lastPrice < indicators.bb.lower) {
    summary.push('价格突破布林带下轨，可能出现超卖')
  }
  
  return summary
})

// 计算价格统计
const priceStats = computed(() => {
  if (!historicalData.value) return []
  
  const prices = historicalData.value.map(d => d.close)
  const high = Math.max(...prices)
  const low = Math.min(...prices)
  const avg = prices.reduce((a, b) => a + b) / prices.length
  
  return [
    { label: '最高价', value: high.toFixed(2) },
    { label: '最低价', value: low.toFixed(2) },
    { label: '平均价', value: avg.toFixed(2) }
  ]
})

// RSI相关计算
const rsiValue = computed(() => {
  if (!historicalData.value) return '-'
  const indicators = calculateIndicators(historicalData.value)
  return indicators ? indicators.rsi.toFixed(2) : '-'
})

const getRSIClass = computed(() => {
  if (!historicalData.value) return ''
  const indicators = calculateIndicators(historicalData.value)
  if (!indicators) return ''
  
  if (indicators.rsi > 70) return 'overbought'
  if (indicators.rsi < 30) return 'oversold'
  return ''
})

// MACD相关计算
const macdValue = computed(() => {
  if (!historicalData.value) return '-'
  const indicators = calculateIndicators(historicalData.value)
  return indicators ? indicators.macd.macd.toFixed(2) : '-'
})

const getMACDClass = computed(() => {
  if (!historicalData.value) return ''
  const indicators = calculateIndicators(historicalData.value)
  if (!indicators) return ''
  
  return indicators.macd.histogram > 0 ? 'bullish' : 'bearish'
})

// 布林带状态
const bollingerBandStatus = computed(() => {
  if (!historicalData.value) return '-'
  const indicators = calculateIndicators(historicalData.value)
  if (!indicators) return '-'
  
  const lastPrice = historicalData.value[historicalData.value.length - 1].close
  if (lastPrice > indicators.bb.upper) return '超买区域'
  if (lastPrice < indicators.bb.lower) return '超卖区域'
  return '正常区间'
})

// 监听股票代码变化
watch(() => props.symbol, (newSymbol) => {
  if (newSymbol) {
    fetchData()
  }
})

// 监听周期变化
watch(selectedPeriod, () => {
  fetchData()
})

onMounted(() => {
  if (props.symbol) {
    fetchData()
  }
})
</script>

<style scoped>
.historical-analysis {
  margin: 20px 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.technical-indicators {
  margin-bottom: 30px;
}

.indicator-card {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  text-align: center;
}

.indicator-card h4 {
  margin: 0 0 10px 0;
  color: #606266;
}

.value {
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
}

.overbought {
  color: #F56C6C;
}

.oversold {
  color: #67C23A;
}

.bullish {
  color: #67C23A;
}

.bearish {
  color: #F56C6C;
}

.technical-summary {
  margin: 20px 0;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.technical-summary h4 {
  margin: 0 0 15px 0;
  color: #606266;
}

.technical-summary ul {
  margin: 0;
  padding-left: 20px;
}

.technical-summary li {
  margin: 8px 0;
  color: #606266;
}

.price-stats {
  margin-top: 30px;
}

.price-stats h4 {
  margin: 0 0 15px 0;
  color: #606266;
}

.stat-card {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
}

.stat-label {
  color: #909399;
  font-size: 0.9em;
  margin-bottom: 5px;
}

.stat-value {
  color: #303133;
  font-size: 1.1em;
  font-weight: bold;
}

.no-data {
  text-align: center;
  color: #909399;
  padding: 20px;
}
</style>
