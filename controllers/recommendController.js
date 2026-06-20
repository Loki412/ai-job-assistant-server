import { chatCompletion, extractJson } from '../services/aiService.js'

const mockJobs = [
  { title: '前端开发工程师', company: '字节跳动', matchScore: 92, tags: ['Vue', 'React', 'TypeScript'], salaryRange: '25K-45K · 16薪', reason: '您的Vue和前端经验与该岗位高度匹配' },
  { title: 'React开发工程师', company: '腾讯', matchScore: 85, tags: ['React', 'JavaScript'], salaryRange: '22K-40K · 14薪', reason: '具备React开发经验，技术栈匹配度高' },
  { title: '全栈工程师', company: '阿里巴巴', matchScore: 78, tags: ['Node.js', '前端', '后端'], salaryRange: '30K-50K · 15薪', reason: '全栈能力符合岗位要求' },
  { title: 'Vue开发工程师', company: '美团', matchScore: 88, tags: ['Vue', '前端工程化'], salaryRange: '20K-35K · 13薪', reason: 'Vue技术栈完全匹配' },
  { title: '前端架构师', company: '京东', matchScore: 75, tags: ['架构', '前端', '团队管理'], salaryRange: '35K-60K · 16薪', reason: '有晋升到架构师的发展潜力' }
]

export async function recommendJobs(req, res, next) {
  try {
    const { resumeText } = req.body

    if (!resumeText) {
      return res.status(400).json({ message: '缺少简历内容' })
    }

    const prompt = `你是一个职位推荐专家。根据以下简历内容，推荐5个最匹配的工作岗位。

简历内容：
${resumeText}

请分析简历中的技能和经验，返回最匹配的5个职位推荐。每个推荐应包括：
- 职位名称
- 推荐公司（知名互联网公司）
- 匹配度评分（0-100）
- 职位标签
- 薪资范围（根据市场行情合理估算）
- 推荐理由

请以JSON数组格式返回：
[
  {
    "title": "职位名称",
    "company": "公司名称",
    "matchScore": 85,
    "tags": ["技能1", "技能2"],
    "salaryRange": "20K-35K",
    "reason": "推荐理由"
  }
]`

    try {
      const result = await chatCompletion(prompt)
      const jobs = extractJson(result)
      res.json(Array.isArray(jobs) ? jobs : mockJobs)
    } catch {
      res.json(mockJobs)
    }
  } catch (err) {
    next(err)
  }
}
