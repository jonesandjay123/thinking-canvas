const crypto = require('node:crypto')
const { GoogleGenAI } = require('@google/genai')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const JARVIS_SHARED_SECRET = defineSecret('JARVIS_SHARED_SECRET')
const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_CANVAS_ID = 'main'
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503])
const MAX_RETRY_ATTEMPTS = 3

function timingSafeEqualString(a, b) {
  const aBuf = Buffer.from(String(a || ''))
  const bBuf = Buffer.from(String(b || ''))

  if (aBuf.length !== bBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(aBuf, bBuf)
}

function requireJarvisSecret(request) {
  const expected = JARVIS_SHARED_SECRET.value()
  const provided = request.data && typeof request.data.jarvisSecret === 'string'
    ? request.data.jarvisSecret
    : ''

  if (!expected) {
    logger.error('JARVIS_SHARED_SECRET secret is missing')
    throw new HttpsError('failed-precondition', '伺服器尚未設定 Jarvis secret。')
  }

  if (!provided || !timingSafeEqualString(provided, expected)) {
    throw new HttpsError('permission-denied', 'Jarvis 寫入驗證失敗。')
  }
}

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
  const siblingNodes = Array.isArray(input.siblingNodes)
    ? input.siblingNodes
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          title: typeof item.title === 'string' ? item.title.trim() : '',
          content: typeof item.content === 'string' ? item.content.trim() : '',
        }))
        .filter((item) => item.title)
        .slice(0, 12)
    : []
  const parentNode = input.parentNode && typeof input.parentNode === 'object'
    ? {
        title: typeof input.parentNode.title === 'string' ? input.parentNode.title.trim() : '',
        content: typeof input.parentNode.content === 'string' ? input.parentNode.content.trim() : '',
      }
    : null
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
    siblingNodes,
    parentNode: parentNode && parentNode.title ? parentNode : null,
    treeContext,
    model,
  }
}

function buildPrompt(context) {
  const siblingText = context.siblingNodes.length
    ? context.siblingNodes.map((item, index) => `${index + 1}. ${item.title}${item.content ? `: ${item.content}` : ''}`).join('\n')
    : '（無）'

  const parentText = context.parentNode
    ? `${context.parentNode.title}${context.parentNode.content ? `: ${context.parentNode.content}` : ''}`
    : '（無）'

  return `你是一個協助發散思考的助手。

目前整張思考畫布如下：
${context.treeContext || '（無完整畫布內容）'}

現在要展開的節點是：${context.title}
節點補充內容：${context.content || '（無）'}
父節點：${parentText}
從 root 到目前節點的路徑：${context.path.join(' → ') || context.title}
目前已存在的子節點：${context.existingChildren.join('、') || '（無）'}
同層 sibling 節點：
${siblingText}

請根據整體脈絡，為這個節點提供 ${context.count} 個適合新增的子節點標題。
要求：
1. 使用繁體中文
2. 不要和現有子節點重複
3. 盡量避免和 sibling 節點語意重複，並延續目前畫布的分類粒度與語氣
4. 每個建議都要簡潔，適合直接當成節點標題
5. 回傳純 JSON array，例如：["方向一", "方向二"]
6. 不要回傳任何額外說明文字。`
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorStatusCode(error) {
  if (!error || typeof error !== 'object') return null
  if (typeof error.status === 'number') return error.status
  if (typeof error.code === 'number') return error.code
  if (error.error && typeof error.error === 'object') {
    if (typeof error.error.code === 'number') return error.error.code
  }
  return null
}

function isRetryableGeminiError(error) {
  const status = getErrorStatusCode(error)
  return status !== null && RETRYABLE_STATUS_CODES.has(status)
}

function toClientFacingGeminiError(error) {
  const status = getErrorStatusCode(error)

  if (status === 429 || status === 503) {
    return new HttpsError('unavailable', 'Gemini 目前較忙，請稍後再試。')
  }

  return new HttpsError('internal', 'Gemini 產生建議失敗，請稍後再試。')
}

async function generateSuggestionsWithRetry(ai, context) {
  let lastError = null

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: context.model,
        contents: buildPrompt(context),
      })

      const rawText = response.text || ''
      const suggestions = parseSuggestions(rawText, context.count)

      return {
        suggestions,
        attempts: attempt,
      }
    } catch (error) {
      lastError = error
      const retryable = isRetryableGeminiError(error)

      logger.error('generateNodeIdeas Gemini attempt failed', {
        attempt,
        retryable,
        status: getErrorStatusCode(error),
        message: error instanceof Error ? error.message : String(error),
      })

      if (!retryable || attempt === MAX_RETRY_ATTEMPTS) {
        break
      }

      await sleep(600 * 2 ** (attempt - 1))
    }
  }

  throw lastError
}

