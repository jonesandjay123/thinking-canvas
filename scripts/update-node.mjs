import fs from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {}
  return Object.fromEntries(
    fs.readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      }),
  )
}

function parseArgs(argv) {
  const result = {}
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    if (!current.startsWith('--')) continue
    const key = current.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = 'true'
      continue
    }
    result[key] = next
    i += 1
  }
  return result
}

const fileEnv = loadEnvFile(new URL('../.env.local', import.meta.url))
const env = { ...fileEnv, ...process.env }
const args = parseArgs(process.argv.slice(2))

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: 'thinking-canvas.firebaseapp.com',
  projectId: 'thinking-canvas',
  storageBucket: 'thinking-canvas.firebasestorage.app',
  messagingSenderId: '123090202508',
  appId: '1:123090202508:web:4356079d6fe84af36870a9',
}

const ownerUid = args.owner || env.TC_OWNER_UID
const canvasId = args.canvas || env.TC_CANVAS_ID || 'main'
const nodeId = args.node
const title = args.title
const content = args.content
const jarvisSecret = env.TC_JARVIS_SHARED_SECRET

if (!firebaseConfig.apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY in .env.local')
if (!ownerUid) throw new Error('Missing TC_OWNER_UID or --owner')
if (!nodeId) throw new Error('Missing --node <nodeId>')
if (title == null && content == null) throw new Error('Provide --title and/or --content')
if (!jarvisSecret) throw new Error('Missing TC_JARVIS_SHARED_SECRET')

const app = initializeApp(firebaseConfig)
const functions = getFunctions(app, 'us-central1')
const jarvisUpdateNode = httpsCallable(functions, 'jarvisUpdateNode')

const result = await jarvisUpdateNode({
  jarvisSecret,
  ownerUid,
  canvasId,
  nodeId,
  ...(title != null ? { title } : {}),
  ...(content != null ? { content } : {}),
})

console.log(JSON.stringify(result.data, null, 2))
