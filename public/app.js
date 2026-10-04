/* ============================================================
   AI 求职助手 — 前端应用
   后端：ai-job-assistant-server（Express）
   鉴权：x-auth-token（该域名前置网关会覆盖 Authorization）
   ============================================================ */

// 默认同源：前端由后端自身托管时直接走相对路径，无需 CORS；
// 若前端单独部署，可在设置里填后端完整地址。
const DEFAULT_API = ''
const LS = {
  api: 'ajs.api',
  device: 'ajs.device',
  data: 'ajs.data',
  view: 'ajs.view'
}

/* ---------------- 小工具 ---------------- */

const $ = (sel, root = document) => root.querySelector(sel)

function esc(v) {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** 把任意形态（数组 / 对象 / 字符串）归一化成字符串数组 */
function asList(v) {
  if (v === null || v === undefined) return []
  if (Array.isArray(v)) return v.flatMap(asList).filter(Boolean)
  if (typeof v === 'object') {
    return Object.entries(v).flatMap(([k, val]) => {
      const items = asList(val)
      return items.length ? [`${k}：${items.join('、')}`] : []
    })
  }
  const s = String(v).trim()
  return s ? [s] : []
}

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)) }

function tone(score) {
  if (!Number.isFinite(score)) return ''
  if (score >= 80) return 'good'
  if (score >= 60) return 'warn'
  return 'bad'
}

function toneText(score) {
  const t = tone(score)
  return t === 'good' ? '匹配良好' : t === 'warn' ? '基本符合' : '仍有差距'
}

function bytes(n) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1048576).toFixed(1) + ' MB'
}

function timeAgo(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const d = Date.now() - t
  if (d < 60000) return '刚刚'
  if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前'
  if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前'
  if (d < 604800000) return Math.floor(d / 86400000) + ' 天前'
  const dt = new Date(t)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/* ---------------- 图标 ---------------- */

const ICONS = {
  sparkles: '<path d="M12 3.4l1.9 4.7 4.7 1.9-4.7 1.9L12 16.6l-1.9-4.7L5.4 10l4.7-1.9L12 3.4z"/><path d="M18.6 15.4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
  gauge: '<path d="M4.5 18.5a8.5 8.5 0 1 1 15 0"/><path d="M12 14.6l3.2-3.2"/><circle cx="12" cy="15.4" r="1.4"/>',
  wand: '<path d="M5 19l1.2-4 8.6-8.6a2.1 2.1 0 0 1 3 3L9.2 18 5 19z"/><path d="M14.4 6.8l2.8 2.8"/>',
  route: '<circle cx="6" cy="6.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="M8.4 6.5h4.4a3.2 3.2 0 0 1 0 6.4h-1.6a3.2 3.2 0 0 0 0 6.4h4.4"/>',
  briefcase: '<rect x="3.2" y="7.4" width="17.6" height="12.4" rx="2.4"/><path d="M8.6 7.4V6a2 2 0 0 1 2-2h2.8a2 2 0 0 1 2 2v1.4"/><path d="M3.2 12.6h17.6"/>',
  coins: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.4v9.2M14.6 9.8c0-1.2-1.1-2-2.6-2s-2.6.8-2.6 2c0 2.6 5.4 1.4 5.4 4 0 1.2-1.2 2-2.8 2s-2.8-.8-2.8-2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6V12l3.2 2"/>',
  check: '<path d="M4.5 12.5l4.7 4.7L19.5 6.9"/>',
  warn: '<path d="M12 4.2l8.6 15H3.4l8.6-15z"/><path d="M12 9.6v4.2"/><circle cx="12" cy="16.6" r=".9"/>',
  alert: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.8v4.6"/><circle cx="12" cy="15.8" r=".95"/>',
  shield: '<path d="M12 3.2l7.4 2.6v5.4c0 4.3-3 7.6-7.4 9.6-4.4-2-7.4-5.3-7.4-9.6V5.8z"/><path d="M9.2 12.2l2 2 3.6-3.8"/>',
  key: '<circle cx="8.4" cy="12" r="3.6"/><path d="M12 12h8.4"/><path d="M17.4 12v3"/><path d="M20.4 12v2.2"/>',
  bulb: '<path d="M9.4 17.4h5.2"/><path d="M10.2 20.4h3.6"/><path d="M12 3.6a5.6 5.6 0 0 1 3.2 10.2c-.6.5-1 1.3-1 2.1h-4.4c0-.8-.4-1.6-1-2.1A5.6 5.6 0 0 1 12 3.6z"/>',
  rise: '<path d="M4.6 16.4l5-5 3.4 3.4 6.4-6.4"/><path d="M14.6 8.4h4.8v4.8"/>',
  file: '<path d="M13.4 3.6H7.4a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2V8.8z"/><path d="M13.4 3.6v5.2h5.2"/>',
  trash: '<path d="M4.8 7.4h14.4"/><path d="M9.4 7.4V5.8a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v1.6"/><path d="M6.6 7.4l.9 11a1.8 1.8 0 0 0 1.8 1.7h5.4a1.8 1.8 0 0 0 1.8-1.7l.9-11"/>',
  download: '<path d="M12 4.6v10.8"/><path d="M7.8 11.2L12 15.4l4.2-4.2"/><path d="M4.8 18.4h14.4"/>',
  phone: '<path d="M6.4 3.8h3l1.5 3.8-2 1.4a10.6 10.6 0 0 0 5.1 5.1l1.4-2 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A15.4 15.4 0 0 1 4.6 5.8a1.8 1.8 0 0 1 1.8-2z"/>',
  mail: '<rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.2"/><path d="M3.6 7.2L12 13l8.4-5.8"/>',
  pin: '<path d="M12 20.4c3.6-4.2 6-7.2 6-9.8a6 6 0 1 0-12 0c0 2.6 2.4 5.6 6 9.8z"/><circle cx="12" cy="10.4" r="2.2"/>',
  cal: '<rect x="3.6" y="5.4" width="16.8" height="15" rx="2.2"/><path d="M3.6 10h16.8"/><path d="M8.4 3.6v3.4M15.6 3.6v3.4"/>',
  users: '<circle cx="9.4" cy="8.4" r="3.4"/><path d="M3.4 20a6 6 0 0 1 12 0"/><path d="M16.4 5.6a3.4 3.4 0 0 1 0 6.6"/><path d="M17.6 14.4a6 6 0 0 1 3 5.6"/>',
  layers: '<path d="M12 3.6l8.4 4.4L12 12.4 3.6 8z"/><path d="M3.6 12.4l8.4 4.4 8.4-4.4"/>',
  star: '<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/>'
}

const icon = (name, cls = '') =>
  `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`

/* ============================================================
   状态
   ============================================================ */

const saved = (() => {
  try { return JSON.parse(localStorage.getItem(LS.data) || '{}') } catch { return {} }
})()

const state = {
  api: localStorage.getItem(LS.api) ?? DEFAULT_API,
  view: localStorage.getItem(LS.view) || 'dashboard',
  token: null,
  user: null,
  device: null,
  resume: saved.resume || '',
  jd: saved.jd || '',
  targetJob: saved.targetJob || '',
  salary: saved.salary || { jobTitle: '前端开发工程师', city: '杭州', experience: '3-5' },
  results: {},
  busy: {},
  runAllStep: '',
  historyFilter: ''
}

function persist() {
  try {
    localStorage.setItem(LS.data, JSON.stringify({
      resume: state.resume,
      jd: state.jd,
      targetJob: state.targetJob,
      salary: state.salary
    }))
  } catch { /* 隐私模式等场景忽略 */ }
}

function getDeviceId() {
  let d = localStorage.getItem(LS.device)
  if (!d) {
    // 稳定的匿名设备标识：保证每次登录落到同一个账号，历史记录不丢
    d = 'web-' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 18)
      : Math.random().toString(36).slice(2, 12) + Date.now().toString(36))
    localStorage.setItem(LS.device, d)
  }
  return d
}

