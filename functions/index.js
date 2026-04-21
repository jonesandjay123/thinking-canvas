const { GoogleGenAI } = require('@google/genai')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')

admin.initializeApp()

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const DEFAULT_MODEL = 'gemini-2.5-flash'

function normalizeNodeContext(input) {
  if (!input || typeof input !== 'object') {
    throw new HttpsError('invalid-argument', '缺少節點內容。')
  }

  const count = Math.min(5, Math.max(1, Number(input.count) || 3))
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const content = typeof input.content === 'string' ? input.content.trim() : ''
  const path = Array.isArray(input.path) ? input.path.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : []
  const existingChildren = Array.isArray(input.existingChildren)
    ? input.existingChildren.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
  const treeContext = typeof input.treeContext === 'string' ? input.treeContext.trim() : ''
  const model = typeof input.model === 'string' && input.model.trim() ? input.model.trim() : DEFAULT_MODEL

  if (!title) {
    throw new HttpsError('invalid-argument', '節點標題不可為空。')
  }

  return {
    count,
    title,
    content,
    path,
    existingChildren,
    treeContext,
    model,
  }
}

function buildPrompt(context) {
  return `你是一個協助發散思考的助手。

目前整張思考畫布如下：
${context.treeContext || '（無完整畫布內容）'}

現在要展開的節點是：${context.title}
節點補充內容：${context.content || '（無）'}
從 root 到目前節點的路徑：${context.path.join(' → ') || context.title}
目前已存在的子節點：${context.existingChildren.join('、') || '（無）'}

請根據整體脈絡，為這個節點提供 ${context.count} 個適合新增的子節點標題。
要求：
1. 使用繁體中文
2. 不要和現有子節點重複
3. 每個建議都要簡潔，適合直接當成節點標題
4. 回傳純 JSON array，例如：["方向一", "方向二"]
5. 不要回傳任何額外說明文字。`
}

function parseSuggestions(rawText, count) {
  const jsonMatch = rawText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new HttpsError('internal', 'Gemini 回傳格式無法解析。')
  }

  let parsed
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (error) {
    throw new HttpsError('internal', 'Gemini 回傳不是合法 JSON。')
  }

  if (!Array.isArray(parsed)) {
    throw new HttpsError('internal', 'Gemini 回傳不是陣列格式。')
  }

  return parsed.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, count)
}

exports.generateNodeIdeas = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '請先登入後再使用 AI 展開。')
    }

    const context = normalizeNodeContext(request.data)
    const apiKey = GEMINI_API_KEY.value()

    if (!apiKey) {
      logger.error('GEMINI_API_KEY secret is missing')
      throw new HttpsError('failed-precondition', '伺服器尚未設定 Gemini secret。')
    }

    try {
      const ai = new GoogleGenAI({ apiKey })
      const response = await ai.models.generateContent({
        model: context.model,
        contents: buildPrompt(context),
      })

      const rawText = response.text || ''
      const suggestions = parseSuggestions(rawText, context.count)

      return {
        suggestions,
        model: context.model,
      }
    } catch (error) {
      logger.error('generateNodeIdeas failed', error)
      if (error instanceof HttpsError) {
        throw error
      }
      throw new HttpsError('internal', 'Gemini 產生建議失敗，請稍後再試。')
    }
  },
)
