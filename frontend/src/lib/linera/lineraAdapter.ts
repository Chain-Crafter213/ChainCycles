/**
 * Linera Adapter - Singleton managing all Linera blockchain interactions
 */

import { ensureWasmInitialized } from './wasmInit';
import type { DynamicWallet } from './dynamicSigner';

// Use 'any' for dynamic module types to avoid TypeScript issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LineraClientModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Faucet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Application = any;

// Cached module reference
let lineraClientModule: LineraClientModule | null = null;

/**
 * Dynamically load the @linera/client module and initialize WASM
 */
async function getLineraClient(): Promise<LineraClientModule> {
  if (lineraClientModule) return lineraClientModule;
  try {
    console.log('[LineraAdapter] Loading @linera/client module...');
    
    // Import the module
    const module = await import('@linera/client');
    
    // Initialize WASM - 'initialize' is exported as a named export
    if ('initialize' in module && typeof module.initialize === 'function') {
      console.log('[LineraAdapter] Initializing WASM...');
      await module.initialize();
      console.log('[LineraAdapter] WASM initialized');
    }
    
    lineraClientModule = module;
    console.log('[LineraAdapter] Module loaded successfully');
    return lineraClientModule;
  } catch (error) {
    console.error('[LineraAdapter] Failed to load @linera/client:', error);
    throw error;
  }
}

// Environment configuration
const DEFAULT_FAUCET_URL = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const APPLICATION_ID = import.meta.env.VITE_APPLICATION_ID || '';

/**
 * Connection state after wallet connect
 */
export interface LineraConnection {
  client: Client;
  wallet: Wallet;
  faucet: Faucet;
  chainId: string;
  address: string;
  autoSignerAddress: string;
}

/**
 * Application connection state
 */
export interface ApplicationConnection {
  application: Application;
  applicationId: string;
}

/**
 * Connection state for external use
 */
export interface ConnectionState {
  isConnected: boolean;
  chainId: string | null;
  userAddress: string | null;
  autoSignerAddress: string | null;
}

/**
 * LineraAdapter - Singleton class managing Linera connections
 */
class LineraAdapterClass {
  private static instance: LineraAdapterClass | null = null;
  
  // Connection state
  private connection: LineraConnection | null = null;
  private appConnection: ApplicationConnection | null = null;
  private connectPromise: Promise<LineraConnection> | null = null;

  private constructor() {
    console.log('[LineraAdapter] Instance created');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): LineraAdapterClass {
    if (!LineraAdapterClass.instance) {
      LineraAdapterClass.instance = new LineraAdapterClass();
    }
    return LineraAdapterClass.instance;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return {
      isConnected: this.connection !== null,
      chainId: this.connection?.chainId ?? null,
      userAddress: this.connection?.address ?? null,
      autoSignerAddress: this.connection?.autoSignerAddress ?? null,
    };
  }