function normalizeJarvisUpdateNodeInput(input) {
  if (!input || typeof input !== 'object') {
    throw new HttpsError('invalid-argument', '缺少更新參數。')
  }

  const ownerUid = typeof input.ownerUid === 'string' ? input.ownerUid.trim() : ''
  const canvasId = typeof input.canvasId === 'string' && input.canvasId.trim() ? input.canvasId.trim() : DEFAULT_CANVAS_ID
  const nodeId = typeof input.nodeId === 'string' ? input.nodeId.trim() : ''
  const title = typeof input.title === 'string' ? input.title : undefined
  const content = typeof input.content === 'string' ? input.content : undefined

  if (!ownerUid) {
    throw new HttpsError('invalid-argument', '缺少 ownerUid。')
  }

  if (!nodeId) {
    throw new HttpsError('invalid-argument', '缺少 nodeId。')
  }

  if (title == null && content == null) {
    throw new HttpsError('invalid-argument', '至少要提供 title 或 content 其中一個欄位。')
  }

  return {
    ownerUid,
    canvasId,
    nodeId,
    title,
    content,
  }
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

function normalizeJarvisCreateChildNodeInput(input) {
  if (!input || typeof input !== 'object') {
    throw new HttpsError('invalid-argument', '缺少新增節點參數。')
  }

  const ownerUid = typeof input.ownerUid === 'string' ? input.ownerUid.trim() : ''
  const canvasId = typeof input.canvasId === 'string' && input.canvasId.trim() ? input.canvasId.trim() : DEFAULT_CANVAS_ID
  const parentId = typeof input.parentId === 'string' ? input.parentId.trim() : ''
  const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'New Node'
  const content = typeof input.content === 'string' ? input.content : ''
  const type = typeof input.type === 'string' && ['root', 'idea', 'project', 'principle', 'note'].includes(input.type)
    ? input.type
    : 'note'

  if (!ownerUid) {
    throw new HttpsError('invalid-argument', '缺少 ownerUid。')
  }

  if (!parentId) {
    throw new HttpsError('invalid-argument', '缺少 parentId。')
  }

  return {
    ownerUid,
    canvasId,
    parentId,
    title,
    content,
    type,
  }
}

exports.generateNodeIdeas = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    const context = normalizeNodeContext(request.data)
    const apiKey = GEMINI_API_KEY.value()

    if (!apiKey) {
      logger.error('GEMINI_API_KEY secret is missing')
      throw new HttpsError('failed-precondition', '伺服器尚未設定 Gemini secret。')
    }

    try {
      const ai = new GoogleGenAI({ apiKey })
      const { suggestions, attempts } = await generateSuggestionsWithRetry(ai, context)

      return {
        suggestions,
        model: context.model,
        attempts,
      }
    } catch (error) {
      logger.error('generateNodeIdeas failed', error)
      if (error instanceof HttpsError) {
        throw error
      }
      throw toClientFacingGeminiError(error)
    }
  },
)

