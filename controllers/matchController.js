import { chatCompletion, extractJson } from '../services/aiService.js'
import { saveHistory } from '../services/historyService.js'

export async function analyzeMatch(req, res) {
  const { resumeId, jd } = req.body
  if (!resumeId || !jd) {
    return res.status(400).json({ message: '缺少简历ID或岗位JD' })
  }

  try {
    const { findResumeById } = await import('../services/resumeService.js')
    const record = await findResumeById(resumeId, req.userId)
    if (!record) return res.status(400).json({ message: '简历不存在' })

    const result = await callDeepSeek(record.resume_content, jd)
    await saveHistory(req.userId, 'match', '匹配分析', { resumeId, jd, result })
    res.json(result)
  } catch (err) {
    console.error('Match analysis error:', err)
    res.status(500).json({ message: err.message || '匹配分析失败' })
  }
}

export async function analyzeMatchText(req, res) {
  const { resumeText, jd } = req.body
  if (!resumeText || !jd) {
    return res.status(400).json({ message: '缺少简历文本或岗位JD' })
  }

  try {
    const result = await callDeepSeek(resumeText, jd)
    if (req.userId) {
      await saveHistory(req.userId, 'match', '匹配分析', { resumeText: resumeText.slice(0, 200), jd, result })
    }
    res.json(result)
  } catch (err) {
    console.error('Match analysis error:', err)
    res.status(500).json({ message: err.message || '匹配分析失败' })
  }
}

async function callDeepSeek(resumeText, jd) {
  const prompt = `你是一名资深HR和技术面试官。

请对候选人简历与岗位JD进行深度匹配分析，重点关注：
1. 简历中隐含的潜在技能和能力（不要只看关键词，要从项目描述中推断）
2. 可迁移技能（如沟通能力、项目管理能力等）
3. 文化适配度

输出严格JSON格式：
{
  "score": 0-100,
  "matchedSkills": ["已匹配的技能"],
  "missingSkills": ["缺失的关键技能"],
  "advantages": ["核心优势，包括潜在能力"],
  "risks": ["潜在风险提示"]
}

简历：
${resumeText}

岗位JD：
${jd}

禁止返回 markdown。`

  const aiResult = await chatCompletion(prompt)
  return extractJson(aiResult)
}
