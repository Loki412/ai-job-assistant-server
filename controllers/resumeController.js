import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { saveResume, listResumes, findResumeById, deleteResume, generateResume } from '../services/resumeService.js'
import { saveHistory } from '../services/historyService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(__dirname, '../uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('仅支持 PDF 和 DOCX 格式'))
  }
})

export { upload }

export async function uploadResume(req, res) {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件大小超过10MB限制' })
      }
      return res.status(400).json({ message: err.message || '上传失败' })
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择文件' })
    }

    try {
      const filePath = req.file.path
      const ext = path.extname(req.file.originalname).toLowerCase()
      let resumeText = ''

      if (ext === '.pdf') {
        const pdfBuffer = fs.readFileSync(filePath)
        const pdfData = await pdfParse(pdfBuffer)
        resumeText = pdfData.text
      } else if (ext === '.docx') {
        const docxBuffer = fs.readFileSync(filePath)
        const mammothResult = await mammoth.extractRawText({ buffer: docxBuffer })
        resumeText = mammothResult.value
      }

      const record = await saveResume(req.userId, req.file.originalname, resumeText)

      res.json({
        resumeId: record.id,
        resumeText: resumeText.slice(0, 2000)
      })
    } catch (err) {
      console.error('Upload error:', err)
      res.status(500).json({ message: '简历解析失败' })
    }
  })
}

export async function parseFile(req, res) {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件大小超过10MB限制' })
      }
      return res.status(400).json({ message: err.message || '解析失败' })
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择文件' })
    }

    try {
      const filePath = req.file.path
      const ext = path.extname(req.file.originalname).toLowerCase()
      let text = ''

      if (ext === '.pdf') {
        const pdfBuffer = fs.readFileSync(filePath)
        const pdfData = await pdfParse(pdfBuffer)
        text = pdfData.text
      } else if (ext === '.docx') {
        const docxBuffer = fs.readFileSync(filePath)
        const mammothResult = await mammoth.extractRawText({ buffer: docxBuffer })
        text = mammothResult.value
      } else {
        text = fs.readFileSync(filePath, 'utf-8')
      }

      fs.unlink(filePath, () => {})

      if (!text || text.trim().length < 50) {
        return res.json({ text: '', warning: '未从文件中提取到有效文本内容，可能是扫描件或图片PDF，请手动粘贴简历文字' })
      }

      res.json({ text })
    } catch (err) {
      console.error('Parse error:', err)
      res.status(500).json({ message: '文件解析失败: ' + err.message })
    }
  })
}

export async function saveResumeRecord(req, res) {
  const { resumeName, resumeContent } = req.body
  if (!resumeName || !resumeContent) {
    return res.status(400).json({ message: '缺少简历名称或内容' })
  }
  try {
    const record = await saveResume(req.userId, resumeName, resumeContent)
    res.json({ resumeId: record.id, message: '保存成功' })
  } catch (err) {
    console.error('Save resume error:', err)
    res.status(500).json({ message: '保存失败' })
  }
}

export async function listResumeRecords(req, res) {
  try {
    const list = await listResumes(req.userId)
    res.json({ list })
  } catch (err) {
    console.error('List resumes error:', err)
    res.status(500).json({ message: '查询失败' })
  }
}

export async function getResumeDetail(req, res) {
  try {
    const record = await findResumeById(req.params.id, req.userId)
    if (!record) return res.status(404).json({ message: '简历不存在' })
    res.json(record)
  } catch (err) {
    console.error('Get resume error:', err)
    res.status(500).json({ message: '查询失败' })
  }
}

export async function removeResume(req, res) {
  try {
    await deleteResume(req.params.id, req.userId)
    res.json({ message: '删除成功' })
  } catch (err) {
    console.error('Delete resume error:', err)
    res.status(500).json({ message: '删除失败' })
  }
}

export async function generateAiResume(req, res) {
  const { name, education, experience, projects, skills, targetRole } = req.body
  if (!name || !targetRole) {
    return res.status(400).json({ message: '缺少姓名或目标岗位' })
  }

  try {
    const result = await generateResume({ name, education, experience, projects, skills, targetRole })
    const resumeContent = JSON.stringify(result)
    const record = await saveResume(req.userId, `${name} - ${targetRole}简历`, resumeContent)
    await saveHistory(req.userId, 'resume', `生成简历 - ${targetRole}`, { resumeId: record.id, result })
    res.json({ resumeId: record.id, result })
  } catch (err) {
    console.error('Generate resume error:', err)
    res.status(500).json({ message: err.message || '生成失败' })
  }
}
