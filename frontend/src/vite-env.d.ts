/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPLICATION_ID: string;
  readonly VITE_LINERA_FAUCET_URL: string;
  readonly VITE_DYNAMIC_ENVIRONMENT_ID: string;
  readonly VITE_GRID_WIDTH: string;
  readonly VITE_GRID_HEIGHT: string;
  readonly VITE_COMMIT_TIMEOUT_MS: string;
  readonly VITE_REVEAL_TIMEOUT_MS: string;
  readonly VITE_COUNTDOWN_SECONDS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
