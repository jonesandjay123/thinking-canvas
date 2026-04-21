/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_GEMINI_MODEL?: string
  readonly VITE_USE_FUNCTIONS_EMULATOR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