exports.jarvisUpdateNode = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [JARVIS_SHARED_SECRET],
  },
  async (request) => {
    requireJarvisSecret(request)
    const input = normalizeJarvisUpdateNodeInput(request.data)
    const ref = db.doc(`users/${input.ownerUid}/canvases/${input.canvasId}`)
    const snapshot = await ref.get()

    if (!snapshot.exists) {
      throw new HttpsError('not-found', `Canvas 不存在：users/${input.ownerUid}/canvases/${input.canvasId}`)
    }

    const record = snapshot.data() || {}
    const document = record.document
    const nodes = document && document.nodes && typeof document.nodes === 'object' ? document.nodes : null

    if (!document || !document.canvas || !nodes) {
      throw new HttpsError('failed-precondition', 'Canvas document 結構不合法。')
    }

    const node = nodes[input.nodeId]
    if (!node || typeof node !== 'object') {
      throw new HttpsError('not-found', `Node 不存在：${input.nodeId}`)
    }

    const nowIso = new Date().toISOString()
    const updatedNode = {
      ...node,
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.content != null ? { content: input.content } : {}),
      updatedAt: nowIso,
    }

    const updatedDocument = {
      ...document,
      canvas: {
        ...document.canvas,
        updatedAt: nowIso,
      },
      nodes: {
        ...nodes,
        [input.nodeId]: updatedNode,
      },
    }

    const actorMetadata = {
      updatedByType: 'jarvis',
      updatedByLabel: 'jarvis',
      updatedBySource: 'jarvisUpdateNode',
      updatedByOwnerUid: input.ownerUid,
      updatedByAt: nowIso,
    }

    await ref.set(
      {
        ...record,
        ...actorMetadata,
        title: updatedDocument.canvas.title,
        document: updatedDocument,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    logger.info('jarvisUpdateNode success', {
      ownerUid: input.ownerUid,
      canvasId: input.canvasId,
      nodeId: input.nodeId,
      updatedFields: {
        title: input.title != null,
        content: input.content != null,
      },
    })

    return {
      ok: true,
      ownerUid: input.ownerUid,
      canvasId: input.canvasId,
      nodeId: input.nodeId,
      updated: {
        title: updatedNode.title,
        content: updatedNode.content,
      },
      actor: {
        type: 'jarvis',
        label: 'jarvis',
        source: 'jarvisUpdateNode',
        at: nowIso,
      },
      updatedAt: nowIso,
    }
  },
)

exports.jarvisCreateChildNode = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [JARVIS_SHARED_SECRET],
  },
  async (request) => {
    requireJarvisSecret(request)
    const input = normalizeJarvisCreateChildNodeInput(request.data)
    const ref = db.doc(`users/${input.ownerUid}/canvases/${input.canvasId}`)
    const snapshot = await ref.get()

    if (!snapshot.exists) {
      throw new HttpsError('not-found', `Canvas 不存在：users/${input.ownerUid}/canvases/${input.canvasId}`)
    }

    const record = snapshot.data() || {}
    const document = record.document
    const nodes = document && document.nodes && typeof document.nodes === 'object' ? document.nodes : null

    if (!document || !document.canvas || !nodes) {
      throw new HttpsError('failed-precondition', 'Canvas document 結構不合法。')
    }

    const parent = nodes[input.parentId]
    if (!parent || typeof parent !== 'object') {
      throw new HttpsError('not-found', `Parent node 不存在：${input.parentId}`)
    }

    const nowIso = new Date().toISOString()
    const childIndex = Array.isArray(parent.childIds) ? parent.childIds.length : 0
    const id = createId()
    const newNode = {
      id,
      canvasId: document.canvas.id,
      title: input.title,
      content: input.content,
      childIds: [],
      parentId: input.parentId,
      links: [],
      tags: [],
      type: input.type,
      position: {
        x: Number(parent.position?.x || 0) + childIndex * 220 - Math.max(0, childIndex - 1) * 110,
        y: Number(parent.position?.y || 0) + 220,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const updatedParent = {
      ...parent,
      childIds: [...(Array.isArray(parent.childIds) ? parent.childIds : []), id],
      updatedAt: nowIso,
    }

    const updatedDocument = {
      ...document,
      canvas: {
        ...document.canvas,
        updatedAt: nowIso,
      },
      nodes: {
        ...nodes,
        [input.parentId]: updatedParent,
        [id]: newNode,
      },
    }

    const actorMetadata = {
      updatedByType: 'jarvis',
      updatedByLabel: 'jarvis',
      updatedBySource: 'jarvisCreateChildNode',
      updatedByOwnerUid: input.ownerUid,
      updatedByAt: nowIso,
    }

    await ref.set(
      {
        ...record,
        ...actorMetadata,
        title: updatedDocument.canvas.title,
        document: updatedDocument,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    logger.info('jarvisCreateChildNode success', {
      ownerUid: input.ownerUid,
      canvasId: input.canvasId,
      parentId: input.parentId,
      nodeId: id,
      type: input.type,
    })

    return {
      ok: true,
      ownerUid: input.ownerUid,
      canvasId: input.canvasId,
      parentId: input.parentId,
      node: newNode,
      actor: {
        type: 'jarvis',
        label: 'jarvis',
        source: 'jarvisCreateChildNode',
        at: nowIso,
      },
      updatedAt: nowIso,
    }
  },
)
