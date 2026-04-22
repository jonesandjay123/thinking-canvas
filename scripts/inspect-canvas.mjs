import fs from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

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

const fileEnv = loadEnvFile(new URL('../.env.local', import.meta.url))
const env = { ...fileEnv, ...process.env }

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
const query = env.TC_QUERY || process.argv[2] || '秋葉原'
const canvasId = env.TC_CANVAS_ID || process.argv[3] || 'main'
const ownerUid = env.TC_OWNER_UID || process.argv[4]

if (!firebaseConfig.apiKey) {
  throw new Error('Missing VITE_FIREBASE_API_KEY in .env.local')
}

if (!email || !password) {
  throw new Error('Missing TC_EMAIL / TC_PASSWORD. Export them before running this script.')
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
await signInWithEmailAndPassword(auth, email, password)

const user = auth.currentUser
if (!user) {
  throw new Error('Firebase auth login failed, currentUser is null')
}

const db = getFirestore(app)
const targetUid = ownerUid || user.uid
const snapshot = await getDoc(doc(db, 'users', targetUid, 'canvases', canvasId))
if (!snapshot.exists()) {
  throw new Error(`Canvas not found at users/${targetUid}/canvases/${canvasId}`)
}

const data = snapshot.data()
const document = data.document
const nodes = document?.nodes || {}
const target = Object.values(nodes).find((node) => {
  const title = typeof node.title === 'string' ? node.title : ''
  const content = typeof node.content === 'string' ? node.content : ''
  return title.includes(query) || content.includes(query)
})

if (!target) {
  console.log(JSON.stringify({ query, found: false }, null, 2))
  process.exit(0)
}

const path = []
let current = target
while (current) {
  path.unshift({
    id: current.id,
    title: current.title,
    content: current.content || '',
  })
  current = current.parentId ? nodes[current.parentId] : null
}

console.log(JSON.stringify({
  query,
  found: true,
  canvasId,
  signedInUid: user.uid,
  targetUid,
  target: {
    id: target.id,
    title: target.title,
    content: target.content || '',
    childIds: target.childIds || [],
    parentId: target.parentId || null,
  },
  path,
}, null, 2))
