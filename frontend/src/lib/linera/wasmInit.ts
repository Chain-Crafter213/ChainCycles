// WASM Initialization Helper
// Ensures @linera/client WASM is loaded before use

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Ensure the @linera/client WASM module is initialized
 * Safe to call multiple times - will only initialize once
 */
export async function ensureWasmInitialized(): Promise<void> {
  if (wasmInitialized) return;
  
  if (wasmInitPromise) {
    return wasmInitPromise;
  }
  
  wasmInitPromise = initWasm();
  
  try {
    await wasmInitPromise;
    wasmInitialized = true;
  } catch (error) {
    wasmInitPromise = null;
    throw error;
  }
}

async function initWasm(): Promise<void> {
  console.log('[WASM] Initializing @linera/client...');
  
  // Import the client module
  const linera = await import('@linera/client');
  
  // The module exports 'initialize' as a named export
  // This must be called before using any classes like Faucet, Client, etc.
  if ('initialize' in linera && typeof linera.initialize === 'function') {
    console.log('[WASM] Calling initialize()...');
    await linera.initialize();
    console.log('[WASM] initialize() complete');
  }
  
  console.log('[WASM] Initialization complete');
}

/**
 * Check if WASM is initialized
 */
export function isWasmReady(): boolean {
  return wasmInitialized;
}
