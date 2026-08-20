/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PARTITION: string
  readonly VITE_SSO_HOST: string
  readonly VITE_AUTH_SERVICE_HOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
