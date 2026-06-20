const mockSalaryData = {
  '前端开发工程师': { low: 15, mid: 25, high: 45, factors: ['一线城市薪资普遍高于二三线城市20%-40%', '知名大厂薪资通常高于行业平均30%-50%', '热门技术栈（如AI、云原生）薪资溢价明显'] },
  'JavaScript开发': { low: 12, mid: 22, high: 40, factors: ['JavaScript需求量大，薪资水平稳定'] },
  'Vue开发工程师': { low: 15, mid: 28, high: 50, factors: ['Vue在国内市场需求高，薪资竞争力强'] }
}

export async function querySalary(req, res, next) {
  try {
    const { jobTitle, city, experience } = req.body

    const baseData = mockSalaryData[jobTitle] || { low: 12, mid: 20, high: 40, factors: ['薪资范围受多种因素影响'] }

    // 根据工作经验调整
    const expMultiplier = {
      '0-1': 0.7,
      '1-3': 1.0,
      '3-5': 1.3,
      '5-10': 1.6,
      '10+': 2.0
    }

    const multiplier = expMultiplier[experience] || 1.0

    res.json({
      low: Math.round(baseData.low * multiplier),
      mid: Math.round(baseData.mid * multiplier),
      high: Math.round(baseData.high * multiplier),
      factors: baseData.factors
    })
  } catch (err) {
    next(err)
  }
}
