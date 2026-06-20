import { supabaseClient } from '../config/supabase.js'
import { userService as local } from './localStore.js'

export async function findByOpenid(openid) {
  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  } catch {
    return local.findByOpenid(openid)
  }
}

export async function createUser(openid) {
  try {
    const nickname = `用户${openid.slice(-6)}`
    const { data, error } = await supabaseClient
      .from('users')
      .insert({ openid, nickname, avatar: '' })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return local.createUser(openid)
  }
}
