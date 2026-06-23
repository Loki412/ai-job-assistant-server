import { generateResumePdf } from '../services/pdfService.js'

export async function exportResumePdf(req, res) {
  let data = req.body?.data

  // formData sends strings, parse if needed
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch {}
  }

  if (!data || !data.name) {
    return res.status(400).json({ message: '缺少简历数据' })
  }

  try {
    const buffer = await generateResumePdf(data)
    const name = encodeURIComponent(data.name || 'resume')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${name}.pdf"`)
    res.send(buffer)
  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ message: 'PDF生成失败' })
  }
}
