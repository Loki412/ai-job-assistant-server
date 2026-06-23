import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

function font(bold) {
  return bold ? 'Chinese' : 'Chinese'
}

export function generateResumePdf(data) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffers = []
  doc.on('data', b => buffers.push(b))

  // Register Chinese font
  const candidates = [
    path.join(process.cwd(), 'fonts', 'simhei.ttf'),
    path.join(process.cwd(), 'fonts', 'NotoSansSC-Regular.ttf'),
    '/usr/share/fonts/truetype/noto/NotoSansSC-Regular.ttf',
    'C:\\Windows\\Fonts\\simhei.ttf'
  ]
  let found = false
  for (const fp of candidates) {
    if (fs.existsSync(fp)) {
      doc.registerFont('Chinese', fp)
      found = true
      break
    }
  }
  if (!found) {
    console.warn('No Chinese font found, PDF may show garbled text')
  }

  const { summary, education, experience, projects, skills, name } = data

  // Header
  doc.fontSize(24).font(font(true)).text(name || '个人简历', { align: 'center' })
  doc.moveDown(1.5)

  // Summary
  if (summary) {
    doc.fontSize(14).fillColor('#2979ff').font(font(true)).text('个人总结')
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor('#333333').font(font()).text(summary, { align: 'left' })
    doc.moveDown(1)
  }

  // Education
  if (education && education.length > 0) {
    doc.fontSize(14).fillColor('#2979ff').font(font(true)).text('教育背景')
    doc.moveDown(0.3)
    education.forEach(edu => {
      doc.fontSize(11).fillColor('#1a1a1a').font(font(true)).text(`${edu.school || ''} - ${edu.major || ''}`)
      doc.fontSize(10).fillColor('#666666').font(font()).text(`${edu.degree || ''} | ${edu.period || ''}`)
      doc.moveDown(0.5)
    })
    doc.moveDown(0.5)
  }

  // Experience
  if (experience && experience.length > 0) {
    doc.fontSize(14).fillColor('#2979ff').font(font(true)).text('工作经历')
    doc.moveDown(0.3)
    experience.forEach(exp => {
      doc.fontSize(11).fillColor('#1a1a1a').font(font(true)).text(`${exp.company || ''} - ${exp.role || ''}`)
      doc.fontSize(10).fillColor('#666666').font(font()).text(exp.period || '')
      doc.fontSize(10).fillColor('#333333').font(font()).text(exp.description || '')
      doc.moveDown(0.5)
    })
    doc.moveDown(0.5)
  }

  // Projects
  if (projects && projects.length > 0) {
    doc.fontSize(14).fillColor('#2979ff').font(font(true)).text('项目经历')
    doc.moveDown(0.3)
    projects.forEach(proj => {
      doc.fontSize(11).fillColor('#1a1a1a').font(font(true)).text(proj.name || '')
      doc.fontSize(10).fillColor('#666666').font(font()).text(`角色：${proj.role || ''}`)
      doc.fontSize(10).fillColor('#333333').font(font()).text(proj.description || '')
      if (proj.technologies && proj.technologies.length > 0) {
        doc.fontSize(10).fillColor('#666666').font(font()).text(`技术栈：${proj.technologies.join('、')}`)
      }
      doc.moveDown(0.5)
    })
    doc.moveDown(0.5)
  }

  // Skills
  if (skills && skills.length > 0) {
    doc.fontSize(14).fillColor('#2979ff').font(font(true)).text('技能')
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor('#333333').font(font()).text(skills.join('  |  '))
    doc.moveDown(0.5)
  }

  // Footer
  doc.fontSize(9).fillColor('#999999').font(font()).text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'center' })

  doc.end()

  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })
}
