/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly API_ORIGIN?: string;
  readonly VITE_HOSPITAL_CODE?: string;
  readonly APP_ENV?: string;
  // CYN-96 disposable auth spike: client-side mirror of AUTH_MODE.
  // Hooks pick the BFF adapter only in spike mode.
  readonly VITE_AUTH_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css?url' {
  const href: string;
  export default href;
}

export const viteEnvModuleMarker = null;
