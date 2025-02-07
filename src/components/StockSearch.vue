<template>
  <div class="stock-search">
    <el-input
      v-model="searchQuery"
      placeholder="输入股票代码或名称"
      class="search-input"
      @keyup.enter="handleSearch"
    >
      <template #append>
        <el-button @click="handleSearch">搜索</el-button>
      </template>
    </el-input>
    
    <div v-if="searchResults.length" class="search-results">
      <el-card v-for="stock in searchResults" 
               :key="stock.symbol" 
               class="stock-item"
               @click="selectStock(stock)">
        <div class="stock-info">
          <span class="symbol">{{ stock.symbol }}</span>
          <span class="name">{{ stock.name }}</span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import tigerApiService from '../services/tigerApi'

const searchQuery = ref('')
const searchResults = ref([])
const loading = ref(false)

const handleSearch = async () => {
  if (!searchQuery.value) {
    ElMessage.warning('请输入股票代码或名称')
    return
  }
  
  loading.value = true
  try {
    const commonStocks = {
      'TSLA': '特斯拉',
      'AAPL': '苹果公司',
      'GOOGL': '谷歌公司',
      'MSFT': '微软公司',
      'AMZN': '亚马逊',
      'META': 'Meta平台',
      'NFLX': '奈飞',
      'NVDA': '英伟达',
      'BABA': '阿里巴巴',
      'PDD': '拼多多',
      'BIDU': '百度'
    }
    
    const query = searchQuery.value.toUpperCase()
    console.log('Searching for:', query)
    
    // 直接匹配股票代码
    if (commonStocks[query]) {
      searchResults.value = [{
        symbol: query,
        name: commonStocks[query],
        exchange: 'NASDAQ'
      }]
    } else {
      // 模糊搜索
      const results = Object.entries(commonStocks)
        .filter(([symbol, name]) => {
          // 1. 股票代码包含查询字符串
          const symbolMatch = symbol.includes(query)
          
          // 2. 查询字符串包含在股票名称中
          const nameMatch = name.includes(searchQuery.value)
          
          // 3. 编辑距离检查（处理输入错误，如TLSA -> TSLA）
          const maxDistance = Math.floor(symbol.length / 2) // 允许的最大编辑距离
          const distance = levenshteinDistance(symbol, query)
          const fuzzyMatch = distance <= maxDistance
          
          return symbolMatch || nameMatch || fuzzyMatch
        })
        .map(([symbol, name]) => ({
          symbol,
          name,
          exchange: 'NASDAQ'
        }))
      
      // 按相似度排序
      results.sort((a, b) => {
        const distA = levenshteinDistance(a.symbol, query)
        const distB = levenshteinDistance(b.symbol, query)
        return distA - distB
      })
      
      searchResults.value = results
      console.log('Search results:', results)
    }

    if (searchResults.value.length === 0) {
      ElMessage.info('未找到匹配的股票')
    }
  } catch (error) {
    console.error('Search error:', error)
    ElMessage.error('搜索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 计算编辑距离（Levenshtein距离）
function levenshteinDistance(str1, str2) {
  const m = str1.length
  const n = str2.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,  // 替换
          dp[i - 1][j] + 1,      // 删除
          dp[i][j - 1] + 1       // 插入
        )
      }
    }
  }

  return dp[m][n]
}

const selectStock = (stock) => {
  emit('select', stock)
}

const emit = defineEmits(['select'])
</script>

<style scoped>
.stock-search {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  margin-bottom: 20px;
}

.search-results {
  margin-top: 10px;
}

.stock-item {
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.stock-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
}

.stock-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.symbol {
  font-weight: bold;
  font-size: 16px;
}

.name {
  color: #666;
}
</style>
