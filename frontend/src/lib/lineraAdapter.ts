// Linera Adapter - Re-exports from new module location
// This file exists for backward compatibility

export { 
  lineraAdapter,
  isConnected, 
  getChainId, 
  getWalletAddress, 
  disconnect, 
  query, 
  mutate, 
  queryWithSync,
  type ConnectionState 
} from './linera';

export type { DynamicWallet } from './linera';

// Note: GraphQL queries and mutations are now defined in gameApi.ts
// This file is kept for backward compatibility with existing imports