  /**
   * Connect to Linera network using Dynamic wallet
   */
  async connect(
    dynamicWallet: DynamicWallet,
    faucetUrl: string = DEFAULT_FAUCET_URL
  ): Promise<ConnectionState> {
    const userAddress = dynamicWallet.address?.toLowerCase();
    
    if (!userAddress) {
      throw new Error('Dynamic wallet has no address');
    }

    // If already connected with same address, return existing connection
    if (this.connection && this.connection.address === userAddress) {
      console.log('[LineraAdapter] Already connected');
      return this.getState();
    }

    // If connection in progress, wait for it
    if (this.connectPromise) {
      console.log('[LineraAdapter] Connection in progress, waiting...');
      await this.connectPromise;
      return this.getState();
    }

    // Start new connection
    this.connectPromise = this.performConnect(dynamicWallet, faucetUrl, userAddress);
    
    try {
      await this.connectPromise;
      return this.getState();
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * Connect with a standalone private key (no EVM wallet)
   */
  async connectWithPrivateKey(faucetUrl: string = DEFAULT_FAUCET_URL): Promise<ConnectionState> {
    if (this.connection) {
      console.log('[LineraAdapter] Already connected');
      return this.getState();
    }

    if (this.connectPromise) {
      console.log('[LineraAdapter] Connection in progress, waiting...');
      await this.connectPromise;
      return this.getState();
    }

    this.connectPromise = this.performConnectWithPrivateKey(faucetUrl);
    
    try {
      await this.connectPromise;
      return this.getState();
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * Internal connection implementation with Dynamic wallet
   * 
   * KEY INSIGHT: Claim chain with AUTO-SIGNER address (not EVM address)
   * This way the auto-signer IS the owner from the start, no addOwner needed.
   * The EVM wallet is only used for identity, not for signing.
   */
  private async performConnect(
    _dynamicWallet: DynamicWallet,
    faucetUrl: string,
    userAddress: string
  ): Promise<LineraConnection> {
    try {
      console.log('[LineraAdapter] Starting connection...');
      console.log('[LineraAdapter] Faucet URL:', faucetUrl);
      console.log('[LineraAdapter] User EVM address (for identity):', userAddress);
      
      // Step 1: Load @linera/client module (includes WASM init)
      const lineraModule = await getLineraClient();
      const { Faucet, Client, signer: signerModule } = lineraModule;
      
      // Step 2: Create faucet connection
      console.log('[LineraAdapter] Creating faucet connection...');
      const faucet = new Faucet(faucetUrl);
      
      // Step 3: Create Linera wallet from faucet
      console.log('[LineraAdapter] Creating wallet...');
      const wallet = await faucet.createWallet();
      console.log('[LineraAdapter] Wallet created');
      
      // Step 4: Create auto-signer FIRST (this will be the chain owner)
      console.log('[LineraAdapter] Creating auto-signer...');
      const autoSigner = signerModule.PrivateKey.createRandom();
      const autoSignerAddress = autoSigner.address();
      console.log('[LineraAdapter] Auto-signer address:', autoSignerAddress);
      
      // Step 5: Claim chain with AUTO-SIGNER address (NOT EVM address!)
      // This makes the auto-signer the owner from the start
      console.log('[LineraAdapter] Claiming microchain for auto-signer...');
      const chainId = await faucet.claimChain(wallet, autoSignerAddress);
      console.log('[LineraAdapter] Claimed chain:', chainId);
      
      // Step 6: Set auto-signer as owner in wallet (local config)
      console.log('[LineraAdapter] Registering auto-signer in wallet...');
      await wallet.setOwner(chainId, autoSignerAddress);
      console.log('[LineraAdapter] Auto-signer registered');
      
      // Step 7: Create client with auto-signer
      console.log('[LineraAdapter] Creating client...');
      let client = new Client(wallet, autoSigner);
      if (client instanceof Promise) {
        client = await client;
      }
      console.log('[LineraAdapter] Client created');
      
      // Step 8: Connect to chain (triggers sync with validators)
      console.log('[LineraAdapter] Connecting to chain...');
      await client.chain(chainId);
      console.log('[LineraAdapter] Connected to chain');
      
      // Store connection
      // Note: address is still the EVM address (for identity/display)
      // but autoSignerAddress is the actual chain owner
      this.connection = {
        client,
        wallet,
        faucet,
        chainId,
        address: userAddress,
        autoSignerAddress,
      };
      
      // Store basic info in localStorage
      localStorage.setItem('chaincycles_chain_id', chainId);
      localStorage.setItem('chaincycles_user_address', userAddress);
      localStorage.setItem('chaincycles_auto_signer', autoSignerAddress);
      
      console.log('[LineraAdapter] Connection complete!');
      console.log('[LineraAdapter] Chain ID:', chainId);
      console.log('[LineraAdapter] EVM Address (identity):', userAddress);
      console.log('[LineraAdapter] Auto-Signer (chain owner):', autoSignerAddress);
      
      return this.connection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[LineraAdapter] Connection failed:', message);
      this.connection = null;
      throw error;
    }
  }

  /**
   * Internal connection with private key only (no Dynamic wallet)
   */
  private async performConnectWithPrivateKey(faucetUrl: string): Promise<LineraConnection> {
    try {
      console.log('[LineraAdapter] Starting private key connection...');
      console.log('[LineraAdapter] Faucet URL:', faucetUrl);
      
      // Step 1: Initialize WASM
      await ensureWasmInitialized();
      console.log('[LineraAdapter] WASM initialized');
      
      // Step 2: Load @linera/client module
      const lineraModule = await getLineraClient();
      const { Faucet, Client, signer: signerModule } = lineraModule;
      
      // Step 3: Create faucet connection
      console.log('[LineraAdapter] Creating faucet connection...');
      const faucet = new Faucet(faucetUrl);
      
      // Step 4: Create Linera wallet from faucet
      console.log('[LineraAdapter] Creating wallet...');
      const wallet = await faucet.createWallet();
      console.log('[LineraAdapter] Wallet created');
      
      // Step 5: Create signer
      const keySigner = signerModule.PrivateKey.createRandom();
      const userAddress = keySigner.address();
      console.log('[LineraAdapter] Signer address:', userAddress);
      
      // Step 6: Claim a microchain
      console.log('[LineraAdapter] Claiming microchain...');
      const chainId = await faucet.claimChain(wallet, userAddress);
      console.log('[LineraAdapter] Claimed chain:', chainId);
      
      // Step 7: Create Linera client
      console.log('[LineraAdapter] Creating client...');
      const client = new Client(wallet, keySigner);
      
      // Step 8: Connect to chain
      console.log('[LineraAdapter] Connecting to chain...');
      await client.chain(chainId);
      console.log('[LineraAdapter] Connected to chain');
      
      // Store connection
      this.connection = {
        client,
        wallet,
        faucet,
        chainId,
        address: userAddress,
        autoSignerAddress: userAddress, // Same as user for private key mode
      };
      
      // Store in localStorage
      localStorage.setItem('chaincycles_chain_id', chainId);
      localStorage.setItem('chaincycles_user_address', userAddress);
      
      console.log('[LineraAdapter] Connection complete!');
      console.log('[LineraAdapter] Chain ID:', chainId);
      console.log('[LineraAdapter] Address:', userAddress);
      
      return this.connection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[LineraAdapter] Connection failed:', message);
      this.connection = null;
      throw error;
    }
  }

  /**
   * Connect to the application
   */
  async connectApplication(applicationId: string = APPLICATION_ID): Promise<ApplicationConnection> {
    if (!this.connection) {
      throw new Error('Must connect wallet before connecting to application');
    }

    if (this.appConnection && this.appConnection.applicationId === applicationId) {
      return this.appConnection;
    }

    if (!applicationId) {
      throw new Error('Application ID is not configured');
    }

    console.log('[LineraAdapter] Connecting to application:', applicationId);
    
    const chain = await this.connection.client.chain(this.connection.chainId);
    const application = await chain.application(applicationId);
    
    this.appConnection = {
      application,
      applicationId,
    };
    
    console.log('[LineraAdapter] Application connected');
    return this.appConnection;
  }

  /**
   * Disconnect from Linera
   */
  disconnect(): void {
    console.log('[LineraAdapter] Disconnecting...');
    this.connection = null;
    this.appConnection = null;
    // Clear all localStorage items
    localStorage.removeItem('chaincycles_chain_id');
    localStorage.removeItem('chaincycles_user_address');
    // Also clear any old mnemonic keys (clean up old approach)
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('chaincycles_mnemonic_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[LineraAdapter] Disconnected and cleared localStorage');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Check if application is connected
   */
  isApplicationConnected(): boolean {
    return this.appConnection !== null;
  }

  /**
   * Get chain ID
   */
  getChainId(): string {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    return this.connection.chainId;
  }

  /**
   * Get user address
   */
  getUserAddress(): string {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    return this.connection.address;
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.connection) {
      throw new Error('Must connect wallet before querying');
    }

    // Ensure application is connected
    if (!this.appConnection) {
      await this.connectApplication();
    }

    const payload = JSON.stringify({
      query: graphqlQuery,
      variables: variables || {},
    });

    console.log('[LineraAdapter] Query:', graphqlQuery.slice(0, 80) + '...');

    // Note: Don't pass owner option - let the signer handle authentication
    const result = await this.appConnection!.application.query(payload);
    const parsed = JSON.parse(result);

    // Log full response for debugging
    if (parsed.data) {
      console.log('[LineraAdapter] Query response:', JSON.stringify(parsed.data).slice(0, 200));
    }

    if (parsed.errors) {
      const errorMsg = parsed.errors[0]?.message || 'Query failed';
      console.error('[LineraAdapter] Query error:', errorMsg);
      throw new Error(errorMsg);
    }

    return parsed.data;
  }

  /**
   * Execute a GraphQL mutation
   * Mutations in Linera use schedule_operation, so we need to sync and wait for block processing
   */
  async mutate<T = unknown>(
    graphqlMutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.connection) {
      throw new Error('Must connect wallet before mutating');
    }

    // Ensure application is connected
    if (!this.appConnection) {
      await this.connectApplication();
    }

    const payload = JSON.stringify({
      query: graphqlMutation,
      variables: variables || {},
    });

    console.log('[LineraAdapter] Mutation:', graphqlMutation.slice(0, 80) + '...');
    console.log('[LineraAdapter] Variables:', JSON.stringify(variables));

    // Execute mutation - this schedules the operation
    const result = await this.appConnection!.application.query(payload);
    const parsed = JSON.parse(result);

    console.log('[LineraAdapter] Mutation result:', JSON.stringify(parsed));

    if (parsed.errors) {
      const errorMsg = parsed.errors[0]?.message || 'Mutation failed';
      console.error('[LineraAdapter] Mutation error:', errorMsg);
      throw new Error(errorMsg);
    }

    // After mutation, we need to wait for the block to be created and processed
    // The scheduled operation needs to be included in a block
    console.log('[LineraAdapter] Waiting for block processing...');
    
    // Multiple sync attempts to ensure block is processed
    for (let i = 0; i < 3; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const chain = await this.connection.client.chain(this.connection.chainId);
        console.log(`[LineraAdapter] Chain sync attempt ${i + 1} completed`);
        
        // Try to process any pending operations by querying the chain
        // This helps ensure the block is finalized
        if (chain && typeof chain.processInbox === 'function') {
          await chain.processInbox();
          console.log('[LineraAdapter] Inbox processed');
        }
      } catch (syncError) {
        console.warn(`[LineraAdapter] Chain sync attempt ${i + 1} warning:`, syncError);
      }
    }

    console.log('[LineraAdapter] Mutation complete, block should be processed');
    return parsed.data;
  }

  /**
   * Query with chain sync
   */
  async queryWithSync<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.connection) {
      throw new Error('Must connect wallet before querying');
    }

    // Sync chain first
    console.log('[LineraAdapter] Syncing chain before query...');
    try {
      await this.connection.client.chain(this.connection.chainId);
    } catch (error) {
      console.warn('[LineraAdapter] Chain sync warning:', error);
    }

    return this.query<T>(graphqlQuery, variables);
  }

  /**
   * Get connection (for advanced use)
   */
  getConnection(): LineraConnection | null {
    return this.connection;
  }
}

// Export singleton instance
export const lineraAdapter = LineraAdapterClass.getInstance();

// Export convenience functions for backward compatibility
export function isConnected(): boolean {
  return lineraAdapter.isConnected();
}

export function getChainId(): string {
  return lineraAdapter.getChainId();
}

export function getWalletAddress(): string {
  return lineraAdapter.getUserAddress();
}

export function disconnect(): void {
  lineraAdapter.disconnect();
}

export async function query<T>(q: string, v?: Record<string, unknown>): Promise<T> {
  return lineraAdapter.query<T>(q, v);
}

export async function mutate<T>(m: string, v?: Record<string, unknown>): Promise<T> {
  return lineraAdapter.mutate<T>(m, v);
}

export async function queryWithSync<T>(q: string, v?: Record<string, unknown>): Promise<T> {
  return lineraAdapter.queryWithSync<T>(q, v);
}

// Re-export types
export type { DynamicWallet };
