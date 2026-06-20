import { chatCompletion, extractJson } from '../services/aiService.js'
import { saveHistory } from '../services/historyService.js'

export async function optimizeResume(req, res) {
  const { resumeText, jd } = req.body
  if (!resumeText) {
    return res.status(400).json({ message: '缺少简历文本' })
  }

  try {
    const prompt = `你是一名资深猎头和简历优化专家。

请对以下简历进行润色优化，提高ATS通过率。

要求：
1. 使用STAR法则优化工作经历
2. 量化成果和数据
3. 关键词优化
4. 专业表达
5. 突出核心竞争力

输出严格JSON格式：
{
  "optimizedText": "润色后的完整简历文本",
  "changes": ["主要改动点1", "主要改动点2"],
  "suggestions": ["优化建议1", "优化建议2"]
}

简历：
${resumeText}

${jd ? `目标岗位JD：\n${jd}` : ''}

禁止返回 markdown。`

    const aiResult = await chatCompletion(prompt)
    const result = extractJson(aiResult)

    if (req.userId) {
      await saveHistory(req.userId, 'optimize', '简历润色', { resumeText: resumeText.slice(0, 200), jd, result })
    }
    res.json(result)
  } catch (err) {
    console.error('Optimize error:', err)
    res.status(500).json({ message: err.message || '润色失败' })
  }
}
