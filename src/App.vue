<script setup>
import { ref, computed } from 'vue'
import StockSearch from './components/StockSearch.vue'
import StockPrice from './components/StockPrice.vue'
import AIAnalysis from './components/AIAnalysis.vue'
import HistoricalAnalysis from './components/HistoricalAnalysis.vue'
import KLineChart from './components/KLineChart.vue'
import NewsSection from './components/NewsSection.vue'

const selectedStock = ref(null)
const stockData = ref(null)

const handleStockSelect = (stock) => {
  console.log('Selected stock:', stock)
  selectedStock.value = stock
}

// 更新股票数据
const updateStockData = (data) => {
  console.log('Updating stock data:', data)
  stockData.value = {
    ...data,
    symbol: selectedStock.value?.symbol,
    name: selectedStock.value?.name
  }
}
</script>

<template>
  <div class="container">
    <h1>股票监控与AI分析</h1>
    <StockSearch @select="handleStockSelect" />
    
    <div v-if="selectedStock" class="selected-stock">
      <h2>{{ selectedStock.name }} ({{ selectedStock.symbol }})</h2>
      
      <div class="content-grid">
        <div class="left-column">
          <StockPrice 
            :symbol="selectedStock.symbol" 
            @update:quote="updateStockData"
          />
          <NewsSection :symbol="selectedStock.symbol" />
          <KLineChart 
            :symbol="selectedStock.symbol"
          />
          <HistoricalAnalysis 
            :symbol="selectedStock.symbol"
          />
        </div>
        
        <div class="right-column">
          <AIAnalysis 
            v-if="stockData"
            :stock-data="stockData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}

.selected-stock {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

h2 {
  color: #2c3e50;
  font-size: 1.5em;
  margin-bottom: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
