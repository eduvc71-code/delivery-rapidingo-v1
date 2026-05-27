// Removed the failing reference to "vite/client" to resolve the "Cannot find type definition file" error.
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}

// Removed the explicit 'process' variable declaration to fix the "Cannot redeclare block-scoped variable" error.
// The 'process' global is correctly typed through the NodeJS namespace augmentation above.
