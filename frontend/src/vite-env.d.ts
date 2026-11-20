/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_MEDIA_BASE_URL?: string;
  readonly VITE_CONTENT_PROFILE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
