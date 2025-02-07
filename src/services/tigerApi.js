import axios from 'axios'

class TigerApiService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: 'http://api.marketstack.com/v1',
      params: {
        access_key: 'c45d26bd5c5728d5850fcc435d5f62a7'  // 演示用 API key
      }
    })
    this.apiKey = 'demo'
  }

  // 搜索股票
  async searchStock(query) {
    try {
      const response = await this.apiClient.get('/tickers', {
        params: {
          search: query,
          limit: 10
        }
      })

      if (!response.data || !response.data.data) {
        return []
      }

      return response.data.data.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.stock_exchange.acronym
      }))
    } catch (error) {
      console.error('Search stock error:', error)
      throw error
    }
  }

  // 获取实时行情
  async getRealtimeQuote(symbol) {
    try {
      const response = await this.apiClient.get('/intraday/latest', {
        params: {
          symbols: symbol
        }
      })
      
      if (!response.data || !response.data.data || response.data.data.length === 0) {
        throw new Error('No quote data found')
      }
      
      const quote = response.data.data[0]
      return {
        symbol: quote.symbol,
        price: quote.close,
        change: quote.close - quote.open,
        changePercent: ((quote.close - quote.open) / quote.open * 100).toFixed(2),
        volume: quote.volume,
        timestamp: quote.date
      }
    } catch (error) {
      console.error('Get realtime quote error:', error)
      throw error
    }
  }

  // 获取K线数据
  async getKlineData(symbol, period = '1d', count = 100) {
    try {
      const response = await this.apiClient.get('/intraday', {
        params: {
          symbols: symbol,
          interval: this._convertPeriod(period),
          limit: count
        }
      })
      
      if (!response.data || !response.data.data) {
        throw new Error('No kline data found')
      }
      
      return response.data.data.map(item => ({
        time: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      })).reverse()
    } catch (error) {
      console.error('Get kline data error:', error)
      throw error
    }
  }

  // 获取历史数据
  async getHistoricalData(symbol, period = '1d', range = '1mo') {
    try {
      const response = await this.apiClient.get('/eod', {
        params: {
          symbols: symbol,
          limit: 30,
          sort: 'DESC'
        }
      })
      
      if (!response.data || !response.data.data) {
        throw new Error('No historical data found')
      }
      
      return response.data.data.map(item => ({
        timestamp: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      })).reverse()
    } catch (error) {
      console.error('Get historical data error:', error)
      throw error
    }
  }

  // 辅助函数：转换时间周期
  _convertPeriod(period) {
    const map = {
      '1d': '1h',
      '1w': '3h',
      '1M': '6h'
    }
    return map[period] || '1h'
  }

  // 辅助函数：获取时间范围
  _getRange(period, count) {
    if (period === '1d') return count + 'd'
    if (period === '1w') return Math.ceil(count * 7 / 5) + 'd'
    if (period === '1M') return Math.ceil(count * 30 / 21) + 'd'
    return '1y'
  }

  // 计算移动平均线
  calculateMA(data, period) {
    if (data.length < period) return null
    const sum = data.slice(-period).reduce((acc, curr) => acc + curr.close, 0)
    return sum / period
  }

  // 计算技术指标
  calculateTechnicalIndicators(data) {
    const lastPrice = data[data.length - 1].close
    const lastVolume = data[data.length - 1].volume
    
    // 计算RSI
    const rsi = this.calculateRSI(data)
    
    // 计算MACD
    const macd = this.calculateMACD(data)
    
    // 计算布林带
    const bollinger = this.calculateBollinger(data)
    
    return {
      rsi,
      macd,
      bollinger,
      summary: this.generateTechnicalSummary({
        rsi,
        macd,
        bollinger,
        lastPrice,
        lastVolume
      })
    }
  }

  // 计算RSI
  calculateRSI(data, period = 14) {
    if (data.length < period) return null

    let gains = 0
    let losses = 0

    for (let i = data.length - period; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close
      if (change >= 0) {
        gains += change
      } else {
        losses -= change
      }
    }

    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))

    return parseFloat(rsi.toFixed(2))
  }

  // 计算MACD
  calculateMACD(data) {
    const ema12 = this.calculateEMA(data, 12)
    const ema26 = this.calculateEMA(data, 26)
    const macd = ema12 - ema26
    const signal = this.calculateEMA(data.map(d => ({ close: macd })), 9)
    const histogram = macd - signal

    return {
      macd: parseFloat(macd.toFixed(2)),
      signal: parseFloat(signal.toFixed(2)),
      histogram: parseFloat(histogram.toFixed(2))
    }
  }

  // 计算EMA
  calculateEMA(data, period) {
    const k = 2 / (period + 1)
    let ema = data[0].close
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k)
    }
    
    return ema
  }

  // 计算布林带
  calculateBollinger(data, period = 20) {
    const ma = this.calculateMA(data, period)
    if (!ma) return null

    const squaredDiffs = data.slice(-period).map(d => Math.pow(d.close - ma, 2))
    const standardDeviation = Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / period)

    return {
      middle: parseFloat(ma.toFixed(2)),
      upper: parseFloat((ma + standardDeviation * 2).toFixed(2)),
      lower: parseFloat((ma - standardDeviation * 2).toFixed(2))
    }
  }

  // 生成技术分析总结
  generateTechnicalSummary({ rsi, macd, bollinger, lastPrice }) {
    let summary = []

    // RSI分析
    if (rsi > 70) {
      summary.push('RSI显示超买状态，可能存在回调风险')
    } else if (rsi < 30) {
      summary.push('RSI显示超卖状态，可能存在反弹机会')
    } else {
      summary.push('RSI处于中性区间')
    }

    // MACD分析
    if (macd.histogram > 0 && macd.histogram > macd.signal) {
      summary.push('MACD显示上升趋势，可能是买入信号')
    } else if (macd.histogram < 0 && macd.histogram < macd.signal) {
      summary.push('MACD显示下降趋势，可能是卖出信号')
    }

    // 布林带分析
    if (lastPrice > bollinger.upper) {
      summary.push('价格突破布林带上轨，注意回调风险')
    } else if (lastPrice < bollinger.lower) {
      summary.push('价格突破布林带下轨，可能存在超卖')
    } else {
      summary.push('价格在布林带中轨运行，趋势相对稳定')
    }

    return summary
  }

  // WebSocket连接（模拟）
  subscribeToRealtimeData(symbol, callback) {
    // 模拟WebSocket连接，每秒更新一次数据
    const interval = setInterval(() => {
      const data = {
        symbol,
        price: (Math.random() * 1000).toFixed(2),
        change: (Math.random() * 20 - 10).toFixed(2),
        changePercent: (Math.random() * 5 - 2.5).toFixed(2),
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString()
      }
      callback(data)
    }, 1000)

    // 返回取消订阅的函数
    return () => clearInterval(interval)
  }
}

// 创建单例实例
const tigerApiService = new TigerApiService()
export default tigerApiService
