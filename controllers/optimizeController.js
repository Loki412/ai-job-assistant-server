import { chatCompletion, extractJson } from '../services/aiService.js'
import { saveHistory } from '../services/historyService.js'

export async function optimizeResume(req, res) {
  const { resumeText, jd } = req.body
  if (!resumeText) {
    return res.status(400).json({ message: '缺少简历文本' })
  }

  try {
    const prompt = `你是一名资深猎头和简历优化专家。请对以下简历进行深度润色优化。

${jd ? `目标岗位JD：\n${jd}\n\n` : ''}原始简历：\n${resumeText}

要求：
1. 使用STAR法则重写工作经历和项目经历，突出量化成果
2. 根据目标岗位JD优化关键词，提高ATS通过率
3. 将简历解析为结构化JSON格式
4. 对比优化前后的匹配度变化
5. 给出具体的优化理由和后续建议

输出严格JSON格式（禁止markdown）：
{
  "name": "姓名",
  "contact": {
    "phone": "电话",
    "email": "邮箱",
    "location": "所在地",
    "onboard": "到岗时间"
  },
  "summary": "优化后的个人总结（3-5句话，突出核心竞争力）",
  "education": [
    {"school": "学校名", "major": "专业", "degree": "学历", "period": "2019.09 - 2023.06", "gpa": "GPA（如有）", "honors": ["荣誉1", "荣誉2"]}
  ],
  "experience": [
    {
      "company": "公司名",
      "role": "职位",
      "period": "2023.07 - 至今",
      "items": [
        "【行动】使用STAR法则描述的具体工作内容，包含量化数据和成果",
        "【成果】第二条工作成果，突出个人贡献和业务影响"
      ]
    }
  ],
  "projects": [
    {
      "name": "项目名",
      "role": "角色",
      "period": "时间",
      "desc": "项目描述（使用STAR法则）",
      "technologies": ["技术栈1", "技术栈2"]
    }
  ],
  "skills": {
    "前端": ["技能1", "技能2"],
    "后端": ["技能3"],
    "工具": ["技能4"]
  },
  "scoreBefore": 优化前匹配度评分（0-100）,
  "scoreAfter": 优化后匹配度评分（0-100）,
  "changes": [
    {"section": "修改模块", "before": "修改前内容摘要", "after": "修改后内容摘要", "reason": "修改原因"}
  ],
  "suggestions": ["后续优化建议1", "后续优化建议2"]
}`

    const aiResult = await chatCompletion(prompt)
    const result = extractJson(aiResult)

    if (req.userId) {
      await saveHistory(req.userId, 'optimize', '简历润色', {
        resumeText: resumeText.slice(0, 200),
        jd,
        result
      })
    }
    res.json(result)
  } catch (err) {
    console.error('Optimize error:', err)
    res.status(500).json({ message: err.message || '润色失败' })
  }
}
