import { listHistory, findHistoryById, deleteHistory, saveHistory, listProjects } from '../services/historyService.js'

export async function saveHistoryRecord(req, res) {
  const { type, title, content, project } = req.body
  if (!type || !title) {
    return res.status(400).json({ message: '缺少类型或标题' })
  }
  try {
    const record = await saveHistory(req.userId, type, title, content || {}, project || '')
    res.json({ historyId: record.id, message: '保存成功' })
  } catch (err) {
    console.error('Save history error:', err)
    res.status(500).json({ message: '保存失败' })
  }
}

export async function listHistoryRecords(req, res) {
  const { type, project } = req.query
  try {
    const list = await listHistory(req.userId, type, project)
    res.json({ list })
  } catch (err) {
    console.error('List history error:', err)
    res.status(500).json({ message: '查询失败' })
  }
}

export async function listProjectGroups(req, res) {
  try {
    const projects = await listProjects(req.userId)
    res.json({ projects })
  } catch (err) {
    console.error('List projects error:', err)
    res.status(500).json({ message: '查询失败' })
  }
}

export async function getHistoryDetail(req, res) {
  try {
    const record = await findHistoryById(req.params.id, req.userId)
    if (!record) return res.status(404).json({ message: '记录不存在' })
    res.json(record)
  } catch (err) {
    console.error('Get history error:', err)
    res.status(500).json({ message: '查询失败' })
  }
}

export async function removeHistory(req, res) {
  try {
    await deleteHistory(req.params.id, req.userId)
    res.json({ message: '删除成功' })
  } catch (err) {
    console.error('Delete history error:', err)
    res.status(500).json({ message: '删除失败' })
  }
}
