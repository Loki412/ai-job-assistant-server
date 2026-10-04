import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Resume -> PDF renderer.
 *
 * Two things this module deliberately handles defensively, because the values
 * come from an LLM and its shape is not guaranteed:
 *
 * 1. Field-shape drift. The prompt in services/resumeService.js asks for
 *    `experience[].items` (array) and `skills` (object of arrays), but this
 *    renderer used to read `experience[].description` (string) and treat
 *    `skills` as an array. `skills.length` is undefined on an object, so the
 *    skills block was skipped entirely, and `exp.description` was undefined so
 *    every bullet came out blank. Both are now normalised.
 *
 * 2. Font discovery. `process.cwd()` was used to locate fonts, so starting the
 *    server from any directory other than the project root silently lost the
 *    font. Paths are now resolved relative to this file.
 */

// Resolved from the module location, not the launch directory.
const FONT_CANDIDATES = [
  path.resolve(__dirname, '../fonts/simhei.ttf'),
  path.resolve(__dirname, '../fonts/NotoSansSC-Regular.ttf'),
  '/usr/share/fonts/truetype/noto/NotoSansSC-Regular.ttf',
  'C:\\Windows\\Fonts\\simhei.ttf'
]

const FONT_NAME = 'Chinese'

function registerChineseFont(doc) {
  for (const candidate of FONT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      doc.registerFont(FONT_NAME, candidate)
      return candidate
    }
  }
  // Without a CJK font pdfkit falls back to a Latin-only face and every Chinese
  // character renders as a blank box — a corrupt-looking document. Failing loudly
  // is far easier to diagnose than a silently garbled PDF.
  throw new Error(
    `PDF 中文字体缺失，已尝试：${FONT_CANDIDATES.join(', ')}。` +
    '请确认 fonts/simhei.ttf 已随项目一起部署。'
  )
}

/**
 * Accepts a string, an array of strings, or an object mapping a label to an
 * array of strings, and flattens it into printable lines.
 */
function toLines(value) {
  if (!value) return []

  if (typeof value === 'string') {
    return value.split('\n').map(s => s.trim()).filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value
      .flatMap(item => (typeof item === 'string' ? item.split('\n') : [String(item)]))
      .map(s => s.trim())
      .filter(Boolean)
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([label, items]) => {
      const lines = toLines(items)
      return lines.length ? [`${label}：${lines.join('、')}`] : []
    })
  }

  return [String(value)]
}

/** Pick the first non-empty field among several possible names. */
function firstOf(source, ...keys) {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

export function generateResumePdf(data) {
  return new Promise((resolve, reject) => {
    let doc
    try {
      doc = new PDFDocument({ size: 'A4', margin: 50 })
      registerChineseFont(doc)
    } catch (err) {
      // Setup failed before any streaming started — reject without a dangling doc.
      reject(err)
      return
    }

    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    // Attach both handlers BEFORE doc.end() so an early failure cannot escape as
    // an unhandled 'error' event (the old code resolved on 'end' only).
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const { summary, education, experience, projects, skills, name } = data

    const heading = (text) => {
      doc.fontSize(14).fillColor('#2979ff').font(FONT_NAME).text(text)
      doc.moveDown(0.3)
    }

    // Header
    doc.fontSize(24).fillColor('#1a1a1a').font(FONT_NAME).text(name || '个人简历', { align: 'center' })
    doc.moveDown(1.5)

    if (summary) {
      heading('个人总结')
      doc.fontSize(11).fillColor('#333333').font(FONT_NAME).text(summary)
      doc.moveDown(1)
    }

    if (Array.isArray(education) && education.length > 0) {
      heading('教育背景')
      education.forEach(edu => {
        doc.fontSize(11).fillColor('#1a1a1a').font(FONT_NAME).text(`${edu.school || ''} - ${edu.major || ''}`)
        const meta = [edu.degree, edu.period, edu.gpa].filter(Boolean).join(' | ')
        if (meta) doc.fontSize(10).fillColor('#666666').font(FONT_NAME).text(meta)
        toLines(edu.honors).forEach(line => {
          doc.fontSize(10).fillColor('#666666').font(FONT_NAME).text(`- ${line}`, { indent: 10 })
        })
        doc.moveDown(0.5)
      })
      doc.moveDown(0.5)
    }

    if (Array.isArray(experience) && experience.length > 0) {
      heading('工作经历')
      experience.forEach(exp => {
        doc.fontSize(11).fillColor('#1a1a1a').font(FONT_NAME).text(`${exp.company || ''} - ${exp.role || ''}`)
        if (exp.period) doc.fontSize(10).fillColor('#666666').font(FONT_NAME).text(exp.period)

        // The model returns `items` (array); older records may carry `description`.
        const lines = toLines(firstOf(exp, 'items', 'description', 'desc'))
        lines.forEach(line => {
          doc.fontSize(10).fillColor('#333333').font(FONT_NAME).text(`- ${line}`, { indent: 10 })
        })
        doc.moveDown(0.5)
      })
      doc.moveDown(0.5)
    }

    if (Array.isArray(projects) && projects.length > 0) {
      heading('项目经历')
      projects.forEach(proj => {
        doc.fontSize(11).fillColor('#1a1a1a').font(FONT_NAME).text(proj.name || '')
        const meta = [proj.role && `角色：${proj.role}`, proj.period].filter(Boolean).join(' | ')
        if (meta) doc.fontSize(10).fillColor('#666666').font(FONT_NAME).text(meta)

        // `desc` is what the prompt asks for; accept `description` too.
        toLines(firstOf(proj, 'desc', 'description', 'items')).forEach(line => {
          doc.fontSize(10).fillColor('#333333').font(FONT_NAME).text(`- ${line}`, { indent: 10 })
        })

        const tech = toLines(proj.technologies)
        if (tech.length) {
          doc.fontSize(10).fillColor('#666666').font(FONT_NAME).text(`技术栈：${tech.join('、')}`)
        }
        doc.moveDown(0.5)
      })
      doc.moveDown(0.5)
    }

    // `skills` arrives either as an array or as { label: [...] } — handle both.
    const skillLines = toLines(skills)
    if (skillLines.length > 0) {
      heading('技能')
      skillLines.forEach(line => {
        doc.fontSize(11).fillColor('#333333').font(FONT_NAME).text(line)
      })
      doc.moveDown(0.5)
    }

    doc.fontSize(9).fillColor('#999999').font(FONT_NAME)
      .text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'center' })

    doc.end()
  })
}
