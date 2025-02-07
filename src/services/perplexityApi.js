import axios from 'axios'
import { PERPLEXITY_API_KEY } from '../config'

class PerplexityApiService {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.perplexity.ai',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
  }

  async analyzeStockCorrelation(symbol, stockData, priceChange) {
    try {
      const prompt = this.generateAnalysisPrompt(symbol, stockData, priceChange)
      
      const response = await this.api.post('/chat/completions', {
        model: 'sonar',
        messages: [{
          role: 'system',
          content: '你是一个专业的股票分析师，专注于分析股票价格变动与新闻事件的相关性。请保持分析的精确性和简洁性。'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0
      })

      return {
        analysis: response.data.choices[0].message.content,
        correlationScore: this.calculateCorrelationScore(response.data.choices[0].message.content, priceChange),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Perplexity API error:', error)
      throw new Error('无法获取AI分析结果')
    }
  }

  async getCompanyNews(symbol) {
    try {
      const response = await this.api.post('/chat/completions', {
        model: 'sonar',
        messages: [{
          role: 'system',
          content: '你是一个专业的股票分析师，负责生成股票相关的新闻和分析报告。请保持内容的精确性和简洁性。'
        }, {
          role: 'user',
          content: `请生成5条关于 ${symbol} 股票的最新资讯，包括以下信息：
            1. 公司重要事件
            2. 市场分析
            3. 行业动态
            4. 竞争对手信息
            5. 未来展望
            
            请按照以下格式输出每条新闻：
            1. [标题]
            [详细内容]
            
            2. [标题]
            [详细内容]
            
            以此类推...`
        }],
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0
      })

      return {
        news: response.data.choices[0].message.content,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Get company news error:', error)
      throw new Error('无法获取公司资讯')
    }
  }

  generateAnalysisPrompt(symbol, stockData, priceChange) {
    const direction = priceChange > 0 ? '上涨' : '下跌'
    const changePercent = Math.abs(priceChange).toFixed(2)
    
    return `分析 ${symbol} 股票：
    1. 当前股价${direction}了 ${changePercent}%
    2. 最新价格：$${stockData.price.toFixed(2)}
    3. 成交量：${stockData.volume.toLocaleString()}

    请分析：
    1. 这个价格变动可能与哪些最新新闻或市场事件相关？
    2. 这个变动是否符合市场预期？
    3. 从技术面和基本面分析，这个变动是否合理？
    4. 对未来短期走势有什么建议？

    请用中文回答，并保持专业、简洁。`
  }

  calculateCorrelationScore(analysis, priceChange) {
    const positiveKeywords = ['利好', '上涨', '看好', '突破', '增长', '利润', '创新']
    const negativeKeywords = ['利空', '下跌', '担忧', '风险', '下跌', '亏损', '问题']
    
    let sentimentScore = 0
    
    positiveKeywords.forEach(keyword => {
      if (analysis.includes(keyword)) sentimentScore += 1
    })
    
    negativeKeywords.forEach(keyword => {
      if (analysis.includes(keyword)) sentimentScore -= 1
    })
    
    sentimentScore = sentimentScore / Math.max(positiveKeywords.length, negativeKeywords.length)
    const priceChangeScore = Math.max(Math.min(priceChange / 5, 1), -1)
    const correlation = 1 - Math.abs(sentimentScore - priceChangeScore) / 2
    
    return correlation
  }

  async analyzeStockData(stockData) {
    try {
      const prompt = this.constructPrompt(stockData)
      const response = await this.api.post('/chat/completions', {
        model: 'mixtral-8x7b-instruct',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的股票分析师，请基于提供的数据进行分析并给出专业的见解。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000
      })

      return this.parseResponse(response.data)
    } catch (error) {
      console.error('Analyze stock data error:', error)
      throw error
    }
  }

  constructPrompt(stockData) {
    const {
      symbol,
      price,
      change,
      changePercent,
      volume,
      timestamp,
      historicalData
    } = stockData

    return `
请分析以下股票数据并提供专业见解：

股票代码：${symbol}
当前价格：${price}
价格变动：${change} (${changePercent}%)
成交量：${volume}
时间：${timestamp}

${historicalData ? `历史数据趋势：
${JSON.stringify(historicalData, null, 2)}` : ''}

请提供以下方面的分析：
1. 价格走势分析
2. 成交量分析
3. 技术指标分析
4. 投资建议
5. 风险提示
`
  }

  parseResponse(response) {
    try {
      const analysis = response.choices[0].message.content
      
      // 如果需要，这里可以添加更多的解析逻辑
      return {
        timestamp: new Date().toISOString(),
        content: analysis,
        // 可以添加情感分析等其他维度
        sentiment: this.analyzeSentiment(analysis)
      }
    } catch (error) {
      console.error('Parse response error:', error)
      throw error
    }
  }

  analyzeSentiment(content) {
    // 简单的情感分析逻辑
    const positiveWords = ['上涨', '增长', '看好', '机会', '突破', '强劲', '利好']
    const negativeWords = ['下跌', '下滑', '风险', '警惕', '回调', '疲软', '利空']
    
    let score = 0
    positiveWords.forEach(word => {
      const count = (content.match(new RegExp(word, 'g')) || []).length
      score += count
    })
    
    negativeWords.forEach(word => {
      const count = (content.match(new RegExp(word, 'g')) || []).length
      score -= count
    })
    
    if (score > 2) return 'positive'
    if (score < -2) return 'negative'
    return 'neutral'
  }

  async mockAnalysis(stockData) {
    const { symbol, price, change, changePercent } = stockData
    
    return {
      timestamp: new Date().toISOString(),
      content: `
分析报告：${symbol}

1. 价格走势分析
当前价格 ${price}，相比前一交易日${change > 0 ? '上涨' : '下跌'}${Math.abs(change)}元（${changePercent}%）。
从技术面来看，价格走势显示出${Math.random() > 0.5 ? '上升' : '下降'}趋势。

2. 成交量分析
今日成交量处于${Math.random() > 0.5 ? '活跃' : '平稳'}水平，表明市场对该股票的交易意愿${Math.random() > 0.5 ? '强烈' : '一般'}。

3. 技术指标分析
MACD指标显示${Math.random() > 0.5 ? '金叉形态' : '死叉形态'}，
RSI指标处于${Math.random() > 0.5 ? '超买' : '超卖'}区域。

4. 投资建议
基于当前市场状况，建议投资者${Math.random() > 0.5 ? '可以考虑逢低买入' : '保持观望态度'}。

5. 风险提示
请注意市场波动风险，建议设置止损位置，控制仓位。
      `,
      sentiment: Math.random() > 0.5 ? 'positive' : 'negative'
    }
  }
}

export default new PerplexityApiService()
