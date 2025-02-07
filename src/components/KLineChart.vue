<template>
  <div class="kline-chart">
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>K线图</span>
          <div class="period-selector">
            <el-radio-group v-model="selectedPeriod" size="small" @change="handlePeriodChange">
              <el-radio-button :value="'1d'">日K</el-radio-button>
              <el-radio-button :value="'1w'">周K</el-radio-button>
              <el-radio-button :value="'1M'">月K</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>
      
      <v-chart class="chart" :option="chartOption" autoresize />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'

// 注册必须的组件
use([
  CanvasRenderer,
  CandlestickChart,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  LegendComponent
])

const props = defineProps({
  symbol: {
    type: String,
    required: true
  }
})

const selectedPeriod = ref('1d')
const klineData = ref([])
const loading = ref(false)

// 生成模拟数据
const generateMockData = (days) => {
  const data = []
  let basePrice = 180 // 基准价格
  let date = new Date()
  date.setDate(date.getDate() - days)

  for (let i = 0; i < days; i++) {
    const open = basePrice + (Math.random() - 0.5) * 5
    const close = open + (Math.random() - 0.5) * 4
    const low = Math.min(open, close) - Math.random() * 2
    const high = Math.max(open, close) + Math.random() * 2
    const volume = Math.floor(Math.random() * 1000000)

    data.push({
      date: new Date(date).toISOString().split('T')[0],
      open,
      close,
      low,
      high,
      volume
    })

    basePrice = close
    date.setDate(date.getDate() + 1)
  }

  return data
}

// 处理周期变化
const handlePeriodChange = async (period) => {
  await fetchKLineData()
}

// 获取K线数据
const fetchKLineData = async () => {
  loading.value = true
  try {
    // 根据不同周期生成不同天数的数据
    const days = selectedPeriod.value === '1d' ? 30 : 
                selectedPeriod.value === '1w' ? 90 : 180
    
    // 模拟数据
    const data = generateMockData(days)
    klineData.value = data
  } catch (error) {
    console.error('Failed to fetch k-line data:', error)
    ElMessage.error('获取K线数据失败')
  } finally {
    loading.value = false
  }
}

// 图表配置
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross'
    },
    formatter: (params) => {
      const data = params[0].data
      return `日期：${data[0]}<br/>
              开盘：${data[1].toFixed(2)}<br/>
              收盘：${data[2].toFixed(2)}<br/>
              最低：${data[3].toFixed(2)}<br/>
              最高：${data[4].toFixed(2)}<br/>
              成交量：${data[5].toLocaleString()}`
    }
  },
  grid: [
    {
      left: '10%',
      right: '8%',
      height: '60%'
    },
    {
      left: '10%',
      right: '8%',
      top: '75%',
      height: '15%'
    }
  ],
  xAxis: [
    {
      type: 'category',
      data: klineData.value.map(item => item.date),
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      splitNumber: 20
    },
    {
      type: 'category',
      gridIndex: 1,
      data: klineData.value.map(item => item.date),
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      splitNumber: 20
    }
  ],
  yAxis: [
    {
      scale: true,
      splitArea: {
        show: true
      }
    },
    {
      scale: true,
      gridIndex: 1,
      splitNumber: 2,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false }
    }
  ],
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: [0, 1],
      start: 50,
      end: 100
    },
    {
      show: true,
      xAxisIndex: [0, 1],
      type: 'slider',
      top: '85%',
      start: 50,
      end: 100
    }
  ],
  series: [
    {
      name: 'K线',
      type: 'candlestick',
      data: klineData.value.map(item => [
        item.date,
        item.open,
        item.close,
        item.low,
        item.high,
        item.volume
      ]),
      itemStyle: {
        color: '#ef232a',
        color0: '#14b143',
        borderColor: '#ef232a',
        borderColor0: '#14b143'
      }
    },
    {
      name: '成交量',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: klineData.value.map(item => item.volume),
      itemStyle: {
        color: function(params) {
          const item = klineData.value[params.dataIndex]
          return item.close > item.open ? '#ef232a' : '#14b143'
        }
      }
    }
  ]
}))

// 监听股票代码变化
watch(() => props.symbol, (newSymbol) => {
  if (newSymbol) {
    fetchKLineData()
  }
}, { immediate: true })

// 初始化
onMounted(() => {
  if (props.symbol) {
    fetchKLineData()
  }
})
</script>

<style scoped>
.kline-chart {
  margin: 20px 0;
}

.chart-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart {
  height: 600px;
}

.period-selector {
  display: flex;
  gap: 10px;
}
</style>
