function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const users = []
const resumes = []
const histories = []

export const userService = {
  async findByOpenid(openid) {
    return users.find(u => u.openid === openid) || null
  },
  async createUser(openid, nickname) {
    const user = {
      id: uuid(),
      openid,
      nickname: nickname || `用户${openid.slice(-6)}`,
      avatar: '',
      created_at: new Date().toISOString()
    }
    users.push(user)
    return user
  }
}

export const resumeService = {
  async saveResume(userId, resumeName, resumeContent) {
    const record = {
      id: uuid(),
      user_id: userId,
      resume_name: resumeName,
      resume_content: resumeContent,
      created_at: new Date().toISOString()
    }
    resumes.push(record)
    return record
  },
  async listResumes(userId) {
    return resumes
      .filter(r => r.user_id === userId)
      .map(({ id, resume_name, created_at }) => ({ id, resume_name, created_at }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },
  async findResumeById(id, userId) {
    return resumes.find(r => r.id === id && r.user_id === userId) || null
  },
  async deleteResume(id, userId) {
    const idx = resumes.findIndex(r => r.id === id && r.user_id === userId)
    if (idx !== -1) resumes.splice(idx, 1)
  }
}

export const historyService = {
  async saveHistory(userId, type, title, content, project) {
    const record = {
      id: uuid(),
      user_id: userId,
      type,
      title,
      project: project || '',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      created_at: new Date().toISOString()
    }
    histories.push(record)
    return record
  },
  async listHistory(userId, type, project) {
    let list = histories.filter(h => h.user_id === userId)
    if (type && type !== 'all') {
      list = list.filter(h => h.type === type)
    }
    if (project) {
      list = list.filter(h => h.project === project)
    }
    return list
      .map(({ id, type, title, project, created_at }) => ({ id, type, title, project, created_at }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },
  async listProjects(userId) {
    const map = {}
    histories.filter(h => h.user_id === userId).forEach(h => {
      const name = h.project || '未分组'
      if (!map[name]) map[name] = { project: name, count: 0, lastTime: h.created_at }
      map[name].count++
      if (h.created_at > map[name].lastTime) map[name].lastTime = h.created_at
    })
    return Object.values(map).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
  },
  async findHistoryById(id, userId) {
    return histories.find(h => h.id === id && h.user_id === userId) || null
  },
  async deleteHistory(id, userId) {
    const idx = histories.findIndex(h => h.id === id && h.user_id === userId)
    if (idx !== -1) histories.splice(idx, 1)
  }
}