/* ============================================================
   API
   ============================================================ */

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function raw(path, { method = 'POST', body, auth = true, form } = {}) {
  const headers = {}
  const hasBody = form || body !== undefined
  // 只在真的有请求体时才声明 Content-Type：无体的 GET 带上它会白白触发一次跨域预检
  if (!form && hasBody) headers['Content-Type'] = 'application/json'
  if (auth && state.token) {
    // 发布域名下 Authorization 会被网关覆盖，x-auth-token 才是生效的那个；
    // 自有域名部署时 Authorization 生效 —— 两个都带，两边都能跑。
    headers['Authorization'] = 'Bearer ' + state.token
    headers['x-auth-token'] = state.token
  }

  const res = await fetch(state.api.replace(/\/+$/, '') + path, {
    method,
    headers,
    body: form ? form : (hasBody ? JSON.stringify(body) : undefined)
  })

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const data = await res.json()
    if (!res.ok) throw new ApiError(friendly(data.message, res.status), res.status)
    return data
  }
  if (!res.ok) throw new ApiError(friendly('', res.status), res.status)
  return res
}

/** 把服务端错误翻译成用户能看懂的话 */
function friendly(msg, status) {
  const m = String(msg || '')
  if (m.includes('DEEPSEEK_API_KEY') || m.includes('AI 服务未配置')) {
    return '服务端还没配置 AI 密钥，AI 类功能暂时不可用。'
  }
  if (m.includes('Insufficient Balance') || m.includes('insufficient_quota')) {
    return 'AI 服务账户余额不足，请到服务商后台充值。'
  }
  if (status === 429 || m.includes('请求过于频繁')) {
    return '请求太频繁了，等几分钟再试（AI 接口限 20 次 / 5 分钟）。'
  }
  if (status === 401) return '登录已失效，正在重新登录…'
  if (m) return m
  return `请求失败（HTTP ${status}）`
}

const api = (path, body, opts) => raw(path, { body, ...opts })

/* ---------------- 登录 ---------------- */

let loginPromise = null

function ensureLogin(force = false) {
  if (!force && state.token) return Promise.resolve(state.user)
  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    const data = await raw('/api/auth/login', {
      body: { code: 'web-client', deviceId: getDeviceId() },
      auth: false
    })
    state.token = data.token
    state.user = data.userInfo || { id: '-', nickname: '游客' }
    paintAccount(true)
    return state.user
  })()
    .catch((err) => {
      state.token = null
      paintAccount(false)
      throw err
    })
    .finally(() => { loginPromise = null })

  return loginPromise
}

/** 包一层：401 时自动重登一次再重试 */
async function apiCall(path, body, opts) {
  await ensureLogin()
  try {
    return await api(path, body, opts)
  } catch (err) {
    if (err.status === 401) {
      await ensureLogin(true)
      return await api(path, body, opts)
    }
    throw err
  }
}

/* ============================================================
   Toast
   ============================================================ */

function toast(msg, kind = 'info', ms = 3600) {
  const el = document.createElement('div')
  el.className = 'toast' + (kind === 'good' ? ' is-good' : kind === 'bad' ? ' is-bad' : '')
  el.innerHTML = `${icon(kind === 'good' ? 'check' : 'alert')}<span>${esc(msg)}</span>`
  $('#toasts').appendChild(el)
  setTimeout(() => {
    el.classList.add('is-out')
    setTimeout(() => el.remove(), 220)
  }, ms)
}

/* ============================================================
   通用渲染块
   ============================================================ */

function ring(score, label = '综合评分') {
  const s = clamp(Math.round(Number(score) || 0), 0, 100)
  const r = 54, c = 2 * Math.PI * r
  const off = c * (1 - s / 100)
  const t = tone(s)
  return `
    <div class="ring is-${t}">
      <svg viewBox="0 0 124 124">
        <circle class="ring-bg" cx="62" cy="62" r="${r}" stroke-width="9"/>
        <circle class="ring-bar" cx="62" cy="62" r="${r}" stroke-width="9"
          stroke="currentColor" style="color:var(--${t})"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
      </svg>
      <div class="ring-label"><b>${s}</b><span>${esc(label)}</span></div>
    </div>`
}

