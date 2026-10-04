import { supabaseClient } from '../config/supabase.js'
import { userService as local } from './localStore.js'
import { withStore } from './store.js'

export async function findByOpenid(openid) {
  return withStore(
    'userService.findByOpenid',
    async () => {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('openid', openid)
        .maybeSingle()
      // maybeSingle() returns null data (no error) when nothing matches, which is
      // the "user does not exist yet" case the caller relies on.
      if (error) throw error
      return data
    },
    () => local.findByOpenid(openid)
  )
}

export async function createUser(openid) {
  return withStore(
    'userService.createUser',
    async () => {
      const nickname = `用户${openid.slice(-6)}`
      const { data, error } = await supabaseClient
        .from('users')
        .insert({ openid, nickname, avatar: '' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    () => local.createUser(openid)
  )
}
