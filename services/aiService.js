import OpenAI from 'openai'
import config from '../config/index.js'

/**
 * DeepSeek (OpenAI-compatible) gateway.
 *
 * The previous version constructed the OpenAI client at module load with
 * `apiKey: undefined` whenever DEEPSEEK_API_KEY was unset, which throws inside
 * the SDK and takes the whole process down at import time. The client is now
 * built lazily and `chatCompletion` raises a readable error instead — the
 * server keeps serving every non-AI endpoint.
 */

const REQUEST_TIMEOUT_MS = 60_000

let client = null

export function isAiConfigured() {
  const key = config.deepseek.apiKey
  return Boolean(key) && !key.startsWith('your_')
}

function getClient() {
  if (!isAiConfigured()) {
    throw new Error('AI 服务未配置：请在环境变量中设置 DEEPSEEK_API_KEY')
  }
  if (!client) {
    client = new OpenAI({
      apiKey: config.deepseek.apiKey,
      baseURL: config.deepseek.baseURL,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 2
    })
  }
  return client
}

export async function chatCompletion(prompt, { temperature = 0.7, maxTokens = 2048 } = {}) {
  const completion = await getClient().chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens
  })

  const content = completion.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回内容为空')
  return content
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

  // Last resort: quote bare keys and drop trailing commas, then retry.
  const cleaned = text
    .replace(/(['"])?([a-zA-Z_]\w*)(['"])?:/g, '"$2":')
    .replace(/,(\s*[}\]])/g, '$1')
  try { return JSON.parse(cleaned) } catch {}

  throw new Error('AI返回格式异常')
}

/** Convenience wrapper: run a prompt that must return JSON. */
export async function chatJson(prompt, options) {
  return extractJson(await chatCompletion(prompt, options))
}
