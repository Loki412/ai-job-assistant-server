import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * File-backed fallback store.
 *
 * Used when Supabase is not configured (or a Supabase call fails). The previous
 * implementation kept everything in module-level arrays, so every restart wiped
 * all users, resumes and history. This version persists to a JSON file.
 *
 * Caveats worth knowing:
 * - Writes are debounced (see PERSIST_DELAY_MS) so a burst of operations does
 *   not hit the disk once per call. `flush()` runs on shutdown to avoid loss.
 * - The data lives on the container filesystem. It survives process restarts,
 *   but NOT a fresh deploy that rebuilds the directory. For durable storage,
 *   configure Supabase (see .env.example).
 * - If the directory is not writable we log loudly and degrade to memory rather
 *   than crashing the whole service.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')
const DATA_FILE = path.join(DATA_DIR, 'persist.json')
const TMP_FILE = `${DATA_FILE}.tmp`

const PERSIST_DELAY_MS = 300

const emptyState = () => ({ users: [], resumes: [], histories: [] })

let state = emptyState()
let writeTimer = null
let writable = true

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    if (!raw.trim()) return
    const parsed = JSON.parse(raw)
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      resumes: Array.isArray(parsed.resumes) ? parsed.resumes : [],
      histories: Array.isArray(parsed.histories) ? parsed.histories : []
    }
    console.log(
      `[store] loaded ${state.users.length} users, ${state.resumes.length} resumes, ` +
      `${state.histories.length} history records from ${DATA_FILE}`
    )
  } catch (err) {
    // A corrupt file must not take the service down; keep the bad copy for triage.
    console.error(`[store] failed to read ${DATA_FILE}: ${err.message}`)
    try {
      if (fs.existsSync(DATA_FILE)) {
        fs.renameSync(DATA_FILE, `${DATA_FILE}.corrupt-${Date.now()}`)
        console.error('[store] moved the unreadable file aside, starting with empty data')
      }
    } catch { /* best effort */ }
  }
}

/**
 * Write the whole state atomically: serialise to a temp file, then rename.
 * rename() is atomic on the same filesystem, so a crash mid-write can never
 * leave a half-written persist.json behind.
 */
function writeNow() {
  if (!writable) return
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(TMP_FILE, JSON.stringify(state, null, 2), 'utf8')
    fs.renameSync(TMP_FILE, DATA_FILE)
  } catch (err) {
    writable = false
    console.error(`[store] cannot write ${DATA_FILE}: ${err.message}`)
    console.error('[store] DEGRADED TO MEMORY — data will be lost on restart. Configure Supabase for durable storage.')
  }
}

function schedulePersist() {
  if (!writable) return
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    writeNow()
  }, PERSIST_DELAY_MS)
}

/** Flush any pending write immediately — called on shutdown. */
export function flush() {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  writeNow()
}

load()

// Register once so an abrupt exit still flushes pending changes.
process.once('exit', flush)

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

/** Newest first, without mutating the stored array. */
function byCreatedAtDesc(a, b) {
  return new Date(b.created_at) - new Date(a.created_at)
}

export const userService = {
  async findByOpenid(openid) {
    return state.users.find(u => u.openid === openid) || null
  },
  async createUser(openid, nickname) {
    const user = {
      id: uuid(),
      openid,
      nickname: nickname || `用户${openid.slice(-6)}`,
      avatar: '',
      created_at: new Date().toISOString()
    }
    state.users.push(user)
    schedulePersist()
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
    state.resumes.push(record)
    schedulePersist()
    return record
  },
  async listResumes(userId) {
    return state.resumes
      .filter(r => r.user_id === userId)
      .map(({ id, resume_name, created_at }) => ({ id, resume_name, created_at }))
      .sort(byCreatedAtDesc)
  },
  async findResumeById(id, userId) {
    return state.resumes.find(r => r.id === id && r.user_id === userId) || null
  },
  async deleteResume(id, userId) {
    const idx = state.resumes.findIndex(r => r.id === id && r.user_id === userId)
    if (idx === -1) return
    state.resumes.splice(idx, 1)
    schedulePersist()
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
    state.histories.push(record)
    schedulePersist()
    return record
  },
  async listHistory(userId, type, project) {
    let list = state.histories.filter(h => h.user_id === userId)
    if (type && type !== 'all') {
      list = list.filter(h => h.type === type)
    }
    if (project) {
      list = list.filter(h => h.project === project)
    }
    return list
      .map(({ id, type, title, project, created_at }) => ({ id, type, title, project, created_at }))
      .sort(byCreatedAtDesc)
  },
  async listProjects(userId) {
    const map = {}
    state.histories.filter(h => h.user_id === userId).forEach(h => {
      const name = h.project || '未分组'
      if (!map[name]) map[name] = { project: name, count: 0, lastTime: h.created_at }
      map[name].count++
      if (h.created_at > map[name].lastTime) map[name].lastTime = h.created_at
    })
    return Object.values(map).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
  },
  async findHistoryById(id, userId) {
    return state.histories.find(h => h.id === id && h.user_id === userId) || null
  },
  async deleteHistory(id, userId) {
    const idx = state.histories.findIndex(h => h.id === id && h.user_id === userId)
    if (idx === -1) return
    state.histories.splice(idx, 1)
    schedulePersist()
  }
}
