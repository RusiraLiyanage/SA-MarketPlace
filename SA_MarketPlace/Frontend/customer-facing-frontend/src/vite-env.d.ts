/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    /** The customer API, including its version prefix. Defaults to the local backend. */
    readonly VITE_API_URL?: string
  }
}

export {}
