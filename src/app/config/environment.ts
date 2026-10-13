/** The only module that reads `import.meta.env`. Everything else imports from here. */

/** Base URL of the Mavera API; undefined falls back to same-origin relative requests. */
export const apiBaseUrl: string | undefined = import.meta.env.VITE_API_URL;

/** True under `vite dev` and Vitest (both set DEV); compiled to a literal in production builds. */
export const isDevelopment: boolean = import.meta.env.DEV;

/** "development" under `vite dev`, "test" under Vitest, "production" in a build. */
export const buildMode: string = import.meta.env.MODE;
