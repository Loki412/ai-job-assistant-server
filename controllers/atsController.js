import { chatCompletion, extractJson } from '../services/aiService.js'

export async function scoreATS(req, res, next) {
  try {
    const { resumeText, targetJob } = req.body

    if (!resumeText) {
      return res.status(400).json({ message: '缺少简历内容' })
    }

    const prompt = `你是一个ATS（简历追踪系统）分析专家。请分析以下简历并给出评分和建议。

${targetJob ? `目标岗位：${targetJob}\n\n` : ''}简历内容：
${resumeText}

请从以下维度进行ATS评分（总分100分）：
1. 关键词匹配（35分）- 检测简历中与目标岗位相关的关键词
2. 格式规范（25分）- 检查简历格式是否符合ATS友好标准
3. 内容完整度（20分）- 评估基本信息、教育背景、工作经验等完整性
4. 可读性（20分）- 检查段落长度、分点描述等

请返回JSON格式：
{
  "totalScore": 72,
  "breakdown": [
    {"name": "关键词匹配", "score": 28, "max": 35, "tip": "建议"},
    {"name": "格式规范", "score": 18, "max": 25, "tip": "建议"},
    {"name": "内容完整度", "score": 16, "max": 20, "tip": "建议"},
    {"name": "可读性", "score": 10, "max": 20, "tip": "建议"}
  ],
  "foundKeywords": ["找到的关键词"],
  "missingKeywords": ["缺失的重要关键词"],
  "suggestions": ["优化建议1", "优化建议2"]
}`

    const result = await chatCompletion(prompt)
    const data = extractJson(result)
    res.json(data)
  } catch (err) {
    next(err)
  }
}