function block(title, items, { tone: tn = '', icon: ic = 'bulb', empty = '暂无', raw } = {}) {
  const list = raw ? (Array.isArray(raw) ? raw : [raw]) : asList(items)
  const body = list.length
    ? `<ul class="bullets">${list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : `<ul class="bullets is-empty"><li>${esc(empty)}</li></ul>`
  return `
    <div class="block${tn ? ' is-' + tn : ''}">
      <div class="block-head">${icon(ic)}<h3>${esc(title)}</h3>
        ${list.length ? `<span class="block-count">${list.length}</span>` : ''}
      </div>
      ${body}
    </div>`
}

function tagList(items, kind = '') {
  const list = asList(items)
  if (!list.length) return '<span class="hint">无</span>'
  return `<div class="tags">${list.map(i =>
    `<span class="tag${kind ? ' is-' + kind : ''}">${esc(i)}</span>`).join('')}</div>`
}

function loading(text = '正在分析…', sub = 'AI 处理通常需要几秒到二十几秒') {
  return `<div class="loading"><div class="spinner"></div><p>${esc(text)}</p><p class="loading-sub">${esc(sub)}</p></div>`
}

function emptyState({ icon: ic = 'sparkles', title, desc, actionId, actionText }) {
  return `
    <div class="empty">
      <div class="empty-icon">${icon(ic)}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(desc)}</p>
      ${actionId ? `<button class="btn btn-primary" id="${actionId}">${icon('sparkles')}${esc(actionText)}</button>` : ''}
    </div>`
}

function errorBox(title, msg) {
  return `<div class="error-box">${icon('alert')}<div><strong>${esc(title)}</strong><p>${esc(msg)}</p></div></div>`
}

function resultBar({ time, actions = '' }) {
  return `<div class="result-bar">
    <span class="stamp">生成于 ${esc(time || new Date().toLocaleTimeString('zh-CN'))}</span>
    <span class="spacer"></span>
    ${actions}
  </div>`
}

/* ============================================================
   各视图
   ============================================================ */

/* ---------- 工作台 ---------- */

function viewDashboard() {
  const a = state.results.analyze, t = state.results.ats, m = state.results.match
  const has = a || t || m

  if (!has) {
    return `<section class="card">${emptyState({
      icon: 'sparkles',
      title: '开始一次完整分析',
      desc: '填好上面的简历和目标岗位 JD，然后点「一键分析」——会依次跑简历分析、ATS 评分和岗位匹配，结果汇总在这里，也能在左侧单独查看。',
      actionId: 'dashRun',
      actionText: '一键分析'
    })}</section>`
  }

  const kpi = (label, value, unit, foot, tn = '') => `
    <div class="kpi">
      <div class="kpi-label">${esc(label)}</div>
      <div class="kpi-value${tn ? ' is-' + tn : ''}">${value}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
      <div class="kpi-foot">${esc(foot)}</div>
    </div>`

  const matched = m ? asList(m.matchedSkills).length : (a ? asList(a.skills).length : 0)
  const missing = m ? asList(m.missingSkills).length : (a ? asList(a.gaps).length : 0)

  return `
    <div class="kpi-grid">
      ${m ? kpi('岗位匹配度', Math.round(m.score ?? 0), '分', toneText(m.score), tone(m.score))
      : a ? kpi('综合评分', Math.round(a.score ?? 0), '分', toneText(a.score), tone(a.score)) : ''}
      ${t ? kpi('ATS 总分', Math.round(t.totalScore ?? 0), '分', toneText(t.totalScore), tone(t.totalScore)) : ''}
      ${kpi('已匹配技能', matched, '项', '简历里能对上的')}
      ${kpi('待补技能', missing, '项', '招聘要求里缺的')}
    </div>

    ${a ? `<section class="card" style="margin-top:18px">
      <div class="card-head">
        <div class="card-head-left"><h2>简历分析</h2><p>AI 从 HR 视角给出的整体判断</p></div>
        <button class="ghost-btn" data-goto="analyze">查看详情 ${icon('rise')}</button>
      </div>
      <div class="card-body">
        <div class="score-row">
          ${ring(a.score, '简历评分')}
          <div class="score-summary">
            <div class="tags">${asList(a.skills).slice(0, 8).map(s => `<span class="tag is-brand">${esc(s)}</span>`).join('')}</div>
            <p class="score-note">${esc(asList(a.advantages)[0] || asList(a.gaps)[0] || '详情见「简历分析」。')}</p>
          </div>
        </div>
      </div>
    </section>` : ''}

    <section class="card" style="margin-top:18px">
      <div class="card-head">
        <div class="card-head-left"><h2>下一步可以做什么</h2><p>这些工具都复用上面的简历和 JD</p></div>
      </div>
      <div class="card-body">
        <div class="blocks">
          ${[
            ['optimize', 'wand', '简历润色', '按 STAR 法则重写经历，并导出 PDF'],
            ['roadmap', 'route', '提升路线', '按阶段列出要补的技能和学时'],
            ['jobs', 'briefcase', '岗位推荐', '按简历推 5 个匹配岗位'],
            ['salary', 'coins', '薪资查询', '看目标岗位的参考薪资区间']
          ].map(([v, ic, name, desc]) => `
            <button class="block" style="text-align:left;cursor:pointer" data-goto="${v}">
              <div class="block-head">${icon(ic)}<h3>${esc(name)}</h3></div>
              <p class="score-note" style="margin:0">${esc(desc)}</p>
            </button>`).join('')}
        </div>
      </div>
    </section>

    <section class="card" style="margin-top:18px">
      <div class="card-head">
        <div class="card-head-left"><h2>重新分析</h2><p>改了简历或 JD 之后，点这里重跑</p></div>
        <button class="btn btn-soft" id="dashRun">${icon('sparkles')}一键分析</button>
      </div>
    </section>`
}

/* ---------- 简历分析 ---------- */

function renderAnalyze(d) {
  const s = Math.round(Number(d.score) || 0)
  return `
    <div class="score-row">
      ${ring(s, '简历评分')}
      <div class="score-summary">
        <div class="tags">
          <span class="tag is-${tone(s) === 'good' ? 'good' : tone(s) === 'warn' ? 'warn' : 'bad'}">${esc(toneText(s))}</span>
          <span class="tag">识别到 ${asList(d.skills).length} 项技能</span>
        </div>
        <p class="score-note">评分是基于简历与目标 JD 的匹配程度给出的相对值，80 分以上通常意味着关键词和能力项都能对上。</p>
      </div>
    </div>
    <div class="blocks" style="margin-top:20px">
      ${block('匹配到的技能', d.skills, { tone: 'brand', icon: 'star', empty: '没有识别到明确技能' })}
      ${block('核心优势', d.advantages, { tone: 'good', icon: 'check', empty: '暂未提炼出优势' })}
      ${block('能力差距', d.gaps, { tone: 'warn', icon: 'warn', empty: '没发现明显差距' })}
      ${block('改进建议', d.suggestions, { tone: '', icon: 'bulb', empty: '暂无建议' })}
    </div>`
}

/* ---------- ATS 评分 ---------- */

function renderAts(d) {
  const total = Math.round(Number(d.totalScore) || 0)
  const breakdown = Array.isArray(d.breakdown) ? d.breakdown : []
  return `
    <div class="score-row">
      ${ring(total, 'ATS 总分')}
      <div class="score-summary">
        <div class="bars">
          ${breakdown.map(b => {
            const sc = Number(b.score) || 0
            const mx = Number(b.max) || 100
            const pct = clamp((sc / mx) * 100, 0, 100)
            const t = tone(pct)
            return `<div class="bar-row">
              <span class="bar-name">${esc(b.name || '-')}</span>
              <span class="bar-track"><span class="bar-fill is-${t}" style="width:${pct}%"></span></span>
              <span class="bar-num">${sc} / ${mx}</span>
              ${b.tip ? `<span class="bar-tip">${esc(b.tip)}</span>` : ''}
            </div>`
          }).join('') || '<p class="score-note">未返回分项数据。</p>'}
        </div>
      </div>
    </div>

    <div class="blocks" style="margin-top:20px">
      ${block('命中的关键词', d.foundKeywords, { tone: 'good', icon: 'check', empty: '没有命中关键词' })}
      ${block('缺失的关键词', d.missingKeywords, { tone: 'bad', icon: 'warn', empty: '关键词覆盖完整' })}
    </div>

    <div style="margin-top:14px">
      ${block('改进建议', d.suggestions, { icon: 'bulb', empty: '暂无建议' })}
    </div>`
}

/* ---------- 岗位匹配 ---------- */

function renderMatch(d) {
  const s = Math.round(Number(d.score) || 0)
  return `
    <div class="score-row">
      ${ring(s, '匹配度')}
      <div class="score-summary">
        <div class="tags">
          <span class="tag is-brand">${esc(toneText(s))}</span>
          <span class="tag is-good">已匹配 ${asList(d.matchedSkills).length}</span>
          <span class="tag is-bad">待补 ${asList(d.missingSkills).length}</span>
        </div>
        <p class="score-note">匹配度同时考虑显性技能和从项目描述里推断出的可迁移能力，不完全等同于关键词命中率。</p>
      </div>
    </div>
    <div class="blocks" style="margin-top:20px">
      ${block('已匹配技能', d.matchedSkills, { tone: 'good', icon: 'check', empty: '暂无' })}
      ${block('缺失技能', d.missingSkills, { tone: 'bad', icon: 'warn', empty: '没有明显缺失' })}
      ${block('核心优势', d.advantages, { tone: 'brand', icon: 'star', empty: '暂无' })}
      ${block('潜在风险', d.risks, { tone: 'warn', icon: 'shield', empty: '未提示风险' })}
    </div>`
}

/* ---------- 简历润色 ---------- */

function renderOptimize(d) {
  const before = Number(d.scoreBefore)
  const after = Number(d.scoreAfter)
  const delta = (Number.isFinite(before) && Number.isFinite(after)) ? after - before : NaN

  const contact = d.contact || {}
  const contactRows = [
    ['phone', 'phone', contact.phone],
    ['mail', 'mail', contact.email],
    ['pin', 'pin', contact.location],
    ['cal', 'cal', contact.onboard]
  ].filter(([, , v]) => v)

  const exp = Array.isArray(d.experience) ? d.experience : []
  const edu = Array.isArray(d.education) ? d.education : []
  const proj = Array.isArray(d.projects) ? d.projects : []
  const skills = d.skills && typeof d.skills === 'object' && !Array.isArray(d.skills) ? d.skills : null
  const changes = Array.isArray(d.changes) ? d.changes : []

  return `
    <div class="salary-figure" style="margin-bottom:18px">
      ${Number.isFinite(delta)
      ? `<span class="delta is-${delta > 0 ? 'up' : 'flat'}">${delta > 0 ? icon('rise') : ''}
           ${Number.isFinite(before) ? before : '-'} → ${Number.isFinite(after) ? after : '-'}
           ${delta > 0 ? `（+${delta}）` : delta === 0 ? '（持平）' : `（${delta}）`}</span>`
      : ''}
      <span class="hint">匹配度变化</span>
    </div>

    <div class="resume-preview">
      <div class="rp-head">
        <div class="rp-name">${esc(d.name || '未提供姓名')}</div>
        ${contactRows.length ? `<div class="rp-contact">${contactRows.map(([ic, , v]) =>
        `<span>${icon(ic)}${esc(v)}</span>`).join('')}</div>` : ''}
      </div>

      ${d.summary ? `<div class="rp-section"><h4>个人总结</h4><p class="rp-summary">${esc(d.summary)}</p></div>` : ''}

      ${exp.length ? `<div class="rp-section"><h4>工作经历</h4>
        ${exp.map(e => `
          <div class="rp-entry">
            <div class="rp-entry-top">
              <div>
                <div class="rp-entry-title">${esc(e.company || '')}</div>
                <div class="rp-entry-sub">${esc(e.role || '')}</div>
              </div>
              ${e.period ? `<span class="rp-period">${esc(e.period)}</span>` : ''}
            </div>
            ${asList(e.items || e.description || e.desc).length
          ? `<ul class="rp-items">${asList(e.items || e.description || e.desc).map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${proj.length ? `<div class="rp-section"><h4>项目经历</h4>
        ${proj.map(p => `
          <div class="rp-entry">
            <div class="rp-entry-top">
              <div>
                <div class="rp-entry-title">${esc(p.name || '')}</div>
                <div class="rp-entry-sub">${esc(p.role || '')}</div>
              </div>
              ${p.period ? `<span class="rp-period">${esc(p.period)}</span>` : ''}
            </div>
            ${(p.desc || p.description) ? `<p class="rp-summary" style="margin:8px 0 0">${esc(p.desc || p.description)}</p>` : ''}
            ${asList(p.technologies).length
          ? `<div class="tags" style="margin-top:8px">${asList(p.technologies).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${edu.length ? `<div class="rp-section"><h4>教育经历</h4>
        ${edu.map(e => `
          <div class="rp-entry">
            <div class="rp-entry-top">
              <div>
                <div class="rp-entry-title">${esc(e.school || '')}</div>
                <div class="rp-entry-sub">${esc([e.major, e.degree, e.gpa].filter(Boolean).join(' · '))}</div>
              </div>
              ${e.period ? `<span class="rp-period">${esc(e.period)}</span>` : ''}
            </div>
            ${asList(e.honors).length
          ? `<ul class="rp-items">${asList(e.honors).map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${skills ? `<div class="rp-section"><h4>专业技能</h4>
        <div class="rp-skills">
          ${Object.entries(skills).map(([k, v]) => `
            <div class="rp-skill-row">
              <span class="rp-skill-cat">${esc(k)}</span>
              <div class="tags">${asList(v).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>

    ${changes.length ? `<div class="blocks" style="margin-top:20px">
      <div class="block is-brand" style="grid-column:1/-1">
        <div class="block-head">${icon('wand')}<h3>改了什么</h3><span class="block-count">${changes.length} 处</span></div>
        <div class="rec-list">
          ${changes.map(c => `
            <div class="rec" style="border-color:rgba(46,75,224,.16)">
              <div class="rec-main">
                <div class="rec-title">${esc(c.section || '修改')}</div>
                <div class="rec-meta" style="flex-direction:column;gap:4px;margin-top:6px">
                  ${c.before ? `<span style="color:var(--bad)">改前：${esc(c.before)}</span>` : ''}
                  ${c.after ? `<span style="color:var(--good)">改后：${esc(c.after)}</span>` : ''}
                  ${c.reason ? `<span>原因：${esc(c.reason)}</span>` : ''}
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>` : ''}

    ${asList(d.suggestions).length ? `<div style="margin-top:14px">
      ${block('后续优化建议', d.suggestions, { icon: 'bulb', empty: '暂无' })}
    </div>` : ''}`
}

/* ---------- 提升路线 ---------- */

function renderRoadmap(d) {
  const list = Array.isArray(d.roadmap) ? d.roadmap : []
  if (!list.length) return '<p class="score-note">没有返回路线数据。</p>'
  return `
    <div class="tags" style="margin-bottom:16px">
      <span class="tag is-brand">目标岗位：${esc(d.targetRole || state.jd.slice(0, 20) || '未指定')}</span>
      <span class="tag">共 ${list.length} 个阶段</span>
    </div>
    <div class="timeline">
      ${list.map((s, i) => `
        <div class="stage">
          <div class="stage-dot">${i + 1}</div>
          <div class="stage-body">
            <div class="stage-top">
              <span class="stage-title">${esc(s.stage || `第 ${i + 1} 阶段`)}</span>
              ${s.timeEstimate ? `<span class="stage-time">${esc(s.timeEstimate)}</span>` : ''}
            </div>
            ${s.focus ? `<p class="stage-focus">${esc(s.focus)}</p>` : ''}
            ${asList(s.skills).length
        ? `<div class="tags">${asList(s.skills).map(k => `<span class="tag">${esc(k)}</span>`).join('')}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`
}

/* ---------- 岗位推荐 ---------- */

function renderJobs(d) {
  const list = Array.isArray(d) ? d : (Array.isArray(d?.jobs) ? d.jobs : [])
  if (!list.length) return '<p class="score-note">没有返回推荐结果。</p>'
  return `
    <div class="job-grid">
      ${list.map(j => {
    const s = Math.round(Number(j.matchScore) || 0)
    const t = tone(s)
    return `
        <div class="job">
          <div class="job-top">
            <div>
              <div class="job-title">${esc(j.title || '')}</div>
              <div class="job-company">${esc(j.company || '')}</div>
            </div>
            <div class="job-match${t === 'good' ? ' is-good' : ''}">
              <b>${s}</b><span>匹配度</span>
            </div>
          </div>
          ${j.salaryRange ? `<div class="job-salary">${esc(j.salaryRange)}</div>` : ''}
          ${asList(j.tags).length
        ? `<div class="tags">${asList(j.tags).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
          ${j.reason ? `<div class="job-reason">${esc(j.reason)}</div>` : ''}
        </div>`
  }).join('')}
    </div>`
}

/* ---------- 薪资查询 ---------- */

function salaryForm() {
  const s = state.salary
  const titles = ['前端开发工程师', 'JavaScript开发', 'Vue开发工程师', '其他岗位']
  const exps = [['0-1', '应届 / 1 年以内'], ['1-3', '1-3 年'], ['3-5', '3-5 年'], ['5-10', '5-10 年'], ['10+', '10 年以上']]
  return `
    <div class="form-row">
      <div class="input-group">
        <label for="salTitle">岗位</label>
        <select id="salTitle">
          ${titles.map(t => `<option ${s.jobTitle === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label for="salCity">城市</label>
        <input id="salCity" value="${esc(s.city || '')}" placeholder="如：杭州">
      </div>
      <div class="input-group">
        <label for="salExp">经验年限</label>
        <select id="salExp">
          ${exps.map(([v, l]) => `<option value="${v}" ${s.experience === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <button class="btn btn-primary" id="salRun" style="width:100%">${icon('coins')}查询</button>
      </div>
    </div>
    <p class="hint" style="margin-top:10px">当前薪资区间来自服务端内置的参考数据（按岗位 + 经验年限换算），城市暂未参与计算。</p>`
}

function renderSalary(d) {
  return `
    <div class="salary-band">
      <div class="salary-cell"><span>偏低</span><b>${Math.round(d.low ?? 0)}<em>K/月</em></b></div>
      <div class="salary-cell is-mid"><span>中位</span><b>${Math.round(d.mid ?? 0)}<em>K/月</em></b></div>
      <div class="salary-cell"><span>偏高</span><b>${Math.round(d.high ?? 0)}<em>K/月</em></b></div>
    </div>
    ${asList(d.factors).length ? `<div style="margin-top:16px">
      ${block('影响因素', d.factors, { icon: 'bulb', empty: '暂无' })}
    </div>` : ''}`
}

/* ---------- 历史记录 ---------- */

const REC_META = {
  analysis: ['简历分析', 'sparkles'],
  match: ['匹配分析', 'target'],
  optimize: ['简历润色', 'wand'],
  roadmap: ['学习路线', 'route'],
  resume: ['生成简历', 'file']
}

function renderHistory(list) {
  const filtered = state.historyFilter
    ? list.filter(r => r.type === state.historyFilter)
    : list

  const counts = list.reduce((m, r) => (m[r.type] = (m[r.type] || 0) + 1, m), {})
  const chips = [['', '全部', list.length], ...Object.entries(REC_META).map(([k, v]) => [k, v[0], counts[k] || 0])]

  return `
    <div class="filters">
      ${chips.map(([k, label, n]) => `
        <button class="chip-filter${state.historyFilter === k ? ' is-active' : ''}" data-filter="${k}">
          ${esc(label)}${n ? ` ${n}` : ''}
        </button>`).join('')}
    </div>
    ${filtered.length ? `<div class="rec-list">
      ${filtered.map(r => {
    const [label, ic] = REC_META[r.type] || ['记录', 'file']
    return `
        <div class="rec">
          <div class="rec-icon">${icon(ic)}</div>
          <div class="rec-main">
            <div class="rec-title">${esc(r.title || label)}</div>
            <div class="rec-meta">
              <span>${esc(label)}</span>
              ${r.project ? `<span>· ${esc(r.project)}</span>` : ''}
              <span>· ${esc(timeAgo(r.created_at || r.createdAt))}</span>
            </div>
          </div>
          <div class="rec-actions">
            <button class="icon-btn" data-del="${esc(r.id)}" title="删除">${icon('trash')}</button>
          </div>
        </div>`
  }).join('')}
    </div>` : `<div class="empty">${icon('clock')}<h3>还没有记录</h3>
      <p>每跑一次分析、润色或路线图，结果都会自动存到这里。</p></div>`}`
}

/* ============================================================
   视图注册表
   ============================================================ */

const VIEWS = {
  dashboard: {
    title: '工作台', sub: '先把简历和目标岗位填好，后面的分析都用它。', icon: 'sparkles',
    custom: true
  },
  analyze: {
    title: '简历分析', sub: '让 AI 从 HR 视角读一遍简历，给出匹配度和改进方向。',
    icon: 'sparkles', need: ['resume', 'jd'],
    run: () => apiCall('/api/ai/analyze-text', { resumeText: state.resume, jd: state.jd }),
    render: renderAnalyze,
    cta: '开始分析'
  },
  ats: {
    title: 'ATS 评分', sub: '模拟简历追踪系统，看关键词和格式能不能过关。',
    icon: 'gauge', need: ['resume'],
    extra: true,
    run: () => apiCall('/api/ats/score', {
      resumeText: state.resume,
      targetJob: state.targetJob || state.jd.slice(0, 40)
    }),
    render: renderAts,
    cta: '开始评分'
  },
  match: {
    title: '岗位匹配', sub: '深度对比简历和 JD，包括能推断出的可迁移能力。',
    icon: 'target', need: ['resume', 'jd'],
    run: () => apiCall('/api/match/analyze', { resumeText: state.resume, jd: state.jd }),
    render: renderMatch,
    cta: '开始匹配'
  },
  optimize: {
    title: '简历润色', sub: '按 STAR 法则重写经历，输出结构化简历并可直接导出 PDF。',
    icon: 'wand', need: ['resume'],
    run: () => apiCall('/api/optimize/optimize', { resumeText: state.resume, jd: state.jd }),
    render: renderOptimize,
    cta: '开始润色'
  },
  roadmap: {
    title: '提升路线', sub: '按阶段列出需要补的技能、学习重点和预计用时。',
    icon: 'route', need: ['resume', 'jd'],
    run: () => apiCall('/api/roadmap/generate', { resumeText: state.resume, jd: state.jd }),
    render: renderRoadmap,
    cta: '生成路线'
  },
  jobs: {
    title: '岗位推荐', sub: '根据简历内容推荐 5 个匹配岗位，含薪资区间和推荐理由。',
    icon: 'briefcase', need: ['resume'],
    run: () => apiCall('/api/recommend/jobs', { resumeText: state.resume }),
    render: renderJobs,
    cta: '开始推荐'
  },
  salary: {
    title: '薪资查询', sub: '看看目标岗位在市场上的参考薪资区间。',
    icon: 'coins', custom: true,
    run: () => apiCall('/api/salary/query', { ...state.salary }),
    render: renderSalary
  },
  history: {
    title: '历史记录', sub: '每次分析的存档，保存在服务端。',
    icon: 'clock', custom: true,
    load: () => apiCall('/api/history/list', undefined, { method: 'GET' })
  }
}

/* ============================================================
   渲染 / 路由
   ============================================================ */

function missingText(cfg) {
  const miss = (cfg.need || []).filter(k => k === 'resume' ? state.resume.trim().length < 50 : !state.jd.trim())
  if (!miss.length) return ''
  const parts = miss.map(k => k === 'resume'
    ? (state.resume.trim() ? '简历太短（至少 50 字）' : '还没填简历')
    : '还没填目标岗位 JD')
  return parts.join('，') + '。填写后就能运行。'
}

function viewHtml(name) {
  if (name === 'dashboard') return viewDashboard()

  const cfg = VIEWS[name]
  if (!cfg) return ''

  const d = state.results[name]
  const busy = state.busy[name]
  const err = state.errors?.[name]
  const miss = missingText(cfg)

  let inner = ''

  if (name === 'salary') {
    inner = salaryForm() + (d ? `<div style="margin-top:20px">${renderSalary(d)}</div>` : '')
    return `<section class="card">
      <div class="card-head"><div class="card-head-left"><h2>查询条件</h2><p>选择岗位和经验年限</p></div></div>
      <div class="card-body">${inner}</div>
    </section>`
  }

  if (name === 'history') {
    return `<section class="card">
      <div class="card-head">
        <div class="card-head-left"><h2>我的记录</h2><p>按类型筛选，可删除</p></div>
        <button class="btn btn-ghost" id="reloadHistory">${icon('clock')}刷新</button>
      </div>
      <div class="card-body">${busy ? loading('正在读取记录…', '') : (err ? errorBox('读取失败', err) : renderHistory(state.historyList || []))}</div>
    </section>`
  }

  return `
    <section class="card">
      <div class="card-head">
        <div class="card-head-left"><h2>${esc(cfg.title)}</h2><p>${esc(cfg.sub)}</p></div>
        <button class="btn btn-primary" id="runBtn" ${busy || miss ? 'disabled' : ''}>
          ${icon(cfg.icon)}${esc(busy ? '分析中…' : (cfg.cta || '开始'))}
        </button>
      </div>
      <div class="card-body">
        ${cfg.extra ? `<div class="input-group" style="margin-bottom:16px">
          <label for="targetJobInput">目标岗位名称（ATS 评分用，留空则取 JD 开头）</label>
          <input id="targetJobInput" value="${esc(state.targetJob)}" placeholder="如：前端开发工程师">
        </div>` : ''}
        ${miss && !d ? `<p class="hint is-bad" style="margin-bottom:14px">${esc(miss)}</p>` : ''}
        ${busy ? loading(`正在${cfg.cta || '处理'}…`)
      : err ? errorBox('这次没跑通', err)
        : d ? `${cfg.render(d)}${resultBar({ time: state.resultsAt?.[name] })}`
          : emptyState({
            icon: cfg.icon, title: `还没有${cfg.title}结果`,
            desc: miss || `${cfg.sub}点下面的按钮开始。`,
            actionId: null
          })}
      </div>
    </section>`
}

let renderToken = 0

function render() {
  const name = state.view
  const cfg = VIEWS[name] || VIEWS.dashboard

  document.body.dataset.view = name
  $('#pageTitle').textContent = cfg.title
  $('#pageSub').textContent = cfg.sub || ''

  document.querySelectorAll('#nav .nav-item').forEach(el => {
    el.classList.toggle('is-active', el.dataset.view === name)
    el.classList.toggle('is-done', Boolean(state.results[el.dataset.view]))
  })

  $('#view').innerHTML = viewHtml(name)

  const runBtn = $('#runBtn')
  if (runBtn) runBtn.addEventListener('click', () => runTool(name))
  const dashRun = $('#dashRun')
  if (dashRun) dashRun.addEventListener('click', runAll)
  const salRun = $('#salRun')
  if (salRun) salRun.addEventListener('click', () => {
    state.salary = { jobTitle: $('#salTitle').value, city: $('#salCity').value, experience: $('#salExp').value }
    persist(); runTool('salary')
  })
  const tji = $('#targetJobInput')
  if (tji) tji.addEventListener('change', () => { state.targetJob = tji.value; persist() })
  const reloadBtn = $('#reloadHistory')
  if (reloadBtn) reloadBtn.addEventListener('click', () => loadHistory())
  if (name === 'history' && !state.historyList && !state.busy.history) loadHistory()

  paintReady()
}

function go(name) {
  state.view = name
  localStorage.setItem(LS.view, name)
  render()
  $('.scroller').scrollTo({ top: 0, behavior: 'smooth' })
}

/* ============================================================
   执行
   ============================================================ */

async function runTool(name) {
  const cfg = VIEWS[name]
  if (!cfg || !cfg.run) return
  const miss = missingText(cfg)
  if (miss) { toast(miss, 'bad'); return }

  state.errors = state.errors || {}
  delete state.errors[name]
  state.busy[name] = true
  render()

  try {
    const data = await cfg.run()
    state.results[name] = data
    state.resultsAt = state.resultsAt || {}
    state.resultsAt[name] = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    toast(`${cfg.title}完成`, 'good', 2400)
  } catch (err) {
    state.errors[name] = err.message || '未知错误'
    toast(`${cfg.title}失败：${err.message}`, 'bad', 5200)
  } finally {
    // busy 必须在渲染前清掉，否则界面会永远停在加载态
    state.busy[name] = false
    render()
  }
}

async function runAll() {
  if (state.resume.trim().length < 50) {
    toast('简历至少 50 字才能分析，先补一下。', 'bad'); return
  }
  if (!state.jd.trim()) {
    toast('请先填目标岗位 JD —— 匹配度分析需要它。', 'bad'); return
  }

  state.view = 'dashboard'
  localStorage.setItem(LS.view, 'dashboard')
  const steps = [
    ['analyze', 'AI 简历分析'],
    ['ats', 'ATS 评分'],
    ['match', '岗位匹配分析']
  ]
  state.results = state.results || {}
  state.errors = {}

  $('#view').innerHTML = `<section class="card"><div class="loading">
    <div class="spinner"></div>
    <p id="runAllStep">准备开始…</p>
    <p class="loading-sub">依次执行 3 项分析，中途可以离开这个页面</p>
  </div></section>`

  for (let i = 0; i < steps.length; i++) {
    const [key, label] = steps[i]
    const el = $('#runAllStep')
    if (el) el.textContent = `第 ${i + 1}/${steps.length} 步：${label}…`
    try {
      const cfg = VIEWS[key]
      state.results[key] = await cfg.run()
      state.resultsAt = state.resultsAt || {}
      state.resultsAt[key] = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    } catch (err) {
      state.errors[key] = err.message
      toast(`${label}失败：${err.message}`, 'bad', 5200)
    }
  }

  render()
  const ok = steps.filter(([k]) => state.results[k]).length
  const failed = steps.filter(([k]) => state.errors[k])
  toast(ok === steps.length ? '3 项分析全部完成'
    : `完成 ${ok}/${steps.length} 项${failed.length ? '，失败：' + failed.map(([, l]) => l).join('、') : ''}`,
    ok === steps.length ? 'good' : 'info', 4200)
}

function panelMarkDone() { /* 已移除：导航完成态由 render() 根据 state.results 刷新 */ }

async function loadHistory() {
  state.busy.history = true
  state.errors = state.errors || {}
  delete state.errors.history
  render()
  try {
    const d = await VIEWS.history.load()
    state.historyList = Array.isArray(d?.list) ? d.list : []
    state.busy.history = false
    render()
  } catch (err) {
    state.busy.history = false
    state.errors.history = err.message
    render()
  }
}

/* ============================================================
   简历输入区
   ============================================================ */

function paintCounts() {
  const r = state.resume.trim().length
  const j = state.jd.trim().length
  $('#resumeCount').textContent = r + ' 字'
  $('#jdCount').textContent = j + ' 字'
  const hint = $('#resumeHint')
  if (r === 0) {
    hint.textContent = '支持 PDF / DOCX，单文件不超过 10MB'
    hint.className = 'hint'
  } else if (r < 50) {
    hint.textContent = `还差 ${50 - r} 字才能做 AI 分析`
    hint.className = 'hint is-bad'
  } else {
    hint.textContent = '内容已就绪，可以做 AI 分析'
    hint.className = 'hint is-ok'
  }

  const sum = $('#summaryText')
  if (sum) {
    sum.textContent = `简历 ${r ? r + ' 字' : '未填写'} · JD ${j ? j + ' 字' : '未填写'}`
  }
}

function paintReady() {
  const chip = $('#readyChip')
  const r = state.resume.trim().length
  const j = state.jd.trim().length
  if (r >= 50 && j) {
    chip.className = 'ready-chip is-ready'
    chip.innerHTML = '<i class="dot"></i>简历与 JD 已就绪'
  } else if (r >= 50) {
    chip.className = 'ready-chip is-warn'
    chip.innerHTML = '<i class="dot"></i>缺目标岗位 JD'
  } else if (r > 0) {
    chip.className = 'ready-chip is-warn'
    chip.innerHTML = `<i class="dot"></i>简历还差 ${50 - r} 字`
  } else {
    chip.className = 'ready-chip'
    chip.innerHTML = '<i class="dot"></i>简历未填写'
  }
}

function paintAccount(ok) {
  const btn = $('#accountBtn')
  if (ok && state.user) {
    const name = state.user.nickname || '用户'
    $('#accountName').textContent = name
    $('#accountMeta').textContent = 'ID ' + String(state.user.id).slice(0, 8)
    $('#avatar').textContent = name.slice(-2)
  } else {
    $('#accountName').textContent = '未登录'
    $('#accountMeta').textContent = '点击重试'
    $('#avatar').textContent = '—'
  }
}

/* ============================================================
   初始化
   ============================================================ */

function bind() {
  // 侧栏导航
  $('#nav').addEventListener('click', e => {
    const item = e.target.closest('.nav-item')
    if (item) go(item.dataset.view)
  })

  // 页面内跳转 / 删除记录
  $('#view').addEventListener('click', e => {
    const goto = e.target.closest('[data-goto]')
    if (goto) { go(goto.dataset.goto); return }

    const del = e.target.closest('[data-del]')
    if (del) {
      const id = del.dataset.del
      apiCall(`/api/history/delete/${encodeURIComponent(id)}`, undefined, { method: 'DELETE' })
        .then(() => {
          state.historyList = (state.historyList || []).filter(r => String(r.id) !== String(id))
          render()
          toast('已删除', 'good', 2000)
        })
        .catch(err => toast('删除失败：' + err.message, 'bad'))
    }
  })

  // 历史筛选
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-filter]')
    if (f) { state.historyFilter = f.dataset.filter; render() }
  })

  // 简历 / JD
  const ri = $('#resumeInput'), ji = $('#jdInput')
  ri.value = state.resume
  ji.value = state.jd
  paintCounts()

  let t1
  ri.addEventListener('input', () => {
    state.resume = ri.value; paintCounts(); paintReady()
    clearTimeout(t1); t1 = setTimeout(persist, 350)
  })
  let t2
  ji.addEventListener('input', () => {
    state.jd = ji.value; paintCounts(); paintReady()
    clearTimeout(t2); t2 = setTimeout(persist, 350)
  })

  $('#clearJd').addEventListener('click', () => {
    ji.value = ''; state.jd = ''; persist(); paintCounts(); paintReady()
  })

  // 上传解析
  $('#uploadBtn').addEventListener('click', () => $('#fileInput').click())
  $('#fileInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast('文件超过 10MB 限制', 'bad'); return }

    const btn = $('#uploadBtn')
    btn.disabled = true
    const original = btn.innerHTML
    btn.textContent = '解析中…'
    try {
      const form = new FormData()
      form.append('file', file)
      const d = await raw('/api/resume/parse', { form, auth: false })
      if (d.warning) { toast(d.warning, 'bad', 6000); return }
      state.resume = d.text || ''
      ri.value = state.resume
      persist(); paintCounts(); paintReady()
      toast(`已解析 ${file.name}（${bytes(file.size)}，提取 ${state.resume.trim().length} 字）`, 'good', 4200)
    } catch (err) {
      toast('解析失败：' + err.message, 'bad', 5000)
    } finally {
      btn.disabled = false
      btn.innerHTML = original
    }
  })

  // 收起 / 展开输入区
  const card = $('#contextCard')
  const toggle = () => {
    const collapsed = card.classList.toggle('is-collapsed')
    $('#toggleContext span').textContent = collapsed ? '展开' : '收起'
    $('#toggleContext svg').style.transform = collapsed ? 'rotate(180deg)' : ''
  }
  $('#toggleContext').addEventListener('click', toggle)
  $('#expandContext').addEventListener('click', toggle)

  // 一键分析
  $('#runAllBtn').addEventListener('click', runAll)

  // 账号
  $('#accountBtn').addEventListener('click', () => {
    ensureLogin(true).then(() => {
      toast('已重新登录', 'good', 2000)
      if (state.view === 'history') loadHistory()
      render()
    }).catch(err => toast('登录失败：' + err.message, 'bad', 5200))
  })

  // 设置
  const modal = $('#settingsModal')
  $('#settingsBtn').addEventListener('click', () => {
    $('#apiInput').value = state.api
    modal.hidden = false
  })
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true })
  $('#resetApi').addEventListener('click', () => { $('#apiInput').value = DEFAULT_API })
  $('#saveApi').addEventListener('click', () => {
    const v = $('#apiInput').value.trim()
    if (!/^https?:\/\//.test(v)) { toast('地址要以 http:// 或 https:// 开头', 'bad'); return }
    state.api = v
    localStorage.setItem(LS.api, v)
    modal.hidden = true
    state.token = null
    state.results = {}
    state.historyList = null
    toast('已切换接口地址，正在重连…')
    boot()
  })
}

async function probe() {
  const el = $('#brandStatus')
  el.className = 'brand-status'
  el.innerHTML = '<i class="dot"></i><em>连接中</em>'
  try {
    const res = await fetch(state.api.replace(/\/+$/, '') + '/health')
    const d = await res.json()
    const c = d.config || {}
    if (c.ai) {
      el.className = 'brand-status is-ok'
      el.innerHTML = '<i class="dot"></i><em>服务正常</em>'
    } else {
      el.className = 'brand-status is-bad'
      el.innerHTML = '<i class="dot"></i><em>AI 未配置</em>'
    }
  } catch {
    el.className = 'brand-status is-bad'
    el.innerHTML = '<i class="dot"></i><em>连不上服务</em>'
  }
}

async function boot() {
  paintAccount(false)
  probe()
  try {
    await ensureLogin(true)
  } catch (err) {
    toast('登录失败：' + err.message + '（AI 分析仍然可用，记录类功能需要登录）', 'bad', 6000)
  }
  render()
}

bind()
boot()
