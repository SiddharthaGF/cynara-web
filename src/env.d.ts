declare namespace Cloudflare {
  interface Env {
    VITE_API_ORIGIN: string;
    VITE_HOSPITAL_CODE: string;
    APP_ENV?: string;
    // CYN-96 disposable auth spike. These server-only values are read by the
    // SSR worker (src/server/env.ts). They never reach the client bundle.
    AUTH_MODE?: string;
    IDENTITY_ORIGIN?: string;
    AUTH_SESSION_SECRET?: string;
    AUTH_CLIENT_ID?: string;
    AUTH_CLIENT_SECRET?: string;
    AUTH_SCOPES?: string;
  }
}
