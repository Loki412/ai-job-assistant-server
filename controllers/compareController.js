import { chatCompletion, extractJson } from '../services/aiService.js'

export async function compareResume(req, res, next) {
  try {
    const { resumeA, resumeB, jd } = req.body

    if (!resumeA || !resumeB || !jd) {
      return res.status(400).json({ message: '缺少必要参数' })
    }

    const prompt = `你是一个简历对比专家。请对比两份简历对同一岗位JD的匹配度。

岗位JD：
${jd}

简历A：
${resumeA}

简历B：
${resumeB}

请从以下维度进行对比分析：
1. 分别计算两份简历的匹配度分数（0-100）
2. 列出各自的匹配技能
3. 分析两份简历的差异和各自优势

请以JSON格式返回：
{
  "scoreA": 分数,
  "scoreB": 分数,
  "skillsA": ["技能1", "技能2"],
  "skillsB": ["技能1", "技能2"],
  "differences": [
    {"type": "advantage", "desc": "描述"}
  ]
}`

    const result = await chatCompletion(prompt)
    const data = extractJson(result)

    res.json(data)
  } catch (err) {
    next(err)
  }
}
