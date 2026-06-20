import OpenAI from 'openai'
import config from '../config/index.js'

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL
})

export async function chatCompletion(prompt) {
  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2048
  })

  return completion.choices[0].message.content
}

export function extractJson(text) {
  try { return JSON.parse(text) } catch {}
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch {}
  }
  const arrMatch = text.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch {}
  }
  const cleaned = text
    .replace(/(['"])?([a-zA-Z_]\w*)(['"])?:/g, '"$2":')
    .replace(/,(\s*[}\]])/g, '$1')
  try { return JSON.parse(cleaned) } catch {}
  throw new Error('AI返回格式异常')
}
