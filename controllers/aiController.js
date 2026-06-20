import { chatCompletion } from '../services/aiService.js'
import { saveHistory } from '../services/historyService.js'

export async function analyze(req, res) {
  const { resumeId, jd } = req.body

  if (!resumeId || !jd) {
    return res.status(400).json({ message: '缺少简历ID或岗位JD' })
  }

  try {
    const { findResumeById } = await import('../services/resumeService.js')
    const record = await findResumeById(resumeId, req.userId)

    if (!record) {
      return res.status(404).json({ message: '简历不存在' })
    }

    const result = await callDeepSeek(record.resume_content, jd)
    await saveHistory(req.userId, 'analysis', '简历分析', { resumeId, jd, result })
    res.json(result)
  } catch (err) {
    console.error('Analysis error:', err)
    res.status(500).json({ message: err.message || 'AI分析失败，请稍后重试' })
  }
}

export async function analyzeText(req, res) {
  const { resumeText, jd } = req.body

  if (!resumeText || !jd) {
    return res.status(400).json({ message: '缺少简历文本或岗位JD' })
  }

  if (!resumeText || resumeText.trim().length < 50) {
    return res.status(400).json({ message: '简历文本内容过短，请确认已成功提取文字。扫描件PDF请手动粘贴简历内容。' })
  }

  try {
    const result = await callDeepSeek(resumeText, jd)
    if (req.userId) {
      await saveHistory(req.userId, 'analysis', '简历分析', { resumeText: resumeText.slice(0, 200), jd, result })
    }
    res.json(result)
  } catch (err) {
    console.error('Analysis error:', err)
    res.status(500).json({ message: err.message || 'AI分析失败，请稍后重试' })
  }
}

async function callDeepSeek(resumeContent, jd) {
  const prompt = `你是一名资深HR和职业顾问。

请根据候选人简历与岗位JD进行分析。

输出严格JSON格式：
{
  "score": 0-100,
  "skills": [],
  "advantages": [],
  "gaps": [],
  "suggestions": []
}

简历：
${resumeContent}

岗位JD：
${jd}

禁止返回 markdown。`

  const aiResult = await chatCompletion(prompt)
  let result

  try {
    result = JSON.parse(aiResult)
  } catch {
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('AI返回格式异常')
    }
  }
  return result
}
