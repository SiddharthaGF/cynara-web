declare namespace Cloudflare {
  interface Env {
    VITE_API_ORIGIN: string;
    VITE_HOSPITAL_CODE: string;
    APP_ORIGIN?: string;
    APP_ENV?: string;
    // These server-only values are read by the SSR worker and never reach the client bundle.
    IDENTITY_ORIGIN?: string;
    AUTH_SESSION_SECRET?: string;
    AUTH_CLIENT_ID?: string;
    AUTH_CLIENT_SECRET?: string;
    AUTH_SCOPES?: string;
  }
}
