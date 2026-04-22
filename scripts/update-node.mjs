import fs from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'

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

const email = env.TC_EMAIL
const password = env.TC_PASSWORD
const canvasId = args.canvas || env.TC_CANVAS_ID || 'main'
const ownerUid = args.owner || env.TC_OWNER_UID
const nodeId = args.node
const title = args.title
const content = args.content

if (!firebaseConfig.apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY in .env.local')
if (!email || !password) throw new Error('Missing TC_EMAIL / TC_PASSWORD')
if (!ownerUid) throw new Error('Missing TC_OWNER_UID or --owner')
if (!nodeId) throw new Error('Missing --node <nodeId>')
if (title == null && content == null) throw new Error('Provide --title and/or --content')

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
await signInWithEmailAndPassword(auth, email, password)

const user = auth.currentUser
if (!user) throw new Error('Firebase auth login failed, currentUser is null')

const db = getFirestore(app)
const ref = doc(db, 'users', ownerUid, 'canvases', canvasId)
const snapshot = await getDoc(ref)
if (!snapshot.exists()) throw new Error(`Canvas not found at users/${ownerUid}/canvases/${canvasId}`)

const record = snapshot.data()
const document = record.document
const nodes = document?.nodes || {}
const node = nodes[nodeId]
if (!node) throw new Error(`Node ${nodeId} not found`)

const updatedNode = {
  ...node,
  ...(title != null ? { title } : {}),
  ...(content != null ? { content } : {}),
  updatedAt: new Date().toISOString(),
}

const updatedDocument = {
  ...document,
  canvas: {
    ...document.canvas,
    updatedAt: new Date().toISOString(),
  },
  nodes: {
    ...nodes,
    [nodeId]: updatedNode,
  },
}

await setDoc(ref, {
  ...record,
  title: updatedDocument.canvas.title,
  document: updatedDocument,
  updatedAt: serverTimestamp(),
}, { merge: true })

console.log(JSON.stringify({
  ok: true,
  signedInUid: user.uid,
  ownerUid,
  canvasId,
  nodeId,
  updated: {
    title: updatedNode.title,
    content: updatedNode.content,
  },
}, null, 2))
