import { chatCompletion, extractJson } from '../services/aiService.js'
import { saveHistory } from '../services/historyService.js'

export async function generateRoadmap(req, res) {
  const { resumeId, jd } = req.body
  if (!resumeId || !jd) {
    return res.status(400).json({ message: '缺少简历ID或岗位JD' })
  }

  try {
    const { findResumeById } = await import('../services/resumeService.js')
    const record = await findResumeById(resumeId, req.userId)
    if (!record) return res.status(400).json({ message: '简历不存在' })

    const result = await callDeepSeek(record.resume_content, jd)
    await saveHistory(req.userId, 'roadmap', '学习路线', { resumeId, jd, result })
    res.json(result)
  } catch (err) {
    console.error('Roadmap generation error:', err)
    res.status(500).json({ message: err.message || '路线图生成失败' })
  }
}

export async function generateRoadmapText(req, res) {
  const { resumeText, jd } = req.body
  if (!resumeText || !jd) {
    return res.status(400).json({ message: '缺少简历文本或岗位JD' })
  }

  try {
    const result = await callDeepSeek(resumeText, jd)
    if (req.userId) {
      await saveHistory(req.userId, 'roadmap', '学习路线', { resumeText: resumeText.slice(0, 200), jd, result })
    }
    res.json(result)
  } catch (err) {
    console.error('Roadmap generation error:', err)
    res.status(500).json({ message: err.message || '路线图生成失败' })
  }
}

async function callDeepSeek(resumeText, jd) {
  const prompt = `你是一名资深职业规划导师。

请根据候选人当前能力和目标岗位要求，生成个性化能力提升路线图。

分析要求：
1. 技能差距分析 - 对比现有技能与目标岗位要求的差距
2. 学习优先级排序 - 按重要性排列
3. 详细学习路线图 - 分阶段
4. 每阶段建议学习时间

请严格按照以下JSON格式输出，不要添加任何额外文字：
{"targetRole":"目标岗位名称","roadmap":[{"stage":"第一阶段：基础巩固","skills":["技能1","技能2"],"timeEstimate":"2周","focus":"阶段重点描述"}]}

简历：
${resumeText}

岗位JD：
${jd}`

  const aiResult = await chatCompletion(prompt)
  return extractJson(aiResult)
}
