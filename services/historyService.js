import { supabaseClient } from '../config/supabase.js'
import { historyService as local } from './localStore.js'
import { withStore } from './store.js'

export async function saveHistory(userId, type, title, content, project) {
  return withStore(
    'historyService.saveHistory',
    async () => {
      const { data, error } = await supabaseClient
        .from('history_records')
        .insert({ user_id: userId, type, title, project: project || '', content })
        .select()
        .single()
      if (error) throw error
      return data
    },
    () => local.saveHistory(userId, type, title, content, project)
  )
}

export async function listHistory(userId, type, project) {
  return withStore(
    'historyService.listHistory',
    async () => {
      let query = supabaseClient
        .from('history_records')
        .select('id, type, title, project, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (type && type !== 'all') {
        query = query.eq('type', type)
      }
      if (project) {
        query = query.eq('project', project)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    () => local.listHistory(userId, type, project)
  )
}

export async function listProjects(userId) {
  return withStore(
    'historyService.listProjects',
    async () => {
      const { data, error } = await supabaseClient
        .from('history_records')
        .select('project, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error

      const map = {}
      ;(data || []).forEach(r => {
        const name = r.project || '未分组'
        if (!map[name]) map[name] = { project: name, count: 0, lastTime: r.created_at }
        map[name].count++
        if (r.created_at > map[name].lastTime) map[name].lastTime = r.created_at
      })
      return Object.values(map).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
    },
    () => local.listProjects(userId)
  )
}

export async function findHistoryById(id, userId) {
  return withStore(
    'historyService.findHistoryById',
    async () => {
      const { data, error } = await supabaseClient
        .from('history_records')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    () => local.findHistoryById(id, userId)
  )
}

export async function deleteHistory(id, userId) {
  return withStore(
    'historyService.deleteHistory',
    async () => {
      const { error } = await supabaseClient
        .from('history_records')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (error) throw error
    },
    () => local.deleteHistory(id, userId)
  )
}
