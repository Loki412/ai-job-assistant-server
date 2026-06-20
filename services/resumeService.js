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
          content: `你是一名资深猎头。根据用户信息生成专业简历。
要求：
1. ATS友好
2. STAR法则
3. 专业表达
4. JSON格式

返回严格JSON：
{
  "summary": "个人总结",
  "education": [{"school":"学校","major":"专业","degree":"学历","period":"时间"}],
  "experience": [{"company":"公司","role":"职位","period":"时间","description":"工作描述（使用STAR法则）"}],
  "projects": [{"name":"项目名","role":"角色","description":"项目描述（使用STAR法则）","technologies":["技术栈"]}],
  "skills": ["技能1","技能2"]
}
禁止返回markdown。`
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
