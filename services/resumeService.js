import { supabaseClient } from '../config/supabase.js'
import { resumeService as local } from './localStore.js'

export async function saveResume(userId, resumeName, resumeContent) {
  try {
    const { data, error } = await supabaseClient
      .from('resumes')
      .insert({ user_id: userId, resume_name: resumeName, resume_content: resumeContent })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return local.saveResume(userId, resumeName, resumeContent)
  }
}

export async function listResumes(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('resumes')
      .select('id, resume_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch {
    return local.listResumes(userId)
  }
}

export async function findResumeById(id, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return data
  } catch {
    return local.findResumeById(id, userId)
  }
}

export async function deleteResume(id, userId) {
  try {
    const { error } = await supabaseClient
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  } catch {
    return local.deleteResume(id, userId)
  }
}

export async function generateResume(userInfo) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一名资深猎头和简历撰写专家。根据用户提供的信息，生成一份专业、ATS友好的简历。

要求：
1. 使用STAR法则描述工作经历和项目经历
2. 量化成果和数据，突出个人贡献
3. 关键词优化，匹配目标岗位
4. 专业表达，避免口语化
5. 结构清晰，层次分明

输出严格JSON格式（禁止markdown）：
{
  "name": "姓名",
  "contact": {
    "phone": "电话",
    "email": "邮箱",
    "location": "所在地",
    "onboard": "到岗时间"
  },
  "summary": "个人总结（3-5句话，突出核心竞争力和职业目标）",
  "education": [
    {
      "school": "学校名",
      "major": "专业",
      "degree": "学历",
      "period": "2019.09 - 2023.06",
      "gpa": "GPA（如有，格式如 3.6/4.0）",
      "honors": ["荣誉奖项1", "荣誉奖项2"]
    }
  ],
  "experience": [
    {
      "company": "公司名",
      "role": "职位",
      "period": "2023.07 - 至今",
      "items": [
        "【行动】使用STAR法则描述的具体工作内容，包含量化数据",
        "【成果】突出个人贡献和业务影响的工作成果"
      ]
    }
  ],
  "projects": [
    {
      "name": "项目名",
      "role": "角色",
      "period": "时间",
      "desc": "项目描述（使用STAR法则，突出技术难点和解决方案）",
      "technologies": ["技术栈1", "技术栈2"]
    }
  ],
  "skills": {
    "专业技能": ["技能1", "技能2"],
    "开发工具": ["工具1", "工具2"],
    "其他能力": ["能力1"]
  }
}`
        },
        { role: 'user', content: JSON.stringify(userInfo) }
      ]
    })
  })

  const json = await response.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('AI返回异常')

  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('AI返回格式异常')
  }
}
