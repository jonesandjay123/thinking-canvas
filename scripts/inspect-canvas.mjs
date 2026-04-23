import fs from 'node:fs'

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

const query = env.TC_QUERY || process.argv[2] || '秋葉原'
const canvasId = env.TC_CANVAS_ID || process.argv[3] || 'main'
const ownerUid = env.TC_OWNER_UID || process.argv[4]

if (!ownerUid) {
  throw new Error('Missing TC_OWNER_UID or argv[4]. This script is now documentation-only until read access is reintroduced through a new backend path.')
}

console.log(JSON.stringify({
  ok: false,
  query,
  canvasId,
  ownerUid,
  message: 'Email/password read path has been retired. Next step: add a dedicated Jarvis read/query function instead of direct Firebase Auth login.',
}, null, 2))
